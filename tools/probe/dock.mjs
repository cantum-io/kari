// Dock layout check, headless: the real Dock class on a blank page, no YouTube. Reads computed styles, never the
// extension's own readouts. `node tools/probe/dock.mjs [--shots dir]`. Exit 0 = every row holds, 1 = a row failed.
//
//   1. With Full control OFF the loop row (½ · 1 · 1 bar · 2 bars + the tempo readout) sits directly under the Pitch
//      and Speed steppers, pills disabled until a tempo exists; with Full control ON the same row is still there and
//      Tap / bpm / MIDI sit in the full panel.
//   2. The readout: "play to learn" / "click to learn" before the detector runs, "learning…" while it listens, "128 bpm"
//      once a tempo exists, "tap" only when it listened and found nothing, hidden where there is no detector.
//   3. A latched length is lit; clicking it calls release(); clicking another length calls latch(other).
//   4. YouTube's controls hidden (data-hidden-with-controls=1): the panel and the gear are invisible, Kari's blob
//      (.anchor) stays visible and clickable — on every skin's anchor. Miniplayer (data-small) and collapsed too.
//   5. prefers-reduced-motion: no animation on the pills, the readout or the body.
import { build } from "esbuild";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const argv = process.argv.slice(2), shots = argv.includes("--shots") ? path.resolve(argv[argv.indexOf("--shots") + 1] || "shots") : null;
const outDir = path.join(root, "test-build"); fs.mkdirSync(outDir, { recursive: true });
const bundle = path.join(outDir, "dock-probe.js");
await build({ entryPoints: [path.join(root, "src/content/ui/dock.ts")], bundle: true, format: "iife", globalName: "KariDock", outfile: bundle, target: ["chrome120"], define: { __KARI_BUILD__: '"probe"' }, logLevel: "silent" });

const browser = await chromium.launch({ headless: true, channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#111"><div id="player" style="position:relative;width:1280px;height:720px;background:#222"></div></body></html>`);
await page.addScriptTag({ path: bundle });
await page.evaluate(() => {
  const calls = (window.__calls = []);
  const settings = { skin: "org", kariColor: "blue", cap: false, shades: false, shoes: false, collapsed: false, fullControl: false, engine: "auto", defaultRange: 50, keyLockDefault: false, rememberPerVideo: true, seenIntro: true };
  const params = { st: 0, cents: 0, tempo: 0, keyLock: false, range: 50 };
  const deps = {
    getParams: () => params, apply() {}, setCompare() {}, settings, saveSettings(p) { Object.assign(settings, p); dock.applySettings(settings); }, level: () => 0.1, optionsUrl: "about:blank",
    loop: { latch: (b) => { calls.push(["latch", b]); return Promise.resolve(true); }, release: () => calls.push(["release"]), tap: () => null, setBpm() {}, nudge() {} },
    midi: { state: { supported: false, connected: false, inputs: 0, learning: null, lastNote: null, error: null }, learn() {}, connect() { return Promise.resolve(false); } },
  };
  const dock = (window.__dock = new KariDock.Dock(document.getElementById("player"), deps));
  window.__status = (patch) => dock.setStatus({ attached: true, engine: "bypass", engineLatencyMs: 0, outputLatencyMs: 0, avOffsetMs: 0, underruns: 0, load: 0, fault: null, baseRate: 1, loop: 0, loopMs: 0, loopClamped: false, bpm: null, gridSource: null, tempo: "idle", ...patch });
  window.__status({});
});
const q = (sel, what) => page.evaluate(([sel, what]) => {
  const sr = document.querySelector("#kari-dock").shadowRoot; const el = sr.querySelector(sel); if (!el) return null;
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  if (what === "text") return el.textContent.trim();
  if (what === "click") { el.click(); return true; }
  return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointer: cs.pointerEvents, anim: cs.animationName, top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height, disabled: !!el.disabled, pressed: el.getAttribute("aria-pressed"), hidden: !!el.hidden };
}, [sel, what]);
const shot = async (name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, name + ".png"), clip: { x: 760, y: 0, width: 520, height: 420 } }); } };

const rows = []; let fails = 0;
const row = (name, ok, detail) => { rows.push([ok ? "PASS" : "FAIL", name, detail]); if (!ok) fails++; };
const ORG = '.skin[data-skin="org"] ';

