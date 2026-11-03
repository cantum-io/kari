// WAV writer: the bytes it produces are checked by a reader written here from the RIFF spec, never by the writer's
// own getters; then Python's wave module and ffprobe (independent decoders, skipped where absent) read a file back.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { WavWriter, concat, wavBytes, wavBlob, clipLabel, MAX_CUES, MAX_LABEL, HEADER_BYTES } from "../src/shared/wav.ts";

const SR = 48000;
const tag = (u8, o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);

/** Independent RIFF/WAVE reader: walks the chunk list, decodes fmt, the data as integers, cue points and labels. */
function readWav(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  assert.equal(tag(u8, 0), "RIFF"); assert.equal(tag(u8, 8), "WAVE");
  const riffSize = dv.getUint32(4, true);
  const chunks = []; let o = 12;
  while (o + 8 <= u8.length) {
    const id = tag(u8, o), size = dv.getUint32(o + 4, true);
    chunks.push({ id, size, at: o + 8 });
    o += 8 + size + (size & 1);
  }
  assert.equal(o, u8.length, "chunk sizes walk exactly to the end of the file");
  const fmt = chunks.find(c => c.id === "fmt "), data = chunks.find(c => c.id === "data");
  assert.ok(fmt && data, "fmt and data chunks present");
  const f = { tag: dv.getUint16(fmt.at, true), channels: dv.getUint16(fmt.at + 2, true), sampleRate: dv.getUint32(fmt.at + 4, true), byteRate: dv.getUint32(fmt.at + 8, true), blockAlign: dv.getUint16(fmt.at + 12, true), bits: dv.getUint16(fmt.at + 14, true) };
  const bytes = f.bits / 8, frames = data.size / f.blockAlign;
  const samples = Array.from({ length: f.channels }, () => new Int32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < f.channels; c++) {
    const p = data.at + i * f.blockAlign + c * bytes;
    samples[c][i] = bytes === 3 ? ((u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16)) << 8) >> 8 : dv.getInt16(p, true);
  }
  const cue = chunks.find(c => c.id === "cue "), cues = [];
  if (cue) { const n = dv.getUint32(cue.at, true); assert.equal(cue.size, 4 + 24 * n); for (let i = 0; i < n; i++) { const p = cue.at + 4 + 24 * i; cues.push({ id: dv.getUint32(p, true), pos: dv.getUint32(p + 4, true), chunk: tag(u8, p + 8), chunkStart: dv.getUint32(p + 12, true), blockStart: dv.getUint32(p + 16, true), offset: dv.getUint32(p + 20, true) }); } }
  const labels = new Map();
  const list = chunks.find(c => c.id === "LIST" && tag(u8, c.at) === "adtl");
  if (list) { let p = list.at + 4; const end = list.at + list.size; while (p + 8 <= end) { const id = tag(u8, p), size = dv.getUint32(p + 4, true); if (id === "labl") { const cid = dv.getUint32(p + 8, true); let t = u8.subarray(p + 12, p + 8 + size); const z = t.indexOf(0); assert.ok(z >= 0, "label is NUL-terminated"); t = t.subarray(0, z); labels.set(cid, new TextDecoder().decode(t)); } p += 8 + size + (size & 1); } assert.equal(p, end, "labl chunks walk exactly to the end of the LIST"); }
  return { riffSize, chunks, fmt: f, frames, samples, cues, labels, dataSize: data.size, dataAt: data.at };
}

const ramp = (n, c = 1) => Array.from({ length: c }, (_, k) => Float32Array.from({ length: n }, (_, i) => (k ? -1 : 1) * ((i % 2000) - 1000) / 1024));
function noise(n, seed = 0x9e3779b9) { let s = seed >>> 0; const x = new Float32Array(n); for (let i = 0; i < n; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; x[i] = (s / 4294967296 - 0.5) * 1.98; } return x; }

