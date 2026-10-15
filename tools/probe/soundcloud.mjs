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
// --json   print the report as JSON (for assertions) instead of the table.
//
// Exit: 0 played · 1 play never started within 20 s · 2 setup failed (no test build, page did not load).
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
const KARI = flag("--kari"), JSON_OUT = flag("--json"), HEADED = flag("--headed"), VERBOSE = flag("--verbose");
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
  const st = await evalKari("(() => { const k = globalThis.__kari; if (!k) return null; const a = k.audio; return { status: a && a.status, ctxState: a && a.ctx ? a.ctx.state : null, params: k.params }; })()");
  kari = { dock, isolated: st, lines: kariLines.slice(-30), errors: errors.slice(-10), scripts: (manifest.content_scripts || []).filter((c) => (c.matches || []).some((m) => m.includes("soundcloud"))).flatMap((c) => c.js) };
}

const graph = !!(snap && snap.contexts.length && snap.sources.length);
const attached = !!(snap && (snap.worklets > 0 || (kari && kari.dock) || (kari && kari.isolated && kari.isolated.value && kari.isolated.value.status && kari.isolated.value.status.attached)));
const verdict = `${graph ? "SoundCloud graph present" : "SoundCloud graph NOT seen"}, ${attached ? "Kari attached" : "Kari not attached"}`;
const report = { url, title: status, played, playMs, clicked, verdict, graph: snap, rms, kari, browser: context.browser()?.version() || null };

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
    row("kari isolated world", !kari.isolated.world ? "none" : kari.isolated.error ? "error: " + kari.isolated.error : !kari.isolated.value ? "present, no __kari" : kari.isolated.value.status ? `__kari.audio.status ${JSON.stringify(kari.isolated.value.status)}, ctx ${kari.isolated.value.ctxState}` : "__kari present, audio not created");
    row("[kari] lines", kari.lines.length ? kari.lines.length + " (below)" : "none");
    if (kari.errors.length) row("errors", kari.errors.length + " (below)");
  }
  row("verdict", verdict);
  const w = Math.max(...rows.map((r) => r[0].length));
  console.log(rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n"));
  if (kari) for (const l of [...kari.lines, ...kari.errors]) console.log("  " + l);
}
await cleanup(played ? 0 : 1);
