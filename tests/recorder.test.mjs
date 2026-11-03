// The recorder, three layers: the pure stage (chunking, flush on stop, frame stamps), the SHIPPED worklet bundle
// registering "kari-recorder" and fed a known signal (reassembled bit for bit), and the main-thread Recorder driven
// by a fake worklet node whose chunks come from the real stage (holds cut frame-accurately, drops counted, moves at
// the right frames, the stop timeout). The WAV each take produces is read by the independent reader, not the writer.
import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { RecorderStage, DEFAULT_CHUNK } from "../src/worklet/recorder.js";

const SR = 48000, Q = 128;
const tag = (u8, o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
function noise(n, seed = 0x9e3779b9) { let s = seed >>> 0; const x = new Float32Array(n); for (let i = 0; i < n; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; x[i] = (s / 4294967296 - 0.5) * 1.9; } return x; }
/** A ramp that is exact in 24 bit: frame f ↦ (f − 2^22) / 2^23, so a decoded sample names its frame. */
const rampAt = (f) => (f - 4194304) / 8388608;
const frameOf = (code) => code + 4194304;

/** Minimal independent reader (the full one lives in wav.test.mjs): fmt, 24-bit samples as integers, cue positions, labels. */
function readWav(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  assert.equal(tag(u8, 0), "RIFF"); assert.equal(dv.getUint32(4, true), u8.length - 8);
  const chunks = []; let o = 12;
  while (o + 8 <= u8.length) { const id = tag(u8, o), size = dv.getUint32(o + 4, true); chunks.push({ id, size, at: o + 8 }); o += 8 + size + (size & 1); }
  const fmt = chunks.find(c => c.id === "fmt "), data = chunks.find(c => c.id === "data");
  const channels = dv.getUint16(fmt.at + 2, true), bits = dv.getUint16(fmt.at + 14, true), align = dv.getUint16(fmt.at + 12, true);
  assert.equal(bits, 24);
  const frames = data.size / align, samples = Array.from({ length: channels }, () => new Int32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) { const p = data.at + i * align + c * 3; samples[c][i] = ((u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16)) << 8) >> 8; }
  const cue = chunks.find(c => c.id === "cue "), cues = [];
  if (cue) { const n = dv.getUint32(cue.at, true); for (let i = 0; i < n; i++) cues.push({ id: dv.getUint32(cue.at + 4 + 24 * i, true), pos: dv.getUint32(cue.at + 4 + 24 * i + 20, true) }); }
  const labels = new Map(), list = chunks.find(c => c.id === "LIST");
  if (list) { let p = list.at + 4; const end = list.at + list.size; while (p + 8 <= end) { const size = dv.getUint32(p + 4, true); if (tag(u8, p) === "labl") { const t = u8.subarray(p + 12, p + 8 + size); labels.set(dv.getUint32(p + 8, true), new TextDecoder().decode(t.subarray(0, t.indexOf(0)))); } p += 8 + size + (size & 1); } }
  return { sampleRate: dv.getUint32(fmt.at + 4, true), channels, frames, samples, cues: cues.map(c => ({ pos: c.pos, label: labels.get(c.id) })) };
}

// ── 1. the pure stage ───────────────────────────────────────────────────────────────────────────────────────────

test("stage: fixed chunks stamped with the context frame of their first sample, data copied exactly", () => {
  const out = [], st = new RecorderStage(2, 512, (c) => out.push(c));
  const L = noise(2048, 1), R = noise(2048, 2);
  st.start();
  for (let i = 0; i < 2048; i += Q) st.push([L.subarray(i, i + Q), R.subarray(i, i + Q)], Q, 1000 + i);
  assert.equal(out.length, 4);
  assert.deepEqual(out.map(c => c.frame), [1000, 1512, 2024, 2536]);
  assert.ok(out.every(c => c.frames === 512 && c.data.length === 2 && c.data[0].length === 512));
  assert.deepEqual(out[1].data[0], L.subarray(512, 1024)); assert.deepEqual(out[3].data[1], R.subarray(1536, 2048));
  assert.equal(st.total, 2048);
  const peak = Math.max(...Array.from(L.subarray(0, 512)).map(Math.abs), ...Array.from(R.subarray(0, 512)).map(Math.abs));
  assert.ok(Math.abs(out[0].peak - peak) < 1e-9, "peak is the largest magnitude on either channel");
});

