// Kari — SoundCloud world messaging. The MAIN-world hook and the isolated bridge talk over window.postMessage.
// Every message carries the namespace, a direction (so a world never handles its own messages) and the per-session
// nonce the bridge mints. The MAIN world is SoundCloud's own and is treated as hostile: the bridge validates every
// field it reads (see sanitizeStatus) and never evaluates anything it receives.

export const NS = "kari-sc";
export type Dir = "b2h" | "h2b"; // bridge → hook, hook → bridge

export type Route = 0 | 1 | "late" | null;
export type EngineName = "r3" | "ss" | "bypass";
export type Fault = null | "drm-silent" | "capture-failed" | "worklet-failed" | "hook-missing" | "late";

/** What the hook reports about the audio chain. Same shape the dock consumes on YouTube, plus route and context state. */
export type HookStatus = {
  attached: boolean; engine: EngineName; engineLatencyMs: number; outputLatencyMs: number; avOffsetMs: number;
  underruns: number; load: number; fault: Fault; baseRate: number; route: Route; ctxState: string;
};

export const EMPTY_STATUS: HookStatus = { attached: false, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, route: null, ctxState: "" };

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
const FAULTS = new Set<Fault>([null, "drm-silent", "capture-failed", "worklet-failed", "hook-missing", "late"]);
const num = (x: unknown, lo: number, hi: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);

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
    route,
    ctxState: typeof s.ctxState === "string" ? s.ctxState.slice(0, 16) : "",
  };
}
