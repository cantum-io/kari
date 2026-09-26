// Mimi — settings + per-video memory over chrome.storage.sync (falls back to memory when unavailable).

export type Skin = "org" | "void" | "weather" | "cons";
export type MimiColor = "blue" | "pink" | "black";
export type EngineTier = "auto" | "r3" | "signalsmith";

export type Settings = {
  skin: Skin;
  mimiColor: MimiColor;
  cap: boolean; shades: boolean; shoes: boolean;
  plush: boolean;
  collapsed: boolean;
  fullControl: boolean;
  engine: EngineTier;
  defaultRange: 8 | 16 | 50;
  rememberPerVideo: boolean;
  seenIntro: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  skin: "org", mimiColor: "blue", cap: false, shades: false, shoes: false,
  plush: true, collapsed: false, fullControl: false, engine: "auto",
  defaultRange: 50, rememberPerVideo: true, seenIntro: false,
};

const KEY = "mimi.settings";
const VIDEO_PREFIX = "mimi.video.";

type Area = { get(k: string | string[]): Promise<Record<string, unknown>>; set(o: Record<string, unknown>): Promise<void>; remove(k: string): Promise<void> };

function area(): Area {
  const mem: Record<string, unknown> = {};
  try {
    const s = (globalThis as any).chrome?.storage?.sync;
    if (s) return { get: k => s.get(k), set: o => s.set(o), remove: k => s.remove(k) };
  } catch (_) { /* no extension context */ }
  return {
    async get(k) { const keys = Array.isArray(k) ? k : [k]; const o: Record<string, unknown> = {}; for (const key of keys) if (key in mem) o[key] = mem[key]; return o; },
    async set(o) { Object.assign(mem, o); },
    async remove(k) { delete mem[k]; },
  };
}
const store = area();

export async function loadSettings(): Promise<Settings> {
  try { const o = await store.get(KEY); return { ...DEFAULT_SETTINGS, ...((o[KEY] as Partial<Settings>) || {}) }; }
  catch (_) { return { ...DEFAULT_SETTINGS }; }
}
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await loadSettings(); const next = { ...cur, ...patch };
  try { await store.set({ [KEY]: next }); } catch (_) { /* best effort */ }
  return next;
}
export function onSettingsChange(cb: (s: Settings) => void) {
  try {
    (globalThis as any).chrome?.storage?.onChanged?.addListener((changes: any, areaName: string) => {
      if (areaName === "sync" && changes[KEY]) cb({ ...DEFAULT_SETTINGS, ...changes[KEY].newValue });
    });
  } catch (_) { /* ignore */ }
}

export type VideoMemory = { st: number; cents: number; tempo: number; keyLock: boolean; range: 8 | 16 | 50 };
export async function loadVideo(id: string): Promise<VideoMemory | null> {
  try { const o = await store.get(VIDEO_PREFIX + id); return (o[VIDEO_PREFIX + id] as VideoMemory) || null; } catch (_) { return null; }
}
export async function saveVideo(id: string, m: VideoMemory | null) {
  try { if (m) await store.set({ [VIDEO_PREFIX + id]: m }); else await store.remove(VIDEO_PREFIX + id); } catch (_) { /* best effort */ }
}
