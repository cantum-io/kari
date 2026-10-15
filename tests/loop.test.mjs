// Beat-loop stage: loop length, seam continuity, slip resume, engage timing, and the wiring into the shipped worklet.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { LoopStage, DelayLine } from "../src/worklet/loop.js";

const SR = 48000, Q = 128;

// deterministic noise (xorshift), amplitude ±0.5, mirrored on the right channel so stereo paths can be checked too
function noise(n, seed = 0x9e3779b9) { let s = seed >>> 0; const x = new Float32Array(n); for (let i = 0; i < n; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; x[i] = (s / 4294967296 - 0.5); } return x; }
const sine = (f, n, a = 0.5) => Float32Array.from({ length: n }, (_, i) => a * Math.sin(2 * Math.PI * f * i / SR));
const maxStep = (x, a, b) => { let m = 0; for (let i = Math.max(1, a); i < b; i++) m = Math.max(m, Math.abs(x[i] - x[i - 1])); return m; };

/** Run `input` through a stage block by block, calling `at[frame]()` right before the block that contains that frame. */
function run(stage, input, at = {}) {
  const out = new Float32Array(input.length), outR = new Float32Array(input.length);
  const inL = new Float32Array(Q), inR = new Float32Array(Q);
  for (let i = 0; i < input.length; i += Q) {
    for (const f of Object.keys(at)) if (+f >= i && +f < i + Q) at[f]();
    const n = Math.min(Q, input.length - i);
    inL.set(input.subarray(i, i + n)); for (let k = 0; k < n; k++) inR[k] = -inL[k];
    const o = stage.process([inL, inR], n);
    out.set(o[0].subarray(0, n), i); outR.set(o[1].subarray(0, n), i);
  }
  return { out, outR };
}

test("ring and fade sizes at 44.1 and 48 kHz", () => {
  const a = new LoopStage(48000), b = new LoopStage(44100);
  assert.equal(a.N, 131072); assert.equal(b.N, 131072);          // ≥ 2 s, power of two
  assert.equal(a.xf, 288); assert.equal(b.xf, 265);              // 6 ms
  assert.equal(a.maxLen, 131072 - 288);
  assert.ok(a.maxLen / 48000 > 2.7, "holds a 1-beat loop down to 22 bpm at 1×");
});

test("live until the body ends, then exact repeats: out[o] == out[o - len] after the first wrap", () => {
  const st = new LoopStage(SR);
  const x = noise(SR * 2);
  const len = 5625, back = 2000, E = Q * 300;                     // ¼ beat at 128 bpm; latch 2000 frames after the grid line
  const { out, outR } = run(st, x, { [E]: () => assert.equal(st.engage(len, back), 0) });
  const S = E - back;
  for (let o = 0; o < S + len - st.xf; o++) assert.equal(out[o], x[o], `live before the first seam at ${o}`);
  let checked = 0;
  for (let o = E + len; o < x.length; o++) { assert.equal(out[o], out[o - len], `period at ${o}`); assert.equal(outR[o], -out[o]); checked++; }
  assert.ok(checked > SR, "checked more than a second of repeats");
  // the body is the input from the grid line on
  for (let j = 0; j < len - st.xf; j++) assert.equal(out[S + len + j], x[S + j]);
});

test("seam: max sample step across the wrap ≤ 1.1 × the input's, and far below a hard cut", () => {
  const st = new LoopStage(SR);
  const f = 440, x = sine(f, SR * 4), len = 5625, back = 100, E = Q * 200;
  // 5625 frames = 51.56 periods of 440 Hz: the wrap lands near antiphase, the worst case for a cut
  const { out } = run(st, x, { [E]: () => st.engage(len, back) });
  const S = E - back, inStep = maxStep(x, 1, x.length);
  const cutStep = Math.abs(x[S + len - 1] - x[S]);                 // what a hard wrap would have stepped
  let seamStep = 0, seams = 0;
  for (let k = 1; S + k * len + 2 < x.length; k++) { const o = S + k * len; seamStep = Math.max(seamStep, maxStep(out, o - st.xf - 1, o + 2)); seams++; }
  assert.ok(seams >= 20 && cutStep > 0.5, `reached ${seams} seams (a cut would step ${cutStep.toFixed(3)})`);
  assert.ok(seamStep <= inStep * 1.1, `seam step ${seamStep.toFixed(5)} vs input ${inStep.toFixed(5)}`);
  assert.ok(seamStep < cutStep * 0.1, `seam ${seamStep.toFixed(4)} vs hard cut ${cutStep.toFixed(4)}`);
  console.log(`  seam: max step ${seamStep.toFixed(5)} · input ${inStep.toFixed(5)} · hard cut ${cutStep.toFixed(3)} · ${seams} seams`);
});

