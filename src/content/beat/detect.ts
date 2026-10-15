// Kari — in-house tempo detection. No model, no dependency, GPL-2.0-only like the rest of the tree (the licence note
// on the ML route stays in docs/RESEARCH-2026-10-14-SOUNDCLOUD-LOOPS.md § 2d; that decision is Jesse's and is not needed
// for this). Pure where it can be: Node runs the tests straight from this file, so it has no runtime imports.
//
// Three pieces, front to back:
//   OnsetFeature     audio thread (the worklet imports it). Mono mix → four first-order bands (<150 Hz, 150–1000,
//                    1–4 kHz, >4 kHz) → per-hop log energies → half-wave-rectified difference summed over the bands =
//                    onset strength at 100 frames/s (hop = sampleRate/100). The low band is kept on its own for the
//                    bar "1". Ten frames make a batch the worklet posts with the context time of its first frame.
//   TempoTracker     main thread (the controller's world: the content script on YouTube, the MAIN-world hook on
//                    SoundCloud). A 6 s window of frames in media time. Novelty = strength minus its 0.5 s moving mean,
//                    rectified, scaled so its peaks sit near 1. Autocorrelation over 60–200 bpm picks period candidates
//                    (with their octaves); each is refined by a comb anchored on the newest frame: score = P · E · prior,
//                    where P = mean novelty under the teeth (precision), E = the share of all novelty the teeth explain
//                    (so the fastest period that explains every onset wins over its double, and the slower period wins
//                    when the half-beats are empty), and the prior leans toward 80–160 bpm without forbidding 60–200.
//                    Beat phase = the newest tooth, refined by the novelty centroid around every tooth. The "1" is the
//                    beat class (mod 4) with the most low-band novelty under it, read as the newest beat of that class.
//                    Confidence = sqrt(P · E), scaled down when the autocorrelation peak is weak (noise).
//   AutoBeatDetector the BeatDetector the controller holds (replaces the old NullBeatDetector). Maps each batch from
//                    context time to media time with one synchronous read of both clocks at receipt (main-thread lag
//                    cancels: both clocks advanced the same), counts only frames while the element plays and the
//                    signal has not been silent for over 2 s (a rest counts, a silent lead-in does not), publishes after 6 s of such frames when confidence clears the bar, re-runs
//                    every 2 s and re-publishes while confidence holds, never while a loop is latched (held until
//                    release), never once a tap or a typed bpm owns the grid, and starts over on a seek or a rate change.
import type { BeatGrid } from "./grid";

export interface BeatDetector {
  readonly name: string;
  /** Begin listening. `tap` is the graph node the audio comes from (unused by the worklet-fed detector; kept for the seam). */
  start(ctx: { sampleRate: number }, tap: { connect(n: AudioNode): unknown }): void;
  stop(): void;
  /** Called with a provisional grid as soon as one exists and again whenever it is refined. */
  onGrid(cb: (g: BeatGrid) => void): void;
}

/* ------------------------------------------------------------------ onset strength (audio thread) */

export const ONSET_HZ = 100;      // frames per second
export const ONSET_BATCH = 10;    // frames per posted batch (100 ms)
const BAND_HZ = [150, 1000, 4000];
const LOG_GAIN = 1000;            // log1p(LOG_GAIN · meanSquare): −60 dBFS → 0.001, 0 dBFS → 6.9

export type OnsetBatch = { type: "onset"; t: number; hop: number; odf: Float32Array; low: Float32Array; rms: number };

