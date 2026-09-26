// Mimi — content script entry. Watch page only. Attaches nothing to the audio until the first change.
import { AudioController } from "./audio/controller";
import { Dock } from "./ui/dock";
import { isWatchPage, videoId, waitForVideo, onNavigate, onAdState, player, isMiniplayer, controlsHidden } from "./yt";
import { loadSettings, saveSettings, onSettingsChange, loadVideo, saveVideo, type Settings } from "../shared/storage";
import { DEFAULT_PARAMS, type Params, isNeutral, stepSt, stepTempo } from "../shared/math";

let audio: AudioController | null = null;
let dock: Dock | null = null;
let params: Params = { ...DEFAULT_PARAMS };
let settings: Settings;
let currentId = "";
let saveTimer = 0;
let lastSaved = "";   // what memory holds for currentId, to skip no-op writes (chrome.storage.sync has write quotas)

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
      saveVideo(currentId, m).then(() => console.debug("[mimi] saved", currentId, m ? JSON.stringify(m) : "cleared"));
    }, 400);
  }
}

async function mount() {
  // The miniplayer keeps #movie_player alive on non-/watch URLs: stay mounted (Mimi alone) and keep the video id.
  if (!isWatchPage() && !isMiniplayer()) { unmount(); return; }
  const video = await waitForVideo(); const host = player();
  if (!video || !host) return;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  settings = settings || await loadSettings();
  const id = videoId() || (isMiniplayer() ? currentId : "");
  if (id !== currentId) {
    currentId = id;
    const mem = settings.rememberPerVideo ? await loadVideo(id) : null;
    params = mem ? { ...DEFAULT_PARAMS, ...mem } : { ...DEFAULT_PARAMS, range: settings.defaultRange, keyLock: settings.keyLockDefault };
    lastSaved = id + ":" + (mem ? JSON.stringify({ st: params.st, cents: params.cents, tempo: params.tempo, keyLock: params.keyLock, range: params.range }) : "");
    console.debug("[mimi] mount", id, "memory:", mem ? JSON.stringify(mem) : "none");
  }
  if (!audio) { audio = new AudioController(video, urls); audio.setEnginePreference(settings.engine); }
  else audio.rebind(video);
  if (dock && !host.contains(dock.hostEl)) { dock.destroy(); dock = null; } // player was re-created (miniplayer ↔ watch)
  if (!dock) {
    dock = new Dock(host, {
      getParams: () => params,
      apply: (p) => { applyParams(p); },
      setCompare: (on) => audio?.setCompare(on),
      settings,
      saveSettings: (patch) => { saveSettings(patch).then(s => { settings = s; dock?.applySettings(s); if (patch.engine) audio?.setEnginePreference(s.engine); }); },
      level: () => audio?.level() ?? 0,
      optionsUrl: chrome.runtime.getURL("options.html"),
    });
    audio.onStatus(s => dock?.setStatus(s));
    onAdState(a => audio?.setAds(a));
    watchPlayerState(host);
  } else { dock.render(); }
  // Always push the (possibly neutral) params for this video: on navigation the controller still holds the previous
  // video's ratio, and a neutral video must reset it to a straight wire (live probe 2026-09-26).
  await applyParams(params);
}

function unmount() { dock?.destroy(); dock = null; }

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
  if (m?.type !== "mimi:command" || !dock) return;
  const map: Record<string, () => Params> = { "pitch-up": () => stepSt(params, 1), "pitch-down": () => stepSt(params, -1), "tempo-up": () => stepTempo(params, 1), "tempo-down": () => stepTempo(params, -1) };
  const f = map[m.command]; if (f) { applyParams(f()); dock.react(); dock.render(); }
});

// Debug surface — lives in the content script's isolated world, invisible to the page. Read by the live probe.
(globalThis as any).__mimi = { get params() { return params; }, get audio() { return audio; }, get dock() { return dock; }, get settings() { return settings; }, apply: (p: Params) => applyParams(p) };

onSettingsChange(s => { settings = s; dock?.applySettings(s); audio?.setEnginePreference(s.engine); });
onNavigate(() => { mount(); });
mount();