test("slip: after release the output is the input again, bit for bit, within one fade", () => {
  const st = new LoopStage(SR);
  const x = noise(SR * 3, 7);
  const len = 9600, back = 500, E = Q * 100, R = Q * 600;        // hold for 500 blocks: several wraps, then let go
  const { out } = run(st, x, { [E]: () => st.engage(len, back), [R]: () => st.release() });
  assert.notEqual(out[R - 1], x[R - 1], "was looping right before the release");
  for (let o = R + st.xf; o < x.length; o++) assert.equal(out[o], x[o], `live at ${o}`);
  // the fade is a mix of the loop's continuation and the live signal, never a jump to either
  assert.ok(Math.abs(out[R] - x[R]) > 1e-6 && Math.abs(out[R + st.xf - 1] - x[R + st.xf - 1]) < 0.01, "fade runs from loop to live");
  assert.equal(st.on, false); assert.equal(st.p, st.w);
});

test("engage takes effect on the very next block: the first wrap lands on the exact frame", () => {
  const st = new LoopStage(SR);
  const x = noise(SR, 3);
  const len = 4800, back = 4000, E = Q * 100;                      // the body ends 800 frames after the latch
  const { out } = run(st, x, { [E]: () => st.engage(len, back) });
  const S = E - back, wrap = S + len;
  assert.equal(wrap - E, 800);
  for (let j = 0; j < len - st.xf; j++) assert.equal(out[wrap + j], x[S + j], `body frame ${j}`);
  assert.notEqual(out[wrap], x[wrap]);
});

test("a latch inside the tail crossfade loops the next cell: live until that cell starts", () => {
  const st = new LoopStage(SR);
  const x = noise(SR, 5);
  const len = 4800, back = len - 3, E = Q * 100;
  let pending = -1;
  const { out } = run(st, x, { [E]: () => { pending = st.engage(len, back); } });
  assert.equal(pending, 3);
  const S = E + 3;
  for (let o = 0; o < S + len - st.xf; o++) assert.equal(out[o], x[o]);
  for (let j = 0; j < len - st.xf; j++) assert.equal(out[S + len + j], x[S + j]);
});

test("re-latching while wrapping fades to live and starts the new body there", () => {
  const st = new LoopStage(SR);
  const x = noise(SR * 2, 11);
  const len1 = 9600, len2 = 2400, E1 = Q * 100, E2 = Q * 400;
  const { out } = run(st, x, { [E1]: () => st.engage(len1, 100), [E2]: () => st.engage(len2, 0) });
  assert.notEqual(out[E2 - 1], x[E2 - 1], "first loop was wrapping");
  for (let o = E2 + st.xf; o < E2 + len2 - st.xf; o++) assert.equal(out[o], x[o], `live after the re-latch at ${o}`);
  for (let j = 0; j < len2 - st.xf; j++) assert.equal(out[E2 + len2 + j], x[E2 + j], `new body ${j}`);
  assert.ok(maxStep(out, E2 - 2, E2 + st.xf + 2) <= 1.0);
});

test("fresh attach: a grid line older than the capture anchors on the oldest frame held, never silence", () => {
  const st = new LoopStage(SR);
  const x = noise(Q * 40, 13);
  const { out } = run(st, x, { [Q * 10]: () => st.engage(2400, 5000) });     // asked for 5000 back, only 1280 exist
  assert.equal(st.start, 0);
  for (let o = 2400; o < 2400 + 2400 - st.xf; o++) assert.equal(out[o], x[o - 2400]);
});

