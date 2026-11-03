// The per-site hide switch (src/shared/sites.ts): which tab is which site, and what the toolbar icon does on a tab
// where Kari is hidden. The page scripts' side (dock gone, audio back to the page's own) is tools/probe/hide.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { siteOf, hiddenOn, iconPlan, HIDE_KEY, SITE_NAME } from "../src/shared/sites.ts";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../src/shared/storage.ts";

test("siteOf: the two hosts Kari runs on, never lookalikes", () => {
  assert.equal(siteOf("https://www.youtube.com/watch?v=abc"), "yt");
  assert.equal(siteOf("https://www.youtube.com/"), "yt");
  assert.equal(siteOf("http://www.youtube.com/watch?v=abc"), "yt");
  assert.equal(siteOf("https://soundcloud.com/someone/track"), "sc");
  assert.equal(siteOf("https://soundcloud.com"), "sc");
  for (const u of ["https://www.youtube.com.evil.io/watch", "https://music.youtube.com/watch?v=x", "https://m.youtube.com/watch?v=x",
    "https://soundcloud.com.evil.io/", "http://soundcloud.com/x", "https://evil.io/?u=https://www.youtube.com/", "chrome://extensions", "", null, undefined])
    assert.equal(siteOf(u), null, String(u));
});

test("defaults: Kari shows on both sites; settings saved before this build read as shown", async () => {
  assert.equal(DEFAULT_SETTINGS.hideOnYouTube, false);
  assert.equal(DEFAULT_SETTINGS.hideOnSoundCloud, false);
  const s = await loadSettings(); // no chrome here: the in-memory area, empty = an older install with no hide keys
  assert.equal(hiddenOn(s, "yt"), false);
  assert.equal(hiddenOn(s, "sc"), false);
  const after = await saveSettings({ [HIDE_KEY.yt]: true });
  assert.equal(hiddenOn(after, "yt"), true);
  assert.equal(hiddenOn(after, "sc"), false, "one site's switch never moves the other");
  assert.equal(hiddenOn(await loadSettings(), "yt"), true, "the switch persists (reload reads it back)");
  await saveSettings({ ...DEFAULT_SETTINGS });
});

test("icon on a YouTube tab: hidden → bring her back there, no settings page; shown → settings as before", () => {
  const yt = "https://www.youtube.com/watch?v=abc";
  assert.deepEqual(iconPlan("not-soundcloud", yt, { hideOnYouTube: true }), { show: "yt", options: false });
  assert.deepEqual(iconPlan("not-soundcloud", yt, { hideOnYouTube: false }), { show: null, options: true });
  assert.deepEqual(iconPlan("not-soundcloud", yt, { hideOnSoundCloud: true }), { show: null, options: true }, "hidden elsewhere only");
});

test("icon on a SoundCloud tab: running + hidden → show; fresh injection → show if hidden, never the settings; refused or failed → settings", () => {
  const sc = "https://soundcloud.com/someone/track";
  assert.deepEqual(iconPlan("present", sc, { hideOnSoundCloud: true }), { show: "sc", options: false });
  assert.deepEqual(iconPlan("present", sc, { hideOnSoundCloud: false }), { show: null, options: true });
  assert.deepEqual(iconPlan("injected", sc, { hideOnSoundCloud: true }), { show: "sc", options: false });
  assert.deepEqual(iconPlan("injected", sc, {}), { show: null, options: false });
  assert.deepEqual(iconPlan("denied", sc, { hideOnSoundCloud: true }), { show: null, options: true }, "no grant: the switch and its copy are on the settings page");
  assert.deepEqual(iconPlan("failed", sc, { hideOnSoundCloud: true }), { show: null, options: true });
});

test("icon anywhere else: the settings, whatever is hidden", () => {
  assert.deepEqual(iconPlan("not-soundcloud", "https://example.com/", { hideOnYouTube: true, hideOnSoundCloud: true }), { show: null, options: true });
  assert.deepEqual(iconPlan("not-soundcloud", undefined, null), { show: null, options: true });
});

test("both surfaces carry the switch: an options-page switch per site, and the dock's settings button", () => {
  const html = fs.readFileSync(new URL("../extension/options.html", import.meta.url), "utf8");
  for (const site of ["yt", "sc"]) {
    const m = html.match(new RegExp(`<button class="sw" data-bool="${HIDE_KEY[site]}"[^>]*>`));
    assert.ok(m, `options switch for ${HIDE_KEY[site]}`);
    assert.match(m[0], new RegExp(`aria-label="Hide Kari on ${SITE_NAME[site]}"`));
  }
  assert.doesNotMatch(html, /<button class="sw"(?![^>]*aria-label)[^>]*>/, "every switch has an accessible name");
  const dock = fs.readFileSync(new URL("../src/content/ui/dock.ts", import.meta.url), "utf8");
  assert.match(dock, /data-a="hide-site"/);
  assert.match(dock, /case "hide-site": this\.deps\.saveSettings\(\{ \[HIDE_KEY\[this\.deps\.site \|\| "yt"\]\]: true \}\)/);
});
