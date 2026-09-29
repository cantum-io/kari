"use strict";(()=>{var mt=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],W={st:12,cents:50,tempoRanges:[8,16,50]},F=(s,t,e)=>Math.min(e,Math.max(t,s));function K(s){let t=1+s.tempo/100,e=Math.pow(2,(s.st+s.cents/100)/12),a=s.keyLock?e/t:e,i=Math.abs(a-1)>1e-6;return{rate:t,keyRatio:e,engineRatio:a,engineActive:i,attached:i}}function I(s,t,e=!0){let a=((s+t)%12+12)%12;return mt[a]+(e?"m":"")}var q=s=>(1+s/100).toFixed(2)+"\xD7",U=(s,t=0)=>(s>0?"+":s<0?"\u2212":"")+Math.abs(s).toFixed(t);function x(s,t){return{...s,tempo:F(+(s.tempo+t).toFixed(1),-s.range,s.range)}}function k(s,t){return{...s,st:F(s.st+t,-W.st,W.st)}}function Y(s,t){return{...s,range:t,tempo:F(s.tempo,-t,t)}}var T=s=>s.st===0&&s.cents===0&&s.tempo===0,f={st:0,cents:0,tempo:0,range:50,keyLock:!1};var gt=.04,bt=Math.pow(10,-.57/20),j=.006,R=class{constructor(t,e){this.video=t;this.urls=e;t.addEventListener("ratechange",this.onRateChange)}ctx=null;src=null;node=null;dryDirect;dryMatched;wet;dryDelay;matchedReady=!1;analyser;limiter;trim;params={...f};compare=!1;baseRate=1;lastSetRate=1;_status={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1};latencyFrames={r3:0,ss:0};hotBlocks=0;tier="r3";pinned="auto";silentSince=0;rmsBuf=new Uint8Array(512);listeners=new Set;adActive=!1;wetWanted=!1;engineWarm=!1;lastWantedEngine=null;lastRing=0;onStatus(t){return this.listeners.add(t),t(this._status),()=>this.listeners.delete(t)}emit(t){this._status={...this._status,...t};for(let e of this.listeners)e(this._status)}setEnginePreference(t){this.pinned=t,this.tier=t==="signalsmith"?"ss":"r3",this.hotBlocks=0,this.applyEngine()}rebind(t){if(t!==this.video){if(this.video.removeEventListener("ratechange",this.onRateChange),this.video=t,t.addEventListener("ratechange",this.onRateChange),this.src){try{this.src.disconnect()}catch{}this.src=null,this.emit({attached:!1})}this.apply(this.params,!0)}}setAds(t){t!==this.adActive&&(this.adActive=t,this.apply(this.params,!0))}getParams(){return this.params}get status(){return this._status}async apply(t,e=!1){this.params=t;let a=K(t),i=this.adActive?this.baseRate:this.baseRate*a.rate;this.setVideoRate(i);let n=t.keyLock?a.engineRatio/this.baseRate:a.engineRatio,c=Math.abs(n-1)>1e-6;if((c&&!this.adActive||this.compare)&&!this.src&&await this.attach(),!this.src)return;let r=this.adActive?1:n;this.node?.port.postMessage({type:"ratio",ratio:r}),this.applyEngine(c&&!this.adActive);let o=c&&!this.adActive&&!this.compare;this.wetWanted=o,(!o||this.engineWarm)&&this.route(o,e)}setCompare(t){this.compare=t,this.apply(this.params,!0)}level(){if(!this.analyser)return 0;this.analyser.getByteTimeDomainData(this.rmsBuf);let t=0;for(let e=0;e<this.rmsBuf.length;e++){let a=(this.rmsBuf[e]-128)/128;t+=a*a}return Math.sqrt(t/this.rmsBuf.length)}setVideoRate(t){let e=this.video;try{e.preservesPitch=!1,e.mozPreservesPitch=!1,e.webkitPreservesPitch=!1,Math.abs(e.playbackRate-t)>1e-4?(this.lastSetRate=t,e.playbackRate=t):this.lastSetRate=t}catch{}}onRateChange=()=>{let t=this.video;t.preservesPitch=!1,Math.abs(t.playbackRate-this.lastSetRate)>.001&&(this.baseRate=t.playbackRate,this.emit({baseRate:this.baseRate}),this.apply(this.params,!0))};attaching=null;async attach(){return this.attaching?this.attaching:(this.attaching=this._attach().finally(()=>{this.attaching=null}),this.attaching)}async waitForActivation(){navigator.userActivation?.hasBeenActive||await new Promise(t=>{let e=()=>{window.removeEventListener("pointerdown",e,!0),window.removeEventListener("keydown",e,!0),t()};window.addEventListener("pointerdown",e,!0),window.addEventListener("keydown",e,!0)})}async _attach(){if(await this.waitForActivation(),!this.src)try{let t=new AudioContext({latencyHint:"interactive"});this.ctx=t,await t.audioWorklet.addModule(this.urls.worklet);let e=await(await fetch(this.urls.wasm)).arrayBuffer(),a=t.createMediaElementSource(this.video);if(this.src=a,this.dryDirect=t.createGain(),this.dryMatched=t.createGain(),this.wet=t.createGain(),this.dryDelay=t.createDelay(1),this.matchedReady=!1,this.limiter=t.createDynamicsCompressor(),this.limiter.threshold.value=-1,this.limiter.knee.value=0,this.limiter.ratio.value=20,this.limiter.attack.value=.001,this.limiter.release.value=.05,this.trim=t.createGain(),this.trim.gain.value=bt,this.analyser=t.createAnalyser(),this.analyser.fftSize=512,this.node=new AudioWorkletNode(t,"kari-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{rbWasm:e,engine:this.tier}}),this.node.port.onmessage=i=>this.onWorklet(i.data),this.node.onprocessorerror=()=>{this.emit({fault:"worklet-failed",engine:"bypass"}),this.route(!1,!0)},a.connect(this.dryDirect),this.dryDirect.connect(this.analyser),a.connect(this.dryDelay),this.dryDelay.connect(this.dryMatched),this.dryMatched.connect(this.analyser),a.connect(this.node),this.node.connect(this.wet),this.wet.connect(this.limiter),this.limiter.connect(this.trim),this.trim.connect(this.analyser),this.analyser.connect(t.destination),this.dryDirect.gain.value=1,this.dryMatched.gain.value=0,this.wet.gain.value=0,t.state!=="running")try{await t.resume()}catch{}if(t.state!=="running"){let i=()=>{t.resume(),window.removeEventListener("pointerdown",i,!0),window.removeEventListener("keydown",i,!0)};window.addEventListener("pointerdown",i,!0),window.addEventListener("keydown",i,!0)}this.emit({attached:!0,outputLatencyMs:Math.round((t.outputLatency||0)*1e3)}),this.watchSilence()}catch{this.emit({fault:"capture-failed",attached:!1}),this.src=null}}setMatchedDelay(t){if(!this.ctx)return;let e=Math.min(.99,t/this.ctx.sampleRate+j);this.matchedReady&&!this.wetWanted&&this.dryMatched.gain.value>.01?this.dryDelay.delayTime.setTargetAtTime(e,this.ctx.currentTime,.05):this.dryDelay.delayTime.setValueAtTime(e,this.ctx.currentTime),this.matchedReady=!0}route(t,e){if(this.wetWanted=t,!this.ctx)return;let a=this.ctx.currentTime,i=gt/3,n=!t&&this.matchedReady,c=!t&&!this.matchedReady;this.wet.gain.setTargetAtTime(t?1:0,a,i),this.dryMatched.gain.setTargetAtTime(n?1:0,a,i),this.dryDirect.gain.setTargetAtTime(c?1:0,a,i),this.updateAv()}applyEngine(t=!0){if(!this.node)return;let e=t?this.tier:"bypass";e!==this.lastWantedEngine&&(this.engineWarm=!1,this.lastWantedEngine=e,this.hotBlocks=0),this.node.port.postMessage({type:"engine",engine:e})}onWorklet(t){switch(t.type){case"ready":this.latencyFrames={r3:t.latency.r3||0,ss:t.latency.ss||0};break;case"engine":this.emit({engine:t.engine,engineLatencyMs:Math.round((t.latency||0)/(this.ctx?.sampleRate||48e3)*1e3)}),this.updateAv();break;case"warm":{typeof t.latency=="number"&&t.engine!=="bypass"&&(this.latencyFrames[t.engine]=t.latency,this.emit({engineLatencyMs:Math.round(t.latency/(this.ctx?.sampleRate||48e3)*1e3)}),this.setMatchedDelay(t.latency)),this.engineWarm=!0,this.route(this.wetWanted,!0);break}case"stats":{let e=t.budgetMs?t.avgBlockMs/t.budgetMs:0;this.lastRing=t.ringFrames||0,this.emit({underruns:t.underruns,load:e}),this.updateAv(),this.stepdown(e,t.underruns);break}case"error":this.emit({engine:"bypass",fault:t.where==="process"?"worklet-failed":this._status.fault});break}}lastUnderruns=0;stepdown(t,e){if(this.pinned!=="auto")return;let a=e-this.lastUnderruns;this.lastUnderruns=e,t>.85||a>5?this.hotBlocks++:this.hotBlocks=Math.max(0,this.hotBlocks-1),this.hotBlocks>=4&&(this.hotBlocks=0,this.tier==="r3"?this.tier="ss":this.tier==="ss"&&(this.tier="bypass"),this.applyEngine())}updateAv(){let t=this.ctx?Math.round((this.ctx.outputLatency||0)*1e3):0,e=this.wetWanted?this._status.engineLatencyMs+Math.round(j*1e3):this.matchedReady&&this.ctx?Math.round(this.dryDelay.delayTime.value*1e3):0,a=this.ctx?Math.round(this.ctx.baseLatency*1e3):0;this.emit({outputLatencyMs:t,avOffsetMs:t+e+a})}watchSilence(){let t=()=>{if(!this.ctx||!this.src)return;let e=this.video,a=!e.paused&&!e.ended&&e.readyState>=3&&!e.muted&&e.volume>0,i=this.level(),n=performance.now();a&&i<1e-4?this.silentSince?n-this.silentSince>2500&&this._status.fault!=="drm-silent"&&this.emit({fault:"drm-silent"}):this.silentSince=n:(this.silentSince=0,this._status.fault==="drm-silent"&&this.emit({fault:null})),setTimeout(t,500)};setTimeout(t,1500)}};var X=`
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
`;var ft='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',$=`
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
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,vt=`
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
</svg>`,yt=`
<svg viewBox="0 0 80 90" aria-hidden="true">
  <ellipse cx="40" cy="60" rx="30" ry="26" fill="#d9c4a7"/><ellipse cx="40" cy="63" rx="18" ry="16" fill="#efe1c8"/><circle cx="40" cy="32" r="21" fill="#d9c4a7"/>
  <ellipse cx="18" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(-30 18 18)"/><ellipse cx="62" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(30 62 18)"/>
  <circle cx="32" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="48" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="33" cy="29" r="1" fill="#fff"/><circle cx="49" cy="29" r="1" fill="#fff"/>
  <path d="M36 39 q4 4 8 0" fill="none" stroke="#5a4634" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M22 62 l-12 10 M58 62 l12 10" stroke="#c9b092" stroke-width="9" stroke-linecap="round"/>
  <path d="M30 52 l4 -3 l4 3 l4 -3 l4 3" fill="none" stroke="#8b6f52" stroke-width="1" stroke-dasharray="2 2"/>
  <rect x="34" y="70" width="12" height="7" rx="1" fill="#f3f1ea"/><text x="40" y="75.5" font-size="4.5" text-anchor="middle" font-family="Space Mono,monospace" fill="#111">YGG</text>
</svg>`,xt=`
<div class="root" data-collapsed="0" data-small="0">
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${$}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls">${vt}</div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${$}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${$}</div>
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
    <div class="cons-ctl absorb">${$}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${ft}</button>
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
    <div class="row hiderow"><button class="big" data-a="hide">Hide dock \xB7 absorb into Kari</button></div>
    <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
    <a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a>
  </aside>
  <button class="plush" data-el="plush" aria-label="Plush trophy">${yt}</button>
</div>`,M=330,S=200,C=120,D=52,J=8,_=class{constructor(t,e){this.host=t;this.deps=e;let a=document.createElement("div");this.wrap=a,a.id="kari-dock",a.dataset.build="0.1.0+0210c628",a.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=a.attachShadow({mode:"open"});let i=document.createElement("style");i.textContent=X,this.shadow.appendChild(i);let n=document.createElement("template");n.innerHTML=xt,this.shadow.appendChild(n.content.cloneNode(!0)),t.appendChild(a),this.root=this.shadow.querySelector(".root"),this.seedStars(),this.wire(),this.applySettings(e.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=t=>this.shadow.querySelector(`[data-el="${t}"]`);$$=t=>Array.from(this.shadow.querySelectorAll(t));status=null;raf=0;visible=!0;consDrag=!1;destroy(){cancelAnimationFrame(this.raf),this.host.querySelector("#kari-dock")?.remove()}setStatus(t){this.status=t;let e=this.el("fault"),a=t.fault==="drm-silent"?"this video's audio is protected \u2014 Kari can't touch it":t.fault==="capture-failed"?"couldn't reach the audio on this page":t.fault==="worklet-failed"?"engine hiccup \u2014 playing untouched audio":"";e.hidden=!a,e.textContent=a,this.shadow.querySelector(".org")?.setAttribute("data-fault",t.fault?"1":"0"),this.render()}setControlsHidden(t){this.root.dataset.hiddenWithControls=t?"1":"0"}setSmall(t){this.root.dataset.small=t?"1":"0"}applySettings(t){this.$$(".skin").forEach(a=>a.hidden=a.dataset.skin!==t.skin),this.$$(".chip[data-skin]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.skin===t.skin)));let e=this.shadow.querySelector(".org");e.dataset.kari=t.kariColor,e.dataset.cap=t.cap?"1":"0",e.dataset.shades=t.shades?"1":"0",e.dataset.shoes=t.shoes?"1":"0",this.$$("[data-kari]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.kari===t.kariColor))),this.$$("input[data-set]").forEach(a=>a.checked=!!t[a.dataset.set]),this.el("plush").hidden=!t.plush,this.root.dataset.collapsed=t.collapsed?"1":"0",this.$$(".ctl").forEach(a=>a.dataset.full=t.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(a=>a.setAttribute("aria-pressed",String(t.fullControl))),this.el("intro").hidden=t.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=t}react(){let t=this.el("bubble");t.classList.remove("go"),t.getBBox?.(),t.classList.add("go"),["i1","i2"].forEach(e=>{let a=this.el(e);a.classList.add("lit"),setTimeout(()=>a.classList.remove("lit"),700)})}render(){let t=this.deps.getParams(),e=this.status,a={speed:q(t.tempo),st:U(t.st),bpm:e?.baseRate&&Math.abs(e.baseRate-1)>.001?`yt ${e.baseRate.toFixed(2)}\xD7`:"",keypair:`${I(J,0)} \u2192 ${I(J,t.st)}`,engine:e?e.engine==="r3"?"R3":e.engine==="ss"?"SS":"wire":"\u2014",av:e?e.attached?`${e.avOffsetMs} ms`:"0 ms":"\u2014"};this.$$("[data-b]").forEach(i=>{let n=a[i.dataset.b];n!==void 0&&i.textContent!==n&&(i.textContent=n)}),this.$$('[data-b="av"]').forEach(i=>i.classList.toggle("warn",!!e&&e.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(i=>{i.min=String(-t.range),i.max=String(t.range),+i.value!==t.tempo&&(i.value=String(t.tempo))}),this.$$('[data-a="lock"]').forEach(i=>i.setAttribute("aria-pressed",String(t.keyLock))),this.$$('[data-a="vinyl"]').forEach(i=>i.setAttribute("aria-pressed",String(!t.keyLock))),this.$$('[data-a="range"]').forEach(i=>i.setAttribute("aria-pressed",String(+i.dataset.v===t.range))),this.shadow.querySelector(".void").dataset.off=T(t)?"1":"0",this.renderCons(t)}wire(){let t=this.shadow;t.addEventListener("click",r=>{let o=r.target.closest("[data-a]");if(!o)return;let p=o.dataset.a,h=this.deps.getParams(),m=A=>{this.deps.apply(A),this.react(),this.render()};switch(p){case"st+":m(k(h,1));break;case"st-":m(k(h,-1));break;case"tempo+":m(x(h,1));break;case"tempo-":m(x(h,-1));break;case"lock":m({...h,keyLock:!0});break;case"vinyl":m({...h,keyLock:!1});break;case"reset":m({...f,range:h.range,keyLock:h.keyLock});break;case"range":m(Y(h,+o.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break}});let e=r=>{let o=r.target;return o.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(r.key):o.matches('button, [role="button"], input[type="checkbox"], a')?r.key==="Enter"||r.key===" ":!1};t.addEventListener("keydown",r=>{let o=r,p=o.target.closest('[role="button"][data-a]');p&&(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),p.click()),e(o)&&o.stopPropagation()}),t.addEventListener("keyup",r=>{e(r)&&r.stopPropagation()}),t.addEventListener("mousedown",r=>{r.target.closest('button, [role="button"]')&&r.preventDefault()}),t.addEventListener("input",r=>{let o=r.target;if(o.matches('input[data-a="tempo"]')){let p=this.deps.getParams();this.deps.apply({...p,tempo:+o.value}),this.render()}}),t.addEventListener("change",r=>{let o=r.target;o.matches('input[data-a="tempo"]')&&this.react(),o.dataset.set&&this.deps.saveSettings({[o.dataset.set]:o.checked})}),t.addEventListener("pointerdown",r=>{let o=r.target.closest('[data-a="compare"]');o&&(this.hold(!0),o.setPointerCapture?.(r.pointerId))}),["pointerup","pointercancel"].forEach(r=>t.addEventListener(r,()=>{this.holding&&this.hold(!1)})),t.addEventListener("keydown",r=>{let o=r;o.target.closest('[data-a="compare"]')&&o.key===" "&&!o.repeat&&(o.preventDefault(),this.hold(!0))}),t.addEventListener("keyup",r=>{let o=r;o.target.closest('[data-a="compare"]')&&o.key===" "&&(o.preventDefault(),this.hold(!1))});let a=this.el("gear"),i=this.el("settings");a.addEventListener("click",()=>{let r=i.hidden;i.hidden=!r,a.setAttribute("aria-expanded",String(r))}),i.addEventListener("click",r=>{r.target.closest('[data-s="close"]')&&(i.hidden=!0,a.setAttribute("aria-expanded","false"))}),this.$$("[data-skin].chip").forEach(r=>r.addEventListener("click",()=>this.deps.saveSettings({skin:r.dataset.skin}))),this.$$("[data-kari]").forEach(r=>r.addEventListener("click",()=>{this.deps.saveSettings({kariColor:r.dataset.kari}),this.react()}));let n=this.el("plush");n.addEventListener("click",()=>{n.classList.remove("poke"),n.offsetWidth,n.classList.add("poke"),this.react()});let c=this.el("consSvg"),l=r=>{let o=c.getBoundingClientRect(),p=(r.clientX-o.left)/o.width*640,h=(r.clientY-o.top)/o.height*360,m=Math.atan2((p-M)/C,-(h-S)/D);return Math.max(-12,Math.min(12,Math.round(m/Math.PI*12)))};c.addEventListener("pointerdown",r=>{if(!this.deps.settings.collapsed&&r.target.closest(".hit,.moon")){this.consDrag=!0,c.setPointerCapture(r.pointerId);let o=l(r),p=this.deps.getParams();o!==p.st&&(this.deps.apply({...p,st:o}),this.render())}}),c.addEventListener("pointermove",r=>{if(!this.consDrag)return;let o=l(r),p=this.deps.getParams();o!==p.st&&(this.deps.apply({...p,st:o}),this.render())}),["pointerup","pointercancel"].forEach(r=>c.addEventListener(r,()=>{this.consDrag&&(this.consDrag=!1,this.react())})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(r=>this.wrap.addEventListener(r,o=>o.stopPropagation()))}holding=!1;hold(t){this.holding=t,this.deps.setCompare(t),this.$$('[data-a="compare"]').forEach(e=>e.dataset.held=t?"1":"0")}startPulse(){let t=0,e=0,a=i=>{if(this.raf=requestAnimationFrame(a),document.hidden||i-t<33||(t=i,!!this.shadow.querySelector('.skin[data-skin="org"]').hidden))return;let c=this.deps.level();e=Math.max(c,e*.85);let l=1+Math.min(.08,e*.35),r=1-Math.min(.06,e*.25);this.el("beat").style.transform=`scale(${l.toFixed(3)},${r.toFixed(3)})`};this.raf=requestAnimationFrame(a)}seedStars(){let t=this.el("starfield"),e="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((n,c)=>{let l=c%3===0?9:6;e+=`<path class="star" transform="translate(${n[0]} ${n[1]})" d="M0 -${l} L${l*.3} -${l*.3} L${l} 0 L${l*.3} ${l*.3} L0 ${l} L-${l*.3} ${l*.3} L-${l} 0 L-${l*.3} -${l*.3}Z"/>`}),t.innerHTML=e;let i="";for(let n=-12;n<=12;n+=3){let c=n/12*Math.PI;i+=`<line class="tick" x1="${(M+Math.sin(c)*(C+4)).toFixed(1)}" y1="${(S-Math.cos(c)*(D+4)).toFixed(1)}" x2="${(M+Math.sin(c)*(C-4)).toFixed(1)}" y2="${(S-Math.cos(c)*(D-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=i}renderCons(t){let e=t.st/12*Math.PI,a=M+Math.sin(e)*C,i=S-Math.cos(e)*D,n=this.el("moon"),c=this.el("ray");n.setAttribute("cx",a.toFixed(1)),n.setAttribute("cy",i.toFixed(1)),c.setAttribute("x2",a.toFixed(1)),c.setAttribute("y2",i.toFixed(1));let l=this.$$(".star");l.forEach(P=>P.classList.remove("lit")),l.length&&l[(t.st%l.length+l.length)%l.length].classList.add("lit");let r=this.el("tempoArc"),o=170,p=Math.max(-50,Math.min(50,t.tempo))/50,h=Math.PI*.62,m=h+p*.45,A=P=>[M+Math.cos(P)*o,S+Math.sin(P)*o*.55],[dt,pt]=A(h),[ht,ut]=A(m);r.setAttribute("d",`M${dt.toFixed(1)} ${pt.toFixed(1)} A${o} ${(o*.55).toFixed(1)} 0 0 ${p>=0?1:0} ${ht.toFixed(1)} ${ut.toFixed(1)}`)}};var Q=()=>location.hostname.endsWith("youtube.com")&&location.pathname==="/watch",tt=()=>new URLSearchParams(location.search).get("v")||"";function N(){return document.querySelector("#movie_player video.html5-main-video")||document.querySelector("#movie_player video")||null}var w=()=>document.getElementById("movie_player");function et(s=15e3){return new Promise(t=>{let e=N();if(e)return t(e);let a=new MutationObserver(()=>{let n=N();n&&(a.disconnect(),clearTimeout(i),t(n))});a.observe(document.documentElement,{childList:!0,subtree:!0});let i=setTimeout(()=>{a.disconnect(),t(N())},s)})}function at(s){let t=location.href,e=()=>{location.href!==t&&(t=location.href,s())};document.addEventListener("yt-navigate-finish",()=>{t="",e()});let a=new MutationObserver(e);return a.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("popstate",e),()=>a.disconnect()}var Z=()=>{let s=w();return!!s&&(s.classList.contains("ad-showing")||s.classList.contains("ad-interrupting"))};function st(s){let t=Z();s(t);let e=()=>{let a=w();return a?(new MutationObserver(()=>{let n=Z();n!==t&&(t=n,s(n))}).observe(a,{attributes:!0,attributeFilter:["class"]}),!0):!1};if(!e()){let a=new MutationObserver(()=>{e()&&a.disconnect()});a.observe(document.documentElement,{childList:!0,subtree:!0})}}var v=()=>{let s=w();return!!s&&s.classList.contains("ytp-player-minimized")},it=()=>{let s=w();return!!s&&s.classList.contains("ytp-autohide")};var V={skin:"org",kariColor:"blue",cap:!1,shades:!1,shoes:!1,plush:!0,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1},E="kari.settings",H="kari.video.";function kt(){let s={};try{let t=globalThis.chrome?.storage?.sync;if(t)return{get:e=>t.get(e),set:e=>t.set(e),remove:e=>t.remove(e)}}catch{}return{async get(t){let e=Array.isArray(t)?t:[t],a={};for(let i of e)i in s&&(a[i]=s[i]);return a},async set(t){Object.assign(s,t)},async remove(t){delete s[t]}}}var L=kt();async function B(){try{let s=await L.get(E);return{...V,...s[E]||{}}}catch{return{...V}}}async function rt(s){let e={...await B(),...s};try{await L.set({[E]:e})}catch{}return e}function ot(s){try{globalThis.chrome?.storage?.onChanged?.addListener((t,e)=>{e==="sync"&&t[E]&&s({...V,...t[E].newValue})})}catch{}}async function nt(s){try{return(await L.get(H+s))[H+s]||null}catch{return null}}async function lt(s,t){try{t?await L.set({[H+s]:t}):await L.remove(H+s)}catch{}}var g=null,d=null,u={...f},b,y="",ct=0,O="",wt={worklet:chrome.runtime.getURL("worklet.js"),wasm:chrome.runtime.getURL("rubberband.wasm")};async function z(s){u=s,await g?.apply(s),b.rememberPerVideo&&y&&(clearTimeout(ct),ct=window.setTimeout(()=>{let t=T(s)?null:{st:s.st,cents:s.cents,tempo:s.tempo,keyLock:s.keyLock,range:s.range},e=y+":"+(t?JSON.stringify(t):"");e!==O&&(O=e,lt(y,t).then(()=>console.debug("[kari] saved",y,t?JSON.stringify(t):"cleared")))},400))}async function G(){if(!Q()&&!v()){Mt();return}let s=await et(),t=w();if(!s||!t)return;getComputedStyle(t).position==="static"&&(t.style.position="relative"),b=b||await B();let e=tt()||(v()?y:"");if(e!==y){y=e;let a=b.rememberPerVideo?await nt(e):null;u=a?{...f,...a}:{...f,range:b.defaultRange,keyLock:b.keyLockDefault},O=e+":"+(a?JSON.stringify({st:u.st,cents:u.cents,tempo:u.tempo,keyLock:u.keyLock,range:u.range}):""),console.debug("[kari] mount",e,"memory:",a?JSON.stringify(a):"none")}g?g.rebind(s):(g=new R(s,wt),g.setEnginePreference(b.engine)),d&&!t.contains(d.hostEl)&&(d.destroy(),d=null),d?d.render():(d=new _(t,{getParams:()=>u,apply:a=>{z(a)},setCompare:a=>g?.setCompare(a),settings:b,saveSettings:a=>{rt(a).then(i=>{b=i,d?.applySettings(i),a.engine&&g?.setEnginePreference(i.engine)})},level:()=>g?.level()??0,optionsUrl:chrome.runtime.getURL("options.html")}),g.onStatus(a=>d?.setStatus(a)),st(a=>g?.setAds(a)),St(t)),await z(u)}function Mt(){d?.destroy(),d=null}function St(s){let t=v();new MutationObserver(()=>{d?.setControlsHidden(it()),d?.setSmall(v()||s.clientWidth<520);let a=v();a!==t&&(t=a,G())}).observe(s,{attributes:!0,attributeFilter:["class"]}),new ResizeObserver(()=>d?.setSmall(v()||s.clientWidth<520)).observe(s)}chrome.runtime.onMessage.addListener(s=>{if(s?.type!=="kari:command"||!d)return;let e={"pitch-up":()=>k(u,1),"pitch-down":()=>k(u,-1),"tempo-up":()=>x(u,1),"tempo-down":()=>x(u,-1)}[s.command];e&&(z(e()),d.react(),d.render())});globalThis.__kari={get params(){return u},get audio(){return g},get dock(){return d},get settings(){return b},apply:s=>z(s)};ot(s=>{b=s,d?.applySettings(s),g?.setEnginePreference(s.engine)});at(()=>{G()});G();})();
