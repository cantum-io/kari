// Kari — the tempo readout on the loop row, as one pure function so Node can test every state (tests/readout.test.mjs).
// The contract (2026-10-15, after "tempo autodetect still not working" read as "tap" before anything had played):
//   found     "128 bpm"        a grid exists (detected, tapped or typed)
//   learning  "learning…"      the detector listens and has no verdict yet
//   none      "tap"            the detector listened (12 s of playing audio) and found no steady beat — only then
//   idle      "play to learn"  nothing has played through Kari yet
//   gesture   "click to learn" the track plays, but the page has not been clicked and Chrome will not start audio
//                              processing without that (YouTube; a site Chrome trusts with media skips this)
//   off       ""               no detector on this element (protected audio) or no loop path on this host
import type { TempoPhase } from "../beat/detect";
import { fmtBpm } from "../beat/grid.ts"; // with the extension: Node runs tests/readout.test.mjs straight from this file

export type ReadoutState = TempoPhase;
export const TEMPO_COPY: Record<Exclude<TempoPhase, "found">, string> = { off: "", idle: "play to learn", gesture: "click to learn", learning: "learning…", none: "tap" };

/** `status` is the controller's AudioStatus (bpm + tempo phase) or null before any status arrived; `hasLoop` = the host has a loop path. */
export function tempoReadout(status: { bpm: number | null; tempo: TempoPhase } | null | undefined, hasLoop: boolean): { state: ReadoutState; text: string } {
  if (!hasLoop) return { state: "off", text: "" };
  const bpm = status?.bpm ?? null;
  if (bpm) return { state: "found", text: `${fmtBpm(bpm)} bpm` };
  const phase: TempoPhase = status?.tempo ?? "idle";
  const state: Exclude<TempoPhase, "found"> = phase === "found" ? "idle" : phase; // a "found" phase with no bpm cannot happen; read it as idle, never as "tap"
  return { state, text: TEMPO_COPY[state] };
}
