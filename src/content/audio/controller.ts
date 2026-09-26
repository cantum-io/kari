// Mimi — audio controller (content script side). Owns the AudioContext, attaches late, keeps a
// straight-wire bypass path, drives the worklet, and enforces the one-pass rule on the <video>.

import { plan, type Params, DEFAULT_PARAMS } from "../../shared/math";

export type EngineName = "r3" | "ss" | "bypass";
export type AudioStatus = {
  attached: boolean;
  engine: EngineName;
  engineLatencyMs: number;
  outputLatencyMs: number;   // device (Bluetooth shows up here)
  avOffsetMs: number;        // sound behind picture, total
  underruns: number;
  load: number;              // 0..1 of the audio budget
  fault: null | "drm-silent" | "capture-failed" | "worklet-failed";
  baseRate: number;          // YouTube's own speed menu, 1.0 normally
};

export type Stepdown = "r3" | "ss" | "bypass";

const XFADE = 0.04; // 40 ms attach crossfade
// Chrome's DynamicsCompressor applies makeup gain even below threshold: +0.57 dB at threshold −1 dB / ratio 20
// (measured live on youtube.com, 2026-09-26). The wet path runs through it for peak safety, so trim it back to unity.
const LIMITER_TRIM = Math.pow(10, -0.57 / 20);
const COMPRESSOR_LOOKAHEAD_SEC = 0.006;
// Chrome's DynamicsCompressor has a fixed 6 ms look-ahead. The wet path runs through it, the dry paths do not, so the
// matched dry delay (and the a/v readout) carry it too (measured live 2026-09-26: +265 frames at 44.1 kHz).

export class AudioController {
  private ctx: AudioContext | null = null;
  private src: MediaElementAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  // Two dry branches: dryDirect (straight wire, 0 ms) until the engine has measured its delay once, then dryMatched
  // (delay = the engine's real stream latency) for the rest of the page. Delay is never automated while audible, so no
  // pitch sweeps; hold-to-compare is sample-accurate; the only transition artefact is one 40 ms crossfade at the first
  // engine start (review finding 2026-09-26).
  private dryDirect!: GainNode; private dryMatched!: GainNode; private wet!: GainNode; private dryDelay!: DelayNode;
  private matchedReady = false;
  private analyser!: AnalyserNode; private limiter!: DynamicsCompressorNode; private trim!: GainNode;
  private params: Params = { ...DEFAULT_PARAMS };
  private compare = false;
  private baseRate = 1; private lastSetRate = 1;
  private _status: AudioStatus = { attached: false, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1 };
  private latencyFrames = { r3: 0, ss: 0 };
  private hotBlocks = 0; private tier: Stepdown = "r3"; private pinned: "auto" | "r3" | "signalsmith" = "auto";
  private silentSince = 0; private rmsBuf = new Uint8Array(512);
  private listeners = new Set<(s: AudioStatus) => void>();
  private adActive = false;
  private wetWanted = false;    // the routing we asked for (never read a mid-ramp gain value back)
  private engineWarm = false;   // worklet reported real output from the selected engine (else the wet path is still silent)
  private lastWantedEngine: EngineName | null = null;
  private lastRing = 0;

  constructor(private video: HTMLVideoElement, private urls: { worklet: string; wasm: string }) {
    video.addEventListener("ratechange", this.onRateChange);
  }

  onStatus(cb: (s: AudioStatus) => void) { this.listeners.add(cb); cb(this._status); return () => this.listeners.delete(cb); }
  private emit(patch: Partial<AudioStatus>) { this._status = { ...this._status, ...patch }; for (const l of this.listeners) l(this._status); }

  setEnginePreference(p: "auto" | "r3" | "signalsmith") { this.pinned = p; this.tier = p === "signalsmith" ? "ss" : "r3"; this.hotBlocks = 0; this.applyEngine(); }

