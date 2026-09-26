// Mimi — YouTube page plumbing. Hooks only the <video> and #movie_player; never control-bar classes.

export const isWatchPage = () => location.hostname.endsWith("youtube.com") && location.pathname === "/watch";
export const videoId = () => new URLSearchParams(location.search).get("v") || "";

export function findVideo(): HTMLVideoElement | null {
  return (document.querySelector("#movie_player video.html5-main-video") as HTMLVideoElement) ||
         (document.querySelector("#movie_player video") as HTMLVideoElement) || null;
}
export const player = () => document.getElementById("movie_player");

/** Resolve when a <video> exists on a watch page (no fixed timers; observe the DOM). */
export function waitForVideo(timeoutMs = 15000): Promise<HTMLVideoElement | null> {
  return new Promise(resolve => {
    const now = findVideo(); if (now) return resolve(now);
    const obs = new MutationObserver(() => { const v = findVideo(); if (v) { obs.disconnect(); clearTimeout(t); resolve(v); } });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    const t = setTimeout(() => { obs.disconnect(); resolve(findVideo()); }, timeoutMs);
  });
}

/** SPA navigation: YouTube's own event first, MutationObserver+URL compare as the fallback. */
export function onNavigate(cb: () => void) {
  let last = location.href;
  const fire = () => { if (location.href !== last) { last = location.href; cb(); } };
  document.addEventListener("yt-navigate-finish", () => { last = ""; fire(); });
  const obs = new MutationObserver(fire);
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", fire);
  return () => obs.disconnect();
}

export const isAdShowing = () => { const p = player(); return !!p && (p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting")); };

/** Watch the ad state on #movie_player via its class attribute. */
export function onAdState(cb: (adShowing: boolean) => void) {
  let last = isAdShowing(); cb(last);
  const attach = () => {
    const p = player(); if (!p) return false;
    const obs = new MutationObserver(() => { const now = isAdShowing(); if (now !== last) { last = now; cb(now); } });
    obs.observe(p, { attributes: true, attributeFilter: ["class"] });
    return true;
  };
  if (!attach()) { const o = new MutationObserver(() => { if (attach()) o.disconnect(); }); o.observe(document.documentElement, { childList: true, subtree: true }); }
}

export const isFullscreenLike = () => { const p = player(); return !!p && (document.fullscreenElement === p || p.classList.contains("ytp-fullscreen")); };
export const isMiniplayer = () => { const p = player(); return !!p && p.classList.contains("ytp-player-minimized"); };
export const controlsHidden = () => { const p = player(); return !!p && p.classList.contains("ytp-autohide"); };
