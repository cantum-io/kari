// Kari — service worker. Defaults on install, keyboard commands → active tab, the toolbar action, and the SoundCloud
// scripts: registered only while the optional host permission is granted (never static content_scripts, which would
// count as a required host and disable Kari for existing users until they accept). The SoundCloud logic lives in
// ./soundcloud.ts so tests can run it with fakes.
import { loadSettings, saveSettings } from "../shared/storage";
import { makeSoundCloud, SC_MATCH } from "./soundcloud";

const sc = makeSoundCloud(chrome);

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings(await loadSettings()); // writes defaults if missing
  sc.sync("installed");
});
chrome.runtime.onStartup.addListener(() => { sc.sync("startup"); });
// A grant from the options switch: register, then reach the SoundCloud tabs that are already open (a registered
// script alone waits for their next reload). A removal: unregister; open tabs keep their running scripts until reload.
chrome.permissions.onAdded.addListener((p) => { if (p.origins?.includes(SC_MATCH)) sc.sync("permission added").then((granted) => { if (granted) return sc.injectOpenTabs(); }); });
chrome.permissions.onRemoved.addListener((p) => { if (p.origins?.includes(SC_MATCH)) sc.sync("permission removed"); });

// The toolbar icon. On a SoundCloud tab it is the grant path that needs no options page: ask inside this click's
// gesture, register, inject into this tab. Everywhere else (YouTube, anything), and on a SoundCloud tab where Kari is
// already running or the prompt was refused, it opens the settings as before (the switch is there, with its copy).
chrome.action.onClicked.addListener(async (tab) => {
  const r = await sc.activate(tab);
  console.debug("[kari] action", r, tab.url || "(no url)");
  if (r !== "injected") chrome.runtime.openOptionsPage();
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "kari:command", command }).catch(() => { /* no content script on this tab */ });
});

// Debug surface for the probe (tools/probe/sc-grant.mjs): the service-worker global, reachable by nothing but DevTools
// and the harness's worker.evaluate — no page, no content script can see it.
(globalThis as any).__kari = { soundcloud: sc };
