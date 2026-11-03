// Kari — recorder stage. Runs on the audio thread at the chain's meeting point (the analyser just before the
// output) and copies every frame it is given into fixed-size chunks for the main thread. Each chunk is stamped
// with the context frame of its first sample and its own peak, so a lost chunk shows as a jump in the count, never
// as silence, and a silent take is told apart from a dead one. Plain JS with no worklet globals (processor.js
// registers it as "kari-recorder"), so Node tests it directly.
//
// Per chunk one Float32Array per channel is allocated and handed to the main thread as a transferable: no copy on
// the way out, and no reuse of a buffer the other side still reads. 12 allocations a second at the default size.

export const DEFAULT_CHUNK = 4096;   // frames per chunk: 85 ms at 48 kHz, 32 KB for stereo float

export class RecorderStage {
  /**
   * @param {number} channels    channels in the chunks (a missing input channel repeats the last one; no input = silence)
   * @param {number} chunk       frames per chunk
   * @param {(c: { frame: number, frames: number, peak: number, data: Float32Array[] }) => void} emit
   */
  constructor(channels = 2, chunk = DEFAULT_CHUNK, emit = () => {}) {
    this.channels = Math.max(1, channels | 0);
    this.chunk = Math.max(128, chunk | 0);
    this.emit = emit;
    this.on = false;
    this.buf = null; this.fill = 0; this.first = 0; this.peak = 0;
    this.total = 0;      // frames emitted since start()
  }
  fresh() { this.buf = Array.from({ length: this.channels }, () => new Float32Array(this.chunk)); this.fill = 0; this.peak = 0; }
  start() { if (this.on) return; this.on = true; this.total = 0; this.fresh(); }
  /** Stop and flush the partial chunk, so the last frames are never lost. */
  stop() { if (!this.on) return; this.flush(); this.on = false; this.buf = null; }
  /**
   * Feed `n` frames whose first sample sits at context frame `frame`. `input` is the worklet's channel array:
   * empty while the source is inactive (counts as silence, so the take keeps time).
   */
  push(input, n, frame) {
    if (!this.on) return;
    let i = 0;
    while (i < n) {
      if (this.fill === 0) this.first = frame + i;
      const take = Math.min(n - i, this.chunk - this.fill);
      for (let c = 0; c < this.channels; c++) {
        const dst = this.buf[c];
        const src = input.length ? input[c < input.length ? c : input.length - 1] : null;
        if (src) {
          for (let k = 0; k < take; k++) { const v = src[i + k]; dst[this.fill + k] = v; const a = v < 0 ? -v : v; if (a > this.peak) this.peak = a; }
        } else dst.fill(0, this.fill, this.fill + take);
      }
      this.fill += take; i += take;
      if (this.fill === this.chunk) this.flush();
    }
  }
  flush() {
    if (!this.fill) return;
    const frames = this.fill;
    const data = frames === this.chunk ? this.buf : this.buf.map(b => b.slice(0, frames));
    this.total += frames;
    this.emit({ frame: this.first, frames, peak: this.peak, data });
    this.fresh();
  }
}
