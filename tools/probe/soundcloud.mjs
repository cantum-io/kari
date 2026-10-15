// SoundCloud probe: headless Chromium with the Kari test build, one track, a table of what the page's audio graph is
// doing. Used for the SoundCloud rows of docs/LIVE-PROBE.md. Not part of the shipped extension.
//
//   KARI_TEST_HOSTS=soundcloud npm run build          (from the repo root: test-build/soundcloud/)
//   node tools/probe/soundcloud.mjs <soundcloud track url> [--kari] [--json] [--headed] [--ext dir] [--settle ms]
//
// The harness installs its own MAIN-world patch before any page script (Playwright addInitScript, the same
// document_start MAIN-world position the hook uses). The patch only observes: it wraps AudioContext,
// createMediaElementSource, AudioNode connect/disconnect, document.createElement for media elements and the
// playbackRate setter, always calls through and never changes an argument or a return value, so it composes with
// Kari's own wrapper in either order. On every connect into a destination it also taps the same source into an
// analyser of its own, which is how "RMS at the destination" is read: the sum of what reaches the speakers.
//
// --kari   also reads Kari: [kari] console lines (page and service worker), the dock's engine and a/v readouts if the
//          dock mounted, and __kari.audio.status from the extension's isolated world when it exists.
// --loop   (implies --kari) beat loops through the dock, v2: the loop row sits under the steppers with Full control
//          OFF; first let the in-house tempo detector listen (the readout goes "learning…" → "N bpm" within ~8 s of
//          play, or "tap"), then click Tap five times 500 ms apart (a tap overrides the detector), click "1 bar", read
//          the loop status from the dock and from __kari.status, the RMS at the destination while the loop runs, the
//          element clock (slip: the track underneath keeps moving), then click the lit "1 bar" again: it releases.
// --json   print the report as JSON (for assertions) instead of the table.
//
// Exit: 0 played · 1 play never started within 20 s · 2 setup failed (no test build, page did not load) · 3 the --loop
// check failed (played, but no 1-bar loop latched, or it was silent, or the second click did not release it).
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const url = argv.find((a) => /^https:\/\/(www\.|m\.)?soundcloud\.com\//.test(a));
const LOOP = flag("--loop");
const KARI = flag("--kari") || LOOP, JSON_OUT = flag("--json"), HEADED = flag("--headed"), VERBOSE = flag("--verbose");
const EXT = path.resolve(opt("--ext", path.join(here, "../../test-build/soundcloud")));
const SETTLE = +opt("--settle", 2500); // after play starts: SoundCloud mutes the first 100 ms, Kari crossfades in
const PLAY_TIMEOUT = 20000, RMS_MS = 2000;

const die = (code, msg) => { console.error(msg); process.exit(code); };
if (!url) die(2, "usage: node tools/probe/soundcloud.mjs <https://soundcloud.com/artist/track> [--kari] [--json] [--headed]");
if (!fs.existsSync(path.join(EXT, "manifest.json"))) die(2, `no test build at ${EXT}\nrun from the repo root: KARI_TEST_HOSTS=soundcloud npm run build`);
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
if (!(manifest.host_permissions || []).some((h) => h.includes("soundcloud.com"))) die(2, `${EXT} has no soundcloud.com host permission: build it with KARI_TEST_HOSTS=soundcloud`);

// ---------------------------------------------------------------- MAIN-world observer (runs before page scripts)
function observer() {
  if (window.__scProbe) return;
  const native = (f) => typeof f === "function" && /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f));
  const P = (window.__scProbe = { t0: performance.now(), contexts: [], sources: [], edges: [], els: [], log: [], nodes: new Map(), seq: 0, taps: new Map(), tapped: new Set(), order: {} });
  const now = () => Math.round(performance.now() - P.t0);
  const id = (n) => { let r = P.nodes.get(n); if (!r) { r = { id: ++P.seq, type: (n && n.constructor && n.constructor.name) || "?" }; P.nodes.set(n, r); } return r.id; };
  const AC = window.AudioContext, ACP = AC.prototype, ANP = AudioNode.prototype, HMP = HTMLMediaElement.prototype;
  P.order.atInstall = { createMediaElementSource: native(ACP.createMediaElementSource) ? "native" : "already wrapped", connect: native(ANP.connect) ? "native" : "already wrapped" };
  const oConnect = ANP.connect, oDisconnect = ANP.disconnect, oCMES = ACP.createMediaElementSource;
  const onCtx = (c) => { if (c && !P.contexts.includes(c)) { P.contexts.push(c); P.log.push([now(), "AudioContext"]); } };
  window.AudioContext = new Proxy(AC, { construct(t, a, nt) { const c = Reflect.construct(t, a, nt); onCtx(c); return c; } });

  function tapFor(ctx) { // ctx → GainNode summing every source that reaches ctx.destination → analyser
    let t = P.taps.get(ctx);
    if (!t) {
      const sum = ctx.createGain(), an = ctx.createAnalyser();
      an.fftSize = 2048; an.smoothingTimeConstant = 0;
      oConnect.call(sum, an); // analysers are pulled by the renderer without reaching the destination
      t = { sum, an }; P.taps.set(ctx, t);
    }
    return t;
  }
  function noteEl(el, how) {
    if (!el || P.els.some((e) => e.el === el)) return;
    const rec = { el, how, t: now(), rates: [] };
    P.els.push(rec);
    for (const ev of ["playing", "pause", "seeking", "seeked", "ratechange", "ended", "emptied"]) el.addEventListener(ev, () => P.log.push([now(), ev + " #" + P.els.indexOf(rec) + (ev === "ratechange" ? " " + el.playbackRate : "")]));
  }

  ACP.createMediaElementSource = function (el) {
    const n = oCMES.apply(this, arguments);
    try { onCtx(this); noteEl(el, "createMediaElementSource"); P.sources.push({ node: n, el, id: id(n), t: now() }); P.log.push([now(), "createMediaElementSource → node " + id(n)]); } catch (_) {}
    return n;
  };
  ANP.connect = function (dest) {
    const r = oConnect.apply(this, arguments);
    try {
      onCtx(this.context);
      if (dest instanceof AudioNode) {
        P.edges.push({ from: id(this), to: id(dest), on: true, t: now() });
        if (dest instanceof AudioDestinationNode && !P.tapped.has(this)) { oConnect.call(this, tapFor(dest.context).sum); P.tapped.add(this); }
      } else if (dest instanceof AudioParam) P.edges.push({ from: id(this), to: "param", on: true, t: now() });
    } catch (_) {}
    return r;
  };
  ANP.disconnect = function (dest) {
    const r = oDisconnect.apply(this, arguments);
    try {
      const all = arguments.length === 0 || typeof dest === "number";
      P.edges.push({ from: id(this), to: all ? "*" : dest instanceof AudioNode ? id(dest) : "param", on: false, t: now() });
      if (P.tapped.has(this) && (all || dest instanceof AudioDestinationNode)) { if (!all) try { oDisconnect.call(this, P.taps.get(this.context).sum); } catch (_) {} P.tapped.delete(this); }
    } catch (_) {}
    return r;
  };
  const oCE = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    const e = oCE.apply(this, arguments);
    try { if (typeof tag === "string" && /^(audio|video)$/i.test(tag)) noteEl(e, "createElement"); } catch (_) {}
    return e;
  };
  const AudioCtor = window.Audio;
  window.Audio = new Proxy(AudioCtor, { construct(t, a, nt) { const e = Reflect.construct(t, a, nt); noteEl(e, "new Audio"); return e; } });
  const rateDesc = Object.getOwnPropertyDescriptor(HMP, "playbackRate");
  Object.defineProperty(HMP, "playbackRate", { ...rateDesc, set(v) { rateDesc.set.call(this, v); try { const r = P.els.find((e) => e.el === this); if (r) { r.rates.push([now(), +v]); if (r.rates.length > 40) r.rates.shift(); } } catch (_) {} } });
  P.ours = { createMediaElementSource: ACP.createMediaElementSource, connect: ANP.connect };

  P.snapshot = () => {
    const live = new Map(); // "from>to" → on, replaying the edge log; "*" disconnects clear every edge from a node
    for (const e of P.edges) { if (e.to === "*") { for (const k of [...live.keys()]) if (k.startsWith(e.from + ">")) live.delete(k); } else if (e.on) live.set(e.from + ">" + e.to, true); else live.delete(e.from + ">" + e.to); }
    const out = new Map();
    for (const k of live.keys()) { const [a, b] = k.split(">"); if (!out.has(+a)) out.set(+a, []); out.get(+a).push(b === "param" ? "param" : +b); }
    const type = new Map([...P.nodes.values()].map((r) => [r.id, r.type]));
    const short = (t) => t.replace(/AudioNode$|Node$/, "").replace(/^MediaElementAudioSource$/, "MediaElementSource").replace(/^AudioDestination$/, "destination");
    const walk = (n, seen) => { // first path to a destination, branches shown in braces
      const name = short(type.get(n) || "?");
      if (seen.has(n)) return name + "(loop)";
      const next = (out.get(n) || []).filter((x) => x !== "param");
      if (!next.length) return name;
      const s2 = new Set(seen).add(n);
      return name + " → " + (next.length === 1 ? walk(next[0], s2) : "{" + next.map((x) => walk(x, s2)).join(" | ") + "}");
    };
    const src = P.sources[P.sources.length - 1];
    const elRec = (src && P.els.find((e) => e.el === src.el)) || P.els.find((e) => !e.el.paused) || P.els[0];
    const el = elRec && elRec.el;
    const count = (t) => [...P.nodes.values()].filter((r) => r.type === t).length;
    return {
      contexts: P.contexts.map((c) => ({ state: c.state, sr: c.sampleRate, baseMs: +(c.baseLatency * 1000).toFixed(1), outMs: +((c.outputLatency || 0) * 1000).toFixed(1) })),
      sources: P.sources.map((s) => ({ id: s.id, t: s.t, sameEl: s.el === el })),
      chain: src ? walk(src.id, new Set()) : null,
      gains: count("GainNode"), worklets: count("AudioWorkletNode"),
      types: [...new Set([...P.nodes.values()].map((r) => r.type))],
      tapped: P.tapped.size,
      order: { ...P.order.atInstall, nowOurs: { createMediaElementSource: AudioContext.prototype.createMediaElementSource === P.ours.createMediaElementSource, connect: AudioNode.prototype.connect === P.ours.connect } },
      elements: P.els.map((r) => ({ how: r.how, tag: r.el.tagName.toLowerCase(), inDom: r.el.isConnected, paused: r.el.paused })),
      el: el ? { index: P.els.indexOf(elRec), how: elRec.how, playbackRate: el.playbackRate, preservesPitch: el.preservesPitch, crossorigin: el.getAttribute("crossorigin"), mediaKeys: el.mediaKeys ? "present" : null, src: (el.currentSrc || el.src || "").split(":")[0] || "(none)", paused: el.paused, t: +el.currentTime.toFixed(2), readyState: el.readyState, inDom: el.isConnected, rateSets: elRec.rates } : null,
      log: P.log.slice(-40),
    };
  };
  P.rms = async (ms) => { // RMS at the destination: every source that connects to it, summed
    const ctx = P.contexts.find((c) => P.taps.has(c));
    if (!ctx) return null;
    const an = P.taps.get(ctx).an, buf = new Float32Array(an.fftSize), w = [];
    const end = performance.now() + ms;
    while (performance.now() < end) { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; w.push(Math.sqrt(s / buf.length)); await new Promise((r) => setTimeout(r, 50)); }
    const mean = w.reduce((a, b) => a + b, 0) / (w.length || 1);
    const db = (x) => (x > 0 ? +(20 * Math.log10(x)).toFixed(1) : -Infinity);
    return { windows: w.length, mean: +mean.toFixed(4), min: +Math.min(...w).toFixed(4), max: +Math.max(...w).toFixed(4), dBFS: db(mean), silent: w.filter((x) => x < 1e-4).length, ctxState: ctx.state };
  };
}

