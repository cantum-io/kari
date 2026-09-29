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

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest("button") as HTMLElement | null; if (!el) return;
  if (el.dataset.skin) set({ skin: el.dataset.skin as Settings["skin"] });
  else if (el.dataset.kari) set({ kariColor: el.dataset.kari as Settings["kariColor"] });
  else if (el.dataset.bool) set({ [el.dataset.bool]: el.getAttribute("aria-pressed") !== "true" } as Partial<Settings>);
  else if (el.dataset.range) set({ defaultRange: +el.dataset.range as 8 | 16 | 50 });
  else if (el.dataset.engine) set({ engine: el.dataset.engine as Settings["engine"] });
  else if (el.id === "resetAll") set({ ...DEFAULT_SETTINGS });
  else if (el.id === "showIntro") set({ seenIntro: false });
});

loadSettings().then(render);
onSettingsChange(render);
