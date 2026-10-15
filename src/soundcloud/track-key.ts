// Kari — SoundCloud track key. Pure function, unit-tested in Node.
// The bottom bar's sound badge links to the playing track; its href is the only stable per-track id Kari
// reads (SoundCloud's numeric ids live in its own state, not in the DOM). Normalised to "/user/slug" so a
// private link ("/user/slug/s-TOKEN"), a query string or a hash all resolve to the same memory row.

const RESERVED_FIRST = new Set([
  "discover", "search", "you", "stream", "charts", "upload", "settings", "pages", "tags", "people", "notifications",
  "messages", "library", "feed", "mobile", "terms-of-use", "jobs", "imprint", "popular", "explore", "stations", "sets",
  "tracks", "playlists", "go", "pro", "signin", "logout", "login", "connect", "oauth", "activity", "dashboard", "trending",
  "genres", "moods", "premium", "artist", "creators", "for", "insights", "legal", "help", "community-guidelines",
  "undefined", "null", // SoundCloud renders a missing user permalink as the literal string (badge href "/undefined/cave", seen live 2026-10-15)
]);
const RESERVED_SECOND = new Set([
  "sets", "tracks", "albums", "reposts", "likes", "followers", "following", "popular-tracks", "comments", "playlists",
  "spotlight", "recommended", "you", "stats", "insights", "related", "toptracks",
]);

/** "/user/slug" for a track link on soundcloud.com, else null. */
export function trackKeyFromHref(href: string | null | undefined, base = "https://soundcloud.com"): string | null {
  if (!href || typeof href !== "string") return null;
  let u: URL;
  try { u = new URL(href, base); } catch (_) { return null; }
  if (!/(^|\.)soundcloud\.com$/i.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (_) { return s; } });
  if (parts.length < 2) return null;
  const user = parts[0].toLowerCase(), slug = parts[1].toLowerCase();
  if (RESERVED_FIRST.has(user) || RESERVED_SECOND.has(slug)) return null;
  if (/^s-[a-z0-9]+$/.test(slug)) return null;                     // a private token where the slug should be: not a track link
  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(user) || !/^[a-z0-9][a-z0-9_.-]*$/.test(slug)) return null;
  return `/${user}/${slug}`;                                        // anything after the slug (private "s-…" token) is dropped
}

/** Storage id for per-track memory: namespaced so a SoundCloud key can never collide with a YouTube video id. */
export const memoryId = (key: string) => "sc:" + key;
