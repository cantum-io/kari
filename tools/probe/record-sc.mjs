// A take on SoundCloud: the SoundCloud test build, the Rec pill on the dock above the player bar pressed twice with a
// pause and a hide inside the take, and the files the browser receives read back by ffprobe and ffmpeg, never by
// Kari's own writer or readouts. Needs ffprobe / ffmpeg on PATH.
//
//   KARI_TEST_HOSTS=soundcloud npm run build
//   node tools/probe/record-sc.mjs                        fixture: soundcloud.com routed to a page built the way
//                                                         SoundCloud's player builds its graph (createElement("audio") →
//                                                         createMediaElementSource → gain → destination), playing a 440 Hz
//                                                         sine at 0.5 with the element's volume at 0.5; headless, no network
//   node tools/probe/record-sc.mjs <soundcloud track url> live: the real page (needs the network to soundcloud.com, so a
//                                                         desktop machine); pause and play go through the bar's own button
//   [--secs 6] [--st 5] [--out dir] [--shots dir] [--headed]   --st: semitones set through the dock before the take (live:
//                                                         +2); --shots: the dock on a first run and mid-take
// Exit 0 = every row holds.
//
//   RS1  the dock above the bar shows the Rec pill, and on a first run (intro hint up) every visible control's centre
//        hits that control, Full control off and on (0.7.0's lesson: a new dock row is checked against every overlay).
//   RS2  Pitch + ×st through the dock, Rec, play with a pause and a hide inside, Rec: the browser receives one .wav and
//        one .moves.json named kari-…-<badge title>-+<st>st-1.00x, within 10 s.
//   RS3  ffprobe: wav, pcm_s24le, 2 channels; the duration within 1 s of the time kept (held, minus paused, minus hidden;
//        1.5 s live, where the stream buffers after the bar's play).
//   RS4  ffmpeg volumedetect: the take is not silence (max above -60 dB).
//   RS5  the moves file: start first, stop last, site "sc", the badge's track key, the build stamp, st as set, a hold and
//        a resume for the pause and again for the hide.
//   RS6  fixture: the first stretch of the take sits at 440·2^(st/12) Hz (zero crossings, within 0.5 %): the take is
//        Kari's output at the key in force, not the element's raw audio.
//   RS7  fixture: the take peaks at -6 dBFS ±1.5 dB with the element's volume at 0.5 (the tap undoes the slider here too;
//        without it the take sits at -12).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const LIVE = argv.find((a) => /^https:\/\/(www\.|m\.)?soundcloud\.com\//.test(a)) || null;
const URL0 = LIVE || "https://soundcloud.com/probe-user/probe-tone";
const SECS = Number(opt("--secs", "6"));
const ST = Number(opt("--st", LIVE ? "2" : "5"));
const OUT = path.resolve(opt("--out", fs.mkdtempSync(path.join(os.tmpdir(), "kari-sc-take-"))));
fs.mkdirSync(OUT, { recursive: true });
const SHOTS = opt("--shots", null); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const EXT = path.resolve(opt("--ext", path.join(root, "test-build", "soundcloud")));
if (!fs.existsSync(path.join(EXT, "manifest.json"))) { console.error("no test build: run KARI_TEST_HOSTS=soundcloud npm run build first"); process.exit(2); }

