// SoundCloud grant probe: how Kari gets onto soundcloud.com, and the two orders that used to fail — a tab opened
// before the grant, and Kari arriving after SoundCloud built its audio graph. Headless Chromium, fresh profiles.
//
//   npm run build
//   node tools/probe/sc-grant.mjs [--track https://soundcloud.com/lofilion/cave] [--ext extension] [--headed] [--json] [--verbose]
//
// Phase A runs the PRODUCTION build (extension/: soundcloud.com optional, nothing static): install state, the options
// page by both routes, what a wrong id looks like, the toolbar action's logic, a SoundCloud tab before any grant, and
// YouTube. Phase B runs a scratch copy of the same build with soundcloud.com moved into host_permissions (the state
// right after a user's Allow) and still no static scripts, so the service worker's registration and injection paths
// run exactly as shipped: a fresh tab, a tab open and playing before the grant (reload notice), a tab open and idle
// before the grant (injected; SoundCloud built its graph at hydration, so the notice again), the second click (ping,
// no double injection).
//
// What automation cannot do: click Chrome's permission bubble. Rows H1–H3 at the end are the checks that need a
// human's Allow (grant via the icon or the switch; revoke; grant while the worker is asleep); they are listed, not
// counted. chrome.developerPrivate.addHostPermission was tried as a proxy and does not grant an optional host.
// Exit 0 = every automated row passed, 1 = a row failed, 2 = setup failed.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const EXT = path.resolve(opt("--ext", path.join(here, "../../extension")));
const TRACK = opt("--track", "https://soundcloud.com/lofilion/cave");
const YT = opt("--yt", "https://www.youtube.com/watch?v=ymJIXzvDvj4");
const HEADED = flag("--headed"), JSON_OUT = flag("--json"), VERBOSE = flag("--verbose");
const SC = "https://soundcloud.com/*";
const die = (code, msg) => { console.error(msg); process.exit(code); };
if (!fs.existsSync(path.join(EXT, "manifest.json"))) die(2, `no build at ${EXT}: npm run build first`);
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
if (!(manifest.optional_host_permissions || []).includes(SC)) die(2, `${EXT} is not the production build (soundcloud.com must be an optional host)`);

const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (m) => { if (VERBOSE) console.error(`[probe ${((Date.now() - T0) / 1000).toFixed(1)}s] ${m}`); };
/** Every call into Chrome is time-bounded: a worker that stopped, a callback Chrome never fires, a page that went away — none may hang the run. */
const bounded = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`timeout ${ms} ms: ${what}`); })]);
const rows = []; let failed = 0;
const row = (id, check, pass, detail) => { rows.push({ id, check, pass, detail }); if (pass === false) failed++; };
const tmp = [];
const cleanupAll = async (code) => { for (const t of tmp) fs.rmSync(t, { recursive: true, force: true }); process.exit(code); };