test("stage: stop flushes the partial chunk, sliced to its length; nothing while off; start resets", () => {
  const out = [], st = new RecorderStage(2, 512, (c) => out.push(c));
  st.push([noise(Q), noise(Q)], Q, 0);
  assert.equal(out.length, 0, "frames before start are dropped");
  st.start();
  const L = noise(300, 5);
  st.push([L.subarray(0, Q), L.subarray(0, Q)], Q, 7000); st.push([L.subarray(Q, 300), L.subarray(Q, 300)], 172, 7128);
  assert.equal(out.length, 0);
  st.stop();
  assert.equal(out.length, 1); assert.equal(out[0].frame, 7000); assert.equal(out[0].frames, 300); assert.equal(out[0].data[0].length, 300);
  assert.deepEqual(out[0].data[1], L);
  st.stop(); st.push([L, L], 300, 9000);
  assert.equal(out.length, 1, "a second stop or a push while off emits nothing");
  assert.equal(st.total, 300);
  st.start(); assert.equal(st.total, 0); st.stop(); assert.equal(out.length, 1, "an empty take flushes nothing");
});

test("stage: a push that spans a chunk boundary splits it; an empty input keeps time as silence; a missing channel repeats", () => {
  const out = [], st = new RecorderStage(2, 128, (c) => out.push(c));
  st.start();
  const x = noise(200, 9);
  st.push([x, x], 200, 500);
  assert.equal(out.length, 1); assert.equal(out[0].frame, 500); assert.deepEqual(out[0].data[0], x.subarray(0, 128));
  st.push([], 56, 700);                                   // source inactive: silence, and the chunk closes at 128
  assert.equal(out.length, 2); assert.equal(out[1].frame, 628);
  assert.deepEqual(out[1].data[0].subarray(0, 72), x.subarray(128, 200));
  assert.ok(out[1].data[0].subarray(72).every(v => v === 0) && out[1].data[1].subarray(72).every(v => v === 0));
  assert.ok(Math.abs(out[1].peak - Math.max(...Array.from(x.subarray(128, 200)).map(Math.abs))) < 1e-9);
  const mono = noise(128, 11);
  st.push([mono], 128, 756);
  assert.equal(out.length, 3); assert.deepEqual(out[2].data[1], mono); assert.deepEqual(out[2].data[0], mono);
  assert.equal(new RecorderStage(2, 16).chunk, 128, "chunk floor is one render quantum");
  assert.equal(new RecorderStage().chunk, DEFAULT_CHUNK);
});

// ── 2. the shipped worklet bundle ───────────────────────────────────────────────────────────────────────────────

let Recorder, ctx;
before(async () => {
  // The worklet bundle as KARI_RECORD=1 builds it (the committed extension/worklet.js is the public build, recorder out).
  const out = new URL("../test-build/worklet-rec.test-bundle.js", import.meta.url);
  await build({ entryPoints: [fileURLToPath(new URL("../src/worklet/processor.js", import.meta.url))], bundle: true, format: "iife", outfile: fileURLToPath(out), target: ["chrome120"], logLevel: "silent", define: { __KARI_BUILD__: '"test"', __KARI_RECORD__: "true" } });
  const code = fs.readFileSync(out, "utf8");
  const registered = new Map();
  ctx = vm.createContext({
    sampleRate: SR, currentTime: 0, currentFrame: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: () => {}, onmessage: null }; } },
    registerProcessor: (name, cls) => registered.set(name, cls),
    WebAssembly, console, Date, Math, Float32Array, Uint8Array, Uint32Array, Int32Array, ArrayBuffer, TextDecoder, TextEncoder, Promise, setTimeout, clearTimeout, performance, Error, Array, Object, Symbol, URL, globalThis: undefined,
  });
  ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(code, ctx, { filename: "worklet.js" });
  Recorder = registered.get("kari-recorder");
  assert.ok(Recorder, "the KARI_RECORD=1 bundle registers kari-recorder");
  assert.ok(registered.get("kari-processor"), "and still registers kari-processor");
});

