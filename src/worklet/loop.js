// Kari — beat-loop stage. Runs on the audio thread in front of the pitch engine, so a key change applies to the
// loop and Rubber Band stays the only lossy stage. Plain JS with no worklet globals, so Node tests it directly.
//
// Model. `w` counts every input frame the stage has seen: the track running underneath (slip). A latch names a
// body of `len` frames that began `back` frames ago, on a beat-grid line the content script chose. Playback keeps
// running live until it reaches the body's end, then wraps to its start. The wrap is an equal-power crossfade
// from the body's tail into its pre-roll (the frames just before the start), so the seam carries no step. A
// release, or a fresh latch while a loop is already wrapping, jumps back to the live position under the same
// crossfade. The media element is never seeked.
//
// Memory at 48 kHz: ring 131072 frames (2.73 s) + body of the same size + a few hundred frames of fades,
// stereo float32: about 2 MB.

export const DEFAULT_FADE_MS = 6;
export const DEFAULT_SECONDS = 2;

export class LoopStage {
  constructor(sampleRate, { seconds = DEFAULT_SECONDS, fadeMs = DEFAULT_FADE_MS } = {}) {
    let n = 256; while (n < seconds * sampleRate) n <<= 1;
    this.sampleRate = sampleRate;
    this.N = n; this.mask = n - 1;
    this.ring0 = new Float32Array(n); this.ring1 = new Float32Array(n);   // capture: the last N input frames
    this.body0 = new Float32Array(n); this.body1 = new Float32Array(n);   // the latched loop, copied out of the ring
    this.xf = Math.max(2, Math.round(fadeMs * sampleRate / 1000));
    this.pre0 = new Float32Array(this.xf); this.pre1 = new Float32Array(this.xf);   // frames before the body: the seam's fade-in source
    this.fade0 = new Float32Array(this.xf); this.fade1 = new Float32Array(this.xf); // a jump's fade-out source
    this.gOut = new Float32Array(this.xf); this.gIn = new Float32Array(this.xf);
    for (let k = 0; k < this.xf; k++) { const th = (Math.PI / 2) * (k + 0.5) / this.xf; this.gOut[k] = Math.cos(th); this.gIn[k] = Math.sin(th); }
    this.out0 = new Float32Array(128); this.out1 = new Float32Array(128); this.out = [this.out0, this.out1];
    this.zero = new Float32Array(128);
    this.w = 0;          // frames captured so far (next write)
    this.p = 0;          // next frame to play; equals w when live
    this.on = false; this.len = 0; this.start = 0;
    this.fadeLeft = 0;   // frames left of a jump's fade-out
  }
  get minLen() { return 2 * this.xf; }
  get maxLen() { return this.N - this.xf; }

  /**
   * Latch a loop of `lenFrames` whose grid line passed `backFrames` ago. Returns the number of live frames before
   * the body begins: 0 normally; positive when the latch landed inside the tail crossfade of its cell, which then
   * loops the next cell instead (a mid-fade start would carry a step).
   */
  engage(lenFrames, backFrames) {
    const len = Math.max(this.minLen, Math.min(this.maxLen, Math.round(lenFrames) || 0));
    let back = Math.max(0, Math.min(this.maxLen, Math.round(backFrames) || 0));
    if (back > this.w) back = this.w;                 // nothing captured that far back (fresh attach): anchor on the oldest frame held
    let start = this.w - back;
    if (back >= len - this.xf) start += len;
    this.jump();                                      // a wrapping loop fades out; a live-equivalent one is already continuous
    this.on = true; this.len = len; this.start = start;
    const r0 = this.ring0, r1 = this.ring1, m = this.mask, oldest = this.w - this.N;
    for (let k = 0; k < this.xf; k++) {
      const f = start - this.xf + k, ok = f >= 0 && f >= oldest;
      this.pre0[k] = ok ? r0[f & m] : 0; this.pre1[k] = ok ? r1[f & m] : 0;
    }
    const have = Math.max(0, Math.min(this.w, start + len) - start);   // the rest of the body fills from live input as it arrives
    for (let j = 0; j < have; j++) { const f = start + j; this.body0[j] = r0[f & m]; this.body1[j] = r1[f & m]; }
    this.p = this.w;
    return Math.max(0, start - this.w);
  }