// ---------------------------------------------------------------- run
const udd = fs.mkdtempSync(path.join(os.tmpdir(), "kari-sc-udd-"));
const context = await chromium.launchPersistentContext(udd, {
  headless: !HEADED, channel: "chromium", viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--hide-crash-restore-bubble", "--mute-audio"],
});
const cleanup = async (code) => { try { await context.close(); } catch (_) {} fs.rmSync(udd, { recursive: true, force: true }); process.exit(code); };

await context.addInitScript(observer);
const kariLines = [], errors = [];
const pickLine = (where, msg) => { const t = msg.text(); if (t.includes("[kari]")) kariLines.push(`${where} ${msg.type()}: ${t}`); else if (msg.type() === "error" && /kari|worklet|chrome-extension|AudioContext/i.test(t)) errors.push(`${where}: ${t}`); };
context.on("console", (msg) => { if (!msg.page()) pickLine("sw", msg); });
const page = context.pages()[0] || (await context.newPage());
page.on("console", (msg) => pickLine("page", msg));
page.on("pageerror", (e) => { if (VERBOSE || /kari|worklet|AudioContext/i.test(String(e))) errors.push("pageerror: " + String(e.message || e)); });
if (VERBOSE) page.on("console", (msg) => { if (msg.type() === "error" || msg.type() === "warning") console.error(`[page ${msg.type()}] ${msg.text().slice(0, 300)}`); });

