// The take on SoundCloud across the world boundary: the bridge's requests (src/soundcloud/takes.ts), the hook's command
// routing, and the guards on everything the MAIN world sends back (src/soundcloud/protocol.ts). The end to end on a
// SoundCloud-shaped page is tools/probe/record-sc.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TakeRequests, runRecordCommand, asTake } from "../src/soundcloud/takes.ts";
import { parseRecordCommand, parseTakeMessage, sanitizeTakeLog, isWavHead, parseLoopAck } from "../src/soundcloud/protocol.ts";

const LOG = {
  version: 1, kari: "0.8.0+abcd1234", startedAt: "2026-11-03T18:00:00.000Z", site: "sc", track: "/amaixamai/sittin-gin-my-room", title: "sittin gin my room",
  sampleRate: 48000, channels: 2, bits: 24, frames: 96000, seconds: 2, dropped: 0, peak: 0.5, volume: 0.8, muted: false,
  params: { st: 2, cents: 0, tempo: 0, keyLock: false, range: 50 },
  moves: [{ frame: 0, t: 0, kind: "start", data: { st: 2 } }, { frame: 48000, t: 1, kind: "hold" }, { frame: 96000, t: 2, kind: "stop" }],
};
const wavBlob = (n = 64) => { const b = new Uint8Array(n); b.set([..."RIFF"].map(c => c.charCodeAt(0)), 0); b.set([..."WAVE"].map(c => c.charCodeAt(0)), 8); return new Blob([b], { type: "audio/wav" }); };

test("record commands: start / stop / hide rebuilt field by field; anything off is null", () => {
  assert.deepEqual(parseRecordCommand({ action: "start", seq: 3, track: "/a/b", title: "B", extra: 1 }), { action: "start", seq: 3, track: "/a/b", title: "B" });
  assert.deepEqual(parseRecordCommand({ action: "start", seq: 4 }), { action: "start", seq: 4, track: "", title: "" });
  assert.equal(parseRecordCommand({ action: "start", seq: 4, title: "x".repeat(500) }).title.length, 200);
  assert.deepEqual(parseRecordCommand({ action: "stop", seq: 0 }), { action: "stop", seq: 0 });
  assert.deepEqual(parseRecordCommand({ action: "hide", on: true }), { action: "hide", on: true });
  for (const bad of [null, 1, {}, { action: "start" }, { action: "start", seq: -1 }, { action: "stop", seq: 1.5 }, { action: "stop", seq: "1" }, { action: "hide", on: 1 }, { action: "save", seq: 1 }]) assert.equal(parseRecordCommand(bad), null, JSON.stringify(bad));
});

test("the moves log from the MAIN world: every field typed and bounded, unknown moves and nested data dropped", () => {
  const ok = sanitizeTakeLog(LOG);
  assert.deepEqual(ok, LOG);
  const evil = sanitizeTakeLog({
    ...LOG, kari: "k".repeat(500), title: { toString() { return "x"; } }, startedAt: "not a date", sampleRate: 1e9, channels: 99, bits: 32, peak: Infinity,
    params: { st: 1e6, cents: "a", tempo: -1e6, keyLock: "yes", range: 7 },
    moves: [{ frame: -5, t: NaN, kind: "start", data: { nested: { a: 1 }, fn: "x".repeat(100), ok: true, ["k".repeat(40)]: 1 } }, { frame: 1, t: 1, kind: "eval" }, null, "x"],
    __proto__: { polluted: true },
  });
  assert.equal(evil.kari.length, 64);
  assert.equal(evil.title, undefined);
  assert.ok(Number.isFinite(Date.parse(evil.startedAt)));
  assert.equal(evil.sampleRate, 768000); assert.equal(evil.channels, 32); assert.equal(evil.bits, 24); assert.equal(evil.peak, 0);
  assert.deepEqual(evil.params, { st: 48, cents: 0, tempo: -100, keyLock: false, range: 50 });
  assert.equal(evil.moves.length, 1);
  assert.deepEqual(evil.moves[0], { frame: 0, t: 0, kind: "start", data: { fn: "x".repeat(64), ok: true } });
  assert.equal(sanitizeTakeLog({ ...LOG, moves: "x" }), null);
  assert.equal(sanitizeTakeLog({ ...LOG, sampleRate: "48000" }), null);
  assert.equal(sanitizeTakeLog(null), null);
});

test("the take message: a Blob that is not a take, a failed stop, a bad log are no take; a good one keeps the Blob", () => {
  const w = wavBlob();
  const good = parseTakeMessage({ seq: 7, ok: true, wav: w, log: LOG });
  assert.equal(good.seq, 7); assert.equal(good.take.wav, w); assert.deepEqual(good.take.log, LOG);
  assert.deepEqual(parseTakeMessage({ seq: 7, ok: false }), { seq: 7, take: null });
  assert.deepEqual(parseTakeMessage({ seq: 7, ok: true, wav: new Uint8Array(64), log: LOG }), { seq: 7, take: null });   // not a Blob
  assert.deepEqual(parseTakeMessage({ seq: 7, ok: true, wav: new Blob([new Uint8Array(10)]), log: LOG }), { seq: 7, take: null });   // shorter than a header
  assert.deepEqual(parseTakeMessage({ seq: 7, ok: true, wav: w, log: { ...LOG, moves: null } }), { seq: 7, take: null });
  assert.equal(parseTakeMessage({ seq: "7", ok: true, wav: w, log: LOG }), null);
  assert.equal(parseTakeMessage(null), null);
});

