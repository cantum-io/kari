"use strict";(()=>{var et=`
:host{display:block;position:absolute;inset:0;pointer-events:none;z-index:60;font-size:14px;line-height:1.3;text-align:left;letter-spacing:normal;text-transform:none}
*,*::before,*::after{box-sizing:border-box}
.root{position:absolute;inset:0;z-index:60;pointer-events:none;font-family:"Instrument Sans",system-ui,-apple-system,"Helvetica Neue",sans-serif;color:#efece4;
  --ink:#07070b;--bone:#efece4;--bone-2:#b9b6ad;--mute:#6d6c76;--cyan:#5cf2ff;--amber:#ffb454;--rose:#ff7ad9;--line:rgba(239,236,228,.14);
  --ease-out:cubic-bezier(.23,1,.32,1);--ease-in-out:cubic-bezier(.77,0,.175,1);--mono:"Space Mono",ui-monospace,Menlo,monospace;
  transition:opacity 200ms ease,visibility 0s linear 0s}
/* fade with YouTube's controls: visibility (not just opacity) so faded controls cannot take clicks meant for the player */
.root[data-hidden-with-controls="1"]:not([data-collapsed="1"]){opacity:0;visibility:hidden;pointer-events:none;transition:opacity 200ms ease,visibility 0s linear 200ms}
.root[data-hidden-with-controls="1"] .anchor{opacity:1}
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
/* beat loops: three latch pills, a release, tap tempo and the bpm field. Disabled until a grid exists. */
.loops,.tempo{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.loops .lab,.tempo .lab{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.pill.loop{min-width:30px;text-align:center;font-size:11px;letter-spacing:0;padding:4px 8px;position:relative;overflow:hidden}
.pill.loop[aria-pressed="true"]{background:var(--cyan);color:var(--ink);border-color:var(--cyan)}
.pill.off{color:var(--bone-2);padding:4px 7px}
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

/* PLUSH */
.plush{position:absolute;left:14px;bottom:56px;width:70px;height:78px;cursor:pointer;transform-origin:50% 100%;pointer-events:auto}
.plush svg{width:100%;height:100%;overflow:visible}
.plush[hidden]{display:none!important}
@media (prefers-reduced-motion:no-preference){
  .plush{animation:kari-sway 4.5s ease-in-out infinite}
  @keyframes kari-sway{50%{transform:rotate(-3deg) translateY(-2px)}}
  .plush.poke{animation:kari-poke 600ms var(--ease-out)}
  @keyframes kari-poke{20%{transform:scale(1.1,.9)}50%{transform:scale(.94,1.08) rotate(6deg)}}
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
.root[data-small="1"] .void,.root[data-small="1"] .pod,.root[data-small="1"] .cons-ctl,.root[data-small="1"] .plush,.root[data-small="1"] .cons svg{display:none}
.root[data-small="1"] .void-orb{opacity:1;pointer-events:auto}
.root[data-small="1"] .cloudlet{transform:translate(0,-120px)}

/* SoundCloud: the dock stands on the fixed bottom bar (.playControls) inside a 320 px panel above it. Panels anchor to
   the bottom edge, the gear and settings move to the left so nothing overlaps the controls or the bar's own buttons. */
.root[data-site="sc"] .org{top:auto;bottom:10px;right:16px;width:330px}
.root[data-site="sc"] .void,.root[data-site="sc"] .pod,.root[data-site="sc"] .cons-ctl{top:auto;bottom:10px;right:16px}
.root[data-site="sc"] .void-orb{top:auto;bottom:14px;right:16px}
.root[data-site="sc"] .cons{top:auto;bottom:0;height:100%;width:min(520px,60%)}
.root[data-site="sc"] .suncap{top:auto;bottom:150px}
.root[data-site="sc"] .cloudlet{top:auto;bottom:14px;right:16px}
.root[data-site="sc"][data-collapsed="1"] .cloudlet{transform:none}
.root[data-site="sc"] .plush{display:none}
.root[data-site="sc"] .gear{right:auto;left:14px;bottom:12px}
.root[data-site="sc"] .settings{right:auto;left:14px;bottom:50px;max-height:260px}
.root[data-site="sc"] .intro{top:auto;bottom:240px;right:16px}
.root[data-site="sc"] .fault{top:auto;bottom:250px}
`;var Mt=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],at={st:12,cents:50,tempoRanges:[8,16,50]},U=(o,t,e)=>Math.min(e,Math.max(t,o));function V(o,t,e=!0){let a=((o+t)%12+12)%12;return Mt[a]+(e?"m":"")}var ot=o=>(1+o/100).toFixed(2)+"\xD7",st=(o,t=0)=>(o>0?"+":o<0?"\u2212":"")+Math.abs(o).toFixed(t);function M(o,t){return{...o,tempo:U(+(o.tempo+t).toFixed(1),-o.range,o.range)}}function S(o,t){return{...o,st:U(o.st+t,-at.st,at.st)}}function rt(o,t){return{...o,range:t,tempo:U(o.tempo,-t,t)}}var C=o=>o.st===0&&o.cents===0&&o.tempo===0,L={st:0,cents:0,tempo:0,range:50,keyLock:!1};var Y=o=>(Math.round(o*10)/10).toFixed(1).replace(/\.0$/,""),nt=o=>o===.25?"\xBC":o===.5?"\xBD":"1";var Et={yt:{"drm-silent":"this video's audio is protected \u2014 Kari can't touch it","capture-failed":"couldn't reach the audio on this page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player"},sc:{"drm-silent":"this track's audio is protected \u2014 speed only","capture-failed":"couldn't reach SoundCloud's player \u2014 reload the page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player"}},$t={"0.25":"loop-q","0.5":"loop-h",1:"loop-1",off:"release",tap:"tap"},At='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',I=`
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00\xD7</span></b><span class="p ro">pitch <span data-b="st">0</span> \xB7 <span data-b="bpm"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">\u2212</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">\u2212</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
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
    <div class="loops">
      <span class="lab">loop</span>
      <button class="pill loop" data-a="loop" data-v="0.25" aria-pressed="false" aria-label="Loop a quarter beat" disabled>\xBC</button>
      <button class="pill loop" data-a="loop" data-v="0.5" aria-pressed="false" aria-label="Loop half a beat" disabled>\xBD</button>
      <button class="pill loop" data-a="loop" data-v="1" aria-pressed="false" aria-label="Loop one beat" disabled>1</button>
      <button class="pill off" data-a="loop-off" aria-label="Release the loop" disabled>\xD7</button>
    </div>
    <div class="tempo">
      <button class="pill" data-a="tap" aria-label="Tap tempo">Tap</button>
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">\u2212</button><input class="bpm ro" type="number" min="${40}" max="${300}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span><span>loop <em class="ro" data-b="loopinfo">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,Pt=`
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
</svg>`,Tt=`
<svg viewBox="0 0 80 90" aria-hidden="true">
  <ellipse cx="40" cy="60" rx="30" ry="26" fill="#d9c4a7"/><ellipse cx="40" cy="63" rx="18" ry="16" fill="#efe1c8"/><circle cx="40" cy="32" r="21" fill="#d9c4a7"/>
  <ellipse cx="18" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(-30 18 18)"/><ellipse cx="62" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(30 62 18)"/>
  <circle cx="32" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="48" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="33" cy="29" r="1" fill="#fff"/><circle cx="49" cy="29" r="1" fill="#fff"/>
  <path d="M36 39 q4 4 8 0" fill="none" stroke="#5a4634" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M22 62 l-12 10 M58 62 l12 10" stroke="#c9b092" stroke-width="9" stroke-linecap="round"/>
  <path d="M30 52 l4 -3 l4 3 l4 -3 l4 3" fill="none" stroke="#8b6f52" stroke-width="1" stroke-dasharray="2 2"/>
  <rect x="34" y="70" width="12" height="7" rx="1" fill="#f3f1ea"/><text x="40" y="75.5" font-size="4.5" text-anchor="middle" font-family="Space Mono,monospace" fill="#111">YGG</text>
</svg>`,Bt=`
<div class="root" data-collapsed="0" data-small="0">
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${I}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls">${Pt}</div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${I}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${I}</div>
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
    <div class="cons-ctl absorb">${I}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${At}</button>
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
    <div class="sg"><b>Extras</b><div class="row col"><label class="ul"><input type="checkbox" data-set="plush"> <span>Plush trophy in corner</span></label></div></div>
    <div class="sg" data-el="midisg"><b>MIDI</b><div class="row"><button class="chip" data-m="connect">Connect</button><button class="chip" data-m="learn" aria-pressed="false">Learn</button><span class="mst" data-el="midist">not connected</span></div>
      <span class="mst">learn: switch it on, click a loop, tap or \xD7 button, then hit the pad</span></div>
    <div class="row hiderow"><button class="big" data-a="hide">Hide dock \xB7 absorb into Kari</button></div>
    <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
    <a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a>
  </aside>
  <button class="plush" data-el="plush" aria-label="Plush trophy">${Tt}</button>
</div>`,E=330,$=200,R=120,_=52,it=8,H=class{constructor(t,e){this.host=t;this.deps=e;let a=document.createElement("div");this.wrap=a,a.id="kari-dock",a.dataset.build="0.1.1+fcf2180a",a.style.cssText=e.mountStyle||"position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=a.attachShadow({mode:"open"});let s=document.createElement("style");s.textContent=et,this.shadow.appendChild(s);let p=document.createElement("template");p.innerHTML=Bt,this.shadow.appendChild(p.content.cloneNode(!0)),t.appendChild(a),this.root=this.shadow.querySelector(".root"),this.root.dataset.site=e.site||"yt",this.seedStars(),this.wire(),this.applySettings(e.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=t=>this.shadow.querySelector(`[data-el="${t}"]`);$$=t=>Array.from(this.shadow.querySelectorAll(t));status=null;midiState=null;learnOn=!1;raf=0;visible=!0;consDrag=!1;destroy(){cancelAnimationFrame(this.raf),this.host.querySelector("#kari-dock")?.remove()}setStatus(t){this.status=t;let e=this.el("fault"),a=t.fault&&Et[this.deps.site||"yt"][t.fault]||"";e.hidden=!a,e.textContent=a,this.shadow.querySelector(".org")?.setAttribute("data-fault",t.fault?"1":"0"),this.render()}setControlsHidden(t){this.root.dataset.hiddenWithControls=t?"1":"0"}setMidiState(t){this.midiState=t;let e=t.learning;this.$$("[data-arm]").forEach(p=>{e||p.removeAttribute("data-arm")});let a=t.supported?t.error?t.error:t.connected?`${t.inputs} input${t.inputs===1?"":"s"}${t.lastNote!==null?` \xB7 note ${t.lastNote}`:""}${e?" \xB7 hit a pad":""}`:"not connected":"no Web MIDI here",s=this.el("midist");s&&s.textContent!==a&&(s.textContent=a),this.render()}setSmall(t){this.root.dataset.small=t?"1":"0"}applySettings(t){this.$$(".skin").forEach(a=>a.hidden=a.dataset.skin!==t.skin),this.$$(".chip[data-skin]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.skin===t.skin)));let e=this.shadow.querySelector(".org");e.dataset.kari=t.kariColor,e.dataset.cap=t.cap?"1":"0",e.dataset.shades=t.shades?"1":"0",e.dataset.shoes=t.shoes?"1":"0",this.$$("[data-kari]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.kari===t.kariColor))),this.$$("input[data-set]").forEach(a=>a.checked=!!t[a.dataset.set]),this.el("plush").hidden=!t.plush,this.root.dataset.collapsed=t.collapsed?"1":"0",this.$$(".ctl").forEach(a=>a.dataset.full=t.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(a=>a.setAttribute("aria-pressed",String(t.fullControl))),this.el("intro").hidden=t.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=t}react(){let t=this.el("bubble");t.classList.remove("go"),t.getBBox?.(),t.classList.add("go"),["i1","i2"].forEach(e=>{let a=this.el(e);a.classList.add("lit"),setTimeout(()=>a.classList.remove("lit"),700)})}render(){let t=this.deps.getParams(),e=this.status,a=e?.bpm??null,s=e?.loop??0,p=e?.baseRate&&Math.abs(e.baseRate-1)>.001?`${this.deps.site==="sc"?"sc":"yt"} ${e.baseRate.toFixed(2)}\xD7`:"",d={speed:ot(t.tempo),st:st(t.st),bpm:[p,a?`${Y(a)} bpm`:""].filter(Boolean).join(" \xB7 "),keypair:`${V(it,0)} \u2192 ${V(it,t.st)}`,engine:e?e.engine==="r3"?"R3":e.engine==="ss"?"SS":"wire":"\u2014",av:e?e.attached?`${e.avOffsetMs} ms`:"0 ms":"\u2014",loopinfo:this.deps.loop?s?`${nt(s)} \xB7 ${e.loopMs} ms`:a?"\u2014":"tap first":"\u2014"};this.$$("[data-b]").forEach(i=>{let b=d[i.dataset.b];b!==void 0&&i.textContent!==b&&(i.textContent=b)});let m=this.shadow.querySelector(".loops");m&&(m.hidden=!this.deps.loop);let n=this.shadow.querySelector('[data-el="midisg"]');n&&(n.hidden=!this.deps.midi),this.$$('[data-a="loop"]').forEach(i=>{let b=s>0&&+i.dataset.v===s;i.setAttribute("aria-pressed",String(b)),i.disabled=!a,b&&i.style.setProperty("--loop-ms",`${e.loopMs}ms`)}),this.$$('[data-a="loop-off"]').forEach(i=>{i.disabled=!s}),this.$$('[data-a="bpm-"],[data-a="bpm+"]').forEach(i=>{i.disabled=!a}),this.$$('input[data-a="bpm"]').forEach(i=>{if(this.shadow.activeElement===i)return;let b=a?Y(a):"";i.value!==b&&(i.value=b)});let r=this.midiState;this.$$('[data-a="midi"]').forEach(i=>{i.setAttribute("aria-pressed",String(!!r?.connected))}),this.$$('[data-m="learn"]').forEach(i=>i.setAttribute("aria-pressed",String(this.learnOn))),this.$$('[data-b="av"]').forEach(i=>i.classList.toggle("warn",!!e&&e.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(i=>{i.min=String(-t.range),i.max=String(t.range),+i.value!==t.tempo&&(i.value=String(t.tempo))}),this.$$('[data-a="lock"]').forEach(i=>i.setAttribute("aria-pressed",String(t.keyLock))),this.$$('[data-a="vinyl"]').forEach(i=>i.setAttribute("aria-pressed",String(!t.keyLock))),this.$$('[data-a="range"]').forEach(i=>i.setAttribute("aria-pressed",String(+i.dataset.v===t.range))),this.shadow.querySelector(".void").dataset.off=C(t)?"1":"0",this.renderCons(t)}wire(){let t=this.shadow;t.addEventListener("click",n=>{let r=n.target.closest("[data-a]");if(!r)return;let i=r.dataset.a,b=this.deps.getParams(),f=y=>{this.deps.apply(y),this.react(),this.render()};switch(i){case"st+":f(S(b,1));break;case"st-":f(S(b,-1));break;case"tempo+":f(M(b,1));break;case"tempo-":f(M(b,-1));break;case"lock":f({...b,keyLock:!0});break;case"vinyl":f({...b,keyLock:!1});break;case"reset":f({...L,range:b.range,keyLock:b.keyLock});break;case"range":f(rt(b,+r.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break;case"loop":case"loop-off":case"tap":{let y=i==="loop"?r.dataset.v:i==="loop-off"?"off":"tap";if(this.learnOn&&this.midiState?.connected){this.$$("[data-arm]").forEach(g=>g.removeAttribute("data-arm")),r.dataset.arm="1",this.deps.midi?.learn($t[y]);break}i==="loop"?this.deps.loop?.latch(+r.dataset.v)?.then(g=>{g&&this.react(),this.render()}):i==="loop-off"?this.deps.loop?.release():(this.deps.loop?.tap(),this.react()),this.render();break}case"bpm-":this.deps.loop?.nudge(-1),this.render();break;case"bpm+":this.deps.loop?.nudge(1),this.render();break;case"midi":this.deps.midi?.connect()?.then(()=>this.render());break}}),t.addEventListener("click",n=>{let r=n.target.closest("[data-m]");r&&(r.dataset.m==="connect"&&this.deps.midi?.connect()?.then(()=>this.render()),r.dataset.m==="learn"&&(this.learnOn=!this.learnOn,this.learnOn||(this.deps.midi?.learn(null),this.$$("[data-arm]").forEach(i=>i.removeAttribute("data-arm"))),this.render()))});let e=n=>{let r=n.target;return r.matches('input[type="number"]')?!0:r.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(n.key):r.matches('button, [role="button"], input[type="checkbox"], a')?n.key==="Enter"||n.key===" ":!1};t.addEventListener("keydown",n=>{let r=n,i=r.target.closest('[role="button"][data-a]');i&&(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),i.click()),r.target.matches('input[data-a="bpm"]')&&(r.key==="Enter"||r.key==="Escape")&&(r.preventDefault(),r.target.blur()),e(r)&&r.stopPropagation()}),t.addEventListener("keyup",n=>{e(n)&&n.stopPropagation()}),t.addEventListener("mousedown",n=>{n.target.closest('button, [role="button"]')&&n.preventDefault()}),t.addEventListener("input",n=>{let r=n.target;if(r.matches('input[data-a="tempo"]')){let i=this.deps.getParams();this.deps.apply({...i,tempo:+r.value}),this.render()}}),t.addEventListener("change",n=>{let r=n.target;if(r.matches('input[data-a="tempo"]')&&this.react(),r.matches('input[data-a="bpm"]')){let i=parseFloat(r.value);Number.isFinite(i)&&(this.deps.loop?.setBpm(i),this.react()),this.render()}r.dataset.set&&this.deps.saveSettings({[r.dataset.set]:r.checked})}),t.addEventListener("pointerdown",n=>{let r=n.target.closest('[data-a="compare"]');r&&(this.hold(!0),r.setPointerCapture?.(n.pointerId))}),["pointerup","pointercancel"].forEach(n=>t.addEventListener(n,()=>{this.holding&&this.hold(!1)})),t.addEventListener("keydown",n=>{let r=n;r.target.closest('[data-a="compare"]')&&r.key===" "&&!r.repeat&&(r.preventDefault(),this.hold(!0))}),t.addEventListener("keyup",n=>{let r=n;r.target.closest('[data-a="compare"]')&&r.key===" "&&(r.preventDefault(),this.hold(!1))});let a=this.el("gear"),s=this.el("settings");a.addEventListener("click",()=>{let n=s.hidden;s.hidden=!n,a.setAttribute("aria-expanded",String(n))}),s.addEventListener("click",n=>{n.target.closest('[data-s="close"]')&&(s.hidden=!0,a.setAttribute("aria-expanded","false"))}),this.$$("[data-skin].chip").forEach(n=>n.addEventListener("click",()=>this.deps.saveSettings({skin:n.dataset.skin}))),this.$$("[data-kari]").forEach(n=>n.addEventListener("click",()=>{this.deps.saveSettings({kariColor:n.dataset.kari}),this.react()}));let p=this.el("plush");p.addEventListener("click",()=>{p.classList.remove("poke"),p.offsetWidth,p.classList.add("poke"),this.react()});let d=this.el("consSvg"),m=n=>{let r=d.getBoundingClientRect(),i=(n.clientX-r.left)/r.width*640,b=(n.clientY-r.top)/r.height*360,f=Math.atan2((i-E)/R,-(b-$)/_);return Math.max(-12,Math.min(12,Math.round(f/Math.PI*12)))};d.addEventListener("pointerdown",n=>{if(!this.deps.settings.collapsed&&n.target.closest(".hit,.moon")){this.consDrag=!0,d.setPointerCapture(n.pointerId);let r=m(n),i=this.deps.getParams();r!==i.st&&(this.deps.apply({...i,st:r}),this.render())}}),d.addEventListener("pointermove",n=>{if(!this.consDrag)return;let r=m(n),i=this.deps.getParams();r!==i.st&&(this.deps.apply({...i,st:r}),this.render())}),["pointerup","pointercancel"].forEach(n=>d.addEventListener(n,()=>{this.consDrag&&(this.consDrag=!1,this.react())})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(n=>this.wrap.addEventListener(n,r=>r.stopPropagation()))}holding=!1;hold(t){this.holding=t,this.deps.setCompare(t),this.$$('[data-a="compare"]').forEach(e=>e.dataset.held=t?"1":"0")}startPulse(){let t=0,e=0,a=s=>{if(this.raf=requestAnimationFrame(a),document.hidden||s-t<33||(t=s,!!this.shadow.querySelector('.skin[data-skin="org"]').hidden))return;let d=this.deps.level();e=Math.max(d,e*.85);let m=1+Math.min(.08,e*.35),n=1-Math.min(.06,e*.25);this.el("beat").style.transform=`scale(${m.toFixed(3)},${n.toFixed(3)})`};this.raf=requestAnimationFrame(a)}seedStars(){let t=this.el("starfield"),e="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((p,d)=>{let m=d%3===0?9:6;e+=`<path class="star" transform="translate(${p[0]} ${p[1]})" d="M0 -${m} L${m*.3} -${m*.3} L${m} 0 L${m*.3} ${m*.3} L0 ${m} L-${m*.3} ${m*.3} L-${m} 0 L-${m*.3} -${m*.3}Z"/>`}),t.innerHTML=e;let s="";for(let p=-12;p<=12;p+=3){let d=p/12*Math.PI;s+=`<line class="tick" x1="${(E+Math.sin(d)*(R+4)).toFixed(1)}" y1="${($-Math.cos(d)*(_+4)).toFixed(1)}" x2="${(E+Math.sin(d)*(R-4)).toFixed(1)}" y2="${($-Math.cos(d)*(_-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=s}renderCons(t){let e=t.st/12*Math.PI,a=E+Math.sin(e)*R,s=$-Math.cos(e)*_,p=this.el("moon"),d=this.el("ray");p.setAttribute("cx",a.toFixed(1)),p.setAttribute("cy",s.toFixed(1)),d.setAttribute("x2",a.toFixed(1)),d.setAttribute("y2",s.toFixed(1));let m=this.$$(".star");m.forEach(k=>k.classList.remove("lit")),m.length&&m[(t.st%m.length+m.length)%m.length].classList.add("lit");let n=this.el("tempoArc"),r=170,i=Math.max(-50,Math.min(50,t.tempo))/50,b=Math.PI*.62,f=b+i*.45,y=k=>[E+Math.cos(k)*r,$+Math.sin(k)*r*.55],[g,x]=y(b),[h,q]=y(f);n.setAttribute("d",`M${g.toFixed(1)} ${x.toFixed(1)} A${r} ${(r*.55).toFixed(1)} 0 0 ${i>=0?1:0} ${h.toFixed(1)} ${q.toFixed(1)}`)}};var j={skin:"org",kariColor:"blue",cap:!1,shades:!1,shoes:!1,plush:!0,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1},A="kari.settings",X="kari.video.";function lt(o){let t={};try{let e=globalThis.chrome?.storage?.[o];if(e)return{get:a=>e.get(a),set:a=>e.set(a),remove:a=>e.remove(a)}}catch{}return{async get(e){let a=Array.isArray(e)?e:[e],s={};for(let p of a)p in t&&(s[p]=t[p]);return s},async set(e){Object.assign(t,e)},async remove(e){delete t[e]}}}var z=lt("sync"),D=lt("local");async function F(){try{let o=await z.get(A);return{...j,...o[A]||{}}}catch{return{...j}}}async function W(o){let e={...await F(),...o};try{await z.set({[A]:e})}catch{}return e}function pt(o){try{globalThis.chrome?.storage?.onChanged?.addListener((t,e)=>{e==="sync"&&t[A]&&o({...j,...t[A].newValue})})}catch{}}async function ct(o){let t=X+o;try{let e=await D.get(t);if(e[t])return e[t];let s=(await z.get(t))[t]||null;if(s)try{await D.set({[t]:s}),await z.remove(t)}catch{}return s}catch{return null}}async function dt(o,t){try{t?await D.set({[X+o]:t}):await D.remove(X+o)}catch{}}var J="kari-sc",ut={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1,loop:0,loopMs:0,bpm:null,gridSource:null,route:null,ctxState:""};function mt(){let o=new Uint8Array(16),t=globalThis.crypto;if(t?.getRandomValues)t.getRandomValues(o);else for(let e=0;e<o.length;e++)o[e]=Math.random()*256|0;return Array.from(o,e=>e.toString(16).padStart(2,"0")).join("")}function bt(o,t,e,a,s){if(o.source!==t||o.origin!==e)return null;let p=o.data;return!p||typeof p!="object"||p.ns!==J||p.dir!==a||typeof p.type!="string"?null:p.type==="hello"||p.type==="init"?p:!s||p.nonce!==s?null:p}var Ct=new Set(["r3","ss","bypass"]),It=new Set([null,"drm-silent","capture-failed","worklet-failed","hook-missing"]),Rt=new Set(["tap","manual","auto"]),_t=[.25,.5,1],v=(o,t,e,a=0)=>typeof o=="number"&&Number.isFinite(o)?Math.min(e,Math.max(t,o)):a,Ht=o=>typeof o=="number"&&_t.includes(o);var zt=6e4,Dt=o=>typeof o=="number"&&Number.isFinite(o)&&o>=1&&o<=1e3;function ht(o){if(!o||typeof o!="object")return null;let t=o;return typeof t.seq=="number"&&Number.isInteger(t.seq)?{seq:t.seq,ok:t.ok===!0}:null}function ft(o){let t=o&&typeof o=="object"?o:{},e=t.route===0||t.route===1?t.route:t.route==="late"?"late":null;return{attached:t.attached===!0,engine:Ct.has(t.engine)?t.engine:"bypass",engineLatencyMs:v(t.engineLatencyMs,0,5e3),outputLatencyMs:v(t.outputLatencyMs,0,5e3),avOffsetMs:v(t.avOffsetMs,0,1e4),underruns:v(t.underruns,0,1e9),load:v(t.load,0,10),fault:It.has(t.fault)?t.fault:null,baseRate:v(t.baseRate,.0625,16,1),loop:Ht(t.loop)?t.loop:0,loopMs:v(t.loopMs,0,zt),bpm:Dt(t.bpm)?t.bpm:null,gridSource:Rt.has(t.gridSource)?t.gridSource:null,route:e,ctxState:typeof t.ctxState=="string"?t.ctxState.slice(0,16):""}}var N=class{seq=0;pending=new Map;post;timeoutMs;constructor(t,e=2e3){this.post=t,this.timeoutMs=e}latch(t){let e=++this.seq;return new Promise(a=>{let s=setTimeout(()=>{this.pending.delete(e)&&a(!1)},this.timeoutMs);this.pending.set(e,{resolve:a,timer:s}),this.post({action:"latch",beats:t,seq:e})})}release(){this.post({action:"release"})}tap(){return this.post({action:"tap"}),null}setBpm(t){Number.isFinite(t)&&this.post({action:"bpm",bpm:t})}nudge(t){Number.isFinite(t)&&t!==0&&this.post({action:"nudge",delta:t})}clear(){this.post({action:"clear"})}ack(t,e){let a=this.pending.get(t);return a?(clearTimeout(a.timer),this.pending.delete(t),a.resolve(e),!0):!1}get inFlight(){return this.pending.size}};var Ft=["loop-q","loop-h","loop-1","release","tap"],gt={"loop-q":36,"loop-h":37,"loop-1":38,release:39,tap:40},G=class{constructor(t,e,a,s){this.onAction=e;this.onMap=a;this.onState=s;this.map={...gt,...t||{}}}access=null;map;_state={supported:typeof navigator<"u"&&"requestMIDIAccess"in navigator,connected:!1,inputs:0,learning:null,lastNote:null,error:null};get state(){return this._state}get mapping(){return this.map}noteFor(t){return this.map[t]}set(t){this._state={...this._state,...t},this.onState(this._state)}async connect(){if(!this._state.supported)return this.set({error:"no Web MIDI in this browser"}),!1;if(this.access)return!0;try{let t=await navigator.requestMIDIAccess({sysex:!1});this.access=t;let e=()=>{let a=0;t.inputs.forEach(s=>{s.onmidimessage=this.onMessage,a++}),this.set({connected:a>0,inputs:a,error:a?null:"no MIDI inputs"})};return t.onstatechange=e,e(),this._state.connected}catch(t){return this.set({error:String(t?.message||t),connected:!1}),!1}}learn(t){this.set({learning:t})}setMap(t){this.map={...gt,...t}}onMessage=t=>{let e=t.data;if(!e||e.length<3)return;let a=e[0]&240,s=e[1],p=e[2];if(!(a!==144||p===0)){if(this.set({lastNote:s}),this._state.learning){let d=this._state.learning;this.map={...this.map,[d]:s},this.onMap(this.map),this.set({learning:null});return}for(let d of Ft)if(this.map[d]===s){this.onAction(d);return}}}};var Nt=new Set(["discover","search","you","stream","charts","upload","settings","pages","tags","people","notifications","messages","library","feed","mobile","terms-of-use","jobs","imprint","popular","explore","stations","sets","tracks","playlists","go","pro","signin","logout","login","connect","oauth","activity","dashboard","trending","genres","moods","premium","artist","creators","for","insights","legal","help","community-guidelines"]),Gt=new Set(["sets","tracks","albums","reposts","likes","followers","following","popular-tracks","comments","playlists","spotlight","recommended","you","stats","insights","related","toptracks"]);function xt(o,t="https://soundcloud.com"){if(!o||typeof o!="string")return null;let e;try{e=new URL(o,t)}catch{return null}if(!/(^|\.)soundcloud\.com$/i.test(e.hostname))return null;let a=e.pathname.split("/").filter(Boolean).map(d=>{try{return decodeURIComponent(d)}catch{return d}});if(a.length<2)return null;let s=a[0].toLowerCase(),p=a[1].toLowerCase();return Nt.has(s)||Gt.has(p)||/^s-[a-z0-9]+$/.test(p)||!/^[a-z0-9][a-z0-9_.-]*$/.test(s)||!/^[a-z0-9][a-z0-9_.-]*$/.test(p)?null:`/${s}/${p}`}var Z=o=>"sc:"+o;var qt=".playControls",Ot=".playControls__soundBadge .playbackSoundBadge__titleLink",P=()=>document.querySelector(qt);function yt(){let o=document.querySelector(Ot);return o?xt(o.getAttribute("href")||o.href||null,location.origin):null}function Q(o=2e4){return new Promise(t=>{let e=P();if(e)return t(e);let a=new MutationObserver(()=>{let p=P();p&&(a.disconnect(),clearTimeout(s),t(p))});a.observe(document.documentElement,{childList:!0,subtree:!0});let s=setTimeout(()=>{a.disconnect(),t(P())},o)})}function vt(o,t,e=80){let a=0,s=()=>{clearTimeout(a),a=window.setTimeout(t,e)},p=new MutationObserver(s);return p.observe(o,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["href","class","title"],characterData:!0}),()=>p.disconnect()}(()=>{let o=location.origin,t=mt(),e,a={...L},s=null,p=null,d="",m=!1,n={...ut},r=0,i=0,b="",f=0,y=[],g=l=>{y.push(`${new Date().toISOString().slice(11,23)} ${l}`),y.length>60&&y.shift()},x=(l,c)=>window.postMessage({ns:J,dir:"b2h",nonce:t,...l},o,c||[]),h=new N(l=>x({type:"loop",...l})),q={"loop-q":.25,"loop-h":.5,"loop-1":1};function k(l){let c=q[l];c?h.latch(c).then(u=>{u&&s?.react(),s?.render()}):l==="release"?h.release():l==="tap"&&(h.tap(),s?.react()),s?.render()}async function T(l){a=l,x({type:"apply",params:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range}}),e?.rememberPerVideo&&d&&(clearTimeout(i),i=window.setTimeout(()=>{let c=C(l)?null:{st:l.st,cents:l.cents,tempo:l.tempo,keyLock:l.keyLock,range:l.range},u=d+":"+(c?JSON.stringify(c):"");u!==b&&(b=u,dt(Z(d),c).then(()=>console.debug("[kari] saved",d,c?JSON.stringify(c):"cleared")))},400))}let tt=0;async function kt(){let l=Date.now();if(!(l-tt<5e3)){tt=l;try{let c=await(await fetch(chrome.runtime.getURL("rubberband.wasm"))).arrayBuffer();x({type:"engine",workletUrl:chrome.runtime.getURL("worklet.js"),wasm:c},[c]),g("engine bytes sent")}catch(c){g("engine fetch failed "+String(c))}}}async function wt(){try{let l=await(await fetch(chrome.runtime.getURL("worklet.js"))).text();x({type:"worklet-source",source:l}),g("worklet source sent (blob fallback)")}catch(l){g("worklet source fetch failed "+String(l))}}function O(l){n=l,s?.setStatus(l)}async function K(l){let c=yt()||"";if(c===d)return;let u=!!d;d=c,u&&h.clear(),e=e||await F();let w=e.rememberPerVideo&&c?await ct(Z(c)):null;a=w?{...L,...w}:{...L,range:e.defaultRange,keyLock:e.keyLockDefault},b=c+":"+(w?JSON.stringify({st:a.st,cents:a.cents,tempo:a.tempo,keyLock:a.keyLock,range:a.range}):""),console.debug("[kari] track",c||"(none)",l,"memory:",w?JSON.stringify(w):"none"),s?.render(),await T(a)}async function B(){let l=await Q();l&&(e=e||await F(),getComputedStyle(l).position==="static"&&(l.style.position="relative"),s&&!l.contains(s.hostEl)&&(s.destroy(),s=null),p||(p=new G(e.midiMap,k,c=>{W({midiMap:c}).then(u=>{e=u})},c=>s?.setMidiState(c))),s||(s=new H(l,{getParams:()=>a,apply:c=>{T(c)},setCompare:c=>x({type:"compare",on:c}),settings:e,saveSettings:c=>{W(c).then(u=>{e=u,s?.applySettings(u),c.engine&&x({type:"engine-pref",pref:u.engine})})},level:()=>r,optionsUrl:chrome.runtime.getURL("options.html"),site:"sc",mountStyle:"position:absolute;left:0;right:0;bottom:100%;height:320px;pointer-events:none;z-index:60",loop:{latch:c=>h.latch(c),release:()=>h.release(),tap:()=>h.tap(),setBpm:c=>h.setBpm(c),nudge:c=>h.nudge(c)},midi:p}),s.setMidiState(p.state),s.setStatus(n),vt(l,()=>{K("bar"),l.contains(s.hostEl)||B()}),x({type:"engine-pref",pref:e.engine}),setTimeout(()=>{m||O({...n,fault:"hook-missing"})},3e3)),await K("mount"))}window.addEventListener("message",l=>{let c=bt(l,window,o,"h2b",t);if(c)switch(c.type){case"hello":{let u=Date.now();u-f>500&&(f=u,x({type:"init"}));return}case"ready":m=!0,g("hook ready"),n.fault==="hook-missing"&&O({...n,fault:null});return;case"need-engine":kt();return;case"need-worklet-source":wt();return;case"status":O(ft(c.status));return;case"loop-ack":{let u=ht(c);u&&h.ack(u.seq,u.ok);return}case"level":r=typeof c.v=="number"&&Number.isFinite(c.v)?Math.min(1,Math.max(0,c.v)):0;return;case"event":{let u=c.ev;if(!u||typeof u!="object"||typeof u.type!="string")return;try{g(`event ${JSON.stringify(u).slice(0,160)}`)}catch{g("event (unserialisable)")}u.type==="media"&&(u.ev==="loadstart"||u.ev==="emptied")&&K(String(u.ev)),(u.type==="source"||u.type==="media")&&(s||B());return}case"note":g(`hook note ${String(c.note).slice(0,120)} ${String(c.reason||"").slice(0,80)}`);return}}),chrome.runtime.onMessage.addListener(l=>{if(l?.type!=="kari:command"||!s)return;let u={"pitch-up":()=>S(a,1),"pitch-down":()=>S(a,-1),"tempo-up":()=>M(a,1),"tempo-down":()=>M(a,-1)}[l.command];u&&(T(u()),s.react(),s.render())}),globalThis.__kari={site:"soundcloud",get params(){return a},get status(){return n},get dock(){return s},get settings(){return e},get key(){return d},get hookReady(){return m},get log(){return y.slice()},apply:l=>T(l),get midi(){return p},tap:()=>h.tap(),setBpm:l=>h.setBpm(l),latch:l=>h.latch(l),release:()=>h.release()},pt(l=>{e=l,s?.applySettings(l),x({type:"engine-pref",pref:l.engine}),p?.setMap(l.midiMap||{})}),x({type:"init"}),P()?B():Q().then(l=>{l&&B()})})();})();