// 1. layout with Full control off
{
  const ctl = await q(ORG + ".ctl"), btns = await q(ORG + ".btns"), loops = await q(ORG + ".loops"), full = await q(ORG + ".full"), tempo = await q(ORG + ".tempo");
  const pills = []; for (const v of ["0.5", "1", "4", "8"]) pills.push(await q(ORG + `[data-a="loop"][data-v="${v}"]`));
  const labels = []; for (const v of ["0.5", "1", "4", "8"]) labels.push(await q(ORG + `[data-a="loop"][data-v="${v}"]`, "text"));
  row("loop row under the steppers, Full control off", !loops.hidden && loops.display === "flex" && loops.top >= btns.bottom && loops.top - btns.bottom <= 12 && full.display === "none" && tempo.w === 0,
    `btns bottom ${btns.bottom.toFixed(0)}, loops top ${loops.top.toFixed(0)}, full panel ${full.display}, tempo row laid out ${tempo.w > 0}`);
  row("four pills ½ · 1 · 1 bar · 2 bars, one line, inside the panel", labels.join("|") === "½|1|1 bar|2 bars" && pills.every(p => Math.abs(p.top - pills[0].top) < 1) && pills[3].right <= ctl.right && (await q(ORG + '[data-a="loop"][data-v="0.25"]')) === null && (await q(ORG + '[data-a="loop-off"]')) === null,
    `${labels.join(" · ")}; right edge ${pills[3].right.toFixed(0)} vs panel ${ctl.right.toFixed(0)}; no ¼, no ×`);
  row("pills disabled until a tempo exists", pills.every(p => p.disabled), JSON.stringify(pills.map(p => p.disabled)));
  await shot("01-full-off-no-tempo");
}
// 2. readout states (src/content/ui/tempo-readout.ts): what the detector waits for before it runs, "learning…" only while
//    it listens, a bpm once found, "tap" only once it listened and found nothing
{
  const ro = async () => q(ORG + '[data-b="tempo"]', "text");
  const idle = await ro();
  await page.evaluate(() => window.__status({ tempo: "gesture" }));
  const gesture = await ro();
  await page.evaluate(() => window.__status({ tempo: "learning" }));
  const learning = await ro(), learnAnim = (await q(ORG + '[data-b="tempo"]')).anim;
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto", tempo: "found" }));
  const found = await ro(); const enabled = (await q(ORG + '[data-a="loop"][data-v="4"]')).disabled === false;
  await shot("02-full-off-128bpm");
  await page.evaluate(() => window.__status({ tempo: "none" }));
  const none = await ro();
  await page.evaluate(() => window.__status({ tempo: "off" }));
  const off = await q(ORG + '[data-b="tempo"]');
  row("tempo readout: play to learn → click to learn → learning… → 128 bpm → tap → (hidden)", idle === "play to learn" && gesture === "click to learn" && learning === "learning…" && found === "128 bpm" && none === "tap" && enabled && off.display === "none",
    `"${idle}" → "${gesture}" → "${learning}" (anim ${learnAnim}) → "${found}" (pills enabled ${enabled}) → "${none}" → off display ${off.display}`);
  await page.evaluate(() => window.__status({}));
}
// 3. toggle semantics
{
  await page.evaluate(() => { window.__calls.length = 0; window.__status({ bpm: 128, gridSource: "auto" }); });
  await q(ORG + '[data-a="loop"][data-v="4"]', "click");
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto", loop: 4, loopMs: 1875 }));
  const lit = await q(ORG + '[data-a="loop"][data-v="4"]'), info = await q(ORG + '[data-b="loopinfo"]', "text");
  await shot("03-1bar-latched");
  await q(ORG + '[data-a="loop"][data-v="8"]', "click");   // switch
  await q(ORG + '[data-a="loop"][data-v="4"]', "click");   // still lit (status not updated): release
  const calls = await page.evaluate(() => window.__calls);
  row("click latches, lit click releases, other length switches (no × button)", lit.pressed === "true" && JSON.stringify(calls) === JSON.stringify([["latch", 4], ["latch", 8], ["release"]]) && info.startsWith("1 bar · 1875 ms"),
    `pressed ${lit.pressed}, loopinfo "${info}", calls ${JSON.stringify(calls)}`);
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto", loop: 8, loopMs: 10917, loopClamped: true }));
  row("a clamped loop says so on the readout", (await q(ORG + '[data-b="loopinfo"]', "text")).includes("ceiling"), await q(ORG + '[data-b="loopinfo"]', "text"));
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto" }));
}
// 1b. Full control on: the row is still there, Tap/bpm/MIDI in the full panel
{
  await q(ORG + '[data-a="full"]', "click");
  const loops = await q(ORG + ".loops"), btns = await q(ORG + ".btns"), tempo = await q(ORG + ".tempo"), tap = await q(ORG + '[data-a="tap"]'), bpm = await q(ORG + 'input[data-a="bpm"]');
  row("Full control on: loop row still under the steppers, Tap / bpm / MIDI in the full panel below it", !loops.hidden && loops.top >= btns.bottom && tempo.display === "flex" && tempo.top > loops.bottom && !!tap && !!bpm,
    `loops top ${loops.top.toFixed(0)} (btns bottom ${btns.bottom.toFixed(0)}), tempo row top ${tempo.top.toFixed(0)}`);
  await shot("04-full-on");
  await q(ORG + '[data-a="full"]', "click");
}
// 4. controls hidden: Kari stays
{
  const anchorFor = { org: ORG + ".anchor", void: '.skin[data-skin="void"] .void-orb', weather: '.skin[data-skin="weather"] .cloudlet', cons: '.skin[data-skin="cons"] .moon' };
  const panelFor = { org: ORG + ".ctl", void: '.skin[data-skin="void"] .void', weather: '.skin[data-skin="weather"] .pod', cons: '.skin[data-skin="cons"] .cons-ctl' };
  for (const skin of ["org", "void", "weather", "cons"]) {
    await page.evaluate((skin) => { window.__dock.applySettings({ ...window.__dock.deps.settings, skin }); window.__dock.setControlsHidden(true); }, skin);
    await page.waitForTimeout(300);
    const a = await q(anchorFor[skin]), p = await q(panelFor[skin]), gear = await q(".gear");
    row(`controls hidden, ${skin}: anchor visible and clickable, panel and gear gone`, a.visibility === "visible" && +a.opacity === 1 && a.pointer === "auto" && p.visibility === "hidden" && +p.opacity === 0 && gear.visibility === "hidden",
      `anchor vis ${a.visibility} op ${a.opacity} ptr ${a.pointer}; panel vis ${p.visibility} op ${p.opacity}; gear vis ${gear.visibility}`);
    if (skin === "org") await shot("05-controls-hidden-org");
    await page.evaluate(() => window.__dock.setControlsHidden(false));
    await page.waitForTimeout(300);
    const back = await q(panelFor[skin]);
    row(`controls back, ${skin}: panel returns`, back.visibility === "visible" && +back.opacity === 1, `panel vis ${back.visibility} op ${back.opacity}`);
  }
  await page.evaluate(() => window.__dock.applySettings({ ...window.__dock.deps.settings, skin: "org" }));
  // miniplayer: Kari alone, still there with controls hidden; collapsed: panel absorbed, Kari there
  await page.evaluate(() => { window.__dock.setSmall(true); window.__dock.setControlsHidden(true); }); await page.waitForTimeout(300);
  const mini = await q(ORG + ".anchor"), miniCtl = await q(ORG + ".ctl");
  row("miniplayer + controls hidden: Kari visible at 64×74, no panel", mini.visibility === "visible" && Math.round(mini.w) === 64 && miniCtl.display === "none", `anchor ${mini.w}×${mini.h} vis ${mini.visibility}, ctl display ${miniCtl.display}`);
  await page.evaluate(() => { window.__dock.setSmall(false); window.__dock.applySettings({ ...window.__dock.deps.settings, collapsed: true }); }); await page.waitForTimeout(400);
  const col = await q(ORG + ".anchor"), colCtl = await q(ORG + ".ctl");
  row("collapsed + controls hidden: Kari visible, panel absorbed", col.visibility === "visible" && +col.opacity === 1 && +colCtl.opacity === 0, `anchor vis ${col.visibility} op ${col.opacity}; ctl op ${colCtl.opacity}`);
  await page.evaluate(() => { window.__dock.applySettings({ ...window.__dock.deps.settings, collapsed: false }); window.__dock.setControlsHidden(false); });
}
// 5. reduced motion
{
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto", loop: 4, loopMs: 1875, learning: false }));
  const pill = await q(ORG + '[data-a="loop"][data-v="4"]'), body = await q(ORG + ".body");
  const after = await page.evaluate(() => { const sr = document.querySelector("#kari-dock").shadowRoot; return getComputedStyle(sr.querySelector('.skin[data-skin="org"] [data-a="loop"][data-v="4"]'), "::after").animationName; });
  await page.evaluate(() => window.__status({ tempo: "learning" }));
  const ro = await q(ORG + '[data-b="tempo"]');
  row("reduced motion: no sweep on the lit pill, no breath on the readout, no bob", after === "none" && ro.anim === "none" && body.anim === "none" && pill.anim === "none", `pill::after ${after}, readout ${ro.anim}, body ${body.anim}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.__status({ bpm: 128, gridSource: "auto", loop: 4, loopMs: 1875 }));
  const after2 = await page.evaluate(() => { const sr = document.querySelector("#kari-dock").shadowRoot; return getComputedStyle(sr.querySelector('.skin[data-skin="org"] [data-a="loop"][data-v="4"]'), "::after").animationName; });
  row("motion allowed: the lit pill sweeps once per pass", after2 === "kari-loopsweep", `pill::after ${after2}`);
}
const w = Math.max(...rows.map(r => r[1].length));
console.log(rows.map(([s, n, d]) => `${s}  ${n.padEnd(w)}  ${d}`).join("\n"));
console.log(`\n${rows.length - fails}/${rows.length} rows hold${shots ? `; screenshots in ${shots}` : ""}`);
await browser.close();
process.exit(fails ? 1 : 0);
