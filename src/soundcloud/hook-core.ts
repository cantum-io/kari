// Kari — SoundCloud hook core (MAIN world, document_start). Written fresh from the facts in
// docs/SOUNDCLOUD-GRAPH-2026-10-14.md; no SoundCloud code and no third-party extension code in here.
//
// Route 0: SoundCloud builds  source → pausePlay → seek → glitchCoverup → destination  on one lazily created
// AudioContext, caching the source per element in its own WeakMap and calling source.connect(pausePlay) right after
// (99 bytes later in the bundle). Kari patches the two prototype calls on that path:
//   - createMediaElementSource: the first call per element runs the native once and gets  source → output  (a gain,
//     straight wire) so audio flows untouched; later calls for the same element get the same node back. Kari never
//     calls the native itself on this route.
//   - connect / disconnect: when `this` is a source Kari wrapped, the call is applied to Kari's output instead, so
//     SoundCloud's connect(pausePlay) wires Kari's chain into SoundCloud's graph. Our own wiring uses the saved natives.
// The engine chain (dry/wet/worklet) is built lazily by `makeChain` (the AudioController in external-graph mode); when
// it is wired it calls onWired and the straight wire is dropped in the same task, so the swap lands on one render quantum.
//
// Route 1 (fallback): SoundCloud sets fadeSupportEnabled at runtime; off means no context and no source call. If an
// element fires `playing` and no createMediaElementSource call arrives within noCallMs, Kari captures the element
// (it was made with document.createElement("audio"); never window.Audio) and builds its own context and source.
// InvalidStateError there = the element is already claimed by a context we never saw (hook installed late): report it.
//
// Rate guard: SoundCloud writes playbackRate = 1 on every element (re)init. The prototype setter substitutes Kari's
// wanted rate for that write on elements Kari manages; preservesPitch is forced false on them. Kari's own writes go
// through writeRate so the guard can tell them apart.
//
// Everything is injectable (env + deps) so the whole thing runs under node --test with fake Web Audio classes.

import type { Params } from "../shared/math";

export type Chain = {
  apply(p: Params, force?: boolean): unknown;
  setCompare(on: boolean): void;
  setEnginePreference(p: "auto" | "r3" | "signalsmith"): void;
  flush(): void;
  level(): number;
  noteDrm(): void;
  destroy?(): void;
};

export type SourceHandle = { connect(n: AudioNode): unknown; disconnect(): void };

export type ChainSpec = {
  el: HTMLMediaElement; ctx: AudioContext; route: 0 | 1;
  src: SourceHandle;          // native-wired handle to the source node (route 0: SoundCloud's; route 1: Kari's)
  sink: AudioNode;            // where the chain's output goes (Kari's per-source output gain)
  writeRate(rate: number): void;
  onWired(): void;            // call once, synchronously, after the chain is connected
  ownsContext: boolean;       // route 1 only: Kari may resume the context
};

export type Unit = { el: HTMLMediaElement; ctx: AudioContext; src: AudioNode; output: AudioNode; route: 0 | 1; chain: Chain; wired: boolean };

export type HookEvent =
  | { type: "source"; route: 0 | 1 }
  | { type: "fault"; fault: "capture-failed"; route: "late" | 1; reason: string }
  | { type: "media"; ev: string }
  | { type: "ctx"; state: string };

export type HookEnv = {
  AudioContext: any; AudioNode: any; HTMLMediaElement: any; Document: any;
  setTimeout(f: () => void, ms: number): any; clearTimeout(t: any): void;
};
export type HookDeps = {
  makeChain(spec: ChainSpec): Chain;
  report(ev: HookEvent): void;
  noCallMs?: number;           // route 1 detector: ms after `playing` with no source call (default 1500)
};

export type HookHandle = {
  units(): Unit[];
  active(): Unit | null;
  apply(p: Params): void;
  setCompare(on: boolean): void;
  setEnginePreference(p: "auto" | "r3" | "signalsmith"): void;
  flushAll(): void;
};

type ElState = { wanted: number | null; writing: boolean; unit: Unit | null; timer: any; write(rate: number): void };

