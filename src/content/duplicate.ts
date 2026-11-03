// Two Karis on one page (the store copy beside an unpacked build, or two unpacked builds) fight for the video's audio:
// the second createMediaElementSource throws, and each draws her own blob. The first content script to run claims the
// document; a later one marks itself and leaves without mounting; the first says why on her dock (fault "duplicate").
// The mark is an attribute and the signal a plain Event: a CustomEvent's detail does not cross Chrome's isolated worlds.
export const CLAIM = "data-kari";            // on <html>: the build that owns this page
export const MARK = "data-kari-duplicate";   // on <html>: the build that stood down
export const EVENT = "kari:duplicate";       // dispatched on the document by the one that stood down

type Root = { hasAttribute(n: string): boolean; getAttribute(n: string): string | null; setAttribute(n: string, v: string): void };
type Doc = { addEventListener(t: string, cb: () => void, capture?: boolean): void; dispatchEvent(e: Event): boolean };

/** Claim the page for `build`. True = first Kari here, mount; false = another owns it, stand down. `onDuplicate` fires on the owner with each later build. */
export function claimPage(root: Root, doc: Doc, build: string, onDuplicate: (other: string) => void): boolean {
  if (root.hasAttribute(CLAIM)) { root.setAttribute(MARK, build); doc.dispatchEvent(new Event(EVENT)); return false; }
  root.setAttribute(CLAIM, build);
  doc.addEventListener(EVENT, () => onDuplicate(root.getAttribute(MARK) || "?"), true);
  return true;
}