// The fixture: SoundCloud's bar (badge, play button) and its route-0 graph, built on the first play() the way the
// bundle does it (docs/SOUNDCLOUD-GRAPH-2026-10-14.md): a detached <audio> from createElement, one context, one
// MediaElementSource, connect to a gain, the gain to the destination. The tone is made in the page (a blob: WAV).
const FIXTURE = `<!doctype html><html><head><title>probe tone by probe-user</title></head><body style="margin:0;background:#f2f2f2;height:100vh">
<div class="playControls m-visible" style="position:fixed;left:0;right:0;bottom:0;height:48px;background:#fff;border-top:1px solid #ccc">
<div class="playControls__inner"><button class="playControls__play" style="margin:12px">play</button>
<div class="playControls__soundBadge" style="display:inline-block"><a class="playbackSoundBadge__lightLink" href="/probe-user">probe-user</a>
<a class="playbackSoundBadge__titleLink" href="/probe-user/probe-tone" title="probe tone"><span class="sc-visuallyhidden">Current track: probe tone</span><span aria-hidden="true">probe tone</span></a></div></div></div>
<script>
(() => {
  const sr = 48000, secs = 60, n = sr * secs, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(0.5 * Math.sin(2 * Math.PI * 440 * i / sr) * 32767), true);
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  let el = null, ctx = null;
  const btn = document.querySelector(".playControls__play");
  window.__fx = {
    play() {
      if (!el) {
        el = document.createElement("audio"); el.src = url; el.volume = 0.5;
        ctx = new AudioContext(); const src = ctx.createMediaElementSource(el), g = ctx.createGain(); src.connect(g); g.connect(ctx.destination);
        el.addEventListener("playing", () => btn.classList.add("playControls__play--playing", "playing"));
        el.addEventListener("pause", () => btn.classList.remove("playControls__play--playing", "playing"));
      }
      return el.play().then(() => true, (e) => String(e));
    },
    pause() { el && el.pause(); },
    get t() { return el ? el.currentTime : -1; },
    get playing() { return !!el && !el.paused && el.currentTime > 0.2; },
  };
})();
</script></body></html>`;

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-sc-rec-"));
const ctx = await chromium.launchPersistentContext(udd, {
  headless: !argv.includes("--headed"), channel: "chromium", viewport: { width: 1280, height: 800 }, acceptDownloads: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
if (!LIVE) await ctx.route("https://soundcloud.com/**", (r) => (r.request().resourceType() === "document" ? r.fulfill({ contentType: "text/html", body: FIXTURE }) : r.abort()));

const rows = []; let failed = 0;
const row = (id, ok, detail) => { rows.push([id, ok, detail]); if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${id}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000, step = 150) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn().catch(() => null); if (v) return v; await sleep(step); } return v; }
const sh = (cmd) => { try { return execFileSync("sh", ["-c", cmd + " 2>&1"]).toString(); } catch (e) { return String(e.stdout || "") + String(e.stderr || ""); } };

const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker"));
const setSettings = (patch) => sw.evaluate(async (p) => { const o = (await chrome.storage.sync.get("kari.settings"))["kari.settings"] || {}; await chrome.storage.sync.set({ "kari.settings": { ...o, ...p } }); }, patch);

