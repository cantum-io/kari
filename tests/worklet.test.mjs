// Runs the SHIPPED worklet bundle (extension/worklet.js) inside a simulated AudioWorkletGlobalScope
// and checks: engines come up, R3 is selected, pitch accuracy ≤2 cents, no underruns, bypass is a straight wire,
// and a thrown engine error never produces silence.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SR = 48000, Q = 128;
let Processor, ctx;

before(async () => {
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
  assert.ok(Processor, "worklet registered a processor");
});

const wasmBytes = () => fs.readFileSync(new URL("../extension/rubberband.wasm", import.meta.url)).buffer.slice(0);
const sine = (f, s) => Float32Array.from({ length: SR * s }, (_, i) => 0.5 * Math.sin(2 * Math.PI * f * i / SR));
function zcHz(x, a, b) { let first = -1, last = -1, n = 0; for (let i = a + 1; i < b; i++) { if (x[i - 1] < 0 && x[i] >= 0) { const t = i - 1 + (-x[i - 1]) / (x[i] - x[i - 1]); if (first < 0) first = t; last = t; n++; } } return (n - 1) * SR / (last - first); }
const cents = (f, r) => 1200 * Math.log2(f / r);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function makeProcessor(engine = "r3", withSS = true) {
  const msgs = [];
  const p = new Processor({ processorOptions: { rbWasm: wasmBytes(), engine, signalsmith: withSS } });
  p.port.postMessage = (m) => msgs.push(m);
  for (let i = 0; i < 100 && !(p.ready.r3 && (!withSS || p.ready.ss)); i++) await wait(50);
  return { p, msgs };
}
function run(p, input, semis) {
  p.onMessage({ type: "ratio", ratio: Math.pow(2, semis / 12) });
  const out = new Float32Array(input.length);
  const inL = new Float32Array(Q), inR = new Float32Array(Q), oL = new Float32Array(Q), oR = new Float32Array(Q);
  for (let i = 0; i < input.length; i += Q) {
    inL.set(input.subarray(i, i + Q)); inR.set(inL);
    p.process([[inL, inR]], [[oL, oR]]);
    out.set(oL.subarray(0, Math.min(Q, input.length - i)), i);
    ctx.currentTime += Q / SR;
  }
  return out;
}

test("both engines initialise and R3 is selected", async () => {
  const { p, msgs } = await makeProcessor();
  assert.equal(p.ready.r3, true); assert.equal(p.ready.ss, true); assert.equal(p.engine, "r3");
  const ready = msgs.filter(m => m.type === "ready").pop();
  assert.ok(ready.latency.r3 > 0 && ready.latency.r3 < SR * 0.05, `R3 latency ${ready.latency.r3} frames should be < 50 ms`);
});

test("R3 through the shipped worklet: ≤2 cents at ±1/±5/±12 st, no underruns after warm-up", async () => {
  const { p } = await makeProcessor();
  for (const st of [1, -1, 5, -5, 12, -12]) {
    p.onMessage({ type: "reset" });
    const out = run(p, sine(440, 4), st);
    const err = cents(zcHz(out, SR * 2, SR * 4), 440 * Math.pow(2, st / 12));
    assert.ok(Math.abs(err) <= 2, `${st} st: ${err.toFixed(2)} cents`);
  }
  p.onMessage({ type: "reset" });
  run(p, sine(440, 1), 3);
  const before = p.underruns; run(p, sine(440, 5), 3);
  assert.equal(p.underruns - before, 0, "no underruns during steady processing");
});

test("R3 is accurate on bass (55 Hz) — the Signalsmith weakness", async () => {
  const { p } = await makeProcessor();
  const out = run(p, sine(55, 6), 3);
  const err = cents(zcHz(out, SR * 3, SR * 6), 55 * Math.pow(2, 3 / 12));
  assert.ok(Math.abs(err) <= 2.5, `55 Hz +3 st: ${err.toFixed(2)} cents`);
});

test("bypass engine is a straight wire", async () => {
  const { p } = await makeProcessor();
  p.onMessage({ type: "engine", engine: "bypass" });
  const x = sine(440, 0.5); const out = run(p, x, 7);
  let maxDiff = 0; for (let i = 0; i < x.length; i++) maxDiff = Math.max(maxDiff, Math.abs(x[i] - out[i]));
  assert.equal(maxDiff, 0);
});

test("Signalsmith fallback works when selected", async () => {
  const { p } = await makeProcessor("ss");
  assert.equal(p.engine, "ss");
  const out = run(p, sine(440, 4), 5);
  const err = cents(zcHz(out, SR * 2, SR * 4), 440 * Math.pow(2, 5 / 12));
  assert.ok(Math.abs(err) <= 8, `ss +5 st: ${err.toFixed(2)} cents (fallback tier tolerance)`);
});

test("an engine that throws never produces silence", async () => {
  const { p, msgs } = await makeProcessor();
  p.processR3 = () => { throw new Error("boom"); };
  const x = sine(440, 0.2); const out = run(p, x, 3);
  let maxDiff = 0; for (let i = 0; i < x.length; i++) maxDiff = Math.max(maxDiff, Math.abs(x[i] - out[i]));
  assert.equal(maxDiff, 0, "falls back to a straight wire");
  assert.equal(p.engine, "bypass");
  assert.ok(msgs.some(m => m.type === "error" && m.where === "process"));
});
