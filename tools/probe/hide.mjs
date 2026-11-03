// Hide Kari per site, headless, with the real unpacked extension. No YouTube or SoundCloud servers: the two hosts are
// routed to tiny fixture pages (a #movie_player with a <video>; a .playControls bar), so the content scripts run on
// their real URLs. Reads only what the page itself can see (the dock's host element, video.playbackRate, the
// bridge's window messages) and chrome.storage from the service worker, never Kari's own readouts.
// `KARI_TEST_HOSTS=soundcloud npm run build && node tools/probe/hide.mjs [--shots dir]`. Exit 0 = every row holds.
//
//   Y1  YouTube: the dock mounts; Speed + sets playbackRate 1.01 (and the memory for the video).
//   Y2  Options switch "Hide on YouTube" → the dock leaves the player, playbackRate back to 1, storage says hidden.
//   Y3  Hidden: the Alt+→ command does nothing; a reload stays hidden and the remembered 1.01 is not applied.
//   Y4  Switch off → the dock is back and the song is where it was (1.01, from memory); Alt+→ now steps to 1.02.
//   Y5  The dock's own settings button "Hide Kari on YouTube" hides her; the options switch reads on.
//   S1  SoundCloud (test build): the dock mounts on the bar; Speed + posts apply tempo 1 to the hook.
//   S2  The dock's button "Hide Kari on SoundCloud" → dock gone, a neutral apply posted; YouTube unaffected.
//   S3  Hidden: the command and a track change (back to the remembered one) post nothing; switch off → dock back, apply tempo 1 again; the command posts now.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2), shots = argv.includes("--shots") ? path.resolve(argv[argv.indexOf("--shots") + 1] || "shots") : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const EXT = path.join(root, "test-build", "soundcloud");
if (!fs.existsSync(path.join(EXT, "manifest.json"))) { console.error("no test build: run KARI_TEST_HOSTS=soundcloud npm run build first"); process.exit(2); }

const YT_PAGE = `<!doctype html><html><head><title>fixture watch</title></head><body style="margin:0;background:#0f0f0f">
<div id="movie_player" class="html5-video-player" style="position:relative;width:960px;height:540px;background:#222">
<video class="html5-main-video" muted playsinline style="width:100%;height:100%"></video></div></body></html>`;
const SC_PAGE = `<!doctype html><html><head><title>fixture track</title></head><body style="margin:0;background:#f2f2f2;height:100vh">
<div class="playControls m-visible" style="position:fixed;left:0;right:0;bottom:0;height:48px;background:#fff;border-top:1px solid #ccc">
<div class="playControls__inner"><div class="playControls__soundBadge"><a class="playbackSoundBadge__lightLink" href="/probe-user">probe-user</a>
<a class="playbackSoundBadge__titleLink" href="/probe-user/probe-track">probe track</a></div></div></div></body></html>`;

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-hide-"));
const ctx = await chromium.launchPersistentContext(udd, {
  headless: true, channel: "chromium", viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--mute-audio"],
});
await ctx.route("https://www.youtube.com/**", (r) => r.request().resourceType() === "document" ? r.fulfill({ contentType: "text/html", body: YT_PAGE }) : r.abort());
await ctx.route("https://soundcloud.com/**", (r) => r.request().resourceType() === "document" ? r.fulfill({ contentType: "text/html", body: SC_PAGE }) : r.abort());
// The bridge's messages to the hook, as the page sees them (MAIN world, before any script).
await ctx.addInitScript(() => { window.__b2h = []; window.addEventListener("message", (e) => { const d = e.data; if (d && d.dir === "b2h" && d.type === "apply") window.__b2h.push(d.params); }); });

const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
const extId = new URL(sw.url()).host;
const store = () => sw.evaluate(async () => (await chrome.storage.sync.get("kari.settings"))["kari.settings"] || {});
const command = (url, c) => sw.evaluate(async ([u, cmd]) => { const [t] = await chrome.tabs.query({ url: u }); return chrome.tabs.sendMessage(t.id, { type: "kari:command", command: cmd }).then(() => "sent", (e) => String(e)); }, [url, c]);

