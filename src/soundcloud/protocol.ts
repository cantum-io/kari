// Kari — SoundCloud world messaging. The MAIN-world hook and the isolated bridge talk over window.postMessage.
// Every message carries the namespace, a direction (so a world never handles its own messages) and the per-session
// nonce the bridge mints. The MAIN world is SoundCloud's own and is treated as hostile: the bridge validates every
// field it reads (see sanitizeStatus) and never evaluates anything it receives.

import type { LoopBeats, GridSource } from "../content/beat/grid"; // types only: Node runs the tests straight from this file

export const NS = "kari-sc";
export type Dir = "b2h" | "h2b"; // bridge → hook, hook → bridge

export type Route = 0 | 1 | "late" | null;
export type EngineName = "r3" | "ss" | "bypass";
export type Fault = null | "drm-silent" | "capture-failed" | "worklet-failed" | "hook-missing";

/**
 * What the hook reports about the audio chain. Same shape the dock consumes on YouTube (AudioStatus, loop fields
 * included: the controller and its beat grid live in the hook's world), plus route and context state.
 */
export type HookStatus = {
  attached: boolean; engine: EngineName; engineLatencyMs: number; outputLatencyMs: number; avOffsetMs: number;
  underruns: number; load: number; fault: Fault; baseRate: number;
  loop: LoopBeats | 0; loopMs: number; bpm: number | null; gridSource: GridSource | null;
  route: Route; ctxState: string;
};

export const EMPTY_STATUS: HookStatus = { attached: false, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, loop: 0, loopMs: 0, bpm: null, gridSource: null, route: null, ctxState: "" };

/**
 * Beat-loop commands, bridge → hook as `{ type: "loop", ...command }`. The dock's buttons and the MIDI pads live in the
 * isolated world; the controller that owns the grid and the latch runs inside the MAIN-world hook, so every loop action
 * crosses here. `latch` carries a `seq` the hook answers with `{ type: "loop-ack", seq, ok }` (the dock's latch promise).
 * `clear` drops the grid (a new track starts without a bpm, as on YouTube).
 */
export type LoopCommand =
  | { action: "latch"; beats: LoopBeats; seq: number }
  | { action: "release" }
  | { action: "tap" }
  | { action: "bpm"; bpm: number }
  | { action: "nudge"; delta: number }
  | { action: "clear" };

export function makeNonce(): string {
  const b = new Uint8Array(16);
  const c = (globalThis as any).crypto;
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < b.length; i++) b[i] = (Math.random() * 256) | 0;
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

export type Envelope = { ns: typeof NS; dir: Dir; nonce: string | null; type: string } & Record<string, unknown>;

/**
 * Accept a message only from this very window, this very origin, with our namespace and the expected direction.
 * `nonce` null = the receiver has no nonce yet (the hook before init). "hello" and "init" are the handshake and are
 * the only types that pass without a matching nonce.
 */
export function accept(e: { source: unknown; origin: string; data: unknown }, win: unknown, origin: string, dir: Dir, nonce: string | null): Envelope | null {
  if (e.source !== win || e.origin !== origin) return null;
  const d = e.data as Envelope;
  if (!d || typeof d !== "object" || d.ns !== NS || d.dir !== dir || typeof d.type !== "string") return null;
  if (d.type === "hello" || d.type === "init") return d;
  if (!nonce || d.nonce !== nonce) return null;
  return d;
}

const ENGINES = new Set<EngineName>(["r3", "ss", "bypass"]);
const FAULTS = new Set<Fault>([null, "drm-silent", "capture-failed", "worklet-failed", "hook-missing"]);
const GRID_SOURCES = new Set<GridSource>(["tap", "manual", "auto"]);
const LOOP_BEATS: readonly LoopBeats[] = [0.25, 0.5, 1];
const num = (x: unknown, lo: number, hi: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
const isBeats = (x: unknown): x is LoopBeats => typeof x === "number" && LOOP_BEATS.includes(x as LoopBeats);
export const MAX_NUDGE = 10;      // bpm per nudge message; the dock steps by 1
export const MAX_LOOP_MS = 60000; // 1 beat at 40 bpm is 1.5 s at 1× and the worklet ring clamps at 2.72 s; a loose sanity bound
// A bpm is a finite number in a sane range here; the grid's own 40–300 clamp is the controller's (withBpm / clampBpm).
const isBpm = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 1 && x <= 1000;

/** Rebuild a LoopCommand from an inbound message, or null when any field is off. The hook treats the bridge's world as data too. */
export function parseLoopCommand(x: unknown): LoopCommand | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Record<string, unknown>;
  switch (d.action) {
    case "latch": return isBeats(d.beats) && typeof d.seq === "number" && Number.isInteger(d.seq) && d.seq >= 0 ? { action: "latch", beats: d.beats, seq: d.seq } : null;
    case "release": return { action: "release" };
    case "tap": return { action: "tap" };
    case "clear": return { action: "clear" };
    case "bpm": return isBpm(d.bpm) ? { action: "bpm", bpm: d.bpm } : null;
    case "nudge": return typeof d.delta === "number" && Number.isFinite(d.delta) && d.delta !== 0 ? { action: "nudge", delta: Math.min(MAX_NUDGE, Math.max(-MAX_NUDGE, d.delta)) } : null;
    default: return null;
  }
}

/** A loop ack from the hook: `{ type: "loop-ack", seq, ok }`, or null. */
export function parseLoopAck(x: unknown): { seq: number; ok: boolean } | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Record<string, unknown>;
  return typeof d.seq === "number" && Number.isInteger(d.seq) ? { seq: d.seq, ok: d.ok === true } : null;
}

/** Rebuild a HookStatus from untrusted input: every field typed, every number clamped, every enum checked. */
export function sanitizeStatus(x: unknown): HookStatus {
  const s = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const route: Route = s.route === 0 || s.route === 1 ? s.route : s.route === "late" ? "late" : null;
  return {
    attached: s.attached === true,
    engine: ENGINES.has(s.engine as EngineName) ? (s.engine as EngineName) : "bypass",
    engineLatencyMs: num(s.engineLatencyMs, 0, 5000), outputLatencyMs: num(s.outputLatencyMs, 0, 5000), avOffsetMs: num(s.avOffsetMs, 0, 10000),
    underruns: num(s.underruns, 0, 1e9), load: num(s.load, 0, 10),
    fault: FAULTS.has(s.fault as Fault) ? (s.fault as Fault) : null,
    baseRate: num(s.baseRate, 0.0625, 16, 1),
    loop: isBeats(s.loop) ? s.loop : 0,
    loopMs: num(s.loopMs, 0, MAX_LOOP_MS),
    bpm: isBpm(s.bpm) ? s.bpm : null,
    gridSource: GRID_SOURCES.has(s.gridSource as GridSource) ? (s.gridSource as GridSource) : null,
    route,
    ctxState: typeof s.ctxState === "string" ? s.ctxState.slice(0, 16) : "",
  };
}
