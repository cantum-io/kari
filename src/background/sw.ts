// Kari — service worker. Defaults on install, action opens options, keyboard commands → active tab, and the
// SoundCloud scripts: registered only while the optional host permission is granted (never static content_scripts,
// which would count as a required host and disable Kari for existing users until they accept).
import { loadSettings, saveSettings } from "../shared/storage";

const SC_MATCH = "https://soundcloud.com/*";
const SC_SCRIPTS: chrome.scripting.RegisteredContentScript[] = [
  { id: "kari-sc-hook", js: ["sc-hook.js"], matches: [SC_MATCH], runAt: "document_start", world: "MAIN", allFrames: false, persistAcrossSessions: true },
  { id: "kari-sc-bridge", js: ["sc-bridge.js"], matches: [SC_MATCH], runAt: "document_start", world: "ISOLATED", allFrames: false, persistAcrossSessions: true },
];

let syncing: Promise<void> = Promise.resolve();
/** Make the registered scripts match the permission state. Serialised: concurrent events must not race the registry. */
function syncSoundCloud(why: string) {
  syncing = syncing.then(async () => {
    try {
      const granted = await chrome.permissions.contains({ origins: [SC_MATCH] });
      const have = await chrome.scripting.getRegisteredContentScripts({ ids: SC_SCRIPTS.map(s => s.id) });
      const haveIds = new Set(have.map(s => s.id));
      if (granted) {
        const present = SC_SCRIPTS.filter(s => haveIds.has(s.id)), missing = SC_SCRIPTS.filter(s => !haveIds.has(s.id));
        if (present.length) await chrome.scripting.updateContentScripts(present);   // same ids: update, never re-register (duplicate ids reject the batch)
        if (missing.length) await chrome.scripting.registerContentScripts(missing);
      } else if (haveIds.size) {
        await chrome.scripting.unregisterContentScripts({ ids: [...haveIds] });
      }
      console.debug("[kari] soundcloud scripts", granted ? "registered" : "unregistered", `(${why})`);
    } catch (err) { console.warn("[kari] soundcloud script sync failed", why, err); }
  });
  return syncing;
}

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings(await loadSettings()); // writes defaults if missing
  syncSoundCloud("installed");
});
chrome.runtime.onStartup.addListener(() => { syncSoundCloud("startup"); });
chrome.permissions.onAdded.addListener((p) => { if (p.origins?.includes(SC_MATCH)) syncSoundCloud("permission added"); });
chrome.permissions.onRemoved.addListener((p) => { if (p.origins?.includes(SC_MATCH)) syncSoundCloud("permission removed"); });

chrome.action.onClicked.addListener(() => { chrome.runtime.openOptionsPage(); });

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "kari:command", command }).catch(() => { /* no content script on this tab */ });
});
