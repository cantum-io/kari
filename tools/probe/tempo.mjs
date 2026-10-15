// Tempo readout probe, YouTube, headless: the production build on a watch page, no click first, then one click on the
// page. Polls the dock's tempo readout, the engine readout, the controller's detector state and the [kari] console
// lines every second, and prints the timeline. Built 2026-10-15 for "tempo autodetect still not working".
//
//   npm run build
//   node tools/probe/tempo.mjs [watch url] [--json] [--headed] [--ext dir] [--watch ms] [--no-click]
//
// Exit: 0 a bpm appeared on its own (before or after the click) · 1 no bpm within the watch windows · 2 setup failed.
// The readout contract this checks (dock.ts): before the detector runs it says what it waits for ("play to learn",
// "click to learn"), "learning…" only while it listens, a bpm once found, "tap" only when it listened and found nothing.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const url = argv.find((a) => /^https:\/\/(www\.)?youtube\.com\/watch/.test(a)) || "https://www.youtube.com/watch?v=ymJIXzvDvj4"; // 60 bpm metronome
const JSON_OUT = flag("--json"), HEADED = flag("--headed"), NO_CLICK = flag("--no-click");
const EXT = path.resolve(opt("--ext", path.join(here, "../../extension")));
const WATCH = +opt("--watch", 20000);
const die = (code, msg) => { console.error(msg); process.exit(code); };
if (!fs.existsSync(path.join(EXT, "manifest.json"))) die(2, `no build at ${EXT}: npm run build`);

const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-yt-udd-"));
const context = await chromium.launchPersistentContext(udd, {
  headless: !HEADED, channel: "chromium", viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--hide-crash-restore-bubble", "--mute-audio"],
});
const cleanup = async (code) => { try { await context.close(); } catch (_) {} fs.rmSync(udd, { recursive: true, force: true }); process.exit(code); };
const lines = [];
const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5) + " s";
const page = context.pages()[0] || (await context.newPage());
page.on("console", (msg) => { const t = msg.text(); if (t.includes("[kari]")) lines.push(`${stamp()} ${t.slice(0, 200)}`); });
context.on("console", (msg) => { if (!msg.page()) { const t = msg.text(); if (t.includes("[kari]")) lines.push(`${stamp()} sw: ${t.slice(0, 200)}`); } });

const worlds = new Map();
const cdp = await context.newCDPSession(page);
cdp.on("Runtime.executionContextCreated", ({ context: c }) => { if (c.auxData && c.auxData.type === "isolated") worlds.set(c.name, c.id); });
cdp.on("Runtime.executionContextsCleared", () => worlds.clear());
await cdp.send("Runtime.enable");
async function iso(expr) {
  const n = [...worlds.keys()].find((k) => /kari/i.test(k)); if (!n) return null;
  const r = await cdp.send("Runtime.evaluate", { expression: expr, contextId: worlds.get(n), awaitPromise: true, returnByValue: true }).catch(() => null);
  return r && !r.exceptionDetails ? r.result.value : null;
}
const sample = async () => {
  const dock = await page.evaluate(() => {
    const d = document.querySelector("#kari-dock"); const sr = d && d.shadowRoot; if (!sr) return null;
    const q = (s) => { const e = sr.querySelector(s); return e ? (e.textContent || "").trim() : null; };
    const ro = sr.querySelector('.skin[data-skin="org"] [data-b="tempo"]');
    return { tempo: ro ? ro.textContent.trim() : null, state: ro ? ro.dataset.state : null, engine: q('.skin[data-skin="org"] [data-b="engine"]'), fault: q('[data-el="fault"]') };
  }).catch(() => null);
  const video = await page.evaluate(() => { const v = document.querySelector("#movie_player video"); return v ? { paused: v.paused, t: +v.currentTime.toFixed(1), rs: v.readyState, rate: v.playbackRate, ad: !!document.querySelector("#movie_player.ad-showing, #movie_player.ad-interrupting") } : null; }).catch(() => null);
  const k = await iso("(() => { const k = globalThis.__kari; if (!k) return null; const a = k.audio; return JSON.stringify({ attached: a ? a.status.attached : null, tempo: k.tempo, status: a ? a.status.tempo : null, learning: a ? a.status.learning : null, bpm: a ? a.status.bpm : null, dbg: k.tempoDebug, act: navigator.userActivation && navigator.userActivation.hasBeenActive }); })()");
  return { at: stamp(), dock, video, kari: k ? JSON.parse(k) : null };
};
const timeline = [];
const watch = async (label, ms) => {
  const end = Date.now() + ms; let found = null;
  while (Date.now() < end) {
    const s = await sample(); s.phase = label; timeline.push(s);
    if (s.dock && /bpm/.test(s.dock.tempo || "")) { found = s; break; }
    await page.waitForTimeout(1000);
  }
  return found;
};

