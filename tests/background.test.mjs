// Service-worker SoundCloud logic (src/background/soundcloud.ts) under a fake chrome: the grant path from the toolbar
// icon, registration sync, injection into open tabs, and the ping that keeps injection to once per tab.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSoundCloud, isSoundCloudUrl, SC_MATCH, SC_SCRIPTS } from "../src/background/soundcloud.ts";

function fakeChrome(o = {}) {
  const calls = [];
  const registered = new Map(o.registered || []);
  const state = { granted: !!o.granted, requestAnswer: o.requestAnswer ?? true, requestThrows: o.requestThrows || null, tabs: o.tabs || [], present: new Set(o.present || []), executeThrows: o.executeThrows || null };
  const c = {
    permissions: {
      async contains() { calls.push(["contains"]); return state.granted; },
      async request() { calls.push(["request"]); if (state.requestThrows) throw new Error(state.requestThrows); if (state.requestAnswer) state.granted = true; return state.requestAnswer; },
    },
    scripting: {
      async getRegisteredContentScripts(f) { calls.push(["get"]); return [...registered.values()].filter(s => !f?.ids || f.ids.includes(s.id)); },
      async registerContentScripts(s) { calls.push(["register", s.map(x => x.id)]); for (const x of s) { if (registered.has(x.id)) throw new Error("Duplicate script ID"); registered.set(x.id, x); } },
      async updateContentScripts(s) { calls.push(["update", s.map(x => x.id)]); for (const x of s) { if (!registered.has(x.id)) throw new Error("Nonexistent script ID"); registered.set(x.id, x); } },
      async unregisterContentScripts(f) { calls.push(["unregister", f?.ids]); for (const id of f?.ids || [...registered.keys()]) registered.delete(id); },
      async executeScript(i) { calls.push(["execute", i.target.tabId, i.world, i.files[0]]); if (state.executeThrows) throw new Error(state.executeThrows); state.present.add(i.target.tabId); },
    },
    tabs: {
      async query(q) { calls.push(["query", q.url]); return state.tabs; },
      async sendMessage(tabId, m) { calls.push(["send", tabId, m.type]); if (m.type === "kari:ping" && state.present.has(tabId)) return { site: "soundcloud" }; throw new Error("Could not establish connection. Receiving end does not exist."); },
    },
  };
  const log = { lines: [], debug(...a) { this.lines.push(a.join(" ")); }, warn(...a) { this.lines.push("WARN " + a.join(" ")); } };
  return { c, calls, state, registered, log };
}
const ids = (m) => [...m.keys()].sort();

test("isSoundCloudUrl: the host only, never lookalikes", () => {
  assert.equal(isSoundCloudUrl("https://soundcloud.com/lofilion/cave"), true);
  assert.equal(isSoundCloudUrl("https://soundcloud.com"), true);
  assert.equal(isSoundCloudUrl("https://www.youtube.com/watch?v=x"), false);
  assert.equal(isSoundCloudUrl("https://soundcloud.com.evil.net/"), false);
  assert.equal(isSoundCloudUrl("http://soundcloud.com/"), false);
  assert.equal(isSoundCloudUrl(undefined), false);
});

test("sync: registers both scripts when granted, updates on a second pass, unregisters when revoked", async () => {
  const f = fakeChrome({ granted: true });
  const sc = makeSoundCloud(f.c, f.log);
  assert.equal(await sc.sync("installed"), true);
  assert.deepEqual(ids(f.registered), ["kari-sc-bridge", "kari-sc-hook"]);
  assert.equal(f.registered.get("kari-sc-hook").world, "MAIN");
  assert.equal(f.registered.get("kari-sc-bridge").world, "ISOLATED");
  assert.ok(f.log.lines.some(l => l === "[kari] soundcloud scripts registered (installed)"));
  await sc.sync("startup");
  assert.ok(f.calls.some(c => c[0] === "update"), "second pass updates in place");
  assert.equal(f.calls.filter(c => c[0] === "register").length, 1, "never re-registers the same ids");
  f.state.granted = false;
  assert.equal(await sc.sync("permission removed"), false);
  assert.deepEqual(ids(f.registered), []);
  assert.ok(f.log.lines.some(l => l === "[kari] soundcloud scripts unregistered (permission removed)"));
});

