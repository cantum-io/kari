// One-pass rule and readout math. `node --test tests/`
import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, keyName, stepTempo, stepSt, setRange, isNeutral, DEFAULT_PARAMS, fmtSpeed, fmtSigned } from "../src/shared/math.ts";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("neutral params attach nothing", () => {
  const p = plan(DEFAULT_PARAMS);
  assert.equal(p.rate, 1); assert.equal(p.engineRatio, 1); assert.equal(p.attached, false); assert.equal(p.engineActive, false);
});

test("key only: engine carries the whole shift, video untouched", () => {
  const p = plan({ ...DEFAULT_PARAMS, st: 3 });
  assert.equal(p.rate, 1);
  assert.ok(close(p.engineRatio, Math.pow(2, 3 / 12)));
  assert.equal(p.attached, true);
});

test("tempo with key lock: video resamples, engine undoes the pitch change", () => {
  const p = plan({ ...DEFAULT_PARAMS, tempo: 4 });
  assert.ok(close(p.rate, 1.04));
  assert.ok(close(p.engineRatio, 1 / 1.04));
  // net pitch = resampler (×1.04) × engine (÷1.04) = 1.0
  assert.ok(close(p.rate * p.engineRatio, 1));
});

test("tempo with vinyl (key lock off): resampler only, nothing attached", () => {
  const p = plan({ ...DEFAULT_PARAMS, tempo: -12, keyLock: false });
  assert.ok(close(p.rate, 0.88)); assert.equal(p.engineRatio, 1); assert.equal(p.attached, false);
});

test("key + tempo: one engine pass with 2^(k/12) ÷ r", () => {
  const p = plan({ ...DEFAULT_PARAMS, st: -5, tempo: 10 });
  assert.ok(close(p.engineRatio, Math.pow(2, -5 / 12) / 1.1));
  assert.ok(close(p.rate * p.engineRatio, Math.pow(2, -5 / 12))); // net pitch is exactly the key change
});

test("cents feed the engine ratio", () => {
  const p = plan({ ...DEFAULT_PARAMS, st: 0, cents: 50 });
  assert.ok(close(p.engineRatio, Math.pow(2, 0.5 / 12)));
});

test("key names wrap correctly from A♭m", () => {
  assert.equal(keyName(8, 0), "A♭m"); assert.equal(keyName(8, 3), "Bm"); assert.equal(keyName(8, 4), "Cm"); assert.equal(keyName(8, -12), "A♭m"); assert.equal(keyName(8, 12), "A♭m"); assert.equal(keyName(8, -1), "Gm");
});

test("steps clamp to limits and range", () => {
  let p = { ...DEFAULT_PARAMS, range: 8 };
  for (let i = 0; i < 20; i++) p = stepTempo(p, 1);
  assert.equal(p.tempo, 8);
  p = setRange(p, 50); assert.equal(p.tempo, 8);
  p = { ...p, tempo: 40 }; p = setRange(p, 16); assert.equal(p.tempo, 16);
  let q = DEFAULT_PARAMS; for (let i = 0; i < 30; i++) q = stepSt(q, -1); assert.equal(q.st, -12);
  assert.equal(isNeutral(DEFAULT_PARAMS), true); assert.equal(isNeutral({ ...DEFAULT_PARAMS, tempo: 0.5 }), false);
});

test("readouts", () => {
  assert.equal(fmtSpeed(0), "1.00×"); assert.equal(fmtSpeed(4), "1.04×"); assert.equal(fmtSpeed(-50), "0.50×");
  assert.equal(fmtSigned(3), "+3"); assert.equal(fmtSigned(-3), "−3"); assert.equal(fmtSigned(0), "0");
});
