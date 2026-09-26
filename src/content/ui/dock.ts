// Mimi — in-player dock (Shadow DOM). Ported from docs/playground.html.
import { DOCK_CSS } from "./dock.css";
declare const __MIMI_BUILD__: string; // stamped by scripts/build.mjs
import { type Params, keyName, fmtSpeed, fmtSigned, stepSt, stepTempo, setRange, isNeutral, DEFAULT_PARAMS } from "../../shared/math";
import type { Settings, Skin, MimiColor } from "../../shared/storage";
import type { AudioStatus } from "../audio/controller";

export type DockDeps = {
  getParams(): Params;
  apply(p: Params): void;
  setCompare(on: boolean): void;
  settings: Settings;
  saveSettings(patch: Partial<Settings>): void;
  level(): number;        // 0..1 RMS for Mimi's pulse
  optionsUrl: string;
};

const GEAR = `<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>`;

const CTL = `
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00×</span></b><span class="p ro">pitch <span data-b="st">0</span> · <span data-b="bpm"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">−</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">−</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="full">
    <div class="pills">
      <button class="pill" data-a="vinyl" aria-pressed="true">Vinyl</button>
      <button class="pill" data-a="lock" aria-pressed="false">Key lock</button>
      <span class="rng"><button data-a="range" data-v="8">±8</button><button data-a="range" data-v="16">±16</button><button data-a="range" data-v="50">±50</button></span>
    </div>
    <div class="pills">
      <button class="pill hold" data-a="compare">Hold to compare</button>
      <button class="pill" data-a="reset">Reset</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">—</em></span><span>a/v <em class="ro" data-b="av">—</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`;

const MIMI_SVG = `
<svg viewBox="0 0 160 180" aria-hidden="true">
  <defs>
    <radialGradient id="mimi-blobfill" cx="40%" cy="30%" r="80%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".95"/><stop offset=".5" style="stop-color:var(--m2)" stop-opacity=".6"/><stop offset="1" style="stop-color:var(--m3)" stop-opacity=".3"/></radialGradient>
    <filter id="mimi-goo"><feGaussianBlur stdDeviation="2" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
  </defs>
  <g class="beat" data-el="beat">
    <g class="blob" style="transform-origin:80px 90px">
      <ellipse cx="80" cy="95" rx="54" ry="60"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/>
      <ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/>
      <ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/>
    </g>
    <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>
    <g class="acc shoes">
      <path d="M34 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M30 176 h40 M32 172 l3 3 M38 171 l3 4 M44 171 l3 4 M50 171 l3 4 M56 171 l3 4 M62 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M40 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
      <path d="M90 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M86 176 h40 M88 172 l3 3 M94 171 l3 4 M100 171 l3 4 M106 171 l3 4 M112 171 l3 4 M118 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M96 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
    </g>
    <g class="lid l"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
    <g class="lid r"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
    <g class="lid l"><circle class="iris" data-el="i1" cx="64" cy="88" r="4"/></g>
    <g class="lid r"><circle class="iris" data-el="i2" cx="100" cy="88" r="4"/></g>
    <path class="mouth" d="M70 112 q10 8 20 0" fill="none" stroke="#03141a" stroke-width="2" stroke-linecap="round"/>
    <text class="zz" x="118" y="60">zz</text>
    <g class="acc shades">
      <rect x="47" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <rect x="83" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <path d="M77 85 h6" stroke="#050507" stroke-width="2"/><path d="M47 84 l-10 -4 M113 84 l10 -4" stroke="#050507" stroke-width="1.6"/>
      <path d="M52 83 h10 M88 83 h10" stroke="rgba(255,255,255,.45)" stroke-width="1"/>
    </g>
    <g class="acc cap">
      <path d="M46 46 q34 -30 68 0 v6 h-68z" fill="#0d0d12"/><path d="M40 52 h84 q-4 -6 -8 -6 h-68 q-4 0 -8 6z" fill="#0d0d12"/>
      <path d="M104 50 q22 -2 30 6 q-14 0 -30 -2z" fill="#0d0d12"/><path d="M46 46 q34 -30 68 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <text x="80" y="40" font-size="8.5" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" fill="#efece4" letter-spacing="1">YGG</text>
    </g>
  </g>
  <circle class="bubble" data-el="bubble" cx="118" cy="76" r="14"/>
</svg>`;

