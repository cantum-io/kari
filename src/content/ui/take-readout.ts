// Kari — the take readout beside the record pill: the running length while a take runs ("0:12", "0:12 · paused" while
// nothing is being kept), a short note after an action ("saved 0:12", "nothing to record", "nothing recorded"), and
// nothing at all when idle (the dock hides an empty readout). Pure: Node tests it straight from this file.
import type { AudioStatus } from "../audio/controller";

export type TakeNote = { text: string; until: number };
export const NOTE_MS = 4000;

/** Whole seconds as m:ss; an hour reads 60:00 (a take caps at an hour). */
export const fmtTake = (seconds: number): string => {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function takeReadout(s: Pick<AudioStatus, "recording" | "recSeconds" | "recHeld"> | null | undefined, note: TakeNote | null, now: number = performance.now()): string {
  if (s?.recording) return `${fmtTake(s.recSeconds)}${s.recHeld ? " · paused" : ""}`;
  if (note && note.until > now) return note.text;
  return "";
}