// Isolated worlds (for __kari): same CDP route as server.mjs.
const worlds = new Map();
const cdp = await context.newCDPSession(page);
cdp.on("Runtime.executionContextCreated", ({ context: c }) => { if (c.auxData && c.auxData.type === "isolated") worlds.set(c.name, c.id); });
cdp.on("Runtime.executionContextsCleared", () => worlds.clear());
await cdp.send("Runtime.enable");
const kariWorld = () => { const n = [...worlds.keys()].find((k) => /kari/i.test(k)); return n ? worlds.get(n) : null; };
async function evalKari(expr) {
  const id = kariWorld(); if (!id) return { world: false };
  const r = await cdp.send("Runtime.evaluate", { expression: expr, contextId: id, awaitPromise: true, returnByValue: true });
  return r.exceptionDetails ? { world: true, error: r.exceptionDetails.exception?.description || r.exceptionDetails.text } : { world: true, value: r.result.value };
}

const t0 = Date.now();
try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); }
catch (e) { console.error("page did not load: " + e.message); await cleanup(2); }
const status = (await page.evaluate(() => document.title)) || "";

// Cookie banner (OneTrust): take "I'm a GPC user, please maintain my preferences", the opt-out, never "Continue".
// Then close the sign-in dialog a logged-out page opens over the track.
await page.locator("#onetrust-close-btn-handler").first().click({ timeout: 5000 }).catch(() => {});
await page.locator(".modal__closeButton").first().click({ timeout: 3000 }).catch(() => {});

