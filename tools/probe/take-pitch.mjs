// What a take carries, on the real site: the default build on a live youtube.com page playing a 440 Hz sine, the dock's
// own buttons pressed, three takes, and the WAVs the browser receives read back by a zero-crossing count (a pure tone's
// frequency, no library). Jesse, 2026-11-03: "needs to be saved with the pitch conversion and user updates".
// Needs the network to youtube.com. `npm run build && node tools/probe/take-pitch.mjs [youtube-url] [--secs 4] [--out dir]`
// Exit 0 = every row holds.
//
//   TP1  the neutral take is the tone itself: 440 Hz within 2 % (the reference f0 for the ratios below).
//   TP2  Pitch + five times, then a take: the first stretch sits at f0 · 2^(5/12) within 1.5 % (the engine's key change is in the file).
//   TP3  Pitch + once more while that take runs: the stretch after the press sits at f0 · 2^(6/12) (a move mid-take is in the file).
//   TP4  back to neutral, Speed − six times (0.94×, key lock off so pitch rides): the take sits at f0 · 0.94 (the element's rate is in the file).
//   TP5  the moves files say so: the +5 st take logs a params move to st 6 mid-take, and the file names carry +5st / 0.94x.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const YT = argv.find((a) => /^https:\/\/www\.youtube\.com\/watch/.test(a)) || "https://www.youtube.com/watch?v=_kEH-UyCMkQ"; // 440 Hz sine, one minute (no mid-roll ad can land in it)
const SECS = Number(opt("--secs", "4"));
const OUT = path.resolve(opt("--out", fs.mkdtempSync(path.join(os.tmpdir(), "kari-pitch-"))));
fs.mkdirSync(OUT, { recursive: true });
const EXT = path.join(root, "extension");

const rows = []; let failed = 0;
const row = (id, ok, detail) => { rows.push([id, ok, detail]); if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${id}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await Promise.resolve().then(fn).catch(() => null); if (v) return v; await sleep(150); } return v; }

