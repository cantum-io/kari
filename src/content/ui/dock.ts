// Kari — in-player dock (Shadow DOM). Ported from docs/playground.html.
import { DOCK_CSS } from "./dock.css";
import { takeReadout, fmtTake, NOTE_MS, type TakeNote } from "./take-readout";
declare const __KARI_BUILD__: string; // stamped by scripts/build.mjs
declare const __KARI_RECORD__: boolean; // scripts/build.mjs: the take's row is in by default; KARI_RECORD=0 compiles it out with the recorder
import { type Params, keyName, fmtSpeed, fmtSigned, stepSt, stepTempo, setRange, isNeutral, DEFAULT_PARAMS } from "../../shared/math";
import type { Settings, Skin, KariColor, KariForm } from "../../shared/storage";
import { FORMS, FORM_DEFS, FORM_IDS, formInfo, formSvg, orbitAt } from "./forms";
import type { AudioStatus } from "../audio/controller";
import { type LoopBeats, LOOP_BEATS, fmtBpm, loopLabel, loopAria, BPM_MIN, BPM_MAX } from "../beat/grid";
import type { Midi, MidiAction, MidiState } from "../midi";
import { tempoReadout } from "./tempo-readout";
import { HIDE_KEY, SITE_NAME } from "../../shared/sites";

export type DockDeps = {
  getParams(): Params;
  apply(p: Params): void;
  setCompare(on: boolean): void;
  settings: Settings;
  saveSettings(patch: Partial<Settings>): void;
  level(): number;        // 0..1 RMS for Kari's pulse
  optionsUrl: string;
  site?: "yt" | "sc";     // copy and placement differ per host page (default "yt")
  mountStyle?: string;    // the wrapper's inline style; default fills the host (YouTube's player box)
  // beat loops: click + MIDI only; the grid and the loop live in the audio controller, state comes back through setStatus
  // (on SoundCloud the controller sits in the MAIN-world hook and these calls cross src/soundcloud/loops.ts). A length
  // button toggles: the dock reads the lit length from status and calls release() on it, latch() on any other.
  // Absent = no loop path on this host: the dock hides the loop row and the MIDI group.
  loop?: { latch(beats: LoopBeats): Promise<boolean>; release(): void; tap(): number | null; setBpm(bpm: number): void; nudge(delta: number): void };
  midi?: Midi;
  // the take (KARI_RECORD=1 builds): one pill, click to start, click again to stop and save. start() false = nothing to
  // record (protected track, Kari hidden, no audio); stop() resolves to the seconds saved, null when nothing was kept.
  // Absent = no record path (a KARI_RECORD=0 build): the dock hides the row. On SoundCloud these calls cross
  // src/soundcloud/takes.ts to the recorder in the MAIN-world hook.
  record?: { start(): Promise<boolean>; stop(): Promise<number | null> };
};

const FAULT_COPY: Record<"yt" | "sc", Record<string, string>> = {
  yt: { "drm-silent": "this video's audio is protected — Kari can't touch it", "capture-failed": "couldn't reach the audio on this page", "worklet-failed": "engine hiccup — playing untouched audio", "hook-missing": "reload this page so Kari can reach the player", "late": "reload this page so Kari can reach the player", "duplicate": "two Karis are on this page — switch the other one off at chrome://extensions, then reload", "busy": "this machine is busy — playing the song as it is; reload to try again" },
  sc: { "drm-silent": "this track's audio is protected — speed only", "capture-failed": "couldn't reach SoundCloud's player — reload the page", "worklet-failed": "engine hiccup — playing untouched audio", "hook-missing": "reload this page so Kari can reach the player", "late": "reload this page once — Kari arrived after SoundCloud set up its player", "duplicate": "two Karis are on this page — switch the other one off at chrome://extensions, then reload", "busy": "this machine is busy — playing the track as it is; reload to try again" },
};
const LOOP_ACTION: Record<string, MidiAction> = { "0.5": "loop-h", "1": "loop-1", "4": "loop-bar", "8": "loop-2bar", tap: "tap" };
const LOOP_PILLS = LOOP_BEATS.map(b => `<button class="pill loop" data-a="loop" data-v="${b}" aria-pressed="false" aria-label="${loopAria(b)}" disabled>${loopLabel(b)}</button>`).join("");

const GEAR = `<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>`;

const CTL = `
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00×</span></b><span class="p ro">pitch <span data-b="st">0</span><span data-b="yt"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">−</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">−</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="loops">${LOOP_PILLS}<span class="tro ro" data-b="tempo" data-state="idle" aria-live="polite"></span></div>
  ${__KARI_RECORD__ ? `<div class="take"><button class="pill rec" data-a="rec" aria-pressed="false" aria-label="Record a take"><span class="dot"></span>Rec</button><span class="tro ro" data-b="take" aria-live="polite"></span></div>` : ""}
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
    <div class="tempo">
      <button class="pill" data-a="tap" aria-label="Tap tempo">Tap</button>
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">−</button><input class="bpm ro" type="number" min="${BPM_MIN}" max="${BPM_MAX}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">—</em></span><span>a/v <em class="ro" data-b="av">—</em></span><span>loop <em class="ro" data-b="loopinfo">—</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`;