// Play: the bottom bar's button when it is live; on a cold load it is .disabled until something is queued, so the
// track's own hero button starts it (which also fills the bar for later pause/seek checks).
let clicked = null;
const playSelectors = [".playControls .playControls__play:not(.disabled)", ".sc-button-play.playButton", ".fullHero__playButton .sc-button-play", ".sc-button-play:not(.disabled)"];
const deadline = Date.now() + PLAY_TIMEOUT;
async function playing() { return page.evaluate(() => { const P = window.__scProbe; return !!P && P.els.some((r) => !r.el.paused && r.el.currentTime > 0.25); }).catch(() => false); }
let clicks = 0, lastClick = 0;
const bar = () => page.evaluate(() => { const b = document.querySelector(".playControls__play"); const tp = document.querySelector(".playbackTimeline__timePassed span[aria-hidden]"); return (b ? b.className.split(" ").filter((c) => /playing|disabled/.test(c)).join(" ") || "idle" : "no bar") + (tp ? " " + tp.textContent : ""); }).catch(() => "?");
while (Date.now() < deadline && !(await playing())) {
  // A click before the player hydrates is dropped: retry every 2 s, but never while the bar already says playing
  // (the stream is still loading; another click would pause it).
  const before = Date.now() - lastClick > 2000 ? await bar() : "";
  if (before && !before.startsWith("playing")) {
    for (const sel of playSelectors) {
      const loc = page.locator(sel).first();
      if (!(await loc.isVisible().catch(() => false))) continue;
      if (await loc.click({ timeout: 3000 }).then(() => true, () => false)) { clicked = sel; clicks++; lastClick = Date.now(); if (VERBOSE) console.error(`[harness] click ${clicks} ${sel} at ${Date.now() - t0} ms, bar was ${before}`); break; }
    }
  }
  await page.waitForTimeout(250);
}
if (VERBOSE) console.error(`[harness] bar now: ${await bar()}`);
const played = await playing();
const playMs = Date.now() - t0;
if (played) await page.waitForTimeout(SETTLE);