try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { console.error("page did not load: " + e.message); await cleanup(2); }
// No click anywhere (a click would count as the page's user activation). The player is started from page script, as
// YouTube's own autoplay does: Playwright's Chromium allows media and audio contexts without a gesture, like a Chrome
// profile that listens to youtube.com often, so the "no click" phase is the autoplay case; a fresh Chrome would say
// "click to learn" here instead.
await page.waitForSelector("#movie_player video", { timeout: 30000 }).catch(() => {});
const consent = await page.locator('button[aria-label*="Reject"], button:has-text("Reject all")').first().isVisible().catch(() => false);
if (consent) lines.push(`${stamp()} harness: a consent dialog is up (not clicked)`);
await page.waitForTimeout(1500);
const started = await page.evaluate(async () => { const v = document.querySelector("#movie_player video"); if (!v) return "no video"; try { await v.play(); return "play() ok"; } catch (e) { return "play() " + (e && e.name); } }).catch((e) => "evaluate failed " + e.message);
lines.push(`${stamp()} harness: ${started} from page script (no gesture)`);
const foundBefore = await watch("no click", WATCH);
let foundAfter = null;
if (!NO_CLICK && !foundBefore) {
  // one click on the page, not on the player's controls (the title area), as a user who clicks anywhere would
  const box = await page.locator("#movie_player").boundingBox().catch(() => null);
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // a player click pauses on YouTube: click twice to resume
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => { const v = document.querySelector("#movie_player video"); return v && v.paused; });
  if (v && box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  lines.push(`${stamp()} harness: clicked the player`);
  foundAfter = await watch("after click", WATCH);
}
const found = foundBefore || foundAfter;
const report = { url, ext: EXT, found: found ? { phase: found.phase, at: found.at, tempo: found.dock.tempo, bpm: found.kari && found.kari.bpm } : null, timeline, lines };
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`YouTube tempo readout, ${url}\nbuild ${EXT}\n`);
  let last = "";
  for (const s of timeline) {
    const row = `${s.phase.padEnd(11)} dock ${JSON.stringify(s.dock)} video ${JSON.stringify(s.video)} kari ${s.kari ? `attached ${s.kari.attached} tempo ${s.kari.tempo} status.tempo ${s.kari.status} bpm ${s.kari.bpm} fed ${s.kari.dbg?.fed} played ${s.kari.dbg?.played} skipped ${JSON.stringify(s.kari.dbg?.skipped)} rms ${s.kari.dbg?.lastRms?.toFixed?.(3)} active ${s.kari.act}` : "no __kari"}`;
    const key = row.replace(/^[^d]*/, "").replace(/"t":[\d.]+/, "").replace(/fed \d+ played \d+/, "").replace(/rms [\d.]+/, "");
    if (key !== last) console.log(`${s.at}  ${row}`); last = key;
  }
  console.log("\n[kari] lines:\n" + (lines.join("\n") || "(none)"));
  console.log(found ? `\nVERDICT: bpm appeared (${found.phase}) at ${found.at}: "${found.dock.tempo}"` : "\nVERDICT: no bpm within the watch windows");
}
await cleanup(found ? 0 : 1);
