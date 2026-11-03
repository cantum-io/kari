// Kari — SoundCloud world messaging. The MAIN-world hook and the isolated bridge talk over window.postMessage.
// Every message carries the namespace, a direction (so a world never handles its own messages) and the per-session
// nonce the bridge mints. The MAIN world is SoundCloud's own and is treated as hostile: the bridge validates every
// field it reads (see sanitizeStatus) and never evaluates anything it receives.

import type { LoopBeats, GridSource } from "../content/beat/grid"; // types only: Node runs the tests straight from this file
import type { TempoPhase } from "../content/beat/detect";
import type { TakeLog, TakeMove, MoveKind } from "../content/audio/recorder";

export const NS = "kari-sc";
export type Dir = "b2h" | "h2b"; // bridge → hook, hook → bridge

export type Route = 0 | 1 | "late" | null;
export type EngineName = "r3" | "ss" | "bypass";
export type Fault = null | "drm-silent" | "capture-failed" | "worklet-failed" | "hook-missing" | "late" | "duplicate";

/**
 * What the hook reports about the audio chain. Same shape the dock consumes on YouTube (AudioStatus, loop and tempo
 * fields included: the controller, its beat grid and the tempo detector live in the hook's world), plus route and
 * context state.
 */
export type HookStatus = {
  attached: boolean; engine: EngineName; engineLatencyMs: number; outputLatencyMs: number; avOffsetMs: number;
  underruns: number; load: number; fault: Fault; baseRate: number;
  loop: LoopBeats | 0; loopMs: number; loopClamped: boolean; bpm: number | null; gridSource: GridSource | null; tempo: TempoPhase;
  recording: boolean; recSeconds: number; recHeld: boolean;
  route: Route; ctxState: string;
};

export const EMPTY_STATUS: HookStatus = { attached: false, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, loop: 0, loopMs: 0, loopClamped: false, bpm: null, gridSource: null, tempo: "idle", recording: false, recSeconds: 0, recHeld: false, route: null, ctxState: "" };
const TEMPO_PHASES = new Set<TempoPhase>(["off", "idle", "gesture", "learning", "found", "none"]);

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
const FAULTS = new Set<Fault>([null, "drm-silent", "capture-failed", "worklet-failed", "hook-missing", "late", "duplicate"]);
const GRID_SOURCES = new Set<GridSource>(["tap", "manual", "auto"]);
const LOOP_BEATS: readonly LoopBeats[] = [0.5, 1, 4, 8];   // mirrors grid.ts LOOP_BEATS (no runtime import: Node runs the tests from this file)
const num = (x: unknown, lo: number, hi: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
const isBeats = (x: unknown): x is LoopBeats => typeof x === "number" && LOOP_BEATS.includes(x as LoopBeats);
export const MAX_NUDGE = 10;      // bpm per nudge message; the dock steps by 1
export const MAX_LOOP_MS = 60000; // 2 bars at 40 bpm is 12 s at 1× and the worklet ring clamps at 10.9 s; a loose sanity bound
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

/**
 * The take on SoundCloud. The recorder hangs off the controller in the MAIN-world hook (the chain's meeting point is
 * there); the pill and the download are the bridge's. Bridge → hook as `{ type: "record", ...command }`: `start` carries
 * the badge's track key and title for the take's name and a `seq` the hook answers with `{ type: "record-ack", seq, ok }`;
 * `stop` carries a `seq` the hook answers with `{ type: "take", seq, ok, wav, log }` (wav a Blob, structured-cloned by
 * reference, so a long take never crosses as a copy); `hide` holds a running take while Kari is hidden on SoundCloud.
 */
export type RecordCommand =
  | { action: "start"; seq: number; track: string; title: string }
  | { action: "stop"; seq: number }
  | { action: "hide"; on: boolean };

const isSeq = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0;
const str = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");

/** Rebuild a RecordCommand from an inbound message, or null when any field is off. */
export function parseRecordCommand(x: unknown): RecordCommand | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Record<string, unknown>;
  switch (d.action) {
    case "start": return isSeq(d.seq) ? { action: "start", seq: d.seq, track: str(d.track, 200), title: str(d.title, 200) } : null;
    case "stop": return isSeq(d.seq) ? { action: "stop", seq: d.seq } : null;
    case "hide": return typeof d.on === "boolean" ? { action: "hide", on: d.on } : null;
    default: return null;
  }
}

