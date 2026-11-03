// The take readout beside the record pill (src/content/ui/take-readout.ts): the running length, "paused" while held,
// a note that expires, nothing when idle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeReadout, fmtTake, NOTE_MS } from "../src/content/ui/take-readout.ts";

test("fmtTake: whole seconds as m:ss", () => {
  assert.equal(fmtTake(0), "0:00"); assert.equal(fmtTake(12.9), "0:12"); assert.equal(fmtTake(65), "1:05");
  assert.equal(fmtTake(3599.9), "59:59"); assert.equal(fmtTake(3600), "60:00");
  assert.equal(fmtTake(-3), "0:00"); assert.equal(fmtTake(NaN), "0:00");
});

test("readout: the length while recording, paused while held, the note until it expires, else nothing", () => {
  assert.equal(takeReadout({ recording: true, recSeconds: 12.4, recHeld: false }, null), "0:12");
  assert.equal(takeReadout({ recording: true, recSeconds: 12.4, recHeld: true }, null), "0:12 · paused");
  assert.equal(takeReadout({ recording: true, recSeconds: 0, recHeld: true }, { text: "saved 0:05", until: Infinity }), "0:00 · paused", "a running take outranks a note");
  assert.equal(takeReadout({ recording: false, recSeconds: 0, recHeld: false }, { text: "saved 0:12", until: 1000 + NOTE_MS }, 1000), "saved 0:12");
  assert.equal(takeReadout({ recording: false, recSeconds: 0, recHeld: false }, { text: "saved 0:12", until: 1000 + NOTE_MS }, 1000 + NOTE_MS), "", "gone once expired");
  assert.equal(takeReadout(null, null), ""); assert.equal(takeReadout(undefined, null), "");
  assert.equal(takeReadout({ recording: false, recSeconds: 0, recHeld: false }, { text: "nothing to record", until: Infinity }), "nothing to record");
});
