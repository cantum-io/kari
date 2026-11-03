// The recorder's tap undoes the page's volume slider (src/content/audio/takegain.ts): a take is at the engine's level
// whatever the listening level, the boost is floored, and muted is left alone (Chrome hands over silence then).
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeGain, VOLUME_FLOOR } from "../src/content/audio/takegain.ts";

test("1/slider: full is unity, a quarter is ×4, Jesse's 2026-11-03 take (0.0747) comes back ~13.4× (+22.5 dB)", () => {
  assert.equal(takeGain(1, false), 1);
  assert.equal(takeGain(0.25, false), 4);
  const g = takeGain(0.074716, false);
  assert.ok(Math.abs(20 * Math.log10(g) - 22.5) < 0.1, `${g} = ${(20 * Math.log10(g)).toFixed(2)} dB`);
});

test("floored at VOLUME_FLOOR (26 dB): a slider at zero or below the floor never becomes a bigger boost; above 1 clamps to unity", () => {
  assert.equal(VOLUME_FLOOR, 0.05);
  assert.equal(takeGain(0, false), 20);
  assert.equal(takeGain(0.01, false), 20);
  assert.equal(takeGain(0.05, false), 20);
  assert.equal(takeGain(1.5, false), 1);
  assert.equal(takeGain(NaN, false), 1);
});

test("muted: gain 1 (silence stays silence), whatever the slider says", () => {
  assert.equal(takeGain(0.1, true), 1);
  assert.equal(takeGain(1, true), 1);
});
