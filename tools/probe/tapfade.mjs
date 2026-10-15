// Tap tempo + panel fade probe, YouTube, headless: the production build on a watch page. Built 2026-10-15 for Jesse's
// ear-test report ("tap works sometimes and sometimes not" · "the control screen keeps fading away and doesn't stick
// with kari"). Everything a user would do is done with Playwright's mouse on the dock's own buttons; the answers come
// from the page's DOM (YouTube's `ytp-autohide` class, computed styles inside the dock's open shadow root), the
// extension's isolated world (`__kari`: the controller's tap log, the tapper's taps, the grid, the detector) and the
// `[kari]` console lines.
//
//   npm run build
//   node tools/probe/tapfade.mjs [watch url] [--json] [--headed] [--ext dir] [--stage ms]
//
// Phases (each from a fresh load; YouTube throttles the automation profile after ~15–45 s of playback):
//   A  stage: play from page script, sample the tempo readout + detector state every second until a bpm or `--stage` ms.
//   B  idle under the pointer: park the pointer still (1) over the video centre, (2) over YouTube's own control bar,
//      (3) over Kari's Tap pill, (4) over Kari's blob; sample `ytp-autohide` + the panel's computed visibility for 5 s each.
//   C  taps: pointer on the Tap pill, 5 clicks 500 ms apart (per click: what AudioController.tap returned, the tapper's
//      taps, media time, paused, the grid, a latched loop), then hold still 4 s and click 5 more times at the same spot:
//      did they reach the pill (tap() called) or the player (paused toggled)?
// Exit 0 = the panel held under the pointer and every click on the Tap pill reached tap(); 1 = a row failed; 2 = setup.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const url = argv.find((a) => /^https:\/\/(www\.)?youtube\.com\/watch/.test(a)) || "https://www.youtube.com/watch?v=ymJIXzvDvj4";
const JSON_OUT = flag("--json"), HEADED = flag("--headed");
const EXT = path.resolve(opt("--ext", path.join(here, "../../extension")));
const STAGE = +opt("--stage", 20000);
const ONLY = opt("--only", "ABC").toUpperCase();
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
const sleep = (ms) => page.waitForTimeout(ms);
const rows = []; let fails = 0;
const row = (name, ok, detail) => { rows.push({ ok, name, detail }); if (ok === false) fails++; };
const report = { url, ext: EXT, phases: {}, rows, lines };

