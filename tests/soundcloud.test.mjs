// SoundCloud adapter: the MAIN-world hook core under fake Web Audio classes, the track key, and the world-message guard.
// Mirrors the call order read from SoundCloud's bundle (docs/SOUNDCLOUD-GRAPH-2026-10-14.md): createMediaElementSource,
// then source.connect(pausePlay), then playbackRate = 1. No SoundCloud code here, only its call shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installSoundCloudHook } from "../src/soundcloud/hook-core.ts";
import { trackKeyFromHref, memoryId } from "../src/soundcloud/track-key.ts";
import { accept, sanitizeStatus, makeNonce, NS } from "../src/soundcloud/protocol.ts";

/* ---------- fakes ---------- */
class FakeNode {
  constructor(ctx) { this.context = ctx; this.outs = []; }
  connect(d) { this.outs.push(d); return d; }
  disconnect(d) { if (d === undefined) { this.outs = []; return; } const i = this.outs.indexOf(d); if (i < 0) { const e = new Error("not connected"); e.name = "InvalidAccessError"; throw e; } this.outs.splice(i, 1); }
}
class FakeGain extends FakeNode {}
class FakeSource extends FakeNode { constructor(ctx, el) { super(ctx); this.mediaElement = el; } }
let nativeSourceCalls = 0, contexts = 0;
class FakeCtx {
  constructor() { contexts++; this.destination = new FakeNode(this); this.state = "running"; this.listeners = {}; this.closed = false; }
  createGain() { return new FakeGain(this); }
  createMediaElementSource(el) { nativeSourceCalls++; if (el.claimed) { const e = new Error("already connected"); e.name = "InvalidStateError"; throw e; } el.claimed = true; return new FakeSource(this, el); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  close() { this.closed = true; }
}
class FakeMedia {
  constructor() { this._rate = 1; this._pp = true; this.listeners = {}; this.paused = true; this.mediaKeys = null; this.claimed = false; }
  get playbackRate() { return this._rate; } set playbackRate(v) { this._rate = v; }
  get preservesPitch() { return this._pp; } set preservesPitch(v) { this._pp = v; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  fire(t) { for (const f of this.listeners[t] || []) f({ type: t }); }
}
class FakeDocument { createElement(tag) { return tag === "audio" ? new FakeMedia() : { tag }; } }

function fresh(opts = {}) {
  // fresh prototypes per test: the hook patches them in place
  const AudioContext = class extends FakeCtx {}; const AudioNode = class extends FakeNode {};
  const Gain = class extends AudioNode {}; const Source = class extends AudioNode { constructor(ctx, el) { super(ctx); this.mediaElement = el; } };
  AudioContext.prototype.createGain = function () { return new Gain(this); };
  AudioContext.prototype.createMediaElementSource = function (el) { nativeSourceCalls++; if (el.claimed) { const e = new Error("already connected"); e.name = "InvalidStateError"; throw e; } el.claimed = true; return new Source(this, el); };
  const HTMLMediaElement = class extends FakeMedia {};
  const Document = class extends FakeDocument { createElement(tag) { return tag === "audio" ? new HTMLMediaElement() : { tag }; } };
  const chains = [], events = [];
  const makeChain = (spec) => { const c = { spec, applied: [], flushes: 0, drm: 0, compare: null, pref: null, apply(p) { this.applied.push(p); }, setCompare(on) { this.compare = on; }, setEnginePreference(p) { this.pref = p; }, flush() { this.flushes++; }, level() { return 0.25; }, noteDrm() { this.drm++; } }; chains.push(c); return c; };
  const hook = installSoundCloudHook({ AudioContext, AudioNode, HTMLMediaElement, Document, setTimeout, clearTimeout }, { makeChain, report: (e) => events.push(e), noCallMs: opts.noCallMs ?? 1500 });
  const doc = new Document();
  nativeSourceCalls = 0; contexts = 0;
  return { AudioContext, AudioNode, HTMLMediaElement, doc, hook, chains, events };
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- route 0 ---------- */
test("route 0: first call runs the native once, builds a straight wire, same node on the second call", () => {
  const { AudioContext, doc, hook, chains, events } = fresh();
  const el = doc.createElement("audio");
  const ctx = new AudioContext();
  const pausePlay = ctx.createGain();
  const src = ctx.createMediaElementSource(el);          // SoundCloud's call @509009
  assert.equal(nativeSourceCalls, 1);
  assert.equal(chains.length, 1); assert.equal(chains[0].spec.route, 0); assert.equal(chains[0].spec.ownsContext, false);
  const unit = hook.units()[0];
  assert.equal(unit.src, src);
  assert.deepEqual(src.outs, [unit.output], "source → output straight wire, nothing else");
  assert.equal(ctx.createMediaElementSource(el), src, "same node for the same element");
  assert.equal(nativeSourceCalls, 1, "native never called twice for one element");
  src.connect(pausePlay);                                 // SoundCloud's call @509108, 99 bytes later
  assert.deepEqual(unit.output.outs, [pausePlay], "connect on the wrapped source lands on Kari's output");
  assert.deepEqual(src.outs, [unit.output], "the source itself is still wired only to Kari's output");
  src.disconnect(pausePlay);                              // SoundCloud's disconnect path @511693
  assert.deepEqual(unit.output.outs, []);
  assert.deepEqual(events.filter(e => e.type === "source"), [{ type: "source", route: 0 }]);
});

test("route 0: our own wiring uses the native, and onWired drops the straight wire", () => {
  const { AudioContext, doc, hook, chains } = fresh();
  const el = doc.createElement("audio"); const ctx = new AudioContext();
  const src = ctx.createMediaElementSource(el); const unit = hook.units()[0];
  const spec = chains[0].spec;
  const dry = ctx.createGain(), analyser = ctx.createGain();
  spec.src.connect(dry); dry.connect(analyser); analyser.connect(spec.sink);   // what the controller does at attach
  assert.deepEqual(src.outs, [unit.output, dry], "handle.connect went to the real source, not redirected");
  spec.onWired();
  assert.deepEqual(src.outs, [dry], "straight wire gone, Kari's graph stays");
  spec.onWired(); // idempotent
  assert.deepEqual(src.outs, [dry]);
});

test("rate guard: SoundCloud's playbackRate = 1 lands as Kari's rate; other rates pass; preservesPitch forced false", () => {
  const { AudioContext, doc, chains } = fresh();
  const el = doc.createElement("audio"); const ctx = new AudioContext();
  ctx.createMediaElementSource(el);
  const spec = chains[0].spec;
  spec.writeRate(1.04);
  assert.equal(el.playbackRate, 1.04);
  el.playbackRate = 1;                                    // SoundCloud's _initMediaElement reset @512224
  assert.equal(el.playbackRate, 1.04, "the reset is replaced by Kari's wanted rate");
  el.playbackRate = 1.5;                                  // an absolute rate from the page: adopted (base-rate path), not blocked
  assert.equal(el.playbackRate, 1.5);
  spec.writeRate(1);
  el.playbackRate = 1;
  assert.equal(el.playbackRate, 1, "neutral Kari: the page's 1 stands");
  el.preservesPitch = true;
  assert.equal(el.preservesPitch, false, "managed element: preservesPitch stays false");
  const other = new (Object.getPrototypeOf(el).constructor)(); other.preservesPitch = true;
  assert.equal(other.preservesPitch, true, "an element Kari never saw keeps its own value");
});

test("params and compare: applied to existing units and to units created later", () => {
  const { AudioContext, doc, hook, chains } = fresh();
  const p = { st: 2, cents: 0, tempo: 4, keyLock: true, range: 50 };
  hook.apply(p); hook.setEnginePreference("r3"); hook.setCompare(true);
  const el = doc.createElement("audio"); const ctx = new AudioContext();
  ctx.createMediaElementSource(el);
  assert.deepEqual(chains[0].applied, [p]); assert.equal(chains[0].pref, "r3"); assert.equal(chains[0].compare, true);
  const q = { ...p, st: -1 }; hook.apply(q);
  assert.deepEqual(chains[0].applied, [p, q]);
});

test("flush on seeking/emptied/loadstart/pause/ended; key events and DRM reach the bridge", () => {
  const { AudioContext, doc, chains, events } = fresh();
  const el = doc.createElement("audio"); const ctx = new AudioContext();
  ctx.createMediaElementSource(el);
  for (const t of ["seeking", "emptied", "loadstart", "pause", "ended"]) el.fire(t);
  assert.equal(chains[0].flushes, 5);
  assert.deepEqual(events.filter(e => e.type === "media").map(e => e.ev), ["emptied", "loadstart", "pause", "ended"]);
  el.mediaKeys = {}; el.fire("playing");
  assert.equal(chains[0].drm, 1);
  ctx.listeners.statechange[0]();
  assert.deepEqual(events.at(-1), { type: "ctx", state: "running" });
});

/* ---------- route 1 ---------- */
test("route 1: playing with no source call within noCallMs → Kari's own context and source; route 0 call in time cancels it", async () => {
  const { doc, hook, chains, events } = fresh({ noCallMs: 20 });
  const el = doc.createElement("audio");
  el.paused = false; el.fire("playing");
  assert.equal(chains.length, 0);
  await wait(40);
  assert.equal(chains.length, 1); assert.equal(chains[0].spec.route, 1); assert.equal(chains[0].spec.ownsContext, true);
  const unit = hook.units()[0];
  assert.equal(contexts, 1); assert.equal(nativeSourceCalls, 1);
  assert.deepEqual(unit.src.outs, [unit.output]); assert.deepEqual(unit.output.outs, [unit.ctx.destination], "route 1 wires output → destination itself");
  assert.deepEqual(events.filter(e => e.type === "source"), [{ type: "source", route: 1 }]);
  // a second element whose source call arrives in time never falls back
  const { AudioContext: AC2, doc: doc2, chains: chains2 } = fresh({ noCallMs: 20 });
  const el2 = doc2.createElement("audio"); el2.fire("playing");
  new AC2().createMediaElementSource(el2);
  await wait(40);
  assert.equal(chains2.length, 1); assert.equal(chains2[0].spec.route, 0);
});

test("route 1 on an element another context already claimed (hook installed late) → capture-failed, route 'late', nothing built", async () => {
  const { doc, hook, chains, events } = fresh({ noCallMs: 10 });
  const el = doc.createElement("audio"); el.claimed = true;
  el.fire("playing"); await wait(30);
  assert.equal(chains.length, 0); assert.equal(hook.units().length, 0);
  assert.deepEqual(events.filter(e => e.type === "fault"), [{ type: "fault", fault: "capture-failed", route: "late", reason: "InvalidStateError" }]);
});

test("elements not made with createElement('audio') are untouched", () => {
  const { AudioContext, HTMLMediaElement, doc, hook } = fresh();
  const div = doc.createElement("div"); assert.equal(div.tag, "div");
  const el = new HTMLMediaElement(); el.playbackRate = 1; assert.equal(el.playbackRate, 1);
  assert.equal(hook.units().length, 0); assert.equal(hook.active(), null);
  void AudioContext;
});

/* ---------- track key ---------- */
test("track key normalises to /user/slug and rejects non-track links", () => {
  assert.equal(trackKeyFromHref("/someuser/some-track"), "/someuser/some-track");
  assert.equal(trackKeyFromHref("https://soundcloud.com/SomeUser/Some-Track?in=x/sets/y#t"), "/someuser/some-track");
  assert.equal(trackKeyFromHref("/user/slug/s-AbC123"), "/user/slug", "private token dropped");
  assert.equal(trackKeyFromHref("/user/s-AbC123"), null, "token where the slug should be");
  assert.equal(trackKeyFromHref("/user"), null); assert.equal(trackKeyFromHref("/user/sets"), null); assert.equal(trackKeyFromHref("/user/likes"), null);
  assert.equal(trackKeyFromHref("/discover/sets/charts-top"), null); assert.equal(trackKeyFromHref("/search?q=x"), null);
  assert.equal(trackKeyFromHref("https://evil.example/user/slug"), null); assert.equal(trackKeyFromHref("javascript:alert(1)"), null);
  assert.equal(trackKeyFromHref(null), null); assert.equal(trackKeyFromHref(""), null);
  assert.equal(memoryId("/u/s"), "sc:/u/s");
});

/* ---------- world messaging ---------- */
test("accept: same window, same origin, namespace, direction and nonce; handshake types pass without a nonce", () => {
  const win = {}; const origin = "https://soundcloud.com"; const nonce = makeNonce();
  assert.equal(nonce.length, 32);
  const ok = { source: win, origin, data: { ns: NS, dir: "h2b", nonce, type: "status" } };
  assert.ok(accept(ok, win, origin, "h2b", nonce));
  assert.equal(accept({ ...ok, source: {} }, win, origin, "h2b", nonce), null, "another window");
  assert.equal(accept({ ...ok, origin: "https://a-v2.sndcdn.com" }, win, origin, "h2b", nonce), null, "another origin");
  assert.equal(accept({ ...ok, data: { ...ok.data, dir: "b2h" } }, win, origin, "h2b", nonce), null, "own direction");
  assert.equal(accept({ ...ok, data: { ...ok.data, nonce: "x" } }, win, origin, "h2b", nonce), null, "wrong nonce");
  assert.equal(accept({ ...ok, data: { ...ok.data, ns: "other" } }, win, origin, "h2b", nonce), null, "other namespace");
  assert.equal(accept({ ...ok, data: "str" }, win, origin, "h2b", nonce), null);
  assert.ok(accept({ source: win, origin, data: { ns: NS, dir: "h2b", nonce: null, type: "hello" } }, win, origin, "h2b", nonce), "hello carries no nonce yet");
  assert.ok(accept({ source: win, origin, data: { ns: NS, dir: "b2h", nonce: "abc", type: "init" } }, win, origin, "b2h", null), "init is how the hook learns the nonce");
});

test("sanitizeStatus rebuilds a safe status from hostile input", () => {
  const s = sanitizeStatus({ attached: "yes", engine: "evil", engineLatencyMs: 1e12, avOffsetMs: -5, underruns: NaN, load: "x", fault: "<img>", baseRate: Infinity, route: "late", ctxState: "running".repeat(10) });
  assert.deepEqual(s, { attached: false, engine: "bypass", engineLatencyMs: 5000, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, loop: 0, loopMs: 0, loopClamped: false, bpm: null, gridSource: null, tempo: "idle", route: "late", ctxState: "runningrunningru" });
  assert.equal(sanitizeStatus(null).engine, "bypass");
  assert.equal(sanitizeStatus({ attached: true, engine: "r3", fault: "drm-silent", route: 0 }).fault, "drm-silent");
});

/* ---------- beat loops across the worlds ---------- */
import { parseLoopCommand, parseLoopAck, EMPTY_STATUS, MAX_NUDGE } from "../src/soundcloud/protocol.ts";
import { LoopRequests, runLoopCommand } from "../src/soundcloud/loops.ts";

test("parseLoopCommand: the six actions, with beats, bpm and delta checked and clamped", () => {
  assert.deepEqual(parseLoopCommand({ action: "latch", beats: 0.5, seq: 3 }), { action: "latch", beats: 0.5, seq: 3 });
  assert.deepEqual(parseLoopCommand({ action: "latch", beats: 1, seq: 0 }), { action: "latch", beats: 1, seq: 0 });
  assert.deepEqual(parseLoopCommand({ action: "latch", beats: 4, seq: 1 }), { action: "latch", beats: 4, seq: 1 });
  assert.deepEqual(parseLoopCommand({ action: "latch", beats: 8, seq: 1 }), { action: "latch", beats: 8, seq: 1 });
  for (const bad of [{ action: "latch", beats: 0.25, seq: 1 }, { action: "latch", beats: 0.3, seq: 1 }, { action: "latch", beats: "0.5", seq: 1 }, { action: "latch", beats: 0.5 }, { action: "latch", beats: 0.5, seq: 1.5 }, { action: "latch", beats: 0.5, seq: -1 }, { action: "latch", beats: 2, seq: 1 }])
    assert.equal(parseLoopCommand(bad), null, JSON.stringify(bad));
  assert.deepEqual(parseLoopCommand({ action: "release", extra: 1 }), { action: "release" });
  assert.deepEqual(parseLoopCommand({ action: "tap" }), { action: "tap" });
  assert.deepEqual(parseLoopCommand({ action: "clear" }), { action: "clear" });
  assert.deepEqual(parseLoopCommand({ action: "bpm", bpm: 128 }), { action: "bpm", bpm: 128 });
  assert.deepEqual(parseLoopCommand({ action: "bpm", bpm: 5 }), { action: "bpm", bpm: 5 }, "the grid's 40–300 clamp is the controller's");
  for (const bad of ["128", NaN, Infinity, 0, -1, 9999]) assert.equal(parseLoopCommand({ action: "bpm", bpm: bad }), null, String(bad));
  assert.deepEqual(parseLoopCommand({ action: "nudge", delta: -1 }), { action: "nudge", delta: -1 });
  assert.deepEqual(parseLoopCommand({ action: "nudge", delta: 1e9 }), { action: "nudge", delta: MAX_NUDGE });
  assert.equal(parseLoopCommand({ action: "nudge", delta: 0 }), null); assert.equal(parseLoopCommand({ action: "nudge", delta: Infinity }), null);
  assert.equal(parseLoopCommand({ action: "eval" }), null); assert.equal(parseLoopCommand(null), null); assert.equal(parseLoopCommand("latch"), null);
  assert.deepEqual(parseLoopAck({ seq: 4, ok: true }), { seq: 4, ok: true });
  assert.deepEqual(parseLoopAck({ seq: 4, ok: "yes" }), { seq: 4, ok: false }); assert.equal(parseLoopAck({ seq: "4" }), null); assert.equal(parseLoopAck(null), null);
});

test("sanitizeStatus carries the loop fields and rejects off-grid values", () => {
  const full = { ...EMPTY_STATUS, attached: true, engine: "bypass", loop: 0.5, loopMs: 234, loopClamped: true, bpm: 128, gridSource: "auto", tempo: "found", route: 0, ctxState: "running" };
  assert.deepEqual(sanitizeStatus(full), full, "a clean status survives untouched");
  const s = sanitizeStatus({ loop: 0.25, loopMs: -5, bpm: "128", gridSource: "<img>", tempo: "evil", loopClamped: 1 });
  assert.equal(s.loop, 0, "¼ is no longer a loop length"); assert.equal(s.loopMs, 0); assert.equal(s.bpm, null); assert.equal(s.gridSource, null);
  assert.equal(s.tempo, "idle", "an unknown phase reads as idle, never as tap"); assert.equal(s.loopClamped, false);
  assert.equal(sanitizeStatus({ loop: 8, loopMs: 1e9, bpm: 5, gridSource: "manual" }).loopMs, 60000);
  assert.equal(sanitizeStatus({ loop: 8 }).loop, 8); for (const ph of ["off", "idle", "gesture", "learning", "found", "none"]) assert.equal(sanitizeStatus({ tempo: ph }).tempo, ph);
  assert.equal(sanitizeStatus({ bpm: 5 }).bpm, 5); for (const bad of [Infinity, 0, 5000, "128"]) assert.equal(sanitizeStatus({ bpm: bad }).bpm, null, String(bad));
  assert.deepEqual(EMPTY_STATUS.loop, 0); assert.equal(EMPTY_STATUS.bpm, null);
});

/** Two worlds on one fake window: the bridge side (LoopRequests + accept h2b) and the hook side (accept b2h + run). */
function loopWorlds(ctl, opts = {}) {
  const origin = "https://soundcloud.com", win = {}, listeners = [], sent = [];
  const postMessage = (data, targetOrigin) => { assert.equal(targetOrigin, origin); sent.push(data); for (const l of listeners.slice()) l({ source: win, origin, data }); };
  // bridge
  const nonce = makeNonce(); let lastStatus = null; const bridgeLog = [];
  const loops = new LoopRequests(cmd => postMessage({ ns: NS, dir: "b2h", nonce, type: "loop", ...cmd }, origin), opts.timeoutMs ?? 50);
  listeners.push(e => { const d = accept(e, win, origin, "h2b", nonce); if (!d) return; bridgeLog.push(d.type); if (d.type === "loop-ack") { const a = parseLoopAck(d); if (a) loops.ack(a.seq, a.ok); } if (d.type === "status") lastStatus = sanitizeStatus(d.status); });
  // hook
  let hookNonce = null; const hookLog = [];
  const hookPost = m => postMessage({ ns: NS, dir: "h2b", nonce: hookNonce, ...m }, origin);
  listeners.push(e => {
    const d = accept(e, win, origin, "b2h", hookNonce); if (!d) return; hookLog.push(d.type);
    if (d.type === "init") { if (!hookNonce && typeof d.nonce === "string") { hookNonce = d.nonce; hookPost({ type: "ready" }); } return; }
    if (d.type === "loop") { const cmd = parseLoopCommand(d); if (!cmd) { hookLog.push("rejected"); return; } runLoopCommand(cmd, ctl()).then(ok => { if (cmd.action === "latch") hookPost({ type: "loop-ack", seq: cmd.seq, ok }); }); }
  });
  const handshake = () => postMessage({ ns: NS, dir: "b2h", nonce, type: "init" }, origin);
  return { loops, handshake, hookPost, postMessage, origin, nonce, sent, bridgeLog, hookLog, status: () => lastStatus, hookNonce: () => hookNonce };
}
const fakeController = () => { const c = { calls: [], ok: true, async latchLoop(b) { c.calls.push(["latch", b]); return c.ok; }, releaseLoop() { c.calls.push(["release"]); }, tap() { c.calls.push(["tap"]); return null; }, setBpm(b) { c.calls.push(["bpm", b]); }, nudgeBpm(d) { c.calls.push(["nudge", d]); }, setGrid(g) { c.calls.push(["grid", g]); } }; return c; };

test("loop round trip: dock latch → bridge message → hook routes to the controller → ack resolves the dock's promise", async () => {
  const ctl = fakeController();
  const w = loopWorlds(() => ctl);
  w.handshake();
  assert.equal(w.hookNonce(), w.nonce); assert.deepEqual(w.bridgeLog, ["ready"]);
  assert.equal(await w.loops.latch(4), true);
  assert.deepEqual(ctl.calls, [["latch", 4]]); assert.equal(w.loops.inFlight, 0);
  ctl.ok = false;                                               // the controller refuses (no grid, or paused)
  assert.equal(await w.loops.latch(1), false, "a refused latch resolves false, not true");
  w.loops.release(); w.loops.tap(); w.loops.setBpm(128); w.loops.nudge(-1); w.loops.clear();
  w.loops.setBpm(NaN); w.loops.nudge(0);                          // never leave the bridge
  await wait(0);
  assert.deepEqual(ctl.calls.slice(1), [["latch", 1], ["release"], ["tap"], ["bpm", 128], ["nudge", -1], ["grid", null]]);
  assert.equal(w.hookLog.filter(t => t === "rejected").length, 0);
  // the hook's loop fields reach the dock through status, sanitized
  w.hookPost({ type: "status", status: { attached: true, engine: "bypass", loop: 4, loopMs: 1875, bpm: 128, gridSource: "auto", tempo: "found", route: 0, ctxState: "running" } });
  assert.equal(w.status().loop, 4); assert.equal(w.status().loopMs, 1875); assert.equal(w.status().bpm, 128); assert.equal(w.status().gridSource, "auto");
  // every loop message carried the namespace, the bridge→hook direction and the nonce
  for (const m of w.sent.filter(m => m.type === "loop")) { assert.equal(m.ns, NS); assert.equal(m.dir, "b2h"); assert.equal(m.nonce, w.nonce); }
});

test("loop round trip guards: wrong nonce or no controller → no action and the latch resolves false; a hostile ack is ignored", async () => {
  const ctl = fakeController();
  let have = true;
  const w = loopWorlds(() => (have ? ctl : null), { timeoutMs: 30 });
  w.handshake();
  // a page script forging a loop message with the wrong nonce: dropped by the hook, the dock's promise times out to false
  const t0 = Date.now();
  w.postMessage({ ns: NS, dir: "b2h", nonce: "0".repeat(32), type: "loop", action: "latch", beats: 0.5, seq: 99 }, w.origin);
  w.postMessage({ ns: NS, dir: "b2h", nonce: w.nonce, type: "loop", action: "latch", beats: 7, seq: 100 }, w.origin); // right nonce, bad beats
  await wait(5);
  assert.deepEqual(ctl.calls, []); assert.deepEqual(w.hookLog.filter(t => t === "rejected"), ["rejected"]);
  have = false;                                                 // nothing playing yet: no active unit in the hook
  assert.equal(await w.loops.latch(0.5), false); assert.deepEqual(ctl.calls, []);
  have = true;
  // an ack for a sequence number nobody is waiting on, or with the hook's nonce missing, changes nothing
  assert.equal(w.loops.ack(12345, true), false);
  const p = w.loops.latch(0.5);
  w.postMessage({ ns: NS, dir: "h2b", nonce: null, type: "loop-ack", seq: 1, ok: true }, w.origin);
  assert.equal(await p, true, "the real ack still lands"); assert.ok(Date.now() - t0 < 1000);
});