const X_ICON = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>`;

/* ---------- settings: a tab bar over one pane at a time (0.11.0) ---------- */
const TABS: [string, string][] = [["kari", "Kari"], ["look", "Interface"], ["midi", "MIDI"], ["page", "Page"]];
// each interface as a row: an authored mark (one 1.5 stroke, lit with the row) and one line on what it is
const SKINS: [Skin, string, string, string][] = [
  ["org", "Kari", "Kari beside the controls", `<path d="M10 3.5c3.6 0 6 2.9 6 6.6S13.6 16.5 10 16.5 4 13.8 4 10.1 6.4 3.5 10 3.5z"/><path d="M8 9.5v1M12 9.5v1"/>`],
  ["void", "Void Signal", "A black panel that glows once you change the sound", `<rect x="3" y="4.5" width="14" height="11" rx="2.5"/><circle cx="14" cy="13" r="1.2"/>`],
  ["weather", "Alien Weather", "A frosted pod under a small sun and a cloud", `<path d="M6.5 15.5h7.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8 1.2 2.4 2.4 0 0 0 .5 4.8z"/><path d="M4.5 4.5l1.2 1.2M8.5 2.5v1.6"/>`],
  ["cons", "Constellation", "Drag the moon around its orbit to change key", `<ellipse cx="10" cy="11" rx="7" ry="3.6"/><circle cx="10" cy="11" r="1"/><circle cx="15.6" cy="8.8" r="1.6"/>`],
];
const SETTINGS_TPL = `
  <aside class="settings" data-el="settings" hidden aria-label="Kari settings">
    <div class="snav">
      <div class="tabs" role="tablist" aria-label="Kari settings">${TABS.map(([id, label], i) =>
        `<button class="tab" role="tab" id="kari-tab-${id}" aria-controls="kari-pane-${id}" data-tab="${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"${id === "midi" ? ' data-el="miditab"' : ""}>${label}</button>`).join("")}</div>
      <button class="x" data-s="close" aria-label="Close settings">${X_ICON}</button>
    </div>
    <div class="panes" data-el="panes">
      <section class="pane" role="tabpanel" id="kari-pane-kari" aria-labelledby="kari-tab-kari" data-pane="kari">
        <div class="forms" role="group" aria-label="Form">${FORMS.map(f =>
          `<button class="form" data-form="${f.id}" aria-pressed="false" aria-label="${f.label}"><span class="fthumb">${formSvg(f.id, false)}</span><span class="fname" aria-hidden="true">${f.name}</span></button>`).join("")}</div>
        <div class="opt"><span class="ol" id="kari-l-color">Color</span><div class="row" role="group" aria-labelledby="kari-l-color">
          <button class="swatch" data-kari="blue" style="--c:#5cf2ff">Blue</button><button class="swatch" data-kari="pink" style="--c:#ff7ad9">Pink</button><button class="swatch" data-kari="black" style="--c:#2a2a33">Black</button></div></div>
        <div class="opt"><span class="ol" id="kari-l-wear">Wear</span><div class="row" role="group" aria-labelledby="kari-l-wear">
          <button class="chip" data-wear="cap" aria-pressed="false">YGG cap</button><button class="chip" data-wear="shades" aria-pressed="false" aria-label="Thin black sunglasses">Shades</button><button class="chip" data-wear="shoes" aria-pressed="false" aria-label="Chunky sneakers">Sneakers</button></div></div>
        <p class="note" data-el="formnote" aria-live="polite"></p>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-look" aria-labelledby="kari-tab-look" data-pane="look" hidden>
        <div class="skins" role="group" aria-label="Interface">${SKINS.map(([id, name, line, mark]) =>
          `<button class="skinrow" data-skin="${id}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true">${mark}</svg><b>${name}</b><span>${line}</span></button>`).join("")}</div>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-midi" aria-labelledby="kari-tab-midi" data-pane="midi" hidden>
        <div class="sg" data-el="midisg">
          <div class="row"><button class="chip" data-m="connect">Connect</button><button class="chip" data-m="learn" aria-pressed="false">Learn</button><span class="mst data" data-el="midist">not connected</span></div>
          <span class="mst">Learn: switch it on, click a loop length or Tap, then hit the pad. A pad on the lit length releases it.</span>
        </div>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-page" aria-labelledby="kari-tab-page" data-pane="page" hidden>
        <div class="row hiderow"><button class="big" data-a="hide">Hide dock · absorb into Kari</button></div>
        <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
        <div class="sg"><button class="big" data-a="hide-site" data-el="hidesite">Hide Kari on YouTube</button><span class="mst">Back from Kari's toolbar icon or More settings.</span></div>
        <div class="sfoot"><a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a><span class="ver" data-el="ver"></span></div>
      </section>
    </div>
  </aside>`;

const TEMPLATE = `
<div class="root" data-collapsed="0" data-small="0">${FORM_DEFS}
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${CTL}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls"></div>
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
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${GEAR}</button>
  ${SETTINGS_TPL}