const snap = await page.evaluate(() => window.__scProbe ? window.__scProbe.snapshot() : null);
const rms = played ? await page.evaluate((ms) => window.__scProbe.rms(ms), RMS_MS) : null;

let kari = null;
if (KARI) {
  if (played) { const until = Date.now() + 4000; while (Date.now() < until && !(await page.$("#kari-dock"))) await page.waitForTimeout(250); }
  const dock = await page.evaluate(() => {
    const d = document.querySelector("#kari-dock"); if (!d) return null;
    const sr = d.shadowRoot, q = (b) => (sr && sr.querySelector(`[data-b="${b}"]`) ? sr.querySelector(`[data-b="${b}"]`).textContent.trim() : null);
    return { build: d.dataset.build || null, engine: q("engine"), av: q("av"), host: d.parentElement ? d.parentElement.tagName.toLowerCase() + (d.parentElement.id ? "#" + d.parentElement.id : "") + (d.parentElement.className && typeof d.parentElement.className === "string" ? "." + d.parentElement.className.trim().split(/\s+/)[0] : "") : null };
  });
  // YouTube's content script exposes the controller as __kari.audio; the SoundCloud bridge has no controller in its world and exposes the hook's sanitized status as __kari.status.
  const st = await evalKari("(() => { const k = globalThis.__kari; if (!k) return null; const a = k.audio; return { status: a ? a.status : k.status || null, ctxState: a && a.ctx ? a.ctx.state : (k.status && k.status.ctxState) || null, params: k.params, via: a ? 'audio' : 'status' }; })()");
  kari = { dock, isolated: st, lines: kariLines.slice(-30), errors: errors.slice(-10), scripts: (manifest.content_scripts || []).filter((c) => (c.matches || []).some((m) => m.includes("soundcloud"))).flatMap((c) => c.js) };
}

