// Chrome scales a media element's captured audio by element.volume before it reaches Web Audio (and to silence when
// muted), so a take made at a low YouTube slider came out low (Jesse's first take, 2026-11-03: peak -22.5 dBFS at the
// engine's full level). The recorder's tap undoes the slider so a take is what the engine produced, whatever the
// listening level. The boost is floored: a slider near zero is a 26 dB lift at most, never a noise-floor blast.
export const VOLUME_FLOOR = 0.05;

/** The gain that puts a take back at the engine's level for an element at `volume`; 1 while muted (Chrome hands over silence then). */
export function takeGain(volume: number, muted: boolean): number {
  if (muted) return 1;
  const v = Number.isFinite(volume) ? Math.min(1, volume) : 1;
  return 1 / Math.max(VOLUME_FLOOR, v);
}
