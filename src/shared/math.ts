// Kari — shared math. Pure functions, no DOM. Tested in tests/math.test.mjs.

export const NOTE_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

export const LIMITS = { st: 12, cents: 50, tempoRanges: [8, 16, 50] as const };

export type Params = {
  st: number;        // semitones, integer -12..12
  cents: number;     // -50..50
  tempo: number;     // percent, -range..range  (0 = 1.00×)
  range: 8 | 16 | 50;
  keyLock: boolean;  // false (default, "vinyl"): pitch rides speed like a turntable. true: pitch held while speed changes.
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The one-pass rule. Returns what the <video> and the engine each do. */
export function plan(p: Params) {
  const rate = 1 + p.tempo / 100;                       // video.playbackRate, preservesPitch=false
  const keyRatio = Math.pow(2, (p.st + p.cents / 100) / 12);
  // engine pitch ratio: with key lock, undo the resampler's pitch change (1/rate) and apply the key.
  const engineRatio = p.keyLock ? keyRatio / rate : keyRatio;
  const engineActive = Math.abs(engineRatio - 1) > 1e-6;
  const attached = engineActive;                        // bypass otherwise (straight wire)
  return { rate, keyRatio, engineRatio, engineActive, attached };
}

/** Pitch ratio → semitones (for readouts). */
export const ratioToSemitones = (r: number) => 12 * Math.log2(r);

export function keyName(baseIndex: number, offsetSt: number, minor = true) {
  const i = (((baseIndex + offsetSt) % 12) + 12) % 12;
  return NOTE_NAMES[i] + (minor ? "m" : "");
}

export const fmtSpeed = (tempo: number) => (1 + tempo / 100).toFixed(2) + "×";
export const fmtSigned = (v: number, digits = 0) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(digits);
export const fmtTempo = (tempo: number) => fmtSigned(tempo, 1) + "%";

export function stepTempo(p: Params, delta: number): Params {
  return { ...p, tempo: clamp(+(p.tempo + delta).toFixed(1), -p.range, p.range) };
}
export function stepSt(p: Params, delta: number): Params {
  return { ...p, st: clamp(p.st + delta, -LIMITS.st, LIMITS.st) };
}
export function setRange(p: Params, range: Params["range"]): Params {
  return { ...p, range, tempo: clamp(p.tempo, -range, range) };
}
export const isNeutral = (p: Params) => p.st === 0 && p.cents === 0 && p.tempo === 0;

export const DEFAULT_PARAMS: Params = { st: 0, cents: 0, tempo: 0, range: 50, keyLock: false };