const PLUSH_SVG = `
<svg viewBox="0 0 80 90" aria-hidden="true">
  <ellipse cx="40" cy="60" rx="30" ry="26" fill="#d9c4a7"/><ellipse cx="40" cy="63" rx="18" ry="16" fill="#efe1c8"/><circle cx="40" cy="32" r="21" fill="#d9c4a7"/>
  <ellipse cx="18" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(-30 18 18)"/><ellipse cx="62" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(30 62 18)"/>
  <circle cx="32" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="48" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="33" cy="29" r="1" fill="#fff"/><circle cx="49" cy="29" r="1" fill="#fff"/>
  <path d="M36 39 q4 4 8 0" fill="none" stroke="#5a4634" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M22 62 l-12 10 M58 62 l12 10" stroke="#c9b092" stroke-width="9" stroke-linecap="round"/>
  <path d="M30 52 l4 -3 l4 3 l4 -3 l4 3" fill="none" stroke="#8b6f52" stroke-width="1" stroke-dasharray="2 2"/>
  <rect x="34" y="70" width="12" height="7" rx="1" fill="#f3f1ea"/><text x="40" y="75.5" font-size="4.5" text-anchor="middle" font-family="Space Mono,monospace" fill="#111">YGG</text>
</svg>`;

const TEMPLATE = `
<div class="root" data-collapsed="0" data-small="0">
  <section class="skin" data-skin="org">
    <div class="org" data-mimi="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${CTL}
      <div class="body anchor" data-el="mimi" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls">${MIMI_SVG}</div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${CTL}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${CTL}</div>
  </section>
  <section class="skin" data-skin="cons" hidden>
    <div class="cons">
      <svg viewBox="0 0 640 360" aria-label="Key and speed constellation" data-el="consSvg">
        <g data-el="starfield"></g>
        <ellipse class="orbit" cx="330" cy="200" rx="120" ry="52"/><circle class="sun" cx="330" cy="200" r="8"/>
        <path class="arc" data-el="tempoArc"/><g data-el="ticks"></g>
        <line class="ray" data-el="ray" x1="330" y1="200" x2="330" y2="148"/>
        <circle class="moon anchor" data-el="moon" cx="330" cy="148" r="9" data-a="show"/>
        <text class="lab" x="170" y="120" data-b="keypair"></text>
        <text class="lab2" x="172" y="142">pitch <tspan data-b="st">0</tspan></text>
        <text class="lab" x="440" y="290" data-b="speed">1.00×</text>
        <text class="lab2" x="442" y="312" data-b="bpm"></text>
        <rect class="hit" x="150" y="120" width="360" height="160"/>
      </svg>
    </div>
    <div class="cons-ctl absorb">${CTL}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) · pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Mimi settings" aria-expanded="false">${GEAR}</button>
  <aside class="settings" data-el="settings" hidden>
    <div class="sh"><span>Settings</span><button class="x" data-s="close" aria-label="Close">✕</button></div>
    <div class="sg"><b>Interface</b><div class="row">
      <button class="chip" data-skin="org">Organism</button><button class="chip" data-skin="void">Void Signal</button>
      <button class="chip" data-skin="weather">Alien Weather</button><button class="chip" data-skin="cons">Constellation</button></div></div>
    <div class="sg"><b>Mimi</b><div class="row">
      <button class="swatch" data-mimi="blue" style="--c:#5cf2ff">Blue</button><button class="swatch" data-mimi="pink" style="--c:#ff7ad9">Pink</button><button class="swatch" data-mimi="black" style="--c:#2a2a33">Black</button></div>
      <div class="row col">
        <label class="ul"><input type="checkbox" data-set="cap"> <span>YGG cap</span></label>
        <label class="ul"><input type="checkbox" data-set="shades"> <span>Thin black sunglasses</span></label>
        <label class="ul"><input type="checkbox" data-set="shoes"> <span>Chunky sneakers</span></label></div></div>
    <div class="sg"><b>Extras</b><div class="row col"><label class="ul"><input type="checkbox" data-set="plush"> <span>Plush trophy in corner</span></label></div></div>
    <div class="row hiderow"><button class="big" data-a="hide">Hide dock · absorb into Mimi</button></div>
    <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
    <a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a>
  </aside>
  <button class="plush" data-el="plush" aria-label="Plush trophy">${PLUSH_SVG}</button>
</div>`;