test("bypass delay line: a straight wire at 0, the input delayed by d frames otherwise", () => {
  const dl = new DelayLine(); const x = noise(Q * 10, 17);
  const o0 = new Float32Array(Q), o1 = new Float32Array(Q), out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i += Q) { dl.process(x.subarray(i, i + Q), x.subarray(i, i + Q), o0, o1, Q); out.set(o0, i); }
  for (let i = 0; i < x.length; i++) assert.equal(out[i], x[i]);
  dl.setDelay(100); const y = noise(Q * 10, 19); const out2 = new Float32Array(y.length);
  for (let i = 0; i < y.length; i += Q) { dl.process(y.subarray(i, i + Q), y.subarray(i, i + Q), o0, o1, Q); out2.set(o0, i); }
  for (let i = 100; i < y.length; i++) assert.equal(out2[i], y[i - 100]);
});

/* ---------- the shipped worklet bundle ---------- */
let Processor, ctx;
before(() => {
  const code = fs.readFileSync(new URL("../extension/worklet.js", import.meta.url), "utf8");
  let registered = null;
  ctx = vm.createContext({
    sampleRate: SR, currentTime: 0, currentFrame: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: () => {}, onmessage: null }; } },
    registerProcessor: (name, cls) => { registered = cls; },
    WebAssembly, console, Date, Math, Float32Array, Uint8Array, Uint32Array, Int32Array, ArrayBuffer, TextDecoder, TextEncoder, Promise, setTimeout, clearTimeout, performance, Error, Array, Object, Symbol, URL, globalThis: undefined,
  });
  ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(code, ctx, { filename: "worklet.js" });
  Processor = registered;
});
const wasmBytes = () => fs.readFileSync(new URL("../extension/rubberband.wasm", import.meta.url)).buffer.slice(0);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

test("worklet: a loop message engages in the bypass engine, repeats exactly, and releases to a straight wire", async () => {
  const msgs = [];
  const p = new Processor({ processorOptions: { rbWasm: wasmBytes(), engine: "bypass", signalsmith: false } });
  p.port.postMessage = (m) => msgs.push(m);
  const x = noise(SR * 2, 23), out = new Float32Array(x.length);
  const inL = new Float32Array(Q), inR = new Float32Array(Q), oL = new Float32Array(Q), oR = new Float32Array(Q);
  const len = 4800, back = 1000, E = Q * 100, R = Q * 500;
  for (let i = 0; i < x.length; i += Q) {
    if (i === E) p.onMessage({ type: "loop", on: true, lenFrames: len, backFrames: back });
    if (i === R) p.onMessage({ type: "loop", on: false });
    inL.set(x.subarray(i, i + Q)); inR.set(inL);
    p.process([[inL, inR]], [[oL, oR]]); out.set(oL, i);
  }
  assert.equal(p.engine, "bypass");
  for (let o = E + len; o < R; o++) assert.equal(out[o], out[o - len], `period at ${o}`);
  for (let o = R + 300; o < x.length; o++) assert.equal(out[o], x[o], `wire at ${o}`);
  const l = msgs.filter(m => m.type === "loop"); assert.equal(l.length, 2); assert.equal(l[0].on, true); assert.equal(l[0].len, len); assert.equal(l[1].on, false);
  for (let i = 0; i < 40 && !p.ready.r3; i++) await wait(50);    // let the async engine init finish before the context goes away
});

test("worklet: config.bypassDelay delays the bypass wire and is reported as its latency", async () => {
  const msgs = [];
  const p = new Processor({ processorOptions: { rbWasm: wasmBytes(), engine: "bypass", signalsmith: false } });
  p.port.postMessage = (m) => msgs.push(m);
  p.onMessage({ type: "config", bypassDelay: 256 });
  const x = noise(Q * 20, 29), out = new Float32Array(x.length);
  const inL = new Float32Array(Q), inR = new Float32Array(Q), oL = new Float32Array(Q), oR = new Float32Array(Q);
  for (let i = 0; i < x.length; i += Q) { inL.set(x.subarray(i, i + Q)); inR.set(inL); p.process([[inL, inR]], [[oL, oR]]); out.set(oL, i); }
  for (let i = 256; i < x.length; i++) assert.equal(out[i], x[i - 256]);
  p.onMessage({ type: "engine", engine: "bypass" });
  assert.ok(msgs.some(m => m.type === "warm" && m.engine === "bypass" && m.latency === 256));
  for (let i = 0; i < 40 && !p.ready.r3; i++) await wait(50);
});
