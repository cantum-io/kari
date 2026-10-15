// Kari — SoundCloud bridge (isolated world, document_start, IIFE). Owns the dock in the bottom bar, settings and
// per-track memory, and relays parameters to the MAIN-world hook. The hook's world is hostile: every message from it
// goes through protocol.accept and sanitizeStatus before it touches the dock.
import { Dock } from "../content/ui/dock";
import { loadSettings, saveSettings, onSettingsChange, loadVideo, saveVideo, type Settings } from "../shared/storage";
import { DEFAULT_PARAMS, type Params, isNeutral, stepSt, stepTempo } from "../shared/math";
import { NS, accept, makeNonce, sanitizeStatus, parseLoopAck, EMPTY_STATUS, type HookStatus } from "./protocol";
import { LoopRequests } from "./loops";
import { Midi, type MidiAction } from "../content/midi";
import type { LoopBeats } from "../content/beat/grid";
import { bar, waitForBar, onBarChange, currentTrackKey } from "./sc";
import { memoryId } from "./track-key";

(() => {
  const origin = location.origin;
  const nonce = makeNonce();
  let settings: Settings;
  let params: Params = { ...DEFAULT_PARAMS };
  let dock: Dock | null = null;
  let midi: Midi | null = null;
  let currentKey = "";
  let hookReady = false;
  let status: HookStatus = { ...EMPTY_STATUS };
  let level = 0;
  let saveTimer = 0; let lastSaved = "";
  let helloAt = 0;
  const log: string[] = []; // last events, for the live probe (never leaves the page)
  const note = (s: string) => { log.push(`${new Date().toISOString().slice(11, 23)} ${s}`); if (log.length > 60) log.shift(); };

  const post = (m: Record<string, unknown>, transfer?: Transferable[]) => window.postMessage({ ns: NS, dir: "b2h", nonce, ...m }, origin, transfer || []);

  // Beat loops: the grid and the latch live in the hook's controller (it reads the clock from the real element); the
  // dock's buttons and the MIDI pads post commands, state comes back in status. A latch resolves on the hook's ack.
  const loops = new LoopRequests(cmd => post({ type: "loop", ...cmd }));
  const LOOP_BEATS: Partial<Record<MidiAction, LoopBeats>> = { "loop-h": 0.5, "loop-1": 1, "loop-bar": 4, "loop-2bar": 8 };
  function loopAction(a: MidiAction) { // from a MIDI pad; the dock's own buttons call loops directly. Click + MIDI only.
    const beats = LOOP_BEATS[a];
    if (beats) { if (status.loop === beats) loops.release(); else loops.latch(beats).then(ok => { if (ok) dock?.react(); dock?.render(); }); } // a pad toggles, like the button
    else if (a === "tap") { loops.tap(); dock?.react(); }
    dock?.render();
  }

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

  function setStatus(s: HookStatus) { status = s; dock?.setStatus(s); } // HookStatus is AudioStatus plus route and ctxState

  /** The track under the badge changed (or the bar re-rendered): reload memory and push params, like YouTube's mount. */
  async function syncTrack(reason: string) {
    const key = currentTrackKey() || "";
    if (key === currentKey) return;
    const hadKey = !!currentKey;
    currentKey = key;
    if (hadKey) loops.clear(); // the beat grid belongs to the song: a new track starts without one (and lets any loop go), as on YouTube
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
    if (!midi) midi = new Midi(settings.midiMap, loopAction, (m) => { saveSettings({ midiMap: m }).then(s => { settings = s; }); }, (st) => dock?.setMidiState(st));
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
        // A panel above the bar: the bar is ~48 px tall, the dock needs room to stand on it.
        mountStyle: "position:absolute;left:0;right:0;bottom:100%;height:320px;pointer-events:none;z-index:60",
        loop: { latch: (beats) => loops.latch(beats), release: () => loops.release(), tap: () => loops.tap(), setBpm: (bpm) => loops.setBpm(bpm), nudge: (d) => loops.nudge(d) },
        midi,
      });
      dock.setMidiState(midi.state);
      dock.setStatus(status);
      onBarChange(host, () => { syncTrack("bar"); if (!host.contains(dock!.hostEl)) mount(); });
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
      case "ready": hookReady = true; note("hook ready"); if (status.fault === "hook-missing") setStatus({ ...status, fault: null }); return;
      case "need-engine": sendEngine(); return;
      case "need-worklet-source": sendWorkletSource(); return;
      case "status": setStatus(sanitizeStatus(d.status)); return;
      case "loop-ack": { const a = parseLoopAck(d); if (a) loops.ack(a.seq, a.ok); return; }
      case "level": level = typeof d.v === "number" && Number.isFinite(d.v) ? Math.min(1, Math.max(0, d.v)) : 0; return;
      case "event": {
        const ev = d.ev as any;
        if (!ev || typeof ev !== "object" || typeof ev.type !== "string") return;
        try { note(`event ${JSON.stringify(ev).slice(0, 160)}`); } catch (_) { note("event (unserialisable)"); }
        if (ev.type === "media" && (ev.ev === "loadstart" || ev.ev === "emptied")) syncTrack(String(ev.ev)); // the element is detached: its events reach only the hook
        if (ev.type === "source" || ev.type === "media") { if (!dock) mount(); }
        return;
      }
      case "note": note(`hook note ${String(d.note).slice(0, 120)} ${String(d.reason || "").slice(0, 80)}`); return;
    }
  });

  // keyboard commands from the service worker (same ids as YouTube; never the page's own keys)
  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type !== "kari:command" || !dock) return;
    const map: Record<string, () => Params> = { "pitch-up": () => stepSt(params, 1), "pitch-down": () => stepSt(params, -1), "tempo-up": () => stepTempo(params, 1), "tempo-down": () => stepTempo(params, -1) };
    const f = map[m.command]; if (f) { applyParams(f()); dock.react(); dock.render(); }
  });

  // Debug surface for the live probe — isolated world only, invisible to the page.
  (globalThis as any).__kari = {
    site: "soundcloud", get params() { return params; }, get status() { return status; }, get dock() { return dock; }, get settings() { return settings; }, get key() { return currentKey; }, get hookReady() { return hookReady; }, get log() { return log.slice(); }, apply: (p: Params) => applyParams(p),
    get midi() { return midi; }, tap: () => loops.tap(), setBpm: (b: number) => loops.setBpm(b), latch: (beats: LoopBeats) => loops.latch(beats), release: () => loops.release(),
  };

  onSettingsChange(s => { settings = s; dock?.applySettings(s); post({ type: "engine-pref", pref: s.engine }); midi?.setMap(s.midiMap || {}); });
  post({ type: "init" }); // in case the hook loaded first; it answers hello → init again otherwise
  if (bar()) mount(); else waitForBar().then(b => { if (b) mount(); });
})();