export class OnsetFeature {
  readonly hop: number; readonly hopSec: number;
  private a: Float64Array; private y = new Float64Array(3);
  private e = new Float64Array(5);                 // four band energies + the broadband sum, accumulating over the hop
  private prev = new Float64Array(4);              // last hop's log band energies
  private i = 0;                                   // samples into the current hop
  private k = 0;                                   // frames into the current batch
  private odf: Float32Array; private low: Float32Array; private ms = 0;
  private frame0 = 0;                              // context frame of the batch's first sample
  readonly sampleRate: number;
  constructor(sampleRate: number, batch = ONSET_BATCH) {   // no parameter properties: Node strips types only
    this.sampleRate = sampleRate; this.hop = Math.round(sampleRate / ONSET_HZ); this.hopSec = this.hop / sampleRate;
    this.a = Float64Array.from(BAND_HZ, f => 1 - Math.exp(-2 * Math.PI * f / sampleRate));
    this.odf = new Float32Array(batch); this.low = new Float32Array(batch);
  }
  /**
   * Feed one render quantum (the worklet's channel array: 0, 1 or 2 channels). `ctxFrame` is the context frame of
   * `input[.][0]` (AudioWorkletGlobalScope's currentFrame). Returns a batch when ten frames completed inside this call.
   */
  push(input: ArrayLike<Float32Array> | null, n: number, ctxFrame: number): OnsetBatch | null {
    const in0 = input && input[0], in1 = (input && input[1]) || in0;
    const a0 = this.a[0], a1 = this.a[1], a2 = this.a[2], y = this.y, e = this.e, hop = this.hop;
    let out: OnsetBatch | null = null;
    for (let s = 0; s < n; s++) {
      if (this.i === 0 && this.k === 0) this.frame0 = ctxFrame + s;
      const x = in0 ? (in1 ? 0.5 * (in0[s] + in1[s]) : in0[s]) : 0;
      y[0] += a0 * (x - y[0]); y[1] += a1 * (x - y[1]); y[2] += a2 * (x - y[2]);
      const b0 = y[0], b1 = y[1] - y[0], b2 = y[2] - y[1], b3 = x - y[2];
      e[0] += b0 * b0; e[1] += b1 * b1; e[2] += b2 * b2; e[3] += b3 * b3; e[4] += x * x;
      if (++this.i === hop) {
        this.i = 0;
        let sum = 0, lo = 0;
        for (let b = 0; b < 4; b++) { const l = Math.log1p(LOG_GAIN * e[b] / hop); const d = l - this.prev[b]; this.prev[b] = l; if (d > 0) { sum += d; if (b === 0) lo = d; } e[b] = 0; }
        this.ms += e[4] / hop; e[4] = 0;
        this.odf[this.k] = sum; this.low[this.k] = lo;
        if (++this.k === this.odf.length) {
          out = { type: "onset", t: this.frame0 / this.sampleRate, hop: this.hopSec, odf: this.odf.slice(), low: this.low.slice(), rms: Math.sqrt(this.ms / this.k) };
          this.k = 0; this.ms = 0;
        }
      }
    }
    return out;
  }
  reset() { this.y.fill(0); this.e.fill(0); this.prev.fill(0); this.i = 0; this.k = 0; this.ms = 0; }
}

/* ------------------------------------------------------------------ period, phase and the "1" (main thread) */

export const WINDOW_SEC = 6;      // the analysis window and the minimum learning time
export const REFINE_SEC = 2;      // re-run cadence once the window is full
export const BPM_LO = 60, BPM_HI = 200;          // the search range
export const BPM_PREF_LO = 80, BPM_PREF_HI = 160; // the prior's flat top
export const MIN_CONFIDENCE = 0.35;
const MEAN_SEC = 0.5;             // moving-mean length for the novelty
const TOOTH_TOL = 1;              // frames either side of a tooth that still count (±10 ms: humanised hits)
const ONSET_LAG = 0.5;            // frames: an onset lands mid-frame on average; the ODF frame is stamped at its start
const AUTOCORR_REF = 0.5;         // an autocorrelation peak this high (clicks: 0.5–0.7) costs nothing; noise sits near 0.2

export type TempoEstimate = {
  bpm: number;
  phase: number;        // media time of a "1" (the newest beat of the strongest class)
  beat: number;         // media time of the newest beat
  confidence: number;   // sqrt(P · E), 0..1
  period: number;       // frames
  precision: number;    // P
  explained: number;    // E
  downbeatClass: number; // 0..3, counted back from the newest beat
  autocorr: number;     // normalised autocorrelation at the period, before the prior
};

/** The prior over bpm: 1 inside 80–160, falling toward 0.4 an octave outside. Never zero inside 60–200. */
export function tempoPrior(bpm: number): number {
  const d = bpm < BPM_PREF_LO ? Math.log2(BPM_PREF_LO / bpm) : bpm > BPM_PREF_HI ? Math.log2(bpm / BPM_PREF_HI) : 0;
  return Math.max(0.4, 1 - 1.2 * d);
}

