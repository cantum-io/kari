// Kari — beat grid: a BPM and a phase, the media time of one beat. Pure functions, no DOM, no imports (Node runs the
// tests straight from this file). The grid lives in media time so it survives seeks and speed changes; the worklet
// works in real-time frames, and the conversions here carry the element's playbackRate between the two.

export type GridSource = "tap" | "manual" | "auto";
export type BeatGrid = { bpm: number; phase: number; source: GridSource };
export type LoopBeats = 0.25 | 0.5 | 1;

export const BPM_MIN = 40, BPM_MAX = 300;
export const clampBpm = (bpm: number) => Math.min(BPM_MAX, Math.max(BPM_MIN, bpm));

/** Media seconds per beat. */
export const beatSeconds = (g: BeatGrid) => 60 / g.bpm;

/** Media time of the nearest line of the `beats`-grid (¼, ½, 1 beat cells) at or before `mediaTime`. */
export function gridLineAtOrBefore(g: BeatGrid, mediaTime: number, beats: number): number {
  const cell = beatSeconds(g) * beats;
  return g.phase + Math.floor((mediaTime - g.phase) / cell + 1e-9) * cell;
}

/** Real-time frames in `beats` of the song as the worklet sees them: the element plays `rate` song-seconds per second. */
export function loopFrames(g: BeatGrid, beats: number, rate: number, sampleRate: number): number {
  return Math.round(beats * 60 / g.bpm / rate * sampleRate);
}

export type LoopPlan = { lenFrames: number; backFrames: number; startMedia: number };

/** What the worklet needs for a latch at `mediaTime`: the loop length and how many frames ago its grid line passed. */
export function loopPlan(g: BeatGrid, mediaTime: number, rate: number, sampleRate: number, beats: LoopBeats): LoopPlan {
  const startMedia = gridLineAtOrBefore(g, mediaTime, beats);
  const lenFrames = loopFrames(g, beats, rate, sampleRate);
  const backFrames = Math.min(lenFrames, Math.max(0, Math.round((mediaTime - startMedia) / rate * sampleRate)));
  return { lenFrames, backFrames, startMedia };
}

/** Where the track underneath is after holding a loop for `heldSeconds` of real time: it never stopped (slip). */
export const slipPosition = (mediaAtLatch: number, heldSeconds: number, rate: number) => mediaAtLatch + heldSeconds * rate;

/** A typed BPM keeps the existing phase; a first BPM anchors on the given media time. */
export function withBpm(g: BeatGrid | null, bpm: number, phaseIfNew: number, source: GridSource = "manual"): BeatGrid {
  return { bpm: clampBpm(bpm), phase: g ? g.phase : phaseIfNew, source };
}
export const nudgeBpm = (g: BeatGrid, delta: number): BeatGrid => ({ ...g, bpm: clampBpm(+(g.bpm + delta).toFixed(1)), source: "manual" });

export const fmtBpm = (bpm: number) => (Math.round(bpm * 10) / 10).toFixed(1).replace(/\.0$/, "");
export const loopLabel = (beats: LoopBeats) => beats === 0.25 ? "¼" : beats === 0.5 ? "½" : "1";