const FLUSH_EVENTS = ["seeking", "emptied", "loadstart", "pause", "ended"];
const KEY_EVENTS = ["loadstart", "emptied"];

/** The accessor as the page sees it: on the prototype itself in Chrome, possibly one level up on a test double. */
function descriptorOf(proto: object, name: string): PropertyDescriptor | null {
  for (let o: object | null = proto; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, name);
    if (d) return d;
  }
  return null;
}

export function installSoundCloudHook(env: HookEnv, deps: HookDeps): HookHandle {
  const noCallMs = deps.noCallMs ?? 1500;
  const ACP = env.AudioContext.prototype, ANP = env.AudioNode.prototype, HMP = env.HTMLMediaElement.prototype, DOCP = env.Document.prototype;
  const native = {
    createMediaElementSource: ACP.createMediaElementSource as (this: AudioContext, el: HTMLMediaElement) => AudioNode,
    connect: ANP.connect as (...a: unknown[]) => unknown,
    disconnect: ANP.disconnect as (...a: unknown[]) => unknown,
    rate: descriptorOf(HMP, "playbackRate")!,
    preservesPitch: descriptorOf(HMP, "preservesPitch"),
    createElement: DOCP.createElement as (...a: unknown[]) => unknown,
  };
  if (typeof native.createMediaElementSource !== "function" || typeof native.connect !== "function" || !native.rate?.set) throw new Error("kari: Web Audio prototypes not found");

  const els = new WeakMap<HTMLMediaElement, ElState>();
  const bySource = new WeakMap<AudioNode, Unit>();
  const ctxSeen = new WeakSet<AudioContext>();
  const all: Unit[] = [];
  let active: Unit | null = null;
  let lastParams: Params | null = null;
  let lastCompare = false;
  let enginePref: "auto" | "r3" | "signalsmith" | null = null;

  const state = (el: HTMLMediaElement): ElState => {
    let st = els.get(el);
    if (st) return st;
    st = {
      wanted: null, writing: false, unit: null, timer: null,
      write(rate: number) { st!.writing = true; try { native.rate.set!.call(el, rate); } finally { st!.writing = false; } st!.wanted = rate; },
    };
    els.set(el, st);
    try { if (native.preservesPitch?.set) native.preservesPitch.set.call(el, false); } catch (_) { /* ignore */ }
    return st;
  };

  /** Element bookkeeping: rate guard state and the element-side listeners (the element is detached, so document never sees these). */
  const track = (el: HTMLMediaElement) => {
    if (els.has(el)) return;
    const st = state(el);
    const on = (t: string, f: () => void) => { try { el.addEventListener(t, f); } catch (_) { /* fake or sealed element */ } };
    on("playing", () => {
      if (st.unit) active = st.unit;
      if ((el as any).mediaKeys) st.unit?.chain.noteDrm();
      deps.report({ type: "media", ev: "playing" });
      if (st.unit || st.timer) return;
      st.timer = env.setTimeout(() => { st.timer = null; if (!st.unit) route1(el, st); }, noCallMs);
    });
    for (const t of FLUSH_EVENTS) on(t, () => { st.unit?.chain.flush(); if (KEY_EVENTS.includes(t) || t === "pause" || t === "ended") deps.report({ type: "media", ev: t }); });
  };

  const watchCtx = (ctx: AudioContext) => {
    if (ctxSeen.has(ctx)) return; ctxSeen.add(ctx);
    try { ctx.addEventListener("statechange", () => deps.report({ type: "ctx", state: String(ctx.state) })); } catch (_) { /* ignore */ }
  };

  const makeUnit = (el: HTMLMediaElement, ctx: AudioContext, src: AudioNode, route: 0 | 1): Unit => {
    const st = state(el);
    const output = ctx.createGain();
    native.connect.call(src, output);                                   // straight wire until the chain is built
    if (route === 1) native.connect.call(output, ctx.destination);      // route 0: SoundCloud's connect(pausePlay) lands on `output`
    const unit: Unit = { el, ctx, src, output, route, chain: null as unknown as Chain, wired: false };
    bySource.set(src, unit); st.unit = unit; all.push(unit); if (!active) active = unit;
    const srcHandle: SourceHandle = { connect: (n) => native.connect.call(src, n), disconnect: () => native.disconnect.call(src) };
    unit.chain = deps.makeChain({
      el, ctx, route, src: srcHandle, sink: output, writeRate: st.write, ownsContext: route === 1,
      onWired: () => { if (unit.wired) return; unit.wired = true; try { native.disconnect.call(src, output); } catch (_) { /* already gone */ } },
    });
    watchCtx(ctx);
    if (enginePref) unit.chain.setEnginePreference(enginePref);
    if (lastParams) unit.chain.apply(lastParams, true);
    if (lastCompare) unit.chain.setCompare(true);
    deps.report({ type: "source", route });
    return unit;
  };

  const route1 = (el: HTMLMediaElement, st: ElState) => {
    let ctx: AudioContext;
    try { ctx = new env.AudioContext({ latencyHint: "interactive" }); } catch (e: any) { deps.report({ type: "fault", fault: "capture-failed", route: 1, reason: String(e?.name || e) }); return; }
    let src: AudioNode;
    try { src = native.createMediaElementSource.call(ctx, el); }
    catch (e: any) {
      try { ctx.close(); } catch (_) { /* ignore */ }
      deps.report({ type: "fault", fault: "capture-failed", route: "late", reason: String(e?.name || e) });
      return;
    }
    makeUnit(el, ctx, src, 1);
  };

  /* ---- the patches ---- */
  ACP.createMediaElementSource = function (this: AudioContext, el: HTMLMediaElement) {
    const st = el && typeof el === "object" ? els.get(el) : undefined;
    if (st?.unit) return st.unit.src;                                   // same node for the same element, native never called twice
    const src = native.createMediaElementSource.call(this, el);         // the one native call, made on SoundCloud's behalf
    track(el);
    const unit = makeUnit(el, this, src, 0);
    if (st?.timer) { env.clearTimeout(st.timer); st.timer = null; }
    return unit.src;
  };
  ANP.connect = function (this: AudioNode, ...args: unknown[]) {
    const u = bySource.get(this);
    return native.connect.apply(u ? u.output : this, args);
  };
  ANP.disconnect = function (this: AudioNode, ...args: unknown[]) {
    const u = bySource.get(this);
    return native.disconnect.apply(u ? u.output : this, args);
  };
  Object.defineProperty(HMP, "playbackRate", {
    configurable: true, enumerable: native.rate.enumerable,
    get: native.rate.get,
    set(this: HTMLMediaElement, v: number) {
      const st = els.get(this);
      // SoundCloud's reset is always `= 1`; while Kari wants another rate, that write lands as Kari's rate instead.
      if (st && !st.writing && st.wanted !== null && Math.abs(Number(v) - 1) < 1e-9 && Math.abs(st.wanted - 1) > 1e-9) v = st.wanted;
      native.rate.set!.call(this, v);
    },
  });
  if (native.preservesPitch?.set) {
    Object.defineProperty(HMP, "preservesPitch", {
      configurable: true, enumerable: native.preservesPitch.enumerable,
      get: native.preservesPitch.get,
      set(this: HTMLMediaElement, v: boolean) { native.preservesPitch!.set!.call(this, els.has(this) ? false : v); },
    });
  }
  DOCP.createElement = function (this: Document, ...args: unknown[]) {
    const el = native.createElement.apply(this, args) as HTMLMediaElement;
    if (typeof args[0] === "string" && args[0].toLowerCase() === "audio") track(el);
    return el;
  };

  return {
    units: () => all.slice(),
    active: () => active,
    apply(p) { lastParams = p; for (const u of all) u.chain.apply(p); },
    setCompare(on) { lastCompare = on; for (const u of all) u.chain.setCompare(on); },
    setEnginePreference(p) { enginePref = p; for (const u of all) u.chain.setEnginePreference(p); },
    flushAll() { for (const u of all) u.chain.flush(); },
  };
}