// ---------------------------------------------------------------- beat loops through the dock (--loop)
// Everything the user would do, done to the dock's own buttons inside its open shadow root; the answers are read from
// three independent places: the dock's readouts, __kari.status in the isolated world (what the hook reported, sanitized)
// and the harness's own analyser at the destination.
const inDock = (sel, what) => page.evaluate(([sel, what]) => {
  const sr = document.querySelector("#kari-dock")?.shadowRoot; if (!sr) return null;
  const el = sr.querySelector(sel); if (!el) return null;
  if (what === "click") { if (el.disabled) return false; el.click(); return true; }
  if (what === "text") return (el.textContent || "").trim();
  if (what === "attr") return { pressed: el.getAttribute("aria-pressed"), disabled: !!el.disabled, hidden: !!el.hidden };
  return null;
}, [sel, what]).catch(() => null);
const until = async (fn, ms, step = 100) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await page.waitForTimeout(step); } return v; };
const kariStatus = async () => { const r = await evalKari("JSON.stringify(globalThis.__kari && globalThis.__kari.status)"); return r.value ? JSON.parse(r.value) : null; };
const elClock = () => page.evaluate(() => { const P = window.__scProbe; const r = P && (P.els.find((e) => !e.el.paused) || P.els[0]); return r ? +r.el.currentTime.toFixed(3) : null; });
let loop = null;
if (LOOP && played) {
  const ORG = '.skin[data-skin="org"] ';
  const L = { auto: null, taps: 0, bpmText: null, latchMs: null, status: null, rms: null, slip: null, released: null, ok: false, fail: null };
  const fail = (why) => { L.fail = L.fail || why; return L; };
  const tempoRo = () => inDock(ORG + '[data-b="tempo"]', "text");
  try {
    if (!(await until(() => inDock(ORG + ".ctl", "attr"), 4000))) throw new Error("dock not mounted");
    // 1. The loop row shows with Full control OFF (v2); the MIDI group lives in the settings aside regardless.
    const full = await inDock(ORG + '[data-a="full"]', "attr");
    if (full && full.pressed === "true") { await inDock(ORG + '[data-a="full"]', "click"); await until(async () => (await inDock(ORG + '.ctl[data-full="0"]', "attr")) !== null, 3000); }
    const loopsRow = await inDock(ORG + ".loops", "attr"); L.loopRowShown = !!loopsRow && !loopsRow.hidden;
    L.fullOff = (await inDock(ORG + '.ctl[data-full="0"]', "attr")) !== null;
    const midiGroup = await inDock('[data-el="midisg"]', "attr"); L.midiGroupShown = !!midiGroup && !midiGroup.hidden;
    if (!L.loopRowShown) throw new Error("loop row hidden (dock has no loop deps)");
    L.pillsBefore = []; for (const v of ["0.5", "1", "4", "8"]) L.pillsBefore.push((await inDock(ORG + `[data-a="loop"][data-v="${v}"]`, "attr"))?.disabled);
    // 2. The in-house detector: the chain attaches on `playing`, the readout says "learning…", then "N bpm" (or "tap").
    const t0a = Date.now();
    L.auto = { first: await tempoRo(), verdict: null, ms: null, status: null };
    const verdict = await until(async () => { const t = await tempoRo(); return t && t !== "learning…" && t !== "" ? t : null; }, 14000, 250);
    L.auto.verdict = verdict; L.auto.ms = verdict ? Date.now() - t0a : null; L.auto.status = await kariStatus();
    // 3. Tap tempo: five taps 500 ms apart = 120 bpm in media time at 1×. A tap overrides the detector's grid.
    for (let i = 0; i < 5; i++) { if (await inDock(ORG + '[data-a="tap"]', "click")) L.taps++; await page.waitForTimeout(500); }
    L.bpmText = await until(async () => { const t = await tempoRo(); const st = await kariStatus(); return t && /bpm/.test(t) && st && st.gridSource === "tap" ? t : null; }, 3000);
    if (!L.bpmText) throw new Error("no tapped bpm after five taps");
    // 4. Latch 1 bar and wait for the dock to say so.
    const t1 = Date.now();
    if (!(await inDock(ORG + '[data-a="loop"][data-v="4"]', "click"))) throw new Error("1 bar button disabled or missing");
    const info = await until(async () => { const t = await inDock(ORG + '[data-b="loopinfo"]', "text"); return t && t.startsWith("1 bar") ? t : null; }, 4000);
    L.latchMs = info ? Date.now() - t1 : null; L.loopInfo = info;
    if (!info) throw new Error("dock never showed a 1-bar loop");
    L.status = await kariStatus();
    L.quarterPressed = (await inDock(ORG + '[data-a="loop"][data-v="4"]', "attr"))?.pressed === "true";
    // 4. Output while looping, and the element clock across it (slip: nothing is seeked, the track underneath moves on).
    const c0 = await elClock();
    L.rms = await page.evaluate((ms) => window.__scProbe.rms(ms), RMS_MS);
    const c1 = await elClock();
    L.slip = { before: c0, after: c1, advanced: c0 !== null && c1 !== null && c1 - c0 > RMS_MS / 1000 * 0.5 };
    L.snap = await page.evaluate(() => { const s = window.__scProbe.snapshot(); return { worklets: s.worklets, chain: s.chain }; });
    // 5. Release: a second click on the lit "1 bar" (there is no × in v2).
    if (!(await inDock(ORG + '[data-a="loop"][data-v="4"]', "click"))) throw new Error("lit 1 bar button disabled or missing");
    const off = await until(async () => { const t = await inDock(ORG + '[data-b="loopinfo"]', "text"); return t === "—" ? t : null; }, 3000);
    L.statusAfter = await kariStatus();
    L.released = off === "—" && !!L.statusAfter && L.statusAfter.loop === 0 && L.statusAfter.loopMs === 0 && (await inDock(ORG + '[data-a="loop"][data-v="4"]', "attr"))?.pressed === "false";
    // 6. The live track again after the slip release: still sound, not silence (a loud loop vs a quiet intro is the song, not a doubled path).
    L.rmsAfter = await page.evaluate((ms) => window.__scProbe.rms(ms), RMS_MS);
    const st = L.status;
    L.ok = !!st && st.loop === 4 && st.loopMs > 0 && st.bpm !== null && st.gridSource === "tap" && st.attached === true && L.fullOff
      && !!L.rms && L.rms.mean > 1e-3 && L.rms.silent === 0 && L.slip.advanced && L.released && L.quarterPressed
      && !!L.rmsAfter && L.rmsAfter.mean > 1e-3 && L.rmsAfter.silent === 0;
    if (!L.ok) fail("a loop assertion did not hold (see the loop rows)");
  } catch (e) { fail(e.message); }
  loop = L;
}

