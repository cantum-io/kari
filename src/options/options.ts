// Kari — options page logic. Same storage keys as the dock.
import { loadSettings, saveSettings, DEFAULT_SETTINGS, onSettingsChange, type Settings } from "../shared/storage";

const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];
let settings: Settings;

function render(s: Settings) {
  settings = s;
  $$("[data-skin]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.skin === s.skin)));
  $$("[data-kari]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kari === s.kariColor)));
  $$("[data-bool]").forEach(b => b.setAttribute("aria-pressed", String(!!(s as any)[b.dataset.bool!])));
  $$("[data-range]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.range! === s.defaultRange)));
  $$("[data-engine]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.engine === s.engine)));
}
async function set(patch: Partial<Settings>) { render(await saveSettings(patch)); }

// SoundCloud is an optional host: Chrome asks the user once, the service worker registers the page scripts on grant.
const SC = { origins: ["https://soundcloud.com/*"] };
let scGranted = false;
async function renderSc() {
  try { scGranted = await chrome.permissions.contains(SC); } catch (_) { scGranted = false; }
  document.getElementById("scPerm")?.setAttribute("aria-pressed", String(scGranted));
}

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest("button") as HTMLElement | null; if (!el) return;
  if (el.dataset.skin) set({ skin: el.dataset.skin as Settings["skin"] });
  else if (el.dataset.kari) set({ kariColor: el.dataset.kari as Settings["kariColor"] });
  else if (el.dataset.bool) set({ [el.dataset.bool]: el.getAttribute("aria-pressed") !== "true" } as Partial<Settings>);
  else if (el.dataset.range) set({ defaultRange: +el.dataset.range as 8 | 16 | 50 });
  else if (el.dataset.engine) set({ engine: el.dataset.engine as Settings["engine"] });
  else if (el.id === "resetAll") set({ ...DEFAULT_SETTINGS });
  else if (el.id === "showIntro") set({ seenIntro: false });
  else if (el.id === "scPerm") (scGranted ? chrome.permissions.remove(SC) : chrome.permissions.request(SC)).then(renderSc, renderSc); // request needs this click's gesture
});
renderSc();

// Shortcuts: the line shows what Chrome has bound on this machine. The manifest's defaults differ per platform
// (Alt+Shift+arrows; Alt+arrows on a Mac, where Alt+Left/Right are not Chrome's back and forward keys) and the user
// may have changed them at chrome://extensions/shortcuts; an unbound command reads "not set".
async function renderShortcuts() {
  const el = document.getElementById("shortcutList"); if (!el) return;
  try {
    const all = await chrome.commands.getAll();
    const key = (n: string) => all.find(c => c.name === n)?.shortcut || "not set";
    el.textContent = `${key("pitch-up")} / ${key("pitch-down")} pitch \u00b7 ${key("tempo-up")} / ${key("tempo-down")} speed.`;
  } catch (_) { /* no commands API: the static line stays */ }
}
renderShortcuts();
try { chrome.permissions.onAdded.addListener(renderSc); chrome.permissions.onRemoved.addListener(renderSc); } catch (_) { /* no permissions API */ }

loadSettings().then(render);
onSettingsChange(render);
