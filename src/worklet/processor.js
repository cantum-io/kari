// Mimi audio worklet — hosts Rubber Band R3 (primary) and Signalsmith Stretch (fallback).
// Runs on the audio thread. No allocations per block after warm-up. Never outputs silence on failure:
// if an engine is not ready or throws, the input is copied straight to the output.

import { RubberBandInterface, RubberBandOption as O } from "rubberband-wasm";
import SignalsmithFactory from "./generated/signalsmith-core.js";

const QUANTUM = 128;
const RING = 1 << 15; // 32768 frames per channel, ~680 ms at 48k — plenty for pitch-ratio jitter

const R3_OPTS =
  O.RubberBandOptionProcessRealTime | O.RubberBandOptionEngineFiner | O.RubberBandOptionPitchHighConsistency |
  O.RubberBandOptionWindowShort | O.RubberBandOptionChannelsTogether | O.RubberBandOptionThreadingNever;

class Ring {
  constructor(ch) { this.ch = ch; this.buf = Array.from({ length: ch }, () => new Float32Array(RING)); this.r = 0; this.w = 0; this.count = 0; }
  push(chArrays, n) { for (let c = 0; c < this.ch; c++) { const src = chArrays[c], dst = this.buf[c]; for (let i = 0; i < n; i++) dst[(this.w + i) & (RING - 1)] = src[i]; } this.w = (this.w + n) & (RING - 1); this.count = Math.min(RING, this.count + n); }
  pop(outs, n) { const have = Math.min(n, this.count); for (let c = 0; c < this.ch; c++) { const src = this.buf[c], dst = outs[c]; for (let i = 0; i < have; i++) dst[i] = src[(this.r + i) & (RING - 1)]; for (let i = have; i < n; i++) dst[i] = 0; } this.r = (this.r + have) & (RING - 1); this.count -= have; return have; }
  clear() { this.r = this.w = this.count = 0; }
}

class MimiProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    const po = options.processorOptions || {};
    this.channels = 2;
    this.engine = "bypass";           // 'r3' | 'ss' | 'bypass'
    this.wanted = po.engine || "r3";
    this.ratio = 1;
    this.underruns = 0; this.blocks = 0; this.loadMs = 0; this.lastStats = 0;
    this.ready = { r3: false, ss: false };
    this.latency = { r3: 0, ss: 0 };
    this.ring = new Ring(this.channels);
    this.dropRemaining = 0;
    this.warm = false; this.framesSinceSwitch = 0; // 'warm' = the selected engine is producing real output (main thread crossfades only then)
    this.deficit = 0;            // zeros emitted between an engine switch and 'warm' = the real stream latency of the wet path
    this.dropStart = po.dropStart === undefined ? "auto" : po.dropStart; // 'auto' = rubberband_get_start_delay(); a number overrides (probe knob)
    this.port.onmessage = (e) => this.onMessage(e.data);
    this.initR3(po.rbWasm || po.rbModule).catch(err => this.post({ type: "error", where: "r3-init", message: String(err) }));
    if (po.signalsmith !== false) this.initSS().catch(err => this.post({ type: "error", where: "ss-init", message: String(err) }));
  }

  post(m) { try { this.port.postMessage(m); } catch (_) { /* port closed */ } }

  /* ---------- Rubber Band R3 ---------- */
  async initR3(bytesOrModule) {
    if (!bytesOrModule) throw new Error("no rubberband wasm");
    const module = bytesOrModule instanceof WebAssembly.Module ? bytesOrModule : await WebAssembly.compile(bytesOrModule);
    const rb = await RubberBandInterface.initialize(module);
    this.rb = rb;
    this.rbState = rb.rubberband_new(sampleRate, this.channels, R3_OPTS, 1, this.ratio);
    rb.rubberband_set_max_process_size(this.rbState, QUANTUM);
    // channel pointer arrays + sample buffers in wasm memory
    this.rbIn = rb.malloc(QUANTUM * 4 * this.channels);
    this.rbOut = rb.malloc(QUANTUM * 4 * this.channels * 4);
    this.rbInPtrs = rb.malloc(4 * this.channels);
    this.rbOutPtrs = rb.malloc(4 * this.channels);
    const inP = new Uint32Array(this.channels), outP = new Uint32Array(this.channels);
    for (let c = 0; c < this.channels; c++) { inP[c] = this.rbIn + c * QUANTUM * 4; outP[c] = this.rbOut + c * QUANTUM * 4 * 4; }
    rb.memWrite(this.rbInPtrs, new Uint8Array(inP.buffer));
    rb.memWrite(this.rbOutPtrs, new Uint8Array(outP.buffer));
    this.primeR3();
    this.latency.r3 = rb.rubberband_get_start_delay(this.rbState);
    this.ready.r3 = true;
    this.announce();
    this.pickEngine();
  }
  primeR3() {
    const rb = this.rb, st = this.rbState;
    rb.rubberband_reset(st);
    rb.rubberband_set_pitch_scale(st, this.ratio);
    const pad = rb.rubberband_get_preferred_start_pad(st);
    const zero = new Float32Array(QUANTUM);
    for (let i = 0; i < pad; i += QUANTUM) {
      const n = Math.min(QUANTUM, pad - i);
      for (let c = 0; c < this.channels; c++) rb.memWrite(this.rbIn + c * QUANTUM * 4, zero.subarray(0, n));
      rb.rubberband_process(st, this.rbInPtrs, n, 0);
    }
    this.drainR3(true);
    this.dropRemaining = this.dropStart === "auto" ? rb.rubberband_get_start_delay(st) : +this.dropStart;
    this.lastDrop = this.dropRemaining;
    this.ring.clear();
  }
  drainR3(discard) {
    const rb = this.rb, st = this.rbState; let av;
    while ((av = rb.rubberband_available(st)) > 0) {
      const n = Math.min(av, QUANTUM * 4);
      const got = rb.rubberband_retrieve(st, this.rbOutPtrs, n);
      if (got <= 0) break;
      if (discard) continue;
      let skip = 0;
      if (this.dropRemaining > 0) { skip = Math.min(this.dropRemaining, got); this.dropRemaining -= skip; }
      if (got - skip <= 0) continue;
      const chunk = [];
      for (let c = 0; c < this.channels; c++) chunk.push(rb.memReadF32(this.rbOut + c * QUANTUM * 4 * 4 + skip * 4, got - skip));
      this.ring.push(chunk, got - skip);
    }
  }
  processR3(input, output, n) {
    const rb = this.rb, st = this.rbState;
    for (let c = 0; c < this.channels; c++) rb.memWrite(this.rbIn + c * QUANTUM * 4, input[c % input.length] || this._zero(n));
    rb.rubberband_process(st, this.rbInPtrs, n, 0);
    this.drainR3(false);
    const have = this.ring.pop(output, n);
    if (have < n) { if (this.warm) this.underruns++; else this.deficit += n - have; } // warm-up zeros are the engine's latency, not trouble
    else if (!this.warm) { this.warm = true; this.latency.r3 = this.deficit; this.post({ type: "warm", engine: "r3", latency: this.deficit, startDelay: this.rb.rubberband_get_start_delay(this.rbState), startPad: this.rb.rubberband_get_preferred_start_pad(this.rbState), dropped: this.lastDrop }); }
  }
  _zero(n) { if (!this._z || this._z.length !== n) this._z = new Float32Array(n); return this._z; }

  /* ---------- Signalsmith Stretch (fallback) ---------- */
  async initSS() {
    const m = await SignalsmithFactory();
    m._main();
    // 120 ms block, interval ÷8 — the most accurate free config from the Sprint 0 bench
    const block = Math.round(0.120 * sampleRate), interval = Math.round(block / 8);
    m._configure(this.channels, block, interval, false);
    m._reset();
    const len = m._inputLatency() + m._outputLatency();
    const ptr = m._setBuffers(this.channels, len);
    this.ss = m; this.ssLen = len;
    this.ssIn = []; this.ssOut = [];
    for (let c = 0; c < this.channels; c++) { this.ssIn.push(ptr + len * 4 * c); this.ssOut.push(ptr + len * 4 * (c + this.channels)); }
    this.latency.ss = len;
    this.ready.ss = true;
    this.announce();
    this.pickEngine();
  }
  processSS(input, output, n) {
    const m = this.ss, mem = m.HEAP8.buffer;
    m._setTransposeFactor(this.ratio, 8000 / sampleRate);
    m._setFormantSemitones(0, false);
    m._setFormantBase(0);
    for (let c = 0; c < this.channels; c++) { const src = input[c % input.length]; const dst = new Float32Array(mem, this.ssIn[c], n); if (src) dst.set(src); else dst.fill(0); }
    m._process(n, n);
    for (let c = 0; c < this.channels; c++) output[c].set(new Float32Array(mem, this.ssOut[c], n));
    this.framesSinceSwitch += n;
    if (!this.warm && this.framesSinceSwitch >= this.ssLen + n) { this.warm = true; this.post({ type: "warm", engine: "ss", latency: this.latency.ss }); }
  }

  /* ---------- control ---------- */
  announce() { this.post({ type: "ready", engines: { ...this.ready }, latency: { ...this.latency }, sampleRate }); }
  pickEngine() {
    const want = this.wanted;
    let next = "bypass";
    if (want === "r3" && this.ready.r3) next = "r3";
    else if (want === "ss" && this.ready.ss) next = "ss";
    else if (want === "r3" && this.ready.ss) next = "ss";
    else if (want === "ss" && this.ready.r3) next = "r3";
    if (next !== this.engine) {
      this.engine = next; this.warm = false; this.framesSinceSwitch = 0; this.deficit = 0;
      if (next === "r3") this.primeR3(); if (next === "ss") this.ss._reset();
      this.post({ type: "engine", engine: next, latency: this.latency[next] || 0 });
      if (next === "bypass") { this.warm = true; this.post({ type: "warm", engine: "bypass", latency: 0 }); }
    } else if (this.warm) this.post({ type: "warm", engine: this.engine, latency: this.latency[this.engine] || 0 }); // already there: tell the main thread it can route now
  }
  onMessage(m) {
    switch (m.type) {
      case "ratio": {
        const r = Math.max(0.25, Math.min(4, +m.ratio || 1));
        this.ratio = r;
        if (this.rb && this.rbState) this.rb.rubberband_set_pitch_scale(this.rbState, r);
        break;
      }
      case "engine": this.wanted = m.engine; this.pickEngine(); break;
      case "config": if (m.dropStart !== undefined) this.dropStart = m.dropStart; break;
      case "reset": if (this.engine === "r3") this.primeR3(); if (this.engine === "ss" && this.ss) this.ss._reset(); this.underruns = 0; break;
      case "stats": this.sendStats(true); break;
    }
  }
  sendStats(force) {
    const t = currentTime;
    if (!force && t - this.lastStats < 1) return;
    this.lastStats = t;
    const load = this.blocks ? this.loadMs / this.blocks : 0; // avg ms per block (Date.now resolution)
    this.post({ type: "stats", engine: this.engine, underruns: this.underruns, avgBlockMs: load, budgetMs: QUANTUM / sampleRate * 1000, ringFrames: this.ring.count });
    this.blocks = 0; this.loadMs = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0], output = outputs[0];
    if (!output || !output.length) return true;
    const n = output[0].length;
    const t0 = Date.now();
    try {
      if (this.engine === "r3" && this.ready.r3) this.processR3(input, output, n);
      else if (this.engine === "ss" && this.ready.ss) this.processSS(input, output, n);
      else for (let c = 0; c < output.length; c++) { const src = input && input[c % input.length]; if (src) output[c].set(src); else output[c].fill(0); }
    } catch (err) {
      // Never go silent: fall back to a straight wire and tell the main thread.
      for (let c = 0; c < output.length; c++) { const src = input && input[c % input.length]; if (src) output[c].set(src); else output[c].fill(0); }
      this.engine = "bypass"; this.post({ type: "error", where: "process", message: String(err) });
    }
    this.loadMs += Date.now() - t0; this.blocks++;
    this.sendStats(false);
    return true;
  }
}

registerProcessor("mimi-processor", MimiProcessor);
