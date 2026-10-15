// MIDI: the default pads, a saved map from an older build (¼ and release gone), learn mode, note-on only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Midi, MIDI_ACTIONS, DEFAULT_MIDI_MAP, validMidiMap } from "../src/content/midi.ts";

test("default pads C1–E1: ½, 1, 1 bar, 2 bars, tap — no ¼, no release", () => {
  assert.deepEqual(MIDI_ACTIONS, ["loop-h", "loop-1", "loop-bar", "loop-2bar", "tap"]);
  assert.deepEqual(DEFAULT_MIDI_MAP, { "loop-h": 36, "loop-1": 37, "loop-bar": 38, "loop-2bar": 39, tap: 40 });
});

test("a saved map stays valid: unknown actions dropped, bad notes dropped, the rest filled from the defaults", () => {
  assert.deepEqual(validMidiMap({ "loop-q": 36, "loop-h": 50, "loop-1": 51, release: 39, tap: 52 }), { "loop-h": 50, "loop-1": 51, "loop-bar": 38, "loop-2bar": 39, tap: 52 });
  assert.deepEqual(validMidiMap({ "loop-bar": 200, "loop-2bar": -1, tap: "40", "loop-h": 1.5 }), DEFAULT_MIDI_MAP);
  assert.deepEqual(validMidiMap(undefined), DEFAULT_MIDI_MAP); assert.deepEqual(validMidiMap(null), DEFAULT_MIDI_MAP); assert.deepEqual(validMidiMap("x"), DEFAULT_MIDI_MAP);
});

test("note-on fires the mapped action, learn binds the next note, note-off and velocity 0 do nothing", () => {
  const actions = [], maps = [], states = [];
  const m = new Midi({ "loop-q": 36, release: 39 }, a => actions.push(a), mp => maps.push(mp), s => states.push(s));
  assert.deepEqual(m.mapping, DEFAULT_MIDI_MAP, "the old ¼ and release notes did not survive");
  const msg = (status, note, vel) => m.onMessage({ data: new Uint8Array([status, note, vel]) });
  msg(0x90, 36, 100); msg(0x90, 39, 100); msg(0x80, 36, 0); msg(0x90, 37, 0); msg(0x99, 40, 1);
  assert.deepEqual(actions, ["loop-h", "loop-2bar", "tap"], "any channel; note-off and velocity 0 are not actions");
  m.learn("loop-bar"); msg(0x90, 60, 90);
  assert.deepEqual(maps, [{ ...DEFAULT_MIDI_MAP, "loop-bar": 60 }]); assert.equal(m.state.learning, null);
  msg(0x90, 60, 90); assert.equal(actions[actions.length - 1], "loop-bar");
  m.setMap({ "loop-h": 48, bogus: 1 }); assert.equal(m.noteFor("loop-h"), 48); assert.equal(m.noteFor("loop-bar"), 38);
});
