// Kari — settings over chrome.storage.sync, per-video memory over chrome.storage.local (each falls back to memory when unavailable).

export type Skin = "org" | "void" | "weather" | "cons";
export type KariColor = "blue" | "pink" | "black";
export type EngineTier = "auto" | "r3" | "signalsmith";

export type Settings = {
  skin: Skin;
  kariColor: KariColor;
  cap: boolean; shades: boolean; shoes: boolean;
  plush: boolean;
  collapsed: boolean;
  fullControl: boolean;
  engine: EngineTier;
  defaultRange: 8 | 16 | 50;
  keyLockDefault: boolean;
  rememberPerVideo: boolean;
  seenIntro: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  skin: "org", kariColor: "blue", cap: false, shades: false, shoes: false,
  plush: true, collapsed: false, fullControl: false, engine: "auto",
  defaultRange: 50, keyLockDefault: false, rememberPerVideo: true, seenIntro: false,
};

const KEY = "kari.settings";
const VIDEO_PREFIX = "kari.video.";

type Area = { get(k: string | string[]): Promise<Record<string, unknown>>; set(o: Record<string, unknown>): Promise<void>; remove(k: string): Promise<void> };

function area(name: "sync" | "local"): Area {
  const mem: Record<string, unknown> = {};
  try {
    const s = (globalThis as any).chrome?.storage?.[name];
    if (s) return { get: k => s.get(k), set: o => s.set(o), remove: k => s.remove(k) };
  } catch (_) { /* no extension context */ }
  return {
    async get(k) { const keys = Array.isArray(k) ? k : [k]; const o: Record<string, unknown> = {}; for (const key of keys) if (key in mem) o[key] = mem[key]; return o; },
    async set(o) { Object.assign(mem, o); },
    async remove(k) { delete mem[k]; },
  };
}
const store = area("sync");   // settings: Chrome may sync these across the user's own devices
const local = area("local");  // per-video memory: stays on this device, never synced

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
  const k = VIDEO_PREFIX + id;
  try {
    const o = await local.get(k);
    if (o[k]) return o[k] as VideoMemory;
    // One-time migration: 0.1.0 kept per-video memory in chrome.storage.sync. Move it to local.
    const legacy = await store.get(k);
    const m = (legacy[k] as VideoMemory) || null;
    if (m) {
      try { await local.set({ [k]: m }); await store.remove(k); } catch (_) { /* best effort */ }
    }
    return m;
  } catch (_) { return null; }
}
export async function saveVideo(id: string, m: VideoMemory | null) {
  try { if (m) await local.set({ [VIDEO_PREFIX + id]: m }); else await local.remove(VIDEO_PREFIX + id); } catch (_) { /* best effort */ }
}
