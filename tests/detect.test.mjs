// In-house tempo detection on synthetic audio: click tracks at 90, 128 and 174 bpm (bpm within ±1, beat phase within
// 20 ms, the accented "1" found), a swung pattern, pink noise (must stay silent), silence, and the detector's gates
// (6 s of real playback, pauses skipped, a loop freezes the grid, a tap mutes it, a seek starts over).
import { test } from "node:test";
import assert from "node:assert/strict";
import { OnsetFeature, TempoTracker, AutoBeatDetector, MIN_CONFIDENCE, ONSET_HZ, ONSET_BATCH, WINDOW_SEC, tempoPrior } from "../src/content/beat/detect.ts";

const SR = 48000, Q = 128;
function xorshift(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
/** A hit: a 1.5 + 4.5 kHz click (6 ms) or a 60 Hz kick thump (40 ms), decaying. */
function addHit(x, at, amp, kind) {
  const i0 = Math.round(at * SR), len = Math.round((kind === "kick" ? 0.04 : 0.006) * SR);
  for (let i = 0; i < len && i0 + i < x.length; i++) {
    const t = i / SR, env = Math.exp(-t / (kind === "kick" ? 0.012 : 0.0015));
    x[i0 + i] += amp * env * (kind === "kick" ? Math.sin(2 * Math.PI * 60 * t) : Math.sin(2 * Math.PI * 1500 * t) + 0.5 * Math.sin(2 * Math.PI * 4500 * t));
  }
}
/** Pink noise (Paul Kellet's three-pole filter on white), peak ≈ 0.5. */
function pink(n, seed, gain = 0.08) { const r = xorshift(seed); const x = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < n; i++) { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913; x[i] = (b0 + b1 + b2 + w * 0.1848) * gain; } return x; }
/** A click track over a quiet pink bed: kick on the 1, click on 2–4, from `off` seconds in. */
function clickTrack(bpm, seconds, seed, off) {
  const x = pink(SR * seconds, seed, 0.025), beat = 60 / bpm;
  for (let b = 0; off + b * beat < seconds; b++) addHit(x, off + b * beat, b % 4 === 0 ? 0.9 : 0.6, b % 4 === 0 ? "kick" : "click");
  return x;
}
/** Front end → tracker, offline, as the worklet and the detector would see it at 1×. */
function analyze(x) {
  const of = new OnsetFeature(SR), tr = new TempoTracker(1 / ONSET_HZ);
  const L = new Float32Array(Q), R = new Float32Array(Q);
  for (let i = 0; i < x.length; i += Q) { L.set(x.subarray(i, i + Q)); R.set(L); const b = of.push([L, R], Q, i); if (b) for (let k = 0; k < b.odf.length; k++) tr.push(b.odf[k], b.low[k], b.t + k * b.hop); }
  return tr.analyze();
}
/** Signed distance from `t` to the nearest point of the lattice offset + k·period. */
const lattice = (t, period, offset) => { const d = ((t - offset) % period + period) % period; return d < period / 2 ? d : d - period; };

test("onset feature: 100 frames/s, 10-frame batches stamped with the context frame, silence gives 0", () => {
  const of = new OnsetFeature(SR);
  assert.equal(of.hop, 480); assert.equal(of.hopSec, 0.01); assert.equal(new OnsetFeature(44100).hop, 441);
  const L = new Float32Array(Q); let batches = [];
  for (let i = 0; i < 480 * ONSET_BATCH * 3; i += Q) { const b = of.push([L], Q, 1000 + i); if (b) batches.push(b); }
  assert.equal(batches.length, 3);
  assert.equal(batches[0].t, 1000 / SR); assert.equal(batches[1].t, (1000 + 4800) / SR);
  assert.equal(batches[0].odf.length, ONSET_BATCH); assert.ok(batches[0].odf.every(v => v === 0)); assert.equal(batches[0].rms, 0);
  // one click lands in exactly one frame as a positive onset, nothing before it
  const x = new Float32Array(SR); addHit(x, 0.5, 0.8, "click"); const of2 = new OnsetFeature(SR); const got = [];
  for (let i = 0; i < x.length; i += Q) { L.set(x.subarray(i, i + Q)); const b = of2.push([L], Q, i); if (b) got.push(...b.odf); }
  const peak = got.indexOf(Math.max(...got));
  assert.equal(peak, 50, "the click at 0.5 s is frame 50"); assert.ok(got.slice(0, 50).every(v => v === 0));
});

