// Hide Kari on the real sites: hide.mjs's main rows against live youtube.com and soundcloud.com instead of fixtures.
// Needs the network to both sites, so it runs on a desktop machine, not in a sandbox that blocks them. Reads only what
// the page can see (the dock's host element, video.playbackRate / preservesPitch, the bridge's window messages) and
// chrome.storage from the service worker, never Kari's own readouts.
// `KARI_TEST_HOSTS=soundcloud npm run build && node tools/probe/hide-live.mjs [youtube-url] [soundcloud-url] [--shots dir]`
// Exit 0 = every row holds.
//
//   LY1  YouTube watch page plays; the dock mounts on #movie_player; Speed + sets playbackRate 1.01.
//   LY2  hideOnYouTube on → the dock leaves, playbackRate 1, preservesPitch back on.
//   LY3  hideOnYouTube off → the dock is back and playbackRate is 1.01 again (the song's memory).
//   LS1  SoundCloud track page (test build): the dock mounts on the play bar; Speed + posts apply tempo 1 to the hook.
//   LS2  hideOnSoundCloud on → the dock leaves and a neutral apply is posted.
//   LS3  hideOnSoundCloud off → the dock is back and apply tempo 1 is posted again.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2);
const shots = argv.includes("--shots") ? path.resolve(argv[argv.indexOf("--shots") + 1] || "shots") : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const YT = argv.find((a) => /^https:\/\/www\.youtube\.com\/watch/.test(a)) || "https://www.youtube.com/watch?v=ymJIXzvDvj4"; // 60 bpm metronome
const SC = argv.find((a) => /^https:\/\/soundcloud\.com\//.test(a)) || "https://soundcloud.com/amaixamai/sittin-gin-my-room";
const EXT = path.join(root, "test-build", "soundcloud");
if (!fs.existsSync(path.join(EXT, "manifest.json"))) { console.error("no test build: run KARI_TEST_HOSTS=soundcloud npm run build first"); process.exit(2); }

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-hide-live-"));
const ctx = await chromium.launchPersistentContext(udd, {
  headless: true, channel: "chromium", viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
await ctx.addInitScript(() => { window.__b2h = []; window.addEventListener("message", (e) => { const d = e.data; if (d && d.dir === "b2h" && d.type === "apply") window.__b2h.push(d.params); }); });
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
const store = () => sw.evaluate(async () => (await chrome.storage.sync.get("kari.settings"))["kari.settings"] || {});
const setHide = (key, v) => sw.evaluate(async ([k, val]) => { const o = (await chrome.storage.sync.get("kari.settings"))["kari.settings"] || {}; await chrome.storage.sync.set({ "kari.settings": { ...o, [k]: val } }); }, [key, v]);

const rows = []; let failed = 0;
const row = (id, ok, detail) => { rows.push([id, ok, detail]); if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${id}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn().catch(() => null); if (v) return v; await sleep(150); } return v; }
const dockOn = (p, sel) => p.evaluate((s) => { const d = document.querySelector(s + " #kari-dock"); if (!d) return null; const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? { w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const visible = (p, sel) => p.locator(`#kari-dock ${sel}`).filter({ visible: true }).first();
const near = (a, b) => typeof a === "number" && Math.abs(a - b) < 1e-6;

try {
  // ---------- YouTube ----------
  const yt = await ctx.newPage();
  await yt.goto(YT, { waitUntil: "domcontentloaded" });
  await yt.evaluate(() => { const v = document.querySelector("video"); if (v) v.play().catch(() => {}); }).catch(() => {});
  const v = () => yt.evaluate(() => { const e = document.querySelector("#movie_player video"); return e ? { rate: e.playbackRate, pp: e.preservesPitch, t: e.currentTime, ad: !!document.querySelector("#movie_player.ad-showing") } : null; });
  // Wait out a pre-roll: the rows only mean something on the song itself.
  await until(async () => { const s = await v(); return s && !s.ad && s.t > 1 ? s : null; }, 60000);
  const d1 = await until(() => dockOn(yt, "#movie_player"), 20000);
  await visible(yt, '[data-a="intro-ok"]').click({ timeout: 2000 }).catch(() => {});
  await yt.hover("#movie_player").catch(() => {});
  await visible(yt, '[data-a="tempo+"]').click({ timeout: 5000 });
  const s1 = await until(async () => { const s = await v(); return s && near(s.rate, 1.01) ? s : null; });
  row("LY1", !!d1 && !!s1, `${YT} · dock ${JSON.stringify(d1)} · after Speed + ${JSON.stringify(s1 || await v())}`);
  if (shots) await yt.screenshot({ path: path.join(shots, "live-yt-shown.png") });

  await setHide("hideOnYouTube", true);
  const gone = await until(async () => (await dockOn(yt, "#movie_player")) === null ? "gone" : null);
  const s2 = await until(async () => { const s = await v(); return s && s.rate === 1 && s.pp === true ? s : null; });
  row("LY2", gone === "gone" && !!s2 && (await store()).hideOnYouTube === true, `hidden: dock ${gone || "still there"} · video ${JSON.stringify(s2 || await v())}`);
  if (shots) await yt.screenshot({ path: path.join(shots, "live-yt-hidden.png") });

  await setHide("hideOnYouTube", false);
  const d3 = await until(() => dockOn(yt, "#movie_player"), 10000);
  const s3 = await until(async () => { const s = await v(); return s && near(s.rate, 1.01) ? s : null; });
  row("LY3", !!d3 && !!s3, `shown again: dock ${JSON.stringify(d3)} · video ${JSON.stringify(s3 || await v())}`);
  await yt.close();

  // ---------- SoundCloud (test build: soundcloud.com is a static host there) ----------
  const sc = await ctx.newPage();
  await sc.goto(SC, { waitUntil: "domcontentloaded" });
  // As soundcloud.mjs: the cookie banner's opt-out, the sign-in dialog closed, then play retried every 2 s until the bar
  // says playing (a click before the player hydrates is dropped; a click while it loads would pause it).
  await sc.locator("#onetrust-close-btn-handler").first().click({ timeout: 5000 }).catch(() => {});
  await sc.locator(".modal__closeButton").first().click({ timeout: 3000 }).catch(() => {});
  const barState = () => sc.evaluate(() => { const b = document.querySelector(".playControls__play"); return b ? (b.classList.contains("playing") ? "playing" : "idle") : "none"; }).catch(() => "none");
  const playSel = [".playControls .playControls__play:not(.disabled)", ".sc-button-play.playButton", ".fullHero__playButton .sc-button-play", ".sc-button-play:not(.disabled)"];
  for (const end = Date.now() + 25000; Date.now() < end && (await barState()) !== "playing";) {
    for (const s of playSel) { const l = sc.locator(s).first(); if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); break; } }
    await sleep(2000);
  }
  const ds1 = await until(() => dockOn(sc, ".playControls"), 20000);
  await visible(sc, '[data-a="intro-ok"]').click({ timeout: 2000 }).catch(() => {});
  await sc.evaluate(() => { window.__b2h.length = 0; });
  await visible(sc, '[data-a="tempo+"]').click({ timeout: 5000 });
  const a1 = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 1));
  row("LS1", !!ds1 && !!a1, `${SC} · dock on the bar ${JSON.stringify(ds1)} · apply tempo 1 posted=${!!a1}`);
  if (shots) await sc.screenshot({ path: path.join(shots, "live-sc-shown.png") });

  await sc.evaluate(() => { window.__b2h.length = 0; });
  await setHide("hideOnSoundCloud", true);
  const sgone = await until(async () => (await dockOn(sc, ".playControls")) === null ? "gone" : null);
  const neutral = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 0 && p.st === 0 && p.cents === 0));
  row("LS2", sgone === "gone" && !!neutral && (await store()).hideOnSoundCloud === true, `hidden: dock ${sgone || "still there"} · neutral apply posted=${!!neutral}`);

  await sc.evaluate(() => { window.__b2h.length = 0; });
  await setHide("hideOnSoundCloud", false);
  const ds3 = await until(() => dockOn(sc, ".playControls"), 10000);
  const back = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 1));
  row("LS3", !!ds3 && !!back, `shown again: dock ${JSON.stringify(ds3)} · apply tempo 1 again=${!!back}`);
} catch (err) { row("run", false, String(err?.stack || err)); }

await ctx.close();
fs.rmSync(udd, { recursive: true, force: true });
console.log(`${rows.length - failed}/${rows.length} rows hold`);
process.exit(failed ? 1 : 0);
