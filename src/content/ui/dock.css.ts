// Kari — dock styles (injected into the Shadow DOM). Ported from docs/playground.html.
export const DOCK_CSS = `
:host{display:block;position:absolute;inset:0;pointer-events:none;z-index:60;font-size:14px;line-height:1.3;text-align:left;letter-spacing:normal;text-transform:none}
*,*::before,*::after{box-sizing:border-box}
.root{position:absolute;inset:0;z-index:60;pointer-events:none;font-family:"Instrument Sans",system-ui,-apple-system,"Helvetica Neue",sans-serif;color:#efece4;
  --ink:#07070b;--bone:#efece4;--bone-2:#b9b6ad;--mute:#6d6c76;--cyan:#5cf2ff;--amber:#ffb454;--rose:#ff7ad9;--line:rgba(239,236,228,.14);
  --ease-out:cubic-bezier(.23,1,.32,1);--ease-in-out:cubic-bezier(.77,0,.175,1);--mono:"Space Mono",ui-monospace,Menlo,monospace}
/* Fade with YouTube's controls: the panel, the gear, the settings and the constellation's figures go (visibility, not
   just opacity, so faded controls cannot take clicks meant for the player); Kari's anchor (the blob, the orb, the
   cloudlet, the moon) never does. v1 faded the whole root, and opacity on a parent cannot be undone by a child, so the
   blob vanished a few seconds into playback (Jesse, 2026-10-15). The dock sets data-hidden-with-controls only when the
   panel is not in use (dock.ts kept): a pointer parked on a pill is idle to YouTube but not to Kari. While kept under
   the autohide, YouTube's cursor:none on the player must not reach the panel. */
.root[data-kept="1"]{cursor:default}
.absorb,.gear,.settings,.intro,.fault,.suncap{transition:opacity 200ms ease,visibility 0s linear 0s}
.root[data-hidden-with-controls="1"]:not([data-collapsed="1"]) :is(.absorb,.gear,.settings,.intro,.fault,.suncap,.cons .lab,.cons .lab2,.cons .orbit,.cons .tick,.cons .arc,.cons .sun,.cons .ray,.cons .star){opacity:0;visibility:hidden;pointer-events:none;transition:opacity 200ms ease,visibility 0s linear 200ms}
.root[data-hidden-with-controls="1"] .anchor{opacity:1;visibility:visible;pointer-events:auto}
.root[data-hidden-with-controls="1"] .void-orb{opacity:1;pointer-events:auto}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0;touch-action:manipulation;pointer-events:auto}
button:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
button:active{transform:scale(.97)}
.skin{position:absolute;inset:0;pointer-events:none}
.skin[hidden]{display:none!important}
.skin > *{pointer-events:auto}
.ro{font-variant-numeric:tabular-nums}
.ctl{display:grid;gap:8px;font-family:var(--mono)}
.ctl .read{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;color:var(--bone-2)}
.ctl .read b{font-size:16px;font-weight:700;color:var(--bone);font-family:"Instrument Sans",system-ui,sans-serif}
.slider{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.range{-webkit-appearance:none;appearance:none;width:100%;height:3px;background:linear-gradient(90deg,var(--rose),var(--line) 50%,var(--cyan));border-radius:2px;outline:0;cursor:pointer;pointer-events:auto;margin:0}
.range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--bone);border:3px solid var(--ink);box-shadow:0 0 0 1px var(--line),0 2px 8px rgba(0,0,0,.6)}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.step{display:grid;grid-template-columns:28px 1fr 28px;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:rgba(0,0,0,.35)}
.step button{height:32px;font-size:15px;font-family:var(--mono);transition:background 150ms ease}
.step button:active{transform:none;background:rgba(255,255,255,.14)}
@media (hover:hover) and (pointer:fine){.step button:hover{background:rgba(255,255,255,.08)}}
.step span{text-align:center;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--bone-2)}
.full{display:none;gap:8px}
.ctl[data-full="1"] .full{display:grid}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pill{border:1px solid var(--line);border-radius:6px;padding:5px 8px;font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;transition:background 150ms ease,color 150ms ease,border-color 150ms ease;background:rgba(0,0,0,.3)}
.pill[aria-pressed="true"]{background:var(--bone);color:var(--ink);border-color:var(--bone)}
.pill.hold[data-held="1"]{background:var(--amber);color:var(--ink);border-color:var(--amber)}
.rng{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.rng button{padding:4px 7px;font-family:var(--mono);font-size:9px;color:var(--bone-2)}
.rng button[aria-pressed="true"]{background:var(--bone);color:var(--ink)}
.meta{font-size:9px;color:var(--mute);display:flex;justify-content:space-between;gap:8px;letter-spacing:.06em;flex-wrap:wrap;gap:2px 12px}
.meta em{font-style:normal;color:var(--bone-2)}
.meta em.warn{color:var(--amber)}
/* beat loops: four length toggles (½ · 1 · 1 bar · 2 bars) and the tempo readout, directly under the steppers with Full
   control on or off; tap tempo, the bpm field and MIDI stay in the full panel. Lengths are disabled until a tempo exists. */
.loops,.tempo{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tempo .lab{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.pill.loop{min-width:30px;text-align:center;font-size:11px;letter-spacing:0;padding:4px 7px;white-space:nowrap;position:relative;overflow:hidden}
.pill.loop[aria-pressed="true"]{background:var(--cyan);color:var(--ink);border-color:var(--cyan)}
.tro{margin-left:auto;font-family:var(--mono);font-size:9px;letter-spacing:.06em;color:var(--mute);white-space:nowrap}
.tro[data-state="found"]{color:var(--bone-2)}
.tro:empty{display:none}
/* the take: one pill under the loop row (KARI_RECORD=1 builds; hidden where there is no record path). Rose is the take's
   color as cyan is the loop's and amber the compare hold's; the dot breathes while frames are kept, holds still while held. */
.take{display:flex;align-items:center;gap:6px}
.loops[hidden],.take[hidden]{display:none}   /* an author display beats the UA's [hidden]; say it here (the dock probe caught the take row showing with no record path) */
.pill.rec{display:inline-flex;align-items:center;gap:5px}
.pill.rec .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.pill.rec[aria-pressed="true"]{background:var(--rose);color:var(--ink);border-color:var(--rose)}
.pill.rec[data-held="1"] .dot{opacity:.35}
.pill[data-arm="1"]{border-color:var(--amber);color:var(--amber)}
button:disabled{opacity:.35;cursor:default}
button:disabled:active{transform:none}
.bpmbox{display:inline-grid;grid-template-columns:24px 54px 24px;align-items:center;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:rgba(0,0,0,.35)}
.bpmbox button{height:26px;font-size:13px;font-family:var(--mono)}
.bpm{-webkit-appearance:textfield;appearance:textfield;width:100%;height:26px;background:transparent;border:0;border-left:1px solid var(--line);border-right:1px solid var(--line);color:var(--bone);font:inherit;font-family:var(--mono);font-size:11px;text-align:center;padding:0;pointer-events:auto}
.bpm::-webkit-inner-spin-button,.bpm::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.bpm::placeholder{color:var(--mute)}
.mst{font-family:var(--mono);font-size:9px;color:var(--mute);letter-spacing:.06em;align-self:center}
@media (prefers-reduced-motion:no-preference){
  /* the latched pill sweeps once per pass: the one motion token here is the loop length itself */
  .pill.loop[aria-pressed="true"]::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.45),transparent 40%);transform:translateX(-100%);animation:kari-loopsweep var(--loop-ms,500ms) linear infinite}
  @keyframes kari-loopsweep{to{transform:translateX(100%)}}
  /* the readout breathes while the detector listens (the six seconds after play), then holds still */
  .tro[data-state="learning"]{animation:kari-learn 1.6s ease-in-out infinite}
  @keyframes kari-learn{50%{opacity:.45}}
  /* the record dot breathes while frames are kept (not while held, not under reduced motion) */
  .pill.rec[aria-pressed="true"]:not([data-held="1"]) .dot{animation:kari-rec 1.2s ease-in-out infinite}
  @keyframes kari-rec{50%{opacity:.2}}
}
.rowend{display:flex;justify-content:space-between;align-items:center;gap:8px}
.hidebtn{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);padding:2px 0;text-decoration:underline dotted}
.fulltog{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--bone-2);display:inline-flex;align-items:center;gap:6px}
.fulltog .sw{width:26px;height:14px;border-radius:999px;background:#2a2b36;position:relative;transition:background 150ms ease}
.fulltog .sw::after{content:"";position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:var(--bone);transition:transform 160ms var(--ease-out)}
.fulltog[aria-pressed="true"] .sw{background:var(--cyan)}
.fulltog[aria-pressed="true"] .sw::after{transform:translateX(12px)}
.intro{position:absolute;right:3%;top:calc(5% + 190px);max-width:240px;font-family:var(--mono);font-size:10px;color:var(--bone);background:rgba(3,3,8,.85);border:1px solid var(--line);border-radius:8px;padding:8px 10px;pointer-events:auto}
.intro[hidden]{display:none!important}
.root:not([data-site="sc"]):has(.take:not([hidden])) .intro{top:calc(5% + 222px)}   /* the take row adds 24px + one 8px gap: the hint stays under the panel, off Hide and Full control */
.root:has(.ctl[data-full="1"]) .intro{display:none}   /* Full control grows the panel down over the hint's spot; the hint is for the first, short panel */
.fault{position:absolute;left:50%;top:8%;transform:translateX(-50%);font-family:var(--mono);font-size:10px;color:var(--amber);background:rgba(3,3,8,.85);border:1px solid rgba(255,180,84,.4);border-radius:8px;padding:6px 10px;pointer-events:auto}
.fault[hidden]{display:none!important}

/* absorb / anchors */
.absorb{transition:transform 260ms var(--ease-in-out),opacity 200ms ease;transform-origin:var(--ax,100%) var(--ay,0%)}
.root[data-collapsed="1"] .absorb{transform:scale(.6) translate(var(--tx,0),var(--ty,0));opacity:0;pointer-events:none}
.anchor{cursor:pointer;pointer-events:auto}

/* ORGANISM */
/* 250px left the controls column at 146px: the two step blocks (28+label+28 each) overlapped and the + buttons sat under the − of the next block (live probe 2026-09-26). 330px gives the column 234px. */
.org{position:absolute;right:3%;top:5%;width:min(330px,52%);display:grid;grid-template-columns:1fr 96px;gap:4px 8px;align-items:start}
/* the grid container itself must not swallow clicks meant for the video: only the control box and Kari are targets */
.skin > .org,.skin > .cons{pointer-events:none}
.org > .ctl,.org > .body,.cons-ctl{pointer-events:auto}
.org .ctl{grid-column:1;padding:10px 12px;background:rgba(3,3,8,.72);border-radius:12px;border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(6px);--ax:100%;--ay:60%;--tx:30px;--ty:20px}
/* inside the player box on a small or scaled screen (1366×768 at 125 %: a 348 px player): capped at 90 % of the host height from dock.ts, scrolling. SoundCloud mounts on the page, not a box. */
.root:not([data-site="sc"]) .org .ctl{max-height:calc(var(--host-h,100000px) * .9);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.org .body{grid-column:2;width:96px;height:110px;position:relative;align-self:end}
.org .body svg{width:100%;height:100%;overflow:visible}
/* the colorway lives on the root (dock.ts sets data-kari there): the player character, her settings tiles and the shared
   defs (forms.ts FORM_DEFS) all read it */
.root{--m1:#bff9ff;--m2:#3ed8ea;--m3:#0a5b6e;--mg:rgba(92,242,255,.6);--iris:#5cf2ff;--rim:rgba(255,255,255,.75);--eye:#03141a}
.root[data-kari="pink"]{--m1:#ffd6f3;--m2:#ff7ad9;--m3:#7a1f5c;--mg:rgba(255,122,217,.6);--iris:#ffa6e8}
.root[data-kari="black"]{--m1:#4b4b57;--m2:#1a1a22;--m3:#050507;--mg:rgba(210,210,235,.4);--iris:#f4f4ff;--rim:rgba(255,255,255,.9);--eye:#0b0b10}
.org .bubble{fill:rgba(160,255,255,.18);stroke:rgba(200,255,255,.7);stroke-width:1;opacity:0;transform-origin:118px 76px}
.org .bubble.go{animation:kari-bub 1600ms var(--ease-out) forwards}
@keyframes kari-bub{0%{opacity:0;transform:scale(.2)}15%{opacity:1}100%{opacity:0;transform:translate(26px,-70px) scale(1.4)}}
.org[data-cap="1"] .acc.cap,.org[data-shades="1"] .acc.shades,.org[data-shoes="1"] .acc.shoes{display:block}
.org .beat{transform-origin:80px 100px;transition:transform 90ms ease-out}
.org[data-fault="1"] .f-kari .blob{filter:url(#kari-goo) grayscale(.6) brightness(.7)}
.org[data-fault="1"] .kf:not(.f-kari){filter:grayscale(.6) brightness(.7)}
.org[data-fault="1"] .lid.r{transform:scaleY(.15);transform-origin:98px 86px}
.org[data-fault="1"] :is(.f-kari,.f-nebula) .mouth{d:path("M70 116 q10 -6 20 0")}
.org[data-fault="1"] .zz{opacity:1}
@media (prefers-reduced-motion:no-preference){
  .org .body{animation:kari-bob 6s ease-in-out infinite}
  @keyframes kari-bob{50%{transform:translateY(-5px) rotate(-2deg)}}
  .org .lid{animation:kari-blink 5s ease-in-out infinite;transform-origin:center}
  @keyframes kari-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
}
.org[data-fault="1"] :is(.lid,.lidf){animation:none}

/* KARI'S FORMS (forms.ts): one 160×180 body, six looks. The base styles paint the character on the player and the
   portraits on her settings tiles alike; every loop and reaction is scoped to the player (.org .body), so the tiles
   stand still. The shared defs svg is 0×0, never display:none (gradients inside a display:none subtree stop painting). */
.kdefs{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
.kf .blob{fill:url(#kari-blobfill);stroke:var(--rim);stroke-width:1.6;paint-order:stroke;filter:url(#kari-goo) drop-shadow(0 0 12px var(--mg))}
.kf .shine{fill:rgba(255,255,255,.55)}
.kf .eye{fill:var(--eye)}
.kf .iris{fill:var(--iris);filter:drop-shadow(0 0 4px var(--iris))}
.kf .iris.lit{fill:#fff!important;filter:drop-shadow(0 0 8px #fff)!important}
.kf:not(.f-kari) .mouth{fill:none;stroke:var(--eye);stroke-width:2;stroke-linecap:round}
.kf .lidf{transform-box:fill-box;transform-origin:center}
.kf .zz{font-family:var(--mono);font-size:10px;fill:var(--bone-2);opacity:0}
.kf .acc{display:none}
/* Nebula: glass Kari, a galaxy turning inside, crescent-moon buns, a moon on an orbit (dock.ts moves it) */
.f-nebula .neb{fill:url(#kari-nebula);stroke:rgba(255,255,255,.8);stroke-width:1.4;paint-order:stroke;filter:url(#kari-glass) drop-shadow(0 0 14px var(--mg))}
.f-nebula .eye{fill:url(#kari-space)}
.f-nebula .speck{fill:#fff}
.f-nebula .swirl{transform-origin:80px 95px}
.f-nebula .cres{fill:#eef4ff;filter:drop-shadow(0 0 6px rgba(255,255,255,.8))}
.f-nebula .ring{fill:none;stroke:rgba(255,255,255,.55);stroke-width:1}
.f-nebula .ring2{fill:none;stroke:var(--m1);stroke-opacity:.25;stroke-width:4}
.f-nebula .moon{fill:#fff;filter:drop-shadow(0 0 5px #fff)}
.org[data-cap="1"] .f-nebula .cres{display:none}   /* the cap sits where her crescent buns float, as it covers Kari's buns */
/* Medusa: a jellyfish bell, tentacles (SMIL, paused under reduced motion by dock.ts), a ring of rim lights */
.f-medusa .tent{fill:none;stroke:var(--m1);stroke-opacity:.75;stroke-width:3;stroke-linecap:round}
.f-medusa .oral{fill:none;stroke:var(--m2);stroke-opacity:.55;stroke-width:6;stroke-linecap:round}
.f-medusa .bio{fill:var(--iris);filter:drop-shadow(0 0 3px var(--iris))}
.f-medusa .ripple{fill:none;stroke:var(--iris);stroke-width:1.2;opacity:0;transform-box:fill-box;transform-origin:center}
.f-medusa .bell{transform-origin:80px 104px}
/* the sisters keep their own colors: black goo with a pink rim (Hex, Hood) and holographic chrome (Chrome) */
.kf.sis .blob{fill:url(#kari-hex);stroke:rgba(255,154,213,.6);filter:url(#kari-goo) drop-shadow(0 0 10px rgba(255,79,184,.38))}
.sis .eye{fill:#050307}
.sis .lash{fill:none;stroke:#000;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.sis .pink{fill:#ff4fb8}
.sis .slit{fill:#050307}
.sis .smirk{fill:none;stroke:#ff9ad5;stroke-width:2;stroke-linecap:round}
.sis .fang{fill:#f4f2ed}
.sis .stud{fill:#e8e8f0}
.f-hex .shine{fill:rgba(255,255,255,.28)}
.f-hex .tail path{fill:#1a1220;stroke:rgba(255,154,213,.6);stroke-width:1}
.f-hex .tail .rope{fill:none;stroke:#1a1220;stroke-width:5;stroke-linecap:round}
.f-hex .tail .rope-rim{fill:none;stroke:rgba(255,154,213,.45);stroke-width:7;stroke-linecap:round}
.f-hex .wink{fill:none;stroke:#ff4fb8;stroke-width:2.4;stroke-linecap:round;opacity:0}
.f-hex .pop{fill:#ff4fb8;opacity:0;transform-box:fill-box;transform-origin:center}
.kf.f-chrome .blob{fill:url(#kari-chrome);stroke:rgba(255,255,255,.9);filter:url(#kari-goo) drop-shadow(0 0 10px rgba(255,160,230,.45))}
.f-chrome .sheen{fill:#fff;opacity:.5}
.f-chrome .eye{fill:#1e0a24}
.f-chrome .iris{fill:#ff6fcf;filter:drop-shadow(0 0 4px #ff6fcf)}
.f-chrome .mouth{stroke:#3a1240;stroke-width:1.8;stroke-linejoin:round}
.f-chrome .blush{fill:#ff8fd0;opacity:.45}
.f-chrome .gem{fill:#fff}
.f-chrome .wing-a{fill:#ff4fb8;stroke:#2a0f2e;stroke-width:.8}
.f-chrome .wing-b{fill:#8f7bff;stroke:#2a0f2e;stroke-width:.8}
.f-chrome .wing-body{stroke:#2a0f2e;stroke-width:1.6;stroke-linecap:round}
.f-chrome .clip{fill:#ff9ad5;stroke:#fff;stroke-width:.6}
.f-chrome .boot{fill:#0c0a10;stroke:#c9c2ff;stroke-width:.8}
.f-chrome .boot-line{stroke:#ffb3e1;stroke-width:1.4}
.f-chrome .ystar{fill:#ffb3e1;transform-box:fill-box;transform-origin:center}
.f-chrome .ystar.b{fill:#c9c2ff}
.f-chrome .gum{fill:#ff8fd0;stroke:#fff;stroke-width:.4;opacity:0;transform-box:fill-box;transform-origin:center}
.f-chrome .bit{fill:#ff8fd0;opacity:0;transform-box:fill-box;transform-origin:center}
.f-hood .hood{fill:url(#kari-hood);stroke:rgba(255,154,213,.6);stroke-width:1.2}
.f-hood .hole{fill:#050307}
.f-hood .stitch{fill:none;stroke:#ff9ad5;stroke-width:1.2;stroke-dasharray:3 3;stroke-linecap:round}
.f-hood .glow{fill:#ff4fb8;filter:drop-shadow(0 0 5px #ff4fb8);transition:fill 150ms ease}
.f-hood .glow.lit{fill:#fff}
.f-hood .dot{fill:#f4f2ed}
.f-hood .grin{fill:#000;stroke:#ff9ad5;stroke-width:1.2;stroke-linejoin:round;transform-box:fill-box;transform-origin:center}
.f-hood .gem{fill:#f4f2ed}
.f-hood .chain{stroke:#e8e8f0;stroke-width:.8}
.f-hood .boot{fill:#0c0a10;stroke:rgba(255,154,213,.6);stroke-width:.8}
.f-hood .boot-line{stroke:#ff4fb8;stroke-width:1.4}
.f-hood .charm{transform-origin:80px 124px}
/* the loops and the react moments: the player character only, never under reduced motion. Kari, Nebula and Medusa keep
   Kari's 6 s bob on the body; the sisters move their own way instead. dock.ts react() sets .react for 1.7 s. */
@media (prefers-reduced-motion:no-preference){
  .org:is([data-form="hex"],[data-form="chrome"],[data-form="hood"]) .body{animation:none}
  .org .body .f-nebula .swirl{animation:kari-spin 18s linear infinite}
  .org .body .f-nebula .cres{animation:kari-float 5s ease-in-out infinite}
  .org .body .f-nebula .cres.b{animation-delay:-2.5s}
  .org .body .f-nebula .lidf{animation:kari-blink 6s ease-in-out infinite}
  .org .body.react .f-nebula .ring{animation:kari-flare 1200ms var(--ease-out)}
  .org .body .f-medusa .bell{animation:kari-swim 2.6s ease-in-out infinite}
  .org .body .f-medusa .bio{animation:kari-glint 2.4s ease-in-out infinite}
  .org .body .f-medusa .bio:nth-child(2n){animation-delay:-.8s}
  .org .body .f-medusa .bio:nth-child(3n){animation-delay:-1.6s}
  .org .body .f-medusa .lidf{animation:kari-blink 5.8s ease-in-out infinite}
  .org .body.react .f-medusa .ripple{animation:kari-ripple 1200ms var(--ease-out)}
  .org .body .f-hex .idle{animation:kari-slink 4.4s ease-in-out infinite;transform-origin:80px 150px}
  .org .body .f-hex .tail{animation:kari-swish 2.4s ease-in-out infinite;transform-origin:118px 140px}
  .org .body .f-hex .pupils{animation:kari-dart 7s ease-in-out infinite}
  .org .body .f-hex .lidf{animation:kari-blink 6.2s ease-in-out -2s infinite}
  .org .body.react .f-hex .eyeL{animation:kari-off 900ms steps(1)}
  .org .body.react .f-hex .wink{animation:kari-on 900ms steps(1)}
  .org .body.react .f-hex .pop{animation:kari-heart 1200ms var(--ease-out)}
  .org .body .f-chrome .idle{animation:kari-hop 2.8s ease-in-out infinite;transform-origin:80px 170px}
  .org .body .f-chrome .sheen{animation:kari-sheen 5s var(--ease-in-out) infinite}
  .org .body .f-chrome .wings{animation:kari-flutter 1.1s ease-in-out infinite;transform-origin:40px 34px}
  .org .body .f-chrome .lidf{animation:kari-blink 4.8s ease-in-out infinite}
  .org .body .f-chrome .ystar{animation:kari-spin 6s linear infinite}
  .org .body .f-chrome .ystar.b{animation:kari-spin 9s linear infinite reverse}
  .org .body.react .f-chrome .gum{animation:kari-gum 1200ms var(--ease-out)}
  .org .body.react .f-chrome .bit{animation:kari-bit 1200ms var(--ease-out)}
  .org .body .f-hood .duck{animation:kari-duck 11s var(--ease-in-out) infinite}
  .org .body .f-hood .idle{animation:kari-sneak 4.8s ease-in-out infinite;transform-origin:80px 160px}
  .org .body .f-hood .charm{animation:kari-swing 2.2s ease-in-out infinite}
  .org .body .f-hood .lid-a{animation:kari-blink 4.4s ease-in-out infinite}
  .org .body .f-hood .lid-b{animation:kari-blink 4.4s ease-in-out -.25s infinite}
  .org .body.react .f-hood .grin{animation:kari-grin 900ms var(--ease-out)}
  .org[data-fault="1"] .body :is(.lid,.lidf){animation:none}
  @keyframes kari-spin{to{transform:rotate(360deg)}}
  @keyframes kari-float{50%{transform:translateY(-4px)}}
  @keyframes kari-flare{0%{stroke-width:1;stroke:rgba(255,255,255,.55)}25%{stroke-width:2.4;stroke:#fff}100%{stroke-width:1;stroke:rgba(255,255,255,.55)}}
  @keyframes kari-swim{0%,100%{transform:scale(1,1)}45%{transform:scale(1.06,.94)}}
  @keyframes kari-glint{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes kari-ripple{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}
  @keyframes kari-slink{0%,100%{transform:translateX(-2px) rotate(-2deg)}50%{transform:translateX(2px) rotate(2deg)}}
  @keyframes kari-swish{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}
  @keyframes kari-dart{0%,12%{transform:translateX(0)}18%,40%{transform:translateX(-3px)}46%,68%{transform:translateX(4px)}74%,100%{transform:translateX(0)}}
  @keyframes kari-off{0%,99%{opacity:0}100%{opacity:1}}
  @keyframes kari-on{0%,99%{opacity:1}100%{opacity:0}}
  @keyframes kari-heart{0%{opacity:0;transform:translateY(0) scale(.4)}20%{opacity:1;transform:translateY(-4px) scale(1.2)}100%{opacity:0;transform:translateY(-26px) scale(1)}}
  @keyframes kari-hop{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-6px) rotate(-2deg)}60%{transform:translateY(0) rotate(1deg)}}
  @keyframes kari-sheen{0%,40%{transform:translateX(-60px)}80%,100%{transform:translateX(200px)}}
  @keyframes kari-flutter{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.55)}}
  @keyframes kari-gum{0%{opacity:0;transform:scale(1)}10%{opacity:.95}70%{opacity:.95;transform:scale(7)}74%{opacity:0;transform:scale(8)}100%{opacity:0;transform:scale(1)}}
  @keyframes kari-bit{0%,70%{opacity:0;transform:translate(0,0)}74%{opacity:1}100%{opacity:0;transform:translate(var(--bx),var(--by))}}
  @keyframes kari-duck{0%,78%,100%{transform:translateY(0)}84%,92%{transform:translateY(22px)}}
  @keyframes kari-sneak{0%,100%{transform:translate(-5px,0) rotate(-3deg)}25%{transform:translate(-2px,-2px)}50%{transform:translate(5px,0) rotate(3deg)}75%{transform:translate(2px,-2px)}}
  @keyframes kari-swing{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
  @keyframes kari-grin{0%{transform:scale(1)}35%{transform:scale(1.2,1.3)}100%{transform:scale(1)}}
}

/* VOID SIGNAL */
.void{position:absolute;right:3%;top:8%;width:min(230px,42%);padding:12px 12px 10px;background:rgba(3,3,6,.92);border-radius:14px;border:1.5px solid var(--cyan);box-shadow:0 0 0 1px rgba(92,242,255,.25),0 0 24px rgba(92,242,255,.45),inset 0 0 40px rgba(92,242,255,.05);--ax:100%;--ay:0%}
.void[data-off="1"]{border-color:rgba(92,242,255,.35);box-shadow:none}
.void .glow{position:absolute;right:-20px;bottom:-20px;width:70px;height:70px;border-radius:50%;background:radial-gradient(var(--cyan),transparent 70%);filter:blur(14px);opacity:.55;pointer-events:none}
.void-orb{position:absolute;right:3%;top:8%;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--cyan) 45%,#0b3a44);box-shadow:0 0 18px var(--cyan),0 0 40px rgba(92,242,255,.5);opacity:0;pointer-events:none;transition:opacity 200ms ease 120ms}
.root[data-collapsed="1"] .void-orb{opacity:1;pointer-events:auto}
@media (prefers-reduced-motion:no-preference){
  .void:not([data-off="1"]){animation:kari-voidbreathe 4s ease-in-out infinite}
  @keyframes kari-voidbreathe{50%{box-shadow:0 0 0 1px rgba(92,242,255,.35),0 0 36px rgba(92,242,255,.6),inset 0 0 40px rgba(92,242,255,.08)}}
}

/* ALIEN WEATHER */
.pod{position:absolute;right:3%;top:7%;width:min(240px,44%);padding:14px 16px;border-radius:44px 44px 36px 60px;background:linear-gradient(160deg,rgba(210,225,255,.28),rgba(120,140,190,.14));backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 18px 40px rgba(0,0,0,.35);color:#fff;--ax:60%;--ay:120%;--tx:0;--ty:40px}
.pod .ctl .read b,.pod .ctl .read,.pod .step span,.pod .slider,.pod .meta{color:#fff}
.pod .pill{background:rgba(0,0,0,.25);border-color:rgba(255,255,255,.4)}
.pod .step{background:rgba(0,0,0,.2);border-color:rgba(255,255,255,.35)}
.suncap{position:absolute;right:calc(3% + 200px);top:5%;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid var(--amber);transform:rotate(-20deg);filter:drop-shadow(0 0 8px var(--amber))}
.cloudlet{position:absolute;right:calc(3% + 20px);top:calc(7% + 150px);width:54px;height:30px;border-radius:999px;background:rgba(210,225,255,.22);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);transition:transform 260ms var(--ease-in-out)}
.root[data-collapsed="1"] .cloudlet{transform:translate(0,-120px) scale(1.15)}
.root[data-collapsed="1"] .suncap{opacity:0}
@media (prefers-reduced-motion:no-preference){
  .pod{animation:kari-drift 7s ease-in-out infinite}
  .cloudlet{animation:kari-drift 9s ease-in-out -3s infinite}
  @keyframes kari-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-6px)}}
}

/* CONSTELLATION */
.cons{position:absolute;right:0;top:0;width:52%;height:64%}
.cons svg{width:100%;height:100%;display:block;pointer-events:none}
.cons .orbit{fill:none;stroke:rgba(255,255,255,.45);stroke-width:1}
.cons .tick{stroke:rgba(255,255,255,.35);stroke-width:1}
.cons .arc{fill:none;stroke:rgba(255,255,255,.6);stroke-width:1.2}
.cons .star{fill:none;stroke:rgba(255,255,255,.55);stroke-width:1}
.cons .star.lit{fill:#fff;stroke:#fff;filter:drop-shadow(0 0 6px #fff)}
.cons .ray{stroke:var(--cyan);stroke-width:1.2;filter:drop-shadow(0 0 4px var(--cyan))}
.cons .moon{fill:#e9e9f2;filter:drop-shadow(0 0 8px rgba(255,255,255,.7));pointer-events:auto;cursor:pointer}
.cons .sun{fill:#57585f}
.cons text{font-family:"Instrument Sans",system-ui,sans-serif;fill:#fff}
.cons .lab{font-size:24px;font-weight:600}
.cons .lab2{font-size:14px;fill:rgba(255,255,255,.8);font-family:var(--mono)}
.cons .hit{fill:transparent;cursor:pointer;pointer-events:auto}
.cons-ctl{position:absolute;right:3%;top:50%;width:min(240px,42%);padding:10px 12px;background:rgba(0,0,0,.45);border-radius:12px;border:1px solid rgba(255,255,255,.1);--ax:50%;--ay:0%;--ty:-40px}
.cons .lab,.cons .lab2,.cons .orbit,.cons .tick,.cons .arc,.cons .sun,.cons .ray{transition:opacity 220ms ease}
.root[data-collapsed="1"] .cons .lab,.root[data-collapsed="1"] .cons .lab2,.root[data-collapsed="1"] .cons .orbit,.root[data-collapsed="1"] .cons .tick,.root[data-collapsed="1"] .cons .arc,.root[data-collapsed="1"] .cons .sun,.root[data-collapsed="1"] .cons .ray{opacity:0}
.root[data-collapsed="1"] .cons .hit{pointer-events:none}
@media (prefers-reduced-motion:no-preference){
  .cons .star{animation:kari-twinkle 3s ease-in-out infinite}
  .cons .star:nth-child(odd){animation-delay:-1.4s}
  @keyframes kari-twinkle{50%{opacity:.35}}
  .cons .moon,.cons .ray{transition:all 400ms var(--ease-out)}
}


/* GEAR + SETTINGS */
.gear{position:absolute;right:12px;bottom:58px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid var(--line);display:grid;place-items:center;transition:background 150ms ease;pointer-events:auto}
.gear svg{width:16px;height:16px;fill:var(--bone-2)}
.gear[aria-expanded="true"]{background:var(--bone)} .gear[aria-expanded="true"] svg{fill:var(--ink)}
/* SETTINGS (0.11.0): a tab bar — Kari · Interface · MIDI · Page — over one pane at a time, in place of one long list
   that ran past the panel's bottom. The panes share one grid cell, so the panel holds the tallest pane's height and the
   tabs never move under the pointer when they switch; the bar stays put and only the panes scroll (a 348 px player).
   Sans for what you choose, mono only for data (the MIDI status, the build). Text on the panel is 4.5:1 or better. */
.settings{position:absolute;right:12px;bottom:96px;width:min(300px,80%);max-height:70%;display:flex;flex-direction:column;overflow:hidden;
  background:#09090d;border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.6);pointer-events:auto;
  font-family:"Instrument Sans",system-ui,-apple-system,"Helvetica Neue",sans-serif;font-size:12px;line-height:1.35;--mute-2:#9a98a2}
.settings[hidden]{display:none!important}
.settings ::selection{background:rgba(92,242,255,.32);color:var(--bone)}
.snav{flex:none;display:flex;align-items:center;gap:4px;padding:0 6px 0 4px;border-bottom:1px solid var(--line)}
.tabs{display:flex;min-width:0}
.tab{position:relative;padding:12px 9px 11px;font-size:12px;font-weight:500;color:var(--mute-2);white-space:nowrap;transition:color 150ms ease}
.tab::after{content:"";position:absolute;left:9px;right:9px;bottom:-1px;height:2px;border-radius:1px;background:var(--bone);transform:scaleX(0);transition:transform 200ms var(--ease-out)}
.tab[aria-selected="true"]{color:var(--bone)}
.tab[aria-selected="true"]::after{transform:scaleX(1)}
.tab[hidden]{display:none}
.tab:active{transform:none}
.tab:focus-visible{outline-offset:-5px;border-radius:8px}
.snav .x{margin-left:auto;flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:var(--bone-2);transition:background 150ms ease,color 150ms ease}
.snav .x svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round}
@media (hover:hover) and (pointer:fine){
  .tab:not([aria-selected="true"]):hover{color:var(--bone-2)}
  .snav .x:hover{background:rgba(239,236,228,.08);color:var(--bone)}
  .form:not([aria-pressed="true"]):not(:disabled):hover,.skinrow:not([aria-pressed="true"]):hover,.settings .chip:not([aria-pressed="true"]):not(:disabled):hover,
  .swatch:not([aria-pressed="true"]):not(:disabled):hover,.settings .big:not(.pri):hover{border-color:rgba(239,236,228,.34);background:rgba(239,236,228,.04)}
  .settings .more:hover{color:var(--bone)}
}
.panes{display:grid;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(239,236,228,.22) transparent}
.pane{grid-area:1/1;display:grid;gap:12px;align-content:start;padding:12px}
.pane[hidden]{display:grid!important;visibility:hidden}
/* Kari: her six forms as portraits in the colorway she wears now, then color and wardrobe where the form takes them */
.forms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.form{display:grid;justify-items:center;gap:5px;padding:8px 4px 7px;border:1px solid var(--line);border-radius:8px;transition:border-color 150ms ease,background 150ms ease}
.fthumb{display:block;width:40px;height:45px}
.fthumb svg{display:block;width:100%;height:100%;overflow:visible}
.fname{font-size:11px;line-height:14px;color:var(--bone-2)}
.form[aria-pressed="true"]{border-color:var(--bone);background:rgba(239,236,228,.08)}
.form[aria-pressed="true"] .fname{color:var(--bone)}
.opt{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:8px}
.ol{font-size:11px;color:var(--mute-2)}
.settings .row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.swatch{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 7px;border:1px solid var(--line);border-radius:999px;font-size:12px;color:var(--bone-2);transition:border-color 150ms ease,background 150ms ease,color 150ms ease}
.swatch::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}
.swatch[aria-pressed="true"]{border-color:var(--bone);color:var(--bone);background:rgba(239,236,228,.08)}
.settings .chip{height:28px;padding:0 10px;white-space:nowrap;border:1px solid var(--line);border-radius:999px;font-size:12px;color:var(--bone-2);transition:color 150ms ease,border-color 150ms ease,background 150ms ease}
.settings .chip[aria-pressed="true"]{color:var(--ink);background:var(--bone);border-color:var(--bone)}
.note{margin:0;font-size:11px;color:var(--mute-2)}
.note:empty{display:none}
/* Interface: the four looks as rows, each with its mark and one line on what it is */
.skins{display:grid;gap:6px}
.skinrow{display:grid;grid-template-columns:20px minmax(0,1fr);gap:2px 10px;align-items:center;text-align:left;padding:9px 11px;border:1px solid var(--line);border-radius:8px;transition:border-color 150ms ease,background 150ms ease}
.skinrow svg{grid-row:span 2;width:20px;height:20px;fill:none;stroke:var(--bone-2);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.skinrow b{font-weight:600;color:var(--bone-2)}
.skinrow span{font-size:11px;color:var(--mute-2)}
.skinrow[aria-pressed="true"]{border-color:var(--bone);background:rgba(239,236,228,.08)}
.skinrow[aria-pressed="true"] b{color:var(--bone)}
.skinrow[aria-pressed="true"] svg{stroke:var(--bone)}
/* MIDI and Page */
.settings .sg{display:grid;gap:8px}
.settings .sg[hidden]{display:none}
.settings .mst{font-family:inherit;font-size:11px;letter-spacing:0;color:var(--mute-2);align-self:auto}
.settings .mst.data{font-family:var(--mono);font-size:11px;letter-spacing:.04em}
.settings .big{width:100%;height:34px;border:1px solid var(--line);border-radius:8px;font-size:12px;font-weight:500;color:var(--bone);transition:border-color 150ms ease,background 150ms ease}
.settings .big.pri{background:var(--bone);color:var(--ink);border-color:var(--bone)}
.settings .showrow{display:none}
.root[data-collapsed="1"] .settings .showrow{display:flex}
.root[data-collapsed="1"] .settings .hiderow{display:none}
.pane[data-pane="page"]{grid-template-rows:auto auto 1fr}   /* the footer takes the last row, so it sits on the panel's bottom edge whatever the Kari pane's height */
.sfoot{grid-row:-2;align-self:end;display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding-top:10px;border-top:1px solid var(--line)}
.settings .more{font-size:11px;color:var(--bone-2);text-decoration:underline;text-underline-offset:3px;pointer-events:auto;transition:color 150ms ease}
.settings .ver{font-family:var(--mono);font-size:11px;color:var(--mute-2);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:no-preference){
  .settings{animation:kari-setin 200ms var(--ease-out)}
  @keyframes kari-setin{from{opacity:0;transform:translateY(6px) scale(.97)}}
}
@media (prefers-reduced-motion:reduce){.tab::after{transition:none}}
/* small players: Kari alone */
.root[data-small="1"] .org{width:auto;grid-template-columns:auto}
.root[data-small="1"] .org .ctl{display:none}
.root[data-small="1"] .org .body{width:64px;height:74px}
.root[data-small="1"] .void,.root[data-small="1"] .pod,.root[data-small="1"] .cons-ctl,.root[data-small="1"] .cons svg{display:none}
.root[data-small="1"] .void-orb{opacity:1;pointer-events:auto}
.root[data-small="1"] .cloudlet{transform:translate(0,-120px)}

/* SoundCloud: the dock stands on the fixed bottom bar (.playControls) inside a 320 px panel above it. Panels anchor to
   the bottom edge, the gear and settings move to the left so nothing overlaps the controls or the bar's own buttons. */
.root[data-bar-hidden="1"]{visibility:hidden;pointer-events:none}
.root[data-site="sc"] .org{top:auto;bottom:10px;right:16px;width:330px}
.root[data-site="sc"] .void,.root[data-site="sc"] .pod,.root[data-site="sc"] .cons-ctl{top:auto;bottom:10px;right:16px}
.root[data-site="sc"] .void-orb{top:auto;bottom:14px;right:16px}
.root[data-site="sc"] .cons{top:auto;bottom:0;height:100%;width:min(520px,60%)}
.root[data-site="sc"] .suncap{top:auto;bottom:150px}
.root[data-site="sc"] .cloudlet{top:auto;bottom:14px;right:16px}
.root[data-site="sc"][data-collapsed="1"] .cloudlet{transform:none}
.root[data-site="sc"] .gear{right:auto;left:14px;bottom:12px}
.root[data-site="sc"] .settings{right:auto;left:14px;bottom:50px;max-height:260px}
.root[data-site="sc"] .intro{top:auto;bottom:240px;right:16px}
.root[data-site="sc"] .fault{top:auto;bottom:250px}
`;