for (const bpm of [90, 128, 174]) {
  test(`click track at ${bpm} bpm: bpm within ±1, beat within 20 ms, the kick on the 1 found`, () => {
    for (const seed of [1, 2, 3]) {
      const off = 0.05 + xorshift(seed)() * 0.5, beat = 60 / bpm;
      const e = analyze(clickTrack(bpm, 8, seed + 10, off));
      assert.ok(e, "an estimate");
      assert.ok(Math.abs(e.bpm - bpm) <= 1, `seed ${seed}: ${e.bpm.toFixed(2)} vs ${bpm}`);
      assert.ok(Math.abs(lattice(e.beat, beat, off)) < 0.020, `seed ${seed}: beat ${(lattice(e.beat, beat, off) * 1000).toFixed(1)} ms off`);
      assert.ok(Math.abs(lattice(e.phase, 4 * beat, off)) < 0.020, `seed ${seed}: the "1" ${(lattice(e.phase, 4 * beat, off) * 1000).toFixed(1)} ms off a true downbeat`);
      assert.ok(e.confidence >= MIN_CONFIDENCE, `seed ${seed}: confidence ${e.confidence.toFixed(2)}`);
    }
  });
}

test("swung pattern (kick on the beat, hat at 2/3 of it) at 100 bpm: the beat, not the hat lattice", () => {
  const x = pink(SR * 8, 77, 0.025), beat = 0.6, off = 0.21;
  for (let b = 0; off + b * beat < 8; b++) { addHit(x, off + b * beat, 0.9, "kick"); addHit(x, off + b * beat + beat * 2 / 3, 0.5, "click"); }
  const e = analyze(x);
  assert.ok(Math.abs(e.bpm - 100) <= 1, `${e.bpm.toFixed(2)}`);
  assert.ok(Math.abs(lattice(e.beat, beat, off)) < 0.020, `beat ${(lattice(e.beat, beat, off) * 1000).toFixed(1)} ms off`);
  assert.ok(e.confidence >= MIN_CONFIDENCE);
});

test("a 50 Hz tremolo (energy up and down every frame) is not an onset train: the rise is read over 30 ms, so the flicker sums to nothing", () => {
  // 2026-10-15, V3bLpIXaFp8: a dense mix whose bands flicker frame to frame posted ~12 onsets a second and never
  // committed. Pink noise amplitude-modulated at 50 Hz is that flicker in its purest form: one period is two hops.
  const meanOdf = (x) => { const of = new OnsetFeature(SR), L = new Float32Array(Q), odf = []; for (let i = 0; i < x.length; i += Q) { L.set(x.subarray(i, i + Q)); const b = of.push([L], Q, i); if (b) odf.push(...b.odf); } const tail = odf.slice(100); return tail.reduce((a, v) => a + v, 0) / tail.length; };
  const plain = pink(SR * 8, 31, 0.08), x = plain.slice(); for (let i = 0; i < x.length; i++) x[i] *= 1 + 0.9 * Math.sin(2 * Math.PI * 50 * i / SR);
  const m0 = meanOdf(plain), m1 = meanOdf(x);
  assert.ok(m1 < 2 * m0, `mean onset strength ${m1.toFixed(2)} under the tremolo vs ${m0.toFixed(2)} without it (the previous-frame difference read the tremolo at 5.5× the plain noise)`);
  const e = analyze(x);
  assert.ok(!e || e.confidence < MIN_CONFIDENCE, `confidence ${e?.confidence.toFixed(2)} at ${e?.bpm.toFixed(1)} bpm`);
});

test("pink noise: never confident; silence: nothing at all", () => {
  for (const seed of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const e = analyze(pink(SR * 8, seed));
    assert.ok(!e || e.confidence < MIN_CONFIDENCE, `seed ${seed}: confidence ${e?.confidence.toFixed(2)} at ${e?.bpm.toFixed(1)} bpm`);
  }
  assert.equal(analyze(new Float32Array(SR * 8)), null);
});

test("the prior: flat over 80–160, never below 0.4 across 60–200", () => {
  assert.equal(tempoPrior(80), 1); assert.equal(tempoPrior(120), 1); assert.equal(tempoPrior(160), 1);
  assert.ok(tempoPrior(70) < 1 && tempoPrior(70) > tempoPrior(60) && tempoPrior(60) >= 0.4);
  assert.ok(tempoPrior(174) < 1 && tempoPrior(174) > tempoPrior(200) && tempoPrior(200) >= 0.4);
});

/* ---------- the detector's gates, with batches fed as the worklet would post them ---------- */
function batchesOf(x) { const of = new OnsetFeature(SR), out = []; const L = new Float32Array(Q); for (let i = 0; i < x.length; i += Q) { L.set(x.subarray(i, i + Q)); const b = of.push([L], Q, i); if (b) out.push(b); } return out; }
/** A fake element clock: media = ctx − pipeline, playing unless paused; `lag` = main-thread delay at receipt. */
function clockFor(state) { return () => ({ media: state.media(), ctx: state.ctx, rate: state.rate, playing: state.playing }); }

