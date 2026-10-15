// Kari — SoundCloud in the service worker: the optional host permission, the registered page scripts, and injection
// into SoundCloud tabs that are already open. Written over a small `chrome`-shaped dependency so tests can drive it
// with fakes (tests/background.test.mjs); sw.ts hands it the real chrome.
//
// Why injection: registered content scripts only run on the next navigation. A user who grants the permission while
// a SoundCloud tab is open (from the toolbar icon, or from the options switch) would otherwise see nothing until a
// reload, and nothing tells them so. Here the grant injects the bridge and the hook into every open SoundCloud tab
// at once, so the dock is there immediately. SoundCloud builds its audio graph at hydration (seconds after load,
// before any click), so in a tab that had finished loading the hook cannot wrap it and the dock says "reload this
// page" (bridge.ts, fault "late"); a tab injected within seconds of its load attaches without a reload.
export const SC_MATCH = "https://soundcloud.com/*";
export const SC_SCRIPTS: chrome.scripting.RegisteredContentScript[] = [
  { id: "kari-sc-hook", js: ["sc-hook.js"], matches: [SC_MATCH], runAt: "document_start", world: "MAIN", allFrames: false, persistAcrossSessions: true },
  { id: "kari-sc-bridge", js: ["sc-bridge.js"], matches: [SC_MATCH], runAt: "document_start", world: "ISOLATED", allFrames: false, persistAcrossSessions: true },
];

export const isSoundCloudUrl = (url: string | undefined | null) => /^https:\/\/soundcloud\.com(\/|$)/.test(url || "");

export type ScChrome = {
  permissions: {
    contains(p: { origins: string[] }): Promise<boolean>;
    request(p: { origins: string[] }): Promise<boolean>;
  };
  scripting: {
    getRegisteredContentScripts(f?: { ids?: string[] }): Promise<Array<{ id: string }>>;
    registerContentScripts(s: chrome.scripting.RegisteredContentScript[]): Promise<void>;
    updateContentScripts(s: chrome.scripting.RegisteredContentScript[]): Promise<void>;
    unregisterContentScripts(f?: { ids?: string[] }): Promise<void>;
    executeScript(i: { target: { tabId: number }; files: string[]; world?: "MAIN" | "ISOLATED"; injectImmediately?: boolean }): Promise<unknown>;
  };
  tabs: {
    query(q: { url?: string }): Promise<Array<{ id?: number; url?: string }>>;
    sendMessage(tabId: number, m: unknown): Promise<any>;
  };
};
export type Log = { debug(...a: unknown[]): void; warn(...a: unknown[]): void };
export type Activation = "not-soundcloud" | "denied" | "present" | "injected" | "failed";

export function makeSoundCloud(c: ScChrome, log: Log = console) {
  const ORIGINS = { origins: [SC_MATCH] };
  let syncing: Promise<boolean> = Promise.resolve(false);

  /** Make the registered scripts match the permission state. Serialised: concurrent events must not race the registry. Resolves to the permission state. */
  function sync(why: string): Promise<boolean> {
    syncing = syncing.then(async () => {
      let granted = false;
      try {
        granted = await c.permissions.contains(ORIGINS);
        const have = await c.scripting.getRegisteredContentScripts({ ids: SC_SCRIPTS.map(s => s.id) });
        const haveIds = new Set(have.map(s => s.id));
        if (granted) {
          const present = SC_SCRIPTS.filter(s => haveIds.has(s.id)), missing = SC_SCRIPTS.filter(s => !haveIds.has(s.id));
          if (present.length) await c.scripting.updateContentScripts(present);   // same ids: update, never re-register (duplicate ids reject the batch)
          if (missing.length) await c.scripting.registerContentScripts(missing);
        } else if (haveIds.size) {
          await c.scripting.unregisterContentScripts({ ids: [...haveIds] });
        }
        log.debug("[kari] soundcloud scripts", granted ? "registered" : "unregistered", `(${why})`);
      } catch (err) { log.warn("[kari] soundcloud script sync failed", why, err); }
      return granted;
    });
    return syncing;
  }

  /** Is the bridge already running in this tab? (It answers kari:ping; a tab without it throws "no receiver".) */
  async function present(tabId: number): Promise<boolean> {
    try { const r = await c.tabs.sendMessage(tabId, { type: "kari:ping" }); return !!r && r.site === "soundcloud"; }
    catch (_) { return false; }
  }

  /** Put the hook (MAIN world) and the bridge (isolated) into an open tab, once. Hook first: it must wrap the Web Audio prototypes before anything else runs. */
  async function inject(tabId: number): Promise<"present" | "injected" | "failed"> {
    if (await present(tabId)) return "present";
    try {
      await c.scripting.executeScript({ target: { tabId }, files: ["sc-hook.js"], world: "MAIN", injectImmediately: true });
      await c.scripting.executeScript({ target: { tabId }, files: ["sc-bridge.js"], world: "ISOLATED", injectImmediately: true });
      log.debug("[kari] soundcloud scripts injected into tab", tabId);
      return "injected";
    } catch (err) { log.warn("[kari] soundcloud inject failed", tabId, err); return "failed"; }
  }

  /** After a grant: every SoundCloud tab that is already open gets the scripts now, not on its next reload. Returns how many were injected. */
  async function injectOpenTabs(): Promise<number> {
    let tabs: Array<{ id?: number; url?: string }> = [];
    try { tabs = await c.tabs.query({ url: SC_MATCH }); } catch (err) { log.warn("[kari] soundcloud tabs.query failed", err); return 0; }
    let n = 0;
    for (const t of tabs) if (t.id !== undefined && (await inject(t.id)) === "injected") n++;
    return n;
  }

  /**
   * The toolbar icon on a SoundCloud tab. Runs inside the click's user gesture, which is what chrome.permissions.request
   * needs: ask if not yet granted, register the scripts, and inject into this very tab. Anywhere else: "not-soundcloud"
   * and the caller keeps its old behaviour (the options page).
   */
  async function activate(tab: { id?: number; url?: string }): Promise<Activation> {
    if (!isSoundCloudUrl(tab.url)) return "not-soundcloud";
    let granted = false;
    try { granted = await c.permissions.contains(ORIGINS); } catch (_) { granted = false; }
    if (!granted) {
      try { granted = await c.permissions.request(ORIGINS); }
      catch (err) { log.warn("[kari] soundcloud permission request failed", err); granted = false; }
    }
    if (!granted) { log.debug("[kari] soundcloud permission not granted"); return "denied"; }
    await sync("action click");
    return tab.id === undefined ? "failed" : inject(tab.id);
  }

  return { sync, present, inject, injectOpenTabs, activate };
}
