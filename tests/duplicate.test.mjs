// Two Karis on one page (src/content/duplicate.ts): the first claims the document, a later one marks itself and
// stands down, and the owner hears which build did. The built content script carries the claim and the fault copy.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { claimPage, CLAIM, MARK, EVENT } from "../src/content/duplicate.ts";

const fakeRoot = () => { const a = new Map(); return { hasAttribute: (n) => a.has(n), getAttribute: (n) => a.get(n) ?? null, setAttribute: (n, v) => a.set(n, v), a }; };

test("the first Kari claims the page; the second and third stand down and the owner hears each build", () => {
  const root = fakeRoot(), doc = new EventTarget(), heard = [];
  assert.equal(claimPage(root, doc, "0.7.1+aaaa", (b) => heard.push(b)), true);
  assert.equal(root.a.get(CLAIM), "0.7.1+aaaa");
  assert.deepEqual(heard, []);
  assert.equal(claimPage(root, doc, "0.4.0+bbbb", () => { throw new Error("a later copy never hears"); }), false);
  assert.equal(root.a.get(MARK), "0.4.0+bbbb");
  assert.deepEqual(heard, ["0.4.0+bbbb"]);
  assert.equal(claimPage(root, doc, "0.9.0+cccc", () => {}), false);
  assert.deepEqual(heard, ["0.4.0+bbbb", "0.9.0+cccc"]);
});

test("the signal is a plain Event named kari:duplicate (a CustomEvent detail would not cross isolated worlds)", () => {
  const root = fakeRoot(), doc = new EventTarget(); let seen = null;
  doc.addEventListener(EVENT, (e) => { seen = e; });
  claimPage(root, doc, "a", () => {}); claimPage(root, doc, "b", () => {});
  assert.ok(seen instanceof Event); assert.equal(seen.constructor, Event);
});

test("the built content script carries the claim, the fault, and the copy that names the fix", () => {
  const js = fs.readFileSync(new URL("../extension/content.js", import.meta.url), "utf8");
  for (const needle of [CLAIM, MARK, EVENT, "two Karis are on this page", "chrome://extensions, then reload", "InvalidStateError"]) assert.ok(js.includes(needle), needle);
});
