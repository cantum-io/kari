// Live-probe driver: Playwright Chromium with the unpacked Mimi extension, controlled over HTTP on 127.0.0.1:9777.
// Used for docs/LIVE-PROBE.md. Not part of the shipped extension.
//
//   EXT=/abs/path/to/extension UDD=/tmp/mimi-udd HEADLESS=1 node server.mjs
//
// POST /eval {code}            evaluate in the page's MAIN world (code = async function body)
// POST /iso  {code}            evaluate in the extension's ISOLATED world (content script) via CDP → reaches __mimi
// POST /goto {url}             navigate the current page
// POST /newpage {url}          open a new tab and make it current
// POST /use {index}            switch current page
// POST /close {index}          close a page
// POST /key {key}              page.keyboard.press
// POST /click {selector|x,y}   click
// POST /mouse {x,y}            move the mouse
// POST /emulate {reducedMotion}  page.emulateMedia
// POST /cdp {method, params}   raw CDP on the current page
// POST /reload-ext             chrome.runtime.reload() in the extension service worker
// GET  /console                drain console + page errors + failed requests
// GET  /sw                     drain service-worker console
// GET  /shot?name=x            screenshot to shots/x.png
// GET  /pages                  list pages and their isolated worlds
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const EXT = process.env.EXT;
const UDD = process.env.UDD;
const PORT = +(process.env.PORT || 9777);
const MUTE = process.env.MUTE !== "0";
const HEADLESS = process.env.HEADLESS === "1";
const SHOTS = path.join(process.cwd(), "shots"); fs.mkdirSync(SHOTS, { recursive: true });

const context = await chromium.launchPersistentContext(UDD, {
  headless: HEADLESS, channel: HEADLESS ? "chromium" : undefined,
  viewport: process.env.VIEW ? { width: +process.env.VIEW.split('x')[0], height: +process.env.VIEW.split('x')[1] } : null,
  ignoreDefaultArgs: MUTE ? [] : ["--mute-audio"],
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    "--no-first-run", "--hide-crash-restore-bubble", "--window-size=1440,900",
    ...(MUTE ? ["--mute-audio"] : []),
  ],
});

const log = [];
const swlog = [];
const pages = [];
let cur = 0;

function attachSW(sw) { swlog.push({ t: Date.now(), type: "sw", text: "service worker: " + sw.url() }); }
context.on("serviceworker", attachSW);
for (const sw of context.serviceWorkers()) attachSW(sw);
context.on("console", (msg) => { if (!msg.page()) swlog.push({ t: Date.now(), type: msg.type(), text: msg.text(), loc: msg.location()?.url }); });

async function track(page) {
  const rec = { page, cdp: null, worlds: new Map() };
  pages.push(rec);
  page.on("console", (msg) => log.push({ t: Date.now(), p: pages.indexOf(rec), type: msg.type(), text: msg.text(), loc: msg.location()?.url + ":" + msg.location()?.lineNumber }));
  page.on("pageerror", (err) => log.push({ t: Date.now(), p: pages.indexOf(rec), type: "pageerror", text: String(err?.message || err) }));
  page.on("requestfailed", (r) => log.push({ t: Date.now(), p: pages.indexOf(rec), type: "requestfailed", text: r.url() + " " + (r.failure()?.errorText || "") }));
  try {
    const cdp = await context.newCDPSession(page);
    rec.cdp = cdp;
    cdp.on("Runtime.executionContextCreated", ({ context: c }) => {
      if (c.auxData && c.auxData.type === "isolated") rec.worlds.set(c.name, c.id);
      if (c.auxData && c.auxData.isDefault) rec.worlds.set("__main__", c.id);
    });
    cdp.on("Runtime.executionContextsCleared", () => rec.worlds.clear());
    await cdp.send("Runtime.enable");
  } catch (e) { log.push({ t: Date.now(), type: "cdp-error", text: String(e) }); }
  return rec;
}
context.on("page", (p) => { track(p); });
for (const p of context.pages()) await track(p);
if (!pages.length) await track(await context.newPage());

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(s ? JSON.parse(s) : {})); });