  /** Rebind to a (possibly new) video element after SPA navigation. */
  rebind(video: HTMLVideoElement) {
    if (video === this.video) return;
    this.video.removeEventListener("ratechange", this.onRateChange);
    this.video = video;
    video.addEventListener("ratechange", this.onRateChange);
    // The old MediaElementSource belongs to the old element; if YouTube replaced the element we need a new graph.
    if (this.src) { try { this.src.disconnect(); } catch (_) { /* ignore */ } this.src = null; this.emit({ attached: false }); }
    this.apply(this.params, true);
  }

  setAds(active: boolean) { if (active === this.adActive) return; this.adActive = active; this.apply(this.params, true); }

  getParams() { return this.params; }
  get status() { return this._status; }

  /** The one entry point for parameter changes. */
  async apply(p: Params, force = false) {
    this.params = p;
    const pl = plan(p);
    const rate = this.adActive ? this.baseRate : this.baseRate * pl.rate;
    this.setVideoRate(rate);
    // Key lock holds the pitch against YouTube's own speed menu too (baseRate), not only against Mimi's slider.
    const engineRatio = p.keyLock ? pl.engineRatio / this.baseRate : pl.engineRatio;
    const engineActive = Math.abs(engineRatio - 1) > 1e-6;
    const wantAttach = (engineActive && !this.adActive) || this.compare;
    if (wantAttach && !this.src) await this.attach();
    if (!this.src) return;
    const ratio = this.adActive ? 1 : engineRatio;
    this.node?.port.postMessage({ type: "ratio", ratio });
    this.applyEngine(engineActive && !this.adActive);
    const wantWet = engineActive && !this.adActive && !this.compare;
    this.wetWanted = wantWet;
    // Going dry is instant; going wet waits for the worklet's 'warm' (live probe 2026-09-26: crossfading at once left a
    // ~70 ms hole while Rubber Band filled its first window).
    if (!wantWet || this.engineWarm) this.route(wantWet, force);
  }

  /** Hold-to-compare: true = hear the untouched (delay-matched) signal. */
  setCompare(on: boolean) { this.compare = on; this.apply(this.params, true); }

