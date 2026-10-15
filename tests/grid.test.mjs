// Beat grid, loop plan, slip position and tap tempo. `node --test tests/`
import { test } from "node:test";
import assert from "node:assert/strict";
import { gridLineAtOrBefore, loopFrames, loopPlan, slipPosition, withBpm, nudgeBpm, clampBpm, fmtBpm, BPM_MIN, BPM_MAX } from "../src/content/beat/grid.ts";
import { TapTempo, bpmFromTaps, median, TAP_WINDOW } from "../src/content/beat/tap.ts";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const g128 = { bpm: 128, phase: 10.0, source: "tap" };   // a beat falls on media time 10.000 s

test("grid line at or before a time, on the beat and on the ¼-beat grid", () => {
  const beat = 60 / 128;                                   // 0.46875 s
  assert.ok(close(gridLineAtOrBefore(g128, 10.0, 1), 10.0), "on the line itself");
  assert.ok(close(gridLineAtOrBefore(g128, 10.4, 1), 10.0));
  assert.ok(close(gridLineAtOrBefore(g128, 10.5, 1), 10.0 + beat));
  assert.ok(close(gridLineAtOrBefore(g128, 9.9, 1), 10.0 - beat), "works before the phase too");
  assert.ok(close(gridLineAtOrBefore(g128, 10.3, 0.25), 10.0 + 2 * beat / 4));   // 10.234 ≤ 10.3 < 10.351
  assert.ok(close(gridLineAtOrBefore(g128, 10.3, 0.5), 10.0 + beat / 2));
  assert.ok(close(gridLineAtOrBefore(g128, 10.0 + beat / 4, 0.25), 10.0 + beat / 4), "exactly on a ¼ line stays there");
});

test("loop length in frames follows bpm, cell size, sample rate and playback rate", () => {
  assert.equal(loopFrames(g128, 0.25, 1, 48000), 5625);          // 117.19 ms
  assert.equal(loopFrames(g128, 1, 1, 48000), 22500);
  assert.equal(loopFrames(g128, 1, 1, 44100), 20672);
  assert.equal(loopFrames(g128, 1, 2, 48000), 11250, "at 2× the beat passes in half the real time");
  assert.equal(loopFrames({ bpm: 60, phase: 0, source: "manual" }, 1, 1, 48000), 48000, "1 beat at 60 bpm = 1 s");
  assert.equal(loopFrames({ bpm: 174, phase: 0, source: "manual" }, 0.25, 1, 48000), 4138);   // 86 ms
});

test("loop plan: back frames count from the grid line to now, in real-time frames", () => {
  const beat = 60 / 128;
  let p = loopPlan(g128, 10.0 + beat / 4 + 0.050, 1, 48000, 0.25);   // 50 ms past the second ¼ line
  assert.ok(close(p.startMedia, 10.0 + beat / 4)); assert.equal(p.lenFrames, 5625); assert.equal(p.backFrames, 2400);
  p = loopPlan(g128, 10.0 + beat / 4 + 0.050, 1.25, 48000, 0.25);     // at 1.25× those 50 media-ms took 40 real ms
  assert.equal(p.lenFrames, 4500); assert.equal(p.backFrames, 1920);
  p = loopPlan(g128, 10.0 + beat - 1e-6, 1, 48000, 1);                 // a hair before the next line: nearly a full cell back
  assert.equal(p.startMedia, 10.0); assert.ok(p.backFrames <= p.lenFrames && p.backFrames >= p.lenFrames - 1);
  p = loopPlan(g128, 10.0, 1, 48000, 1); assert.equal(p.backFrames, 0, "on the line: nothing back");
});

test("slip: the track underneath keeps moving at the playback rate", () => {
  assert.ok(close(slipPosition(12.0, 3.0, 1), 15.0));
  assert.ok(close(slipPosition(12.0, 3.0, 0.5), 13.5));
  assert.ok(close(slipPosition(12.0, 0.46875 * 4, 1.25), 12.0 + 2.34375), "four beats of real time at 1.25×");
});

test("bpm edits: clamp, keep phase, nudge by tenths", () => {
  const g = withBpm(null, 120, 33.3); assert.equal(g.bpm, 120); assert.equal(g.phase, 33.3); assert.equal(g.source, "manual");
  const h = withBpm(g, 500, 99); assert.equal(h.bpm, BPM_MAX); assert.equal(h.phase, 33.3, "an existing phase survives a typed bpm");
  assert.equal(withBpm(null, 1, 0).bpm, BPM_MIN);
  assert.equal(nudgeBpm(g, 1).bpm, 121); assert.equal(nudgeBpm(g, -0.1).bpm, 119.9); assert.equal(nudgeBpm({ ...g, bpm: 299.95 }, 1).bpm, 300);
  assert.equal(clampBpm(80.123), 80.123);
  assert.equal(fmtBpm(128), "128"); assert.equal(fmtBpm(127.96), "128"); assert.equal(fmtBpm(93.25), "93.3");
});

test("tap tempo: median of the last intervals, phase from the last tap", () => {
  const t = new TapTempo();
  assert.equal(t.tap(10.0), null);
  assert.ok(close(t.tap(10.5), 120));
  assert.ok(close(t.tap(11.0), 120));
  assert.ok(close(t.tap(11.6), 120), "one late tap moves the median nothing (intervals .5 .5 .6)");
  assert.ok(close(t.tap(12.0), 60 / 0.5));
  assert.equal(median([3, 1, 2]), 2); assert.equal(median([4, 1, 3, 2]), 2.5);
});

test("tap tempo: a bounce is ignored, a long gap or a seek backwards starts over, the window is bounded", () => {
  const t = new TapTempo();
  t.tap(0); t.tap(0.5); assert.equal(t.count, 2);
  assert.ok(close(t.tap(0.55), 120), "0.05 s after the last tap: a bounce, estimate unchanged"); assert.equal(t.count, 2);
  assert.equal(t.tap(5.0), null, "a 4.5 s gap begins a new sequence"); assert.equal(t.count, 1);
  assert.equal(t.tap(2.0), null, "a seek backwards begins a new sequence"); assert.equal(t.count, 1);
  for (let i = 1; i <= 20; i++) t.tap(2.0 + i * 0.4);
  assert.equal(t.count, TAP_WINDOW + 1); assert.ok(close(bpmFromTaps(t.taps), 150));
});

test("tap tempo in media time is independent of playback speed", () => {
  // the listener taps every real 0.5 s while the element runs at 1.25×: media time advances 0.625 s per tap
  const t = new TapTempo(); let bpm = null;
  for (let i = 0; i < 6; i++) bpm = t.tap(20 + i * 0.625);
  assert.ok(close(bpm, 96), `song bpm 96, not the 120 heard at 1.25× (got ${bpm})`);
});
