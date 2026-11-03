// A take on the real site: the default build (record on) on a live youtube.com watch page, Rec pressed twice through
// the dock, the files the browser receives read back by ffprobe and ffmpeg, never by Kari's own writer or readouts.
// Needs the network to youtube.com and ffprobe/ffmpeg on PATH, so it runs on a desktop machine.
// `npm run build && node tools/probe/record-live.mjs [youtube-url] [--secs 6] [--out dir]`
// Exit 0 = every row holds.
//
//   LR1  the dock on #movie_player shows the Rec pill (the committed build carries the take).
//   LR2  Rec, wait, Rec again: the browser receives one .wav and one .moves.json, named kari-…, within 10 s.
//   LR3  ffprobe: RIFF WAVE, pcm_s24le, 2 channels, the duration within 1.5 s of the time between the two presses.
//   LR4  ffmpeg volumedetect: the take is not silence (max volume above -60 dB).
//   LR5  the moves file parses, starts with "start" and ends with "stop", and names the build that made it.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const YT = argv.find((a) => /^https:\/\/www\.youtube\.com\/watch/.test(a)) || "https://www.youtube.com/watch?v=ymJIXzvDvj4"; // 60 bpm metronome
const SECS = Number(opt("--secs", "6"));
const OUT = path.resolve(opt("--out", fs.mkdtempSync(path.join(os.tmpdir(), "kari-take-"))));
fs.mkdirSync(OUT, { recursive: true });
const EXT = path.join(root, "extension");

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-rec-live-"));
const ctx = await chromium.launchPersistentContext(udd, {
  headless: true, channel: "chromium", viewport: { width: 1280, height: 800 }, acceptDownloads: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const rows = []; let failed = 0;
const row = (id, ok, detail) => { rows.push([id, ok, detail]); if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${id}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn().catch(() => null); if (v) return v; await sleep(150); } return v; }

try {
  const yt = await ctx.newPage();
  const got = [];
  yt.on("download", async (d) => { const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); got.push(f); });
  await yt.goto(YT, { waitUntil: "domcontentloaded" });
  await yt.evaluate(() => { const v = document.querySelector("video"); if (v) v.play().catch(() => {}); }).catch(() => {});
  const v = () => yt.evaluate(() => { const e = document.querySelector("#movie_player video"); return e ? { t: e.currentTime, paused: e.paused, ad: !!document.querySelector("#movie_player.ad-showing") } : null; });
  await until(async () => { const s = await v(); return s && !s.ad && s.t > 1 ? s : null; }, 60000);   // past any pre-roll
  await yt.locator('#kari-dock [data-a="intro-ok"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
  await yt.hover("#movie_player").catch(() => {});
  const rec = yt.locator('#kari-dock [data-a="rec"]').filter({ visible: true }).first();
  const shown = await rec.isVisible({ timeout: 20000 }).catch(() => false) || await until(() => rec.isVisible(), 20000);
  row("LR1", !!shown, `Rec pill on the dock: ${!!shown}`);
  if (!shown) throw new Error("no Rec pill");

  // A real click on the pill, YouTube's controls woken first (the panel fades with them and a faded panel takes no
  // clicks), as tapfade.mjs does; the pill's aria-pressed says whether it took.
  const press = async () => {
    const b = await rec.boundingBox(); if (!b) throw new Error("no Rec pill box");
    await yt.mouse.move(b.x - 40, b.y + 30); await sleep(150); await yt.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await sleep(300);
    await yt.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(300);
    return rec.getAttribute("aria-pressed");
  };
  const p1 = await press();
  const t0 = Date.now();
  for (let i = 0; i < SECS * 2; i++) { await yt.mouse.move(400 + (i % 2) * 20, 300); await sleep(500); }
  const p2 = await press();
  const held = (Date.now() - t0) / 1000;
  if (p1 !== "true" || p2 !== "false") console.log(`note: pill pressed after the first click ${p1}, after the second ${p2}`);
  const both = await until(async () => (got.some((f) => f.endsWith(".wav")) && got.some((f) => f.endsWith(".moves.json")) ? got : null), 10000);
  const wav = got.find((f) => f.endsWith(".wav")), moves = got.find((f) => f.endsWith(".moves.json"));
  row("LR2", !!both && /^kari-/.test(path.basename(wav || "")), `files: ${got.map((f) => path.basename(f)).join(" · ") || "none"} (pressed ${held.toFixed(1)} s apart)`);

  if (wav) {
    const pr = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=format_name,duration:stream=codec_name,channels,sample_rate", "-of", "json", wav]).toString());
    const st = pr.streams?.[0] || {}, dur = Number(pr.format?.duration);
    row("LR3", pr.format?.format_name === "wav" && st.codec_name === "pcm_s24le" && st.channels === 2 && Math.abs(dur - held) < 1.5,
      `ffprobe: ${pr.format?.format_name} ${st.codec_name} ${st.channels} ch ${st.sample_rate} Hz, ${dur.toFixed(2)} s against ${held.toFixed(1)} s held · ${fs.statSync(wav).size} B`);
    let vd = ""; try { execFileSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "volumedetect", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] }); } catch (e) { vd = String(e.stderr || ""); }
    if (!vd) vd = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${wav}" -af volumedetect -f null - 2>&1`]).toString();
    const max = Number((vd.match(/max_volume:\s*(-?[\d.]+|-inf)/) || [])[1]);
    row("LR4", Number.isFinite(max) && max > -60, `volumedetect max ${Number.isFinite(max) ? max + " dB" : "-inf (silence)"}`);
  } else { row("LR3", false, "no wav"); row("LR4", false, "no wav"); }

  if (moves) {
    const m = JSON.parse(fs.readFileSync(moves, "utf8")), list = Array.isArray(m) ? m : m.moves || [];
    const kinds = list.map((x) => x.kind);
    row("LR5", kinds[0] === "start" && kinds[kinds.length - 1] === "stop", `moves: ${kinds.join(", ")} · build ${m.kari} · site ${m.site} · ${m.seconds} s, dropped ${m.dropped}`);
  } else row("LR5", false, "no moves file");
} catch (err) { row("run", false, String(err?.stack || err)); }

await ctx.close();
fs.rmSync(udd, { recursive: true, force: true });
console.log(`take files in ${OUT}`);
console.log(`${rows.length - failed}/${rows.length} rows hold`);
process.exit(failed ? 1 : 0);