/* ---- one browser + extension build ---- */
async function open(extDir, label) {
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-sc-grant-")); tmp.push(udd);
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: !HEADED, channel: "chromium", viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, "--no-first-run", "--hide-crash-restore-bubble", "--mute-audio"],
  });
  const swLines = [];
  ctx.on("console", (m) => { if (!m.page()) swLines.push(`${m.type()}: ${m.text()}`); });
  const sw = async (ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { const w = ctx.serviceWorkers()[0]; if (w) return w; await sleep(200); } return null; };
  const w0 = await sw(); if (!w0) die(2, `${label}: service worker never started`);
  const id = new URL(w0.url()).host;
  const inSw = async (fn, ...args) => { const w = await sw(); if (!w) throw new Error("no service worker"); return bounded(w.evaluate(fn, ...args), 15000, "service worker evaluate"); };
  const swState = () => inSw(async () => ({ granted: await chrome.permissions.contains({ origins: ["https://soundcloud.com/*"] }), scripts: (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id + ":" + (s.world || "ISOLATED")) }));
  const lastSwLine = (re) => [...swLines].reverse().find((l) => re.test(l)) || null;
  const waitSwLine = async (re, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const l = lastSwLine(re); if (l) return l; await sleep(150); } return null; };
  const info = async () => { const ep = await ctx.newPage(); await ep.goto("chrome://extensions/"); const r = await bounded(ep.evaluate((id) => new Promise((res) => chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true, includeTerminated: true }, (l) => { const e = l.find((x) => x.id === id); res(e ? { state: e.state, location: e.location, runtimeErrors: (e.runtimeErrors || []).map((x) => x.message), manifestErrors: (e.manifestErrors || []).map((x) => x.message) } : null); })), id), 10000, "getExtensionsInfo"); await ep.close(); return r; };
  const tabIdOf = async (page) => inSw(async (url) => { const t = (await chrome.tabs.query({})).find((x) => x.url === url || x.pendingUrl === url); return t ? t.id : null; }, page.url());

  /* a SoundCloud tab with Kari's isolated world reachable over CDP */
  async function scTab() {
    const page = await ctx.newPage();
    const lines = [], worlds = new Map();
    page.on("console", (m) => { if (/\[kari\]/.test(m.text())) lines.push(m.text().slice(0, 140)); });
    const cdp = await ctx.newCDPSession(page);
    cdp.on("Runtime.executionContextCreated", ({ context: c }) => { if (c.auxData && c.auxData.type === "isolated") worlds.set(c.name, c.id); });
    cdp.on("Runtime.executionContextsCleared", () => worlds.clear());
    await cdp.send("Runtime.enable");
    const evalKari = async (expr) => { const n = [...worlds.keys()].find((k) => /kari/i.test(k)); if (!n) return { world: false }; const r = await bounded(cdp.send("Runtime.evaluate", { expression: expr, contextId: worlds.get(n), awaitPromise: true, returnByValue: true }), 10000, "isolated-world evaluate"); return r.exceptionDetails ? { world: true, error: r.exceptionDetails.exception?.description || r.exceptionDetails.text } : { world: true, value: r.result.value }; };
    const kari = () => evalKari("(() => { const k = globalThis.__kari; return k ? { hookReady: k.hookReady, late: k.late, lateFault: k.lateFault, status: k.status, key: k.key, log: k.log.slice(-5) } : null; })()");
    // Mounted is not shown: the dock once "mounted" off-screen and visibility:hidden (2026-10-15). Read what a user sees.
    const dock = () => page.evaluate(() => {
      const d = document.querySelector("#kari-dock"); if (!d) return null;
      const f = d.shadowRoot && d.shadowRoot.querySelector('[data-el="fault"]');
      const root = d.shadowRoot && d.shadowRoot.querySelector(".root"), blob = d.shadowRoot && d.shadowRoot.querySelector(".org");
      const r = d.getBoundingClientRect(), b = blob && blob.getBoundingClientRect(), bar = document.querySelector(".playControls"), br = bar && bar.getBoundingClientRect();
      const vis = root ? getComputedStyle(root).visibility : "?";
      const aboveBar = !!br && Math.abs(r.bottom - br.top) < 2, blobOnScreen = !!b && b.top >= 0 && b.bottom <= innerHeight && b.width > 0;
      const hit = b ? document.elementFromPoint(Math.min(innerWidth - 2, b.left + b.width / 2), b.top + b.height / 2) : null; // what a click on Kari's body would reach
      return { fault: f && !f.hidden ? f.textContent : null, shown: vis === "visible" && aboveBar && blobOnScreen && hit === d, vis, aboveBar, blobOnScreen, rect: { y: Math.round(r.y), h: Math.round(r.height) }, barTop: br && Math.round(br.top), hit: hit ? hit.id || hit.tagName.toLowerCase() + (hit.className && typeof hit.className === "string" ? "." + hit.className.split(" ")[0] : "") : null };
    }).catch(() => null);
    const waitDock = async (ms) => { const t = Date.now(); while (Date.now() - t < ms) { const d = await dock(); if (d) return d; await sleep(250); } return null; };
    const waitKari = async (pred, ms) => { const t = Date.now(); let last = null; while (Date.now() - t < ms) { last = await kari(); if (last && last.value && pred(last.value)) return last.value; await sleep(250); } return last && last.value; };
    await page.goto(TRACK, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Cookie banner: the opt-out link ("I'm a GPC user…"), never "Continue"; it covers the bar until it is gone.
    await page.locator("#onetrust-close-btn-handler").first().click({ timeout: 5000 }).catch(() => {});
    await page.getByText("GPC user").first().click({ timeout: 2500 }).catch(() => {});
    await page.locator(".modal__closeButton").first().click({ timeout: 3000 }).catch(() => {});
    const playing = () => page.evaluate(() => { const b = document.querySelector(".playControls__play"); const tp = document.querySelector(".playbackTimeline__timePassed span[aria-hidden]"); return !!b && [...b.classList].some((c) => /playing/.test(c)) && !!tp && tp.textContent !== "0:00"; }).catch(() => false);
    const play = async (ms = 25000) => { // the bar's button once live, else the hero button; the first click is usually dropped pre-hydration
      const sels = [".playControls .playControls__play:not(.disabled)", ".sc-button-play.playButton", ".fullHero__playButton .sc-button-play", ".sc-button-play:not(.disabled)"];
      const t = Date.now(); let last = 0;
      while (Date.now() - t < ms) { if (await playing()) return true; if (Date.now() - last > 2000) { for (const s of sels) { const l = page.locator(s).first(); if (await l.isVisible().catch(() => false) && await l.click({ timeout: 2000 }).then(() => true, () => false)) { last = Date.now(); break; } } } await sleep(250); }
      return playing();
    };
    return { page, lines, kari, dock, waitDock, waitKari, play, playing };
  }
  return { ctx, id, swLines, sw, inSw, swState, lastSwLine, waitSwLine, info, tabIdOf, scTab, close: () => ctx.close().catch(() => {}) };
}

