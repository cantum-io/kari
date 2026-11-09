"use strict";(()=>{var ke=`
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
/* beat loops: four length toggles (\xBD \xB7 1 \xB7 1 bar \xB7 2 bars) and the tempo readout, directly under the steppers with Full
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
/* 250px left the controls column at 146px: the two step blocks (28+label+28 each) overlapped and the + buttons sat under the \u2212 of the next block (live probe 2026-09-26). 330px gives the column 234px. */
.org{position:absolute;right:3%;top:5%;width:min(330px,52%);display:grid;grid-template-columns:1fr 96px;gap:4px 8px;align-items:start}
/* the grid container itself must not swallow clicks meant for the video: only the control box and Kari are targets */
.skin > .org,.skin > .cons{pointer-events:none}
.org > .ctl,.org > .body,.cons-ctl{pointer-events:auto}
.org .ctl{grid-column:1;padding:10px 12px;background:rgba(3,3,8,.72);border-radius:12px;border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(6px);--ax:100%;--ay:60%;--tx:30px;--ty:20px}
/* inside the player box on a small or scaled screen (1366\xD7768 at 125 %: a 348 px player): capped at 90 % of the host height from dock.ts, scrolling. SoundCloud mounts on the page, not a box. */
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

/* KARI'S FORMS (forms.ts): one 160\xD7180 body, six looks. The base styles paint the character on the player and the
   portraits on her settings tiles alike; every loop and reaction is scoped to the player (.org .body), so the tiles
   stand still. The shared defs svg is 0\xD70, never display:none (gradients inside a display:none subtree stop painting). */
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
/* SETTINGS (0.11.0): a tab bar \u2014 Kari \xB7 Interface \xB7 MIDI \xB7 Page \u2014 over one pane at a time, in place of one long list
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
`;var se=t=>{let e=Math.max(0,Math.floor(Number.isFinite(t)?t:0));return`${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}`};function xe(t,e,a=performance.now()){return t?.recording?`${se(t.recSeconds)}${t.recHeld?" \xB7 paused":""}`:e&&e.until>a?e.text:""}var bt=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],ve={st:12,cents:50,tempoRanges:[8,16,50]},ne=(t,e,a)=>Math.min(a,Math.max(e,t));function ie(t,e,a=!0){let r=((t+e)%12+12)%12;return bt[r]+(a?"m":"")}var we=t=>(1+t/100).toFixed(2)+"\xD7",Me=(t,e=0)=>(t>0?"+":t<0?"\u2212":"")+Math.abs(t).toFixed(e);function C(t,e){return{...t,tempo:ne(+(t.tempo+e).toFixed(1),-t.range,t.range)}}function _(t,e){return{...t,st:ne(t.st+e,-ve.st,ve.st)}}function Se(t,e){return{...t,range:e,tempo:ne(t.tempo,-e,e)}}var q=t=>t.st===0&&t.cents===0&&t.tempo===0,A={st:0,cents:0,tempo:0,range:50,keyLock:!1};var H=[{id:"kari",name:"Kari",colorway:!0,wear:!0,label:"Kari, the original"},{id:"nebula",name:"Nebula",colorway:!0,wear:!0,label:"Nebula, Kari in glass with a galaxy inside"},{id:"medusa",name:"Medusa",colorway:!0,wear:!1,label:"Medusa, Kari as a jellyfish"},{id:"hex",name:"Hex",colorway:!1,wear:!1,label:"Hex, the sister with horns and a tail"},{id:"chrome",name:"Chrome",colorway:!1,wear:!1,label:"Chrome, the holographic sister"},{id:"hood",name:"Hood",colorway:!1,wear:!1,label:"Hood, the hooded sister"}],$e=H.map(t=>t.id),Re=t=>H.find(e=>e.id===t)||H[0],Ce=`
<svg class="kdefs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <radialGradient id="kari-blobfill" cx="40%" cy="30%" r="80%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".95"/><stop offset=".5" style="stop-color:var(--m2)" stop-opacity=".6"/><stop offset="1" style="stop-color:var(--m3)" stop-opacity=".3"/></radialGradient>
    <filter id="kari-goo"><feGaussianBlur stdDeviation="2" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
    <filter id="kari-glass"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/><feColorMatrix in="b" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 60 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="in"/></filter>
    <filter id="kari-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="kari-nebula" cx="42%" cy="34%" r="78%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".7"/><stop offset=".45" stop-color="#8f7bff" stop-opacity=".38"/><stop offset=".8" style="stop-color:var(--m3)" stop-opacity=".35"/><stop offset="1" style="stop-color:var(--m1)" stop-opacity=".55"/></radialGradient>
    <radialGradient id="kari-space" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#16244a"/><stop offset="1" stop-color="#03070f"/></radialGradient>
    <radialGradient id="kari-hex" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#4a3358"/><stop offset=".55" stop-color="#1c1324"/><stop offset="1" stop-color="#08060b"/></radialGradient>
    <linearGradient id="kari-hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2138"/><stop offset="1" stop-color="#110b16"/></linearGradient>
    <linearGradient id="kari-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f6fb"/><stop offset=".25" stop-color="#c9c2ff"/><stop offset=".45" stop-color="#ffb3e1"/><stop offset=".6" stop-color="#f4f2ff"/><stop offset=".8" stop-color="#9ff0ff"/><stop offset="1" stop-color="#e9e6f7"/></linearGradient>
    <clipPath id="kari-cp-body"><ellipse cx="80" cy="95" rx="53" ry="59"/></clipPath>
    <mask id="kari-m-cresl"><circle cx="40" cy="38" r="13" fill="#fff"/><circle cx="46" cy="33" r="11" fill="#000"/></mask>
    <mask id="kari-m-cresr"><circle cx="120" cy="44" r="10" fill="#fff"/><circle cx="125" cy="40" r="8.5" fill="#000"/></mask>
    <path id="kari-spk" d="M0 -10 Q2.8 -2.8 10 0 Q2.8 2.8 0 10 Q-2.8 2.8 -10 0 Q-2.8 -2.8 0 -10Z"/>
    <g id="kari-core"><ellipse cx="80" cy="95" rx="54" ry="60"/><ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/><ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/></g>
    <g id="kari-shape"><use href="#kari-core"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/></g>
  </defs>
</svg>`,Ee=`
    <g class="acc shoes">
      <path d="M34 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M30 176 h40 M32 172 l3 3 M38 171 l3 4 M44 171 l3 4 M50 171 l3 4 M56 171 l3 4 M62 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M40 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
      <path d="M90 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M86 176 h40 M88 172 l3 3 M94 171 l3 4 M100 171 l3 4 M106 171 l3 4 M112 171 l3 4 M118 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M96 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
    </g>`,Le=`
    <g class="acc shades">
      <rect x="47" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <rect x="83" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <path d="M77 85 h6" stroke="#050507" stroke-width="2"/><path d="M47 84 l-10 -4 M113 84 l10 -4" stroke="#050507" stroke-width="1.6"/>
      <path d="M52 83 h10 M88 83 h10" stroke="rgba(255,255,255,.45)" stroke-width="1"/>
    </g>`,Te=`
    <g class="acc cap">
      <path d="M46 46 q34 -30 68 0 v6 h-68z" fill="#0d0d12"/><path d="M40 52 h84 q-4 -6 -8 -6 h-68 q-4 0 -8 6z" fill="#0d0d12"/>
      <path d="M104 50 q22 -2 30 6 q-14 0 -30 -2z" fill="#0d0d12"/><path d="M46 46 q34 -30 68 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <text x="80" y="40" font-size="8.5" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" fill="#efece4" letter-spacing="1">YGG</text>
    </g>`,P=(t,e)=>`<text class="zz" x="${t}" y="${e}">zz</text>`,gt=(t,e,a,r,s)=>s?`<animate attributeName="d" dur="${a}" begin="${r}" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="${t};${e};${t}"/>`:"",T=(t,e,a,r,s,n)=>`<path class="${t}" d="${e}">${gt(e,a,r,s,n)}</path>`,Ae={kari:t=>`
  <g class="beat"${t?' data-el="beat"':""}>
    <g class="blob" style="transform-origin:80px 90px">
      <ellipse cx="80" cy="95" rx="54" ry="60"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/>
      <ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/>
      <ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/>
    </g>
    <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${t?Ee:""}
    <g class="lid l"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
    <g class="lid r"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
    <g class="lid l"><circle class="iris" cx="64" cy="88" r="4"/></g>
    <g class="lid r"><circle class="iris" cx="100" cy="88" r="4"/></g>
    <path class="mouth" d="M70 112 q10 8 20 0" fill="none" stroke="#03141a" stroke-width="2" stroke-linecap="round"/>
    ${t?P(118,60)+Le+Te:""}
  </g>${t?`
  <circle class="bubble" data-el="bubble" cx="118" cy="76" r="14"/>`:""}`,nebula:t=>`
  <g class="idle">
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M10 116 A70 14 0 0 1 150 116"/><path class="ring" d="M10 116 A70 14 0 0 1 150 116"/>${t?'<circle class="moon" data-moon="back" r="4" cx="10" cy="116"/>':""}</g>
    <g class="beat"${t?' data-el="beat"':""}>
      <use href="#kari-core" class="neb"/>
      <g clip-path="url(#kari-cp-body)"><g class="swirl"><ellipse cx="62" cy="80" rx="36" ry="15" fill="#b69cff" opacity=".5" filter="url(#kari-soft)"/><ellipse cx="100" cy="114" rx="32" ry="12" style="fill:var(--m1)" opacity=".5" filter="url(#kari-soft)"/></g>
        <g><circle class="speck" cx="50" cy="70" r="1"/><circle class="speck" cx="112" cy="70" r="1.3"/><circle class="speck" cx="98" cy="130" r="1"/><circle class="speck" cx="58" cy="128" r="1.4"/><circle class="speck" cx="122" cy="108" r="1"/><circle class="speck" cx="38" cy="104" r="1"/></g></g>
      <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${t?Ee:""}
      <g class="lidf"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><circle class="iris" cx="64" cy="88" r="4"/><circle cx="59" cy="81" r="1.2" fill="#fff"/></g>
      <g class="lidf"><circle class="iris" cx="100" cy="88" r="4"/><circle cx="95" cy="81" r="1.2" fill="#fff"/></g>
      <path class="mouth" d="M70 112 q10 8 20 0"/>
      ${t?P(118,60)+Le+Te:""}
    </g>
    <circle class="cres" cx="40" cy="38" r="13" mask="url(#kari-m-cresl)"/><circle class="cres b" cx="120" cy="44" r="10" mask="url(#kari-m-cresr)"/>
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M150 116 A70 14 0 0 1 10 116"/><path class="ring" d="M150 116 A70 14 0 0 1 10 116"/><circle class="moon"${t?' data-moon="front"':""} r="4" cx="${t?150:124}" cy="${t?116:128}"/></g>
  </g>`,medusa:t=>`
  <g class="idle"><g class="beat"${t?' data-el="beat"':""}>
    <g>
      ${T("tent","M128.3 108 C135 122 121 138 129 150","M128.3 108 C121 122 135 138 127 150","2.6s","0s",t)}
      ${T("tent","M109 108 C116 124 102 142 110 160","M109 108 C102 124 116 142 108 160","2.6s","-.4s",t)}
      ${T("tent","M89.7 108 C96 126 83 146 91 166","M89.7 108 C83 126 96 146 88 166","2.6s","-.8s",t)}
      ${T("tent","M70.3 108 C77 126 64 146 72 166","M70.3 108 C64 126 77 146 69 166","2.6s","-1.2s",t)}
      ${T("tent","M51 108 C58 124 44 142 52 160","M51 108 C44 124 58 142 50 160","2.6s","-1.6s",t)}
      ${T("tent","M31.7 108 C38 122 24 138 32 150","M31.7 108 C24 122 38 138 30 150","2.6s","-2s",t)}
      ${T("oral","M74 106 C68 122 80 134 72 152","M74 106 C80 122 68 134 76 152","3.4s","0s",t)}
      ${T("oral","M86 106 C92 122 80 134 88 152","M86 106 C80 122 92 134 84 152","3.4s","-1.7s",t)}
    </g>
    <g class="bell">
      <g class="blob"><path d="M22 104 C20 60 46 30 80 30 C114 30 140 60 138 104 Q128.3 113 118.7 104 Q109.0 113 99.3 104 Q89.7 113 80.0 104 Q70.3 113 60.7 104 Q51.0 113 41.3 104 Q31.7 113 22.0 104Z"/><circle cx="41" cy="42" r="12"/><circle cx="117" cy="48" r="9"/></g>
      <ellipse class="ripple" cx="80" cy="70" rx="60" ry="42"/>
      <ellipse class="shine" cx="50" cy="52" rx="12" ry="6" transform="rotate(-30 50 52)"/>
      <g><circle class="bio" cx="34" cy="98" r="1.8"/><circle class="bio" cx="48" cy="100" r="1.8"/><circle class="bio" cx="63" cy="101" r="1.8"/><circle class="bio" cx="80" cy="101" r="1.8"/><circle class="bio" cx="97" cy="101" r="1.8"/><circle class="bio" cx="112" cy="100" r="1.8"/><circle class="bio" cx="126" cy="98" r="1.8"/></g>
      <g class="lidf"><ellipse class="eye" cx="62" cy="72" rx="11" ry="14"/></g>
      <g class="lidf"><ellipse class="eye" cx="98" cy="72" rx="11" ry="14"/></g>
      <g class="lidf"><circle class="iris" cx="64.5" cy="75" r="4.4"/><circle cx="58" cy="66" r="1.8" fill="#fff"/></g>
      <g class="lidf"><circle class="iris" cx="100.5" cy="75" r="4.4"/><circle cx="94" cy="66" r="1.8" fill="#fff"/></g>
      <path class="mouth" d="M73 92 q7 6 14 0"/>
      ${t?P(128,26):""}
    </g>
  </g></g>`,hex:t=>`
  <g class="idle"><g class="beat"${t?' data-el="beat"':""}>
    <g class="tail"><path class="rope-rim" d="M116 142 C138 152 152 140 148 116"/><path class="rope" d="M116 142 C138 152 152 140 148 116"/><path d="M148 102 L157 117 L148 113.5 L139 117 Z"/></g>
    <g class="blob"><use href="#kari-core"/><path d="M33 58 C25 42 22 28 25 13 C35 22 47 33 57 44 Z"/><path d="M104 46 C111 37 119 31 128 26 L126.5 31.5 L132 33.5 C127 41 123 48 119 55 Z"/></g>
    <use class="stud" href="#kari-spk" transform="translate(34 34) scale(.36)"/>
    <ellipse class="shine" cx="52" cy="62" rx="10" ry="5" transform="rotate(-25 52 62)"/>
    <g class="eyeL"><g class="lidf"><path class="eye" d="M52 84 Q62 79 72 83 L72.5 88 Q72 101 62 101 Q52 101 51.5 88 Z"/><g class="pupils"><ellipse class="pink" cx="61" cy="92" rx="4.6" ry="5.6"/><ellipse class="slit" cx="61" cy="92" rx="1" ry="3.8"/><circle cx="63" cy="89" r="1.2" fill="#fff"/></g><path class="lash" d="M74 83 Q61 76 50 84 L45 80"/></g></g>
    <path class="wink" d="M52 92 Q62 84 72 92"/>
    <g class="lidf"><path class="eye" d="M88 83 Q98 79 108 84 L108.5 88 Q108 101 98 101 Q88 101 87.5 88 Z"/><g class="pupils"><ellipse class="pink" cx="97" cy="92" rx="4.6" ry="5.6"/><ellipse class="slit" cx="97" cy="92" rx="1" ry="3.8"/><circle cx="99" cy="89" r="1.2" fill="#fff"/></g><path class="lash" d="M86 83 Q99 76 110 84 L115 80"/></g>
    <path class="smirk" d="M70 113 Q81 119 92 109"/>
    <path class="fang" d="M84.4 115.4 L86.6 119.8 L88.4 114.2 Z"/>
    <path class="pink" d="M44 108 C38 104 39 99 42 99 C43.3 99 44 100 44 100.8 C44 100 44.7 99 46 99 C49 99 50 104 44 108Z"/>
    <path class="pop" d="M80 52 C70 45 72 37 77 37 C79 37 80 39 80 40 C80 39 81 37 83 37 C88 37 90 45 80 52Z"/>
    ${t?P(136,70):""}
  </g></g>`,chrome:t=>`
  <g class="idle"><g class="beat"${t?' data-el="beat"':""}>
    <g class="blob"><use href="#kari-shape"/></g>
    <g clip-path="url(#kari-cp-body)"><rect class="sheen" x="-20" y="20" width="18" height="160" transform="skewX(-20)"/></g>
    <path class="boot" d="M45 160 h34 v10 q0 6 -6 6 h-22 q-6 0 -6 -6z"/><path class="boot-line" d="M47 169 h30"/>
    <path class="boot" d="M85 160 h34 v10 q0 6 -6 6 h-22 q-6 0 -6 -6z"/><path class="boot-line" d="M87 169 h30"/>
    <g class="wings"><ellipse class="wing-a" cx="32" cy="30" rx="8.5" ry="5.6" transform="rotate(-30 32 30)"/><ellipse class="wing-a" cx="48" cy="30" rx="8.5" ry="5.6" transform="rotate(30 48 30)"/><ellipse class="wing-b" cx="33" cy="39" rx="5.6" ry="3.8" transform="rotate(20 33 39)"/><ellipse class="wing-b" cx="47" cy="39" rx="5.6" ry="3.8" transform="rotate(-20 47 39)"/><path class="wing-body" d="M40 26 L40 43"/></g>
    <use class="clip" href="#kari-spk" transform="translate(119 44) scale(.75)"/>
    <ellipse class="blush" cx="46" cy="106" rx="7" ry="3.5"/><ellipse class="blush" cx="114" cy="106" rx="7" ry="3.5"/>
    <g class="lidf"><ellipse class="eye" cx="62" cy="90" rx="11" ry="14"/><use class="iris" href="#kari-spk" transform="translate(64 93) scale(.55)"/><circle cx="57" cy="83" r="2.4" fill="#fff"/></g>
    <g class="lidf"><ellipse class="eye" cx="98" cy="90" rx="11" ry="14"/><use class="iris" href="#kari-spk" transform="translate(100 93) scale(.55)"/><circle cx="93" cy="83" r="2.4" fill="#fff"/></g>
    <circle class="gem" cx="56" cy="107" r=".9"/><circle class="gem" cx="60" cy="108" r=".9"/><circle class="gem" cx="64" cy="107" r=".9"/><circle class="gem" cx="96" cy="107" r=".9"/><circle class="gem" cx="100" cy="108" r=".9"/><circle class="gem" cx="104" cy="107" r=".9"/>
    <path class="mouth" d="M72 112 q4 4.5 8 0 q4 4.5 8 0"/>
    ${t?`<circle class="gum" cx="80" cy="118" r="2"/>
    <circle class="bit" cx="80" cy="118" r="1.6" style="--bx:-18px;--by:-10px"/><circle class="bit" cx="80" cy="118" r="1.6" style="--bx:18px;--by:-12px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:-12px;--by:14px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:14px;--by:12px"/>
    ${P(136,66)}`:""}
  </g>
    <use class="ystar" href="#kari-spk" transform="translate(14 72) scale(.5)"/><use class="ystar b" href="#kari-spk" transform="translate(148 40) scale(.6)"/><use class="ystar" href="#kari-spk" transform="translate(150 150) scale(.4)"/>
  </g>`,hood:t=>`
  <g class="duck"><g class="idle"><g class="beat"${t?' data-el="beat"':""}>
    <g class="blob"><use href="#kari-core"/></g>
    <path class="boot" d="M46 161 h32 v9 q0 6 -6 6 h-20 q-6 0 -6 -6z"/><path class="boot-line" d="M48 169 h28"/>
    <path class="boot" d="M86 161 h32 v9 q0 6 -6 6 h-20 q-6 0 -6 -6z"/><path class="boot-line" d="M88 169 h28"/>
    <path class="hood" d="M24 114 C17 86 21 56 33 38 L29 13 C40 21 49 28 56 33 C71 26 93 26 106 32 C113 30 119 28 126 25 L124 45 C139 63 142 90 136 114 C126 126 110 128 98 124 L62 124 C50 128 33 126 24 114 Z"/>
    <ellipse class="hole" cx="80" cy="94" rx="35" ry="27"/>
    <ellipse class="stitch" cx="80" cy="94" rx="38.5" ry="30.5"/>
    <use class="pink" href="#kari-spk" transform="translate(40 66) scale(.62)"/>
    <path class="stitch" d="M33 66 h-4 M47 66 h4 M40 59 v-4 M40 73 v4"/>
    <g class="lid-a lidf"><path class="glow" d="M58 87 L75 93 Q73 101 65 100 Q57 98 58 87 Z"/><circle class="dot" cx="66" cy="95" r="1.6"/></g>
    <g class="lid-b lidf"><path class="glow" d="M102 87 L85 93 Q87 101 95 100 Q103 98 102 87 Z"/><circle class="dot" cx="94" cy="95" r="1.6"/></g>
    <g class="grin"><path d="M64 106 Q80 120 96 106 Q80 112 64 106 Z"/><path class="fang" d="M71 108.6 L73 113 L75 109.4Z"/><path class="fang" d="M85 109.4 L87 113 L89 108.6Z"/></g>
    <g><circle class="gem" cx="64" cy="124.5" r="1.1"/><circle class="gem" cx="70" cy="125.5" r="1.1"/><circle class="gem" cx="76" cy="126" r="1.1"/><circle class="gem" cx="84" cy="126" r="1.1"/><circle class="gem" cx="90" cy="125.5" r="1.1"/><circle class="gem" cx="96" cy="124.5" r="1.1"/></g>
    <g class="charm"><path class="chain" d="M80 125 V133"/><path class="pink" d="M80 142 C74 138 75 133 78 133 C79 133 80 134 80 134.8 C80 134 81 133 82 133 C85 133 86 138 80 142Z"/></g>
    ${t?P(138,34):""}
  </g></g></g>`},yt={kari:!1,nebula:!1,medusa:!1,hex:!0,chrome:!0,hood:!0};function le(t,e){let a=Ae[t]?t:"kari";return`<svg class="kf f-${a}${yt[a]?" sis":""}" viewBox="0 0 160 180" aria-hidden="true" focusable="false">${Ae[a](e)}
</svg>`}function _e(t){return{x:80+70*Math.cos(t),y:116+14*Math.sin(t),back:Math.sin(t)<0}}var Pe=[.5,1,4,8];var Ie=40,Be=300;var O=t=>(Math.round(t*10)/10).toFixed(1).replace(/\.0$/,""),ce=t=>t===.5?"\xBD":t===1?"1":t===4?"1 bar":"2 bars",Fe=t=>t===.5?"Loop half a beat":t===1?"Loop one beat":t===4?"Loop one bar":"Loop two bars";var kt={off:"",idle:"play to learn",gesture:"click to learn",learning:"learning\u2026",none:"tap"};function He(t,e){if(!e)return{state:"off",text:""};let a=t?.bpm??null;if(a)return{state:"found",text:`${O(a)} bpm`};let r=t?.tempo??"idle",s=r==="found"?"idle":r;return{state:s,text:kt[s]}}var Oe={yt:"hideOnYouTube",sc:"hideOnSoundCloud"},De={yt:"YouTube",sc:"SoundCloud"};var xt={yt:{"drm-silent":"this video's audio is protected \u2014 Kari can't touch it","capture-failed":"couldn't reach the audio on this page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page so Kari can reach the player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload",busy:"this machine is busy \u2014 playing the song as it is; reload to try again"},sc:{"drm-silent":"this track's audio is protected \u2014 speed only","capture-failed":"couldn't reach SoundCloud's player \u2014 reload the page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page once \u2014 Kari arrived after SoundCloud set up its player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload",busy:"this machine is busy \u2014 playing the track as it is; reload to try again"}},vt={"0.5":"loop-h",1:"loop-1",4:"loop-bar",8:"loop-2bar",tap:"tap"},wt=Pe.map(t=>`<button class="pill loop" data-a="loop" data-v="${t}" aria-pressed="false" aria-label="${Fe(t)}" disabled>${ce(t)}</button>`).join(""),Mt='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',z=`
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00\xD7</span></b><span class="p ro">pitch <span data-b="st">0</span><span data-b="yt"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">\u2212</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">\u2212</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="loops">${wt}<span class="tro ro" data-b="tempo" data-state="idle" aria-live="polite"></span></div>
  <div class="take"><button class="pill rec" data-a="rec" aria-pressed="false" aria-label="Record a take"><span class="dot"></span>Rec</button><span class="tro ro" data-b="take" aria-live="polite"></span></div>
  <div class="full">
    <div class="pills">
      <button class="pill" data-a="vinyl" aria-pressed="true">Vinyl</button>
      <button class="pill" data-a="lock" aria-pressed="false">Key lock</button>
      <span class="rng"><button data-a="range" data-v="8">\xB18</button><button data-a="range" data-v="16">\xB116</button><button data-a="range" data-v="50">\xB150</button></span>
    </div>
    <div class="pills">
      <button class="pill hold" data-a="compare">Hold to compare</button>
      <button class="pill" data-a="reset">Reset</button>
    </div>
    <div class="tempo">
      <button class="pill" data-a="tap" aria-label="Tap tempo">Tap</button>
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">\u2212</button><input class="bpm ro" type="number" min="${Ie}" max="${Be}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span><span>loop <em class="ro" data-b="loopinfo">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,St='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>',Et=[["kari","Kari"],["look","Interface"],["midi","MIDI"],["page","Page"]],Lt=[["org","Kari","Kari beside the controls",'<path d="M10 3.5c3.6 0 6 2.9 6 6.6S13.6 16.5 10 16.5 4 13.8 4 10.1 6.4 3.5 10 3.5z"/><path d="M8 9.5v1M12 9.5v1"/>'],["void","Void Signal","A black panel that glows once you change the sound",'<rect x="3" y="4.5" width="14" height="11" rx="2.5"/><circle cx="14" cy="13" r="1.2"/>'],["weather","Alien Weather","A frosted pod under a small sun and a cloud",'<path d="M6.5 15.5h7.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8 1.2 2.4 2.4 0 0 0 .5 4.8z"/><path d="M4.5 4.5l1.2 1.2M8.5 2.5v1.6"/>'],["cons","Constellation","Drag the moon around its orbit to change key",'<ellipse cx="10" cy="11" rx="7" ry="3.6"/><circle cx="10" cy="11" r="1"/><circle cx="15.6" cy="8.8" r="1.6"/>']],Tt=`
  <aside class="settings" data-el="settings" hidden aria-label="Kari settings">
    <div class="snav">
      <div class="tabs" role="tablist" aria-label="Kari settings">${Et.map(([t,e],a)=>`<button class="tab" role="tab" id="kari-tab-${t}" aria-controls="kari-pane-${t}" data-tab="${t}" aria-selected="${a===0}" tabindex="${a===0?0:-1}"${t==="midi"?' data-el="miditab"':""}>${e}</button>`).join("")}</div>
      <button class="x" data-s="close" aria-label="Close settings">${St}</button>
    </div>
    <div class="panes" data-el="panes">
      <section class="pane" role="tabpanel" id="kari-pane-kari" aria-labelledby="kari-tab-kari" data-pane="kari">
        <div class="forms" role="group" aria-label="Form">${H.map(t=>`<button class="form" data-form="${t.id}" aria-pressed="false" aria-label="${t.label}"><span class="fthumb">${le(t.id,!1)}</span><span class="fname" aria-hidden="true">${t.name}</span></button>`).join("")}</div>
        <div class="opt"><span class="ol" id="kari-l-color">Color</span><div class="row" role="group" aria-labelledby="kari-l-color">
          <button class="swatch" data-kari="blue" style="--c:#5cf2ff">Blue</button><button class="swatch" data-kari="pink" style="--c:#ff7ad9">Pink</button><button class="swatch" data-kari="black" style="--c:#2a2a33">Black</button></div></div>
        <div class="opt"><span class="ol" id="kari-l-wear">Wear</span><div class="row" role="group" aria-labelledby="kari-l-wear">
          <button class="chip" data-wear="cap" aria-pressed="false">YGG cap</button><button class="chip" data-wear="shades" aria-pressed="false" aria-label="Thin black sunglasses">Shades</button><button class="chip" data-wear="shoes" aria-pressed="false" aria-label="Chunky sneakers">Sneakers</button></div></div>
        <p class="note" data-el="formnote" aria-live="polite"></p>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-look" aria-labelledby="kari-tab-look" data-pane="look" hidden>
        <div class="skins" role="group" aria-label="Interface">${Lt.map(([t,e,a,r])=>`<button class="skinrow" data-skin="${t}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true">${r}</svg><b>${e}</b><span>${a}</span></button>`).join("")}</div>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-midi" aria-labelledby="kari-tab-midi" data-pane="midi" hidden>
        <div class="sg" data-el="midisg">
          <div class="row"><button class="chip" data-m="connect">Connect</button><button class="chip" data-m="learn" aria-pressed="false">Learn</button><span class="mst data" data-el="midist">not connected</span></div>
          <span class="mst">Learn: switch it on, click a loop length or Tap, then hit the pad. A pad on the lit length releases it.</span>
        </div>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-page" aria-labelledby="kari-tab-page" data-pane="page" hidden>
        <div class="row hiderow"><button class="big" data-a="hide">Hide dock \xB7 absorb into Kari</button></div>
        <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
        <div class="sg"><button class="big" data-a="hide-site" data-el="hidesite">Hide Kari on YouTube</button><span class="mst">Back from Kari's toolbar icon or More settings.</span></div>
        <div class="sfoot"><a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a><span class="ver" data-el="ver"></span></div>
      </section>
    </div>
  </aside>`,At=`
<div class="root" data-collapsed="0" data-small="0">${Ce}
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${z}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls"></div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${z}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${z}</div>
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
        <text class="lab" x="440" y="290" data-b="speed">1.00\xD7</text>
        <text class="lab2" x="442" y="312" data-b="bpm"></text>
        <rect class="hit" x="150" y="120" width="360" height="160"/>
      </svg>
    </div>
    <div class="cons-ctl absorb">${z}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${Mt}</button>
  ${Tt}
</div>`,D=330,K=200,G=120,Y=52,Ne=8,Ue=3e3,j=class{constructor(e,a){this.host=e;this.deps=a;let r=document.createElement("div");this.wrap=r,r.id="kari-dock",r.dataset.build="0.11.0+551cbc4f",r.style.cssText=a.mountStyle||"position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=r.attachShadow({mode:"open"});let s=document.createElement("style");s.textContent=ke,this.shadow.appendChild(s);let n=document.createElement("template");n.innerHTML=At,this.shadow.appendChild(n.content.cloneNode(!0)),e.appendChild(r),this.root=this.shadow.querySelector(".root"),this.root.dataset.site=a.site||"yt";try{new ResizeObserver(c=>{let o=c[0]?.contentRect.height||0;o&&this.root.style.setProperty("--host-h",`${Math.round(o)}px`)}).observe(r)}catch{}this.el("hidesite").textContent=`Hide Kari on ${De[a.site||"yt"]}`,this.el("ver").textContent="0.11.0+551cbc4f".split("+")[0];try{this.rm=matchMedia("(prefers-reduced-motion: reduce)"),this.rm.addEventListener?.("change",()=>this.syncSmil())}catch{}this.seedStars(),this.wire(),this.applySettings(a.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=e=>this.shadow.querySelector(`[data-el="${e}"]`);$$=e=>Array.from(this.shadow.querySelectorAll(e));status=null;midiState=null;learnOn=!1;raf=0;visible=!0;consDrag=!1;ytHidden=!1;over=new Set;keptUntil=0;keptTimer=0;form=null;moons=[];theta=.9;boostUntil=0;reactTimer=0;tab="kari";rm=null;destroy(){cancelAnimationFrame(this.raf),clearTimeout(this.keptTimer),clearTimeout(this.noteTimer),clearTimeout(this.reactTimer),this.host.querySelector("#kari-dock")?.remove()}takeNote=null;noteTimer=0;note(e){clearTimeout(this.noteTimer),this.takeNote=e?{text:e,until:performance.now()+4e3}:null,this.render(),e&&(this.noteTimer=window.setTimeout(()=>{this.takeNote=null,this.render()},4e3))}setStatus(e){this.status=e;let a=this.el("fault"),r=e.fault&&xt[this.deps.site||"yt"][e.fault]||"";a.hidden=!r,a.textContent=r,this.shadow.querySelector(".org")?.setAttribute("data-fault",e.fault?"1":"0"),this.render()}setControlsHidden(e){this.ytHidden=e,this.syncHidden()}get kept(){return this.over.size>0||this.focusInside()||performance.now()<this.keptUntil}focusInside(){let e=this.shadow.activeElement;return!!e&&!e.matches(".anchor")}syncHidden(){let e=this.kept,a=this.ytHidden&&!e?"1":"0",r=e?"1":"0";this.root.dataset.hiddenWithControls!==a&&(this.root.dataset.hiddenWithControls=a),this.root.dataset.kept!==r&&(this.root.dataset.kept=r)}used(){this.keptUntil=performance.now()+Ue,clearTimeout(this.keptTimer),this.keptTimer=window.setTimeout(()=>this.syncHidden(),Ue+50),this.syncHidden()}setBarHidden(e){this.root.dataset.barHidden=e?"1":"0"}setMidiState(e){this.midiState=e;let a=e.learning;this.$$("[data-arm]").forEach(n=>{a||n.removeAttribute("data-arm")});let r=e.supported?e.error?e.error:e.connected?`${e.inputs} input${e.inputs===1?"":"s"}${e.lastNote!==null?` \xB7 note ${e.lastNote}`:""}${a?" \xB7 hit a pad":""}`:"not connected":"no Web MIDI here",s=this.el("midist");s&&s.textContent!==r&&(s.textContent=r),this.render()}setSmall(e){this.root.dataset.small=e?"1":"0"}applySettings(e){this.$$(".skin").forEach(r=>r.hidden=r.dataset.skin!==e.skin),this.$$(".skinrow[data-skin]").forEach(r=>r.setAttribute("aria-pressed",String(r.dataset.skin===e.skin)));let a=this.shadow.querySelector(".org");a.dataset.kari=e.kariColor,a.dataset.cap=e.cap?"1":"0",a.dataset.shades=e.shades?"1":"0",a.dataset.shoes=e.shoes?"1":"0",this.root.dataset.kari=e.kariColor,this.$$("[data-kari]").forEach(r=>r.setAttribute("aria-pressed",String(r.dataset.kari===e.kariColor))),this.$$("[data-wear]").forEach(r=>r.setAttribute("aria-pressed",String(!!e[r.dataset.wear]))),this.applyForm($e.includes(e.form)?e.form:"kari"),e.collapsed&&this.root.dataset.collapsed!=="1"&&(this.over.clear(),this.syncHidden()),this.root.dataset.collapsed=e.collapsed?"1":"0",this.$$(".ctl").forEach(r=>r.dataset.full=e.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(r=>r.setAttribute("aria-pressed",String(e.fullControl))),this.el("intro").hidden=e.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=e}react(){let e=this.el("kari");e.classList.remove("react"),e.offsetWidth,e.classList.add("react"),clearTimeout(this.reactTimer),this.reactTimer=window.setTimeout(()=>e.classList.remove("react"),1700);let a=this.el("bubble");a&&(a.classList.remove("go"),a.getBBox?.(),a.classList.add("go")),this.$$(".org .body .iris, .org .body .glow").forEach(r=>{r.classList.add("lit"),setTimeout(()=>r.classList.remove("lit"),700)}),this.form==="nebula"&&(this.boostUntil=performance.now()+1400)}applyForm(e){let a=this.shadow.querySelector(".org"),r=Re(e);if(e!==this.form){let c=this.form===null;this.form=e;let o=this.el("kari");o.innerHTML=le(e,!0),this.moons=Array.from(o.querySelectorAll("[data-moon]")),this.placeMoons(),this.syncSmil(),c||requestAnimationFrame(()=>this.react())}a.dataset.form=e,this.$$(".form[data-form]").forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.form===e))),this.$$(".swatch[data-kari]").forEach(c=>c.disabled=!r.colorway),this.$$(".chip[data-wear]").forEach(c=>c.disabled=!r.wear);let s=r.colorway?r.wear?"":"The wardrobe fits Kari and Nebula.":"The sisters keep their own colors and clothes.",n=this.el("formnote");n.textContent!==s&&(n.textContent=s)}motionOK(){return!this.rm?.matches}syncSmil(){let e=this.el("kari")?.querySelector("svg");if(e)try{this.motionOK()?e.unpauseAnimations():e.pauseAnimations()}catch{}}placeMoons(){if(!this.moons.length)return;let e=_e(this.theta);for(let a of this.moons){a.setAttribute("cx",e.x.toFixed(1)),a.setAttribute("cy",e.y.toFixed(1));let r=a.dataset.moon==="back"===e.back;a.style.opacity=r?"1":"0"}}selectTab(e,a=!1){this.$$(".tab[data-tab]").filter(s=>!s.hidden).some(s=>s.dataset.tab===e)||(e="kari"),this.tab=e;for(let s of this.$$(".tab[data-tab]")){let n=s.dataset.tab===e;s.setAttribute("aria-selected",String(n)),s.tabIndex=n?0:-1,n&&a&&s.focus()}for(let s of this.$$(".pane[data-pane]"))s.hidden=s.dataset.pane!==e;this.el("panes").scrollTop=0}render(){let e=this.deps.getParams(),a=this.status,r=a?.bpm??null,s=a?.loop??0,n=a?.baseRate&&Math.abs(a.baseRate-1)>.001?` \xB7 ${this.deps.site==="sc"?"sc":"yt"} ${a.baseRate.toFixed(2)}\xD7`:"",{state:c,text:o}=He(a,!!this.deps.loop),i={speed:we(e.tempo),st:Me(e.st),yt:n,bpm:r?`${O(r)} bpm`:"",tempo:o,keypair:`${ie(Ne,0)} \u2192 ${ie(Ne,e.st)}`,engine:a?a.engine==="r3"?"R3":a.engine==="ss"?"SS":"wire":"\u2014",av:a?a.attached?`${a.avOffsetMs} ms`:"0 ms":"\u2014",loopinfo:this.deps.loop?s?`${ce(s)} \xB7 ${a.loopMs} ms${a.loopClamped?" \xB7 at the ring's ceiling":""}`:r?"\u2014":"no tempo yet":"\u2014"};this.$$("[data-b]").forEach(d=>{let g=i[d.dataset.b];g!==void 0&&d.textContent!==g&&(d.textContent=g)});let h=this.shadow.querySelector(".loops");h&&(h.hidden=!this.deps.loop),this.$$('[data-b="tempo"]').forEach(d=>{d.dataset.state!==c&&(d.dataset.state=c)});{let d=this.shadow.querySelector(".take");d&&(d.hidden=!this.deps.record);let g=xe(a,this.takeNote);this.$$('[data-b="take"]').forEach(v=>{v.textContent!==g&&(v.textContent=g)}),this.$$('[data-a="rec"]').forEach(v=>{let L=!!a?.recording,w=L&&!!a.recHeld;v.setAttribute("aria-pressed",String(L)),v.dataset.held!==(w?"1":"0")&&(v.dataset.held=w?"1":"0");let E=L?"Stop and save the take":"Record a take";v.getAttribute("aria-label")!==E&&v.setAttribute("aria-label",E)})}let m=this.shadow.querySelector('[data-el="midisg"]');m&&(m.hidden=!this.deps.midi);let f=this.el("miditab");f&&f.hidden!==!this.deps.midi&&(f.hidden=!this.deps.midi,f.hidden&&this.tab==="midi"&&this.selectTab("kari")),this.$$('[data-a="loop"]').forEach(d=>{let g=s>0&&+d.dataset.v===s;d.setAttribute("aria-pressed",String(g)),d.disabled=!r,g&&d.style.setProperty("--loop-ms",`${a.loopMs}ms`)}),this.$$('[data-a="bpm-"],[data-a="bpm+"]').forEach(d=>{d.disabled=!r}),this.$$('input[data-a="bpm"]').forEach(d=>{if(this.shadow.activeElement===d)return;let g=r?O(r):"";d.value!==g&&(d.value=g)});let b=this.midiState;this.$$('[data-a="midi"]').forEach(d=>{d.setAttribute("aria-pressed",String(!!b?.connected))}),this.$$('[data-m="learn"]').forEach(d=>d.setAttribute("aria-pressed",String(this.learnOn))),this.$$('[data-b="av"]').forEach(d=>d.classList.toggle("warn",!!a&&a.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(d=>{d.min=String(-e.range),d.max=String(e.range),+d.value!==e.tempo&&(d.value=String(e.tempo))}),this.$$('[data-a="lock"]').forEach(d=>d.setAttribute("aria-pressed",String(e.keyLock))),this.$$('[data-a="vinyl"]').forEach(d=>d.setAttribute("aria-pressed",String(!e.keyLock))),this.$$('[data-a="range"]').forEach(d=>d.setAttribute("aria-pressed",String(+d.dataset.v===e.range))),this.shadow.querySelector(".void").dataset.off=q(e)?"1":"0",this.renderCons(e)}wire(){let e=this.shadow;e.addEventListener("click",o=>{let i=o.target.closest("[data-a]");if(!i)return;let h=i.dataset.a,m=this.deps.getParams(),f=b=>{this.deps.apply(b),this.react(),this.render()};switch(h){case"st+":f(_(m,1));break;case"st-":f(_(m,-1));break;case"tempo+":f(C(m,1));break;case"tempo-":f(C(m,-1));break;case"lock":f({...m,keyLock:!0});break;case"vinyl":f({...m,keyLock:!1});break;case"reset":f({...A,range:m.range,keyLock:m.keyLock});break;case"range":f(Se(m,+i.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break;case"hide-site":this.deps.saveSettings({[Oe[this.deps.site||"yt"]]:!0});break;case"rec":{let b=this.deps.record;if(!b)break;this.status?.recording?b.stop().then(d=>this.note(d===null?"nothing recorded":`saved ${se(d)}`)):b.start().then(d=>{d?this.render():this.note("nothing to record")}),this.react(),this.render()}break;case"loop":case"tap":{let b=h==="loop"?i.dataset.v:"tap";if(this.learnOn&&this.midiState?.connected){this.$$("[data-arm]").forEach(d=>d.removeAttribute("data-arm")),i.dataset.arm="1",this.deps.midi?.learn(vt[b]);break}if(h==="loop"){let d=+i.dataset.v;(this.status?.loop??0)===d?this.deps.loop?.release():this.deps.loop?.latch(d)?.then(g=>{g&&this.react(),this.render()})}else this.deps.loop?.tap(),this.react();this.render();break}case"bpm-":this.deps.loop?.nudge(-1),this.render();break;case"bpm+":this.deps.loop?.nudge(1),this.render();break;case"midi":this.deps.midi?.connect()?.then(()=>this.render());break}}),e.addEventListener("click",o=>{let i=o.target.closest("[data-m]");i&&(i.dataset.m==="connect"&&this.deps.midi?.connect()?.then(()=>this.render()),i.dataset.m==="learn"&&(this.learnOn=!this.learnOn,this.learnOn||(this.deps.midi?.learn(null),this.$$("[data-arm]").forEach(h=>h.removeAttribute("data-arm"))),this.render()))});let a=o=>{let i=o.target;return i.matches('input[type="number"]')?!0:i.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(o.key):i.matches('[role="tab"]')?["ArrowLeft","ArrowRight","Home","End","Enter"," "].includes(o.key):o.key==="Escape"&&i.closest(".settings")?!0:i.matches('button, [role="button"], input[type="checkbox"], a')?o.key==="Enter"||o.key===" ":!1};e.addEventListener("keydown",o=>{let i=o,h=i.target.closest('[role="button"][data-a]');h&&(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),h.click()),i.target.matches('input[data-a="bpm"]')&&(i.key==="Enter"||i.key==="Escape")&&(i.preventDefault(),i.target.blur());let m=i.target.closest('[role="tab"]');if(m&&["ArrowLeft","ArrowRight","Home","End"].includes(i.key)){i.preventDefault();let f=this.$$(".tab[data-tab]").filter(g=>!g.hidden),b=f.indexOf(m),d=i.key==="Home"?0:i.key==="End"?f.length-1:(b+(i.key==="ArrowRight"?1:-1)+f.length)%f.length;this.selectTab(f[d].dataset.tab,!0)}i.key==="Escape"&&i.target.closest(".settings")&&(i.preventDefault(),this.closeSettings(!0)),a(i)&&i.stopPropagation()}),e.addEventListener("keyup",o=>{a(o)&&o.stopPropagation()}),e.addEventListener("mousedown",o=>{o.target.closest('button, [role="button"]')&&o.preventDefault()}),e.addEventListener("input",o=>{let i=o.target;if(i.matches('input[data-a="tempo"]')){let h=this.deps.getParams();this.deps.apply({...h,tempo:+i.value}),this.render()}}),e.addEventListener("change",o=>{let i=o.target;if(i.matches('input[data-a="tempo"]')&&this.react(),i.matches('input[data-a="bpm"]')){let h=parseFloat(i.value);Number.isFinite(h)&&(this.deps.loop?.setBpm(h),this.react()),this.render()}}),e.addEventListener("pointerdown",o=>{let i=o.target.closest('[data-a="compare"]');i&&(this.hold(!0),i.setPointerCapture?.(o.pointerId))}),["pointerup","pointercancel"].forEach(o=>e.addEventListener(o,()=>{this.holding&&this.hold(!1)})),e.addEventListener("keydown",o=>{let i=o;i.target.closest('[data-a="compare"]')&&i.key===" "&&!i.repeat&&(i.preventDefault(),this.hold(!0))}),e.addEventListener("keyup",o=>{let i=o;i.target.closest('[data-a="compare"]')&&i.key===" "&&(i.preventDefault(),this.hold(!1))});let r=this.el("gear"),s=this.el("settings");r.addEventListener("click",()=>{let o=s.hidden;s.hidden=!o,r.setAttribute("aria-expanded",String(o))}),s.addEventListener("click",o=>{o.target.closest('[data-s="close"]')&&this.closeSettings(!1)}),this.$$(".tab[data-tab]").forEach(o=>o.addEventListener("click",()=>this.selectTab(o.dataset.tab))),this.$$(".skinrow[data-skin]").forEach(o=>o.addEventListener("click",()=>this.deps.saveSettings({skin:o.dataset.skin}))),this.$$(".form[data-form]").forEach(o=>o.addEventListener("click",()=>this.deps.saveSettings({form:o.dataset.form,skin:"org"}))),this.$$("[data-kari]").forEach(o=>o.addEventListener("click",()=>{this.deps.saveSettings({kariColor:o.dataset.kari,skin:"org"}),this.react()})),this.$$("[data-wear]").forEach(o=>o.addEventListener("click",()=>{let i=o.dataset.wear;this.deps.saveSettings({[i]:!this.deps.settings[i],skin:"org"})}));let n=this.el("consSvg"),c=o=>{let i=n.getBoundingClientRect(),h=(o.clientX-i.left)/i.width*640,m=(o.clientY-i.top)/i.height*360,f=Math.atan2((h-D)/G,-(m-K)/Y);return Math.max(-12,Math.min(12,Math.round(f/Math.PI*12)))};n.addEventListener("pointerdown",o=>{if(!this.deps.settings.collapsed&&o.target.closest(".hit,.moon")){this.consDrag=!0,n.setPointerCapture(o.pointerId);let i=c(o),h=this.deps.getParams();i!==h.st&&(this.deps.apply({...h,st:i}),this.render())}}),n.addEventListener("pointermove",o=>{if(!this.consDrag)return;let i=c(o),h=this.deps.getParams();i!==h.st&&(this.deps.apply({...h,st:i}),this.render())}),["pointerup","pointercancel"].forEach(o=>n.addEventListener(o,()=>{this.consDrag&&(this.consDrag=!1,this.react())}));for(let o of this.$$(".absorb, .gear, .settings, .intro, .fault"))o.addEventListener("pointerenter",()=>{this.over.add(o),this.syncHidden()}),o.addEventListener("pointerleave",()=>{this.over.delete(o),this.syncHidden()});e.addEventListener("focusin",()=>this.syncHidden()),e.addEventListener("focusout",()=>{setTimeout(()=>this.syncHidden(),0)}),["pointerdown","click","input","keydown"].forEach(o=>e.addEventListener(o,i=>{i.isTrusted&&this.used()})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(o=>this.wrap.addEventListener(o,i=>i.stopPropagation()))}closeSettings(e){let a=this.el("gear");this.el("settings").hidden=!0,a.setAttribute("aria-expanded","false"),e&&a.focus()}holding=!1;hold(e){this.holding=e,this.deps.setCompare(e),this.$$('[data-a="compare"]').forEach(a=>a.dataset.held=e?"1":"0")}startPulse(){let e=0,a=0,r=performance.now(),s=n=>{this.raf=requestAnimationFrame(s);let c=Math.min(100,n-r);if(r=n,document.hidden||!!this.shadow.querySelector('.skin[data-skin="org"]').hidden||(this.moons.length&&this.motionOK()&&(this.theta+=c/1e3*(n<this.boostUntil?3.2:.9),this.placeMoons()),n-e<33))return;e=n;let i=this.deps.level();a=Math.max(i,a*.85);let h=1+Math.min(.08,a*.35),m=1-Math.min(.06,a*.25);this.el("beat").style.transform=`scale(${h.toFixed(3)},${m.toFixed(3)})`};this.raf=requestAnimationFrame(s)}seedStars(){let e=this.el("starfield"),a="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((n,c)=>{let o=c%3===0?9:6;a+=`<path class="star" transform="translate(${n[0]} ${n[1]})" d="M0 -${o} L${o*.3} -${o*.3} L${o} 0 L${o*.3} ${o*.3} L0 ${o} L-${o*.3} ${o*.3} L-${o} 0 L-${o*.3} -${o*.3}Z"/>`}),e.innerHTML=a;let s="";for(let n=-12;n<=12;n+=3){let c=n/12*Math.PI;s+=`<line class="tick" x1="${(D+Math.sin(c)*(G+4)).toFixed(1)}" y1="${(K-Math.cos(c)*(Y+4)).toFixed(1)}" x2="${(D+Math.sin(c)*(G-4)).toFixed(1)}" y2="${(K-Math.cos(c)*(Y-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=s}renderCons(e){let a=e.st/12*Math.PI,r=D+Math.sin(a)*G,s=K-Math.cos(a)*Y,n=this.el("moon"),c=this.el("ray");n.setAttribute("cx",r.toFixed(1)),n.setAttribute("cy",s.toFixed(1)),c.setAttribute("x2",r.toFixed(1)),c.setAttribute("y2",s.toFixed(1));let o=this.$$(".star");o.forEach(E=>E.classList.remove("lit")),o.length&&o[(e.st%o.length+o.length)%o.length].classList.add("lit");let i=this.el("tempoArc"),h=170,m=Math.max(-50,Math.min(50,e.tempo))/50,f=Math.PI*.62,b=f+m*.45,d=E=>[D+Math.cos(E)*h,K+Math.sin(E)*h*.55],[g,v]=d(f),[L,w]=d(b);i.setAttribute("d",`M${g.toFixed(1)} ${v.toFixed(1)} A${h} ${(h*.55).toFixed(1)} 0 0 ${m>=0?1:0} ${L.toFixed(1)} ${w.toFixed(1)}`)}};var de={skin:"org",kariColor:"blue",form:"kari",cap:!1,shades:!1,shoes:!1,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1,hideOnYouTube:!1,hideOnSoundCloud:!1},N="kari.settings",pe="kari.video.";function qe(t){let e={};try{let a=globalThis.chrome?.storage?.[t];if(a)return{get:r=>a.get(r),set:r=>a.set(r),remove:r=>a.remove(r)}}catch{}return{async get(a){let r=Array.isArray(a)?a:[a],s={};for(let n of r)n in e&&(s[n]=e[n]);return s},async set(a){Object.assign(e,a)},async remove(a){delete e[a]}}}var V=qe("sync"),X=qe("local");async function W(){try{let t=await V.get(N);return{...de,...t[N]||{}}}catch{return{...de}}}async function ue(t){let a={...await W(),...t};try{await V.set({[N]:a})}catch{}return a}function ze(t){try{globalThis.chrome?.storage?.onChanged?.addListener((e,a)=>{a==="sync"&&e[N]&&t({...de,...e[N].newValue})})}catch{}}async function Ge(t){let e=pe+t;try{let a=await X.get(e);if(a[e])return a[e];let s=(await V.get(e))[e]||null;if(s)try{await X.set({[e]:s}),await V.remove(e)}catch{}return s}catch{return null}}async function Ye(t,e){try{e?await X.set({[pe+t]:e}):await X.remove(pe+t)}catch{}}var he="kari-sc",je={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1,loop:0,loopMs:0,loopClamped:!1,bpm:null,gridSource:null,tempo:"idle",recording:!1,recSeconds:0,recHeld:!1,route:null,ctxState:""},$t=new Set(["off","idle","gesture","learning","found","none"]);function Ve(){let t=new Uint8Array(16),e=globalThis.crypto;if(e?.getRandomValues)e.getRandomValues(t);else for(let a=0;a<t.length;a++)t[a]=Math.random()*256|0;return Array.from(t,a=>a.toString(16).padStart(2,"0")).join("")}function Xe(t,e,a,r,s){if(t.source!==e||t.origin!==a)return null;let n=t.data;return!n||typeof n!="object"||n.ns!==he||n.dir!==r||typeof n.type!="string"?null:n.type==="hello"||n.type==="init"?n:!s||n.nonce!==s?null:n}var Rt=new Set(["r3","ss","bypass"]),Ct=new Set([null,"drm-silent","capture-failed","worklet-failed","hook-missing","late","duplicate","busy"]),_t=new Set(["tap","manual","auto"]),Pt=[.5,1,4,8],k=(t,e,a,r=0)=>typeof t=="number"&&Number.isFinite(t)?Math.min(a,Math.max(e,t)):r,It=t=>typeof t=="number"&&Pt.includes(t);var Bt=6e4,Ft=t=>typeof t=="number"&&Number.isFinite(t)&&t>=1&&t<=1e3;function fe(t){if(!t||typeof t!="object")return null;let e=t;return typeof e.seq=="number"&&Number.isInteger(e.seq)?{seq:e.seq,ok:e.ok===!0}:null}var Ht=t=>typeof t=="number"&&Number.isInteger(t)&&t>=0,Ot=(t,e)=>typeof t=="string"?t.slice(0,e):"";var Dt=4294967295,Kt=new Set(["start","params","loop","seek","hold","resume","volume","stop"]),Nt=1e5;function Ut(t){if(!t||typeof t!="object"||Array.isArray(t))return;let e={};for(let[a,r]of Object.entries(t).slice(0,16))a.length>32||(typeof r=="number"?Number.isFinite(r)&&(e[a]=r):typeof r=="boolean"?e[a]=r:typeof r=="string"&&(e[a]=r.slice(0,64)));return e}function qt(t){if(!t||typeof t!="object")return null;let e=t,a=e.params&&typeof e.params=="object"?e.params:{};if(!Array.isArray(e.moves)||typeof e.sampleRate!="number"||!Number.isFinite(e.sampleRate))return null;let r=typeof e.startedAt=="string"&&Number.isFinite(Date.parse(e.startedAt))?new Date(Date.parse(e.startedAt)).toISOString():new Date().toISOString(),s=o=>typeof o=="string"&&o?o.slice(0,200):void 0,n=[];for(let o of e.moves.slice(0,Nt)){if(!o||typeof o!="object")continue;let i=o;if(!Kt.has(i.kind))continue;let h=Ut(i.data);n.push({frame:k(i.frame,0,1e12),t:k(i.t,0,1e7),kind:i.kind,...h?{data:h}:{}})}let c=a.range===8||a.range===16||a.range===50?a.range:50;return{version:1,kari:Ot(e.kari,64),startedAt:r,site:s(e.site),track:s(e.track),title:s(e.title),sampleRate:k(e.sampleRate,3e3,768e3,48e3),channels:Math.round(k(e.channels,1,32,2)),bits:e.bits===16?16:24,frames:k(e.frames,0,1e12),seconds:k(e.seconds,0,1e7),dropped:k(e.dropped,0,1e12),peak:k(e.peak,0,1e3),...typeof e.volume=="number"?{volume:k(e.volume,0,1),muted:e.muted===!0}:{},params:{st:k(a.st,-48,48),cents:k(a.cents,-100,100),tempo:k(a.tempo,-100,100),keyLock:a.keyLock===!0,range:c},moves:n}}function We(t,e=Blob){if(!t||typeof t!="object")return null;let a=t;if(!Ht(a.seq))return null;if(a.ok!==!0||!(a.wav instanceof e)||a.wav.size<44||a.wav.size>Dt)return{seq:a.seq,take:null};let r=qt(a.log);return{seq:a.seq,take:r?{wav:a.wav,log:r}:null}}function Qe(t){let e=(a,r)=>[...r].every((s,n)=>t[a+n]===s.charCodeAt(0));return t.length>=12&&e(0,"RIFF")&&e(8,"WAVE")}function Ze(t){let e=t&&typeof t=="object"?t:{},a=e.route===0||e.route===1?e.route:e.route==="late"?"late":null;return{attached:e.attached===!0,engine:Rt.has(e.engine)?e.engine:"bypass",engineLatencyMs:k(e.engineLatencyMs,0,5e3),outputLatencyMs:k(e.outputLatencyMs,0,5e3),avOffsetMs:k(e.avOffsetMs,0,1e4),underruns:k(e.underruns,0,1e9),load:k(e.load,0,10),fault:Ct.has(e.fault)?e.fault:null,baseRate:k(e.baseRate,.0625,16,1),loop:It(e.loop)?e.loop:0,loopMs:k(e.loopMs,0,Bt),loopClamped:e.loopClamped===!0,bpm:Ft(e.bpm)?e.bpm:null,gridSource:_t.has(e.gridSource)?e.gridSource:null,tempo:$t.has(e.tempo)?e.tempo:"idle",recording:e.recording===!0,recSeconds:k(e.recSeconds,0,1e6),recHeld:e.recHeld===!0,route:a,ctxState:typeof e.ctxState=="string"?e.ctxState.slice(0,16):""}}var Q=class{seq=0;pending=new Map;post;timeoutMs;constructor(e,a=2e3){this.post=e,this.timeoutMs=a}latch(e){let a=++this.seq;return new Promise(r=>{let s=setTimeout(()=>{this.pending.delete(a)&&r(!1)},this.timeoutMs);this.pending.set(a,{resolve:r,timer:s}),this.post({action:"latch",beats:e,seq:a})})}release(){this.post({action:"release"})}tap(){return this.post({action:"tap"}),null}setBpm(e){Number.isFinite(e)&&this.post({action:"bpm",bpm:e})}nudge(e){Number.isFinite(e)&&e!==0&&this.post({action:"nudge",delta:e})}clear(){this.post({action:"clear"})}ack(e,a){let r=this.pending.get(e);return r?(clearTimeout(r.timer),this.pending.delete(e),r.resolve(a),!0):!1}get inFlight(){return this.pending.size}};var Z=class{seq=0;starts=new Map;stops=new Map;post;startMs;stopMs;constructor(e,a=8e3,r=1e4){this.post=e,this.startMs=a,this.stopMs=r}start(e,a){let r=++this.seq;return new Promise(s=>{let n=setTimeout(()=>{this.starts.delete(r)&&s(!1)},this.startMs);this.starts.set(r,{resolve:s,timer:n}),this.post({action:"start",seq:r,track:e,title:a})})}stop(){let e=++this.seq;return new Promise(a=>{let r=setTimeout(()=>{this.stops.delete(e)&&a(null)},this.stopMs);this.stops.set(e,{resolve:a,timer:r}),this.post({action:"stop",seq:e})})}hide(e){this.post({action:"hide",on:e})}ack(e,a){let r=this.starts.get(e);return r?(clearTimeout(r.timer),this.starts.delete(e),r.resolve(a),!0):!1}take(e,a){let r=this.stops.get(e);return r?(clearTimeout(r.timer),this.stops.delete(e),r.resolve(a),!0):!1}get inFlight(){return this.starts.size+this.stops.size}},Je=t=>({wav:t.wav,bytes:t.wav.size,log:t.log,frames:t.log.frames,seconds:t.log.seconds,sampleRate:t.log.sampleRate,channels:t.log.channels,peak:t.log.peak,dropped:t.log.dropped,startedAt:t.log.startedAt});var va=60*60;var J=t=>String(t).padStart(2,"0");function zt(t){let e=new Date(t.startedAt),a=t.log.params,r=`${e.getFullYear()}-${J(e.getMonth()+1)}-${J(e.getDate())}-${J(e.getHours())}-${J(e.getMinutes())}`,s=(t.log.title||t.log.track||"take").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"take";return`kari-${r}-${s}-${a.st>=0?"+":""}${a.st}st-${(1+a.tempo/100).toFixed(2)}x`}function et(t,e=zt(t)){let a=(r,s)=>{let n=URL.createObjectURL(r),c=document.createElement("a");c.href=n,c.download=s,c.rel="noopener",c.style.display="none",document.body.appendChild(c),c.click(),c.remove(),setTimeout(()=>URL.revokeObjectURL(n),6e4)};a(t.wav,`${e}.wav`),a(new Blob([JSON.stringify(t.log,null,2)],{type:"application/json"}),`${e}.moves.json`)}var at=["loop-h","loop-1","loop-bar","loop-2bar","tap"],Gt={"loop-h":36,"loop-1":37,"loop-bar":38,"loop-2bar":39,tap:40};function tt(t){let e={...Gt};if(t&&typeof t=="object")for(let a of at){let r=t[a];typeof r=="number"&&Number.isInteger(r)&&r>=0&&r<=127&&(e[a]=r)}return e}var ee=class{access=null;map;_state={supported:typeof navigator<"u"&&"requestMIDIAccess"in navigator,connected:!1,inputs:0,learning:null,lastNote:null,error:null};onAction;onMap;onState;constructor(e,a,r,s){this.onAction=a,this.onMap=r,this.onState=s,this.map=tt(e)}get state(){return this._state}get mapping(){return this.map}noteFor(e){return this.map[e]}set(e){this._state={...this._state,...e},this.onState(this._state)}async connect(){if(!this._state.supported)return this.set({error:"no Web MIDI in this browser"}),!1;if(this.access)return!0;try{let e=await navigator.requestMIDIAccess({sysex:!1});this.access=e;let a=()=>{let r=0;e.inputs.forEach(s=>{s.onmidimessage=this.onMessage,r++}),this.set({connected:r>0,inputs:r,error:r?null:"no MIDI inputs"})};return e.onstatechange=a,a(),this._state.connected}catch(e){return this.set({error:String(e?.message||e),connected:!1}),!1}}learn(e){this.set({learning:e})}setMap(e){this.map=tt(e)}onMessage=e=>{let a=e.data;if(!a||a.length<3)return;let r=a[0]&240,s=a[1],n=a[2];if(!(r!==144||n===0)){if(this.set({lastNote:s}),this._state.learning){let c=this._state.learning;this.map={...this.map,[c]:s},this.onMap(this.map),this.set({learning:null});return}for(let c of at)if(this.map[c]===s){this.onAction(c);return}}}};var Yt=new Set(["discover","search","you","stream","charts","upload","settings","pages","tags","people","notifications","messages","library","feed","mobile","terms-of-use","jobs","imprint","popular","explore","stations","sets","tracks","playlists","go","pro","signin","logout","login","connect","oauth","activity","dashboard","trending","genres","moods","premium","artist","creators","for","insights","legal","help","community-guidelines","undefined","null"]),jt=new Set(["sets","tracks","albums","reposts","likes","followers","following","popular-tracks","comments","playlists","spotlight","recommended","you","stats","insights","related","toptracks"]);function te(t,e="https://soundcloud.com"){if(!t||typeof t!="string")return null;let a;try{a=new URL(t,e)}catch{return null}if(!/(^|\.)soundcloud\.com$/i.test(a.hostname))return null;let r=a.pathname.split("/").filter(Boolean).map(c=>{try{return decodeURIComponent(c)}catch{return c}});if(r.length<2)return null;let s=r[0].toLowerCase(),n=r[1].toLowerCase();return Yt.has(s)||jt.has(n)||/^s-[a-z0-9]+$/.test(n)||!/^[a-z0-9][a-z0-9_.-]*$/.test(s)||!/^[a-z0-9][a-z0-9_.-]*$/.test(n)?null:`/${s}/${n}`}var me=t=>"sc:"+t;var Vt=".playControls",rt=".playControls__soundBadge .playbackSoundBadge__titleLink",I=()=>document.querySelector(Vt),ot=(t=I())=>!!t&&t.classList.contains("m-visible"),st=()=>{let t=document.querySelector(".playControls__play");return!!t&&[...t.classList].some(e=>/playing/.test(e))},Xt=".playControls__soundBadge .playbackSoundBadge__lightLink";function nt(){let t=document.querySelector(rt);if(!t)return null;let e=t.getAttribute("href")||t.href||null,a=te(e,location.origin);if(a)return a;let r=(e||"").split(/[?#]/)[0].split("/").filter(Boolean)[1];if(!r)return null;let s=document.querySelector(Xt),n=s&&(s.getAttribute("href")||"").split(/[?#]/)[0].split("/").filter(Boolean)[0]||null,c=n?te(`/${n}/${r}`,location.origin):null;if(c)return c;let o=te(location.pathname,location.origin);return o&&o.endsWith("/"+r.toLowerCase())?o:null}function it(){let t=document.querySelector(rt);if(!t)return null;let e=(t.getAttribute("title")||t.querySelector('[aria-hidden="true"]')?.textContent||t.textContent||"").replace(/^\s*Current track:\s*/i,"").trim();return e?e.slice(0,200):null}function be(t=2e4){return new Promise(e=>{let a=I();if(a)return e(a);let r=new MutationObserver(()=>{let n=I();n&&(r.disconnect(),clearTimeout(s),e(n))});r.observe(document.documentElement,{childList:!0,subtree:!0});let s=setTimeout(()=>{r.disconnect(),e(I())},t)})}function lt(t,e,a=80){let r=0,s=()=>{clearTimeout(r),r=window.setTimeout(e,a)},n=new MutationObserver(s);return n.observe(t,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["href","class","title"],characterData:!0}),()=>n.disconnect()}(()=>{if(globalThis.__kari?.site==="soundcloud"){console.debug("[kari] bridge already running on this page");return}let e=location.origin,a=Ve(),r,s={...A},n=null,c=null,o="",i=!1,h=!1,m=!1,f=!1,b={...je},d=0,g=0,v="",L=0,w=!1,E=null,U=[],M=l=>{U.push(`${new Date().toISOString().slice(11,23)} ${l}`),U.length>60&&U.shift()},S=(l,p)=>window.postMessage({ns:he,dir:"b2h",nonce:a,...l},e,p||[]),x=new Q(l=>S({type:"loop",...l})),$=new Z(l=>S({type:"record",...l})),ct=async()=>{let l=await $.stop();return!l||!l.log.frames?(M("take: nothing kept"),null):Qe(new Uint8Array(await l.wav.slice(0,12).arrayBuffer()))?(et(Je(l)),M(`take saved ${l.log.seconds} s`),l.log.seconds):(M("take refused: not a wav"),null)},dt={"loop-h":.5,"loop-1":1,"loop-bar":4,"loop-2bar":8};function pt(l){if(w)return;let p=dt[l];p?b.loop===p?x.release():x.latch(p).then(u=>{u&&n?.react(),n?.render()}):l==="tap"&&(x.tap(),n?.react()),n?.render()}async function B(l){s=l,!w&&(S({type:"apply",params:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range}}),r?.rememberPerVideo&&o&&(clearTimeout(g),g=window.setTimeout(()=>{let p=q(l)?null:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range},u=o+":"+(p?JSON.stringify(p):"");u!==v&&(v=u,Ye(me(o),p).then(()=>console.debug("[kari] saved",o,p?JSON.stringify(p):"cleared")))},400)))}let ge=0;async function ut(){let l=Date.now();if(!(l-ge<5e3)){ge=l;try{let p=await(await fetch(chrome.runtime.getURL("rubberband.wasm"))).arrayBuffer();S({type:"engine",workletUrl:chrome.runtime.getURL("worklet.js"),wasm:p},[p]),M("engine bytes sent")}catch(p){M("engine fetch failed "+String(p))}}}async function ht(){try{let l=await(await fetch(chrome.runtime.getURL("worklet.js"))).text();S({type:"worklet-source",source:l}),M("worklet source sent (blob fallback)")}catch(l){M("worklet source fetch failed "+String(l))}}function R(l){b=l,w&&l.loop&&x.release(),n?.setStatus(f&&!l.fault?{...l,fault:"late"}:l)}let ae=0;function ft(){clearInterval(ae),ae=window.setInterval(()=>{if(m||b.attached){clearInterval(ae),f&&(f=!1,R(b));return}let l=h&&st();l!==f&&(f=l,R(b),M(l?"late: player already running, reload needed":"late notice cleared"))},1e3)}async function re(l){let p=nt()||"";if(p===o)return;let u=!!o;o=p,u&&x.clear(),r=r||await W();let y=r.rememberPerVideo&&p?await Ge(me(p)):null;s=y?{...A,...y}:{...A,range:r.defaultRange,keyLock:r.keyLockDefault},v=p+":"+(y?JSON.stringify({st:s.st,cents:s.cents,tempo:s.tempo,keyLock:s.keyLock,range:s.range}):""),console.debug("[kari] track",p||"(none)",l,"memory:",y?JSON.stringify(y):"none"),n?.render(),await B(s)}function mt(){w||(w=!0,x.release(),$.hide(!0),S({type:"apply",params:{...A,range:s.range}}),M("hidden on soundcloud")),n?.destroy(),n=null}function ye(){!!r?.hideOnSoundCloud!==w&&F()}async function F(){let l=await be();if(!l)return;if(r=r||await W(),r.hideOnSoundCloud){mt();return}let p=w;if(w=!1,getComputedStyle(l).position==="static"&&(l.style.position="relative"),n&&!l.contains(n.hostEl)&&(n.destroy(),n=null),c||(c=new ee(r.midiMap,pt,u=>{ue({midiMap:u}).then(y=>{r=y})},u=>n?.setMidiState(u))),!n){n=new j(l,{getParams:()=>s,apply:y=>{B(y)},setCompare:y=>S({type:"compare",on:y}),settings:r,saveSettings:y=>{ue(y).then(oe=>{r=oe,n?.applySettings(oe),y.engine&&S({type:"engine-pref",pref:oe.engine}),ye()})},level:()=>d,optionsUrl:chrome.runtime.getURL("options.html"),site:"sc",mountStyle:"position:absolute;left:0;right:0;top:auto;bottom:100%;height:320px;visibility:visible;pointer-events:none;z-index:60",loop:{latch:y=>x.latch(y),release:()=>x.release(),tap:()=>x.tap(),setBpm:y=>x.setBpm(y),nudge:y=>x.nudge(y)},midi:c,record:{start:()=>w?Promise.resolve(!1):$.start(o,it()||""),stop:()=>ct()}}),n.setMidiState(c.state),R(b);let u=()=>n?.setBarHidden(!ot(l));u(),E!==l&&(E=l,lt(l,()=>{re("bar"),u(),n&&!l.contains(n.hostEl)&&F()})),S({type:"engine-pref",pref:r.engine}),setTimeout(()=>{i||R({...b,fault:"hook-missing"})},3e3)}await re("mount"),p&&await B(s),p&&$.hide(!1)}window.addEventListener("message",l=>{let p=Xe(l,window,e,"h2b",a);if(p){if(p.type==="record-ack"||p.type==="take"){if(p.type==="record-ack"){let u=fe(p);u&&$.ack(u.seq,u.ok)}else{let u=We(p);u&&$.take(u.seq,u.take)}return}switch(p.type){case"hello":{let u=Date.now();u-L>500&&(L=u,S({type:"init"}));return}case"ready":i=!0,h=p.late===!0,M(h?"hook ready (late)":"hook ready"),b.fault==="hook-missing"&&R({...b,fault:null}),h&&ft();return;case"need-engine":ut();return;case"need-worklet-source":ht();return;case"status":R(Ze(p.status));return;case"loop-ack":{let u=fe(p);u&&x.ack(u.seq,u.ok);return}case"level":d=typeof p.v=="number"&&Number.isFinite(p.v)?Math.min(1,Math.max(0,p.v)):0;return;case"event":{let u=p.ev;if(!u||typeof u!="object"||typeof u.type!="string")return;try{M(`event ${JSON.stringify(u).slice(0,160)}`)}catch{M("event (unserialisable)")}u.type==="media"&&(u.ev==="loadstart"||u.ev==="emptied")&&re(String(u.ev)),u.type==="source"&&(m=!0),(u.type==="source"||u.type==="media")&&(n||F());return}case"note":M(`hook note ${String(p.note).slice(0,120)} ${String(p.reason||"").slice(0,80)}`);return}}}),chrome.runtime.onMessage.addListener((l,p,u)=>{l?.type==="kari:ping"&&u({site:"soundcloud",dock:!!n,hookReady:i,late:h})}),chrome.runtime.onMessage.addListener(l=>{if(l?.type!=="kari:command"||!n)return;let u={"pitch-up":()=>_(s,1),"pitch-down":()=>_(s,-1),"tempo-up":()=>C(s,1),"tempo-down":()=>C(s,-1)}[l.command];u&&(B(u()),n.react(),n.render())}),globalThis.__kari={site:"soundcloud",get params(){return s},get status(){return b},get dock(){return n},get settings(){return r},get key(){return o},get hookReady(){return i},get late(){return h},get lateFault(){return f},get log(){return U.slice()},apply:l=>B(l),get midi(){return c},tap:()=>x.tap(),setBpm:l=>x.setBpm(l),latch:l=>x.latch(l),release:()=>x.release()},ze(l=>{r=l,n?.applySettings(l),S({type:"engine-pref",pref:l.engine}),c?.setMap(l.midiMap||{}),ye()}),S({type:"init"}),I()?F():be().then(l=>{l&&F()})})();})();