/** Frequency of a pure tone in a 24-bit LE WAV's left channel between two seconds: positive-going zero crossings over the window. */
function toneHz(file, from, to) {
  const b = fs.readFileSync(file);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) { const id = b.toString("ascii", p, p + 4), n = b.readUInt32LE(p + 4); if (id === "fmt ") fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) }; if (id === "data") { data = { off: p + 8, n }; break; } p += 8 + n + (n & 1); }
  if (!fmt || !data || fmt.bits !== 24) throw new Error(`not a 24-bit wav: ${JSON.stringify(fmt)}`);
  const frameBytes = fmt.ch * 3, frames = Math.floor(data.n / frameBytes);
  const f0 = Math.max(0, Math.floor(from * fmt.sr)), f1 = Math.min(frames, Math.floor(to * fmt.sr));
  const s = (i) => { const o = data.off + i * frameBytes; const v = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); return v & 0x800000 ? v - 0x1000000 : v; };
  let peak = 0; for (let i = f0; i < f1; i += 7) peak = Math.max(peak, Math.abs(s(i)));
  const thr = peak * 0.1;   // hysteresis: a crossing counts once the wave has swung a tenth of the peak either side
  let up = 0, below = false, first = -1, last = -1;
  for (let i = f0; i < f1; i++) { const v = s(i); if (v < -thr) below = true; else if (v > thr && below) { below = false; up++; if (first < 0) first = i; last = i; } }
  if (up < 3) return { hz: 0, peak, up };
  return { hz: (up - 1) / ((last - first) / fmt.sr), peak: peak / 0x7fffff, up };
}

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-pitch-udd-"));
const ctx = await chromium.launchPersistentContext(udd, {
  headless: true, channel: "chromium", viewport: { width: 1280, height: 800 }, acceptDownloads: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
try {
  const yt = await ctx.newPage();
  const got = [];
  yt.on("download", async (d) => { const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); got.push(f); });
  await yt.goto(YT, { waitUntil: "domcontentloaded" });
  await yt.evaluate(() => { const v = document.querySelector("video"); if (v) v.play().catch(() => {}); }).catch(() => {});
  const v = () => yt.evaluate(() => { const e = document.querySelector("#movie_player video"); return e ? { t: e.currentTime, paused: e.paused, ad: !!document.querySelector("#movie_player.ad-showing") } : null; });
  await until(async () => { const s = await v(); return s && !s.ad && s.t > 1 ? s : null; }, 60000);
  await yt.locator('#kari-dock [data-a="intro-ok"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
  await yt.hover("#movie_player").catch(() => {});
  const btn = (a) => yt.locator(`#kari-dock [data-a="${a}"]`).filter({ visible: true }).first();
  await until(() => btn("rec").isVisible(), 20000);
  // A real click on a dock button, YouTube's controls woken first (the panel fades with them and takes no clicks faded).
  const press = async (a, times = 1) => {
    for (let i = 0; i < times; i++) {
      const b = await btn(a).boundingBox(); if (!b) throw new Error(`no ${a} button`);
      await yt.mouse.move(b.x - 40, b.y + 30); await sleep(120); await yt.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await sleep(200);
      await yt.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(250);
    }
  };
  // The Rec pill, pressed until its aria-pressed says the take is where we want it (a click on a fading panel is lost).
  const rec = async (want) => {
    for (let i = 0; i < 3; i++) { await press("rec"); const p = await btn("rec").getAttribute("aria-pressed").catch(() => null); if (p === String(want)) return i + 1; await sleep(400); }
    throw new Error(`Rec pill never read aria-pressed=${want}`);
  };
  const state = () => yt.evaluate(() => { const e = document.querySelector("#movie_player video"); return e ? `t ${e.currentTime.toFixed(1)} paused ${e.paused} rate ${e.playbackRate}` : "no video"; }).catch(() => "?");
  // One take: Rec, `secs` seconds (an action at the midpoint), Rec; the pair of files that lands.
  const take = async (secs, mid) => {
    const n0 = got.length;
    const presses = [await rec(true)]; const t0 = Date.now(); let tMid = null;
    for (let i = 0; i < secs * 2; i++) { if (mid && i === secs) { await mid(); tMid = (Date.now() - t0) / 1000; } await yt.mouse.move(400 + (i % 2) * 20, 300); await sleep(500); }
    presses.push(await rec(false)); const held = (Date.now() - t0) / 1000;
    await until(() => (got.length >= n0 + 2 ? got : null), 10000);
    const mine = got.slice(n0);
    console.log(`take: ${held.toFixed(1)} s, Rec presses ${presses.join("+")}, video ${await state()}, files ${mine.map((f) => path.basename(f)).join(" · ") || "none"}`);
    return { wav: mine.find((f) => f.endsWith(".wav")), moves: mine.find((f) => f.endsWith(".moves.json")), held, tMid };
  };
  await sleep(1500);   // past the tone's own fade-in, if any, before the first take

  const t0 = await take(SECS);
  const r0 = t0.wav ? toneHz(t0.wav, 0.3, t0.held - 0.3) : { hz: 0 };
  row("TP1", Math.abs(r0.hz - 440) / 440 < 0.02, `neutral take ${path.basename(t0.wav || "none")}: ${r0.hz.toFixed(2)} Hz (peak ${(r0.peak ?? 0).toFixed(3)})`);
  const f0 = r0.hz || 440;

  await press("st+", 5); await sleep(600);
  const t1 = await take(SECS, () => press("st+"));
  const a = t1.wav ? toneHz(t1.wav, 0.3, t1.tMid - 0.4) : { hz: 0 }, b = t1.wav ? toneHz(t1.wav, t1.tMid + 0.6, t1.held - 0.3) : { hz: 0 };
  const e5 = f0 * Math.pow(2, 5 / 12), e6 = f0 * Math.pow(2, 6 / 12);
  row("TP2", Math.abs(a.hz - e5) / e5 < 0.015, `+5 st take ${path.basename(t1.wav || "none")}: ${a.hz.toFixed(2)} Hz before the mid-take press, expected ${e5.toFixed(2)} (${((a.hz / e5 - 1) * 100).toFixed(2)} %)`);
  row("TP3", Math.abs(b.hz - e6) / e6 < 0.015, `after Pitch + at ${t1.tMid?.toFixed(1)} s: ${b.hz.toFixed(2)} Hz, expected ${e6.toFixed(2)} (${((b.hz / e6 - 1) * 100).toFixed(2)} %)`);

  await press("st-", 6); await press("tempo-", 6); await sleep(800);
  const ro = await state();
  const t2 = await take(SECS);
  const c = t2.wav ? toneHz(t2.wav, 0.3, t2.held - 0.3) : { hz: 0 };
  const e94 = f0 * 0.94;
  row("TP4", Math.abs(c.hz - e94) / e94 < 0.015, `0.94× take ${path.basename(t2.wav || "none")}: ${c.hz.toFixed(2)} Hz, expected ${e94.toFixed(2)} (${((c.hz / e94 - 1) * 100).toFixed(2)} %); video ${ro}`);

  let m1 = null; try { m1 = JSON.parse(fs.readFileSync(t1.moves, "utf8")); } catch (_) { /* none */ }
  const pm = (m1?.moves || []).filter((x) => x.kind === "params");
  row("TP5", !!m1 && m1.params?.st === 5 && pm.some((x) => x.data?.st === 6) && /\+5st/.test(path.basename(t1.wav || "")) && /0\.94x/.test(path.basename(t2.wav || "")),
    `moves: start st ${m1?.params?.st}, params moves ${JSON.stringify(pm.map((x) => [x.t, x.data?.st]))}; names ${path.basename(t1.wav || "none")} · ${path.basename(t2.wav || "none")}`);
} catch (err) { row("run", false, String(err?.stack || err)); }

await ctx.close();
fs.rmSync(udd, { recursive: true, force: true });
console.log(`take files in ${OUT}`);
console.log(`${rows.length - failed}/${rows.length} rows hold`);
process.exit(failed ? 1 : 0);