/* ================================================================ phase A: the production build */
step("A: production build");
const A = await open(EXT, "production");
try {
  await sleep(1500);
  const s0 = await A.swState(); const i0 = await A.info();
  row("A1", "production build loads: enabled, no errors, SW line 'unregistered (installed)', nothing registered", !!i0 && i0.state === "ENABLED" && i0.runtimeErrors.length === 0 && i0.manifestErrors.length === 0 && !!A.lastSwLine(/soundcloud scripts unregistered \(installed\)/) && !s0.granted && s0.scripts.length === 0,
    `id ${A.id} · ${i0 ? i0.state + " " + i0.location : "not listed"} · errors ${JSON.stringify(i0 && i0.runtimeErrors)} · granted ${s0.granted} · scripts ${JSON.stringify(s0.scripts)}`);

  step("A2: options page");
  const op = await A.ctx.newPage();
  const direct = await op.goto(`chrome-extension://${A.id}/options.html`).then((r) => "ok " + (r && r.status()), (e) => "ERR " + e.message.split("\n")[0]);
  const title = await op.title().catch(() => "?");
  await op.goto("about:blank"); // openOptionsPage focuses an existing options tab instead of opening one
  await A.inSw(() => chrome.runtime.openOptionsPage()); await sleep(1500);
  const np = A.ctx.pages().find((p) => p.url() === `chrome-extension://${A.id}/options.html`); // Chrome reuses an active blank tab for the singleton options tab
  const openedUrl = np ? np.url() : null;
  const id31 = A.id.slice(0, 11) + A.id.slice(12);
  const wrong = await op.goto(`chrome-extension://${id31}/options.html`).then((r) => "ok " + (r && r.status()), (e) => e.message.split("\n")[0].replace(/^page\.goto: /, "").split(" at ")[0]);
  row("A2", "options page opens by direct URL (right id) and by the icon's openOptionsPage; a 31-char id is ERR_BLOCKED_BY_CLIENT", /^ok 200/.test(direct) && title === "Kari settings" && openedUrl === `chrome-extension://${A.id}/options.html` && /ERR_BLOCKED_BY_CLIENT/.test(wrong),
    `direct ${direct} title "${title}" · openOptionsPage → ${openedUrl || "no new tab"} · ${id31} → ${wrong}`);
  for (const p of A.ctx.pages()) if (p.url().startsWith("chrome-extension://") || p.url() === "about:blank") await p.close().catch(() => {});

  step("A3: action logic");
  const a1 = await A.inSw(() => globalThis.__kari.soundcloud.activate({ id: 1, url: "https://www.youtube.com/watch?v=abc" }));
  const a2 = await A.inSw(() => globalThis.__kari.soundcloud.activate({ id: 1, url: "https://soundcloud.com/discover" }));
  const gestureLine = A.lastSwLine(/permission request failed/);
  row("A3", "action logic: YouTube tab → not-soundcloud (settings as before); SoundCloud tab → chrome.permissions.request is reached (refused here: no gesture outside a real click)", a1 === "not-soundcloud" && a2 === "denied" && !!gestureLine && /gesture/i.test(gestureLine),
    `youtube → ${a1} · soundcloud → ${a2} · ${gestureLine || "no request line"}`);

  step("A4: SoundCloud tab before any grant");
  const t4 = await A.scTab(); const p4 = await t4.play();
  const k4 = await t4.kari(); const d4 = await t4.dock();
  row("A4", "SoundCloud tab before any grant: no isolated world, no dock, the page plays untouched", p4 && !d4 && k4.world === false, `playing ${p4} · isolated world ${k4.world} · dock ${!!d4}`);
  await t4.page.close();

  step("A5: YouTube");
  const yp = await A.ctx.newPage(); const yErr = [], yWorlds = new Map();
  yp.on("console", (m) => { if (m.type() === "error" && /unsafe attempt|rubberband|worklet|chrome-extension/i.test(m.text())) yErr.push(m.text().slice(0, 200)); });
  const ycdp = await A.ctx.newCDPSession(yp);
  ycdp.on("Runtime.executionContextCreated", ({ context: c }) => { if (c.auxData && c.auxData.type === "isolated") yWorlds.set(c.name, c.id); });
  await ycdp.send("Runtime.enable");
  await yp.goto(YT, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await sleep(4000); await yp.click("button.ytp-play-button").catch(() => {});
  const yn = [...yWorlds.keys()].find((k) => /kari/i.test(k));
  let y = { error: "no kari world" };
  if (yn) { const r = await bounded(ycdp.send("Runtime.evaluate", { contextId: yWorlds.get(yn), awaitPromise: true, returnByValue: true, expression: `(async () => {
    const v = document.querySelector('#movie_player video'); if (v && v.paused) { try { await v.play(); } catch (e) {} }
    const pl = document.getElementById('movie_player'); const ad = () => pl && (pl.classList.contains('ad-showing') || pl.classList.contains('ad-interrupting'));
    let w = 0; while (ad() && w < 45000) { const sk = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'); if (sk) sk.click(); await new Promise(r => setTimeout(r, 500)); w += 500; }
    const k = globalThis.__kari; if (!k || !k.audio) return { error: 'no __kari.audio' };
    await k.apply({ st: 1, cents: 0, tempo: 0, range: 16, keyLock: false });
    const t0 = performance.now(); let ms = -1; while (performance.now() - t0 < 10000) { const s = k.audio.status; if (s.attached && s.engine !== 'bypass') { ms = Math.round(performance.now() - t0); break; } await new Promise(r => setTimeout(r, 50)); }
    return { adWaited: w, engineMs: ms, status: k.audio.status, dock: !!document.querySelector('#kari-dock'), ct: v && v.currentTime };
  })()` }), 70000, "youtube evaluate"); y = r.exceptionDetails ? { error: r.exceptionDetails.text } : r.result.value; }
  // The "Unsafe attempt to load URL …/rubberband.wasm" console line is known and benign: CDP shows the one request for
  // the file (sent by _attach) finishing with HTTP 200 while Blink prints the line; it is nondeterministic across runs,
  // also appears on main 202ed3b's own extension/ folder, and the engine runs regardless (docs/LIVE-PROBE.md).
  const benign = yErr.filter((l) => /unsafe attempt to load url .*rubberband\.wasm/i.test(l)), other = yErr.filter((l) => !benign.includes(l));
  row("A5", "YouTube on this build: pitch +1 → engine running (R3); no console error beyond the known benign 'Unsafe attempt … rubberband.wasm' line", !y.error && y.engineMs >= 0 && y.status.engine === "r3" && other.length === 0, y.error ? y.error : `engine ${y.status.engine} after ${y.engineMs} ms · attached ${y.status.attached} · dock ${y.dock} · ad waited ${y.adWaited} ms · benign line ${benign.length ? "present" : "absent"} · other errors ${JSON.stringify(other)}`);
  await yp.close();
} catch (e) { row("A0", "phase A ran to the end", false, String(e && e.stack || e).slice(0, 400)); }
const swA = A.swLines.slice();
await A.close();

/* ================================================================ phase B: the build as it is right after a user's Allow */
step("B: granted variant");
const vdir = fs.mkdtempSync(path.join(os.tmpdir(), "kari-sc-granted-")); tmp.push(vdir);
fs.cpSync(EXT, vdir, { recursive: true });
{ const mf = JSON.parse(fs.readFileSync(path.join(vdir, "manifest.json"), "utf8"));
  mf.host_permissions = [...new Set([...(mf.host_permissions || []), SC])]; delete mf.optional_host_permissions; mf.name += " (probe: soundcloud granted)";
  fs.writeFileSync(path.join(vdir, "manifest.json"), JSON.stringify(mf, null, 2)); }
const B = await open(vdir, "granted variant");
try {
  const l1 = await B.waitSwLine(/registered \(installed\)/, 6000); const s1 = await B.swState();
  row("B1", "with the host granted, install registers both scripts: '[kari] soundcloud scripts registered (installed)', hook MAIN + bridge ISOLATED", !!l1 && s1.granted && s1.scripts.length === 2 && s1.scripts.includes("kari-sc-hook:MAIN") && s1.scripts.includes("kari-sc-bridge:ISOLATED"), `${l1 || "no line"} · ${JSON.stringify(s1)}`);

  step("B2: fresh tab");
  const t2 = await B.scTab(); const p2 = await t2.play();
  const k2 = await t2.waitKari((v) => v.status && v.status.route === 0, 12000); const d2 = await t2.dock();
  row("B2", "new tab with the scripts registered: hook at document_start (not late), dock SHOWN above the bar (visible, on screen, takes the hit test), route 0 after play, no fault", p2 && !!d2 && d2.shown && !!k2 && k2.hookReady && k2.late === false && k2.status.route === 0 && !k2.status.fault && !d2.fault,
    `playing ${p2} · dock ${!!d2} shown ${d2 && d2.shown} (vis ${d2 && d2.vis}, above bar ${d2 && d2.aboveBar}, rect y ${d2 && d2.rect.y} h ${d2 && d2.rect.h}, bar top ${d2 && d2.barTop}, blob on screen ${d2 && d2.blobOnScreen}, hit ${d2 && d2.hit}) fault "${d2 && d2.fault}" · hookReady ${k2 && k2.hookReady} late ${k2 && k2.late} route ${k2 && k2.status && k2.status.route} ctx ${k2 && k2.status && k2.status.ctxState}`);
  await t2.page.close();

  step("B3: tab open and playing before the grant → icon");
  await B.inSw(() => chrome.scripting.unregisterContentScripts());
  const t3 = await B.scTab(); const p3 = await t3.play();
  const before3 = await t3.kari();
  const tid3 = await B.tabIdOf(t3.page);
  const a3 = tid3 === null ? "no tab id" : await B.inSw((t) => globalThis.__kari.soundcloud.activate(t), { id: tid3, url: t3.page.url() });
  const inj3 = B.lastSwLine(/injected into tab/);
  const d3 = await t3.waitDock(8000);
  const k3 = await t3.waitKari((v) => v.lateFault === true, 6000);
  const fault3 = (await t3.dock())?.fault || null;
  row("B3", "tab open and PLAYING before the grant, icon path: injected without a reload; the dock is shown and says 'reload this page'", p3 && before3.world === false && a3 === "injected" && !!inj3 && !!d3 && d3.shown && !!k3 && k3.late === true && k3.lateFault === true && /reload this page/.test(fault3 || ""),
    `playing ${p3} · before: world ${before3.world} · activate → ${a3} · ${inj3 || "no inject line"} · dock ${!!d3} shown ${d3 && d3.shown} · late ${k3 && k3.late} lateFault ${k3 && k3.lateFault} · fault "${fault3}"`);

  step("B4: reload that tab");
  await t3.page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await t3.page.locator("#onetrust-close-btn-handler").first().click({ timeout: 4000 }).catch(() => {});
  const k4b = await t3.waitKari((v) => v.hookReady, 10000);
  row("B4", "after the reload the registered scripts run at document_start: hook ready, not late, no notice", !!k4b && k4b.hookReady && k4b.late === false && !k4b.lateFault, `hookReady ${k4b && k4b.hookReady} late ${k4b && k4b.late} lateFault ${k4b && k4b.lateFault}`);
  await t3.page.close();

  step("B5: tab open and idle before the grant → icon → play");
  await B.inSw(() => chrome.scripting.unregisterContentScripts());
  const t5 = await B.scTab(); await sleep(1500);
  const before5 = await t5.kari();
  const tid5 = await B.tabIdOf(t5.page);
  const a5 = tid5 === null ? "no tab id" : await B.inSw((t) => globalThis.__kari.soundcloud.activate(t), { id: tid5, url: t5.page.url() });
  const k5a = await t5.waitKari((v) => v.hookReady, 6000);
  const p5 = await t5.play();
  const k5 = await t5.waitKari((v) => v.lateFault === true, 8000);
  const fault5 = (await t5.dock())?.fault || null;
  // SoundCloud builds its graph at hydration (~6.5 s after load, measured 2026-10-15), before any click: an idle tab that
  // finished loading before the grant is already past the point a late hook can wrap, so the honest outcome is the notice.
  row("B5", "tab open and IDLE before the grant, icon path: injected (late), dock up at once; on play the graph predates the hook (built at hydration) → 'reload this page'", before5.world === false && a5 === "injected" && !!k5a && k5a.late === true && p5 && !!k5 && k5.lateFault === true && /reload this page/.test(fault5 || ""),
    `before: world ${before5.world} · activate → ${a5} · late ${k5a && k5a.late} · playing ${p5} · route ${k5 && k5.status && k5.status.route} lateFault ${k5 && k5.lateFault} · fault "${fault5}"`);
  const again = tid5 === null ? "-" : await B.inSw((t) => globalThis.__kari.soundcloud.activate(t), { id: tid5, url: t5.page.url() });
  row("B6", "icon again on the same tab → present (the bridge answers the ping), nothing injected twice", again === "present", `activate → ${again}`);
  await t5.page.close();
} catch (e) { row("B0", "phase B ran to the end", false, String(e && e.stack || e).slice(0, 400)); }
const swB = B.swLines.slice();
await B.close();

/* ---- what only a human can do ---- */
row("H1", "HUMAN: on a SoundCloud tab click Kari's icon → Chrome's bubble → Allow. Expect: SW console '[kari] soundcloud scripts registered (action click)' then 'injected into tab N'; the dock appears above the bar (or says 'reload this page' if the track was already playing)", null, "needs the permission bubble");
row("H2", "HUMAN: settings → Sites → SoundCloud off. Expect: '[kari] soundcloud scripts unregistered (permission removed)'; a new SoundCloud tab shows no dock; YouTube unaffected", null, "needs the permission bubble");
row("H3", "HUMAN: wait 30 s with no SoundCloud or settings tab open (the worker goes Inactive on the card), then grant from the switch. Expect: the worker starts and logs 'registered (permission added)' — permissions.onAdded is a registered listener (Chrome's own prefs list it under serviceworkerevents)", null, "needs the permission bubble and an idle worker");

const report = { ext: EXT, track: TRACK, rows, sw: { production: swA.slice(-12), granted: swB.slice(-12) } };
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`sc-grant · ${EXT}`);
  for (const r of rows) console.log(`${r.pass === null ? "----" : r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(4)} ${r.check}\n            ${r.detail}`);
  console.log("SW lines, production:"); for (const l of swA) console.log("  " + l);
  console.log("SW lines, granted variant:"); for (const l of swB) console.log("  " + l);
}
await cleanupAll(failed ? 1 : 0);
