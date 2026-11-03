// Kari — content script entry. Watch page only. Attaches nothing to the audio until the first change.
import { AudioController } from "./audio/controller";
import { Dock } from "./ui/dock";
import { isWatchPage, videoId, waitForVideo, onNavigate, onAdState, player, isMiniplayer, controlsHidden } from "./yt";
import { loadSettings, saveSettings, onSettingsChange, loadVideo, saveVideo, type Settings } from "../shared/storage";
import { DEFAULT_PARAMS, type Params, isNeutral, stepSt, stepTempo } from "../shared/math";
import { Midi, type MidiAction } from "./midi";
import type { LoopBeats } from "./beat/grid";

let audio: AudioController | null = null;
let dock: Dock | null = null;
let midi: Midi | null = null;
let params: Params = { ...DEFAULT_PARAMS };
let settings: Settings;
let currentId = "";
let saveTimer = 0;
let lastSaved = "";   // what memory holds for currentId, to skip no-op writes (chrome.storage.sync has write quotas)
let hidden = false;   // the hide last acted on (park ran, not yet shown again); the setting itself is hiddenNow()
const hiddenNow = () => !!settings?.hideOnYouTube;   // Settings.hideOnYouTube (src/shared/sites.ts): no dock, audio as YouTube sends it
let statusWired = false; let wiredHost: HTMLElement | null = null;   // listeners go on once (per player element), not once per dock

const urls = { worklet: chrome.runtime.getURL("worklet.js"), wasm: chrome.runtime.getURL("rubberband.wasm") };

async function applyParams(p: Params) {
  params = p;
  await audio?.apply(p);
  if (settings.rememberPerVideo && currentId) {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const m = isNeutral(p) ? null : { st: p.st, cents: p.cents, tempo: p.tempo, keyLock: p.keyLock, range: p.range };
      const key = currentId + ":" + (m ? JSON.stringify(m) : "");
      if (key === lastSaved) return;
      lastSaved = key;
      saveVideo(currentId, m).then(() => console.debug("[kari] saved", currentId, m ? JSON.stringify(m) : "cleared"));
    }, 400);
  }
}

// Beat-loop actions from a MIDI pad (the dock's own buttons call the controller directly). A pad on a length toggles
// it, exactly like the button: lit = release, unlit = latch, another length = switch. Click + MIDI only: the page's
// keyboard is never taken.
const LOOP_BEATS: Partial<Record<MidiAction, LoopBeats>> = { "loop-h": 0.5, "loop-1": 1, "loop-bar": 4, "loop-2bar": 8 };
function loopAction(a: MidiAction) {
  if (!audio || hiddenNow()) return;
  const beats = LOOP_BEATS[a];
  if (beats) audio.toggleLoop(beats).then(ok => { if (ok) dock?.react(); dock?.render(); });
  else if (a === "tap") { audio.tap(); dock?.react(); }
  dock?.render();
}