test("the committed public build carries no recorder path (compiled out, not hidden)", () => {
  const worklet = fs.readFileSync(new URL("../extension/worklet.js", import.meta.url), "utf8");
  const content = fs.readFileSync(new URL("../extension/content.js", import.meta.url), "utf8");
  assert.ok(!worklet.includes("kari-recorder"), "worklet.js registers no kari-recorder");
  assert.ok(worklet.includes("kari-processor"), "worklet.js still registers kari-processor");
  for (const s of ["kari-recorder", "moves.json", "audio/wav", "not recording"]) assert.ok(!content.includes(s), `content.js has no "${s}"`);
  assert.ok(!/\+rec"/.test(content), "the public stamp carries no +rec");
});

test("shipped worklet: kari-recorder posts transferable chunks, reassembled bit for bit, answers stop with flushed", () => {
  const msgs = [], transfers = [];
  const p = new Recorder({ processorOptions: { chunkFrames: 1024 } });
  p.port.postMessage = (m, t) => { msgs.push(m); transfers.push(t); };
  const L = noise(5000, 21), R = noise(5000, 22);
  assert.equal(p.process([[L.subarray(0, Q), R.subarray(0, Q)]]), true, "process() keeps the node alive");
  assert.equal(msgs.length, 0, "nothing is posted before rec on");
  p.port.onmessage({ data: { type: "rec", on: true } });
  for (let i = 0; i < 5000; i += Q) {
    ctx.currentFrame = 100000 + i; const n = Math.min(Q, 5000 - i);
    const inL = new Float32Array(Q), inR = new Float32Array(Q); inL.set(L.subarray(i, i + n)); inR.set(R.subarray(i, i + n));
    assert.equal(p.process([[inL, inR]]), true);
  }
  ctx.currentFrame = 100000 + 5000 + 120;      // a quantum is 128: the last one carried 8 frames past the signal
  p.port.onmessage({ data: { type: "rec", on: false } });
  const chunks = msgs.filter(m => m.type === "chunk"), flushed = msgs.filter(m => m.type === "flushed");
  assert.equal(chunks.length, 5, "4 full chunks + the partial one on stop");
  assert.deepEqual(chunks.map(c => c.frame), [100000, 101024, 102048, 103072, 104096]);
  assert.deepEqual(chunks.map(c => c.frames), [1024, 1024, 1024, 1024, 5120 - 4096]);
  const outL = new Float32Array(5120), outR = new Float32Array(5120);
  for (const c of chunks) { outL.set(c.data[0], c.frame - 100000); outR.set(c.data[1], c.frame - 100000); }
  assert.deepEqual(outL.subarray(0, 5000), L); assert.deepEqual(outR.subarray(0, 5000), R);
  assert.ok(outL.subarray(5000).every(v => v === 0), "the zero-padded tail of the last quantum is zeros, not garbage");
  assert.equal(flushed.length, 1); assert.equal(flushed[0].total, 5120); assert.equal(flushed[0].frame, 105120);
  for (let i = 0; i < chunks.length; i++) { const t = transfers[msgs.indexOf(chunks[i])]; assert.ok(Array.isArray(t) && t.length === 2 && t[0] === chunks[i].data[0].buffer, "chunk buffers travel as transferables"); }
  p.port.onmessage({ data: { type: "close" } });
  assert.equal(p.process([[L.subarray(0, Q), R.subarray(0, Q)]]), false, "close ends the processor");
});

test("shipped worklet: no input (source inactive) records silence and keeps the frame count; mono input fills both channels", () => {
  const msgs = [], p = new Recorder({ processorOptions: { chunkFrames: 256, on: true } });   // armed by options, no message
  p.port.postMessage = (m) => msgs.push(m);
  ctx.currentFrame = 0; p.process([[]]); ctx.currentFrame = 128; p.process([]);
  const mono = noise(Q, 3); ctx.currentFrame = 256; p.process([[mono]]); ctx.currentFrame = 384; p.process([[mono]]);
  p.port.onmessage({ data: { type: "rec", on: false } });
  const chunks = msgs.filter(m => m.type === "chunk");
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].frame, 0); assert.ok(chunks[0].data[0].every(v => v === 0) && chunks[0].data[1].every(v => v === 0)); assert.equal(chunks[0].peak, 0);
  assert.equal(chunks[1].frame, 256); assert.deepEqual(chunks[1].data[0].subarray(0, Q), mono); assert.deepEqual(chunks[1].data[1].subarray(Q), mono);
});

