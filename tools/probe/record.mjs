// Record probe, headless Chromium: the real recorder (the worklet bundle as KARI_RECORD=1 builds it, WavWriter, Recorder) inside real
// audio contexts, judged by Chrome's own WAV decoder and by the files that land in the browser's downloads, never by
// the writer's getters. `node tools/probe/record.mjs [--keep]`. Exit 0 = every row holds, 1 = a row failed.
//
//   1. Offline, 48 kHz stereo, one second. A deterministic source (a 24-bit-exact ramp on the left so every decoded
//      sample names its frame, a sine on the right) goes to the destination and, through an analyser tap, into the
//      recorder. Rendering is suspended at 0.25 s for a hold, at 0.45 s for the resume, at 0.9 s for the stop. The
//      take's WAV is decoded with decodeAudioData and compared with the rendered buffer with the held stretch cut:
//      the left channel exact, the right within 2^-24, frame count exact, dropped 0, moves on the right frames,
//      the cue chunk read by an independent RIFF reader.
//   2. Realtime: an AudioContext with an oscillator for one second. An outputs:0 node still gets process():
//      frames within 10 % of the elapsed clock, dropped 0, peak = the oscillator's gain, stop() answered by the
//      worklet (flushed) well inside the 1.5 s timeout.
//   3. downloadTake(): both files land as downloads with the right names; the .wav is saved to test-build/ and read
//      by ffprobe and Python's wave module (two decoders nobody here wrote).
import { build } from "esbuild";
import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const outDir = path.join(root, "test-build"); fs.mkdirSync(outDir, { recursive: true });
const entry = path.join(outDir, "record-probe.entry.ts");
fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(root, "src/content/audio/recorder.ts"))};\nexport * from ${JSON.stringify(path.join(root, "src/shared/wav.ts"))};\n`);
const bundle = path.join(outDir, "record-probe.js");
await build({ entryPoints: [entry], bundle: true, format: "iife", globalName: "KariRec", outfile: bundle, target: ["chrome120"], define: { __KARI_BUILD__: '"probe"', __KARI_RECORD__: "true" }, logLevel: "silent" });
// The worklet as KARI_RECORD=1 builds it (the committed extension/worklet.js is the public build, recorder compiled out).
const workletOut = path.join(outDir, "record-probe.worklet.js");
await build({ entryPoints: [path.join(root, "src/worklet/processor.js")], bundle: true, format: "iife", outfile: workletOut, target: ["chrome120"], define: { __KARI_BUILD__: '"probe"', __KARI_RECORD__: "true" }, logLevel: "silent" });
const workletCode = fs.readFileSync(workletOut, "utf8");

const rows = []; let fails = 0;
const row = (name, ok, detail) => { rows.push([ok ? "PASS" : "FAIL", name, detail]); if (!ok) fails++; };

const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
// AudioWorklet needs a secure context: serve the page from 127.0.0.1 (a Blob URL on about:blank has no audioWorklet).
const files = { "/": ["text/html", `<!doctype html><html><head><meta charset="utf-8"><title>record probe</title></head><body><script src="/record-probe.js"></script></body></html>`], "/record-probe.js": ["text/javascript", fs.readFileSync(bundle, "utf8")], "/worklet.js": ["text/javascript", workletCode] };
const server = http.createServer((req, res) => { const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(204); return res.end(); } res.writeHead(200, { "content-type": f[0] }); res.end(f[1]); });   // 204 for the favicon: no console error
await new Promise(r => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const page = await browser.newPage({ acceptDownloads: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(origin + "/");
await page.evaluate(() => { window.__workletUrl = "/worklet.js"; });

// Shared in-page helpers: an independent RIFF reader and a sample comparer.
await page.evaluate(() => {
  const tag = (u8, o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
  window.__readRiff = (u8) => {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const chunks = []; let o = 12;
    while (o + 8 <= u8.length) { const id = tag(u8, o), size = dv.getUint32(o + 4, true); chunks.push({ id, size, at: o + 8 }); o += 8 + size + (size & 1); }
    const fmt = chunks.find(c => c.id === "fmt "), data = chunks.find(c => c.id === "data"), cue = chunks.find(c => c.id === "cue "), list = chunks.find(c => c.id === "LIST");
    const out = { riff: tag(u8, 0) + "/" + tag(u8, 8), riffSize: dv.getUint32(4, true), total: u8.length, walked: o, ids: chunks.map(c => c.id), tag: dv.getUint16(fmt.at, true), channels: dv.getUint16(fmt.at + 2, true), sampleRate: dv.getUint32(fmt.at + 4, true), bits: dv.getUint16(fmt.at + 14, true), frames: data.size / dv.getUint16(fmt.at + 12, true), cues: [] };
    const labels = new Map();
    if (list) { let p = list.at + 4; const end = list.at + list.size; while (p + 8 <= end) { const size = dv.getUint32(p + 4, true); if (tag(u8, p) === "labl") { const t = u8.subarray(p + 12, p + 8 + size); labels.set(dv.getUint32(p + 8, true), new TextDecoder().decode(t.subarray(0, t.indexOf(0)))); } p += 8 + size + (size & 1); } }
    if (cue) { const n = dv.getUint32(cue.at, true); for (let i = 0; i < n; i++) { const p = cue.at + 4 + 24 * i; out.cues.push({ pos: dv.getUint32(p + 20, true), label: labels.get(dv.getUint32(p, true)) }); } }
    return out;
  };
  window.__sleep = (ms) => new Promise(r => setTimeout(r, ms));
});

// 1. offline
const off = await page.evaluate(async () => {
  const SR = 48000, N = SR;
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: N, sampleRate: SR });
  await ctx.audioWorklet.addModule(window.__workletUrl);
  const buf = ctx.createBuffer(2, N, SR), L = buf.getChannelData(0), R = buf.getChannelData(1);
  for (let i = 0; i < N; i++) { L[i] = (i - 4194304) / 8388608; R[i] = 0.8 * Math.sin(2 * Math.PI * 441 * i / SR); }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const tap = ctx.createAnalyser(); src.connect(tap); tap.connect(ctx.destination);
  const params = { st: 2, cents: 0, tempo: -6, keyLock: false, range: 50 };
  const rec = new KariRec.Recorder(ctx, tap, { site: "probe", track: "ramp", title: "Ramp take", build: "probe", params });
  rec.start(); src.start(0);
  const marks = {};
  const frameNow = () => Math.round(ctx.currentTime * SR);
  ctx.suspend(0.25).then(() => { marks.hold = frameNow(); rec.hold(); rec.mark("params", { ...params, st: 3 }); return ctx.resume(); });
  ctx.suspend(0.45).then(() => { marks.resume = frameNow(); rec.resume(); rec.mark("seek", { to: 12.5 }); return ctx.resume(); });
  let takeP, stopPath;
  const done = ctx.suspend(0.9).then(async () => {
    marks.stop = frameNow();
    const t0 = performance.now();
    takeP = rec.stop();
    stopPath = await Promise.race([takeP.then(() => "flushed while suspended"), window.__sleep(300).then(() => "needed rendering to resume")]);
    marks.stopMs = Math.round(performance.now() - t0);
    await ctx.resume();
    return takeP;
  });
  const rendered = await ctx.startRendering();
  const take = await done;
  window.__take = take;
  const u8 = new Uint8Array(await take.wav.arrayBuffer());
  const riff = window.__readRiff(u8);
  // Chrome's decoder, on a fresh context at the file's rate
  const dctx = new OfflineAudioContext({ numberOfChannels: 2, length: 1, sampleRate: SR });
  const dec = await dctx.decodeAudioData(u8.buffer.slice(0));
  const dL = dec.getChannelData(0), dR = dec.getChannelData(1), rL = rendered.getChannelData(0), rR = rendered.getChannelData(1);
  const cut = marks.resume - marks.hold;
  let worstL = 0, worstR = 0, firstBad = -1, renderedMatchesSource = true;
  for (let i = 0; i < N; i++) if (rL[i] !== L[i]) { renderedMatchesSource = false; break; }
  for (let i = 0; i < dec.length; i++) {
    const s = i < marks.hold ? i : i + cut;
    const eL = Math.abs(dL[i] - rL[s]), eR = Math.abs(dR[i] - rR[s]);
    if (eL > worstL) worstL = eL; if (eR > worstR) worstR = eR;
    if (firstBad < 0 && (eL > 0 || eR > 2 ** -24 + 1e-9)) firstBad = i;
  }
  return { marks, stopPath, frames: take.frames, decoded: dec.length, decodedRate: dec.sampleRate, decodedChannels: dec.numberOfChannels, dropped: take.dropped, peak: take.peak, seconds: take.seconds, bytes: take.bytes, expectFrames: marks.stop - cut, worstL, worstR, firstBad, renderedMatchesSource, riff, moves: take.log.moves.map(m => [m.kind, m.frame]), startedAt: take.startedAt, name: KariRec.takeName(take) };
});
row("offline: rendered output is the source (the tap is a straight wire)", off.renderedMatchesSource, "");
row("offline: stop answered by the worklet while the context was suspended", off.stopPath === "flushed while suspended", `${off.stopPath}, ${off.marks.stopMs} ms`);
row("offline: take holds exactly (stop − hold cut) frames", off.frames === off.expectFrames && off.decoded === off.frames, `frames ${off.frames}, expected ${off.expectFrames} (stop ${off.marks.stop}, hold ${off.marks.hold}→${off.marks.resume}), decoded ${off.decoded}`);
row("offline: Chrome's decoder matches the rendered buffer, left exact, right ≤ 2^-24", off.firstBad < 0, `worst L ${off.worstL}, worst R ${off.worstR.toExponential(2)}, first bad ${off.firstBad}`);
row("offline: decoded as 48 kHz stereo, no drops", off.decodedRate === 48000 && off.decodedChannels === 2 && off.dropped === 0, `rate ${off.decodedRate}, ch ${off.decodedChannels}, dropped ${off.dropped}, peak ${off.peak.toFixed(4)}`);
row("offline: RIFF walks to the end, PCM tag 1, 24 bit, cue + labels", off.riff.walked === off.riff.total && off.riff.riffSize === off.riff.total - 8 && off.riff.tag === 1 && off.riff.bits === 24 && off.riff.frames === off.frames && off.riff.ids.join() === "fmt ,data,cue ,LIST", `${off.riff.ids.join(" ")} · ${off.riff.cues.map(c => `${c.pos}:${c.label}`).join(" | ")}`);
{
  const hold = off.marks.hold, cut = off.marks.resume - off.marks.hold;
  const want = [["start", 0], ["hold", hold], ["params", hold], ["resume", hold], ["seek", hold], ["stop", off.marks.stop - cut]];
  row("offline: moves on take frames (hold, params inside the hold, resume and seek on the cut, stop at the end)", JSON.stringify(off.moves) === JSON.stringify(want), JSON.stringify(off.moves));
  row("offline: cues = params + seek on the cut, labelled", off.riff.cues.length === 2 && off.riff.cues.every(c => c.pos === hold) && off.riff.cues.map(c => c.label).join("|") === "pitch +3 st · 0.94×|seek 12.50 s", off.riff.cues.map(c => c.label).join(" | "));
}
row("offline: take name", /^kari-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-ramp-take-\+2st-0\.94x$/.test(off.name), off.name);

// 2. realtime
const rt = await page.evaluate(async () => {
  const SR = 48000;
  const ctx = new AudioContext({ sampleRate: SR });
  await ctx.audioWorklet.addModule(window.__workletUrl);
  await ctx.resume();
  const t0 = ctx.currentTime, w0 = performance.now();
  while (ctx.currentTime === t0 && performance.now() - w0 < 2000) await window.__sleep(20);
  if (ctx.currentTime === t0) return { running: false, state: ctx.state };
  const osc = ctx.createOscillator(); osc.frequency.value = 440; const g = ctx.createGain(); g.gain.value = 0.5; const tap = ctx.createAnalyser();
  osc.connect(g).connect(tap).connect(ctx.destination); osc.start();
  const rec = new KariRec.Recorder(ctx, tap, { site: "probe", params: { st: 0, cents: 0, tempo: 0, keyLock: false, range: 50 } });
  let progress = 0; rec.start(); const start = ctx.currentTime;
  await window.__sleep(1000);
  const seen = rec.frames;
  const s0 = performance.now(); const take = await rec.stop(); const stopMs = performance.now() - s0;
  const elapsed = Math.round((ctx.currentTime - start) * SR);
  await ctx.close();
  return { running: true, state: ctx.state, frames: take.frames, seen, elapsed, dropped: take.dropped, peak: take.peak, stopMs: Math.round(stopMs), bytes: take.bytes };
});
if (!rt.running) row("realtime: AudioContext runs in headless Chromium", false, `state ${rt.state}, clock never advanced (UNVERIFIED here, covered by the offline rows)`);
else {
  row("realtime: an outputs:0 worklet node still gets process() (chunks arrived)", rt.seen > 0 && rt.frames > 0, `${rt.seen} frames seen before stop, ${rt.frames} in the take`);
  row("realtime: take length within 10 % of the elapsed clock", Math.abs(rt.frames - rt.elapsed) <= rt.elapsed * 0.1, `take ${rt.frames}, clock ${rt.elapsed}`);
  row("realtime: no dropped chunks, peak = the oscillator's gain", rt.dropped === 0 && Math.abs(rt.peak - 0.5) < 0.01, `dropped ${rt.dropped}, peak ${rt.peak.toFixed(4)}`);
  row("realtime: stop answered by the worklet, not the 1.5 s timeout", rt.stopMs < 500, `${rt.stopMs} ms`);
}

// 3. the download path
const dl = [], events = [];
page.on("download", (d) => events.push(d));
await page.evaluate(() => KariRec.downloadTake(window.__take));
for (let i = 0; i < 100 && events.length < 2; i++) await new Promise(r => setTimeout(r, 50));
for (const d of events) { const file = path.join(outDir, d.suggestedFilename()); await d.saveAs(file); dl.push({ name: d.suggestedFilename(), file, size: fs.statSync(file).size }); }
const wav = dl.find(d => d.name.endsWith(".wav")), json = dl.find(d => d.name.endsWith(".moves.json"));
row("download: a .wav and a .moves.json land, named alike", !!wav && !!json && wav.name.slice(0, -4) === json.name.slice(0, -11) && wav.name === off.name + ".wav", dl.map(d => `${d.name} (${d.size} B)`).join(", "));
row("download: the .wav is the take, byte count exact", !!wav && wav.size === off.bytes, `${wav?.size} vs ${off.bytes}`);
if (json) { const log = JSON.parse(fs.readFileSync(json.file, "utf8")); row("download: the moves log is the take log", log.version === 1 && log.frames === off.frames && log.moves.length === off.moves.length && log.params.st === 2, `frames ${log.frames}, ${log.moves.length} moves`); }
if (wav) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels,bits_per_sample:format=duration", "-of", "json", wav.file], { encoding: "utf8" });
  if (probe.status === 0) { const j = JSON.parse(probe.stdout), s = j.streams[0]; row("download: ffprobe reads pcm_s24le 48 kHz stereo with the take's duration", s.codec_name === "pcm_s24le" && +s.sample_rate === 48000 && s.channels === 2 && Math.abs(+j.format.duration - off.seconds) < 1e-3, `${s.codec_name} ${s.sample_rate} Hz ${s.channels} ch, ${j.format.duration} s vs ${off.seconds.toFixed(4)}`); }
  else row("download: ffprobe", false, "ffprobe not installed (UNVERIFIED by ffprobe)");
  const py = spawnSync("python3", ["-I", "-c", "import wave,sys\nw=wave.open(sys.argv[1],'rb')\nprint(w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())", wav.file], { encoding: "utf8" });
  row("download: Python's wave module reads it", py.status === 0 && py.stdout.trim() === `2 3 48000 ${off.frames}`, py.status === 0 ? py.stdout.trim() : "python3 not installed (UNVERIFIED by python)");
}
row("no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));

await browser.close(); server.close();
for (const r of rows) console.log(`${r[0]}  ${r[1]}${r[2] ? `  — ${r[2]}` : ""}`);
console.log(`\n${rows.length - fails}/${rows.length} rows hold`);
if (!process.argv.includes("--keep")) for (const d of dl) fs.rmSync(d.file, { force: true });
process.exit(fails ? 1 : 0);
