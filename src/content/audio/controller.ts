// Kari — audio controller (content script side). Owns the AudioContext, attaches late, keeps a
// straight-wire bypass path, drives the worklet, and enforces the one-pass rule on the <video>.

import { plan, type Params, DEFAULT_PARAMS } from "../../shared/math";
import { type BeatGrid, type LoopBeats, loopPlan, withBpm, nudgeBpm } from "../beat/grid";
import { TapTempo } from "../beat/tap";
import { AutoBeatDetector, type OnsetBatch, type DetectorState, type TempoEstimate } from "../beat/detect";

export type EngineName = "r3" | "ss" | "bypass";
export type AudioStatus = {
  attached: boolean;
  engine: EngineName;
  engineLatencyMs: number;
  outputLatencyMs: number;   // device (Bluetooth shows up here)
  avOffsetMs: number;        // sound behind picture, total
  underruns: number;
  load: number;              // 0..1 of the audio budget
  fault: null | "drm-silent" | "capture-failed" | "worklet-failed" | "hook-missing";
  baseRate: number;          // YouTube's own speed menu, 1.0 normally
  loop: LoopBeats | 0;       // latched loop length in beats, 0 = none
  loopMs: number;            // its length in real-time ms
  loopClamped: boolean;      // the asked length exceeded the ring: the loop runs at the ring's ceiling
  bpm: number | null;        // the beat grid's bpm, null until detected, tapped or typed
  gridSource: BeatGrid["source"] | null;
  learning: boolean;         // the tempo detector is listening and has no verdict yet
};

/** A source node Kari does not own: wired through the saved native connect, so the MAIN-world patches never redirect it. */
export type SourceLike = { connect(n: AudioNode): unknown; disconnect(): void };

/**
 * External-graph mode (SoundCloud, route 0/1): the context and the source node belong to the page (or to the hook), the
 * worklet and WASM bytes come from the isolated bridge, Kari's output goes to `sink` instead of the destination, and the
 * element's playbackRate is written through the hook's guard. See src/soundcloud/hook-core.ts.
 */