  /** For Mimi's pulse: 0..1 RMS of what's playing. Cheap; call at ≤30 Hz. */
  level(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.rmsBuf);
    let s = 0; for (let i = 0; i < this.rmsBuf.length; i++) { const v = (this.rmsBuf[i] - 128) / 128; s += v * v; }
    return Math.sqrt(s / this.rmsBuf.length);
  }

  /* ---------------- internals ---------------- */
  private setVideoRate(rate: number) {
    const v = this.video;
    try {
      (v as any).preservesPitch = false; (v as any).mozPreservesPitch = false; (v as any).webkitPreservesPitch = false;
      if (Math.abs(v.playbackRate - rate) > 1e-4) { this.lastSetRate = rate; v.playbackRate = rate; }
      else this.lastSetRate = rate;
    } catch (_) { /* rate out of range on some videos */ }
  }
  private onRateChange = () => {
    const v = this.video;
    (v as any).preservesPitch = false; // YouTube may re-assert its own; ours wins
    if (Math.abs(v.playbackRate - this.lastSetRate) > 1e-3) {
      // Someone else (YouTube's speed menu, or a new video loading) set an ABSOLUTE rate. Adopt it as the new base
      // and re-apply our multiplier on top. (Live probe 2026-09-26: dividing by our multiplier read 1.5× as "yt 1.44×"
      // and dropped our +4% when the menu went back to 1×.)
      this.baseRate = v.playbackRate;
      this.emit({ baseRate: this.baseRate });
      this.apply(this.params, true);
    }
  };

  private attaching: Promise<void> | null = null;
  private async attach() {
    if (this.attaching) return this.attaching;
    this.attaching = this._attach().finally(() => { this.attaching = null; });
    return this.attaching;
  }
  /** A context made without a user gesture starts suspended and would mute the video. Wait for activation. */
  private async waitForActivation() {
    if ((navigator as any).userActivation?.hasBeenActive) return;
    await new Promise<void>(res => {
      const done = () => { window.removeEventListener("pointerdown", done, true); window.removeEventListener("keydown", done, true); res(); };
      window.addEventListener("pointerdown", done, true); window.addEventListener("keydown", done, true);
    });
  }
  private async _attach() {
    await this.waitForActivation();
    if (this.src) return;
    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.ctx = ctx;
      await ctx.audioWorklet.addModule(this.urls.worklet);
      const wasmBytes = await (await fetch(this.urls.wasm)).arrayBuffer();
      const src = ctx.createMediaElementSource(this.video); // once per element, for the life of the page
      this.src = src;
      this.dryDirect = ctx.createGain(); this.dryMatched = ctx.createGain(); this.wet = ctx.createGain(); this.dryDelay = ctx.createDelay(1);
      this.matchedReady = false;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1; this.limiter.knee.value = 0; this.limiter.ratio.value = 20; this.limiter.attack.value = 0.001; this.limiter.release.value = 0.05;
      this.trim = ctx.createGain(); this.trim.gain.value = LIMITER_TRIM;
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
      this.node = new AudioWorkletNode(ctx, "mimi-processor", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { rbWasm: wasmBytes, engine: this.tier } });
      this.node.port.onmessage = (e) => this.onWorklet(e.data);
  this.node.onprocessorerror = () => { this.emit({ fault: "worklet-failed", engine: "bypass" }); this.route(false, true); };
      // graph: src → dryDirect ─────────────────────────┐   (straight wire, before the engine ever ran)
      //        src → delay → dryMatched ─────────────────┤   (straight wire, delay-matched to the engine)
      //        src → worklet → wet → limiter → trim ─────┴→ analyser → out
      src.connect(this.dryDirect); this.dryDirect.connect(this.analyser);
      src.connect(this.dryDelay); this.dryDelay.connect(this.dryMatched); this.dryMatched.connect(this.analyser);
      src.connect(this.node); this.node.connect(this.wet); this.wet.connect(this.limiter); this.limiter.connect(this.trim); this.trim.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.dryDirect.gain.value = 1; this.dryMatched.gain.value = 0; this.wet.gain.value = 0;
      if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) { /* needs gesture */ } }
      if (ctx.state !== "running") { const kick = () => { ctx.resume(); window.removeEventListener("pointerdown", kick, true); window.removeEventListener("keydown", kick, true); }; window.addEventListener("pointerdown", kick, true); window.addEventListener("keydown", kick, true); }
      this.emit({ attached: true, outputLatencyMs: Math.round(((ctx as any).outputLatency || 0) * 1000) });
      this.watchSilence();
    } catch (err) {
      this.emit({ fault: "capture-failed", attached: false });
      this.src = null;
    }
  }

  /** Set the matched-dry delay to the engine's measured stream latency. Called on 'warm', when that branch is silent. */
  private setMatchedDelay(frames: number) {
    if (!this.ctx) return;
    const sec = Math.min(0.99, frames / this.ctx.sampleRate + COMPRESSOR_LOOKAHEAD_SEC);
    const audible = this.matchedReady && !this.wetWanted && this.dryMatched.gain.value > 0.01;
    if (audible) this.dryDelay.delayTime.setTargetAtTime(sec, this.ctx.currentTime, 0.05); // tier switch while comparing: rare, short sweep
    else this.dryDelay.delayTime.setValueAtTime(sec, this.ctx.currentTime);
    this.matchedReady = true;
  }
  private route(wet: boolean, force: boolean) {
    this.wetWanted = wet;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, tc = XFADE / 3;
    const matched = !wet && this.matchedReady, direct = !wet && !this.matchedReady;
    this.wet.gain.setTargetAtTime(wet ? 1 : 0, t, tc);
    this.dryMatched.gain.setTargetAtTime(matched ? 1 : 0, t, tc);
    this.dryDirect.gain.setTargetAtTime(direct ? 1 : 0, t, tc);
    this.updateAv();
  }
  private applyEngine(active = true) {
    if (!this.node) return;
    const want: EngineName = !active ? "bypass" : this.tier;
    if (want !== this.lastWantedEngine) { this.engineWarm = false; this.lastWantedEngine = want; this.hotBlocks = 0; }
    this.node.port.postMessage({ type: "engine", engine: want });
  }
  private onWorklet(m: any) {
    switch (m.type) {
      case "ready": this.latencyFrames = { r3: m.latency.r3 || 0, ss: m.latency.ss || 0 }; break;
      case "engine": this.emit({ engine: m.engine, engineLatencyMs: Math.round((m.latency || 0) / (this.ctx?.sampleRate || 48000) * 1000) }); this.updateAv(); break;
      case "warm": {
        // The worklet measured the engine's real stream latency (zeros emitted before it went live with a ring cushion).
        // Live probe 2026-09-26: 2688 frames at 44.1 kHz where rubberband_get_start_delay said 1280.
        if (typeof m.latency === "number" && m.engine !== "bypass") {
          this.latencyFrames[m.engine as "r3" | "ss"] = m.latency;
          this.emit({ engineLatencyMs: Math.round(m.latency / (this.ctx?.sampleRate || 48000) * 1000) });
          this.setMatchedDelay(m.latency);
        }
        this.engineWarm = true; this.route(this.wetWanted, true); break;
      }
      case "stats": {
        const load = m.budgetMs ? m.avgBlockMs / m.budgetMs : 0;
        this.lastRing = m.ringFrames || 0;
        this.emit({ underruns: m.underruns, load });
        this.updateAv();
        this.stepdown(load, m.underruns);
        break;
      }
      case "error": this.emit({ engine: "bypass", fault: m.where === "process" ? "worklet-failed" : this._status.fault }); break;
    }
  }
  private lastUnderruns = 0;
  /** Step-down ladder: R3 short → Signalsmith → bypass, only in auto mode and only on sustained trouble. */
  private stepdown(load: number, underruns: number) {
    if (this.pinned !== "auto") return;
    const grew = underruns - this.lastUnderruns; this.lastUnderruns = underruns;
    if (load > 0.85 || grew > 5) this.hotBlocks++; else this.hotBlocks = Math.max(0, this.hotBlocks - 1);
    if (this.hotBlocks >= 4) {
      this.hotBlocks = 0;
      if (this.tier === "r3") this.tier = "ss"; else if (this.tier === "ss") this.tier = "bypass";
      this.applyEngine();
    }
  }
  private updateAv() {
    // outputLatency is 0 at context creation and only settles once the audio thread runs: read it live every time.
    const out = this.ctx ? Math.round(((this.ctx as any).outputLatency || 0) * 1000) : 0;
    // What is actually in the chain: the engine when wet, the matched delay when dry-after-engine, nothing before that.
    const chain = this.wetWanted ? this._status.engineLatencyMs + Math.round(COMPRESSOR_LOOKAHEAD_SEC * 1000) : (this.matchedReady && this.ctx ? Math.round(this.dryDelay.delayTime.value * 1000) : 0);
    const base = this.ctx ? Math.round(this.ctx.baseLatency * 1000) : 0;
    this.emit({ outputLatencyMs: out, avOffsetMs: out + chain + base });
  }
  private watchSilence() {
    const tick = () => {
      if (!this.ctx || !this.src) return;
      const v = this.video;
      const playing = !v.paused && !v.ended && v.readyState >= 3 && !v.muted && v.volume > 0;
      const lvl = this.level();
      const now = performance.now();
      if (playing && lvl < 1e-4) { if (!this.silentSince) this.silentSince = now; else if (now - this.silentSince > 2500 && this._status.fault !== "drm-silent") this.emit({ fault: "drm-silent" }); }
      else { this.silentSince = 0; if (this._status.fault === "drm-silent") this.emit({ fault: null }); }
      setTimeout(tick, 500);
    };
    setTimeout(tick, 1500);
  }
}