  /** Back to the track underneath, from where it is now. */
  release() { if (!this.on) return; this.jump(); this.on = false; this.p = this.w; }

  /** Snapshot the next xf frames the loop would have played, so the move to live fades them out. */
  jump() {
    if (!this.on || this.p === this.w) return;        // live-equivalent (first pass or pending): nothing to fade
    let j = this.p - this.start;
    for (let k = 0; k < this.xf; k++) { this.readBody(j, k, this.fade0, this.fade1); if (++j >= this.len) j = 0; }
    this.fadeLeft = this.xf;
  }
  readBody(j, k, d0, d1) {
    const t = j - (this.len - this.xf);
    if (t < 0) { d0[k] = this.body0[j]; d1[k] = this.body1[j]; }
    else { const a = this.gOut[t], b = this.gIn[t]; d0[k] = a * this.body0[j] + b * this.pre0[t]; d1[k] = a * this.body1[j] + b * this.pre1[t]; }
  }

  /** One render quantum. `input` is the worklet's channel array (0, 1 or 2 channels). Returns two channels. */
  process(input, n) {
    const in0 = (input && input[0]) || this.zero, in1 = (input && input[1]) || in0;
    if (this.out0.length !== n) { this.out0 = new Float32Array(n); this.out1 = new Float32Array(n); this.out = [this.out0, this.out1]; }
    const out0 = this.out0, out1 = this.out1, r0 = this.ring0, r1 = this.ring1, m = this.mask;
    const b0 = this.body0, b1 = this.body1, pre0 = this.pre0, pre1 = this.pre1, f0 = this.fade0, f1 = this.fade1;
    const xf = this.xf, gOut = this.gOut, gIn = this.gIn, on = this.on, len = this.len, start = this.start, tail = len - xf;
    let w = this.w, p = this.p, fadeLeft = this.fadeLeft;
    for (let i = 0; i < n; i++) {
      const x0 = in0[i], x1 = in1[i];
      r0[w & m] = x0; r1[w & m] = x1;
      if (on) { const jj = w - start; if (jj >= 0 && jj < len) { b0[jj] = x0; b1[jj] = x1; } }
      w++;
      let s0, s1;
      if (on && p >= start) {
        const j = p - start, t = j - tail;
        if (t < 0) { s0 = b0[j]; s1 = b1[j]; }
        else { const a = gOut[t], b = gIn[t]; s0 = a * b0[j] + b * pre0[t]; s1 = a * b1[j] + b * pre1[t]; }
        if (++p - start >= len) p = start;
      } else { s0 = x0; s1 = x1; p = w; }
      if (fadeLeft > 0) { const k = xf - fadeLeft; s0 = gOut[k] * f0[k] + gIn[k] * s0; s1 = gOut[k] * f1[k] + gIn[k] * s1; fadeLeft--; }
      out0[i] = s0; out1[i] = s1;
    }
    this.w = w; this.p = p; this.fadeLeft = fadeLeft;
    return this.out;
  }
}

/** A fixed delay for the bypass engine, so a loop with no key change sits at the same latency as the matched dry path. */
export class DelayLine {
  constructor(capacity = 16384) {
    let n = 256; while (n < capacity) n <<= 1;
    this.N = n; this.m = n - 1; this.b0 = new Float32Array(n); this.b1 = new Float32Array(n); this.w = 0; this.d = 0;
  }
  setDelay(frames) { this.d = Math.max(0, Math.min(this.N - 128, Math.round(frames) || 0)); }
  process(in0, in1, out0, out1, n) {
    const b0 = this.b0, b1 = this.b1, m = this.m, d = this.d; let w = this.w;
    for (let i = 0; i < n; i++) { b0[w & m] = in0[i]; b1[w & m] = in1[i]; const r = (w - d) & m; out0[i] = b0[r]; out1[i] = b1[r]; w++; }
    this.w = w;
  }
}