async function evalIso(rec, code) {
  const names = [...rec.worlds.keys()].filter((n) => n !== "__main__");
  const name = names.find((n) => /mimi/i.test(n)) || names[names.length - 1];
  if (!name) throw new Error("no isolated world yet; worlds=" + JSON.stringify(names));
  const r = await rec.cdp.send("Runtime.evaluate", { expression: `(async () => { ${code} })()`, contextId: rec.worlds.get(name), awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const rec = pages[cur];
  try {
    if (req.method === "GET" && u.pathname === "/console") return json(res, 200, log.splice(0));
    if (req.method === "GET" && u.pathname === "/sw") return json(res, 200, swlog.splice(0));
    if (req.method === "GET" && u.pathname === "/pages") return json(res, 200, pages.map((r, i) => ({ i, cur: i === cur, url: r.page.url(), worlds: [...r.worlds.keys()] })));
    if (req.method === "GET" && u.pathname === "/shot") { const f = path.join(SHOTS, (u.searchParams.get("name") || "shot") + ".png"); await rec.page.screenshot({ path: f }); return json(res, 200, { file: f }); }
    const b = await readBody(req);
    if (u.pathname === "/eval") { const v = await rec.page.evaluate(new Function("return (async () => {" + b.code + "})()")); return json(res, 200, { value: v }); }
    if (u.pathname === "/iso") { const v = await evalIso(rec, b.code); return json(res, 200, { value: v }); }
    if (u.pathname === "/goto") { await rec.page.goto(b.url, { waitUntil: b.wait || "domcontentloaded", timeout: 60000 }); return json(res, 200, { url: rec.page.url() }); }
    if (u.pathname === "/newpage") { const p = await context.newPage(); cur = pages.length - 1; if (b.url) await p.goto(b.url, { waitUntil: "domcontentloaded", timeout: 60000 }); return json(res, 200, { index: cur, url: p.url() }); }
    if (u.pathname === "/use") { cur = +b.index; await pages[cur].page.bringToFront(); return json(res, 200, { index: cur, url: pages[cur].page.url() }); }
    if (u.pathname === "/close") { const i = b.index ?? cur; await pages[i].page.close(); pages.splice(i, 1); cur = Math.min(cur, pages.length - 1); return json(res, 200, { pages: pages.length }); }
    if (u.pathname === "/key") { await rec.page.keyboard.press(b.key, { delay: b.delay || 0 }); return json(res, 200, { ok: true }); }
    if (u.pathname === "/click") { if (b.selector) await rec.page.click(b.selector, { timeout: 10000, force: !!b.force }); else await rec.page.mouse.click(+b.x, +b.y); return json(res, 200, { ok: true }); }
    if (u.pathname === "/mouse") { await rec.page.mouse.move(+b.x, +b.y); return json(res, 200, { ok: true }); }
    if (u.pathname === "/viewport") { await rec.page.setViewportSize({ width: +b.width, height: +b.height }); return json(res, 200, { ok: true }); }
    if (u.pathname === "/emulate") { await rec.page.emulateMedia({ reducedMotion: b.reducedMotion || null }); return json(res, 200, { ok: true }); }
    if (u.pathname === "/cdp") { const v = await rec.cdp.send(b.method, b.params || {}); return json(res, 200, { value: v }); }
    if (u.pathname === "/reload-ext") { const sw = context.serviceWorkers().find((w) => w.url().startsWith("chrome-extension://")); if (!sw) return json(res, 500, { error: "no extension sw" }); await sw.evaluate(() => chrome.runtime.reload()); await new Promise((r) => setTimeout(r, 1500)); return json(res, 200, { ok: true }); }
    if (u.pathname === "/quit") { json(res, 200, { bye: true }); await context.close(); process.exit(0); }
    json(res, 404, { error: "unknown " + u.pathname });
  } catch (e) { json(res, 500, { error: String(e && e.stack || e) }); }
}).listen(PORT, "127.0.0.1", () => console.log("probe server on " + PORT + " ext=" + EXT + " mute=" + MUTE + " headless=" + HEADLESS));