test("sync: serialised — overlapping calls never race the registry", async () => {
  const f = fakeChrome({ granted: true });
  const sc = makeSoundCloud(f.c, f.log);
  await Promise.all([sc.sync("a"), sc.sync("b"), sc.sync("c")]);
  assert.deepEqual(ids(f.registered), ["kari-sc-bridge", "kari-sc-hook"]);
  assert.equal(f.calls.filter(c => c[0] === "register").length, 1);
});

test("activate: not a SoundCloud tab → nothing asked, nothing registered", async () => {
  const f = fakeChrome();
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://www.youtube.com/watch?v=abc" });
  assert.equal(r, "not-soundcloud");
  assert.deepEqual(f.calls, []);
});

test("activate: SoundCloud tab, no grant yet → request, register, inject hook (MAIN) then bridge (ISOLATED)", async () => {
  const f = fakeChrome({ granted: false });
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://soundcloud.com/lofilion/cave" });
  assert.equal(r, "injected");
  const names = f.calls.map(c => c[0]);
  assert.ok(names.indexOf("request") < names.indexOf("register"), "asks before registering");
  assert.deepEqual(ids(f.registered), ["kari-sc-bridge", "kari-sc-hook"]);
  const ex = f.calls.filter(c => c[0] === "execute");
  assert.deepEqual(ex, [["execute", 7, "MAIN", "sc-hook.js"], ["execute", 7, "ISOLATED", "sc-bridge.js"]]);
  assert.ok(f.calls.some(c => c[0] === "send" && c[2] === "kari:ping"), "pings before injecting");
});

test("activate: prompt refused → denied, nothing registered or injected", async () => {
  const f = fakeChrome({ granted: false, requestAnswer: false });
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://soundcloud.com/discover" });
  assert.equal(r, "denied");
  assert.deepEqual(ids(f.registered), []);
  assert.ok(!f.calls.some(c => c[0] === "execute"));
});

test("activate: request outside a user gesture throws → denied, logged, no crash", async () => {
  const f = fakeChrome({ granted: false, requestThrows: "This function must be called during a user gesture" });
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://soundcloud.com/discover" });
  assert.equal(r, "denied");
  assert.ok(f.log.lines.some(l => l.startsWith("WARN [kari] soundcloud permission request failed")));
});

test("activate: already granted and already running in this tab → present, no second injection", async () => {
  const f = fakeChrome({ granted: true, present: [7] });
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://soundcloud.com/discover" });
  assert.equal(r, "present");
  assert.ok(!f.calls.some(c => c[0] === "request"), "no prompt when granted");
  assert.ok(!f.calls.some(c => c[0] === "execute"));
  assert.deepEqual(ids(f.registered), ["kari-sc-bridge", "kari-sc-hook"], "registration still synced");
});

test("activate: injection failure is reported as failed, never thrown", async () => {
  const f = fakeChrome({ granted: true, executeThrows: "Cannot access contents of the page" });
  const r = await makeSoundCloud(f.c, f.log).activate({ id: 7, url: "https://soundcloud.com/discover" });
  assert.equal(r, "failed");
});

test("injectOpenTabs: every open SoundCloud tab without the bridge gets it once; tabs that answer the ping are skipped", async () => {
  const f = fakeChrome({ granted: true, tabs: [{ id: 1, url: "https://soundcloud.com/a" }, { id: 2, url: "https://soundcloud.com/b" }, { url: "https://soundcloud.com/no-id" }], present: [2] });
  const sc = makeSoundCloud(f.c, f.log);
  await sc.sync("permission added");
  assert.equal(await sc.injectOpenTabs(), 1);
  assert.deepEqual(f.calls.filter(c => c[0] === "query"), [["query", SC_MATCH]]);
  assert.deepEqual(f.calls.filter(c => c[0] === "execute").map(c => c[1]), [1, 1]);
  assert.equal(await sc.injectOpenTabs(), 0, "a second pass injects nothing: tab 1 now answers the ping");
});

test("SC_SCRIPTS: the names the build writes and test-hosts.mjs lists", () => {
  assert.deepEqual(SC_SCRIPTS.map(s => s.js[0]), ["sc-hook.js", "sc-bridge.js"]);
  assert.ok(SC_SCRIPTS.every(s => s.runAt === "document_start" && s.persistAcrossSessions === true && s.matches[0] === SC_MATCH));
});