test("detector: publishes after 6 s of real playback, refines every 2 s, maps context time to media time through the pipeline offset", () => {
  const x = clickTrack(128, 12, 3, 0.3), batches = batchesOf(x);
  const pipeline = 0.045, st = { ctx: 0, rate: 1, playing: true, media() { return this.ctx - pipeline; } };
  const d = new AutoBeatDetector(clockFor(st)); const grids = [], states = [];
  d.onGrid(g => grids.push(g)); d.onState(s => states.push(s));
  d.start({ sampleRate: SR }, { connect() {} });
  assert.equal(d.state, "learning");
  for (const b of batches) {
    st.ctx = b.t + ONSET_BATCH * b.hop + 0.030;   // the batch arrives 30 ms after its last frame (port + main thread); both clocks moved on
    d.feed(b);
    if (b.t + ONSET_BATCH * b.hop < WINDOW_SEC) assert.equal(grids.length, 0, "nothing before 6 s of playback");
  }
  assert.ok(grids.length >= 3, `published and refined (${grids.length} grids)`);
  assert.equal(d.state, "found");
  const g = grids[grids.length - 1];
  assert.equal(g.source, "auto"); assert.ok(Math.abs(g.bpm - 128) <= 1, `${g.bpm}`);
  // the grid's phase is in media time: the clicks sit at 0.3 + 4k·beat in context time, i.e. `pipeline` earlier in media time
  assert.ok(Math.abs(lattice(g.phase, 4 * 60 / 128, 0.3 - pipeline)) < 0.020, `phase ${(lattice(g.phase, 4 * 60 / 128, 0.3 - pipeline) * 1000).toFixed(1)} ms off in media time`);
  assert.ok(Math.abs(lattice(g.phase, 4 * 60 / 128, 0.3)) > 0.030, "and not in context time");
});

test("detector: paused and silent batches do not count, a loop freezes publication, a tap mutes it, a seek starts over", () => {
  const x = clickTrack(128, 20, 4, 0.1), batches = batchesOf(x);
  const st = { ctx: 0, rate: 1, playing: true, media() { return this.ctx; } };
  const d = new AutoBeatDetector(clockFor(st)); const grids = [];
  d.onGrid(g => grids.push(g)); d.start({ sampleRate: SR }, { connect() {} });
  const feed = (b) => { st.ctx = b.t + ONSET_BATCH * b.hop + 0.02; d.feed(b); };
  // 4 s playing, 3 s "paused" (the batches still arrive: the context runs), then on again
  let i = 0;
  for (; i < 40; i++) feed(batches[i]);
  st.playing = false; for (; i < 70; i++) feed(batches[i]);
  assert.equal(grids.length, 0, "4 s of playback is not 6");
  st.playing = true; for (; i < 95; i++) feed(batches[i]);
  assert.ok(grids.length >= 1, "6.5 s of playback, 3 s of pause skipped");
  // silence counts for 2 s (a rest), then stops counting (a silent stretch is not playback)
  const n0 = grids.length, played0 = d.debug.played; const silent = { ...batches[0], rms: 0, t: batches[i].t }; for (let k = 0; k < 40; k++) feed(silent);
  assert.equal(d.debug.played - played0, 20 * ONSET_BATCH, "20 silent batches counted, 20 skipped"); assert.equal(d.debug.skipped.silent, 20);
  // a latched loop holds the next refinement until release (fed long enough for the silent stretch to leave the window)
  const nf = grids.length;
  d.freeze(true); for (; i < 170; i++) feed(batches[i]);
  assert.equal(grids.length, nf, "frozen under the loop");
  d.freeze(false); assert.equal(grids.length, nf + 1, "the held grid lands on release");
  // the controller re-asserts "not muted" on every auto grid it takes: that must not touch the window
  d.mute(false); assert.equal(d.state, "found"); assert.ok(d.last, "the window survived");
  // a tap owns the grid: nothing more comes out
  const nm = grids.length; d.mute(true); assert.equal(d.listening, false); for (; i < 195; i++) feed(batches[i]); assert.equal(grids.length, nm);
  d.mute(false); assert.equal(d.state, "learning"); assert.equal(d.listening, true);
  // a seek empties the window: no estimate until another 6 s played
  d.reset(); const n1 = grids.length;
  for (let k = 0; k < 50; k++) feed(batches[k]); assert.equal(grids.length, n1);
  for (let k = 50; k < 80; k++) feed(batches[k]); assert.ok(grids.length > n1);
  d.stop(); assert.equal(d.state, "idle");
});

test("detector: on noise it reports nothing and settles on 'none' after two windows", () => {
  const batches = batchesOf(pink(SR * 14, 21));
  const st = { ctx: 0, rate: 1, playing: true, media() { return this.ctx; } };
  const d = new AutoBeatDetector(clockFor(st)); const grids = [];
  d.onGrid(g => grids.push(g)); d.start({ sampleRate: SR }, { connect() {} });
  for (const b of batches) { st.ctx = b.t + 0.12; d.feed(b); }
  assert.equal(grids.length, 0); assert.equal(d.state, "none");
});