// ── 3. the main-thread Recorder ─────────────────────────────────────────────────────────────────────────────────

let R;   // the bundled module: Recorder, takeName, MAX_TAKE_SECONDS
before(async () => {
  const out = new URL("../test-build/recorder.test-bundle.mjs", import.meta.url);
  await build({ entryPoints: [fileURLToPath(new URL("../src/content/audio/recorder.ts", import.meta.url))], bundle: true, format: "esm", outfile: fileURLToPath(out), target: ["node22"], logLevel: "silent", define: { __KARI_BUILD__: '"test"', __KARI_RECORD__: "true" } });
  R = await import(out.href + "?t=" + Date.now());
});

/** The audio-thread side as the main thread sees it: a node whose port drives the real stage. Chunks arrive on a microtask, like a real port. */
class FakeNode {
  static last = null;
  constructor(ctx, name, opts) {
    assert.equal(name, "kari-recorder");
    assert.deepEqual([opts.numberOfInputs, opts.numberOfOutputs, opts.channelCount, opts.channelCountMode], [1, 0, 2, "explicit"]);
    FakeNode.last = this; this.closed = false; this.dropNext = false; this.answerStop = true; this.posted = [];
    const toMain = (m) => queueMicrotask(() => this.port.onmessage?.({ data: m }));
    this.stage = new RecorderStage(2, opts.processorOptions.chunkFrames || undefined, (c) => { if (this.dropNext) { this.dropNext = false; return; } toMain({ type: "chunk", ...c }); });
    if (opts.processorOptions.on) this.stage.start();     // armed from the constructor, as the shipped processor is
    this.port = { onmessage: null, postMessage: (m) => { this.posted.push(m); if (m.type === "rec") { if (m.on) this.stage.start(); else { this.stage.stop(); if (this.answerStop) toMain({ type: "flushed", frame: 0, total: this.stage.total }); } } else if (m.type === "close") this.closed = true; } };
  }
  /** Render [from, to) of the exact ramp (left) and its negative (right), in quanta. */
  render(from, to) { for (let f = from; f < to; f += Q) { const n = Math.min(Q, to - f); const L = new Float32Array(n), Rr = new Float32Array(n); for (let i = 0; i < n; i++) { L[i] = rampAt(f + i); Rr[i] = -L[i]; } this.stage.push([L, Rr], n, f); } }
}
const tick = () => new Promise(r => setTimeout(r, 0));
const fakeCtx = () => ({ sampleRate: SR, currentTime: 0, at(frame) { this.currentTime = frame / SR; } });
const tap = { connected: [], connect(n) { this.connected.push(n); }, disconnect(n) { this.connected = this.connected.filter(x => x !== n); } };
const PARAMS = { st: 2, cents: 0, tempo: -6, keyLock: false, range: 50 };