export class TempoTracker {
  readonly size: number;
  private odf: Float32Array; private low: Float32Array; private time: Float64Array;
  private w = 0;                                       // frames pushed so far
  private nov: Float32Array; private lnov: Float32Array; private ord: Float32Array;
  readonly dt: number;                                 // media seconds per frame
  constructor(dt: number, windowSec = WINDOW_SEC) {
    this.dt = dt; this.size = Math.max(64, Math.round(windowSec / dt));
    this.odf = new Float32Array(this.size); this.low = new Float32Array(this.size); this.time = new Float64Array(this.size);
    this.nov = new Float32Array(this.size); this.lnov = new Float32Array(this.size); this.ord = new Float32Array(this.size);
  }
  get count() { return Math.min(this.w, this.size); }
  get full() { return this.w >= this.size; }
  push(odf: number, low: number, mediaTime: number) { const i = this.w % this.size; this.odf[i] = odf; this.low[i] = low; this.time[i] = mediaTime; this.w++; }
  reset() { this.w = 0; }

  /** Oldest-first copy of a ring into `dst`, with the moving mean removed, rectified and scaled so the 95th percentile is 1. */
  private novelty(src: Float32Array, dst: Float32Array) {
    const n = this.count, start = this.w - n, M = Math.max(1, Math.round(MEAN_SEC / this.dt / 2));
    for (let k = 0; k < n; k++) dst[k] = src[(start + k) % this.size];
    // moving mean over ±M with a running sum
    const tmp = this.ord; let sum = 0, lo = 0, hi = -1;
    for (let k = 0; k < n; k++) {
      const nlo = Math.max(0, k - M), nhi = Math.min(n - 1, k + M);
      while (hi < nhi) sum += dst[++hi]; while (lo < nlo) sum -= dst[lo++];
      tmp[k] = sum / (nhi - nlo + 1);
    }
    let m = 0;
    for (let k = 0; k < n; k++) { const v = dst[k] - tmp[k]; dst[k] = v > 0 ? v : 0; if (v > 0) tmp[m++] = v; }
    if (!m) return;
    const sorted = tmp.subarray(0, m).slice().sort();
    const ref = sorted[Math.min(m - 1, Math.floor(m * 0.95))] || sorted[m - 1];
    if (ref > 0) for (let k = 0; k < n; k++) dst[k] /= ref;
  }

  /** Tooth value at fractional frame `t`: the largest novelty within ±TOOTH_TOL frames of it. */
  private tooth(nov: Float32Array, n: number, t: number): number {
    const c = Math.round(t); let v = 0;
    for (let j = c - TOOTH_TOL; j <= c + TOOTH_TOL; j++) if (j >= 0 && j < n && nov[j] > v) v = nov[j];
    return v;
  }
  /** Comb anchored on `end` (the newest tooth) with period `tau`: sum under the teeth and their count. */
  private comb(nov: Float32Array, n: number, tau: number, end: number): { sum: number; teeth: number } {
    let sum = 0, teeth = 0;
    for (let t = end; t >= -TOOTH_TOL; t -= tau) { sum += this.tooth(nov, n, t); teeth++; }
    return { sum, teeth };
  }