test("header and fmt: an independent reader agrees on every field", () => {
  const u8 = concat(WavWriter.encode(ramp(100, 2), { sampleRate: SR, channels: 2, bits: 24 }));
  const r = readWav(u8);
  assert.equal(u8.length, HEADER_BYTES + 100 * 6);
  assert.equal(r.riffSize, u8.length - 8);
  assert.deepEqual(r.chunks.map(c => c.id), ["fmt ", "data"]);
  assert.deepEqual(r.fmt, { tag: 1, channels: 2, sampleRate: SR, byteRate: SR * 6, blockAlign: 6, bits: 24 });
  assert.equal(r.dataSize, 600); assert.equal(r.dataAt, 44); assert.equal(r.frames, 100);
  const r16 = readWav(concat(WavWriter.encode(ramp(10), { sampleRate: 44100, channels: 1, bits: 16 })));
  assert.deepEqual(r16.fmt, { tag: 1, channels: 1, sampleRate: 44100, byteRate: 88200, blockAlign: 2, bits: 16 });
});

test("24-bit codes: 0, ±1, half, clipping, rounding, NaN", () => {
  const x = [0, 1, -1, 0.5, -0.5, 1.5, -2, NaN, 0.4 / 8388608, 0.6 / 8388608, -0.6 / 8388608, 1 - 1 / 8388608, 2 ** -25, Infinity, -Infinity];
  const want = [0, 8388607, -8388608, 4194304, -4194304, 8388607, -8388608, 0, 0, 1, -1, 8388607, 0, 8388607, -8388608];
  const r = readWav(concat(WavWriter.encode([Float64Array.from(x)], { sampleRate: SR, channels: 1, bits: 24 })));
  assert.deepEqual(Array.from(r.samples[0]), want);
});

test("16-bit codes", () => {
  const r = readWav(concat(WavWriter.encode([[0, 1, -1, 0.5, 0.25, NaN, 3]], { sampleRate: SR, channels: 1, bits: 16 })));
  assert.deepEqual(Array.from(r.samples[0]), [0, 32767, -32768, 16384, 8192, 0, 32767]);
});

test("round trip: every sample within half a 24-bit step, exact at full scale", () => {
  const x = noise(4000);
  const r = readWav(concat(WavWriter.encode([x, x], { sampleRate: SR, channels: 2 })));
  let worst = 0;
  for (let i = 0; i < x.length; i++) {
    const back = r.samples[1][i] / 8388608, want = Math.max(-1, Math.min(1 - 2 ** -23, x[i]));
    worst = Math.max(worst, Math.abs(back - want));
  }
  assert.ok(worst <= 2 ** -24 + 1e-12, `worst error ${worst}`);
});

test("a mono input into a stereo file repeats the channel; no input at all is silence", () => {
  const x = noise(300, 7);
  const r = readWav(concat(WavWriter.encode([x], { sampleRate: SR, channels: 2 })));
  assert.equal(r.frames, 300);
  assert.deepEqual(Array.from(r.samples[1]), Array.from(r.samples[0]));
  const w = new WavWriter({ sampleRate: SR, channels: 2 });
  assert.equal(w.write([], 50), 50);
  const s = readWav(concat(w.finish()));
  assert.equal(s.frames, 50); assert.ok(s.samples[0].every(v => v === 0) && s.samples[1].every(v => v === 0));
});

test("streaming writes equal the one-shot encoding byte for byte", () => {
  const L = noise(3000, 1), R = noise(3000, 2);
  const one = concat(WavWriter.encode([L, R], { sampleRate: SR, channels: 2 }, [{ frame: 10, label: "a" }, { frame: 2999, label: "b" }]));
  const w = new WavWriter({ sampleRate: SR, channels: 2 });
  let at = 0; for (const n of [1, 7, 128, 500, 1000, 4096]) { const k = Math.min(n, 3000 - at); if (!k) break; assert.equal(w.write([L.subarray(at, at + k), R.subarray(at, at + k)]), k); at += k; }
  assert.equal(at, 3000);
  w.cue("b", 2999); w.cue("a", 10);
  assert.deepEqual(concat(w.finish()), one);
});