test("recorder: a take with a hold is cut frame-accurately, moves land on take frames, cues carry the labels", async () => {
  globalThis.AudioWorkletNode = FakeNode;
  const c = fakeCtx(); c.at(1024);
  const progress = [];
  const rec = new R.Recorder(c, tap, { site: "yt", track: "abc", title: "A test", build: "t", params: PARAMS }, { chunkFrames: 512, onProgress: (f, p) => progress.push([f, p]) });
  assert.equal(rec.on, false);
  rec.start(); const node = FakeNode.last;
  assert.equal(rec.on, true); assert.ok(tap.connected.includes(node)); assert.equal(node.stage.on, true, "armed by processorOptions, no message race"); assert.equal(node.posted.length, 0);
  rec.mark("params", { ...PARAMS });                     // unchanged: not logged twice
  node.render(1024, 2944); await tick();
  assert.equal(rec.frames, 1536, "three chunks in, one filling");
  c.at(3000); rec.hold(); assert.equal(rec.holding, true);
  rec.hold();                                             // a second hold while holding is ignored
  c.at(3400); rec.mark("params", { ...PARAMS, st: 3 });   // inside the hold: lands on the cut
  node.render(2944, 3800); await tick();
  c.at(3800); rec.resume(); assert.equal(rec.holding, false);
  rec.resume();                                           // nothing to resume
  node.render(3800, 5000); await tick();
  c.at(5000); rec.mark("seek", { to: 12.5 }); rec.mark("loop", { beats: 4, lenMs: 1875 });
  node.render(5000, 6144); await tick();
  c.at(6144);
  const take = await rec.stop();
  assert.equal(rec.on, false); assert.ok(node.closed); assert.ok(!tap.connected.includes(node));
  assert.equal(take.frames, 5120 - 800); assert.equal(take.dropped, 0); assert.equal(take.channels, 2); assert.equal(take.sampleRate, SR);
  assert.ok(Math.abs(take.seconds - 4320 / SR) < 1e-12);
  assert.ok(progress.length >= 9 && progress.at(-1)[0] === 4320, "progress reports the frames written");
  const r = readWav(new Uint8Array(await take.wav.arrayBuffer()));
  assert.equal(take.bytes, take.wav.size);
  assert.equal(r.frames, 4320); assert.equal(r.sampleRate, SR);
  // every decoded sample names its source frame: 1024..2999 then 3800..6143, the right channel mirrored
  for (let i = 0; i < 4320; i++) {
    const want = i < 1976 ? 1024 + i : 3800 + (i - 1976);
    if (frameOf(r.samples[0][i]) !== want) assert.fail(`take frame ${i} holds source frame ${frameOf(r.samples[0][i])}, want ${want}`);
    if (r.samples[1][i] !== -r.samples[0][i]) assert.fail(`right channel differs at ${i}`);
  }
  const moves = take.log.moves;
  assert.deepEqual(moves.map(m => [m.kind, m.frame]), [["start", 0], ["hold", 1976], ["params", 1976], ["resume", 1976], ["seek", 3176], ["loop", 3176], ["stop", 4320]]);
  assert.deepEqual(moves[0].data, PARAMS); assert.deepEqual(moves[2].data, { ...PARAMS, st: 3 });
  assert.ok(moves.every(m => Math.abs(m.t - m.frame / SR) < 1e-4));
  assert.deepEqual(r.cues, [{ pos: 1976, label: "pitch +3 st · 0.94×" }, { pos: 3176, label: "seek 12.50 s" }, { pos: 3176, label: "loop 4 beats" }]);
  assert.deepEqual({ ...take.log, moves: undefined }, { version: 1, kari: "t", startedAt: take.startedAt, site: "yt", track: "abc", title: "A test", sampleRate: SR, channels: 2, bits: 24, frames: 4320, seconds: +(4320 / SR).toFixed(4), dropped: 0, peak: +take.peak.toFixed(6), params: PARAMS, moves: undefined });
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(take.startedAt));
  assert.doesNotThrow(() => { rec.mark("seek"); rec.hold(); rec.resume(); }, "marks after stop are ignored, never thrown");
  await assert.rejects(() => rec.stop(), /stopped|not recording/);
  assert.match(R.takeName(take), /^kari-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-a-test-\+2st-0\.94x$/);
});

