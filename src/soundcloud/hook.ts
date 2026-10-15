// Kari — SoundCloud hook entry (MAIN world, document_start, IIFE). Installs the prototype patches from hook-core,
// hosts the AudioController in external-graph mode, and talks to the isolated bridge over window.postMessage.
// This world is SoundCloud's own: nothing is exposed on window, and every inbound message is origin-, source-,
// namespace- and nonce-checked (protocol.ts). The worklet and WASM bytes come from the bridge on first use only.
import { installSoundCloudHook, type Chain, type ChainSpec } from "./hook-core";
import { AudioController, type AudioStatus } from "../content/audio/controller";
import { NS, accept, parseLoopCommand, type HookStatus } from "./protocol";
import { runLoopCommand } from "./loops";
import type { Params } from "../shared/math";

(() => {
  const mark = Symbol.for("kari.sc.hook");
  if ((window as any)[mark]) return;
  Object.defineProperty(window, mark, { value: true, enumerable: false, configurable: false, writable: false });

  const origin = location.origin;
  let nonce: string | null = null;
  const post = (m: Record<string, unknown>, transfer?: Transferable[]) => {
    try { window.postMessage({ ns: NS, dir: "h2b", nonce, ...m }, origin, transfer || []); } catch (_) { /* detached window */ }
  };

  /* ---- engine supply: the bridge sends the worklet URL and the WASM bytes once, on request ---- */
  type Engine = { workletUrl: string; wasm: ArrayBuffer };
  let engine: Engine | null = null;
  let enginePromise: Promise<Engine> | null = null;
  let resolveEngine: ((e: Engine) => void) | null = null;
  let workletSource: string | null = null;
  let resolveSource: ((s: string) => void) | null = null;
  const ENGINE_TIMEOUT = 6000;
  const needEngine = () => {
    if (engine) return Promise.resolve(engine);
    if (!enginePromise) enginePromise = new Promise<Engine>((res, rej) => {
      resolveEngine = res; post({ type: "need-engine" });
      setTimeout(() => { if (!engine) { enginePromise = null; rej(new Error("kari: engine bytes did not arrive")); } }, ENGINE_TIMEOUT);
    });
    return enginePromise;
  };
  const needWorkletSource = () => new Promise<string>((res, rej) => {
    if (workletSource) return res(workletSource);
    resolveSource = res; post({ type: "need-worklet-source" });
    setTimeout(() => { if (!workletSource) rej(new Error("kari: worklet source did not arrive")); }, ENGINE_TIMEOUT);
  });
  // addModule once per context. SoundCloud sends no CSP today (read live 10-14/10-15); if one appears and blocks the
  // chrome-extension:// URL, the fallback loads the same bytes through a blob: URL.
  const moduleLoads = new WeakMap<AudioContext, Promise<void>>();
  const loadWorklet = (ctx: AudioContext) => {
    let p = moduleLoads.get(ctx);
    if (!p) {
      p = needEngine().then(e => ctx.audioWorklet.addModule(e.workletUrl)).catch(async (err) => {
        const src = await needWorkletSource();
        const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
        try { await ctx.audioWorklet.addModule(url); post({ type: "note", note: "worklet via blob", reason: String(err?.name || err) }); }
        finally { URL.revokeObjectURL(url); }
      });
      moduleLoads.set(ctx, p);
      p.catch(() => moduleLoads.delete(ctx)); // a failed load may be retried on the next attach
    }
    return p;
  };

  /* ---- chain factory: the YouTube controller, pointed at the page's graph ---- */
  let enginePref: "auto" | "r3" | "signalsmith" | null = null;
  // The controller behind each chain: loop commands from the bridge are routed to the active unit's controller. It
  // listens to the real element (pause, seeking, ended, emptied), so a loop lets go on SoundCloud's own seek and on a
  // track change exactly as on YouTube; the bridge adds a grid clear when the track key changes.
  const controllers = new WeakMap<Chain, AudioController>();
  const makeChain = (spec: ChainSpec): Chain => {
    const c = new AudioController(spec.el, { worklet: "", wasm: "" }, {
      ctx: spec.ctx, src: spec.src, sink: spec.sink, loadWorklet, wasm: () => needEngine().then(e => e.wasm),
      writeRate: spec.writeRate, onWired: spec.onWired, ownsContext: spec.ownsContext, silenceMs: 1000, speedOnlyOnDrm: true,
    });
    if (enginePref) c.setEnginePreference(enginePref);
    c.onStatus((s: AudioStatus) => { const st: HookStatus = { ...s, route: spec.route, ctxState: String(spec.ctx.state) }; post({ type: "status", status: st }); });
    controllers.set(c, c);
    return c;
  };
  const activeController = (): AudioController | null => { const u = hook.active(); return u ? controllers.get(u.chain) ?? null : null; };

  const hook = installSoundCloudHook(
    { AudioContext, AudioNode, HTMLMediaElement, Document, setTimeout: (f, ms) => window.setTimeout(f, ms), clearTimeout: (t) => window.clearTimeout(t) },
    { makeChain, report: (ev) => post({ type: "event", ev }) },
  );

  // Kari's pulse: the dock lives in the other world, so the level crosses at ~20 Hz, only while something plays.
  let lastLevel = -1;
  setInterval(() => {
    const u = hook.active();
    if (!u || u.el.paused) { if (lastLevel !== 0) { lastLevel = 0; post({ type: "level", v: 0 }); } return; }
    const v = u.chain.level();
    if (Math.abs(v - lastLevel) > 1e-3) { lastLevel = v; post({ type: "level", v }); }
  }, 50);

  const isParams = (p: any): p is Params => p && typeof p === "object" && ["st", "cents", "tempo"].every(k => typeof p[k] === "number" && Number.isFinite(p[k])) && typeof p.keyLock === "boolean" && [8, 16, 50].includes(p.range);

  window.addEventListener("message", (e) => {
    const d = accept(e, window, origin, "b2h", nonce);
    if (!d) return;
    switch (d.type) {
      case "init": if (!nonce && typeof d.nonce === "string" && d.nonce.length >= 16) { nonce = d.nonce; post({ type: "ready", units: hook.units().length }); } return;
      case "engine": {
        if (engine) return;
        const wasm = d.wasm, url = d.workletUrl;
        if (!(wasm instanceof ArrayBuffer) || typeof url !== "string" || !url.startsWith("chrome-extension://")) return;
        engine = { workletUrl: url, wasm }; resolveEngine?.(engine); return;
      }
      case "worklet-source": if (typeof d.source === "string" && d.source.length) { workletSource = d.source; resolveSource?.(d.source); } return;
      case "apply": if (isParams(d.params)) hook.apply({ st: d.params.st, cents: d.params.cents, tempo: d.params.tempo, keyLock: d.params.keyLock, range: d.params.range }); return;
      case "compare": hook.setCompare(d.on === true); return;
      case "engine-pref": if (d.pref === "auto" || d.pref === "r3" || d.pref === "signalsmith") { enginePref = d.pref; hook.setEnginePreference(d.pref); } return;
      case "loop": {
        const cmd = parseLoopCommand(d); if (!cmd) return;
        runLoopCommand(cmd, activeController()).catch(() => false).then(ok => { if (cmd.action === "latch") post({ type: "loop-ack", seq: cmd.seq, ok }); });
        return;
      }
    }
  });
  post({ type: "hello" }); // the bridge answers with init {nonce}; if it loaded first it already posted init and answers again
})();