test("odd data length gets a pad byte and the chunks after it stay word-aligned", () => {
  const w = new WavWriter({ sampleRate: SR, channels: 1, bits: 24 });
  w.write([[0.25]]); w.cue("one", 0);
  const u8 = concat(w.finish()), r = readWav(u8);
  assert.equal(r.dataSize, 3); assert.equal(u8[47], 0, "pad byte is zero");
  assert.equal(r.chunks.find(c => c.id === "cue ").at, 48 + 8, "cue chunk starts on an even offset after the pad");
  assert.equal(u8.length % 2, 0); assert.equal(r.riffSize, u8.length - 8);
  assert.equal(r.frames, 1); assert.equal(r.samples[0][0], 2097152);
});

test("cue markers: sorted by frame, ids 1..n, labels round-trip, odd label bodies padded", () => {
  const w = new WavWriter({ sampleRate: SR, channels: 2 });
  w.write(ramp(1000, 2));
  assert.equal(w.cue("pitch +2 st · 1.00×", 600), true);
  assert.equal(w.cue("loop 4 beats", 10), true);
  assert.equal(w.cue("seek 12.50 s", 1000), true);     // the end of the file is a legal position
  assert.equal(w.cue("ab", 10), true);                  // two cues on one frame are fine
  assert.equal(w.cueCount, 4);
  const u8 = concat(w.finish()), r = readWav(u8);
  assert.deepEqual(r.chunks.map(c => c.id), ["fmt ", "data", "cue ", "LIST"]);
  assert.deepEqual(r.cues.map(c => c.pos), [10, 10, 600, 1000]);
  assert.deepEqual(r.cues.map(c => c.id), [1, 2, 3, 4]);
  for (const c of r.cues) { assert.equal(c.chunk, "data"); assert.equal(c.offset, c.pos); assert.equal(c.chunkStart, 0); assert.equal(c.blockStart, 0); }
  assert.deepEqual([...r.labels.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]), ["loop 4 beats", "ab", "pitch +2 st · 1.00×", "seek 12.50 s"]);
  assert.equal(r.riffSize, u8.length - 8);
});

test("labels clip at MAX_LABEL bytes on a character boundary; control characters become spaces", () => {
  assert.equal(MAX_LABEL, 64);
  const dec = new TextDecoder();
  assert.equal(dec.decode(clipLabel("a\tb\nc\u0000d")), "a b c d");
  const long = "é".repeat(40);                                    // 80 bytes, 2 each
  const c = clipLabel(long);
  assert.equal(c.length, 64); assert.equal(dec.decode(c), "é".repeat(32));
  const odd = "x" + "€".repeat(30);                               // 1 + 90 bytes: byte 64 falls inside a 3-byte char
  const d = clipLabel(odd);
  assert.ok(d.length <= 64); assert.equal(dec.decode(d), "x" + "€".repeat(21));
  const w = new WavWriter({ sampleRate: SR, channels: 1 }); w.write([[0]]); w.cue(long, 0);
  const r = readWav(concat(w.finish()));
  assert.equal(r.labels.get(1), "é".repeat(32));
});

test("cue limits: table full, off-file frames and a finished writer are refused", () => {
  const w = new WavWriter({ sampleRate: SR, channels: 1 });
  w.write([[0, 0, 0]]);
  assert.equal(w.cue("neg", -1), false); assert.equal(w.cue("nan", NaN), false);
  assert.equal(w.cue("past", w.maxFrames + 1), false);
  for (let i = 0; i < MAX_CUES; i++) assert.equal(w.cue("c" + i, 1), true);
  assert.equal(w.cue("one too many", 1), false);
  assert.equal(w.cueCount, MAX_CUES);
  const u8 = concat(w.finish()), r = readWav(u8);
  assert.equal(r.cues.length, MAX_CUES); assert.equal(r.labels.size, MAX_CUES);
  assert.throws(() => w.cue("late", 0), /finished/);
});