const graph = !!(snap && snap.contexts.length && snap.sources.length);
const attached = !!(snap && (snap.worklets > 0 || (kari && kari.dock) || (kari && kari.isolated && kari.isolated.value && kari.isolated.value.status && kari.isolated.value.status.attached)));
const verdict = `${graph ? "SoundCloud graph present" : "SoundCloud graph NOT seen"}, ${attached ? "Kari attached" : "Kari not attached"}${loop ? (loop.ok ? ", 1-bar loop latched and released" : `, 1-BAR LOOP FAILED (${loop.fail})`) : ""}`;
const report = { url, title: status, played, playMs, clicked, verdict, graph: snap, rms, kari, loop, browser: context.browser()?.version() || null };

if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  const rows = [];
  const row = (k, v) => rows.push([k, v === undefined || v === null ? "—" : typeof v === "string" ? v : JSON.stringify(v)]);
  const el = snap && snap.el;
  row("track", url);
  row("play started", played ? `yes, ${playMs} ms after load (clicked ${clicked || "nothing"} ×${clicks})` : `NO within ${PLAY_TIMEOUT / 1000} s (clicked ${clicked || "nothing"} ×${clicks})`);
  row("AudioContext", snap ? (snap.contexts.length ? snap.contexts.map((c) => `${c.state} ${c.sr} Hz base ${c.baseMs} ms out ${c.outMs} ms`).join("; ") + ` (${snap.contexts.length})` : "none") : "observer missing");
  row("MediaElementAudioSourceNode", snap ? (snap.sources.length ? `${snap.sources.length} created (first at ${snap.sources[0].t} ms)` : "none") : null);
  row("gain chain", snap && snap.chain);
  row("node types", snap && snap.types.join(", "));
  row("hook order", snap && `at install: cmes ${snap.order.createMediaElementSource}, connect ${snap.order.connect}; harness still outermost: cmes ${snap.order.nowOurs.createMediaElementSource}, connect ${snap.order.nowOurs.connect}`);
  row("element", el && `#${el.index} via ${el.how}, src ${el.src}, in DOM ${el.inDom}, readyState ${el.readyState}, t ${el.t}`);
  row("element.playbackRate", el && `${el.playbackRate} (sets: ${el.rateSets.map((r) => r[1]).join(", ") || "none"}) preservesPitch ${el.preservesPitch}`);
  row("crossorigin", el && (el.crossorigin === null ? "(absent)" : el.crossorigin));
  row("mediaKeys", el && (el.mediaKeys || "null"));
  row("RMS at destination, 2 s", rms ? `mean ${rms.mean} (${rms.dBFS} dBFS), min ${rms.min}, max ${rms.max}, ${rms.silent}/${rms.windows} windows silent, ctx ${rms.ctxState}` : played ? "no tap (nothing connected to a destination)" : "not measured");
  if (kari) {
    row("kari scripts in test build", kari.scripts.length ? kari.scripts.join(", ") : "none (hook not built)");
    row("kari dock", kari.dock ? `engine ${kari.dock.engine}, a/v ${kari.dock.av}, in ${kari.dock.host}, build ${kari.dock.build}` : "not mounted");
    row("kari isolated world", !kari.isolated.world ? "none" : kari.isolated.error ? "error: " + kari.isolated.error : !kari.isolated.value ? "present, no __kari" : kari.isolated.value.status ? `__kari.${kari.isolated.value.via === "audio" ? "audio.status" : "status"} ${JSON.stringify(kari.isolated.value.status)}, ctx ${kari.isolated.value.ctxState}` : "__kari present, audio not created");
    row("[kari] lines", kari.lines.length ? kari.lines.length + " (below)" : "none");
    if (kari.errors.length) row("errors", kari.errors.length + " (below)");
  }
  if (loop) {
    const st = loop.status, sa = loop.statusAfter;
    row("loop: dock rows", `Full control ${loop.fullOff ? "off" : "ON"}, loop row ${loop.loopRowShown ? "shown" : "HIDDEN"}, pills disabled before a tempo ${JSON.stringify(loop.pillsBefore)}, MIDI group ${loop.midiGroupShown ? "shown" : "HIDDEN"}`);
    if (loop.auto) row("loop: auto tempo", `readout "${loop.auto.first || ""}" → "${loop.auto.verdict || "(nothing within 14 s)"}"${loop.auto.ms ? ` after ${loop.auto.ms} ms` : ""}; status bpm ${loop.auto.status?.bpm ?? "null"}, grid ${loop.auto.status?.gridSource ?? "null"}, learning ${loop.auto.status?.learning}, attached ${loop.auto.status?.attached}`);
    row("loop: tap", `${loop.taps} taps 500 ms apart → readout "${loop.bpmText || "(none)"}"`);
    row("loop: 1-bar latch", loop.loopInfo ? `dock "${loop.loopInfo}" ${loop.latchMs} ms after the click, 1 bar pill pressed ${loop.quarterPressed}` : "NOT latched");
    row("loop: __kari.status", st ? `loop ${st.loop}, loopMs ${st.loopMs}, bpm ${st.bpm}, grid ${st.gridSource}, engine ${st.engine}, attached ${st.attached}, route ${st.route}` : "none");
    row("loop: RMS at destination, 2 s", loop.rms ? `mean ${loop.rms.mean} (${loop.rms.dBFS} dBFS), min ${loop.rms.min}, max ${loop.rms.max}, ${loop.rms.silent}/${loop.rms.windows} windows silent` : "not measured");
    row("loop: slip", loop.slip ? `element clock ${loop.slip.before} → ${loop.slip.after} s while looping (${loop.slip.advanced ? "kept moving" : "STALLED"})` : "—");
    row("loop: graph", loop.snap ? `${loop.snap.worklets} worklet node(s): ${loop.snap.chain}` : "—");
    row("loop: release (2nd click)", loop.released ? `dock "—", status loop ${sa.loop}, loopMs ${sa.loopMs}, pill unlit` : `NOT released${sa ? ` (status loop ${sa.loop})` : ""}`);
    row("loop: RMS after release, 2 s", loop.rmsAfter ? `mean ${loop.rmsAfter.mean} (${loop.rmsAfter.dBFS} dBFS), min ${loop.rmsAfter.min}, max ${loop.rmsAfter.max}, ${loop.rmsAfter.silent}/${loop.rmsAfter.windows} windows silent` : "not measured");
    if (loop.fail) row("loop: failure", loop.fail);
  }
  row("verdict", verdict);
  const w = Math.max(...rows.map((r) => r[0].length));
  console.log(rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n"));
  if (kari) for (const l of [...kari.lines, ...kari.errors]) console.log("  " + l);
}
await cleanup(!played ? 1 : loop && !loop.ok ? 3 : 0);
