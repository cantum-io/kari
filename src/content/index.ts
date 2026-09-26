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

const urls = { worklet: chrome.runtime.getURL("worklet.js"), wasm: chrome.runtime.getURL("rubberband.wasm") };

async function applyParams(p: Params) {
  params = p;
  await audio?.apply(p);
  if (settings.rememberPerVideo && currentId) {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveVideo(currentId, isNeutral(p) ? null : { st: p.st, cents: p.cents, tempo: p.tempo, keyLock: p.keyLock, range: p.range }), 400);
  }
}

async function mount() {
  if (!isWatchPage()) { unmount(); return; }
  const video = await waitForVideo(); const host = player();
  if (!video || !host) return;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  settings = settings || await loadSettings();
  const id = videoId();
  if (id !== currentId) {
    currentId = id;
    const mem = settings.rememberPerVideo ? await loadVideo(id) : null;
    params = mem ? { ...DEFAULT_PARAMS, ...mem } : { ...DEFAULT_PARAMS, range: settings.defaultRange };
  }
  if (!audio) { audio = new AudioController(video, urls); audio.setEnginePreference(settings.engine); }
  else audio.rebind(video);
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
  if (!isNeutral(params)) await applyParams(params);
}

function unmount() { dock?.destroy(); dock = null; }

function watchPlayerState(host: HTMLElement) {
  const obs = new MutationObserver(() => { dock?.setControlsHidden(controlsHidden()); dock?.setSmall(isMiniplayer() || host.clientWidth < 520); });
  obs.observe(host, { attributes: true, attributeFilter: ["class"] });
  new ResizeObserver(() => dock?.setSmall(isMiniplayer() || host.clientWidth < 520)).observe(host);
}

// keyboard commands from the service worker
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type !== "mimi:command" || !dock) return;
  const map: Record<string, () => Params> = { "pitch-up": () => stepSt(params, 1), "pitch-down": () => stepSt(params, -1), "tempo-up": () => stepTempo(params, 1), "tempo-down": () => stepTempo(params, -1) };
  const f = map[m.command]; if (f) { applyParams(f()); dock.react(); dock.render(); }
});

onSettingsChange(s => { settings = s; dock?.applySettings(s); audio?.setEnginePreference(s.engine); });
onNavigate(() => { mount(); });
mount();