async function mount() {
  // The miniplayer keeps #movie_player alive on non-/watch URLs: stay mounted (Kari alone) and keep the video id.
  settings = settings || await loadSettings();
  if (hiddenNow()) { park(); return; }
  hidden = false;
  if (!isWatchPage() && !isMiniplayer()) { unmount(); return; }
  const video = await waitForVideo(); const host = player();
  if (!video || !host) return;
  // Every await is a window for the switch to move (options page, another tab): read it again after each one.
  if (hiddenNow()) { park(); return; }
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const id = videoId() || (isMiniplayer() ? currentId : "");
  if (id !== currentId) {
    currentId = id;
    const mem = settings.rememberPerVideo ? await loadVideo(id) : null;
    params = mem ? { ...DEFAULT_PARAMS, ...mem } : { ...DEFAULT_PARAMS, range: settings.defaultRange, keyLock: settings.keyLockDefault };
    lastSaved = id + ":" + (mem ? JSON.stringify({ st: params.st, cents: params.cents, tempo: params.tempo, keyLock: params.keyLock, range: params.range }) : "");
    console.debug("[kari] mount", id, "memory:", mem ? JSON.stringify(mem) : "none");
    audio?.setGrid(null);   // the beat grid belongs to the song: a new video starts without one (and lets any loop go)
  }
  if (hiddenNow()) { park(); return; }   // switched while the memory was read
  if (!audio) { audio = new AudioController(video, urls); audio.setEnginePreference(settings.engine); }
  else audio.rebind(video);
  audio.park(false);   // shown: Kari holds the element's pitch handling again; the applyParams below puts the song back
  if (!midi) midi = new Midi(settings.midiMap, loopAction, (m) => { saveSettings({ midiMap: m }).then(s => { settings = s; }); }, (st) => dock?.setMidiState(st));
  if (dock && !host.contains(dock.hostEl)) { dock.destroy(); dock = null; } // player was re-created (miniplayer ↔ watch)
  if (!dock) {
    dock = new Dock(host, {
      getParams: () => params,
      apply: (p) => { applyParams(p); },
      setCompare: (on) => audio?.setCompare(on),
      settings,
      saveSettings: (patch) => { saveSettings(patch).then(s => { settings = s; dock?.applySettings(s); if (patch.engine) audio?.setEnginePreference(s.engine); syncHide(); }); },
      level: () => audio?.level() ?? 0,
      optionsUrl: chrome.runtime.getURL("options.html"),
      loop: {
        latch: (beats) => audio ? audio.latchLoop(beats) : Promise.resolve(false),
        release: () => audio?.releaseLoop(),
        tap: () => audio?.tap() ?? null,
        setBpm: (bpm) => audio?.setBpm(bpm),
        nudge: (d) => audio?.nudgeBpm(d),
      },
      midi,
    });
    dock.setMidiState(midi.state);
    dock.setStatus(audio.status);
    dock.setControlsHidden(controlsHidden()); dock.setSmall(isMiniplayer() || host.clientWidth < 520);
    // Once each: a dock made again (miniplayer ↔ watch, or Kari shown after a hide) must not stack another listener.
    if (!statusWired) { statusWired = true; audio.onStatus(s => dock?.setStatus(s)); }
    if (wiredHost !== host) { wiredHost = host; onAdState(a => audio?.setAds(a)); watchPlayerState(host); }
  } else { dock.render(); }
  // Always push the (possibly neutral) params for this video: on navigation the controller still holds the previous
  // video's ratio, and a neutral video must reset it to a straight wire (live probe 2026-09-26).
  await applyParams(params);
}

function unmount() { dock?.destroy(); dock = null; }

/**
 * Hidden on YouTube: Kari leaves the player and the sound goes back to the page's own (a running loop lets go, the
 * key and speed return to neutral). `params` and the per-video memory stay as they were, so showing her again puts
 * the song back where it was. A page loaded hidden never builds the audio controller at all.
 */
function park() {
  hidden = true;
  unmount();
  audio?.park(true);   // loop released, neutral with key lock off, preservesPitch back to the element's own, no attach, no latch
}
/** The hide switch moved (options page, the dock's button, the toolbar icon): mount() hides or shows. */
function syncHide() { if (hiddenNow() !== hidden) mount(); }

function watchPlayerState(host: HTMLElement) {
  let wasMini = isMiniplayer();
  const obs = new MutationObserver(() => {
    dock?.setControlsHidden(controlsHidden()); dock?.setSmall(isMiniplayer() || host.clientWidth < 520);
    const mini = isMiniplayer();
    if (mini !== wasMini) { wasMini = mini; mount(); } // the minimized class lands after the URL change that unmounted us
  });
  obs.observe(host, { attributes: true, attributeFilter: ["class"] });
  new ResizeObserver(() => dock?.setSmall(isMiniplayer() || host.clientWidth < 520)).observe(host);
}

// keyboard commands from the service worker
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type !== "kari:command" || !dock || hiddenNow()) return;
  const map: Record<string, () => Params> = { "pitch-up": () => stepSt(params, 1), "pitch-down": () => stepSt(params, -1), "tempo-up": () => stepTempo(params, 1), "tempo-down": () => stepTempo(params, -1) };
  const f = map[m.command]; if (f) { applyParams(f()); dock.react(); dock.render(); }
});

// Debug surface — lives in the content script's isolated world, invisible to the page. Read by the live probe.
(globalThis as any).__kari = {
  get params() { return params; }, get audio() { return audio; }, get dock() { return dock; }, get settings() { return settings; }, apply: (p: Params) => applyParams(p),
  get grid() { return audio?.getGrid() ?? null; }, get midi() { return midi; },
  tap: () => audio?.tap() ?? null, setBpm: (b: number) => audio?.setBpm(b), latch: (beats: LoopBeats) => audio?.latchLoop(beats), release: () => audio?.releaseLoop(),
  toggle: (beats: LoopBeats) => audio?.toggleLoop(beats), get tempo() { return audio?.detectorState ?? null; }, get estimate() { return audio?.lastEstimate ?? null; }, get tempoDebug() { return audio?.detectorDebug ?? null; },
};

onSettingsChange(s => { settings = s; dock?.applySettings(s); audio?.setEnginePreference(s.engine); midi?.setMap(s.midiMap || {}); syncHide(); });
onNavigate(() => { mount(); });
mount();