</div>`;

const CX = 330, CY = 200, RX = 120, RY = 52, BASE_KEY = 8; // A♭m shown as the reference key until detection exists
/** How long the panel stays after the last real interaction once YouTube's controls have gone (YouTube's own idle figure). */
export const HOLD_MS = 3000;

export class Dock {
  private root: HTMLElement; private shadow: ShadowRoot; private wrap: HTMLElement;
  get hostEl() { return this.wrap; }
  private el = (name: string) => this.shadow.querySelector(`[data-el="${name}"]`) as HTMLElement;
  private $$ = (sel: string) => Array.from(this.shadow.querySelectorAll(sel)) as HTMLElement[];
  private status: AudioStatus | null = null;
  private midiState: MidiState | null = null; private learnOn = false;
  private raf = 0; private visible = true; private consDrag = false;
  // YouTube fades its controls after ~3 s without a pointer move, and a pointer parked on the dock is "idle" to it (the
  // dock stops clicks at its host, never mousemove). Until 2026-10-15 the panel went with them even while in use: a tap
  // burst's next click landed on the player and paused the video, and every tap after that was a bounce (probe
  // tools/probe/tapfade.mjs, Jesse's ear test the same day). The autohide is now held off while the pointer is inside
  // the panel, the gear or the settings, while anything in the dock has focus, and for HOLD_MS after the last real
  // interaction. Kari's anchor never faded (his earlier ruling); this keeps the panel beside her while he uses it.
  private ytHidden = false; private over = new Set<Element>(); private keptUntil = 0; private keptTimer = 0;
  // Kari's form (forms.ts): drawn into the body on the first applySettings, redrawn when it changes. Nebula's moon orbits
  // in the pulse loop; Medusa's SMIL tentacles are paused under reduced motion (CSS media queries cannot reach SMIL).
  private form: KariForm | null = null; private moons: SVGCircleElement[] = []; private theta = 0.9; private boostUntil = 0;
  private reactTimer = 0; private tab = "kari";
  private rm: MediaQueryList | null = null;

  constructor(private host: HTMLElement, private deps: DockDeps) {
    const wrap = document.createElement("div");
    this.wrap = wrap;
    wrap.id = "kari-dock";
    wrap.dataset.build = __KARI_BUILD__;
    wrap.style.cssText = deps.mountStyle || "position:absolute;inset:0;pointer-events:none;z-index:60";
    this.shadow = wrap.attachShadow({ mode: "open" });
    const style = document.createElement("style"); style.textContent = DOCK_CSS;
    this.shadow.appendChild(style);
    const tpl = document.createElement("template"); tpl.innerHTML = TEMPLATE;
    this.shadow.appendChild(tpl.content.cloneNode(true));
    host.appendChild(wrap);
    this.root = this.shadow.querySelector(".root") as HTMLElement;
    this.root.dataset.site = deps.site || "yt";
    // The panel stays inside the player box. A 1366×768 laptop at Windows' default 125% scale gives YouTube a player
    // about 348 px tall, and the Full-control panel (370 to 400 px) ran past its bottom with Hide and the toggle cut
    // off (platform audit, 2026-11-09). The wrapper fills the host, so its height goes to the root as --host-h and
    // .org .ctl caps itself at 90 % of it and scrolls (dock.css.ts). SoundCloud mounts on the page, not a box: exempt.
    try { new ResizeObserver((es) => { const h = es[0]?.contentRect.height || 0; if (h) this.root.style.setProperty("--host-h", `${Math.round(h)}px`); }).observe(wrap); } catch (_) { /* no ResizeObserver */ }
    this.el("hidesite").textContent = `Hide Kari on ${SITE_NAME[deps.site || "yt"]}`;
    this.el("ver").textContent = __KARI_BUILD__.split("+")[0];
    try { this.rm = matchMedia("(prefers-reduced-motion: reduce)"); this.rm.addEventListener?.("change", () => this.syncSmil()); } catch (_) { /* no matchMedia */ }
    this.seedStars();
    this.wire();
    this.applySettings(deps.settings);
    this.render();
    this.startPulse();
  }

  destroy() { cancelAnimationFrame(this.raf); clearTimeout(this.keptTimer); clearTimeout(this.noteTimer); clearTimeout(this.reactTimer); this.host.querySelector("#kari-dock")?.remove(); }

  /* ---------- the take ---------- */
  private takeNote: TakeNote | null = null;
  private noteTimer = 0;
  /** A short line on the take readout ("saved 0:12", "nothing to record"), gone after NOTE_MS; empty clears it. */
  private note(text: string) {
    clearTimeout(this.noteTimer);
    this.takeNote = text ? { text, until: performance.now() + NOTE_MS } : null;
    this.render();
    if (text) this.noteTimer = window.setTimeout(() => { this.takeNote = null; this.render(); }, NOTE_MS);
  }

  /* ---------- public updates ---------- */
  setStatus(s: AudioStatus) {
    this.status = s;
    const f = this.el("fault");
    const msg = s.fault ? (FAULT_COPY[this.deps.site || "yt"][s.fault] || "") : "";
    f.hidden = !msg; f.textContent = msg;
    this.shadow.querySelector(".org")?.setAttribute("data-fault", s.fault ? "1" : "0");
    this.render();
  }
  /** YouTube's controls are hidden (ytp-autohide): the panel follows unless it is in use (see `kept`). */
  setControlsHidden(hidden: boolean) { this.ytHidden = hidden; this.syncHidden(); }
  /** The panel is kept through the autohide: pointer inside it, focus inside the dock, or a real interaction within HOLD_MS. */
  get kept() { return this.over.size > 0 || this.focusInside() || performance.now() < this.keptUntil; }
  private focusInside() { const a = this.shadow.activeElement; return !!a && !a.matches(".anchor"); }
  private syncHidden() {
    const kept = this.kept, hidden = this.ytHidden && !kept ? "1" : "0", k = kept ? "1" : "0";
    if (this.root.dataset.hiddenWithControls !== hidden) this.root.dataset.hiddenWithControls = hidden;
    if (this.root.dataset.kept !== k) this.root.dataset.kept = k;
  }
  /** A real interaction: keep the panel for HOLD_MS, then re-read the state. */
  private used() { this.keptUntil = performance.now() + HOLD_MS; clearTimeout(this.keptTimer); this.keptTimer = window.setTimeout(() => this.syncHidden(), HOLD_MS + 50); this.syncHidden(); }
  /** SoundCloud: the host bar itself is away (nothing queued) — everything hides, Kari too; distinct from YouTube's autohide, which keeps Kari. */
  setBarHidden(hidden: boolean) { this.root.dataset.barHidden = hidden ? "1" : "0"; }
  setMidiState(m: MidiState) {
    this.midiState = m;
    const armed = m.learning;
    this.$$("[data-arm]").forEach(b => { if (!armed) b.removeAttribute("data-arm"); });
    const txt = !m.supported ? "no Web MIDI here" : m.error ? m.error : m.connected ? `${m.inputs} input${m.inputs === 1 ? "" : "s"}${m.lastNote !== null ? ` · note ${m.lastNote}` : ""}${armed ? " · hit a pad" : ""}` : "not connected";
    const el = this.el("midist"); if (el && el.textContent !== txt) el.textContent = txt;
    this.render();
  }
  setSmall(small: boolean) { this.root.dataset.small = small ? "1" : "0"; }
  applySettings(s: Settings) {
    this.$$(".skin").forEach(sk => (sk as HTMLElement).hidden = sk.dataset.skin !== s.skin);
    this.$$(".skinrow[data-skin]").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.skin === s.skin)));
    const org = this.shadow.querySelector(".org") as HTMLElement;
    org.dataset.kari = s.kariColor; org.dataset.cap = s.cap ? "1" : "0"; org.dataset.shades = s.shades ? "1" : "0"; org.dataset.shoes = s.shoes ? "1" : "0";
    this.root.dataset.kari = s.kariColor;   // the colorway vars live on the root: the settings tiles wear it too
    this.$$("[data-kari]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kari === s.kariColor)));
    this.$$("[data-wear]").forEach(b => b.setAttribute("aria-pressed", String(!!(s as any)[b.dataset.wear!])));
    this.applyForm(FORM_IDS.includes(s.form) ? s.form : "kari");
    if (s.collapsed && this.root.dataset.collapsed !== "1") { this.over.clear(); this.syncHidden(); }   // absorbed under the pointer: no leave event comes
    this.root.dataset.collapsed = s.collapsed ? "1" : "0";
    this.$$(".ctl").forEach(c => c.dataset.full = s.fullControl ? "1" : "0");
    this.$$('[data-a="full"]').forEach(b => b.setAttribute("aria-pressed", String(s.fullControl)));
    this.el("intro").hidden = s.seenIntro;
    (this.el("more") as HTMLAnchorElement).href = this.deps.optionsUrl;
    this.deps.settings = s;
  }
  react() { // eyes light + the form's own moment (Kari's bubble, Nebula's ring, Hex's wink...); called on every parameter change
    const body = this.el("kari");
    body.classList.remove("react"); void body.offsetWidth; body.classList.add("react");
    clearTimeout(this.reactTimer); this.reactTimer = window.setTimeout(() => body.classList.remove("react"), 1700);
    const b = this.el("bubble"); if (b) { b.classList.remove("go"); void (b as any).getBBox?.(); b.classList.add("go"); }
    this.$$(".org .body .iris, .org .body .glow").forEach(e => { e.classList.add("lit"); setTimeout(() => e.classList.remove("lit"), 700); });
    if (this.form === "nebula") this.boostUntil = performance.now() + 1400;   // her moon speeds round once
  }

  /* ---------- Kari's form ---------- */
  private applyForm(form: KariForm) {
    const org = this.shadow.querySelector(".org") as HTMLElement, info = formInfo(form);
    if (form !== this.form) {
      const first = this.form === null; this.form = form;
      const body = this.el("kari"); body.innerHTML = formSvg(form, true);
      this.moons = Array.from(body.querySelectorAll("[data-moon]")) as SVGCircleElement[];
      this.placeMoons();
      this.syncSmil();
      if (!first) requestAnimationFrame(() => this.react());   // a new form says hello once; the first draw on load does not
    }
    org.dataset.form = form;
    this.$$(".form[data-form]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.form === form)));
    // color and wardrobe only where the form takes them; the note says why a row is off
    (this.$$(".swatch[data-kari]") as HTMLButtonElement[]).forEach(b => b.disabled = !info.colorway);
    (this.$$(".chip[data-wear]") as HTMLButtonElement[]).forEach(b => b.disabled = !info.wear);
    const note = !info.colorway ? "The sisters keep their own colors and clothes." : !info.wear ? "The wardrobe fits Kari and Nebula." : "";
    const n = this.el("formnote"); if (n.textContent !== note) n.textContent = note;
  }
  private motionOK() { return !this.rm?.matches; }
  /** Medusa's tentacles are SMIL: run them only where motion is welcome. */
  private syncSmil() {
    const svg = this.el("kari")?.querySelector("svg") as SVGSVGElement | null; if (!svg) return;
    try { this.motionOK() ? svg.unpauseAnimations() : svg.pauseAnimations(); } catch (_) { /* no SMIL */ }
  }
  /** Nebula's moon: behind her on the back half of the orbit, in front of her on the front half. */
  private placeMoons() {
    if (!this.moons.length) return;
    const o = orbitAt(this.theta);
    for (const m of this.moons) {
      m.setAttribute("cx", o.x.toFixed(1)); m.setAttribute("cy", o.y.toFixed(1));
      const show = (m.dataset.moon === "back") === o.back; m.style.opacity = show ? "1" : "0";
    }
  }

  /* ---------- settings tabs ---------- */
  private selectTab(id: string, focus = false) {
    const tabs = this.$$(".tab[data-tab]").filter(t => !t.hidden);
    if (!tabs.some(t => t.dataset.tab === id)) id = "kari";
    this.tab = id;
    for (const t of this.$$(".tab[data-tab]")) { const on = t.dataset.tab === id; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
    for (const p of this.$$(".pane[data-pane]")) p.hidden = p.dataset.pane !== id;
    this.el("panes").scrollTop = 0;
  }

  /* ---------- render ---------- */
  render() {
    const p = this.deps.getParams();
    const s = this.status;
    const bpm = s?.bpm ?? null, loop = s?.loop ?? 0;
    const yt = s?.baseRate && Math.abs(s.baseRate - 1) > 1e-3 ? ` · ${this.deps.site === "sc" ? "sc" : "yt"} ${s.baseRate.toFixed(2)}×` : "";
    // the tempo readout on the loop row (tempo-readout.ts): the bpm once there is one, "learning…" only while the detector
    // listens, "tap" only once it listened and found nothing, "play to learn" / "click to learn" before it runs
    const { state: tempoState, text: tempoText } = tempoReadout(s, !!this.deps.loop);
    const map: Record<string, string> = {
      speed: fmtSpeed(p.tempo), st: fmtSigned(p.st), yt, bpm: bpm ? `${fmtBpm(bpm)} bpm` : "",
      tempo: tempoText,
      keypair: `${keyName(BASE_KEY, 0)} → ${keyName(BASE_KEY, p.st)}`,
      engine: s ? (s.engine === "r3" ? "R3" : s.engine === "ss" ? "SS" : "wire") : "—",
      av: s ? (s.attached ? `${s.avOffsetMs} ms` : "0 ms") : "—",
      loopinfo: !this.deps.loop ? "—" : loop ? `${loopLabel(loop)} · ${s!.loopMs} ms${s!.loopClamped ? " · at the ring's ceiling" : ""}` : bpm ? "—" : "no tempo yet",
    };
    this.$$("[data-b]").forEach(el => { const v = map[el.dataset.b!]; if (v !== undefined && el.textContent !== v) el.textContent = v; });
    // loops: four length toggles and the tempo readout under the steppers (Full control on or off), the bpm field in the full panel (left alone while being typed in)
    const loopsRow = this.shadow.querySelector(".loops") as HTMLElement | null; if (loopsRow) loopsRow.hidden = !this.deps.loop;
    this.$$('[data-b="tempo"]').forEach(el => { if (el.dataset.state !== tempoState) el.dataset.state = tempoState; });
    // the take: one pill under the loop row where a record path exists; pressed (rose) while a take runs, its dot still while
    // held. Compiled out of a KARI_RECORD=0 build with the recorder (the block folds away under the define).
    if (__KARI_RECORD__) {
      const takeRow = this.shadow.querySelector(".take") as HTMLElement | null; if (takeRow) takeRow.hidden = !this.deps.record;
      const take = takeReadout(s, this.takeNote);
      this.$$('[data-b="take"]').forEach(el => { if (el.textContent !== take) el.textContent = take; });
      (this.$$('[data-a="rec"]') as HTMLButtonElement[]).forEach(b => {
        const on = !!s?.recording, held = on && !!s!.recHeld;
        b.setAttribute("aria-pressed", String(on)); if (b.dataset.held !== (held ? "1" : "0")) b.dataset.held = held ? "1" : "0";
        const label = on ? "Stop and save the take" : "Record a take"; if (b.getAttribute("aria-label") !== label) b.setAttribute("aria-label", label);
      });
    }
    const midiGroup = this.shadow.querySelector('[data-el="midisg"]') as HTMLElement | null; if (midiGroup) midiGroup.hidden = !this.deps.midi;
    const midiTab = this.el("miditab"); if (midiTab && midiTab.hidden !== !this.deps.midi) { midiTab.hidden = !this.deps.midi; if (midiTab.hidden && this.tab === "midi") this.selectTab("kari"); }
    (this.$$('[data-a="loop"]') as HTMLButtonElement[]).forEach(b => { const on = loop > 0 && +b.dataset.v! === loop; b.setAttribute("aria-pressed", String(on)); b.disabled = !bpm; if (on) b.style.setProperty("--loop-ms", `${s!.loopMs}ms`); });
    (this.$$('[data-a="bpm-"],[data-a="bpm+"]') as HTMLButtonElement[]).forEach(b => { b.disabled = !bpm; });
    (this.$$('input[data-a="bpm"]') as HTMLInputElement[]).forEach(i => { if (this.shadow.activeElement === i) return; const v = bpm ? fmtBpm(bpm) : ""; if (i.value !== v) i.value = v; });
    const m = this.midiState;
    this.$$('[data-a="midi"]').forEach(b => { b.setAttribute("aria-pressed", String(!!m?.connected)); });
    this.$$('[data-m="learn"]').forEach(b => b.setAttribute("aria-pressed", String(this.learnOn)));
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
        case "show": this.deps.saveSettings({ collapsed: !this.deps.settings.collapsed }); this.react(); break; // Kari is a toggle: click to fold, click to unfold (Jesse, 2026-09-26)
        case "intro-ok": this.deps.saveSettings({ seenIntro: true }); break;
        case "hide-site": this.deps.saveSettings({ [HIDE_KEY[this.deps.site || "yt"]]: true }); break; // the page script parks Kari (src/shared/sites.ts)
        // the take: one pill, click to start, click again to stop and save (Jesse, 2026-11-03). The state comes back through setStatus.
        case "rec": if (__KARI_RECORD__) {   // compiled out of a KARI_RECORD=0 build with the recorder
          const r = this.deps.record; if (!r) break;
          if (this.status?.recording) r.stop().then(sec => this.note(sec === null ? "nothing recorded" : `saved ${fmtTake(sec)}`));
          else r.start().then(ok => { if (!ok) this.note("nothing to record"); else this.render(); });
          this.react(); this.render();
        } break;
        // beat loops (click + MIDI only). A length toggles: lit releases, unlit latches, another length switches.
        // In learn mode a click arms the button for the next MIDI note instead.
        case "loop": case "tap": {
          const key = a === "loop" ? el.dataset.v! : "tap";
          if (this.learnOn && this.midiState?.connected) { this.$$("[data-arm]").forEach(b => b.removeAttribute("data-arm")); el.dataset.arm = "1"; this.deps.midi?.learn(LOOP_ACTION[key]); break; }
          if (a === "loop") {
            const beats = +el.dataset.v! as LoopBeats;
            if ((this.status?.loop ?? 0) === beats) this.deps.loop?.release();
            else this.deps.loop?.latch(beats)?.then(ok => { if (ok) this.react(); this.render(); });
          }
          else { this.deps.loop?.tap(); this.react(); }
          this.render(); break;
        }
        case "bpm-": this.deps.loop?.nudge(-1); this.render(); break;
        case "bpm+": this.deps.loop?.nudge(1); this.render(); break;
        case "midi": this.deps.midi?.connect()?.then(() => this.render()); break;
      }
    });
    // MIDI settings: connect and learn
    sh.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement).closest("[data-m]") as HTMLElement | null; if (!el) return;
      if (el.dataset.m === "connect") this.deps.midi?.connect()?.then(() => this.render());
      if (el.dataset.m === "learn") { this.learnOn = !this.learnOn; if (!this.learnOn) { this.deps.midi?.learn(null); this.$$("[data-arm]").forEach(b => b.removeAttribute("data-arm")); } this.render(); }
    });
    // Keys: only swallow what the focused control itself consumes (Enter/Space on buttons, arrows/Home/End on the
    // slider); everything else still reaches YouTube's shortcuts. A blanket stopPropagation killed k/j/l/f/space after
    // any click in the dock (review finding 2026-09-26).
    const consumes = (ke: KeyboardEvent) => {
      const t = ke.target as HTMLElement;
      if (t.matches('input[type="number"]')) return true;   // the bpm field owns every key while it has focus, nothing outside it
      if (t.matches('input[type="range"]')) return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(ke.key);
      if (t.matches('[role="tab"]')) return ["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(ke.key);
      if (ke.key === "Escape" && t.closest(".settings")) return true;
      if (t.matches('button, [role="button"], input[type="checkbox"], a')) return ke.key === "Enter" || ke.key === " ";
      return false;
    };
    sh.addEventListener("keydown", (e: Event) => {
      const ke = e as KeyboardEvent; const el = (ke.target as HTMLElement).closest('[role="button"][data-a]') as HTMLElement | null;
      if (el && (ke.key === "Enter" || ke.key === " ")) { ke.preventDefault(); el.click(); }
      if ((ke.target as HTMLElement).matches('input[data-a="bpm"]') && (ke.key === "Enter" || ke.key === "Escape")) { ke.preventDefault(); (ke.target as HTMLInputElement).blur(); }
      const tab = (ke.target as HTMLElement).closest('[role="tab"]') as HTMLElement | null;
      if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(ke.key)) {
        ke.preventDefault();
        const tabs = this.$$(".tab[data-tab]").filter(t => !t.hidden), i = tabs.indexOf(tab);
        const j = ke.key === "Home" ? 0 : ke.key === "End" ? tabs.length - 1 : (i + (ke.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        this.selectTab(tabs[j].dataset.tab!, true);
      }
      if (ke.key === "Escape" && (ke.target as HTMLElement).closest(".settings")) { ke.preventDefault(); this.closeSettings(true); }
      if (consumes(ke)) ke.stopPropagation();
    });
    sh.addEventListener("keyup", (e: Event) => { if (consumes(e as KeyboardEvent)) e.stopPropagation(); });
    // Mouse clicks must not leave a dock button focused (Space would re-fire it and YouTube would lose its keys).
    sh.addEventListener("mousedown", (e) => { const t = (e.target as HTMLElement).closest("button, [role=\"button\"]"); if (t) e.preventDefault(); });
    sh.addEventListener("input", (e) => { const t = e.target as HTMLInputElement; if (t.matches('input[data-a="tempo"]')) { const p = this.deps.getParams(); this.deps.apply({ ...p, tempo: +t.value }); this.render(); } });
    sh.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.matches('input[data-a="tempo"]')) this.react();
      if (t.matches('input[data-a="bpm"]')) { const v = parseFloat(t.value); if (Number.isFinite(v)) { this.deps.loop?.setBpm(v); this.react(); } this.render(); }
    });
    // hold-to-compare
    sh.addEventListener("pointerdown", (e) => { const b = (e.target as HTMLElement).closest('[data-a="compare"]') as HTMLElement | null; if (b) { this.hold(true); b.setPointerCapture?.((e as PointerEvent).pointerId); } });
    ["pointerup", "pointercancel"].forEach(t => sh.addEventListener(t, () => { if (this.holding) this.hold(false); }));
    sh.addEventListener("keydown", (e: Event) => { const ke = e as KeyboardEvent; if ((ke.target as HTMLElement).closest('[data-a="compare"]') && ke.key === " " && !ke.repeat) { ke.preventDefault(); this.hold(true); } });
    sh.addEventListener("keyup", (e: Event) => { const ke = e as KeyboardEvent; if ((ke.target as HTMLElement).closest('[data-a="compare"]') && ke.key === " ") { ke.preventDefault(); this.hold(false); } });
    // settings
    const gear = this.el("gear"), settings = this.el("settings");
    gear.addEventListener("click", () => { const open = settings.hidden; settings.hidden = !open; gear.setAttribute("aria-expanded", String(open)); });
    settings.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest('[data-s="close"]')) this.closeSettings(false); });
    this.$$(".tab[data-tab]").forEach(t => t.addEventListener("click", () => this.selectTab(t.dataset.tab!)));
    this.$$(".skinrow[data-skin]").forEach(c => c.addEventListener("click", () => this.deps.saveSettings({ skin: c.dataset.skin as Skin })));
    // Kari's look: a form, a color or a piece of her wardrobe brings her own interface back, so the change shows at once
    this.$$(".form[data-form]").forEach(b => b.addEventListener("click", () => this.deps.saveSettings({ form: b.dataset.form as KariForm, skin: "org" })));
    this.$$("[data-kari]").forEach(b => b.addEventListener("click", () => { this.deps.saveSettings({ kariColor: b.dataset.kari as KariColor, skin: "org" }); this.react(); }));
    this.$$("[data-wear]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.wear as "cap" | "shades" | "shoes"; this.deps.saveSettings({ [k]: !this.deps.settings[k], skin: "org" } as Partial<Settings>); }));
    // constellation drag
    const svg = this.el("consSvg") as unknown as SVGSVGElement;
    const toSt = (e: PointerEvent) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 640, y = (e.clientY - r.top) / r.height * 360; const ang = Math.atan2((x - CX) / RX, -(y - CY) / RY); return Math.max(-12, Math.min(12, Math.round(ang / Math.PI * 12))); };
    svg.addEventListener("pointerdown", (e) => { if (this.deps.settings.collapsed) return; if ((e.target as Element).closest(".hit,.moon")) { this.consDrag = true; svg.setPointerCapture(e.pointerId); const v = toSt(e); const p = this.deps.getParams(); if (v !== p.st) { this.deps.apply({ ...p, st: v }); this.render(); } } });
    svg.addEventListener("pointermove", (e) => { if (!this.consDrag) return; const v = toSt(e); const p = this.deps.getParams(); if (v !== p.st) { this.deps.apply({ ...p, st: v }); this.render(); } });
    ["pointerup", "pointercancel"].forEach(t => svg.addEventListener(t, () => { if (this.consDrag) { this.consDrag = false; this.react(); } }));
    // The panel is in use: keep it through YouTube's autohide (pointer inside, focus inside, or a real interaction just now;
    // synthetic clicks from a MIDI pad or a test do not count). pointerleave only re-reads the state: the move that leaves
    // the panel has already woken YouTube's own timer.
    for (const el of this.$$(".absorb, .gear, .settings, .intro, .fault")) {
      el.addEventListener("pointerenter", () => { this.over.add(el); this.syncHidden(); });
      el.addEventListener("pointerleave", () => { this.over.delete(el); this.syncHidden(); });
    }
    sh.addEventListener("focusin", () => this.syncHidden());
    sh.addEventListener("focusout", () => { setTimeout(() => this.syncHidden(), 0); });
    ["pointerdown", "click", "input", "keydown"].forEach(t => sh.addEventListener(t, (e) => { if (e.isTrusted) this.used(); }));
    // Stop clicks reaching YouTube's player (which toggles play/pause on click). Listen on the HOST, not inside the
    // shadow tree: events bubble through the dock's own handlers first, then retarget to the host, then we stop them.
    ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "wheel", "contextmenu"].forEach(t => this.wrap.addEventListener(t, (e) => e.stopPropagation()));
  }
  private closeSettings(focusGear: boolean) {
    const gear = this.el("gear"); this.el("settings").hidden = true; gear.setAttribute("aria-expanded", "false");
    if (focusGear) gear.focus();
  }
  private holding = false;
  private hold(on: boolean) { this.holding = on; this.deps.setCompare(on); this.$$('[data-a="compare"]').forEach(b => b.dataset.held = on ? "1" : "0"); }

  /* ---------- Kari pulse from the audio level ---------- */
  private startPulse() {
    let last = 0; let peak = 0; let prev = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(100, t - prev); prev = t;
      if (document.hidden) return;
      const orgVisible = !(this.shadow.querySelector('.skin[data-skin="org"]') as HTMLElement).hidden;
      if (!orgVisible) return;
      if (this.moons.length && this.motionOK()) { this.theta += dt / 1000 * (t < this.boostUntil ? 3.2 : 0.9); this.placeMoons(); }
      if (t - last < 33) return; last = t; // ~30 fps
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
