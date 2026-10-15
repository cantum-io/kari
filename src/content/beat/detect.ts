// Kari — beat detection seam. Auto-detect is an interface and a null implementation: no model ships yet.
//
// TODO(licence — Jesse's call, not a build decision): the chosen model, Beat This! small0 (MIT), runs on
// onnxruntime-web, which bundles Apache-2.0 parts and is incompatible with Kari's GPL-2.0-only. The ways out are in
// docs/RESEARCH-2026-10-14-SOUNDCLOUD-LOOPS.md § 2d (relicense to GPL-3.0-or-later and build Rubber Band from
// source, or write our own inference). Until that lands, nothing here listens: aubio, essentia, madmom, BTrack and
// any GPL-3 / AGPL / Apache dependency stay out of the tree. Tap tempo and the BPM field carry the grid.

import type { BeatGrid } from "./grid";

export interface BeatDetector {
  readonly name: string;
  /** Begin listening on `tap` (a node in the context's graph). May be called more than once. */
  start(ctx: AudioContext, tap: AudioNode): void;
  stop(): void;
  /** Called with a provisional grid as soon as one exists and again whenever it is refined. */
  onGrid(cb: (g: BeatGrid) => void): void;
}

export class NullBeatDetector implements BeatDetector {
  readonly name = "none";
  start() { /* no model: see the licence note above */ }
  stop() { /* nothing to stop */ }
  onGrid() { /* never fires */ }
}
