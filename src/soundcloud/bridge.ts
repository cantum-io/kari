// Kari — SoundCloud bridge (isolated world, document_start, IIFE). Owns the dock in the bottom bar, settings and
// per-track memory, and relays parameters to the MAIN-world hook. The hook's world is hostile: every message from it
// goes through protocol.accept and sanitizeStatus before it touches the dock.
import { Dock } from "../content/ui/dock";
import type { AudioStatus } from "../content/audio/controller";
import { loadSettings, saveSettings, onSettingsChange, loadVideo, saveVideo, type Settings } from "../shared/storage";
import { DEFAULT_PARAMS, type Params, isNeutral, stepSt, stepTempo } from "../shared/math";
import { NS, accept, makeNonce, sanitizeStatus, EMPTY_STATUS, type HookStatus } from "./protocol";
import { bar, barPlaying, barShown, waitForBar, onBarChange, currentTrackKey } from "./sc";
import { memoryId } from "./track-key";

(() => {
  // Once per page: the service worker injects this file into an open tab on a grant or an icon click (background/
  // soundcloud.ts) and may meet the registered copy already running; the test build also lists it statically.
  const g = globalThis as any;
  if (g.__kari?.site === "soundcloud") { console.debug("[kari] bridge already running on this page"); return; }

  const origin = location.origin;
  const nonce = makeNonce();
  let settings: Settings;
  let params: Params = { ...DEFAULT_PARAMS };
  let dock: Dock | null = null;
  let currentKey = "";
  let hookReady = false;
  let late = false;        // the hook said it ran after the page loaded (injected, not document_start)
  let sourceSeen = false;  // the hook wrapped a MediaElementSource on this page
  let lateFault = false;   // shown on the dock: late, nothing wrapped, and the bar is playing → only a reload helps
  let status: HookStatus = { ...EMPTY_STATUS };
  let level = 0;
  let saveTimer = 0; let lastSaved = "";
  let helloAt = 0;
  const log: string[] = []; // last events, for the live probe (never leaves the page)
  const note = (s: string) => { log.push(`${new Date().toISOString().slice(11, 23)} ${s}`); if (log.length > 60) log.shift(); };

  const post = (m: Record<string, unknown>, transfer?: Transferable[]) => window.postMessage({ ns: NS, dir: "b2h", nonce, ...m }, origin, transfer || []);

  async function applyParams(p: Params) {
    params = p;
    post({ type: "apply", params: { st: p.st, cents: p.cents, tempo: p.tempo, keyLock: p.keyLock, range: p.range } });
    if (settings?.rememberPerVideo && currentKey) {
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const m = isNeutral(p) ? null : { st: p.st, cents: p.cents, tempo: p.tempo, keyLock: p.keyLock, range: p.range };
        const k = currentKey + ":" + (m ? JSON.stringify(m) : "");
        if (k === lastSaved) return;
        lastSaved = k;
        saveVideo(memoryId(currentKey), m).then(() => console.debug("[kari] saved", currentKey, m ? JSON.stringify(m) : "cleared"));
      }, 400);
    }
  }

  let engineSentAt = 0;
  async function sendEngine() {
    const now = Date.now(); if (now - engineSentAt < 5000) return; engineSentAt = now; // the page can see the nonce; never let it make us refetch in a loop
    try {
      const wasm = await (await fetch(chrome.runtime.getURL("rubberband.wasm"))).arrayBuffer();
      post({ type: "engine", workletUrl: chrome.runtime.getURL("worklet.js"), wasm }, [wasm]);
      note("engine bytes sent");
    } catch (err) { note("engine fetch failed " + String(err)); }
  }
  async function sendWorkletSource() {
    try { const source = await (await fetch(chrome.runtime.getURL("worklet.js"))).text(); post({ type: "worklet-source", source }); note("worklet source sent (blob fallback)"); }
    catch (err) { note("worklet source fetch failed " + String(err)); }
  }

  // The hook reports no loop state (no loop path on SoundCloud in this build); the dock's status type carries the fields, so fill them.
  const asAudioStatus = (s: HookStatus): AudioStatus => ({ loop: 0, loopMs: 0, bpm: null, gridSource: null, ...s });
  function setStatus(s: HookStatus) { status = s; dock?.setStatus(asAudioStatus(lateFault && !s.fault ? { ...s, fault: "late" } : s)); }

  // Injected after SoundCloud built its graph (it does so at hydration, ~6.5 s after load, before any click — measured
  // 2026-10-15): the hook cannot wrap a source node that already exists, and the page plays on without Kari. Say so on
  // the dock while it matters (the bar playing, nothing wrapped); a source event or an attached status clears it — the
  // graph was built after the hook arrived (a tab injected within seconds of its load) and everything works.
  let lateTimer = 0;
  function watchLate() {
    clearInterval(lateTimer);
    lateTimer = window.setInterval(() => {
      if (sourceSeen || status.attached) { clearInterval(lateTimer); if (lateFault) { lateFault = false; setStatus(status); } return; }
      const want = late && barPlaying();
      if (want !== lateFault) { lateFault = want; setStatus(status); note(want ? "late: player already running, reload needed" : "late notice cleared"); }
    }, 1000);
  }

  /** The track under the badge changed (or the bar re-rendered): reload memory and push params, like YouTube's mount. */
  async function syncTrack(reason: string) {
    const key = currentTrackKey() || "";
    if (key === currentKey) return;
    currentKey = key;
    settings = settings || await loadSettings();
    const mem = settings.rememberPerVideo && key ? await loadVideo(memoryId(key)) : null;
    params = mem ? { ...DEFAULT_PARAMS, ...mem } : { ...DEFAULT_PARAMS, range: settings.defaultRange, keyLock: settings.keyLockDefault };
    lastSaved = key + ":" + (mem ? JSON.stringify({ st: params.st, cents: params.cents, tempo: params.tempo, keyLock: params.keyLock, range: params.range }) : "");
    console.debug("[kari] track", key || "(none)", reason, "memory:", mem ? JSON.stringify(mem) : "none");
    dock?.render();
    await applyParams(params);
  }

  async function mount() {
    const host = await waitForBar(); if (!host) return;
    settings = settings || await loadSettings();
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    if (dock && !host.contains(dock.hostEl)) { dock.destroy(); dock = null; }
    if (!dock) {
      dock = new Dock(host, {
        getParams: () => params,
        apply: (p) => { applyParams(p); },
        setCompare: (on) => post({ type: "compare", on }),
        settings,
        saveSettings: (patch) => { saveSettings(patch).then(s => { settings = s; dock?.applySettings(s); if (patch.engine) post({ type: "engine-pref", pref: s.engine }); }); },
        level: () => level,
        optionsUrl: chrome.runtime.getURL("options.html"),
        site: "sc",
        // A panel above the bar: the bar is ~48 px tall, the dock needs room to stand on it. Two parts are load-bearing
        // (both found 2026-10-15 by measuring, after the dock had "mounted" and shown nothing): `top:auto`, because the
        // dock's own :host rule sets inset:0 and with top:0 in force the browser drops bottom:100% and hangs the panel
        // below the bar's top edge, off-screen; and `visibility:visible`, because SoundCloud's .playControls container is
        // visibility:hidden (its __inner section re-shows itself) and the dock would inherit hidden.
        mountStyle: "position:absolute;left:0;right:0;top:auto;bottom:100%;height:320px;visibility:visible;pointer-events:none;z-index:60",
      });
      setStatus(status);
      // The bar slides in with `m-visible` on .playControls (nothing queued = no bar); the dock follows it the way it
      // follows YouTube's autohide, through the same hide switch.
      const followBar = () => dock?.setControlsHidden(!barShown(host));
      followBar();
      onBarChange(host, () => { syncTrack("bar"); followBar(); if (!host.contains(dock!.hostEl)) mount(); });
      post({ type: "engine-pref", pref: settings.engine });
      // No hook within 3 s of the dock = the MAIN-world script never ran on this page (opened before the permission
      // was granted). Only a reload fixes that; say so, nothing else works without the element.
      setTimeout(() => { if (!hookReady) setStatus({ ...status, fault: "hook-missing" }); }, 3000);
    }
    await syncTrack("mount");
  }

  window.addEventListener("message", (e) => {
    const d = accept(e, window, origin, "h2b", nonce);
    if (!d) return;
    switch (d.type) {
      case "hello": { const now = Date.now(); if (now - helloAt > 500) { helloAt = now; post({ type: "init" }); } return; }
      case "ready": hookReady = true; late = d.late === true; note(late ? "hook ready (late)" : "hook ready"); if (status.fault === "hook-missing") setStatus({ ...status, fault: null }); if (late) watchLate(); return;
      case "need-engine": sendEngine(); return;
      case "need-worklet-source": sendWorkletSource(); return;
      case "status": setStatus(sanitizeStatus(d.status)); return;
      case "level": level = typeof d.v === "number" && Number.isFinite(d.v) ? Math.min(1, Math.max(0, d.v)) : 0; return;
      case "event": {
        const ev = d.ev as any;
        if (!ev || typeof ev !== "object" || typeof ev.type !== "string") return;
        try { note(`event ${JSON.stringify(ev).slice(0, 160)}`); } catch (_) { note("event (unserialisable)"); }
        if (ev.type === "media" && (ev.ev === "loadstart" || ev.ev === "emptied")) syncTrack(String(ev.ev)); // the element is detached: its events reach only the hook
        if (ev.type === "source") sourceSeen = true;
        if (ev.type === "source" || ev.type === "media") { if (!dock) mount(); }
        return;
      }
      case "note": note(`hook note ${String(d.note).slice(0, 120)} ${String(d.reason || "").slice(0, 80)}`); return;
    }
  });

  // The service worker asks before injecting (background/soundcloud.ts): answer synchronously, never return true.
  chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
    if (m?.type === "kari:ping") sendResponse({ site: "soundcloud", dock: !!dock, hookReady, late });
  });

  // keyboard commands from the service worker (same ids as YouTube; never the page's own keys)
  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type !== "kari:command" || !dock) return;
    const map: Record<string, () => Params> = { "pitch-up": () => stepSt(params, 1), "pitch-down": () => stepSt(params, -1), "tempo-up": () => stepTempo(params, 1), "tempo-down": () => stepTempo(params, -1) };
    const f = map[m.command]; if (f) { applyParams(f()); dock.react(); dock.render(); }
  });

  // Debug surface for the live probe — isolated world only, invisible to the page.
  (globalThis as any).__kari = { site: "soundcloud", get params() { return params; }, get status() { return status; }, get dock() { return dock; }, get settings() { return settings; }, get key() { return currentKey; }, get hookReady() { return hookReady; }, get late() { return late; }, get lateFault() { return lateFault; }, get log() { return log.slice(); }, apply: (p: Params) => applyParams(p) };

  onSettingsChange(s => { settings = s; dock?.applySettings(s); post({ type: "engine-pref", pref: s.engine }); });
  post({ type: "init" }); // in case the hook loaded first; it answers hello → init again otherwise
  if (bar()) mount(); else waitForBar().then(b => { if (b) mount(); });
})();
