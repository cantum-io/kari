// The tempo readout's states (src/content/ui/tempo-readout.ts) and the phase the controller derives for it
// (detect.ts tempoPhase). Written 2026-10-15 after the dock said "tap" before anything had played: "tap" may only mean
// the detector listened and found nothing; before it runs the readout says what it waits for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tempoReadout, TEMPO_COPY } from "../src/content/ui/tempo-readout.ts";
import { tempoPhase, AutoBeatDetector, ONSET_BATCH } from "../src/content/beat/detect.ts";

const st = (patch) => ({ bpm: null, tempo: "idle", ...patch });

test("readout: every phase has its own words, and 'tap' is only the verdict after listening", () => {
  assert.deepEqual(tempoReadout(st({}), true), { state: "idle", text: "play to learn" });
  assert.deepEqual(tempoReadout(st({ tempo: "gesture" }), true), { state: "gesture", text: "click to learn" });
  assert.deepEqual(tempoReadout(st({ tempo: "learning" }), true), { state: "learning", text: "learning…" });
  assert.deepEqual(tempoReadout(st({ tempo: "none" }), true), { state: "none", text: "tap" });
  assert.deepEqual(tempoReadout(st({ tempo: "off" }), true), { state: "off", text: "" });
  assert.deepEqual(tempoReadout(st({ bpm: 128, tempo: "found" }), true), { state: "found", text: "128 bpm" });
  assert.deepEqual(tempoReadout(st({ bpm: 69.95, tempo: "found" }), true), { state: "found", text: "70 bpm" });
  // a bpm wins whatever the phase says (a tapped grid mutes the detector: phase "off", readout still the bpm)
  assert.deepEqual(tempoReadout(st({ bpm: 119, tempo: "off" }), true), { state: "found", text: "119 bpm" });
  assert.deepEqual(tempoReadout(st({ bpm: 119, tempo: "learning" }), true), { state: "found", text: "119 bpm" });
  // before any status, and on a host without a loop path, the readout is empty (CSS hides an empty readout)
  assert.deepEqual(tempoReadout(null, true), { state: "idle", text: "play to learn" });
  assert.deepEqual(tempoReadout(undefined, true), { state: "idle", text: "play to learn" });
  assert.deepEqual(tempoReadout(st({ tempo: "learning" }), false), { state: "off", text: "" });
  // a "found" phase without a bpm cannot happen; it must never read as "tap"
  assert.deepEqual(tempoReadout(st({ tempo: "found" }), true), { state: "idle", text: "play to learn" });
  const texts = Object.values(TEMPO_COPY);
  assert.equal(new Set(texts).size, texts.length, "no two phases share a text");
  assert.equal(texts.filter(t => t === "tap").length, 1);
});

test("phase: the detector's state, or why it is not running", () => {
  const ctx = (p) => ({ muted: false, blocked: false, gesture: false, heard: true, ...p });
  assert.equal(tempoPhase("idle", ctx({})), "idle", "not attached yet: play to learn");
  assert.equal(tempoPhase("idle", ctx({ gesture: true })), "gesture", "playing, waiting for the page's first click");
  assert.equal(tempoPhase("learning", ctx({ heard: false })), "idle", "started but nothing played through it yet: still play to learn");
  assert.equal(tempoPhase("learning", ctx({})), "learning", "heard a frame: learning…");
  assert.equal(tempoPhase("none", ctx({})), "none", "listened, nothing: tap");
  assert.equal(tempoPhase("found", ctx({})), "found");
  assert.equal(tempoPhase("found", ctx({ gesture: true })), "found", "a found grid is never hidden behind the gesture wait");
  assert.equal(tempoPhase("learning", ctx({ muted: true })), "off", "a tap or a typed bpm owns the grid");
  assert.equal(tempoPhase("learning", ctx({ blocked: true })), "off", "protected audio: Kari never attaches");
  assert.equal(tempoPhase("idle", ctx({ blocked: true, gesture: true })), "off");
});

test("detector: the state callback fires again on the first heard frame, so the readout flips idle → learning only once audio counts", () => {
  let playing = false, media = 0;
  const d = new AutoBeatDetector(() => ({ media, ctx: media, rate: 1, playing }));
  const seen = [];
  d.onState((s) => seen.push([s, d.heard]));
  d.start();
  assert.deepEqual(seen, [["learning", 0]], "start: learning, nothing heard");
  assert.equal(tempoPhase(d.state, { muted: false, blocked: false, gesture: false, heard: d.heard > 0 }), "idle");
  const batch = (rms) => ({ type: "onset", t: media, hop: 0.01, odf: new Float32Array(ONSET_BATCH).fill(0.5), low: new Float32Array(ONSET_BATCH), rms });
  d.feed(batch(0.1));                      // paused: skipped, not heard
  assert.equal(d.heard, 0); assert.equal(seen.length, 1);
  playing = true; d.feed(batch(0.1)); media += 0.1;
  assert.equal(d.heard, ONSET_BATCH); assert.deepEqual(seen[1], ["learning", ONSET_BATCH], "first heard frame re-announces learning");
  assert.equal(tempoPhase(d.state, { muted: false, blocked: false, gesture: false, heard: d.heard > 0 }), "learning");
  d.feed(batch(0.1)); assert.equal(seen.length, 2, "only the first heard batch re-announces");
  d.reset(); assert.equal(d.heard, 0, "a seek starts over: play to learn again until a frame counts");
  assert.equal(d.isMuted, false); d.mute(true); assert.equal(d.isMuted, true);
});
