// Mimi — service worker. Defaults on install, action opens options, keyboard commands → active tab.
import { loadSettings, saveSettings } from "../shared/storage";

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings(await loadSettings()); // writes defaults if missing
});

chrome.action.onClicked.addListener(() => { chrome.runtime.openOptionsPage(); });

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "mimi:command", command }).catch(() => { /* no content script on this tab */ });
});