// ---- page helpers (MAIN world, the dock's open shadow root)
const ORG = '.skin[data-skin="org"] ';
const rect = (sel) => page.evaluate((sel) => { const d = document.querySelector("#kari-dock"); const el = d && d.shadowRoot.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
const ytRect = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
const panelState = () => page.evaluate((ORG) => {
  const p = document.getElementById("movie_player"); const d = document.querySelector("#kari-dock"); const sr = d && d.shadowRoot; if (!sr) return null;
  const root = sr.querySelector(".root"), ctl = sr.querySelector(ORG + ".ctl"), tap = sr.querySelector(ORG + '[data-a="tap"]'), blob = sr.querySelector(ORG + ".anchor");
  const cs = (el) => { const c = getComputedStyle(el); return { vis: c.visibility, op: +(+c.opacity).toFixed(2), pe: c.pointerEvents, cursor: c.cursor }; };
  const v = document.querySelector("#movie_player video");
  return { autohide: p.classList.contains("ytp-autohide"), hiddenAttr: root.dataset.hiddenWithControls, held: root.dataset.held ?? null, ctl: cs(ctl), tap: cs(tap), blob: cs(blob), playerCursor: getComputedStyle(p).cursor, paused: v ? v.paused : null, t: v ? +v.currentTime.toFixed(2) : null };
}, ORG);
const kari = () => iso("(() => { const k = globalThis.__kari; if (!k || !k.audio) return null; const a = k.audio; return JSON.stringify({ attached: a.status.attached, tempo: a.status.tempo, bpm: a.status.bpm, grid: a.grid, loop: a.loopBeats, taps: a.tapper ? a.tapper.taps : null, dbg: k.tempoDebug, est: k.estimate && { bpm: +k.estimate.bpm.toFixed(1), conf: +k.estimate.confidence.toFixed(2), P: +k.estimate.precision.toFixed(2), E: +k.estimate.explained.toFixed(2), ac: +k.estimate.autocorr.toFixed(2) } }); })()").then((s) => (s ? JSON.parse(s) : null));
const readout = () => page.evaluate((ORG) => { const d = document.querySelector("#kari-dock"); const sr = d && d.shadowRoot; const ro = sr && sr.querySelector(ORG + '[data-b="tempo"]'); return ro ? { text: ro.textContent.trim(), state: ro.dataset.state } : null; }, ORG);

async function load() {
  worlds.clear();
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { console.error("page did not load: " + e.message); await cleanup(2); }
  await page.waitForSelector("#movie_player video", { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const started = await page.evaluate(async () => { const v = document.querySelector("#movie_player video"); if (!v) return "no video"; try { await v.play(); return "play() ok"; } catch (e) { return "play() " + (e && e.name); } }).catch((e) => "evaluate failed " + e.message);
  lines.push(`${stamp()} harness: ${started} from page script (no gesture)`);
  await page.waitForFunction(() => document.querySelector("#kari-dock") && document.querySelector("#kari-dock").shadowRoot, null, { timeout: 15000 }).catch(() => {});
  // the ad, if any: wait it out (skip when offered)
  for (let i = 0; i < 60; i++) {
    const ad = await page.evaluate(() => { const p = document.getElementById("movie_player"); if (!p || !(p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting"))) return false; const sk = document.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern"); if (sk) sk.click(); return true; });
    if (!ad) break; await sleep(500);
  }
}
/** Install a log around AudioController.tap in the isolated world: every call the dock makes is recorded with its answer. */
const hookTap = () => iso("(() => { const a = globalThis.__kari && globalThis.__kari.audio; if (!a || a.__tapHooked) return !!a; const orig = a.tap.bind(a); globalThis.__taplog = []; a.tap = () => { const before = a.grid ? { ...a.grid } : null; const r = orig(); globalThis.__taplog.push({ at: performance.now(), ret: r, taps: a.tapper.taps.slice(), media: +a.video.currentTime.toFixed(3), paused: a.video.paused, rate: a.video.playbackRate, gridBefore: before, gridAfter: a.grid ? { ...a.grid } : null, loop: a.loopBeats, detectorMuted: a.detector.isMuted, detectorState: a.detector.state }); return r; }; a.__tapHooked = true; return true; })()");
const tapLog = () => iso("JSON.stringify(globalThis.__taplog || [])").then((s) => (s ? JSON.parse(s) : []));
/** Full control on, through the dock's own toggle (a real click). */
async function fullControlOn() {
  const on = await page.evaluate((ORG) => { const sr = document.querySelector("#kari-dock").shadowRoot; return sr.querySelector(ORG + '[data-a="full"]').getAttribute("aria-pressed") === "true"; }, ORG);
  if (on) return;
  const r = await rect(ORG + '[data-a="full"]'); if (!r) throw new Error("no Full control toggle");
  // wake YouTube's controls first (the panel fades with them and a faded panel takes no clicks), then click the toggle
  await page.mouse.move(r.x - 40, r.y + 30); await sleep(150); await page.mouse.move(r.x, r.y, { steps: 4 }); await sleep(300);
  const st = await panelState(); lines.push(`${stamp()} harness: before the Full control click: autohide ${st.autohide} panel ${st.ctl.vis}/${st.ctl.op} paused ${st.paused}`);
  await page.mouse.click(r.x, r.y); await sleep(300);
  const ok = await page.waitForFunction((ORG) => { const sr = document.querySelector("#kari-dock").shadowRoot; const t = sr.querySelector(ORG + '[data-a="tap"]'); return t && t.getBoundingClientRect().width > 0; }, ORG, { timeout: 5000 }).then(() => true, () => false);
  if (!ok) { const st2 = await panelState(); await page.screenshot({ path: path.join(here, "shots", "tapfade-fullcontrol-fail.png") }).catch(() => {}); throw new Error(`Full control did not turn on: ${JSON.stringify(st2)}`); }
}

/* ---------------- A. stage: when the bpm appears */
if (ONLY.includes("A")) { await load();
  const timeline = []; const end = Date.now() + STAGE; let found = null; const tA = Date.now();
  while (Date.now() < end) {
    const s = { at: stamp(), ms: Date.now() - tA, readout: await readout(), kari: await kari(), video: await page.evaluate(() => { const v = document.querySelector("#movie_player video"); return v ? { paused: v.paused, t: +v.currentTime.toFixed(1), rs: v.readyState } : null; }) };
    timeline.push(s);
    if (s.readout && /bpm/.test(s.readout.text)) { found = s; break; }
    await sleep(1000);
  }
  report.phases.stage = { found: found ? { ms: found.ms, text: found.readout.text, bpm: found.kari && found.kari.bpm, est: found.kari && found.kari.dbg } : null, timeline };
  row("A stage: a bpm on its own", found ? true : null, found ? `"${found.readout.text}" ${(found.ms / 1000).toFixed(1)} s after play(); detector ${JSON.stringify(found.kari && found.kari.dbg && { fed: found.kari.dbg.fed, played: found.kari.dbg.played, runs: found.kari.dbg.runs, conf: +found.kari.dbg.lastConf.toFixed(2) })}` : `no bpm in ${STAGE / 1000} s; last readout ${JSON.stringify(timeline[timeline.length - 1]?.readout)} detector ${JSON.stringify(timeline[timeline.length - 1]?.kari?.dbg)} last estimate ${JSON.stringify(timeline[timeline.length - 1]?.kari?.est)}`);
}

/* ---------------- B. idle under the pointer */
if (ONLY.includes("B")) { await load(); await fullControlOn();
  const spots = {};
  const pv = await ytRect("#movie_player"); spots.video = { x: pv.x, y: pv.y - 80 };
  const bar = await ytRect(".ytp-chrome-bottom"); spots.ytBar = bar ? { x: bar.x, y: bar.y } : null;
  const tap = await rect(ORG + '[data-a="tap"]'); spots.tapPill = tap;
  const blob = await rect(ORG + ".anchor"); spots.blob = blob;
  const ctl = await rect(ORG + ".ctl"); spots.panelTop = ctl ? { x: ctl.x, y: ctl.y - ctl.h / 2 + 14 } : null;
  const out = {};
  for (const [name, s] of Object.entries(spots)) {
    if (!s) { out[name] = "no element"; continue; }
    // wake the controls first (a real move), then park
    await page.mouse.move(pv.x, pv.y - 120); await sleep(100); await page.mouse.move(s.x, s.y, { steps: 8 }); await sleep(150);
    const samples = []; const tB = Date.now();
    for (let i = 0; i < 11; i++) { const st = await panelState(); samples.push({ ms: Date.now() - tB, autohide: st.autohide, hiddenAttr: st.hiddenAttr, held: st.held, ctlVis: st.ctl.vis, ctlOp: st.ctl.op, tapPe: st.tap.pe, blobVis: st.blob.vis, playerCursor: st.playerCursor, tapCursor: st.tap.cursor }); await sleep(500); }
    const firstHide = samples.find((x) => x.autohide); const panelGone = samples.find((x) => x.ctlVis === "hidden");
    out[name] = { spot: s, firstAutohideMs: firstHide ? firstHide.ms : null, panelHiddenMs: panelGone ? panelGone.ms : null, last: samples[samples.length - 1], samples };
  }
  report.phases.idle = out;
  const d = (k) => out[k] && out[k].spot ? `autohide ${out[k].firstAutohideMs === null ? "never" : "at " + out[k].firstAutohideMs + " ms"}, panel ${out[k].panelHiddenMs === null ? "stayed" : "hidden at " + out[k].panelHiddenMs + " ms"}` : String(out[k]);
  row("B1 pointer still over the video: YouTube hides its controls (baseline)", out.video.firstAutohideMs !== null, d("video"));
  row("B2 pointer still over YouTube's own control bar", null, d("ytBar"));
  row("B3 pointer still over Kari's Tap pill: the panel stays", out.tapPill.panelHiddenMs === null, d("tapPill") + `; last: autohide ${out.tapPill.last.autohide} held ${out.tapPill.last.held} ctl ${out.tapPill.last.ctlVis}/${out.tapPill.last.ctlOp} tap pointer-events ${out.tapPill.last.tapPe} player cursor ${out.tapPill.last.playerCursor} pill cursor ${out.tapPill.last.tapCursor}`);
  row("B4 pointer still over Kari's blob: the blob stays", out.blob.last.blobVis === "visible", d("blob") + `; blob ${out.blob.last.blobVis}`);
  row("B5 pointer still over the panel's top edge (the speed readout): the panel stays", out.panelTop && out.panelTop.spot ? out.panelTop.panelHiddenMs === null : null, d("panelTop"));
}

/* ---------------- C. taps on the pill, then taps after an idle hold */
if (ONLY.includes("C")) { await load(); await fullControlOn();
  await hookTap();
  const tap = await rect(ORG + '[data-a="tap"]'); if (!tap) { row("C taps", false, "no Tap pill"); } else {
    const before = await kari();
    await page.mouse.move(tap.x, tap.y, { steps: 6 }); await sleep(200);
    const clicks = [];
    for (let i = 0; i < 5; i++) { const st0 = await panelState(); await page.mouse.click(tap.x, tap.y); await sleep(60); const st1 = await panelState(); clicks.push({ i: i + 1, autohideBefore: st0.autohide, pausedBefore: st0.paused, pausedAfter: st1.paused, tBefore: st0.t }); await sleep(440); }
    const log1 = await tapLog(); const after1 = await kari(); const ro1 = await readout();
    // now hold still on the pill: YouTube's idle timer (nothing moved for ~3 s)
    await sleep(4000);
    const stHold = await panelState();
    const clicks2 = [];
    for (let i = 0; i < 5; i++) { const st0 = await panelState(); await page.mouse.click(tap.x, tap.y); await sleep(60); const st1 = await panelState(); clicks2.push({ i: i + 6, autohideBefore: st0.autohide, ctlVisBefore: st0.ctl.vis, pausedBefore: st0.paused, pausedAfter: st1.paused, tBefore: st0.t }); await sleep(440); }
    const log2 = await tapLog(); const after2 = await kari(); const ro2 = await readout();
    report.phases.taps = { gridBefore: before && before.grid, burst1: { clicks, log: log1, after: after1, readout: ro1 }, hold: stHold, burst2: { clicks: clicks2, log: log2.slice(log1.length), after: after2, readout: ro2 } };
    const reached1 = log1.length, reached2 = log2.length - log1.length;
    const pauses1 = clicks.filter((c) => c.pausedBefore !== c.pausedAfter).length, pauses2 = clicks2.filter((c) => c.pausedBefore !== c.pausedAfter).length;
    const rets = log1.map((l) => (l.ret === null ? "null" : l.ret.toFixed(1)));
    row("C1 five clicks on the Tap pill reach tap()", reached1 === 5 && pauses1 === 0, `tap() called ${reached1}/5, returned [${rets.join(", ")}], play/pause toggled ${pauses1}×; grid before ${JSON.stringify(before && before.grid)} → after ${JSON.stringify(after1 && after1.grid)}; readout "${ro1 && ro1.text}"`);
    row("C1a first tap on an auto grid re-phases only (by design)", null, log1[0] ? `tap 1: ret ${log1[0].ret}, grid ${JSON.stringify(log1[0].gridBefore)} → ${JSON.stringify(log1[0].gridAfter)}, detector muted ${log1[0].detectorMuted}` : "no tap recorded");
    row("C2 after a 4 s hold on the pill the panel is still there", stHold.ctl.vis === "visible", `autohide ${stHold.autohide}, held ${stHold.held}, panel ${stHold.ctl.vis}/${stHold.ctl.op}, tap pointer-events ${stHold.tap.pe}`);
    row("C3 five more clicks at the same spot reach tap(), not the player", reached2 === 5 && pauses2 === 0, `tap() called ${reached2}/5, play/pause toggled ${pauses2}×; per click (autohide, panel, paused → paused): ${clicks2.map((c) => `#${c.i} ${c.autohideBefore ? "hidden" : "shown"}/${c.ctlVisBefore} ${c.pausedBefore}→${c.pausedAfter}`).join(" · ")}; tap() returns [${log2.slice(log1.length).map((l) => (l.ret === null ? "null" : l.ret.toFixed(1))).join(", ")}]; readout "${ro2 && ro2.text}", grid ${JSON.stringify(after2 && after2.grid)}`);
    const gaps = log1.slice(1).map((l, i) => +(l.media - log1[i].media).toFixed(3));
    row("C4 media-time gaps between the five taps (clicked 500 ms apart)", null, `[${gaps.join(", ")}] s, rate ${log1[0] && log1[0].rate}, paused ${log1.map((l) => l.paused).join(",")}`);
  }
}

if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`Tap + fade probe, ${url}\nbuild ${EXT}\n`);
  const st = report.phases.stage;
  if (st) { let last = ""; for (const s of st.timeline) { const key = JSON.stringify([s.readout, s.kari && s.kari.tempo, s.kari && s.kari.dbg && s.kari.dbg.state, s.kari && s.kari.est]); if (key !== last) console.log(`  ${s.at}  readout ${JSON.stringify(s.readout)} video ${JSON.stringify(s.video)} detector ${s.kari && s.kari.dbg ? `${s.kari.dbg.state} fed ${s.kari.dbg.fed} played ${s.kari.dbg.played} runs ${s.kari.dbg.runs} conf ${s.kari.dbg.lastConf.toFixed(2)} est ${JSON.stringify(s.kari.est)}` : "none"}`); last = key; } console.log(); }
  for (const r of rows) console.log(`${r.ok === null ? "INFO" : r.ok ? "PASS" : "FAIL"}  ${r.name}\n      ${r.detail}`);
  console.log("\n[kari] lines:\n" + (lines.join("\n") || "(none)"));
  console.log(`\n${fails ? "FAIL" : "PASS"}: ${rows.filter((r) => r.ok === true).length} pass, ${fails} fail, ${rows.filter((r) => r.ok === null).length} info`);
}
await cleanup(fails ? 1 : 0);
