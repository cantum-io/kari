// Kari — tap tempo. Taps are media times (the element's currentTime at each tap), so a speed change mid-sequence
// does not bend the estimate: the song's own BPM falls straight out of the intervals. Pure, no imports.

export const TAP_MIN = 0.2;    // s: closer taps are a bounce, ignored (300 bpm)
export const TAP_MAX = 2.0;    // s: a longer gap starts a new sequence (30 bpm)
export const TAP_WINDOW = 8;   // intervals kept; the estimate is their median

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** BPM from an ascending list of tap times, or null with fewer than two taps. */
export function bpmFromTaps(taps: number[]): number | null {
  if (taps.length < 2) return null;
  const iv: number[] = [];
  for (let i = Math.max(1, taps.length - TAP_WINDOW); i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
  return 60 / median(iv);
}

export class TapTempo {
  taps: number[] = [];
  /** Record a tap at media time `t`. Returns the running estimate, or null until the second tap. */
  tap(t: number): number | null {
    const last = this.taps[this.taps.length - 1];
    if (last !== undefined) {
      const gap = t - last;
      if (gap < TAP_MIN && gap >= 0) return bpmFromTaps(this.taps);   // bounce
      if (gap > TAP_MAX || gap < 0) this.taps = [];                     // new sequence (or a seek backwards)
    }
    this.taps.push(t);
    if (this.taps.length > TAP_WINDOW + 1) this.taps.shift();
    return bpmFromTaps(this.taps);
  }
  get count() { return this.taps.length; }
  reset() { this.taps = []; }
}