test("recorder: a lost chunk is counted as dropped frames, never written as silence; stop inside a hold closes it", async () => {
  globalThis.AudioWorkletNode = FakeNode;
  const c = fakeCtx(); c.at(0);
  const rec = new R.Recorder(c, tap, { params: PARAMS }, { chunkFrames: 512 });
  rec.start(); const node = FakeNode.last;
  node.render(0, 512); node.dropNext = true; node.render(512, 1024); node.render(1024, 2048); await tick();
  assert.equal(rec.dropped, 512); assert.equal(rec.frames, 1536);
  c.at(2048); rec.hold(); node.render(2048, 2560); await tick();
  c.at(2560);
  const take = await rec.stop();
  assert.equal(take.dropped, 512); assert.equal(take.frames, 1536, "the held tail is not in the take");
  const r = readWav(new Uint8Array(await take.wav.arrayBuffer()));
  const frames = Array.from(r.samples[0]).map(frameOf);
  assert.equal(frames[511], 511); assert.equal(frames[512], 1024, "the file jumps over the lost chunk");
  assert.deepEqual(take.log.moves.map(m => [m.kind, m.frame]), [["start", 0], ["hold", 1536], ["resume", 1536], ["stop", 1536]]);
});

test("recorder: a dead port never answers, stop still returns the take after the timeout", async () => {
  globalThis.AudioWorkletNode = FakeNode;
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const c = fakeCtx(); const rec = new R.Recorder(c, tap, { params: PARAMS }, { chunkFrames: 256 });
    rec.start(); const node = FakeNode.last; node.answerStop = false;
    node.render(0, 1000); await Promise.resolve(); await Promise.resolve();
    c.at(1000);
    let done = false; const p = rec.stop().then(t => { done = true; return t; });
    await Promise.resolve(); assert.equal(done, false);
    mock.timers.tick(1499); await Promise.resolve(); await Promise.resolve(); assert.equal(done, false);
    mock.timers.tick(1); const take = await p;
    assert.equal(take.frames, 1000, "the partial chunk the stage flushed on 'rec off' is in the take");
  } finally { mock.timers.reset(); }
});

test("recorder: refuses to pass MAX_TAKE_SECONDS and reports full", async () => {
  globalThis.AudioWorkletNode = FakeNode;
  const c = fakeCtx(); const rec = new R.Recorder(c, tap, { params: PARAMS }, { chunkFrames: 256 });
  rec.start(); const node = FakeNode.last;
  const cap = R.MAX_TAKE_SECONDS * SR;
  rec.writer._frames = cap - 100;                        // reaching in: an hour of audio is not a unit test
  node.render(0, 512); await tick();
  assert.equal(rec.frames, cap); assert.equal(rec.full, true);
  node.render(512, 1024); await tick();
  assert.equal(rec.frames, cap, "nothing past the cap");
  c.at(1024); const take = await rec.stop(); assert.equal(take.frames, cap);
});

test("recorder: starting while the source is silent (no chunks yet) stops cleanly to an empty take", async () => {
  globalThis.AudioWorkletNode = FakeNode;
  const c = fakeCtx(); c.at(500); const rec = new R.Recorder(c, tap, { params: PARAMS });
  rec.start(); c.at(900);
  const take = await rec.stop();
  assert.equal(take.frames, 0); assert.equal(take.seconds, 0);
  const r = readWav(new Uint8Array(await take.wav.arrayBuffer()));
  assert.equal(r.frames, 0); assert.deepEqual(take.log.moves.map(m => [m.kind, m.frame]), [["start", 0], ["stop", 0]]);
});