try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  const got = [];
  page.on("download", async (d) => { const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); got.push(f); });
  await page.goto(URL0, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Live: the cookie banner's opt-out and the sign-in dialog, then play from the track's own button (the bar's is
  // disabled until something is queued). Fixture: the page's play().
  const ctl = (sel) => page.locator(`#kari-dock ${sel}`).filter({ visible: true }).first();
  const barPlaying = () => page.evaluate(() => { const b = document.querySelector(".playControls__play"); return !!b && [...b.classList].some((c) => /playing/.test(c)); });
  const play = async () => {
    if (!LIVE) return page.evaluate(() => window.__fx.play());
    for (const sel of [".playControls .playControls__play:not(.disabled)", ".fullHero__playButton .sc-button-play", ".sc-button-play.playButton", ".sc-button-play:not(.disabled)"]) {
      const l = page.locator(sel).first();
      if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return sel; }
    }
    return null;
  };
  const pause = () => (LIVE ? page.locator(".playControls__play").first().click() : page.evaluate(() => window.__fx.pause()));
  const resume = () => (LIVE ? page.locator(".playControls__play").first().click() : page.evaluate(() => window.__fx.play()));
  if (LIVE) { await page.locator("#onetrust-close-btn-handler").first().click({ timeout: 5000 }).catch(() => {}); await page.locator(".modal__closeButton").first().click({ timeout: 3000 }).catch(() => {}); }
  // Started = the bar's button says playing and its clock moved. A click before the player hydrates is dropped, and a
  // click while the stream loads would pause it: click again only after 4 s with neither (as soundcloud.mjs does).
  const barClock = () => page.evaluate(() => { const t = document.querySelector(".playbackTimeline__timePassed span[aria-hidden]"); return t ? t.textContent.trim() : null; });
  let lastClick = 0, clicks = [], t0clock = null;
  const started = await until(async () => {
    if (!LIVE) { if (await page.evaluate(() => window.__fx.playing)) return true; if (Date.now() - lastClick > 4000) { clicks.push(await play()); lastClick = Date.now(); } return false; }
    const on = await barPlaying(), clock = await barClock();
    if (on && clock && t0clock !== null && clock !== t0clock) return true;
    if (on) { if (t0clock === null) t0clock = clock; return false; }
    t0clock = null;
    if (Date.now() - lastClick > 4000) { clicks.push(await play()); lastClick = Date.now(); }
    return false;
  }, 40000, 400);
  if (!started) throw new Error(`the track never started playing (clicked ${JSON.stringify(clicks)}; bar ${await page.evaluate(() => document.querySelector(".playControls__play")?.className || "none")}, clock ${await barClock()})`);

  // RS1: the pill on the dock, and the first-run hint over no control.
  const rec = ctl('[data-a="rec"]');
  const shown = await until(() => rec.isVisible(), 10000);
  const covered = () => page.evaluate(() => {
    const sr = document.querySelector("#kari-dock").shadowRoot, c = sr.querySelector('.skin[data-skin="org"] .ctl'), out = [];
    for (const el of c.querySelectorAll("button, input")) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(el).visibility !== "visible") continue;
      const x = r.x + r.width / 2, y = r.y + r.height / 2, hit = sr.elementFromPoint(x, y), top = document.elementFromPoint(x, y);
      if (!hit || !(hit === el || el.contains(hit)) || top !== sr.host) out.push(`${el.dataset.a || el.className}→${hit ? hit.dataset.el || hit.dataset.a || hit.className : "none"}${top !== sr.host ? " (page above)" : ""}`);
    }
    const it = sr.querySelector(".intro"), ir = it.getBoundingClientRect();
    return { intro: !it.hidden && getComputedStyle(it).display !== "none", introTop: Math.round(ir.top), out };
  });
  await setSettings({ seenIntro: false, fullControl: false }); await sleep(400);
  const c0 = await covered();
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "sc-first-run.png") });
  await setSettings({ fullControl: true }); await sleep(400);
  const c1 = await covered();
  await setSettings({ fullControl: false, seenIntro: true }); await sleep(400);
  row("RS1", !!shown && c0.intro && !c0.out.length && !c1.out.length, `Rec pill on the dock: ${!!shown}; first run, intro drawn ${c0.intro} (top ${c0.introTop} px); covered, Full control off [${c0.out.join(", ")}] on [${c1.out.join(", ")}]`);
  if (!shown) throw new Error("no Rec pill");

  // RS2: the key through the dock, then the take with a pause and a hide inside it.
  for (let i = 0; i < Math.abs(ST); i++) { await ctl(ST > 0 ? '[data-a="st+"]' : '[data-a="st-"]').click(); await sleep(120); }
  await sleep(2500);   // the engine warms (Rubber Band's first window) before the take starts
  const pressed = () => rec.getAttribute("aria-pressed");
  await rec.click();
  const p1 = await until(async () => ((await pressed()) === "true" ? "true" : null), 8000);
  const t0 = Date.now();
  const seg = SECS / 3;
  await sleep(seg * 1000);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "sc-recording.png") });
  const tp0 = Date.now(); await pause(); await sleep(1500); await resume(); const pausedMs = Date.now() - tp0;
  await until(barPlaying, 5000);
  await sleep(seg * 1000);
  const th0 = Date.now(); await setSettings({ hideOnSoundCloud: true });
  const gone = await until(async () => ((await page.$("#kari-dock")) ? null : true), 4000);
  await sleep(1500); await setSettings({ hideOnSoundCloud: false });
  const back = await until(() => rec.isVisible(), 6000); const hiddenMs = Date.now() - th0;
  await sleep(seg * 1000);
  await rec.click();
  const heldMs = Date.now() - t0;
  const p2 = await until(async () => ((await pressed()) === "false" ? "false" : null), 8000);
  const kept = (heldMs - pausedMs - hiddenMs) / 1000;
  await until(async () => (got.some((f) => f.endsWith(".wav")) && got.some((f) => f.endsWith(".moves.json")) ? got : null), 10000);
  const wav = got.find((f) => f.endsWith(".wav")), moves = got.find((f) => f.endsWith(".moves.json"));
  const sign = ST >= 0 ? "+" : "";
  const nameOk = !!wav && new RegExp(`^kari-\\d{4}-\\d\\d-\\d\\d-\\d\\d-\\d\\d-.+-${sign.replace("+", "\\+")}${ST}st-1\\.00x\\.wav$`).test(path.basename(wav)) && (LIVE || /-probe-tone-/.test(path.basename(wav)));
  row("RS2", nameOk && !!moves && p1 === "true" && p2 === "false" && !!gone && !!back, `files: ${got.map((f) => path.basename(f)).join(" · ") || "none"}; pill pressed ${p1} → ${p2}; dock gone on hide ${!!gone}, back ${!!back}; held ${(heldMs / 1000).toFixed(1)} s, paused ${(pausedMs / 1000).toFixed(1)} s, hidden ${(hiddenMs / 1000).toFixed(1)} s`);

  if (wav) {
    const pr = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=format_name,duration:stream=codec_name,channels,sample_rate", "-of", "json", wav]).toString());
    const st = pr.streams?.[0] || {}, dur = Number(pr.format?.duration);
    row("RS3", pr.format?.format_name === "wav" && st.codec_name === "pcm_s24le" && st.channels === 2 && Math.abs(dur - kept) < (LIVE ? 1.5 : 1), `ffprobe: ${pr.format?.format_name} ${st.codec_name} ${st.channels} ch ${st.sample_rate} Hz, ${dur.toFixed(2)} s against ${kept.toFixed(2)} s kept · ${fs.statSync(wav).size} B`);
    const maxOf = (args) => Number((sh(`ffmpeg -hide_banner ${args} -i "${wav}" -af volumedetect -f null -`).match(/max_volume:\s*(-?[\d.]+|-inf)/) || [])[1]);
    const max = maxOf("");
    row("RS4", Number.isFinite(max) && max > -60, `volumedetect max ${Number.isFinite(max) ? max + " dB" : "-inf (silence)"}`);
    if (!LIVE) {
      // The first stretch (before the pause): decoded by ffmpeg to float, frequency from rising zero crossings.
      const raw = path.join(OUT, "first.f32");
      sh(`ffmpeg -hide_banner -y -ss 0.3 -t ${Math.max(0.5, seg - 0.6).toFixed(2)} -i "${wav}" -ac 1 -f f32le "${raw}"`);
      const b = fs.readFileSync(raw), x = new Float32Array(b.buffer, b.byteOffset, b.length / 4), sr = Number(st.sample_rate);
      let first = -1, last = -1, cross = 0;
      for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) { const at = i - 1 + -x[i - 1] / (x[i] - x[i - 1]); if (first < 0) first = at; else { last = at; cross++; } }
      const hz = cross > 0 ? cross * sr / (last - first) : 0, want = 440 * Math.pow(2, ST / 12);
      row("RS6", Math.abs(hz - want) / want < 0.005, `first ${(x.length / sr).toFixed(2)} s at ${hz.toFixed(2)} Hz against ${want.toFixed(2)} Hz (${ST >= 0 ? "+" : ""}${ST} st; the element plays 440)`);
      const peak = maxOf(`-ss 0.3 -t ${Math.max(0.5, seg - 0.6).toFixed(2)}`);
      row("RS7", Number.isFinite(peak) && Math.abs(peak - -6.02) <= 1.5, `element volume 0.5, sine at 0.5: the take peaks at ${peak} dB (want -6.0 ±1.5; -12 = the slider not undone)`);
    }
  } else { row("RS3", false, "no wav"); row("RS4", false, "no wav"); }

  if (moves) {
    const m = JSON.parse(fs.readFileSync(moves, "utf8")), list = m.moves || [], kinds = list.map((x) => x.kind);
    const ver = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8")).version;
    const badge = await page.evaluate(() => { const a = document.querySelector(".playControls__soundBadge .playbackSoundBadge__titleLink"); return a ? new URL(a.getAttribute("href"), location.origin).pathname.toLowerCase() : null; });
    const holds = kinds.filter((k) => k === "hold").length, resumes = kinds.filter((k) => k === "resume").length;
    row("RS5", kinds[0] === "start" && kinds[kinds.length - 1] === "stop" && m.site === "sc" && !!badge && m.track === badge && String(m.kari).startsWith(ver + "+") && m.params?.st === ST && holds >= 2 && resumes >= 2,
      `moves: ${kinds.join(", ")} · site ${m.site} · track ${m.track} (badge ${badge}) · title "${m.title}" · build ${m.kari} · st ${m.params?.st} · ${m.seconds} s, dropped ${m.dropped}, peak ${m.peak}`);
  } else row("RS5", false, "no moves file");
} catch (err) { row("run", false, String(err?.stack || err)); }

await ctx.close();
fs.rmSync(udd, { recursive: true, force: true });
console.log(`take files in ${OUT}`);
console.log(`${rows.length - failed}/${rows.length} rows hold`);
process.exit(failed ? 1 : 0);