export type ExternalGraph = {
  ctx: AudioContext;
  src: SourceLike;
  sink: AudioNode;
  loadWorklet(ctx: AudioContext): Promise<void>;
  wasm(): Promise<ArrayBuffer>;
  writeRate(rate: number): void;
  onWired?(): void;
  ownsContext: boolean;       // true = Kari may resume it (route 1); false = the page owns suspend/resume (route 0)
  silenceMs?: number;         // "playing but silent" window before the protected-audio notice (YouTube: 2500)
  speedOnlyOnDrm?: boolean;   // true = a protected track drops the engine and keeps the dry path + rate
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
  private src: SourceLike | null = null;
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
  private _status: AudioStatus = { attached: false, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, loop: 0, loopMs: 0, loopClamped: false, bpm: null, gridSource: null, learning: false };
  private latencyFrames = { r3: 0, ss: 0 };
  private hotBlocks = 0; private tier: Stepdown = "r3"; private pinned: "auto" | "r3" | "signalsmith" = "auto";
  private silentSince = 0; private rmsBuf = new Uint8Array(512);
  private listeners = new Set<(s: AudioStatus) => void>();
  private adActive = false;
  private wetWanted = false;    // the routing we asked for (never read a mid-ramp gain value back)
  private engineWarm = false;   // worklet reported real output from the selected engine (else the wet path is still silent)
  private lastWantedEngine: EngineName | null = null;
  private lastRing = 0;
  private routedWet = false;    // what the gains are set to right now (wetWanted is where we want to end up)
  // Beat loops. The grid lives here (per video; index.ts clears it on navigation); the worklet holds the audio.
  private grid: BeatGrid | null = null;
  private tapper = new TapTempo();
  private loopBeats: LoopBeats | 0 = 0;
  private matchedFrames = 0;    // the dry-matched delay in frames; the bypass engine is delayed to the same figure
  private loopMax = (1 << 19) - 288;   // the ring's ceiling in frames; the worklet reports the real figure on 'ready'
  // Tempo: the worklet posts onset strength (100 frames/s) from the live input; the detector turns it into a grid in
  // media time, publishing after 6 s of real playback and refining every 2 s, never under a latched loop, never once a
  // tap or a typed bpm owns the grid. Both clocks are read in one go when a batch arrives (see detect.ts).
  private detector = new AutoBeatDetector(() => {
    const v = this.video;
    return { media: v.currentTime, ctx: this.ctx ? this.ctx.currentTime : 0, rate: v.playbackRate || 1, playing: !v.paused && !v.ended && v.readyState >= 3 && !this.adActive };
  });
  private static INTERRUPTS = ["pause", "seeking", "ended", "emptied"] as const;

  constructor(private video: HTMLMediaElement, private urls: { worklet: string; wasm: string }, private ext: ExternalGraph | null = null) {
    this.detector.onGrid(g => this.onAutoGrid(g));
    this.detector.onState(s => this.emit({ learning: s === "learning" }));
    this.listen(video);
  }
  private listen(v: HTMLMediaElement) {
    v.addEventListener("ratechange", this.onRateChange);
    for (const t of AudioController.INTERRUPTS) v.addEventListener(t, this.onInterrupt);
    v.addEventListener("playing", this.onPlaying);
  }
  private unlisten(v: HTMLMediaElement) {
    v.removeEventListener("ratechange", this.onRateChange);
    for (const t of AudioController.INTERRUPTS) v.removeEventListener(t, this.onInterrupt);
    v.removeEventListener("playing", this.onPlaying);
  }
  /** A loop has no track underneath to slip back into once the element stops or jumps: let go. A seek also empties the detector's window. */
  private onInterrupt = (e: Event) => { if (this.loopBeats) this.releaseLoop(); if (e.type === "seeking" || e.type === "emptied") this.detector.reset(); };
  /**
   * Playback started: attach now (a straight, delay-free wire) so the tempo detector hears the track from its first
   * beat. Not on a protected element (mediaKeys: the source would go silent) and not under an ad. On YouTube the
   * attach still waits for the page's first click (a context made without a gesture would mute the video).
   */
  private onPlaying = () => {
    if (this.src || this.adActive || (this.video as any).mediaKeys) return;
    // attach, then the normal apply: it sets the engine (bypass on a neutral video) and the routing, exactly as the first change would
    this.attach().then(() => this.apply(this.params, true)).catch(() => { /* reported through status */ });
  };
  get detectorState(): DetectorState { return this.detector.state; }
  get detectorDebug() { return this.detector.debug; }
  get lastEstimate(): TempoEstimate | null { return this.detector.last; }

  /** Drop the engine's buffered audio (seek, new track, pause). The worklet re-primes and re-reports 'warm'. */
  flush() { this.node?.port.postMessage({ type: "reset" }); }

  /** The element carries mediaKeys (DRM): say so and, in speed-only mode, keep the engine off this element. */
  noteDrm() {
    if (this._status.fault === "drm-silent") return;
    this.emit({ fault: "drm-silent" });
    if (this.ext?.speedOnlyOnDrm) this.apply(this.params, true);
  }
  private get speedOnly() { return !!this.ext?.speedOnlyOnDrm && this._status.fault === "drm-silent"; }

  onStatus(cb: (s: AudioStatus) => void) { this.listeners.add(cb); cb(this._status); return () => this.listeners.delete(cb); }
  private emit(patch: Partial<AudioStatus>) { this._status = { ...this._status, ...patch }; for (const l of this.listeners) l(this._status); }

  setEnginePreference(p: "auto" | "r3" | "signalsmith") { this.pinned = p; this.tier = p === "signalsmith" ? "ss" : "r3"; this.hotBlocks = 0; this.applyEngine(); }

  /** Rebind to a (possibly new) video element after SPA navigation. */
  rebind(video: HTMLMediaElement) {
    if (video === this.video) return;
    this.unlisten(this.video);
    if (this.loopBeats) this.releaseLoop();
    this.video = video;
    this.listen(video);
    this.detector.reset();
    // The old MediaElementSource belongs to the old element; if YouTube replaced the element we need a new graph.
    if (this.src) { try { this.src.disconnect(); } catch (_) { /* ignore */ } this.src = null; this.emit({ attached: false }); }
    this.apply(this.params, true);
  }

  setAds(active: boolean) { if (active === this.adActive) return; this.adActive = active; if (active && this.loopBeats) this.releaseLoop(); this.detector.reset(); this.apply(this.params, true); }

  getParams() { return this.params; }
  get status() { return this._status; }

  /** The one entry point for parameter changes. */
  async apply(p: Params, force = false) {
    this.params = p;
    const pl = plan(p);
    const rate = this.adActive ? this.baseRate : this.baseRate * pl.rate;
    this.setVideoRate(rate);
    // Key lock holds the pitch against YouTube's own speed menu too (baseRate), not only against Kari's slider.
    const engineRatio = p.keyLock ? pl.engineRatio / this.baseRate : pl.engineRatio;
    const engineActive = Math.abs(engineRatio - 1) > 1e-6 && !this.speedOnly;
    const loopOn = this.loopBeats > 0 && !this.adActive && !this.speedOnly;   // a protected track is speed-only: no engine, no loop
    const wantAttach = (engineActive && !this.adActive) || (this.compare && !this.speedOnly) || loopOn;
    if (wantAttach && !this.src) await this.attach();
    if (!this.src) return;
    const ratio = this.adActive ? 1 : engineRatio;
    this.node?.port.postMessage({ type: "ratio", ratio });
    const engineChanged = this.applyEngine(engineActive && !this.adActive);
    // A loop with no key change runs wet through the bypass engine (a delayed straight wire): lossless, and the loop
    // stage sits in the worklet. Hold-to-compare still hears the track underneath.
    const wantWet = (engineActive || loopOn) && !this.adActive && !this.compare;
    this.wetWanted = wantWet;
    // Going dry is instant; going wet waits for the worklet's 'warm' (live probe 2026-09-26: crossfading at once left a
    // ~70 ms hole while Rubber Band filled its first window).
    if (!wantWet || this.engineWarm) this.route(wantWet, force);
    // Engine switch while already wet (a key change lands on a running loop): the engine emits zeros until warm, so sit
    // on the matched dry path for those ~60 ms and come back on 'warm'. The loop drops out for that long: see docs.
    else if (engineChanged && this.routedWet) this.route(false, force, true);
  }

  /* ---------------- beat loops ---------------- */
  getGrid() { return this.grid; }
  setGrid(g: BeatGrid | null) {
    this.grid = g;
    if (!g) { this.tapper.reset(); if (this.loopBeats) this.releaseLoop(); }
    // A tap or a typed bpm owns the grid from then on: the detector stops publishing (and the worklet stops posting)
    // until the grid is cleared (a new track).
    this.detector.mute(!!g && g.source !== "auto"); this.syncOnset();
    this.emit({ bpm: g ? g.bpm : null, gridSource: g ? g.source : null, learning: this.detector.state === "learning" });
    // A grid means loops are coming: attach now so the capture ring has history by the first latch (needs a prior click).
    if (g && !this.src) this.attach().catch(() => { /* reported through status */ });
  }
  /** The detector found or refined a grid: taken unless a tap or a typed bpm already owns it. */
  private onAutoGrid(g: BeatGrid) { if (this.grid && this.grid.source !== "auto") return; this.setGrid(g); }
  /**
   * One tap at the current media time. Returns the running bpm estimate (null until the second tap). On an auto grid
   * the first tap keeps the detected bpm and moves the "1" to the tap; more taps override the bpm as well.
   */
  tap(): number | null {
    const t = this.video.currentTime;
    const bpm = this.tapper.tap(t);
    if (bpm) this.setGrid({ bpm, phase: t, source: "tap" });
    else if (this.grid?.source === "auto") this.setGrid({ bpm: this.grid.bpm, phase: t, source: "tap" });
    else if (!this.src) this.attach().catch(() => { /* reported through status */ });
    return bpm;
  }
  private syncOnset() { this.node?.port.postMessage({ type: "config", onset: this.detector.listening }); }
  setBpm(bpm: number) { if (!Number.isFinite(bpm)) return; this.setGrid(withBpm(this.grid, bpm, this.video.currentTime)); }
  nudgeBpm(delta: number) { if (this.grid) this.setGrid(nudgeBpm(this.grid, delta)); }
  get loop() { return this.loopBeats; }
  /** The button and the pad: a lit length releases, anything else latches (a different length switches in one step). */
  toggleLoop(beats: LoopBeats): Promise<boolean> {
    if (this.loopBeats === beats) { this.releaseLoop(); return Promise.resolve(true); }
    return this.latchLoop(beats);
  }
  /**
   * Latch (or re-latch) a loop of `beats` on the grid line at or before now. Resolves false without a grid or while
   * paused. A re-latch while a loop runs starts the new body from the live position under the stage's fade (no gap).
   * A length past the ring's ceiling is clamped to it and flagged on the status.
   */
  async latchLoop(beats: LoopBeats): Promise<boolean> {
    if (!this.grid || this.video.paused || this.video.ended) return false;
    if (!this.src) await this.attach();
    if (!this.src || !this.node || !this.ctx) return false;
    const v = this.video, rate = v.playbackRate || 1;
    // Read the clock as late as possible: the attach above can take 30-40 ms cold.
    const p = loopPlan(this.grid, v.currentTime, rate, this.ctx.sampleRate, beats);
    const clamped = p.lenFrames > this.loopMax, len = clamped ? this.loopMax : p.lenFrames;
    this.node.port.postMessage({ type: "loop", on: true, lenFrames: len, backFrames: Math.min(len, p.backFrames) });
    this.loopBeats = beats;
    this.detector.freeze(true);   // the grid never moves under a loop
    this.emit({ loop: beats, loopMs: Math.round(len / this.ctx.sampleRate * 1000), loopClamped: clamped });
    await this.apply(this.params, true);
    return true;
  }
  /** Slip release: the worklet fades back to where the track underneath is now. No seek. */
  releaseLoop() {
    if (!this.loopBeats) return;
    this.node?.port.postMessage({ type: "loop", on: false });
    this.loopBeats = 0;
    this.emit({ loop: 0, loopMs: 0, loopClamped: false });
    this.apply(this.params, true);
    this.detector.freeze(false);  // a grid refined meanwhile lands now
  }

  /** Hold-to-compare: true = hear the untouched (delay-matched) signal. */
  setCompare(on: boolean) { this.compare = on; this.apply(this.params, true); }

  /** For Kari's pulse: 0..1 RMS of what's playing. Cheap; call at ≤30 Hz. */
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
      if (Math.abs(v.playbackRate - rate) > 1e-4) { this.lastSetRate = rate; if (this.ext) this.ext.writeRate(rate); else v.playbackRate = rate; }
      else { this.lastSetRate = rate; if (this.ext) this.ext.writeRate(rate); }
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
    this.detector.reset();   // the window's frame spacing in media time changed: start over (the published grid stays)
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
    const ext = this.ext;
    if (!ext) await this.waitForActivation(); // external: the page's context already exists (route 0) or `playing` fired (route 1)
    if (this.src) return;
    try {
      const ctx = ext ? ext.ctx : new AudioContext({ latencyHint: "interactive" });
      this.ctx = ctx;
      if (ext) await ext.loadWorklet(ctx); else await ctx.audioWorklet.addModule(this.urls.worklet);
      const wasmBytes = ext ? await ext.wasm() : await (await fetch(this.urls.wasm)).arrayBuffer();
      const src: SourceLike = ext ? ext.src : ctx.createMediaElementSource(this.video); // once per element, for the life of the page
      this.src = src;
      this.dryDirect = ctx.createGain(); this.dryMatched = ctx.createGain(); this.wet = ctx.createGain(); this.dryDelay = ctx.createDelay(1);
      this.matchedReady = false;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1; this.limiter.knee.value = 0; this.limiter.ratio.value = 20; this.limiter.attack.value = 0.001; this.limiter.release.value = 0.05;
      this.trim = ctx.createGain(); this.trim.gain.value = LIMITER_TRIM;
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
      this.node = new AudioWorkletNode(ctx, "kari-processor", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { rbWasm: wasmBytes, engine: this.tier } });
      this.node.port.onmessage = (e) => this.onWorklet(e.data);
  this.node.onprocessorerror = () => { this.emit({ fault: "worklet-failed", engine: "bypass" }); this.route(false, true); };
      // graph: src → dryDirect ─────────────────────────┐   (straight wire, before the engine ever ran)
      //        src → delay → dryMatched ─────────────────┤   (straight wire, delay-matched to the engine)
      //        src → worklet → wet → limiter → trim ─────┴→ analyser → out
      src.connect(this.dryDirect); this.dryDirect.connect(this.analyser);
      src.connect(this.dryDelay); this.dryDelay.connect(this.dryMatched); this.dryMatched.connect(this.analyser);
      src.connect(this.node); this.node.connect(this.wet); this.wet.connect(this.limiter); this.limiter.connect(this.trim); this.trim.connect(this.analyser);
      this.analyser.connect(ext ? ext.sink : ctx.destination);
      this.detector.start(ctx, src); this.syncOnset();   // the worklet posts onset batches from here on (unless a tap/typed bpm owns the grid)
      this.dryDirect.gain.value = 1; this.dryMatched.gain.value = 0; this.wet.gain.value = 0;
      ext?.onWired?.(); // same task as the connects above: the straight wire and Kari's graph swap on one render quantum
      if (!ext || ext.ownsContext) {
        if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) { /* needs gesture */ } }
        if (ctx.state !== "running") { const kick = () => { ctx.resume(); window.removeEventListener("pointerdown", kick, true); window.removeEventListener("keydown", kick, true); }; window.addEventListener("pointerdown", kick, true); window.addEventListener("keydown", kick, true); }
      }
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
    // The bypass engine (a loop with no key change) is delayed to the same figure, so latch and release crossfades
    // between the matched dry path and the wet path are time-aligned. Set while the engine is r3/ss, so never audible.
    this.matchedFrames = frames;
    this.node?.port.postMessage({ type: "config", bypassDelay: frames });
  }
  /** `temporary`: park on the dry path without changing where we want to end up (an engine warm-up while wet). */
  private route(wet: boolean, force: boolean, temporary = false) {
    if (!temporary) this.wetWanted = wet;
    this.routedWet = wet;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, tc = XFADE / 3;
    const matched = !wet && this.matchedReady, direct = !wet && !this.matchedReady;
    this.wet.gain.setTargetAtTime(wet ? 1 : 0, t, tc);
    this.dryMatched.gain.setTargetAtTime(matched ? 1 : 0, t, tc);
    this.dryDirect.gain.setTargetAtTime(direct ? 1 : 0, t, tc);
    this.updateAv();
  }
  /** Returns true when the wanted engine changed (the worklet will report 'warm' again). */
  private applyEngine(active = true): boolean {
    if (!this.node) return false;
    const want: EngineName = !active ? "bypass" : this.tier;
    const changed = want !== this.lastWantedEngine;
    if (changed) { this.engineWarm = false; this.lastWantedEngine = want; this.hotBlocks = 0; }
    this.node.port.postMessage({ type: "engine", engine: want });
    return changed;
  }
  private onWorklet(m: any) {
    switch (m.type) {
      case "ready": this.latencyFrames = { r3: m.latency.r3 || 0, ss: m.latency.ss || 0 }; if (typeof m.loopMax === "number" && m.loopMax > 0) this.loopMax = m.loopMax; break;
      case "onset": this.detector.feed(m as OnsetBatch); break;
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
    const silenceMs = this.ext?.silenceMs ?? 2500;
    let lastTime = -1;
    const tick = () => {
      if (!this.ctx || !this.src) return;
      const v = this.video;
      const playing = !v.paused && !v.ended && v.readyState >= 3 && !v.muted && v.volume > 0;
      // SoundCloud: the clock must be advancing too (a stalled stream is silent for honest reasons), and mediaKeys is DRM outright.
      const advancing = this.ext ? v.currentTime > lastTime : true; lastTime = v.currentTime;
      const drm = !!this.ext && !!(v as any).mediaKeys;
      const lvl = this.level();
      const now = performance.now();
      if (playing && (drm || (lvl < 1e-4 && advancing))) {
        if (!this.silentSince) this.silentSince = now;
        else if ((drm || now - this.silentSince > silenceMs) && this._status.fault !== "drm-silent") { this.emit({ fault: "drm-silent" }); if (this.speedOnly) this.apply(this.params, true); }
      }
      else { this.silentSince = 0; if (this._status.fault === "drm-silent") { this.emit({ fault: null }); if (this.ext?.speedOnlyOnDrm) this.apply(this.params, true); } }
      setTimeout(tick, 500);
    };
    setTimeout(tick, 1500);
  }
}