const rows = []; let failed = 0;
const row = (id, ok, detail) => { rows.push([id, ok, detail]); if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${id}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn(); if (v) return v; await sleep(100); } return v; }

const dockOn = (p, sel) => p.evaluate((s) => { const d = document.querySelector(s + " #kari-dock"); if (!d) return null; const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
const rate = (p) => p.evaluate(() => document.querySelector("video").playbackRate);
const visible = (p, sel) => p.locator(`#kari-dock ${sel}`).filter({ visible: true }).first();

async function openOptions() { const o = await ctx.newPage(); await o.goto(`chrome-extension://${extId}/options.html`); await o.waitForSelector('[data-bool="hideOnYouTube"]'); return o; }
const pressed = (o, key) => o.getAttribute(`[data-bool="${key}"]`, "aria-pressed");

try {
  // ---------- YouTube ----------
  const YT = "https://www.youtube.com/watch?v=probeHide01";
  const yt = await ctx.newPage();
  await yt.goto(YT);
  const d1 = await until(() => dockOn(yt, "#movie_player"), 8000);
  await visible(yt, '[data-a="intro-ok"]').click().catch(() => {});
  await visible(yt, '[data-a="tempo+"]').click();
  const r1 = await until(async () => { const r = await rate(yt); return Math.abs(r - 1.01) < 1e-6 ? r : 0; });
  row("Y1", !!d1 && Math.abs(r1 - 1.01) < 1e-6, `dock ${JSON.stringify(d1)} · playbackRate after Speed + = ${r1}`);
  if (shots) await yt.screenshot({ path: path.join(shots, "yt-shown.png") });

  const opt = await openOptions();
  if (shots) await opt.screenshot({ path: path.join(shots, "options.png"), fullPage: true });
  await opt.click('[data-bool="hideOnYouTube"]');
  await yt.bringToFront();
  const gone = await until(async () => (await dockOn(yt, "#movie_player")) === null);
  const r2 = await until(async () => { const r = await rate(yt); return r === 1 ? 1 : 0; });
  const s2 = await store();
  row("Y2", gone && r2 === 1 && s2.hideOnYouTube === true && (await pressed(opt, "hideOnYouTube")) === "true", `dock gone=${gone} · playbackRate=${await rate(yt)} · storage hideOnYouTube=${s2.hideOnYouTube}`);
  if (shots) await yt.screenshot({ path: path.join(shots, "yt-hidden.png") });

  const sent = await command(YT, "tempo-up"); await sleep(400);
  const r3a = await rate(yt);
  await yt.reload(); await sleep(2500);
  const d3 = await dockOn(yt, "#movie_player"), r3b = await rate(yt);
  row("Y3", r3a === 1 && d3 === null && r3b === 1, `command ${sent} → playbackRate ${r3a} · after reload: dock=${JSON.stringify(d3)} playbackRate=${r3b}`);

  await opt.bringToFront(); await opt.click('[data-bool="hideOnYouTube"]'); await yt.bringToFront();
  const d4 = await until(() => dockOn(yt, "#movie_player"));
  const r4 = await until(async () => { const r = await rate(yt); return Math.abs(r - 1.01) < 1e-6 ? r : 0; });
  const r4a = await rate(yt);
  await command(YT, "tempo-up"); const r4b = await until(async () => { const r = await rate(yt); return Math.abs(r - 1.02) < 1e-6 ? r : 0; }, 2000); // the command path works when shown: Y3's "nothing" is real
  row("Y4", !!d4 && Math.abs(r4a - 1.01) < 1e-6 && Math.abs(r4b - 1.02) < 1e-6, `dock back ${JSON.stringify(d4)} · playbackRate ${r4a} (memory restored) · Alt+→ now → ${r4b} · storage hideOnYouTube=${(await store()).hideOnYouTube}`);

  await visible(yt, '[data-el="gear"]').click();
  const btn = visible(yt, '[data-a="hide-site"]');
  const label = (await btn.textContent())?.trim();
  if (shots) await yt.screenshot({ path: path.join(shots, "yt-settings.png") });
  await btn.click();
  const gone5 = await until(async () => (await dockOn(yt, "#movie_player")) === null);
  await opt.bringToFront(); const p5 = await until(async () => (await pressed(opt, "hideOnYouTube")) === "true" ? "true" : "", 2000);
  row("Y5", label === "Hide Kari on YouTube" && gone5 && p5 === "true" && (await rate(yt)) === 1, `button "${label}" → dock gone=${gone5} · options switch aria-pressed=${p5} · playbackRate=${await rate(yt)}`);

  // ---------- SoundCloud (test build: SoundCloud is a static host there) ----------
  const SC = "https://soundcloud.com/probe-user/probe-track";
  const sc = await ctx.newPage();
  await sc.goto(SC);
  const ds1 = await until(() => dockOn(sc, ".playControls"), 8000);
  await visible(sc, '[data-a="intro-ok"]').click().catch(() => {});
  await visible(sc, '[data-a="tempo+"]').click();
  const a1 = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 1));
  row("S1", !!ds1 && !!a1, `dock on the bar ${JSON.stringify(ds1)} · apply tempo 1 posted=${!!a1}`);
  if (shots) await sc.screenshot({ path: path.join(shots, "sc-shown.png") });

  await sc.evaluate(() => { window.__b2h.length = 0; });
  await visible(sc, '[data-el="gear"]').click();
  const scBtn = visible(sc, '[data-a="hide-site"]'); const scLabel = (await scBtn.textContent())?.trim();
  if (shots) await sc.screenshot({ path: path.join(shots, "sc-settings.png") });
  await scBtn.click();
  const sgone = await until(async () => (await dockOn(sc, ".playControls")) === null);
  const neutral = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 0 && p.st === 0 && p.cents === 0));
  const st2 = await store();
  await yt.bringToFront(); const ytStill = await dockOn(yt, "#movie_player");
  row("S2", scLabel === "Hide Kari on SoundCloud" && sgone && !!neutral && st2.hideOnSoundCloud === true, `button "${scLabel}" → dock gone=${sgone} · neutral apply posted=${!!neutral} · storage hideOnSoundCloud=${st2.hideOnSoundCloud} (YouTube still hidden from Y5: ${ytStill === null})`);

  await sc.bringToFront(); await sc.evaluate(() => { window.__b2h.length = 0; });
  const scSent = await command(SC, "tempo-up"); await sleep(500);
  // A track change while hidden: away and back to the track whose memory says tempo 1 — nothing may reach the hook.
  const badge = (href) => sc.evaluate((h) => { document.querySelector(".playbackSoundBadge__titleLink").setAttribute("href", h); }, href);
  await badge("/probe-user/other-track"); await sleep(500); await badge("/probe-user/probe-track"); await sleep(700);
  const quiet = (await sc.evaluate(() => window.__b2h)).length;
  await opt.bringToFront(); await opt.reload(); await opt.waitForSelector('[data-bool="hideOnSoundCloud"]');
  const p6 = await pressed(opt, "hideOnSoundCloud");
  await opt.click('[data-bool="hideOnSoundCloud"]'); await sc.bringToFront();
  const ds3 = await until(() => dockOn(sc, ".playControls"));
  const back = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 1));
  await sc.evaluate(() => { window.__b2h.length = 0; });
  await command(SC, "tempo-up"); const live = await until(async () => (await sc.evaluate(() => window.__b2h)).some((p) => p.tempo === 2), 2000); // shown: the same command posts
  row("S3", quiet === 0 && p6 === "true" && !!ds3 && !!back && !!live, `hidden: command ${scSent} + a track change away and back → ${quiet} applies posted · options read on=${p6} · switch off → dock ${JSON.stringify(ds3)}, apply tempo 1 again=${!!back} · shown, the command posts tempo 2=${!!live}`);
} catch (err) { row("run", false, String(err?.stack || err)); }

await ctx.close();
fs.rmSync(udd, { recursive: true, force: true });
console.log(`${rows.length - failed}/${rows.length} rows hold`);
process.exit(failed ? 1 : 0);