export const MAX_TAKE_BYTES = 0xffffffff;   // the RIFF size field's limit; the writer refuses before it, the recorder caps a take at an hour
const MOVE_KINDS = new Set(["start", "params", "loop", "seek", "hold", "resume", "volume", "stop"]);
const MAX_MOVES = 100000;

/** A move's data: flat, primitives only, short keys. */
function moveData(x: unknown): Record<string, unknown> | undefined {
  if (!x || typeof x !== "object" || Array.isArray(x)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>).slice(0, 16)) {
    if (k.length > 32) continue;
    if (typeof v === "number") { if (Number.isFinite(v)) out[k] = v; }
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 64);
  }
  return out;
}

/**
 * Rebuild a take's moves log (TakeLog, src/content/audio/recorder.ts) from untrusted input, or null when its frame is
 * off. It goes into a file on the user's disk, so every field is typed and bounded here, never passed through.
 */
export function sanitizeTakeLog(x: unknown): TakeLog | null {
  if (!x || typeof x !== "object") return null;
  const s = x as Record<string, unknown>;
  const p = (s.params && typeof s.params === "object" ? s.params : {}) as Record<string, unknown>;
  if (!Array.isArray(s.moves) || typeof s.sampleRate !== "number" || !Number.isFinite(s.sampleRate)) return null;
  const startedAt = typeof s.startedAt === "string" && Number.isFinite(Date.parse(s.startedAt)) ? new Date(Date.parse(s.startedAt)).toISOString() : new Date().toISOString();
  const opt = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 200) : undefined);
  const moves: TakeMove[] = [];
  for (const m of s.moves.slice(0, MAX_MOVES)) {
    if (!m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    if (!MOVE_KINDS.has(r.kind as string)) continue;
    const data = moveData(r.data);
    moves.push({ frame: num(r.frame, 0, 1e12), t: num(r.t, 0, 1e7), kind: r.kind as MoveKind, ...(data ? { data } : {}) });
  }
  const range = p.range === 8 || p.range === 16 || p.range === 50 ? p.range : 50;
  return {
    version: 1, kari: str(s.kari, 64), startedAt, site: opt(s.site), track: opt(s.track), title: opt(s.title),
    sampleRate: num(s.sampleRate, 3000, 768000, 48000), channels: Math.round(num(s.channels, 1, 32, 2)), bits: s.bits === 16 ? 16 : 24,
    frames: num(s.frames, 0, 1e12), seconds: num(s.seconds, 0, 1e7), dropped: num(s.dropped, 0, 1e12), peak: num(s.peak, 0, 1e3),
    ...(typeof s.volume === "number" ? { volume: num(s.volume, 0, 1), muted: s.muted === true } : {}),
    params: { st: num(p.st, -48, 48), cents: num(p.cents, -100, 100), tempo: num(p.tempo, -100, 100), keyLock: p.keyLock === true, range },
    moves,
  };
}

/** The hook's answer to a stop: `{ seq, take }`, take null when nothing was kept (or the payload is not a take). */
export function parseTakeMessage(x: unknown, BlobCtor: { new (...a: any[]): Blob } = Blob): { seq: number; take: { wav: Blob; log: TakeLog } | null } | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Record<string, unknown>;
  if (!isSeq(d.seq)) return null;
  if (d.ok !== true || !(d.wav instanceof BlobCtor) || d.wav.size < 44 || d.wav.size > MAX_TAKE_BYTES) return { seq: d.seq, take: null };
  const log = sanitizeTakeLog(d.log);
  return { seq: d.seq, take: log ? { wav: d.wav as Blob, log } : null };
}

/** The first 12 bytes of a RIFF/WAVE file: "RIFF", a size, "WAVE". The bridge reads them before it saves anything. */
export function isWavHead(b: Uint8Array): boolean {
  const at = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  return b.length >= 12 && at(0, "RIFF") && at(8, "WAVE");
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
    loopClamped: s.loopClamped === true,
    bpm: isBpm(s.bpm) ? s.bpm : null,
    gridSource: GRID_SOURCES.has(s.gridSource as GridSource) ? (s.gridSource as GridSource) : null,
    tempo: TEMPO_PHASES.has(s.tempo as TempoPhase) ? (s.tempo as TempoPhase) : "idle",
    recording: s.recording === true,
    recSeconds: num(s.recSeconds, 0, 1e6),
    recHeld: s.recHeld === true,
    route,
    ctxState: typeof s.ctxState === "string" ? s.ctxState.slice(0, 16) : "",
  };
}