  /** The estimate for the current window, or null while it is empty. */
  analyze(): TempoEstimate | null {
    const n = this.count; if (n < 2 * Math.round(60 / (BPM_LO * this.dt))) return null;
    const nov = this.nov, lnov = this.lnov;
    this.novelty(this.odf, nov); this.novelty(this.low, lnov);
    let total = 0, energy = 0; for (let k = 0; k < n; k++) { total += nov[k]; energy += nov[k] * nov[k]; }
    if (!(total > 0) || !(energy > 0)) return null;
    const tauMin = Math.max(2, Math.floor(60 / (BPM_HI * this.dt))), tauMax = Math.min(n >> 1, Math.ceil(60 / (BPM_LO * this.dt)));
    if (tauMax <= tauMin) return null;
    const bpmOf = (tau: number) => 60 / (tau * this.dt);
    // 1. autocorrelation of the novelty, weighted by the prior; local maxima are the candidates
    const r = this.ord; r.fill(0);
    for (let tau = tauMin; tau <= tauMax; tau++) { let s = 0; for (let k = 0; k + tau < n; k++) s += nov[k] * nov[k + tau]; r[tau] = s / energy * tempoPrior(bpmOf(tau)); }
    const cands: number[] = [];
    for (let tau = tauMin; tau <= tauMax; tau++) if (r[tau] > 0 && r[tau] >= (r[tau - 1] || 0) && r[tau] >= (r[tau + 1] || 0)) cands.push(tau);
    cands.sort((a, b) => r[b] - r[a]); cands.length = Math.min(cands.length, 4);
    const seeds: number[] = [];
    const add = (t: number) => { if (t >= tauMin && t <= tauMax && !seeds.some(s => Math.abs(s - t) < 1.5)) seeds.push(t); };
    for (const t of cands) { add(t); add(t / 2); add(t * 2); }
    if (!seeds.length) return null;
    // 2. each seed: coarse phase on the newest frame, then a fine period × phase search, scored P · E · prior
    let best: { tau: number; end: number; score: number; P: number; E: number } | null = null;
    for (const seed of seeds) {
      let bestEnd = n - 1, bestSum = -1;
      for (let end = n - 1; end > n - 1 - seed; end--) { const c = this.comb(nov, n, seed, end); if (c.sum > bestSum) { bestSum = c.sum; bestEnd = end; } }
      // the autocorrelation at the seed enters the score too, so a candidate cannot win the search on P · E · prior and
      // then fail its own confidence bar (a 60 bpm click train has r ≈ 0 at the half period: 120 must not win it)
      const support = Math.sqrt(Math.min(1, (r[Math.round(seed)] / tempoPrior(bpmOf(Math.round(seed)))) / AUTOCORR_REF));
      for (let tau = seed - 1.5; tau <= seed + 1.5; tau += 0.05) {
        if (tau < tauMin - 0.5 || tau > tauMax + 0.5) continue;
        const prior = tempoPrior(bpmOf(tau)) * support;
        for (let end = bestEnd - 2; end <= bestEnd + 2; end += 0.25) {
          const c = this.comb(nov, n, tau, end);
          const P = c.sum / c.teeth, E = c.sum / total, score = P * E * prior;
          if (!best || score > best.score) best = { tau, end, score, P, E };
        }
      }
    }
    if (!best) return null;
    // 3. sub-frame period and phase: the novelty centroid around every tooth is an onset position; a weighted
    //    least-squares line through (tooth index, centroid) gives the period as its slope and the newest beat as its
    //    intercept, free of the ±1-frame tolerance the search used
    let sw0 = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, i = 0;
    for (let t = best.end; t >= 0; t -= best.tau, i++) {
      const c = Math.round(t); let s = 0, w = 0;
      for (let j = c - TOOTH_TOL; j <= c + TOOTH_TOL; j++) if (j >= 0 && j < n) { s += j * nov[j]; w += nov[j]; }
      if (w <= 0) continue;
      const pos = s / w;
      sw0 += w; sx += w * i; sy += w * pos; sxx += w * i * i; sxy += w * i * pos;
    }
    let tau = best.tau, end = best.end;
    const det = sw0 * sxx - sx * sx;
    if (sw0 > 0 && det > 1e-9) {
      const slope = (sw0 * sxy - sx * sy) / det, icpt = (sy - slope * sx) / sw0;
      if (Math.abs(-slope - best.tau) < 1) { tau = -slope; end = icpt; }
    }
    // 4. the "1": the beat class (mod 4, counted back from the newest beat) with the most low-band novelty under it
    const cls = [0, 0, 0, 0]; i = 0;
    for (let t = end; t >= -TOOTH_TOL; t -= tau, i++) cls[i & 3] += this.tooth(lnov, n, t);
    let downbeatClass = 0; for (let c = 1; c < 4; c++) if (cls[c] > cls[downbeatClass]) downbeatClass = c;
    const at = (f: number) => { const c = Math.max(0, Math.min(n - 1, Math.round(f))); return this.time[(this.w - n + c) % this.size] + (f - c + ONSET_LAG) * this.dt; };
    const r0 = r[Math.round(tau)] / tempoPrior(bpmOf(Math.round(tau)));
    return { bpm: bpmOf(tau), beat: at(end), phase: at(end - downbeatClass * tau), confidence: Math.min(1, Math.sqrt(Math.min(1, best.P) * best.E) * Math.sqrt(Math.min(1, r0 / AUTOCORR_REF))), period: tau, precision: best.P, explained: best.E, downbeatClass, autocorr: r0 };
  }
}

/* ------------------------------------------------------------------ the detector the controller holds */

export type DetectorState = "idle" | "learning" | "found" | "none";
/** Both clocks at once, read synchronously when a batch arrives; `playing` gates what counts as real playback. */
export type DetectorClock = () => { media: number; ctx: number; rate: number; playing: boolean };
const SILENT_RMS = 1e-3;          // a batch under −60 dBFS …
const SILENT_GRACE = 20;          // … still counts for 2 s after the last sound (a rest, a metronome's gap); longer is not playback

