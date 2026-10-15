// Kari — SoundCloud page plumbing (isolated world). Reads only the persistent bottom bar; the <audio> element itself
// is detached and lives in the MAIN world (see hook-core.ts), so nothing here touches it.
import { trackKeyFromHref } from "./track-key";

export const BAR = ".playControls";
export const BADGE_LINK = ".playControls__soundBadge .playbackSoundBadge__titleLink";

export const bar = () => document.querySelector(BAR) as HTMLElement | null;

/** Is the bar on screen? SoundCloud keeps .playControls visibility:hidden and slides its inner section in with `m-visible`. */
export const barShown = (host: Element | null = bar()) => !!host && host.classList.contains("m-visible");

/** Is the bottom bar's play button in its playing state? (class list carries "playing" while a track plays; read, never clicked) */
export const barPlaying = () => { const b = document.querySelector(".playControls__play"); return !!b && [...b.classList].some(c => /playing/.test(c)); };

export const BADGE_USER_LINK = ".playControls__soundBadge .playbackSoundBadge__lightLink";

/**
 * The playing track's key from the sound badge in the bottom bar, or null when no badge is up. SoundCloud sometimes
 * renders the title link with the user missing ("/undefined/cave", seen live 2026-10-15): then the badge's user link
 * ("/amaixamai") supplies the user, and failing that the page address when it ends in the same slug.
 */
export function currentTrackKey(): string | null {
  const a = document.querySelector(BADGE_LINK) as HTMLAnchorElement | null;
  if (!a) return null;
  const href = a.getAttribute("href") || a.href || null;
  const direct = trackKeyFromHref(href, location.origin);
  if (direct) return direct;
  const slug = (href || "").split(/[?#]/)[0].split("/").filter(Boolean)[1];
  if (!slug) return null;
  const u = document.querySelector(BADGE_USER_LINK) as HTMLAnchorElement | null;
  const user = (u && (u.getAttribute("href") || "").split(/[?#]/)[0].split("/").filter(Boolean)[0]) || null;
  const viaUser = user ? trackKeyFromHref(`/${user}/${slug}`, location.origin) : null;
  if (viaUser) return viaUser;
  const page = trackKeyFromHref(location.pathname, location.origin);
  return page && page.endsWith("/" + slug.toLowerCase()) ? page : null;
}

/** Resolve when the bottom bar exists (it is rendered once per page and persists across SoundCloud's SPA routes). */
export function waitForBar(timeoutMs = 20000): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const now = bar(); if (now) return resolve(now);
    const obs = new MutationObserver(() => { const b = bar(); if (b) { obs.disconnect(); clearTimeout(t); resolve(b); } });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    const t = setTimeout(() => { obs.disconnect(); resolve(bar()); }, timeoutMs);
  });
}

/** Watch the bar for anything that could change the badge (track change, bar shown/hidden), debounced. */
export function onBarChange(host: HTMLElement, cb: () => void, debounceMs = 80) {
  let t = 0;
  const fire = () => { clearTimeout(t); t = window.setTimeout(cb, debounceMs); };
  const obs = new MutationObserver(fire);
  obs.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "class", "title"], characterData: true });
  return () => obs.disconnect();
}