const CX = 330, CY = 200, RX = 120, RY = 52, BASE_KEY = 8; // A♭m shown as the reference key until detection exists

export class Dock {
  private root: HTMLElement; private shadow: ShadowRoot; private wrap: HTMLElement;
  get hostEl() { return this.wrap; }
  private el = (name: string) => this.shadow.querySelector(`[data-el="${name}"]`) as HTMLElement;
  private $$ = (sel: string) => Array.from(this.shadow.querySelectorAll(sel)) as HTMLElement[];
  private status: AudioStatus | null = null;
  private raf = 0; private visible = true; private consDrag = false;

  constructor(private host: HTMLElement, private deps: DockDeps) {
    const wrap = document.createElement("div");
    this.wrap = wrap;
    wrap.id = "mimi-dock";
    wrap.dataset.build = __MIMI_BUILD__;
    wrap.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:60";
    this.shadow = wrap.attachShadow({ mode: "open" });
    const style = document.createElement("style"); style.textContent = DOCK_CSS;
    this.shadow.appendChild(style);
    const tpl = document.createElement("template"); tpl.innerHTML = TEMPLATE;
    this.shadow.appendChild(tpl.content.cloneNode(true));
    host.appendChild(wrap);
    this.root = this.shadow.querySelector(".root") as HTMLElement;
    this.seedStars();
    this.wire();
    this.applySettings(deps.settings);
    this.render();
    this.startPulse();
  }

  destroy() { cancelAnimationFrame(this.raf); this.host.querySelector("#mimi-dock")?.remove(); }

