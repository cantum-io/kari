// Kari — the per-site hide switch. Pure and DOM-free (tests/sites.test.mjs).
//
// Hidden on a site = Kari is not on that site's pages: no blob, no panel, and the audio plays as the site sends it
// (a remembered key or speed waits for her return instead of playing on with nothing on screen to undo it). The
// keyboard shortcuts and MIDI pads do nothing there. Set from the switches on the options page or the button in the
// dock's settings; undone there, or from Kari's toolbar icon on a tab of that site, so the way back never depends on
// the options page alone (a managed profile can block it, kari-notes LEARNINGS 2026-10-15).

export type Site = "yt" | "sc";
export type HideKey = "hideOnYouTube" | "hideOnSoundCloud";
export const HIDE_KEY: Record<Site, HideKey> = { yt: "hideOnYouTube", sc: "hideOnSoundCloud" };
export const SITE_NAME: Record<Site, string> = { yt: "YouTube", sc: "SoundCloud" };

/** The site of a tab's address: the two hosts Kari runs on (the manifest's www.youtube.com, the optional soundcloud.com), never lookalikes. */
export function siteOf(url: string | undefined | null): Site | null {
  const u = url || "";
  if (/^https?:\/\/www\.youtube\.com(\/|$)/.test(u)) return "yt";
  if (/^https:\/\/soundcloud\.com(\/|$)/.test(u)) return "sc";
  return null;
}

export const hiddenOn = (s: Partial<Record<HideKey, boolean>> | null | undefined, site: Site) => !!s?.[HIDE_KEY[site]];

/** What the SoundCloud step of a toolbar click came back with (src/background/soundcloud.ts Activation). */
export type IconActivation = "not-soundcloud" | "denied" | "present" | "injected" | "failed";

/**
 * The toolbar icon, after the SoundCloud grant step: on a tab of a site where Kari is hidden, the click brings her back
 * there and opens nothing; a fresh SoundCloud injection unhides too (the click asked for Kari on this tab). Everywhere
 * else, and when the grant was refused or failed, it opens the settings as before.
 */
export function iconPlan(r: IconActivation, url: string | undefined | null, s: Partial<Record<HideKey, boolean>> | null | undefined): { show: Site | null; options: boolean } {
  const site = siteOf(url);
  const hidden = !!site && hiddenOn(s, site);
  if (r === "injected") return { show: hidden ? site : null, options: false };
  if ((r === "present" || r === "not-soundcloud") && hidden) return { show: site, options: false };
  return { show: null, options: true };
}