export class AutoBeatDetector implements BeatDetector {
  readonly name = "auto";
  private active = false; private frozen = false; private muted = false;
  private tracker: TempoTracker | null = null; private rate = 1;
  private played = 0; private sinceRun = 0; private lastConf = 0; private pending: TempoEstimate | null = null;
  private _state: DetectorState = "idle"; private _last: TempoEstimate | null = null;
  private fed = 0; private skipped = { paused: 0, silent: 0 }; private lastRms = 0; private runs = 0; private quiet = SILENT_GRACE;
  private gridCb: ((g: BeatGrid) => void) | null = null; private stateCb: ((s: DetectorState) => void) | null = null;
  private clock: DetectorClock;
  constructor(clock: DetectorClock) { this.clock = clock; }
  get state() { return this._state; }
  get last() { return this._last; }
  /** For the live probe: what the detector has been fed and why frames were skipped. */
  get debug() { return { state: this._state, fed: this.fed, played: this.played, skipped: { ...this.skipped }, lastRms: this.lastRms, runs: this.runs, rate: this.rate, window: this.tracker?.count ?? 0, lastConf: this.lastConf, frozen: this.frozen, muted: this.muted, active: this.active }; }
  start(_ctx?: { sampleRate: number }, _tap?: { connect(n: AudioNode): unknown }) { this.active = true; this.setState(this.muted ? "idle" : "learning"); }
  stop() { this.active = false; this.setState("idle"); }
  onGrid(cb: (g: BeatGrid) => void) { this.gridCb = cb; }
  onState(cb: (s: DetectorState) => void) { this.stateCb = cb; }
  /** A seek, a rate change or a new track: the window is meaningless now. The published grid stays the controller's. */
  reset() { this.tracker = null; this.played = 0; this.sinceRun = 0; this.pending = null; this.quiet = SILENT_GRACE; this.lastConf *= 0.5; if (this.active && !this.muted) this.setState("learning"); }
  /** A loop is latched: hold every publication until it lets go (the grid never moves under a loop). */
  freeze(on: boolean) { this.frozen = on; if (!on && this.pending) { const p = this.pending; this.pending = null; this.emit(p); } }
  /** A tap or a typed bpm owns the grid: stop publishing (and let the worklet stop posting). Cleared with the grid. */
  mute(on: boolean) {
    if (on === this.muted) return;   // the controller calls this on every grid write; only a change does anything
    this.muted = on;
    if (on) { this.pending = null; this.setState("idle"); } else if (this.active) { this.lastConf = 0; this.reset(); }
  }
  get listening() { return this.active && !this.muted; }
  private setState(s: DetectorState) { if (s !== this._state) { this._state = s; this.stateCb?.(s); } }

  /** One batch from the worklet. */
  feed(m: OnsetBatch) {
    if (!this.listening || !m || m.odf.length === 0) return;
    this.fed++; this.lastRms = m.rms;
    const c = this.clock();
    if (!c.playing) { this.skipped.paused++; return; }
    if (m.rms >= SILENT_RMS) this.quiet = 0; else if (++this.quiet > SILENT_GRACE) { this.skipped.silent++; return; }
    const rate = c.rate > 0 ? c.rate : 1;
    if (this.tracker && Math.abs(rate - this.rate) > 1e-3) this.reset();
    if (!this.tracker) { this.rate = rate; this.tracker = new TempoTracker(m.hop * rate); }
    const start = c.media - (c.ctx - m.t) * rate, dt = m.hop * rate;
    for (let k = 0; k < m.odf.length; k++) this.tracker.push(m.odf[k], m.low[k], start + k * dt);
    this.played += m.odf.length; this.sinceRun += m.odf.length;
    const win = this.tracker.size, every = Math.round(REFINE_SEC / m.hop);
    if (this.played < win || this.sinceRun < every) return;
    this.sinceRun = 0; this.runs++;
    const est = this.tracker.analyze();
    this._last = est;
    if (est && est.confidence >= MIN_CONFIDENCE && est.confidence >= this.lastConf * 0.85) this.publish(est);
    else if (this._state === "learning" && this.played >= 2 * win) this.setState("none");
  }
  private publish(est: TempoEstimate) { if (this.frozen) { this.pending = est; return; } this.emit(est); }
  private emit(est: TempoEstimate) {
    this.lastConf = est.confidence; this.setState("found");
    this.gridCb?.({ bpm: est.bpm, phase: est.phase, source: "auto" });
  }
}