  /* ---------- public updates ---------- */
  setStatus(s: AudioStatus) {
    this.status = s;
    const f = this.el("fault");
    const msg = s.fault === "drm-silent" ? "this video's audio is protected — Mimi can't touch it" : s.fault === "capture-failed" ? "couldn't reach the audio on this page" : s.fault === "worklet-failed" ? "engine hiccup — playing untouched audio" : "";
    f.hidden = !msg; f.textContent = msg;
    this.shadow.querySelector(".org")?.setAttribute("data-fault", s.fault ? "1" : "0");
    this.render();
  }
  setControlsHidden(hidden: boolean) { this.root.dataset.hiddenWithControls = hidden ? "1" : "0"; }
  setSmall(small: boolean) { this.root.dataset.small = small ? "1" : "0"; }
  applySettings(s: Settings) {
    this.$$(".skin").forEach(sk => (sk as HTMLElement).hidden = sk.dataset.skin !== s.skin);
    this.$$(".chip[data-skin]").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.skin === s.skin)));
    const org = this.shadow.querySelector(".org") as HTMLElement;
    org.dataset.mimi = s.mimiColor; org.dataset.cap = s.cap ? "1" : "0"; org.dataset.shades = s.shades ? "1" : "0"; org.dataset.shoes = s.shoes ? "1" : "0";
    this.$$("[data-mimi]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mimi === s.mimiColor)));
    (this.$$("input[data-set]") as HTMLInputElement[]).forEach(i => i.checked = !!(s as any)[i.dataset.set!]);
    this.el("plush").hidden = !s.plush;
    this.root.dataset.collapsed = s.collapsed ? "1" : "0";
    this.$$(".ctl").forEach(c => c.dataset.full = s.fullControl ? "1" : "0");
    this.$$('[data-a="full"]').forEach(b => b.setAttribute("aria-pressed", String(s.fullControl)));
    this.el("intro").hidden = s.seenIntro;
    (this.el("more") as HTMLAnchorElement).href = this.deps.optionsUrl;
    this.deps.settings = s;
  }
  react() { // eyes light + bubble; called on every parameter change
    const b = this.el("bubble"); b.classList.remove("go"); void (b as any).getBBox?.(); b.classList.add("go");
    ["i1", "i2"].forEach(id => { const e = this.el(id); e.classList.add("lit"); setTimeout(() => e.classList.remove("lit"), 700); });
  }

  /* ---------- render ---------- */
  render() {
    const p = this.deps.getParams();
    const s = this.status;
    const map: Record<string, string> = {
      speed: fmtSpeed(p.tempo), st: fmtSigned(p.st), bpm: s?.baseRate && Math.abs(s.baseRate - 1) > 1e-3 ? `yt ${s.baseRate.toFixed(2)}×` : "",
      keypair: `${keyName(BASE_KEY, 0)} → ${keyName(BASE_KEY, p.st)}`,
      engine: s ? (s.engine === "r3" ? "R3" : s.engine === "ss" ? "SS" : "wire") : "—",
      av: s ? (s.attached ? `${s.avOffsetMs} ms` : "0 ms") : "—",
    };
    this.$$("[data-b]").forEach(el => { const v = map[el.dataset.b!]; if (v !== undefined && el.textContent !== v) el.textContent = v; });
    this.$$('[data-b="av"]').forEach(el => el.classList.toggle("warn", !!s && s.avOffsetMs > 125));
    (this.$$('input[data-a="tempo"]') as HTMLInputElement[]).forEach(r => { r.min = String(-p.range); r.max = String(p.range); if (+r.value !== p.tempo) r.value = String(p.tempo); });
    this.$$('[data-a="lock"]').forEach(b => b.setAttribute("aria-pressed", String(p.keyLock)));
    this.$$('[data-a="vinyl"]').forEach(b => b.setAttribute("aria-pressed", String(!p.keyLock)));
    this.$$('[data-a="range"]').forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v! === p.range)));
    (this.shadow.querySelector(".void") as HTMLElement).dataset.off = isNeutral(p) ? "1" : "0";
    this.renderCons(p);
  }

  /* ---------- events ---------- */
  private wire() {
    const sh = this.shadow;
    sh.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement).closest("[data-a]") as HTMLElement | null;
      if (!el) return;
      const a = el.dataset.a!; let p = this.deps.getParams();
      const commit = (np: Params) => { this.deps.apply(np); this.react(); this.render(); };
      switch (a) {
        case "st+": commit(stepSt(p, 1)); break;
        case "st-": commit(stepSt(p, -1)); break;
        case "tempo+": commit(stepTempo(p, 1)); break;
        case "tempo-": commit(stepTempo(p, -1)); break;
        case "lock": commit({ ...p, keyLock: true }); break;
        case "vinyl": commit({ ...p, keyLock: false }); break;
        case "reset": commit({ ...DEFAULT_PARAMS, range: p.range, keyLock: p.keyLock }); break;
        case "range": commit(setRange(p, +el.dataset.v! as 8 | 16 | 50)); break;
        case "full": this.deps.saveSettings({ fullControl: !this.deps.settings.fullControl }); break;
        case "hide": this.deps.saveSettings({ collapsed: true }); this.react(); break;
        case "show": this.deps.saveSettings({ collapsed: !this.deps.settings.collapsed }); this.react(); break; // Mimi is a toggle: click to fold, click to unfold (Jesse, 2026-09-26)
        case "intro-ok": this.deps.saveSettings({ seenIntro: true }); break;
      }
    });
    sh.addEventListener("keydown", (e: Event) => {
      const ke = e as KeyboardEvent; const el = (ke.target as HTMLElement).closest('[role="button"][data-a]') as HTMLElement | null;
      if (el && (ke.key === "Enter" || ke.key === " ")) { ke.preventDefault(); el.click(); }
      ke.stopPropagation(); // keep YouTube's shortcuts (k, j, l, space…) from firing while typing in the dock
    });
    sh.addEventListener("keyup", (e) => e.stopPropagation());
    sh.addEventListener("input", (e) => { const t = e.target as HTMLInputElement; if (t.matches('input[data-a="tempo"]')) { const p = this.deps.getParams(); this.deps.apply({ ...p, tempo: +t.value }); this.render(); } });
    sh.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.matches('input[data-a="tempo"]')) this.react();
      if (t.dataset.set) this.deps.saveSettings({ [t.dataset.set]: t.checked } as Partial<Settings>);
    });
    // hold-to-compare
    sh.addEventListener("pointerdown", (e) => { const b = (e.target as HTMLElement).closest('[data-a="compare"]') as HTMLElement | null; if (b) { this.hold(true); b.setPointerCapture?.((e as PointerEvent).pointerId); } });
    ["pointerup", "pointercancel"].forEach(t => sh.addEventListener(t, () => { if (this.holding) this.hold(false); }));
    sh.addEventListener("keydown", (e: Event) => { const ke = e as KeyboardEvent; if ((ke.target as HTMLElement).closest('[data-a="compare"]') && ke.key === " " && !ke.repeat) { ke.preventDefault(); this.hold(true); } });
    sh.addEventListener("keyup", (e: Event) => { const ke = e as KeyboardEvent; if ((ke.target as HTMLElement).closest('[data-a="compare"]') && ke.key === " ") { ke.preventDefault(); this.hold(false); } });
    // settings
    const gear = this.el("gear"), settings = this.el("settings");
    gear.addEventListener("click", () => { const open = settings.hidden; settings.hidden = !open; gear.setAttribute("aria-expanded", String(open)); });
    settings.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest('[data-s="close"]')) { settings.hidden = true; gear.setAttribute("aria-expanded", "false"); } });
    this.$$("[data-skin].chip").forEach(c => c.addEventListener("click", () => this.deps.saveSettings({ skin: c.dataset.skin as Skin })));
    this.$$("[data-mimi]").forEach(b => b.addEventListener("click", () => { this.deps.saveSettings({ mimiColor: b.dataset.mimi as MimiColor }); this.react(); }));
    // plush
    const plush = this.el("plush");
    plush.addEventListener("click", () => { plush.classList.remove("poke"); void plush.offsetWidth; plush.classList.add("poke"); this.react(); });
    // constellation drag
    const svg = this.el("consSvg") as unknown as SVGSVGElement;
    const toSt = (e: PointerEvent) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 640, y = (e.clientY - r.top) / r.height * 360; const ang = Math.atan2((x - CX) / RX, -(y - CY) / RY); return Math.max(-12, Math.min(12, Math.round(ang / Math.PI * 12))); };
    svg.addEventListener("pointerdown", (e) => { if (this.deps.settings.collapsed) return; if ((e.target as Element).closest(".hit,.moon")) { this.consDrag = true; svg.setPointerCapture(e.pointerId); const v = toSt(e); const p = this.deps.getParams(); if (v !== p.st) { this.deps.apply({ ...p, st: v }); this.render(); } } });
    svg.addEventListener("pointermove", (e) => { if (!this.consDrag) return; const v = toSt(e); const p = this.deps.getParams(); if (v !== p.st) { this.deps.apply({ ...p, st: v }); this.render(); } });
    ["pointerup", "pointercancel"].forEach(t => svg.addEventListener(t, () => { if (this.consDrag) { this.consDrag = false; this.react(); } }));
    // Stop clicks reaching YouTube's player (which toggles play/pause on click). Listen on the HOST, not inside the
    // shadow tree: events bubble through the dock's own handlers first, then retarget to the host, then we stop them.
    ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "wheel", "contextmenu"].forEach(t => this.wrap.addEventListener(t, (e) => e.stopPropagation()));
  }
  private holding = false;
  private hold(on: boolean) { this.holding = on; this.deps.setCompare(on); this.$$('[data-a="compare"]').forEach(b => b.dataset.held = on ? "1" : "0"); }

  /* ---------- Mimi pulse from the audio level ---------- */
  private startPulse() {
    let last = 0; let peak = 0;
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      if (document.hidden || t - last < 33) return; last = t; // ~30 fps
      const orgVisible = !(this.shadow.querySelector('.skin[data-skin="org"]') as HTMLElement).hidden;
      if (!orgVisible) return;
      const lvl = this.deps.level();                       // 0..~0.5
      peak = Math.max(lvl, peak * 0.85);                   // fast attack, slow release
      const sx = 1 + Math.min(0.08, peak * 0.35), sy = 1 - Math.min(0.06, peak * 0.25);
      (this.el("beat") as any).style.transform = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    };
    this.raf = requestAnimationFrame(tick);
  }

  /* ---------- constellation ---------- */
  private seedStars() {
    const g = this.el("starfield"); let h = "";
    const pts = [[70, 60], [130, 300], [210, 70], [290, 330], [380, 60], [470, 90], [540, 140], [590, 300], [100, 180], [560, 330], [420, 320], [250, 290]];
    pts.forEach((p, i) => { const s = i % 3 === 0 ? 9 : 6; h += `<path class="star" transform="translate(${p[0]} ${p[1]})" d="M0 -${s} L${s * .3} -${s * .3} L${s} 0 L${s * .3} ${s * .3} L0 ${s} L-${s * .3} ${s * .3} L-${s} 0 L-${s * .3} -${s * .3}Z"/>`; });
    g.innerHTML = h;
    let t = ""; for (let i = -12; i <= 12; i += 3) { const a = (i / 12) * Math.PI; t += `<line class="tick" x1="${(CX + Math.sin(a) * (RX + 4)).toFixed(1)}" y1="${(CY - Math.cos(a) * (RY + 4)).toFixed(1)}" x2="${(CX + Math.sin(a) * (RX - 4)).toFixed(1)}" y2="${(CY - Math.cos(a) * (RY - 4)).toFixed(1)}"/>`; }
    this.el("ticks").innerHTML = t;
  }
  private renderCons(p: Params) {
    const a = (p.st / 12) * Math.PI; const mx = CX + Math.sin(a) * RX, my = CY - Math.cos(a) * RY;
    const moon = this.el("moon"), ray = this.el("ray");
    moon.setAttribute("cx", mx.toFixed(1)); moon.setAttribute("cy", my.toFixed(1)); ray.setAttribute("x2", mx.toFixed(1)); ray.setAttribute("y2", my.toFixed(1));
    const stars = this.$$(".star"); stars.forEach(s => s.classList.remove("lit")); if (stars.length) stars[((p.st % stars.length) + stars.length) % stars.length].classList.add("lit");
    const arc = this.el("tempoArc"); const r = 170; const t = Math.max(-50, Math.min(50, p.tempo)) / 50;
    const a0 = Math.PI * 0.62, a1 = a0 + t * 0.45; const pt = (ang: number) => [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r * 0.55];
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    arc.setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${(r * 0.55).toFixed(1)} 0 0 ${t >= 0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
  }
}
