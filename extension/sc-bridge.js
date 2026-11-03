"use strict";(()=>{var ft=`
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
.org .body{grid-column:2;width:96px;height:110px;position:relative;align-self:end}
.org .body svg{width:100%;height:100%;overflow:visible}
.org{--m1:#bff9ff;--m2:#3ed8ea;--m3:#0a5b6e;--mg:rgba(92,242,255,.6);--iris:#5cf2ff;--rim:rgba(255,255,255,.75)}
.org[data-kari="pink"]{--m1:#ffd6f3;--m2:#ff7ad9;--m3:#7a1f5c;--mg:rgba(255,122,217,.6);--iris:#ffa6e8}
.org[data-kari="black"]{--m1:#4b4b57;--m2:#1a1a22;--m3:#050507;--mg:rgba(210,210,235,.4);--iris:#f4f4ff;--rim:rgba(255,255,255,.9)}
.org .blob{fill:url(#kari-blobfill);stroke:var(--rim);stroke-width:1.6;paint-order:stroke;filter:url(#kari-goo) drop-shadow(0 0 12px var(--mg))}
.org .shine{fill:rgba(255,255,255,.55)}
.org .eye{fill:#03141a}
.org[data-kari="black"] .eye{fill:#0b0b10}
.org .iris{fill:var(--iris);filter:drop-shadow(0 0 4px var(--iris))}
.org .iris.lit{fill:#fff!important;filter:drop-shadow(0 0 8px #fff)!important}
.org .bubble{fill:rgba(160,255,255,.18);stroke:rgba(200,255,255,.7);stroke-width:1;opacity:0;transform-origin:118px 76px}
.org .bubble.go{animation:kari-bub 1600ms var(--ease-out) forwards}
@keyframes kari-bub{0%{opacity:0;transform:scale(.2)}15%{opacity:1}100%{opacity:0;transform:translate(26px,-70px) scale(1.4)}}
.org .acc{display:none}
.org[data-cap="1"] .acc.cap,.org[data-shades="1"] .acc.shades,.org[data-shoes="1"] .acc.shoes{display:block}
.org .beat{transform-origin:80px 100px;transition:transform 90ms ease-out}
.org[data-fault="1"] .blob{filter:url(#kari-goo) grayscale(.6) brightness(.7)}
.org[data-fault="1"] .lid.r{transform:scaleY(.15);transform-origin:98px 86px}
.org[data-fault="1"] .mouth{d:path("M70 116 q10 -6 20 0")}
.org .zz{font-family:var(--mono);font-size:10px;fill:var(--bone-2);opacity:0}
.org[data-fault="1"] .zz{opacity:1}
@media (prefers-reduced-motion:no-preference){
  .org .body{animation:kari-bob 6s ease-in-out infinite}
  @keyframes kari-bob{50%{transform:translateY(-5px) rotate(-2deg)}}
  .org .lid{animation:kari-blink 5s ease-in-out infinite;transform-origin:center}
  @keyframes kari-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
}
.org[data-fault="1"] .lid{animation:none}

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
.settings{position:absolute;right:12px;bottom:96px;width:min(250px,80%);max-height:70%;overflow:auto;background:rgba(7,7,11,.94);border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;gap:12px;box-shadow:0 20px 50px rgba(0,0,0,.6);backdrop-filter:blur(8px);pointer-events:auto}
.settings[hidden]{display:none!important}
.settings .sh{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--bone)}
.settings .x{width:24px;height:24px;color:var(--bone-2)}
.settings .sg{display:grid;gap:6px}
.settings .sg>b{font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}
.settings .row{display:flex;flex-wrap:wrap;gap:6px}
.settings .row.col{flex-direction:column;gap:2px}
.chip{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--bone-2);transition:color 150ms ease,border-color 150ms ease,background 150ms ease}
.chip[aria-pressed="true"]{color:var(--ink);background:var(--bone);border-color:var(--bone)}
.swatch{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;padding:5px 9px 5px 6px;border:1px solid var(--line);border-radius:999px;color:var(--bone-2)}
.swatch::before{content:"";width:14px;height:14px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c),inset 0 0 0 1px rgba(255,255,255,.35)}
.swatch[aria-pressed="true"]{border-color:var(--bone);color:var(--bone)}
.ul{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--bone);padding:5px 6px;border-radius:6px;cursor:pointer}
.ul input{accent-color:var(--cyan);width:14px;height:14px;margin:0;pointer-events:auto}
.settings .big{width:100%;text-align:center;padding:8px;border:1px solid var(--line);border-radius:8px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.settings .big.pri{background:var(--bone);color:var(--ink);border-color:var(--bone)}
.settings .showrow{display:none}
.root[data-collapsed="1"] .settings .showrow{display:flex}
.root[data-collapsed="1"] .settings .hiderow{display:none}
.settings .more{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);text-decoration:underline;justify-self:start;pointer-events:auto}
@media (prefers-reduced-motion:no-preference){
  .settings{animation:kari-setin 200ms var(--ease-out)}
  @keyframes kari-setin{from{opacity:0;transform:translateY(6px) scale(.97)}}
}
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
`;var at=a=>{let t=Math.max(0,Math.floor(Number.isFinite(a)?a:0));return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`};function bt(a,t,e=performance.now()){return a?.recording?`${at(a.recSeconds)}${a.recHeld?" \xB7 paused":""}`:t&&t.until>e?t.text:""}var re=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],gt={st:12,cents:50,tempoRanges:[8,16,50]},ot=(a,t,e)=>Math.min(e,Math.max(t,a));function rt(a,t,e=!0){let o=((a+t)%12+12)%12;return re[o]+(e?"m":"")}var yt=a=>(1+a/100).toFixed(2)+"\xD7",kt=(a,t=0)=>(a>0?"+":a<0?"\u2212":"")+Math.abs(a).toFixed(t);function _(a,t){return{...a,tempo:ot(+(a.tempo+t).toFixed(1),-a.range,a.range)}}function $(a,t){return{...a,st:ot(a.st+t,-gt.st,gt.st)}}function vt(a,t){return{...a,range:t,tempo:ot(a.tempo,-t,t)}}var N=a=>a.st===0&&a.cents===0&&a.tempo===0,T={st:0,cents:0,tempo:0,range:50,keyLock:!1};var xt=[.5,1,4,8];var wt=40,Mt=300;var I=a=>(Math.round(a*10)/10).toFixed(1).replace(/\.0$/,""),nt=a=>a===.5?"\xBD":a===1?"1":a===4?"1 bar":"2 bars",St=a=>a===.5?"Loop half a beat":a===1?"Loop one beat":a===4?"Loop one bar":"Loop two bars";var ne={off:"",idle:"play to learn",gesture:"click to learn",learning:"learning\u2026",none:"tap"};function Et(a,t){if(!t)return{state:"off",text:""};let e=a?.bpm??null;if(e)return{state:"found",text:`${I(e)} bpm`};let o=a?.tempo??"idle",s=o==="found"?"idle":o;return{state:s,text:ne[s]}}var Lt={yt:"hideOnYouTube",sc:"hideOnSoundCloud"},Tt={yt:"YouTube",sc:"SoundCloud"};var se={yt:{"drm-silent":"this video's audio is protected \u2014 Kari can't touch it","capture-failed":"couldn't reach the audio on this page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page so Kari can reach the player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload"},sc:{"drm-silent":"this track's audio is protected \u2014 speed only","capture-failed":"couldn't reach SoundCloud's player \u2014 reload the page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page once \u2014 Kari arrived after SoundCloud set up its player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload"}},ie={"0.5":"loop-h",1:"loop-1",4:"loop-bar",8:"loop-2bar",tap:"tap"},le=xt.map(a=>`<button class="pill loop" data-a="loop" data-v="${a}" aria-pressed="false" aria-label="${St(a)}" disabled>${nt(a)}</button>`).join(""),de='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',U=`
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00\xD7</span></b><span class="p ro">pitch <span data-b="st">0</span><span data-b="yt"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">\u2212</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">\u2212</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="loops">${le}<span class="tro ro" data-b="tempo" data-state="idle" aria-live="polite"></span></div>
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
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">\u2212</button><input class="bpm ro" type="number" min="${wt}" max="${Mt}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span><span>loop <em class="ro" data-b="loopinfo">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,ce=`
<svg viewBox="0 0 160 180" aria-hidden="true">
  <defs>
    <radialGradient id="kari-blobfill" cx="40%" cy="30%" r="80%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".95"/><stop offset=".5" style="stop-color:var(--m2)" stop-opacity=".6"/><stop offset="1" style="stop-color:var(--m3)" stop-opacity=".3"/></radialGradient>
    <filter id="kari-goo"><feGaussianBlur stdDeviation="2" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
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
</svg>`,pe=`
<div class="root" data-collapsed="0" data-small="0">
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${U}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls">${ce}</div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${U}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${U}</div>
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
    <div class="cons-ctl absorb">${U}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${de}</button>
  <aside class="settings" data-el="settings" hidden>
    <div class="sh"><span>Settings</span><button class="x" data-s="close" aria-label="Close">\u2715</button></div>
    <div class="sg"><b>Interface</b><div class="row">
      <button class="chip" data-skin="org">Organism</button><button class="chip" data-skin="void">Void Signal</button>
      <button class="chip" data-skin="weather">Alien Weather</button><button class="chip" data-skin="cons">Constellation</button></div></div>
    <div class="sg"><b>Kari</b><div class="row">
      <button class="swatch" data-kari="blue" style="--c:#5cf2ff">Blue</button><button class="swatch" data-kari="pink" style="--c:#ff7ad9">Pink</button><button class="swatch" data-kari="black" style="--c:#2a2a33">Black</button></div>
      <div class="row col">
        <label class="ul"><input type="checkbox" data-set="cap"> <span>YGG cap</span></label>
        <label class="ul"><input type="checkbox" data-set="shades"> <span>Thin black sunglasses</span></label>
        <label class="ul"><input type="checkbox" data-set="shoes"> <span>Chunky sneakers</span></label></div></div>
    <div class="sg" data-el="midisg"><b>MIDI</b><div class="row"><button class="chip" data-m="connect">Connect</button><button class="chip" data-m="learn" aria-pressed="false">Learn</button><span class="mst" data-el="midist">not connected</span></div>
      <span class="mst">learn: switch it on, click a loop length or Tap, then hit the pad \xB7 a pad on the lit length releases</span></div>
    <div class="row hiderow"><button class="big" data-a="hide">Hide dock \xB7 absorb into Kari</button></div>
    <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
    <div class="row col"><button class="big" data-a="hide-site" data-el="hidesite">Hide Kari on YouTube</button><span class="mst">back from Kari's toolbar icon or More settings</span></div>
    <a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a>
  </aside>
</div>`,H=330,F=200,q=120,K=52,Rt=8,_t=3e3,z=class{constructor(t,e){this.host=t;this.deps=e;let o=document.createElement("div");this.wrap=o,o.id="kari-dock",o.dataset.build="0.8.0+62af897a",o.style.cssText=e.mountStyle||"position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=o.attachShadow({mode:"open"});let s=document.createElement("style");s.textContent=ft,this.shadow.appendChild(s);let n=document.createElement("template");n.innerHTML=pe,this.shadow.appendChild(n.content.cloneNode(!0)),t.appendChild(o),this.root=this.shadow.querySelector(".root"),this.root.dataset.site=e.site||"yt",this.el("hidesite").textContent=`Hide Kari on ${Tt[e.site||"yt"]}`,this.seedStars(),this.wire(),this.applySettings(e.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=t=>this.shadow.querySelector(`[data-el="${t}"]`);$$=t=>Array.from(this.shadow.querySelectorAll(t));status=null;midiState=null;learnOn=!1;raf=0;visible=!0;consDrag=!1;ytHidden=!1;over=new Set;keptUntil=0;keptTimer=0;destroy(){cancelAnimationFrame(this.raf),clearTimeout(this.keptTimer),clearTimeout(this.noteTimer),this.host.querySelector("#kari-dock")?.remove()}takeNote=null;noteTimer=0;note(t){clearTimeout(this.noteTimer),this.takeNote=t?{text:t,until:performance.now()+4e3}:null,this.render(),t&&(this.noteTimer=window.setTimeout(()=>{this.takeNote=null,this.render()},4e3))}setStatus(t){this.status=t;let e=this.el("fault"),o=t.fault&&se[this.deps.site||"yt"][t.fault]||"";e.hidden=!o,e.textContent=o,this.shadow.querySelector(".org")?.setAttribute("data-fault",t.fault?"1":"0"),this.render()}setControlsHidden(t){this.ytHidden=t,this.syncHidden()}get kept(){return this.over.size>0||this.focusInside()||performance.now()<this.keptUntil}focusInside(){let t=this.shadow.activeElement;return!!t&&!t.matches(".anchor")}syncHidden(){let t=this.kept,e=this.ytHidden&&!t?"1":"0",o=t?"1":"0";this.root.dataset.hiddenWithControls!==e&&(this.root.dataset.hiddenWithControls=e),this.root.dataset.kept!==o&&(this.root.dataset.kept=o)}used(){this.keptUntil=performance.now()+_t,clearTimeout(this.keptTimer),this.keptTimer=window.setTimeout(()=>this.syncHidden(),_t+50),this.syncHidden()}setBarHidden(t){this.root.dataset.barHidden=t?"1":"0"}setMidiState(t){this.midiState=t;let e=t.learning;this.$$("[data-arm]").forEach(n=>{e||n.removeAttribute("data-arm")});let o=t.supported?t.error?t.error:t.connected?`${t.inputs} input${t.inputs===1?"":"s"}${t.lastNote!==null?` \xB7 note ${t.lastNote}`:""}${e?" \xB7 hit a pad":""}`:"not connected":"no Web MIDI here",s=this.el("midist");s&&s.textContent!==o&&(s.textContent=o),this.render()}setSmall(t){this.root.dataset.small=t?"1":"0"}applySettings(t){this.$$(".skin").forEach(o=>o.hidden=o.dataset.skin!==t.skin),this.$$(".chip[data-skin]").forEach(o=>o.setAttribute("aria-pressed",String(o.dataset.skin===t.skin)));let e=this.shadow.querySelector(".org");e.dataset.kari=t.kariColor,e.dataset.cap=t.cap?"1":"0",e.dataset.shades=t.shades?"1":"0",e.dataset.shoes=t.shoes?"1":"0",this.$$("[data-kari]").forEach(o=>o.setAttribute("aria-pressed",String(o.dataset.kari===t.kariColor))),this.$$("input[data-set]").forEach(o=>o.checked=!!t[o.dataset.set]),t.collapsed&&this.root.dataset.collapsed!=="1"&&(this.over.clear(),this.syncHidden()),this.root.dataset.collapsed=t.collapsed?"1":"0",this.$$(".ctl").forEach(o=>o.dataset.full=t.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(o=>o.setAttribute("aria-pressed",String(t.fullControl))),this.el("intro").hidden=t.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=t}react(){let t=this.el("bubble");t.classList.remove("go"),t.getBBox?.(),t.classList.add("go"),["i1","i2"].forEach(e=>{let o=this.el(e);o.classList.add("lit"),setTimeout(()=>o.classList.remove("lit"),700)})}render(){let t=this.deps.getParams(),e=this.status,o=e?.bpm??null,s=e?.loop??0,n=e?.baseRate&&Math.abs(e.baseRate-1)>.001?` \xB7 ${this.deps.site==="sc"?"sc":"yt"} ${e.baseRate.toFixed(2)}\xD7`:"",{state:c,text:r}=Et(e,!!this.deps.loop),i={speed:yt(t.tempo),st:kt(t.st),yt:n,bpm:o?`${I(o)} bpm`:"",tempo:r,keypair:`${rt(Rt,0)} \u2192 ${rt(Rt,t.st)}`,engine:e?e.engine==="r3"?"R3":e.engine==="ss"?"SS":"wire":"\u2014",av:e?e.attached?`${e.avOffsetMs} ms`:"0 ms":"\u2014",loopinfo:this.deps.loop?s?`${nt(s)} \xB7 ${e.loopMs} ms${e.loopClamped?" \xB7 at the ring's ceiling":""}`:o?"\u2014":"no tempo yet":"\u2014"};this.$$("[data-b]").forEach(d=>{let m=i[d.dataset.b];m!==void 0&&d.textContent!==m&&(d.textContent=m)});let h=this.shadow.querySelector(".loops");h&&(h.hidden=!this.deps.loop),this.$$('[data-b="tempo"]').forEach(d=>{d.dataset.state!==c&&(d.dataset.state=c)});{let d=this.shadow.querySelector(".take");d&&(d.hidden=!this.deps.record);let m=bt(e,this.takeNote);this.$$('[data-b="take"]').forEach(v=>{v.textContent!==m&&(v.textContent=m)}),this.$$('[data-a="rec"]').forEach(v=>{let S=!!e?.recording,E=S&&!!e.recHeld;v.setAttribute("aria-pressed",String(S)),v.dataset.held!==(E?"1":"0")&&(v.dataset.held=E?"1":"0");let x=S?"Stop and save the take":"Record a take";v.getAttribute("aria-label")!==x&&v.setAttribute("aria-label",x)})}let g=this.shadow.querySelector('[data-el="midisg"]');g&&(g.hidden=!this.deps.midi),this.$$('[data-a="loop"]').forEach(d=>{let m=s>0&&+d.dataset.v===s;d.setAttribute("aria-pressed",String(m)),d.disabled=!o,m&&d.style.setProperty("--loop-ms",`${e.loopMs}ms`)}),this.$$('[data-a="bpm-"],[data-a="bpm+"]').forEach(d=>{d.disabled=!o}),this.$$('input[data-a="bpm"]').forEach(d=>{if(this.shadow.activeElement===d)return;let m=o?I(o):"";d.value!==m&&(d.value=m)});let f=this.midiState;this.$$('[data-a="midi"]').forEach(d=>{d.setAttribute("aria-pressed",String(!!f?.connected))}),this.$$('[data-m="learn"]').forEach(d=>d.setAttribute("aria-pressed",String(this.learnOn))),this.$$('[data-b="av"]').forEach(d=>d.classList.toggle("warn",!!e&&e.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(d=>{d.min=String(-t.range),d.max=String(t.range),+d.value!==t.tempo&&(d.value=String(t.tempo))}),this.$$('[data-a="lock"]').forEach(d=>d.setAttribute("aria-pressed",String(t.keyLock))),this.$$('[data-a="vinyl"]').forEach(d=>d.setAttribute("aria-pressed",String(!t.keyLock))),this.$$('[data-a="range"]').forEach(d=>d.setAttribute("aria-pressed",String(+d.dataset.v===t.range))),this.shadow.querySelector(".void").dataset.off=N(t)?"1":"0",this.renderCons(t)}wire(){let t=this.shadow;t.addEventListener("click",r=>{let i=r.target.closest("[data-a]");if(!i)return;let h=i.dataset.a,g=this.deps.getParams(),f=d=>{this.deps.apply(d),this.react(),this.render()};switch(h){case"st+":f($(g,1));break;case"st-":f($(g,-1));break;case"tempo+":f(_(g,1));break;case"tempo-":f(_(g,-1));break;case"lock":f({...g,keyLock:!0});break;case"vinyl":f({...g,keyLock:!1});break;case"reset":f({...T,range:g.range,keyLock:g.keyLock});break;case"range":f(vt(g,+i.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break;case"hide-site":this.deps.saveSettings({[Lt[this.deps.site||"yt"]]:!0});break;case"rec":{let d=this.deps.record;if(!d)break;this.status?.recording?d.stop().then(m=>this.note(m===null?"nothing recorded":`saved ${at(m)}`)):d.start().then(m=>{m?this.render():this.note("nothing to record")}),this.react(),this.render()}break;case"loop":case"tap":{let d=h==="loop"?i.dataset.v:"tap";if(this.learnOn&&this.midiState?.connected){this.$$("[data-arm]").forEach(m=>m.removeAttribute("data-arm")),i.dataset.arm="1",this.deps.midi?.learn(ie[d]);break}if(h==="loop"){let m=+i.dataset.v;(this.status?.loop??0)===m?this.deps.loop?.release():this.deps.loop?.latch(m)?.then(v=>{v&&this.react(),this.render()})}else this.deps.loop?.tap(),this.react();this.render();break}case"bpm-":this.deps.loop?.nudge(-1),this.render();break;case"bpm+":this.deps.loop?.nudge(1),this.render();break;case"midi":this.deps.midi?.connect()?.then(()=>this.render());break}}),t.addEventListener("click",r=>{let i=r.target.closest("[data-m]");i&&(i.dataset.m==="connect"&&this.deps.midi?.connect()?.then(()=>this.render()),i.dataset.m==="learn"&&(this.learnOn=!this.learnOn,this.learnOn||(this.deps.midi?.learn(null),this.$$("[data-arm]").forEach(h=>h.removeAttribute("data-arm"))),this.render()))});let e=r=>{let i=r.target;return i.matches('input[type="number"]')?!0:i.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(r.key):i.matches('button, [role="button"], input[type="checkbox"], a')?r.key==="Enter"||r.key===" ":!1};t.addEventListener("keydown",r=>{let i=r,h=i.target.closest('[role="button"][data-a]');h&&(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),h.click()),i.target.matches('input[data-a="bpm"]')&&(i.key==="Enter"||i.key==="Escape")&&(i.preventDefault(),i.target.blur()),e(i)&&i.stopPropagation()}),t.addEventListener("keyup",r=>{e(r)&&r.stopPropagation()}),t.addEventListener("mousedown",r=>{r.target.closest('button, [role="button"]')&&r.preventDefault()}),t.addEventListener("input",r=>{let i=r.target;if(i.matches('input[data-a="tempo"]')){let h=this.deps.getParams();this.deps.apply({...h,tempo:+i.value}),this.render()}}),t.addEventListener("change",r=>{let i=r.target;if(i.matches('input[data-a="tempo"]')&&this.react(),i.matches('input[data-a="bpm"]')){let h=parseFloat(i.value);Number.isFinite(h)&&(this.deps.loop?.setBpm(h),this.react()),this.render()}i.dataset.set&&this.deps.saveSettings({[i.dataset.set]:i.checked})}),t.addEventListener("pointerdown",r=>{let i=r.target.closest('[data-a="compare"]');i&&(this.hold(!0),i.setPointerCapture?.(r.pointerId))}),["pointerup","pointercancel"].forEach(r=>t.addEventListener(r,()=>{this.holding&&this.hold(!1)})),t.addEventListener("keydown",r=>{let i=r;i.target.closest('[data-a="compare"]')&&i.key===" "&&!i.repeat&&(i.preventDefault(),this.hold(!0))}),t.addEventListener("keyup",r=>{let i=r;i.target.closest('[data-a="compare"]')&&i.key===" "&&(i.preventDefault(),this.hold(!1))});let o=this.el("gear"),s=this.el("settings");o.addEventListener("click",()=>{let r=s.hidden;s.hidden=!r,o.setAttribute("aria-expanded",String(r))}),s.addEventListener("click",r=>{r.target.closest('[data-s="close"]')&&(s.hidden=!0,o.setAttribute("aria-expanded","false"))}),this.$$("[data-skin].chip").forEach(r=>r.addEventListener("click",()=>this.deps.saveSettings({skin:r.dataset.skin}))),this.$$("[data-kari]").forEach(r=>r.addEventListener("click",()=>{this.deps.saveSettings({kariColor:r.dataset.kari}),this.react()}));let n=this.el("consSvg"),c=r=>{let i=n.getBoundingClientRect(),h=(r.clientX-i.left)/i.width*640,g=(r.clientY-i.top)/i.height*360,f=Math.atan2((h-H)/q,-(g-F)/K);return Math.max(-12,Math.min(12,Math.round(f/Math.PI*12)))};n.addEventListener("pointerdown",r=>{if(!this.deps.settings.collapsed&&r.target.closest(".hit,.moon")){this.consDrag=!0,n.setPointerCapture(r.pointerId);let i=c(r),h=this.deps.getParams();i!==h.st&&(this.deps.apply({...h,st:i}),this.render())}}),n.addEventListener("pointermove",r=>{if(!this.consDrag)return;let i=c(r),h=this.deps.getParams();i!==h.st&&(this.deps.apply({...h,st:i}),this.render())}),["pointerup","pointercancel"].forEach(r=>n.addEventListener(r,()=>{this.consDrag&&(this.consDrag=!1,this.react())}));for(let r of this.$$(".absorb, .gear, .settings, .intro, .fault"))r.addEventListener("pointerenter",()=>{this.over.add(r),this.syncHidden()}),r.addEventListener("pointerleave",()=>{this.over.delete(r),this.syncHidden()});t.addEventListener("focusin",()=>this.syncHidden()),t.addEventListener("focusout",()=>{setTimeout(()=>this.syncHidden(),0)}),["pointerdown","click","input","keydown"].forEach(r=>t.addEventListener(r,i=>{i.isTrusted&&this.used()})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(r=>this.wrap.addEventListener(r,i=>i.stopPropagation()))}holding=!1;hold(t){this.holding=t,this.deps.setCompare(t),this.$$('[data-a="compare"]').forEach(e=>e.dataset.held=t?"1":"0")}startPulse(){let t=0,e=0,o=s=>{if(this.raf=requestAnimationFrame(o),document.hidden||s-t<33||(t=s,!!this.shadow.querySelector('.skin[data-skin="org"]').hidden))return;let c=this.deps.level();e=Math.max(c,e*.85);let r=1+Math.min(.08,e*.35),i=1-Math.min(.06,e*.25);this.el("beat").style.transform=`scale(${r.toFixed(3)},${i.toFixed(3)})`};this.raf=requestAnimationFrame(o)}seedStars(){let t=this.el("starfield"),e="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((n,c)=>{let r=c%3===0?9:6;e+=`<path class="star" transform="translate(${n[0]} ${n[1]})" d="M0 -${r} L${r*.3} -${r*.3} L${r} 0 L${r*.3} ${r*.3} L0 ${r} L-${r*.3} ${r*.3} L-${r} 0 L-${r*.3} -${r*.3}Z"/>`}),t.innerHTML=e;let s="";for(let n=-12;n<=12;n+=3){let c=n/12*Math.PI;s+=`<line class="tick" x1="${(H+Math.sin(c)*(q+4)).toFixed(1)}" y1="${(F-Math.cos(c)*(K+4)).toFixed(1)}" x2="${(H+Math.sin(c)*(q-4)).toFixed(1)}" y2="${(F-Math.cos(c)*(K-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=s}renderCons(t){let e=t.st/12*Math.PI,o=H+Math.sin(e)*q,s=F-Math.cos(e)*K,n=this.el("moon"),c=this.el("ray");n.setAttribute("cx",o.toFixed(1)),n.setAttribute("cy",s.toFixed(1)),c.setAttribute("x2",o.toFixed(1)),c.setAttribute("y2",s.toFixed(1));let r=this.$$(".star");r.forEach(L=>L.classList.remove("lit")),r.length&&r[(t.st%r.length+r.length)%r.length].classList.add("lit");let i=this.el("tempoArc"),h=170,g=Math.max(-50,Math.min(50,t.tempo))/50,f=Math.PI*.62,d=f+g*.45,m=L=>[H+Math.cos(L)*h,F+Math.sin(L)*h*.55],[v,S]=m(f),[E,x]=m(d);i.setAttribute("d",`M${v.toFixed(1)} ${S.toFixed(1)} A${h} ${(h*.55).toFixed(1)} 0 0 ${g>=0?1:0} ${E.toFixed(1)} ${x.toFixed(1)}`)}};var st={skin:"org",kariColor:"blue",cap:!1,shades:!1,shoes:!1,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1,hideOnYouTube:!1,hideOnSoundCloud:!1},O="kari.settings",it="kari.video.";function $t(a){let t={};try{let e=globalThis.chrome?.storage?.[a];if(e)return{get:o=>e.get(o),set:o=>e.set(o),remove:o=>e.remove(o)}}catch{}return{async get(e){let o=Array.isArray(e)?e:[e],s={};for(let n of o)n in t&&(s[n]=t[n]);return s},async set(e){Object.assign(t,e)},async remove(e){delete t[e]}}}var G=$t("sync"),V=$t("local");async function Y(){try{let a=await G.get(O);return{...st,...a[O]||{}}}catch{return{...st}}}async function lt(a){let e={...await Y(),...a};try{await G.set({[O]:e})}catch{}return e}function Pt(a){try{globalThis.chrome?.storage?.onChanged?.addListener((t,e)=>{e==="sync"&&t[O]&&a({...st,...t[O].newValue})})}catch{}}async function Ct(a){let t=it+a;try{let e=await V.get(t);if(e[t])return e[t];let s=(await G.get(t))[t]||null;if(s)try{await V.set({[t]:s}),await G.remove(t)}catch{}return s}catch{return null}}async function Bt(a,t){try{t?await V.set({[it+a]:t}):await V.remove(it+a)}catch{}}var dt="kari-sc",It={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1,loop:0,loopMs:0,loopClamped:!1,bpm:null,gridSource:null,tempo:"idle",recording:!1,recSeconds:0,recHeld:!1,route:null,ctxState:""},ue=new Set(["off","idle","gesture","learning","found","none"]);function Ht(){let a=new Uint8Array(16),t=globalThis.crypto;if(t?.getRandomValues)t.getRandomValues(a);else for(let e=0;e<a.length;e++)a[e]=Math.random()*256|0;return Array.from(a,e=>e.toString(16).padStart(2,"0")).join("")}function Ft(a,t,e,o,s){if(a.source!==t||a.origin!==e)return null;let n=a.data;return!n||typeof n!="object"||n.ns!==dt||n.dir!==o||typeof n.type!="string"?null:n.type==="hello"||n.type==="init"?n:!s||n.nonce!==s?null:n}var he=new Set(["r3","ss","bypass"]),me=new Set([null,"drm-silent","capture-failed","worklet-failed","hook-missing","late","duplicate"]),fe=new Set(["tap","manual","auto"]),be=[.5,1,4,8],y=(a,t,e,o=0)=>typeof a=="number"&&Number.isFinite(a)?Math.min(e,Math.max(t,a)):o,ge=a=>typeof a=="number"&&be.includes(a);var ye=6e4,ke=a=>typeof a=="number"&&Number.isFinite(a)&&a>=1&&a<=1e3;function ct(a){if(!a||typeof a!="object")return null;let t=a;return typeof t.seq=="number"&&Number.isInteger(t.seq)?{seq:t.seq,ok:t.ok===!0}:null}var ve=a=>typeof a=="number"&&Number.isInteger(a)&&a>=0,xe=(a,t)=>typeof a=="string"?a.slice(0,t):"";var we=4294967295,Me=new Set(["start","params","loop","seek","hold","resume","volume","stop"]),Se=1e5;function Ee(a){if(!a||typeof a!="object"||Array.isArray(a))return;let t={};for(let[e,o]of Object.entries(a).slice(0,16))e.length>32||(typeof o=="number"?Number.isFinite(o)&&(t[e]=o):typeof o=="boolean"?t[e]=o:typeof o=="string"&&(t[e]=o.slice(0,64)));return t}function Le(a){if(!a||typeof a!="object")return null;let t=a,e=t.params&&typeof t.params=="object"?t.params:{};if(!Array.isArray(t.moves)||typeof t.sampleRate!="number"||!Number.isFinite(t.sampleRate))return null;let o=typeof t.startedAt=="string"&&Number.isFinite(Date.parse(t.startedAt))?new Date(Date.parse(t.startedAt)).toISOString():new Date().toISOString(),s=r=>typeof r=="string"&&r?r.slice(0,200):void 0,n=[];for(let r of t.moves.slice(0,Se)){if(!r||typeof r!="object")continue;let i=r;if(!Me.has(i.kind))continue;let h=Ee(i.data);n.push({frame:y(i.frame,0,1e12),t:y(i.t,0,1e7),kind:i.kind,...h?{data:h}:{}})}let c=e.range===8||e.range===16||e.range===50?e.range:50;return{version:1,kari:xe(t.kari,64),startedAt:o,site:s(t.site),track:s(t.track),title:s(t.title),sampleRate:y(t.sampleRate,3e3,768e3,48e3),channels:Math.round(y(t.channels,1,32,2)),bits:t.bits===16?16:24,frames:y(t.frames,0,1e12),seconds:y(t.seconds,0,1e7),dropped:y(t.dropped,0,1e12),peak:y(t.peak,0,1e3),...typeof t.volume=="number"?{volume:y(t.volume,0,1),muted:t.muted===!0}:{},params:{st:y(e.st,-48,48),cents:y(e.cents,-100,100),tempo:y(e.tempo,-100,100),keyLock:e.keyLock===!0,range:c},moves:n}}function Ot(a,t=Blob){if(!a||typeof a!="object")return null;let e=a;if(!ve(e.seq))return null;if(e.ok!==!0||!(e.wav instanceof t)||e.wav.size<44||e.wav.size>we)return{seq:e.seq,take:null};let o=Le(e.log);return{seq:e.seq,take:o?{wav:e.wav,log:o}:null}}function Dt(a){let t=(e,o)=>[...o].every((s,n)=>a[e+n]===s.charCodeAt(0));return a.length>=12&&t(0,"RIFF")&&t(8,"WAVE")}function Nt(a){let t=a&&typeof a=="object"?a:{},e=t.route===0||t.route===1?t.route:t.route==="late"?"late":null;return{attached:t.attached===!0,engine:he.has(t.engine)?t.engine:"bypass",engineLatencyMs:y(t.engineLatencyMs,0,5e3),outputLatencyMs:y(t.outputLatencyMs,0,5e3),avOffsetMs:y(t.avOffsetMs,0,1e4),underruns:y(t.underruns,0,1e9),load:y(t.load,0,10),fault:me.has(t.fault)?t.fault:null,baseRate:y(t.baseRate,.0625,16,1),loop:ge(t.loop)?t.loop:0,loopMs:y(t.loopMs,0,ye),loopClamped:t.loopClamped===!0,bpm:ke(t.bpm)?t.bpm:null,gridSource:fe.has(t.gridSource)?t.gridSource:null,tempo:ue.has(t.tempo)?t.tempo:"idle",recording:t.recording===!0,recSeconds:y(t.recSeconds,0,1e6),recHeld:t.recHeld===!0,route:e,ctxState:typeof t.ctxState=="string"?t.ctxState.slice(0,16):""}}var j=class{seq=0;pending=new Map;post;timeoutMs;constructor(t,e=2e3){this.post=t,this.timeoutMs=e}latch(t){let e=++this.seq;return new Promise(o=>{let s=setTimeout(()=>{this.pending.delete(e)&&o(!1)},this.timeoutMs);this.pending.set(e,{resolve:o,timer:s}),this.post({action:"latch",beats:t,seq:e})})}release(){this.post({action:"release"})}tap(){return this.post({action:"tap"}),null}setBpm(t){Number.isFinite(t)&&this.post({action:"bpm",bpm:t})}nudge(t){Number.isFinite(t)&&t!==0&&this.post({action:"nudge",delta:t})}clear(){this.post({action:"clear"})}ack(t,e){let o=this.pending.get(t);return o?(clearTimeout(o.timer),this.pending.delete(t),o.resolve(e),!0):!1}get inFlight(){return this.pending.size}};var W=class{seq=0;starts=new Map;stops=new Map;post;startMs;stopMs;constructor(t,e=8e3,o=1e4){this.post=t,this.startMs=e,this.stopMs=o}start(t,e){let o=++this.seq;return new Promise(s=>{let n=setTimeout(()=>{this.starts.delete(o)&&s(!1)},this.startMs);this.starts.set(o,{resolve:s,timer:n}),this.post({action:"start",seq:o,track:t,title:e})})}stop(){let t=++this.seq;return new Promise(e=>{let o=setTimeout(()=>{this.stops.delete(t)&&e(null)},this.stopMs);this.stops.set(t,{resolve:e,timer:o}),this.post({action:"stop",seq:t})})}hide(t){this.post({action:"hide",on:t})}ack(t,e){let o=this.starts.get(t);return o?(clearTimeout(o.timer),this.starts.delete(t),o.resolve(e),!0):!1}take(t,e){let o=this.stops.get(t);return o?(clearTimeout(o.timer),this.stops.delete(t),o.resolve(e),!0):!1}get inFlight(){return this.starts.size+this.stops.size}},Ut=a=>({wav:a.wav,bytes:a.wav.size,log:a.log,frames:a.log.frames,seconds:a.log.seconds,sampleRate:a.log.sampleRate,channels:a.log.channels,peak:a.log.peak,dropped:a.log.dropped,startedAt:a.log.startedAt});var aa=60*60;var X=a=>String(a).padStart(2,"0");function Te(a){let t=new Date(a.startedAt),e=a.log.params,o=`${t.getFullYear()}-${X(t.getMonth()+1)}-${X(t.getDate())}-${X(t.getHours())}-${X(t.getMinutes())}`,s=(a.log.title||a.log.track||"take").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"take";return`kari-${o}-${s}-${e.st>=0?"+":""}${e.st}st-${(1+e.tempo/100).toFixed(2)}x`}function qt(a,t=Te(a)){let e=(o,s)=>{let n=URL.createObjectURL(o),c=document.createElement("a");c.href=n,c.download=s,c.rel="noopener",c.style.display="none",document.body.appendChild(c),c.click(),c.remove(),setTimeout(()=>URL.revokeObjectURL(n),6e4)};e(a.wav,`${t}.wav`),e(new Blob([JSON.stringify(a.log,null,2)],{type:"application/json"}),`${t}.moves.json`)}var zt=["loop-h","loop-1","loop-bar","loop-2bar","tap"],Ae={"loop-h":36,"loop-1":37,"loop-bar":38,"loop-2bar":39,tap:40};function Kt(a){let t={...Ae};if(a&&typeof a=="object")for(let e of zt){let o=a[e];typeof o=="number"&&Number.isInteger(o)&&o>=0&&o<=127&&(t[e]=o)}return t}var J=class{access=null;map;_state={supported:typeof navigator<"u"&&"requestMIDIAccess"in navigator,connected:!1,inputs:0,learning:null,lastNote:null,error:null};onAction;onMap;onState;constructor(t,e,o,s){this.onAction=e,this.onMap=o,this.onState=s,this.map=Kt(t)}get state(){return this._state}get mapping(){return this.map}noteFor(t){return this.map[t]}set(t){this._state={...this._state,...t},this.onState(this._state)}async connect(){if(!this._state.supported)return this.set({error:"no Web MIDI in this browser"}),!1;if(this.access)return!0;try{let t=await navigator.requestMIDIAccess({sysex:!1});this.access=t;let e=()=>{let o=0;t.inputs.forEach(s=>{s.onmidimessage=this.onMessage,o++}),this.set({connected:o>0,inputs:o,error:o?null:"no MIDI inputs"})};return t.onstatechange=e,e(),this._state.connected}catch(t){return this.set({error:String(t?.message||t),connected:!1}),!1}}learn(t){this.set({learning:t})}setMap(t){this.map=Kt(t)}onMessage=t=>{let e=t.data;if(!e||e.length<3)return;let o=e[0]&240,s=e[1],n=e[2];if(!(o!==144||n===0)){if(this.set({lastNote:s}),this._state.learning){let c=this._state.learning;this.map={...this.map,[c]:s},this.onMap(this.map),this.set({learning:null});return}for(let c of zt)if(this.map[c]===s){this.onAction(c);return}}}};var Re=new Set(["discover","search","you","stream","charts","upload","settings","pages","tags","people","notifications","messages","library","feed","mobile","terms-of-use","jobs","imprint","popular","explore","stations","sets","tracks","playlists","go","pro","signin","logout","login","connect","oauth","activity","dashboard","trending","genres","moods","premium","artist","creators","for","insights","legal","help","community-guidelines","undefined","null"]),_e=new Set(["sets","tracks","albums","reposts","likes","followers","following","popular-tracks","comments","playlists","spotlight","recommended","you","stats","insights","related","toptracks"]);function Z(a,t="https://soundcloud.com"){if(!a||typeof a!="string")return null;let e;try{e=new URL(a,t)}catch{return null}if(!/(^|\.)soundcloud\.com$/i.test(e.hostname))return null;let o=e.pathname.split("/").filter(Boolean).map(c=>{try{return decodeURIComponent(c)}catch{return c}});if(o.length<2)return null;let s=o[0].toLowerCase(),n=o[1].toLowerCase();return Re.has(s)||_e.has(n)||/^s-[a-z0-9]+$/.test(n)||!/^[a-z0-9][a-z0-9_.-]*$/.test(s)||!/^[a-z0-9][a-z0-9_.-]*$/.test(n)?null:`/${s}/${n}`}var pt=a=>"sc:"+a;var $e=".playControls",Gt=".playControls__soundBadge .playbackSoundBadge__titleLink",P=()=>document.querySelector($e),Vt=(a=P())=>!!a&&a.classList.contains("m-visible"),Yt=()=>{let a=document.querySelector(".playControls__play");return!!a&&[...a.classList].some(t=>/playing/.test(t))},Pe=".playControls__soundBadge .playbackSoundBadge__lightLink";function jt(){let a=document.querySelector(Gt);if(!a)return null;let t=a.getAttribute("href")||a.href||null,e=Z(t,location.origin);if(e)return e;let o=(t||"").split(/[?#]/)[0].split("/").filter(Boolean)[1];if(!o)return null;let s=document.querySelector(Pe),n=s&&(s.getAttribute("href")||"").split(/[?#]/)[0].split("/").filter(Boolean)[0]||null,c=n?Z(`/${n}/${o}`,location.origin):null;if(c)return c;let r=Z(location.pathname,location.origin);return r&&r.endsWith("/"+o.toLowerCase())?r:null}function Wt(){let a=document.querySelector(Gt);if(!a)return null;let t=(a.getAttribute("title")||a.querySelector('[aria-hidden="true"]')?.textContent||a.textContent||"").replace(/^\s*Current track:\s*/i,"").trim();return t?t.slice(0,200):null}function ut(a=2e4){return new Promise(t=>{let e=P();if(e)return t(e);let o=new MutationObserver(()=>{let n=P();n&&(o.disconnect(),clearTimeout(s),t(n))});o.observe(document.documentElement,{childList:!0,subtree:!0});let s=setTimeout(()=>{o.disconnect(),t(P())},a)})}function Xt(a,t,e=80){let o=0,s=()=>{clearTimeout(o),o=window.setTimeout(t,e)},n=new MutationObserver(s);return n.observe(a,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["href","class","title"],characterData:!0}),()=>n.disconnect()}(()=>{if(globalThis.__kari?.site==="soundcloud"){console.debug("[kari] bridge already running on this page");return}let t=location.origin,e=Ht(),o,s={...T},n=null,c=null,r="",i=!1,h=!1,g=!1,f=!1,d={...It},m=0,v=0,S="",E=0,x=!1,L=null,D=[],w=l=>{D.push(`${new Date().toISOString().slice(11,23)} ${l}`),D.length>60&&D.shift()},M=(l,p)=>window.postMessage({ns:dt,dir:"b2h",nonce:e,...l},t,p||[]),k=new j(l=>M({type:"loop",...l})),A=new W(l=>M({type:"record",...l})),Jt=async()=>{let l=await A.stop();return!l||!l.log.frames?(w("take: nothing kept"),null):Dt(new Uint8Array(await l.wav.slice(0,12).arrayBuffer()))?(qt(Ut(l)),w(`take saved ${l.log.seconds} s`),l.log.seconds):(w("take refused: not a wav"),null)},Zt={"loop-h":.5,"loop-1":1,"loop-bar":4,"loop-2bar":8};function Qt(l){if(x)return;let p=Zt[l];p?d.loop===p?k.release():k.latch(p).then(u=>{u&&n?.react(),n?.render()}):l==="tap"&&(k.tap(),n?.react()),n?.render()}async function C(l){s=l,!x&&(M({type:"apply",params:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range}}),o?.rememberPerVideo&&r&&(clearTimeout(v),v=window.setTimeout(()=>{let p=N(l)?null:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range},u=r+":"+(p?JSON.stringify(p):"");u!==S&&(S=u,Bt(pt(r),p).then(()=>console.debug("[kari] saved",r,p?JSON.stringify(p):"cleared")))},400)))}let ht=0;async function te(){let l=Date.now();if(!(l-ht<5e3)){ht=l;try{let p=await(await fetch(chrome.runtime.getURL("rubberband.wasm"))).arrayBuffer();M({type:"engine",workletUrl:chrome.runtime.getURL("worklet.js"),wasm:p},[p]),w("engine bytes sent")}catch(p){w("engine fetch failed "+String(p))}}}async function ee(){try{let l=await(await fetch(chrome.runtime.getURL("worklet.js"))).text();M({type:"worklet-source",source:l}),w("worklet source sent (blob fallback)")}catch(l){w("worklet source fetch failed "+String(l))}}function R(l){d=l,x&&l.loop&&k.release(),n?.setStatus(f&&!l.fault?{...l,fault:"late"}:l)}let Q=0;function ae(){clearInterval(Q),Q=window.setInterval(()=>{if(g||d.attached){clearInterval(Q),f&&(f=!1,R(d));return}let l=h&&Yt();l!==f&&(f=l,R(d),w(l?"late: player already running, reload needed":"late notice cleared"))},1e3)}async function tt(l){let p=jt()||"";if(p===r)return;let u=!!r;r=p,u&&k.clear(),o=o||await Y();let b=o.rememberPerVideo&&p?await Ct(pt(p)):null;s=b?{...T,...b}:{...T,range:o.defaultRange,keyLock:o.keyLockDefault},S=p+":"+(b?JSON.stringify({st:s.st,cents:s.cents,tempo:s.tempo,keyLock:s.keyLock,range:s.range}):""),console.debug("[kari] track",p||"(none)",l,"memory:",b?JSON.stringify(b):"none"),n?.render(),await C(s)}function oe(){x||(x=!0,k.release(),A.hide(!0),M({type:"apply",params:{...T,range:s.range}}),w("hidden on soundcloud")),n?.destroy(),n=null}function mt(){!!o?.hideOnSoundCloud!==x&&B()}async function B(){let l=await ut();if(!l)return;if(o=o||await Y(),o.hideOnSoundCloud){oe();return}let p=x;if(x=!1,getComputedStyle(l).position==="static"&&(l.style.position="relative"),n&&!l.contains(n.hostEl)&&(n.destroy(),n=null),c||(c=new J(o.midiMap,Qt,u=>{lt({midiMap:u}).then(b=>{o=b})},u=>n?.setMidiState(u))),!n){n=new z(l,{getParams:()=>s,apply:b=>{C(b)},setCompare:b=>M({type:"compare",on:b}),settings:o,saveSettings:b=>{lt(b).then(et=>{o=et,n?.applySettings(et),b.engine&&M({type:"engine-pref",pref:et.engine}),mt()})},level:()=>m,optionsUrl:chrome.runtime.getURL("options.html"),site:"sc",mountStyle:"position:absolute;left:0;right:0;top:auto;bottom:100%;height:320px;visibility:visible;pointer-events:none;z-index:60",loop:{latch:b=>k.latch(b),release:()=>k.release(),tap:()=>k.tap(),setBpm:b=>k.setBpm(b),nudge:b=>k.nudge(b)},midi:c,record:{start:()=>x?Promise.resolve(!1):A.start(r,Wt()||""),stop:()=>Jt()}}),n.setMidiState(c.state),R(d);let u=()=>n?.setBarHidden(!Vt(l));u(),L!==l&&(L=l,Xt(l,()=>{tt("bar"),u(),n&&!l.contains(n.hostEl)&&B()})),M({type:"engine-pref",pref:o.engine}),setTimeout(()=>{i||R({...d,fault:"hook-missing"})},3e3)}await tt("mount"),p&&await C(s),p&&A.hide(!1)}window.addEventListener("message",l=>{let p=Ft(l,window,t,"h2b",e);if(p){if(p.type==="record-ack"||p.type==="take"){if(p.type==="record-ack"){let u=ct(p);u&&A.ack(u.seq,u.ok)}else{let u=Ot(p);u&&A.take(u.seq,u.take)}return}switch(p.type){case"hello":{let u=Date.now();u-E>500&&(E=u,M({type:"init"}));return}case"ready":i=!0,h=p.late===!0,w(h?"hook ready (late)":"hook ready"),d.fault==="hook-missing"&&R({...d,fault:null}),h&&ae();return;case"need-engine":te();return;case"need-worklet-source":ee();return;case"status":R(Nt(p.status));return;case"loop-ack":{let u=ct(p);u&&k.ack(u.seq,u.ok);return}case"level":m=typeof p.v=="number"&&Number.isFinite(p.v)?Math.min(1,Math.max(0,p.v)):0;return;case"event":{let u=p.ev;if(!u||typeof u!="object"||typeof u.type!="string")return;try{w(`event ${JSON.stringify(u).slice(0,160)}`)}catch{w("event (unserialisable)")}u.type==="media"&&(u.ev==="loadstart"||u.ev==="emptied")&&tt(String(u.ev)),u.type==="source"&&(g=!0),(u.type==="source"||u.type==="media")&&(n||B());return}case"note":w(`hook note ${String(p.note).slice(0,120)} ${String(p.reason||"").slice(0,80)}`);return}}}),chrome.runtime.onMessage.addListener((l,p,u)=>{l?.type==="kari:ping"&&u({site:"soundcloud",dock:!!n,hookReady:i,late:h})}),chrome.runtime.onMessage.addListener(l=>{if(l?.type!=="kari:command"||!n)return;let u={"pitch-up":()=>$(s,1),"pitch-down":()=>$(s,-1),"tempo-up":()=>_(s,1),"tempo-down":()=>_(s,-1)}[l.command];u&&(C(u()),n.react(),n.render())}),globalThis.__kari={site:"soundcloud",get params(){return s},get status(){return d},get dock(){return n},get settings(){return o},get key(){return r},get hookReady(){return i},get late(){return h},get lateFault(){return f},get log(){return D.slice()},apply:l=>C(l),get midi(){return c},tap:()=>k.tap(),setBpm:l=>k.setBpm(l),latch:l=>k.latch(l),release:()=>k.release()},Pt(l=>{o=l,n?.applySettings(l),M({type:"engine-pref",pref:l.engine}),c?.setMap(l.midiMap||{}),mt()}),M({type:"init"}),P()?B():ut().then(l=>{l&&B()})})();})();