test("the RIFF cap: writes stop at maxFrames, the file reports full, never a partial frame", () => {
  const w = new WavWriter({ sampleRate: SR, channels: 2, bits: 24 });
  assert.equal(w.maxFrames, Math.floor((0xffffffff - 44 - 1 - (1 << 17)) / 6));
  assert.ok(w.maxFrames * 6 + 44 + 1 + (1 << 17) <= 0xffffffff);
  w._frames = w.maxFrames - 3;                                     // the test reaches in: 4 GB of writes is not a test
  assert.equal(w.full, false);
  assert.equal(w.write(ramp(10, 2)), 3);
  assert.equal(w.full, true); assert.equal(w.frames, w.maxFrames);
  assert.equal(w.write(ramp(10, 2)), 0);
  assert.equal(w.bytes, 44 + w.maxFrames * 6);
});

test("finish is idempotent and closes the writer", () => {
  const w = new WavWriter({ sampleRate: SR, channels: 1 });
  w.write([[0.1, 0.2]]);
  const a = w.finish(), b = w.finish();
  assert.equal(a, b);
  assert.throws(() => w.write([[0]]), /finished/);
  assert.equal(wavBytes(a), 44 + 6);
});

test("the constructor rejects what the format cannot carry", () => {
  assert.throws(() => new WavWriter({ sampleRate: 100, channels: 1 }), RangeError);
  assert.throws(() => new WavWriter({ sampleRate: SR, channels: 3 }), RangeError);
  assert.throws(() => new WavWriter({ sampleRate: SR, channels: 1, bits: 32 }), RangeError);
  assert.throws(() => new WavWriter({ sampleRate: NaN, channels: 1 }), RangeError);
  const w = new WavWriter({ sampleRate: 44100.4, channels: 2 });
  assert.equal(w.sampleRate, 44100); assert.equal(w.bits, 24); assert.equal(w.blockAlign, 6);
});

test("wavBlob carries every byte with the audio/wav type", async () => {
  const parts = WavWriter.encode(ramp(11), { sampleRate: SR, channels: 1 }, [{ frame: 3, label: "x" }]);
  const b = wavBlob(parts);
  assert.equal(b.type, "audio/wav"); assert.equal(b.size, wavBytes(parts));
  assert.deepEqual(new Uint8Array(await b.arrayBuffer()), concat(parts));
});

// Two readers nobody here wrote. Python's wave module ships with CPython; ffprobe is on the CI image and most Macs.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kari-wav-"));
const file = path.join(tmp, "take.wav");
const L = noise(SR, 3), R = noise(SR, 4);
fs.writeFileSync(file, concat(WavWriter.encode([L, R], { sampleRate: SR, channels: 2, bits: 24 }, [{ frame: 100, label: "pitch +2 st" }])));
const has = (cmd) => spawnSync(cmd, ["-version"], { encoding: "utf8" }).status === 0 || spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;

test("Python's wave module reads the file back", { skip: !has("python3") && "python3 not installed" }, () => {
  const py = "import wave,sys,json\nw=wave.open(sys.argv[1],'rb')\nf=w.readframes(2)\nprint(json.dumps(dict(ch=w.getnchannels(),sw=w.getsampwidth(),sr=w.getframerate(),n=w.getnframes(),head=list(f))))";
  const r = spawnSync("python3", ["-I", "-c", py, file], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(r.stdout);
  assert.deepEqual({ ch: got.ch, sw: got.sw, sr: got.sr, n: got.n }, { ch: 2, sw: 3, sr: SR, n: SR });
  const u8 = fs.readFileSync(file);
  assert.deepEqual(got.head, Array.from(u8.subarray(44, 44 + 12)), "first two frames byte for byte");
});

test("ffprobe sees pcm_s24le, 48 kHz, 2 channels, one second", { skip: !has("ffprobe") && "ffprobe not installed" }, () => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels,bits_per_sample:format=duration", "-of", "json", file], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout), s = j.streams[0];
  assert.equal(s.codec_name, "pcm_s24le"); assert.equal(+s.sample_rate, SR); assert.equal(s.channels, 2); assert.equal(s.bits_per_sample, 24);
  assert.ok(Math.abs(+j.format.duration - 1) < 1e-3, `duration ${j.format.duration}`);
});