test("isWavHead: RIFF … WAVE only", async () => {
  assert.equal(isWavHead(new Uint8Array(await wavBlob().slice(0, 12).arrayBuffer())), true);
  assert.equal(isWavHead(new TextEncoder().encode("RIFF\0\0\0\0AVI ")), false);
  assert.equal(isWavHead(new TextEncoder().encode("<html>")), false);
  assert.equal(isWavHead(new Uint8Array(0)), false);
});

test("TakeRequests: start resolves on its ack, stop on its take; the page cannot answer a stop nobody made", async () => {
  const sent = [];
  const t = new TakeRequests(c => sent.push(c), 50, 50);
  const s = t.start("/a/b", "B");
  assert.deepEqual(sent[0], { action: "start", seq: 1, track: "/a/b", title: "B" });
  assert.equal(t.ack(99, true), false, "an unknown seq is ignored");
  assert.equal(t.ack(1, true), true);
  assert.equal(await s, true);
  assert.equal(t.take(5, { wav: wavBlob(), log: LOG }), false, "a take nobody asked for is dropped");
  const p = t.stop();
  assert.deepEqual(sent[1], { action: "stop", seq: 2 });
  const payload = { wav: wavBlob(), log: LOG };
  assert.equal(t.take(2, payload), true);
  assert.equal(await p, payload);
  assert.equal(t.take(2, payload), false, "answered once");
  assert.equal(await t.start("", ""), false, "no ack: false after the timeout");
  assert.equal(await t.stop(), null, "no take: null after the timeout");
  t.hide(true); assert.deepEqual(sent.at(-1), { action: "hide", on: true });
  assert.equal(t.inFlight, 0);
  assert.deepEqual(parseLoopAck({ seq: 1, ok: true }), { seq: 1, ok: true }, "record-ack shares the loop ack's shape");
});

test("asTake: what downloadTake and takeName read, from the sanitized log", () => {
  const w = wavBlob(), tk = asTake({ wav: w, log: LOG });
  assert.equal(tk.wav, w); assert.equal(tk.bytes, 64); assert.equal(tk.startedAt, LOG.startedAt); assert.equal(tk.seconds, 2); assert.equal(tk.frames, 96000); assert.equal(tk.log, LOG);
});

function target(name, { ok = true, frames = 10 } = {}) {
  const calls = [];
  return {
    calls, name,
    startRecording: async (meta) => { calls.push(["start", meta]); return ok; },
    stopRecording: async () => { calls.push(["stop"]); return frames ? { wav: wavBlob(), log: LOG, frames } : { wav: wavBlob(), log: LOG, frames: 0 }; },
    holdTake: (on) => calls.push(["hold", on]),
  };
}

test("runRecordCommand: start on the active controller with the badge's key and the build; stop goes to the one that started", async () => {
  const a = target("a"), b = target("b");
  const r1 = await runRecordCommand({ action: "start", seq: 1, track: "/x/y", title: "Y" }, a, null, [a, b], "0.8.0+abcd1234");
  assert.deepEqual(r1.answer, { type: "record-ack", seq: 1, ok: true }); assert.equal(r1.holder, a);
  assert.deepEqual(a.calls[0], ["start", { site: "sc", track: "/x/y", title: "Y", build: "0.8.0+abcd1234" }]);
  // the active element changed meanwhile (another unit): the stop still reaches the controller holding the take
  const r2 = await runRecordCommand({ action: "stop", seq: 2 }, b, r1.holder, [a, b], "");
  assert.equal(r2.answer.type, "take"); assert.equal(r2.answer.ok, true); assert.ok(r2.answer.wav instanceof Blob); assert.equal(r2.holder, null);
  assert.deepEqual(a.calls.map(c => c[0]), ["start", "stop"]); assert.equal(b.calls.length, 0);
});

test("runRecordCommand: nothing to record, nothing kept, hide reaches every controller", async () => {
  const none = await runRecordCommand({ action: "start", seq: 1, track: "", title: "" }, null, null, [], "");
  assert.deepEqual(none, { answer: { type: "record-ack", seq: 1, ok: false }, holder: null });
  const refused = target("r", { ok: false });
  const r = await runRecordCommand({ action: "start", seq: 2, track: "", title: "" }, refused, null, [refused], "");
  assert.equal(r.answer.ok, false); assert.equal(r.holder, null, "a refused start holds nothing");
  assert.deepEqual(refused.calls[0][1], { site: "sc", track: undefined, title: undefined, build: "" });
  assert.deepEqual((await runRecordCommand({ action: "stop", seq: 3 }, refused, null, [refused], "")).answer, { type: "take", seq: 3, ok: false });
  const empty = target("e", { frames: 0 });
  assert.deepEqual((await runRecordCommand({ action: "stop", seq: 4 }, null, empty, [empty], "")).answer, { type: "take", seq: 4, ok: false }, "an empty take is no file");
  const a = target("a"), b = target("b");
  const h = await runRecordCommand({ action: "hide", on: true }, a, a, [a, b], "");
  assert.equal(h.answer, null); assert.equal(h.holder, a);
  assert.deepEqual([a.calls, b.calls], [[["hold", true]], [["hold", true]]]);
});

test("the committed SoundCloud scripts carry the take: the recorder in the hook, the pill and the download in the bridge", () => {
  const hook = fs.readFileSync(new URL("../extension/sc-hook.js", import.meta.url), "utf8");
  const bridge = fs.readFileSync(new URL("../extension/sc-bridge.js", import.meta.url), "utf8");
  for (const s of ["kari-recorder", "record-ack", "audio/wav"]) assert.ok(hook.includes(s), `sc-hook.js has "${s}"`);
  for (const s of ["Record a take", "nothing to record", "moves.json", "record-ack"]) assert.ok(bridge.includes(s), `sc-bridge.js has "${s}"`);
});
