"use strict";(()=>{var le=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],At={st:12,cents:50,tempoRanges:[8,16,50]},nt=(s,t,e)=>Math.min(e,Math.max(t,s));function Tt(s){let t=1+s.tempo/100,e=Math.pow(2,(s.st+s.cents/100)/12),a=s.keyLock?e/t:e,i=Math.abs(a-1)>1e-6;return{rate:t,keyRatio:e,engineRatio:a,engineActive:i,attached:i}}function lt(s,t,e=!0){let a=((s+t)%12+12)%12;return le[a]+(e?"m":"")}var Pt=s=>(1+s/100).toFixed(2)+"\xD7",Rt=(s,t=0)=>(s>0?"+":s<0?"\u2212":"")+Math.abs(s).toFixed(t);function _(s,t){return{...s,tempo:nt(+(s.tempo+t).toFixed(1),-s.range,s.range)}}function C(s,t){return{...s,st:nt(s.st+t,-At.st,At.st)}}function Bt(s,t){return{...s,range:t,tempo:nt(s.tempo,-t,t)}}var K=s=>s.st===0&&s.cents===0&&s.tempo===0,A={st:0,cents:0,tempo:0,range:50,keyLock:!1};var _t=[.5,1,4,8];var dt=40,pt=300,Ct=s=>Math.min(pt,Math.max(dt,s)),de=s=>60/s.bpm;function pe(s,t,e){let a=de(s)*e;return s.phase+Math.floor((t-s.phase)/a+1e-9)*a}function ce(s,t,e,a){return Math.round(t*60/s.bpm/e*a)}function $t(s,t,e,a,i){let r=pe(s,t,i),l=ce(s,i,e,a),p=Math.min(l,Math.max(0,Math.round((t-r)/e*a)));return{lenFrames:l,backFrames:p,startMedia:r}}function Dt(s,t,e,a="manual"){return{bpm:Ct(t),phase:s?s.phase:e,source:a}}var Ft=(s,t)=>({...s,bpm:Ct(+(s.bpm+t).toFixed(1)),source:"manual"}),O=s=>(Math.round(s*10)/10).toFixed(1).replace(/\.0$/,""),ct=s=>s===.5?"\xBD":s===1?"1":s===4?"1 bar":"2 bars",It=s=>s===.5?"Loop half a beat":s===1?"Loop one beat":s===4?"Loop one bar":"Loop two bars";function he(s){let t=[...s].sort((a,i)=>a-i),e=t.length>>1;return t.length%2?t[e]:(t[e-1]+t[e])/2}function Ot(s){if(s.length<2)return null;let t=[];for(let e=Math.max(1,s.length-8);e<s.length;e++)t.push(s[e]-s[e-1]);return 60/he(t)}var U=class{taps=[];tap(t){let e=this.taps[this.taps.length-1];if(e!==void 0){let a=t-e;if(a<.2&&a>=0)return Ot(this.taps);(a>2||a<0)&&(this.taps=[])}return this.taps.push(t),this.taps.length>9&&this.taps.shift(),Ot(this.taps)}get count(){return this.taps.length}reset(){this.taps=[]}};var ue=6,me=2,zt=60,fe=200,Gt=80,Nt=160,be=.35,ge=.5,$=1,ve=.5,Ht=.5;function Y(s){let t=s<Gt?Math.log2(Gt/s):s>Nt?Math.log2(s/Nt):0;return Math.max(.4,1-1.2*t)}var ut=class{size;odf;low;time;w=0;nov;lnov;ord;dt;constructor(t,e=ue){this.dt=t,this.size=Math.max(64,Math.round(e/t)),this.odf=new Float32Array(this.size),this.low=new Float32Array(this.size),this.time=new Float64Array(this.size),this.nov=new Float32Array(this.size),this.lnov=new Float32Array(this.size),this.ord=new Float32Array(this.size)}get count(){return Math.min(this.w,this.size)}get full(){return this.w>=this.size}push(t,e,a){let i=this.w%this.size;this.odf[i]=t,this.low[i]=e,this.time[i]=a,this.w++}reset(){this.w=0}novelty(t,e){let a=this.count,i=this.w-a,r=Math.max(1,Math.round(ge/this.dt/2));for(let h=0;h<a;h++)e[h]=t[(i+h)%this.size];let l=this.ord,p=0,n=0,o=-1;for(let h=0;h<a;h++){let g=Math.max(0,h-r),w=Math.min(a-1,h+r);for(;o<w;)p+=e[++o];for(;n<g;)p-=e[n++];l[h]=p/(w-g+1)}let u=0;for(let h=0;h<a;h++){let g=e[h]-l[h];e[h]=g>0?g:0,g>0&&(l[u++]=g)}if(!u)return;let f=l.subarray(0,u).slice().sort(),c=f[Math.min(u-1,Math.floor(u*.95))]||f[u-1];if(c>0)for(let h=0;h<a;h++)e[h]/=c}tooth(t,e,a){let i=Math.round(a),r=0;for(let l=i-$;l<=i+$;l++)l>=0&&l<e&&t[l]>r&&(r=t[l]);return r}comb(t,e,a,i){let r=0,l=0;for(let p=i;p>=-$;p-=a)r+=this.tooth(t,e,p),l++;return{sum:r,teeth:l}}analyze(){let t=this.count;if(t<2*Math.round(60/(zt*this.dt)))return null;let e=this.nov,a=this.lnov;this.novelty(this.odf,e),this.novelty(this.low,a);let i=0,r=0;for(let d=0;d<t;d++)i+=e[d],r+=e[d]*e[d];if(!(i>0)||!(r>0))return null;let l=Math.max(2,Math.floor(60/(fe*this.dt))),p=Math.min(t>>1,Math.ceil(60/(zt*this.dt)));if(p<=l)return null;let n=d=>60/(d*this.dt),o=this.ord;o.fill(0);for(let d=l;d<=p;d++){let v=0;for(let S=0;S+d<t;S++)v+=e[S]*e[S+d];o[d]=v/r*Y(n(d))}let u=[];for(let d=l;d<=p;d++)o[d]>0&&o[d]>=(o[d-1]||0)&&o[d]>=(o[d+1]||0)&&u.push(d);u.sort((d,v)=>o[v]-o[d]),u.length=Math.min(u.length,4);let f=[],c=d=>{d>=l&&d<=p&&!f.some(v=>Math.abs(v-d)<1.5)&&f.push(d)};for(let d of u)c(d),c(d/2),c(d*2);if(!f.length)return null;let h=null;for(let d of f){let v=t-1,S=-1;for(let y=t-1;y>t-1-d;y--){let M=this.comb(e,t,d,y);M.sum>S&&(S=M.sum,v=y)}let E=Math.sqrt(Math.min(1,o[Math.round(d)]/Y(n(Math.round(d)))/Ht));for(let y=d-1.5;y<=d+1.5;y+=.05){if(y<l-.5||y>p+.5)continue;let M=Y(n(y))*E;for(let V=v-2;V<=v+2;V+=.25){let rt=this.comb(e,t,y,V),St=rt.sum/rt.teeth,Et=rt.sum/i,Lt=St*Et*M;(!h||Lt>h.score)&&(h={tau:y,end:V,score:Lt,P:St,E:Et})}}}if(!h)return null;let g=0,w=0,I=0,H=0,T=0,L=0;for(let d=h.end;d>=0;d-=h.tau,L++){let v=Math.round(d),S=0,E=0;for(let M=v-$;M<=v+$;M++)M>=0&&M<t&&(S+=M*e[M],E+=e[M]);if(E<=0)continue;let y=S/E;g+=E,w+=E*L,I+=E*y,H+=E*L*L,T+=E*L*y}let P=h.tau,W=h.end,kt=g*H-w*w;if(g>0&&kt>1e-9){let d=(g*T-w*I)/kt,v=(I-d*w)/g;Math.abs(-d-h.tau)<1&&(P=-d,W=v)}let ot=[0,0,0,0];L=0;for(let d=W;d>=-$;d-=P,L++)ot[L&3]+=this.tooth(a,t,d);let q=0;for(let d=1;d<4;d++)ot[d]>ot[q]&&(q=d);let wt=d=>{let v=Math.max(0,Math.min(t-1,Math.round(d)));return this.time[(this.w-t+v)%this.size]+(d-v+ve)*this.dt},Mt=o[Math.round(P)]/Y(n(Math.round(P)));return{bpm:n(P),beat:wt(W),phase:wt(W-q*P),confidence:Math.min(1,Math.sqrt(Math.min(1,h.P)*h.E)*Math.sqrt(Math.min(1,Mt/Ht))),period:P,precision:h.P,explained:h.E,downbeatClass:q,autocorr:Mt}}};function Wt(s,t){return t.blocked||t.muted?"off":t.gesture&&s!=="found"?"gesture":s==="idle"||s==="learning"&&!t.heard?"idle":s}var ye=.001,ht=20,X=class{name="auto";active=!1;frozen=!1;muted=!1;tracker=null;rate=1;played=0;sinceRun=0;lastConf=0;pending=null;_state="idle";_last=null;fed=0;skipped={paused:0,silent:0};lastRms=0;runs=0;quiet=ht;gridCb=null;stateCb=null;clock;constructor(t){this.clock=t}get state(){return this._state}get last(){return this._last}get debug(){return{state:this._state,fed:this.fed,played:this.played,skipped:{...this.skipped},lastRms:this.lastRms,runs:this.runs,rate:this.rate,window:this.tracker?.count??0,lastConf:this.lastConf,frozen:this.frozen,muted:this.muted,active:this.active}}start(t,e){this.active=!0,this.setState(this.muted?"idle":"learning")}stop(){this.active=!1,this.setState("idle")}onGrid(t){this.gridCb=t}onState(t){this.stateCb=t}reset(){this.tracker=null,this.played=0,this.sinceRun=0,this.pending=null,this.quiet=ht,this.lastConf*=.5,this.active&&!this.muted&&this.setState("learning")}freeze(t){if(this.frozen=t,!t&&this.pending){let e=this.pending;this.pending=null,this.emit(e)}}mute(t){t!==this.muted&&(this.muted=t,t?(this.pending=null,this.setState("idle")):this.active&&(this.lastConf=0,this.reset()))}get listening(){return this.active&&!this.muted}get isMuted(){return this.muted}get heard(){return this.played}setState(t){t!==this._state&&(this._state=t,this.stateCb?.(t))}feed(t){if(!this.listening||!t||t.odf.length===0)return;this.fed++,this.lastRms=t.rms;let e=this.clock();if(!e.playing){this.skipped.paused++;return}if(t.rms>=ye)this.quiet=0;else if(++this.quiet>ht){this.skipped.silent++;return}let a=e.rate>0?e.rate:1;this.tracker&&Math.abs(a-this.rate)>.001&&this.reset(),this.tracker||(this.rate=a,this.tracker=new ut(t.hop*a));let i=e.media-(e.ctx-t.t)*a,r=t.hop*a;for(let u=0;u<t.odf.length;u++)this.tracker.push(t.odf[u],t.low[u],i+u*r);let l=this.played===0;this.played+=t.odf.length,this.sinceRun+=t.odf.length,l&&this._state==="learning"&&this.stateCb?.(this._state);let p=this.tracker.size,n=Math.round(me/t.hop);if(this.played<p||this.sinceRun<n)return;this.sinceRun=0,this.runs++;let o=this.tracker.analyze();this._last=o,o&&o.confidence>=be&&o.confidence>=this.lastConf*.85?this.publish(o):this._state==="learning"&&this.played>=2*p&&this.setState("none")}publish(t){if(this.frozen){this.pending=t;return}this.emit(t)}emit(t){this.lastConf=t.confidence,this.setState("found"),this.gridCb?.({bpm:t.bpm,phase:t.phase,source:"auto"})}};var xe=.04,ke=Math.pow(10,-.57/20),qt=.006,j=class s{constructor(t,e,a=null){this.video=t;this.urls=e;this.ext=a;this.detector.onGrid(i=>this.onAutoGrid(i)),this.detector.onState(()=>this.emitTempo()),this.listen(t)}ctx=null;src=null;node=null;dryDirect;dryMatched;wet;dryDelay;matchedReady=!1;analyser;limiter;trim;params={...A};compare=!1;baseRate=1;lastSetRate=1;_status={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1,loop:0,loopMs:0,loopClamped:!1,bpm:null,gridSource:null,tempo:"idle"};latencyFrames={r3:0,ss:0};hotBlocks=0;tier="r3";pinned="auto";silentSince=0;rmsBuf=new Uint8Array(512);listeners=new Set;adActive=!1;wetWanted=!1;engineWarm=!1;lastWantedEngine=null;lastRing=0;routedWet=!1;grid=null;tapper=new U;loopBeats=0;matchedFrames=0;loopMax=(1<<19)-288;detector=new X(()=>{let t=this.video;return{media:t.currentTime,ctx:this.ctx?this.ctx.currentTime:0,rate:t.playbackRate||1,playing:!t.paused&&!t.ended&&t.readyState>=3&&!this.adActive}});static INTERRUPTS=["pause","seeking","ended","emptied"];listen(t){t.addEventListener("ratechange",this.onRateChange);for(let e of s.INTERRUPTS)t.addEventListener(e,this.onInterrupt);t.addEventListener("playing",this.onPlaying),s.isPlaying(t)&&this.onPlaying()}static isPlaying(t){return!t.paused&&!t.ended&&t.readyState>=3}unlisten(t){t.removeEventListener("ratechange",this.onRateChange);for(let e of s.INTERRUPTS)t.removeEventListener(e,this.onInterrupt);t.removeEventListener("playing",this.onPlaying)}onInterrupt=t=>{this.loopBeats&&this.releaseLoop(),(t.type==="seeking"||t.type==="emptied")&&this.detector.reset(),this.emitTempo()};onPlaying=()=>{if(this.src||this.adActive||this.video.mediaKeys){this.emitTempo();return}this.attach().then(()=>this.apply(this.params,!0)).catch(()=>{})};waitingGesture=!1;phase(){let t=!!this.video.mediaKeys||this._status.fault==="drm-silent";return Wt(this.detector.state,{muted:this.detector.isMuted,blocked:t,gesture:this.waitingGesture,heard:this.detector.heard>0})}emitTempo(){let t=this.phase();t!==this._status.tempo&&this.emit({tempo:t})}get detectorState(){return this.detector.state}get detectorDebug(){return this.detector.debug}get lastEstimate(){return this.detector.last}flush(){this.node?.port.postMessage({type:"reset"})}noteDrm(){this._status.fault!=="drm-silent"&&(this.emit({fault:"drm-silent"}),this.emitTempo(),this.ext?.speedOnlyOnDrm&&this.apply(this.params,!0))}get speedOnly(){return!!this.ext?.speedOnlyOnDrm&&this._status.fault==="drm-silent"}onStatus(t){return this.listeners.add(t),t(this._status),()=>this.listeners.delete(t)}emit(t){this._status={...this._status,...t};for(let e of this.listeners)e(this._status)}setEnginePreference(t){this.pinned=t,this.tier=t==="signalsmith"?"ss":"r3",this.hotBlocks=0,this.applyEngine()}rebind(t){if(t!==this.video){if(this.unlisten(this.video),this.loopBeats&&this.releaseLoop(),this.video=t,this.detector.reset(),this.listen(t),this.src){try{this.src.disconnect()}catch{}this.src=null,this.emit({attached:!1})}this.apply(this.params,!0)}}setAds(t){t!==this.adActive&&(this.adActive=t,t&&this.loopBeats&&this.releaseLoop(),this.detector.reset(),this.apply(this.params,!0))}getParams(){return this.params}get status(){return this._status}async apply(t,e=!1){this.params=t;let a=Tt(t),i=this.adActive?this.baseRate:this.baseRate*a.rate;this.setVideoRate(i);let r=t.keyLock?a.engineRatio/this.baseRate:a.engineRatio,l=Math.abs(r-1)>1e-6&&!this.speedOnly,p=this.loopBeats>0&&!this.adActive&&!this.speedOnly;if((l&&!this.adActive||this.compare&&!this.speedOnly||p)&&!this.src&&await this.attach(),!this.src)return;let o=this.adActive?1:r;this.node?.port.postMessage({type:"ratio",ratio:o});let u=this.applyEngine(l&&!this.adActive),f=(l||p)&&!this.adActive&&!this.compare;this.wetWanted=f,!f||this.engineWarm?this.route(f,e):u&&this.routedWet&&this.route(!1,e,!0)}getGrid(){return this.grid}setGrid(t){this.grid=t,t||(this.tapper.reset(),this.loopBeats&&this.releaseLoop()),this.detector.mute(!!t&&t.source!=="auto"),this.syncOnset(),this.emit({bpm:t?t.bpm:null,gridSource:t?t.source:null,tempo:this.phase()}),t&&!this.src&&this.attach().catch(()=>{})}onAutoGrid(t){this.grid&&this.grid.source!=="auto"||this.setGrid(t)}tap(){let t=this.video.currentTime,e=this.tapper.tap(t);return e?this.setGrid({bpm:e,phase:t,source:"tap"}):this.grid?.source==="auto"?this.setGrid({bpm:this.grid.bpm,phase:t,source:"tap"}):this.src||this.attach().catch(()=>{}),e}syncOnset(){this.node?.port.postMessage({type:"config",onset:this.detector.listening})}setBpm(t){Number.isFinite(t)&&this.setGrid(Dt(this.grid,t,this.video.currentTime))}nudgeBpm(t){this.grid&&this.setGrid(Ft(this.grid,t))}get loop(){return this.loopBeats}toggleLoop(t){return this.loopBeats===t?(this.releaseLoop(),Promise.resolve(!0)):this.latchLoop(t)}async latchLoop(t){if(!this.grid||this.video.paused||this.video.ended||(this.src||await this.attach(),!this.src||!this.node||!this.ctx))return!1;let e=this.video,a=e.playbackRate||1,i=$t(this.grid,e.currentTime,a,this.ctx.sampleRate,t),r=i.lenFrames>this.loopMax,l=r?this.loopMax:i.lenFrames;return this.node.port.postMessage({type:"loop",on:!0,lenFrames:l,backFrames:Math.min(l,i.backFrames)}),this.loopBeats=t,this.detector.freeze(!0),this.emit({loop:t,loopMs:Math.round(l/this.ctx.sampleRate*1e3),loopClamped:r}),await this.apply(this.params,!0),!0}releaseLoop(){this.loopBeats&&(this.node?.port.postMessage({type:"loop",on:!1}),this.loopBeats=0,this.emit({loop:0,loopMs:0,loopClamped:!1}),this.apply(this.params,!0),this.detector.freeze(!1))}setCompare(t){this.compare=t,this.apply(this.params,!0)}level(){if(!this.analyser)return 0;this.analyser.getByteTimeDomainData(this.rmsBuf);let t=0;for(let e=0;e<this.rmsBuf.length;e++){let a=(this.rmsBuf[e]-128)/128;t+=a*a}return Math.sqrt(t/this.rmsBuf.length)}setVideoRate(t){let e=this.video;try{e.preservesPitch=!1,e.mozPreservesPitch=!1,e.webkitPreservesPitch=!1,Math.abs(e.playbackRate-t)>1e-4?(this.lastSetRate=t,this.ext?this.ext.writeRate(t):e.playbackRate=t):(this.lastSetRate=t,this.ext&&this.ext.writeRate(t))}catch{}}onRateChange=()=>{let t=this.video;t.preservesPitch=!1,Math.abs(t.playbackRate-this.lastSetRate)>.001&&(this.baseRate=t.playbackRate,this.emit({baseRate:this.baseRate}),this.apply(this.params,!0)),this.detector.reset()};attaching=null;async attach(){return this.attaching?this.attaching:(this.attaching=this._attach().finally(()=>{this.attaching=null}),this.attaching)}async waitForActivation(){navigator.userActivation?.hasBeenActive||await new Promise(t=>{let e=()=>{window.removeEventListener("pointerdown",e,!0),window.removeEventListener("keydown",e,!0),t()};window.addEventListener("pointerdown",e,!0),window.addEventListener("keydown",e,!0)})}contextRunning(t,e){return t.state==="running"?Promise.resolve(!0):new Promise(a=>{let i=!1,r=p=>{i||(i=!0,t.removeEventListener("statechange",l),a(p))},l=()=>{t.state==="running"&&r(!0)};t.addEventListener("statechange",l),t.resume().then(()=>r(!0),()=>r(t.state==="running")),setTimeout(()=>r(t.state==="running"),e)})}async _attach(){let t=this.ext;if(!this.src)try{let e=t?t.ctx:new AudioContext({latencyHint:"interactive"});if(!t&&!await this.contextRunning(e,400)){this.waitingGesture=!0,this.emitTempo(),await this.waitForActivation(),this.waitingGesture=!1;try{await e.resume()}catch{}this.emitTempo()}this.ctx=e,t?await t.loadWorklet(e):await e.audioWorklet.addModule(this.urls.worklet);let a=t?await t.wasm():await(await fetch(this.urls.wasm)).arrayBuffer(),i=t?t.src:e.createMediaElementSource(this.video);if(this.src=i,this.dryDirect=e.createGain(),this.dryMatched=e.createGain(),this.wet=e.createGain(),this.dryDelay=e.createDelay(1),this.matchedReady=!1,this.limiter=e.createDynamicsCompressor(),this.limiter.threshold.value=-1,this.limiter.knee.value=0,this.limiter.ratio.value=20,this.limiter.attack.value=.001,this.limiter.release.value=.05,this.trim=e.createGain(),this.trim.gain.value=ke,this.analyser=e.createAnalyser(),this.analyser.fftSize=512,this.node=new AudioWorkletNode(e,"kari-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{rbWasm:a,engine:this.tier}}),this.node.port.onmessage=r=>this.onWorklet(r.data),this.node.onprocessorerror=()=>{this.emit({fault:"worklet-failed",engine:"bypass"}),this.route(!1,!0)},i.connect(this.dryDirect),this.dryDirect.connect(this.analyser),i.connect(this.dryDelay),this.dryDelay.connect(this.dryMatched),this.dryMatched.connect(this.analyser),i.connect(this.node),this.node.connect(this.wet),this.wet.connect(this.limiter),this.limiter.connect(this.trim),this.trim.connect(this.analyser),this.analyser.connect(t?t.sink:e.destination),this.detector.start(e,i),this.syncOnset(),this.dryDirect.gain.value=1,this.dryMatched.gain.value=0,this.wet.gain.value=0,t?.onWired?.(),!t||t.ownsContext){if(e.state!=="running")try{await e.resume()}catch{}if(e.state!=="running"){let r=()=>{e.resume(),window.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",r,!0)};window.addEventListener("pointerdown",r,!0),window.addEventListener("keydown",r,!0)}}this.emit({attached:!0,outputLatencyMs:Math.round((e.outputLatency||0)*1e3)}),this.watchSilence()}catch{this.waitingGesture=!1,this.emit({fault:"capture-failed",attached:!1}),this.src=null,this.emitTempo()}}setMatchedDelay(t){if(!this.ctx)return;let e=Math.min(.99,t/this.ctx.sampleRate+qt);this.matchedReady&&!this.wetWanted&&this.dryMatched.gain.value>.01?this.dryDelay.delayTime.setTargetAtTime(e,this.ctx.currentTime,.05):this.dryDelay.delayTime.setValueAtTime(e,this.ctx.currentTime),this.matchedReady=!0,this.matchedFrames=t,this.node?.port.postMessage({type:"config",bypassDelay:t})}route(t,e,a=!1){if(a||(this.wetWanted=t),this.routedWet=t,!this.ctx)return;let i=this.ctx.currentTime,r=xe/3,l=!t&&this.matchedReady,p=!t&&!this.matchedReady;this.wet.gain.setTargetAtTime(t?1:0,i,r),this.dryMatched.gain.setTargetAtTime(l?1:0,i,r),this.dryDirect.gain.setTargetAtTime(p?1:0,i,r),this.updateAv()}applyEngine(t=!0){if(!this.node)return!1;let e=t?this.tier:"bypass",a=e!==this.lastWantedEngine;return a&&(this.engineWarm=!1,this.lastWantedEngine=e,this.hotBlocks=0),this.node.port.postMessage({type:"engine",engine:e}),a}onWorklet(t){switch(t.type){case"ready":this.latencyFrames={r3:t.latency.r3||0,ss:t.latency.ss||0},typeof t.loopMax=="number"&&t.loopMax>0&&(this.loopMax=t.loopMax);break;case"onset":this.detector.feed(t);break;case"engine":this.emit({engine:t.engine,engineLatencyMs:Math.round((t.latency||0)/(this.ctx?.sampleRate||48e3)*1e3)}),this.updateAv();break;case"warm":{typeof t.latency=="number"&&t.engine!=="bypass"&&(this.latencyFrames[t.engine]=t.latency,this.emit({engineLatencyMs:Math.round(t.latency/(this.ctx?.sampleRate||48e3)*1e3)}),this.setMatchedDelay(t.latency)),this.engineWarm=!0,this.route(this.wetWanted,!0);break}case"stats":{let e=t.budgetMs?t.avgBlockMs/t.budgetMs:0;this.lastRing=t.ringFrames||0,this.emit({underruns:t.underruns,load:e}),this.updateAv(),this.stepdown(e,t.underruns);break}case"error":this.emit({engine:"bypass",fault:t.where==="process"?"worklet-failed":this._status.fault});break}}lastUnderruns=0;stepdown(t,e){if(this.pinned!=="auto")return;let a=e-this.lastUnderruns;this.lastUnderruns=e,t>.85||a>5?this.hotBlocks++:this.hotBlocks=Math.max(0,this.hotBlocks-1),this.hotBlocks>=4&&(this.hotBlocks=0,this.tier==="r3"?this.tier="ss":this.tier==="ss"&&(this.tier="bypass"),this.applyEngine())}updateAv(){let t=this.ctx?Math.round((this.ctx.outputLatency||0)*1e3):0,e=this.wetWanted?this._status.engineLatencyMs+Math.round(qt*1e3):this.matchedReady&&this.ctx?Math.round(this.dryDelay.delayTime.value*1e3):0,a=this.ctx?Math.round(this.ctx.baseLatency*1e3):0;this.emit({outputLatencyMs:t,avOffsetMs:t+e+a})}watchSilence(){let t=this.ext?.silenceMs??2500,e=-1,a=()=>{if(!this.ctx||!this.src)return;let i=this.video,r=!i.paused&&!i.ended&&i.readyState>=3&&!i.muted&&i.volume>0,l=this.ext?i.currentTime>e:!0;e=i.currentTime;let p=!!this.ext&&!!i.mediaKeys,n=this.level(),o=performance.now();r&&(p||n<1e-4&&l)?this.silentSince?(p||o-this.silentSince>t)&&this._status.fault!=="drm-silent"&&(this.emit({fault:"drm-silent"}),this.speedOnly&&this.apply(this.params,!0)):this.silentSince=o:(this.silentSince=0,this._status.fault==="drm-silent"&&(this.emit({fault:null}),this.ext?.speedOnlyOnDrm&&this.apply(this.params,!0))),setTimeout(a,500)};setTimeout(a,1500)}};var Vt=`
:host{display:block;position:absolute;inset:0;pointer-events:none;z-index:60;font-size:14px;line-height:1.3;text-align:left;letter-spacing:normal;text-transform:none}
*,*::before,*::after{box-sizing:border-box}
.root{position:absolute;inset:0;z-index:60;pointer-events:none;font-family:"Instrument Sans",system-ui,-apple-system,"Helvetica Neue",sans-serif;color:#efece4;
  --ink:#07070b;--bone:#efece4;--bone-2:#b9b6ad;--mute:#6d6c76;--cyan:#5cf2ff;--amber:#ffb454;--rose:#ff7ad9;--line:rgba(239,236,228,.14);
  --ease-out:cubic-bezier(.23,1,.32,1);--ease-in-out:cubic-bezier(.77,0,.175,1);--mono:"Space Mono",ui-monospace,Menlo,monospace}
/* Fade with YouTube's controls: the panel, the gear, the settings and the constellation's figures go (visibility, not
   just opacity, so faded controls cannot take clicks meant for the player); Kari's anchor (the blob, the orb, the
   cloudlet, the moon) never does. v1 faded the whole root, and opacity on a parent cannot be undone by a child, so the
   blob vanished a few seconds into playback (Jesse, 2026-10-15). */
.absorb,.gear,.settings,.intro,.fault,.plush,.suncap{transition:opacity 200ms ease,visibility 0s linear 0s}
.root[data-hidden-with-controls="1"]:not([data-collapsed="1"]) :is(.absorb,.gear,.settings,.intro,.fault,.plush,.suncap,.cons .lab,.cons .lab2,.cons .orbit,.cons .tick,.cons .arc,.cons .sun,.cons .ray,.cons .star){opacity:0;visibility:hidden;pointer-events:none;transition:opacity 200ms ease,visibility 0s linear 200ms}
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
.root[data-bar-hidden="1"]{visibility:hidden;pointer-events:none}
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
`;var we={off:"",idle:"play to learn",gesture:"click to learn",learning:"learning\u2026",none:"tap"};function Kt(s,t){if(!t)return{state:"off",text:""};let e=s?.bpm??null;if(e)return{state:"found",text:`${O(e)} bpm`};let a=s?.tempo??"idle",i=a==="found"?"idle":a;return{state:i,text:we[i]}}var Me={yt:{"drm-silent":"this video's audio is protected \u2014 Kari can't touch it","capture-failed":"couldn't reach the audio on this page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page so Kari can reach the player"},sc:{"drm-silent":"this track's audio is protected \u2014 speed only","capture-failed":"couldn't reach SoundCloud's player \u2014 reload the page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page once \u2014 Kari arrived after SoundCloud set up its player"}},Se={"0.5":"loop-h",1:"loop-1",4:"loop-bar",8:"loop-2bar",tap:"tap"},Ee=_t.map(s=>`<button class="pill loop" data-a="loop" data-v="${s}" aria-pressed="false" aria-label="${It(s)}" disabled>${ct(s)}</button>`).join(""),Le='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',J=`
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00\xD7</span></b><span class="p ro">pitch <span data-b="st">0</span><span data-b="yt"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">\u2212</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">\u2212</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="loops">${Ee}<span class="tro ro" data-b="tempo" data-state="idle" aria-live="polite"></span></div>
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
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">\u2212</button><input class="bpm ro" type="number" min="${dt}" max="${pt}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span><span>loop <em class="ro" data-b="loopinfo">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,Ae=`
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
</svg>`,Te=`
<svg viewBox="0 0 80 90" aria-hidden="true">
  <ellipse cx="40" cy="60" rx="30" ry="26" fill="#d9c4a7"/><ellipse cx="40" cy="63" rx="18" ry="16" fill="#efe1c8"/><circle cx="40" cy="32" r="21" fill="#d9c4a7"/>
  <ellipse cx="18" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(-30 18 18)"/><ellipse cx="62" cy="18" rx="9" ry="12" fill="#c9b092" transform="rotate(30 62 18)"/>
  <circle cx="32" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="48" cy="30" r="3.2" fill="#1a1a1a"/><circle cx="33" cy="29" r="1" fill="#fff"/><circle cx="49" cy="29" r="1" fill="#fff"/>
  <path d="M36 39 q4 4 8 0" fill="none" stroke="#5a4634" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M22 62 l-12 10 M58 62 l12 10" stroke="#c9b092" stroke-width="9" stroke-linecap="round"/>
  <path d="M30 52 l4 -3 l4 3 l4 -3 l4 3" fill="none" stroke="#8b6f52" stroke-width="1" stroke-dasharray="2 2"/>
  <rect x="34" y="70" width="12" height="7" rx="1" fill="#f3f1ea"/><text x="40" y="75.5" font-size="4.5" text-anchor="middle" font-family="Space Mono,monospace" fill="#111">YGG</text>
</svg>`,Pe=`
<div class="root" data-collapsed="0" data-small="0">
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${J}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls">${Ae}</div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${J}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${J}</div>
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
    <div class="cons-ctl absorb">${J}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${Le}</button>
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
      <span class="mst">learn: switch it on, click a loop length or Tap, then hit the pad \xB7 a pad on the lit length releases</span></div>
    <div class="row hiderow"><button class="big" data-a="hide">Hide dock \xB7 absorb into Kari</button></div>
    <div class="row showrow"><button class="big pri" data-a="show">Show dock</button></div>
    <a class="more" data-el="more" href="#" target="_blank" rel="noopener">More settings</a>
  </aside>
  <button class="plush" data-el="plush" aria-label="Plush trophy">${Te}</button>
</div>`,z=330,G=200,Z=120,Q=52,Ut=8,tt=class{constructor(t,e){this.host=t;this.deps=e;let a=document.createElement("div");this.wrap=a,a.id="kari-dock",a.dataset.build="0.3.1+2cb6519b",a.style.cssText=e.mountStyle||"position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=a.attachShadow({mode:"open"});let i=document.createElement("style");i.textContent=Vt,this.shadow.appendChild(i);let r=document.createElement("template");r.innerHTML=Pe,this.shadow.appendChild(r.content.cloneNode(!0)),t.appendChild(a),this.root=this.shadow.querySelector(".root"),this.root.dataset.site=e.site||"yt",this.seedStars(),this.wire(),this.applySettings(e.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=t=>this.shadow.querySelector(`[data-el="${t}"]`);$$=t=>Array.from(this.shadow.querySelectorAll(t));status=null;midiState=null;learnOn=!1;raf=0;visible=!0;consDrag=!1;destroy(){cancelAnimationFrame(this.raf),this.host.querySelector("#kari-dock")?.remove()}setStatus(t){this.status=t;let e=this.el("fault"),a=t.fault&&Me[this.deps.site||"yt"][t.fault]||"";e.hidden=!a,e.textContent=a,this.shadow.querySelector(".org")?.setAttribute("data-fault",t.fault?"1":"0"),this.render()}setControlsHidden(t){this.root.dataset.hiddenWithControls=t?"1":"0"}setBarHidden(t){this.root.dataset.barHidden=t?"1":"0"}setMidiState(t){this.midiState=t;let e=t.learning;this.$$("[data-arm]").forEach(r=>{e||r.removeAttribute("data-arm")});let a=t.supported?t.error?t.error:t.connected?`${t.inputs} input${t.inputs===1?"":"s"}${t.lastNote!==null?` \xB7 note ${t.lastNote}`:""}${e?" \xB7 hit a pad":""}`:"not connected":"no Web MIDI here",i=this.el("midist");i&&i.textContent!==a&&(i.textContent=a),this.render()}setSmall(t){this.root.dataset.small=t?"1":"0"}applySettings(t){this.$$(".skin").forEach(a=>a.hidden=a.dataset.skin!==t.skin),this.$$(".chip[data-skin]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.skin===t.skin)));let e=this.shadow.querySelector(".org");e.dataset.kari=t.kariColor,e.dataset.cap=t.cap?"1":"0",e.dataset.shades=t.shades?"1":"0",e.dataset.shoes=t.shoes?"1":"0",this.$$("[data-kari]").forEach(a=>a.setAttribute("aria-pressed",String(a.dataset.kari===t.kariColor))),this.$$("input[data-set]").forEach(a=>a.checked=!!t[a.dataset.set]),this.el("plush").hidden=!t.plush,this.root.dataset.collapsed=t.collapsed?"1":"0",this.$$(".ctl").forEach(a=>a.dataset.full=t.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(a=>a.setAttribute("aria-pressed",String(t.fullControl))),this.el("intro").hidden=t.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=t}react(){let t=this.el("bubble");t.classList.remove("go"),t.getBBox?.(),t.classList.add("go"),["i1","i2"].forEach(e=>{let a=this.el(e);a.classList.add("lit"),setTimeout(()=>a.classList.remove("lit"),700)})}render(){let t=this.deps.getParams(),e=this.status,a=e?.bpm??null,i=e?.loop??0,r=e?.baseRate&&Math.abs(e.baseRate-1)>.001?` \xB7 ${this.deps.site==="sc"?"sc":"yt"} ${e.baseRate.toFixed(2)}\xD7`:"",{state:l,text:p}=Kt(e,!!this.deps.loop),n={speed:Pt(t.tempo),st:Rt(t.st),yt:r,bpm:a?`${O(a)} bpm`:"",tempo:p,keypair:`${lt(Ut,0)} \u2192 ${lt(Ut,t.st)}`,engine:e?e.engine==="r3"?"R3":e.engine==="ss"?"SS":"wire":"\u2014",av:e?e.attached?`${e.avOffsetMs} ms`:"0 ms":"\u2014",loopinfo:this.deps.loop?i?`${ct(i)} \xB7 ${e.loopMs} ms${e.loopClamped?" \xB7 at the ring's ceiling":""}`:a?"\u2014":"no tempo yet":"\u2014"};this.$$("[data-b]").forEach(c=>{let h=n[c.dataset.b];h!==void 0&&c.textContent!==h&&(c.textContent=h)});let o=this.shadow.querySelector(".loops");o&&(o.hidden=!this.deps.loop),this.$$('[data-b="tempo"]').forEach(c=>{c.dataset.state!==l&&(c.dataset.state=l)});let u=this.shadow.querySelector('[data-el="midisg"]');u&&(u.hidden=!this.deps.midi),this.$$('[data-a="loop"]').forEach(c=>{let h=i>0&&+c.dataset.v===i;c.setAttribute("aria-pressed",String(h)),c.disabled=!a,h&&c.style.setProperty("--loop-ms",`${e.loopMs}ms`)}),this.$$('[data-a="bpm-"],[data-a="bpm+"]').forEach(c=>{c.disabled=!a}),this.$$('input[data-a="bpm"]').forEach(c=>{if(this.shadow.activeElement===c)return;let h=a?O(a):"";c.value!==h&&(c.value=h)});let f=this.midiState;this.$$('[data-a="midi"]').forEach(c=>{c.setAttribute("aria-pressed",String(!!f?.connected))}),this.$$('[data-m="learn"]').forEach(c=>c.setAttribute("aria-pressed",String(this.learnOn))),this.$$('[data-b="av"]').forEach(c=>c.classList.toggle("warn",!!e&&e.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(c=>{c.min=String(-t.range),c.max=String(t.range),+c.value!==t.tempo&&(c.value=String(t.tempo))}),this.$$('[data-a="lock"]').forEach(c=>c.setAttribute("aria-pressed",String(t.keyLock))),this.$$('[data-a="vinyl"]').forEach(c=>c.setAttribute("aria-pressed",String(!t.keyLock))),this.$$('[data-a="range"]').forEach(c=>c.setAttribute("aria-pressed",String(+c.dataset.v===t.range))),this.shadow.querySelector(".void").dataset.off=K(t)?"1":"0",this.renderCons(t)}wire(){let t=this.shadow;t.addEventListener("click",n=>{let o=n.target.closest("[data-a]");if(!o)return;let u=o.dataset.a,f=this.deps.getParams(),c=h=>{this.deps.apply(h),this.react(),this.render()};switch(u){case"st+":c(C(f,1));break;case"st-":c(C(f,-1));break;case"tempo+":c(_(f,1));break;case"tempo-":c(_(f,-1));break;case"lock":c({...f,keyLock:!0});break;case"vinyl":c({...f,keyLock:!1});break;case"reset":c({...A,range:f.range,keyLock:f.keyLock});break;case"range":c(Bt(f,+o.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break;case"loop":case"tap":{let h=u==="loop"?o.dataset.v:"tap";if(this.learnOn&&this.midiState?.connected){this.$$("[data-arm]").forEach(g=>g.removeAttribute("data-arm")),o.dataset.arm="1",this.deps.midi?.learn(Se[h]);break}if(u==="loop"){let g=+o.dataset.v;(this.status?.loop??0)===g?this.deps.loop?.release():this.deps.loop?.latch(g)?.then(w=>{w&&this.react(),this.render()})}else this.deps.loop?.tap(),this.react();this.render();break}case"bpm-":this.deps.loop?.nudge(-1),this.render();break;case"bpm+":this.deps.loop?.nudge(1),this.render();break;case"midi":this.deps.midi?.connect()?.then(()=>this.render());break}}),t.addEventListener("click",n=>{let o=n.target.closest("[data-m]");o&&(o.dataset.m==="connect"&&this.deps.midi?.connect()?.then(()=>this.render()),o.dataset.m==="learn"&&(this.learnOn=!this.learnOn,this.learnOn||(this.deps.midi?.learn(null),this.$$("[data-arm]").forEach(u=>u.removeAttribute("data-arm"))),this.render()))});let e=n=>{let o=n.target;return o.matches('input[type="number"]')?!0:o.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(n.key):o.matches('button, [role="button"], input[type="checkbox"], a')?n.key==="Enter"||n.key===" ":!1};t.addEventListener("keydown",n=>{let o=n,u=o.target.closest('[role="button"][data-a]');u&&(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),u.click()),o.target.matches('input[data-a="bpm"]')&&(o.key==="Enter"||o.key==="Escape")&&(o.preventDefault(),o.target.blur()),e(o)&&o.stopPropagation()}),t.addEventListener("keyup",n=>{e(n)&&n.stopPropagation()}),t.addEventListener("mousedown",n=>{n.target.closest('button, [role="button"]')&&n.preventDefault()}),t.addEventListener("input",n=>{let o=n.target;if(o.matches('input[data-a="tempo"]')){let u=this.deps.getParams();this.deps.apply({...u,tempo:+o.value}),this.render()}}),t.addEventListener("change",n=>{let o=n.target;if(o.matches('input[data-a="tempo"]')&&this.react(),o.matches('input[data-a="bpm"]')){let u=parseFloat(o.value);Number.isFinite(u)&&(this.deps.loop?.setBpm(u),this.react()),this.render()}o.dataset.set&&this.deps.saveSettings({[o.dataset.set]:o.checked})}),t.addEventListener("pointerdown",n=>{let o=n.target.closest('[data-a="compare"]');o&&(this.hold(!0),o.setPointerCapture?.(n.pointerId))}),["pointerup","pointercancel"].forEach(n=>t.addEventListener(n,()=>{this.holding&&this.hold(!1)})),t.addEventListener("keydown",n=>{let o=n;o.target.closest('[data-a="compare"]')&&o.key===" "&&!o.repeat&&(o.preventDefault(),this.hold(!0))}),t.addEventListener("keyup",n=>{let o=n;o.target.closest('[data-a="compare"]')&&o.key===" "&&(o.preventDefault(),this.hold(!1))});let a=this.el("gear"),i=this.el("settings");a.addEventListener("click",()=>{let n=i.hidden;i.hidden=!n,a.setAttribute("aria-expanded",String(n))}),i.addEventListener("click",n=>{n.target.closest('[data-s="close"]')&&(i.hidden=!0,a.setAttribute("aria-expanded","false"))}),this.$$("[data-skin].chip").forEach(n=>n.addEventListener("click",()=>this.deps.saveSettings({skin:n.dataset.skin}))),this.$$("[data-kari]").forEach(n=>n.addEventListener("click",()=>{this.deps.saveSettings({kariColor:n.dataset.kari}),this.react()}));let r=this.el("plush");r.addEventListener("click",()=>{r.classList.remove("poke"),r.offsetWidth,r.classList.add("poke"),this.react()});let l=this.el("consSvg"),p=n=>{let o=l.getBoundingClientRect(),u=(n.clientX-o.left)/o.width*640,f=(n.clientY-o.top)/o.height*360,c=Math.atan2((u-z)/Z,-(f-G)/Q);return Math.max(-12,Math.min(12,Math.round(c/Math.PI*12)))};l.addEventListener("pointerdown",n=>{if(!this.deps.settings.collapsed&&n.target.closest(".hit,.moon")){this.consDrag=!0,l.setPointerCapture(n.pointerId);let o=p(n),u=this.deps.getParams();o!==u.st&&(this.deps.apply({...u,st:o}),this.render())}}),l.addEventListener("pointermove",n=>{if(!this.consDrag)return;let o=p(n),u=this.deps.getParams();o!==u.st&&(this.deps.apply({...u,st:o}),this.render())}),["pointerup","pointercancel"].forEach(n=>l.addEventListener(n,()=>{this.consDrag&&(this.consDrag=!1,this.react())})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(n=>this.wrap.addEventListener(n,o=>o.stopPropagation()))}holding=!1;hold(t){this.holding=t,this.deps.setCompare(t),this.$$('[data-a="compare"]').forEach(e=>e.dataset.held=t?"1":"0")}startPulse(){let t=0,e=0,a=i=>{if(this.raf=requestAnimationFrame(a),document.hidden||i-t<33||(t=i,!!this.shadow.querySelector('.skin[data-skin="org"]').hidden))return;let l=this.deps.level();e=Math.max(l,e*.85);let p=1+Math.min(.08,e*.35),n=1-Math.min(.06,e*.25);this.el("beat").style.transform=`scale(${p.toFixed(3)},${n.toFixed(3)})`};this.raf=requestAnimationFrame(a)}seedStars(){let t=this.el("starfield"),e="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((r,l)=>{let p=l%3===0?9:6;e+=`<path class="star" transform="translate(${r[0]} ${r[1]})" d="M0 -${p} L${p*.3} -${p*.3} L${p} 0 L${p*.3} ${p*.3} L0 ${p} L-${p*.3} ${p*.3} L-${p} 0 L-${p*.3} -${p*.3}Z"/>`}),t.innerHTML=e;let i="";for(let r=-12;r<=12;r+=3){let l=r/12*Math.PI;i+=`<line class="tick" x1="${(z+Math.sin(l)*(Z+4)).toFixed(1)}" y1="${(G-Math.cos(l)*(Q+4)).toFixed(1)}" x2="${(z+Math.sin(l)*(Z-4)).toFixed(1)}" y2="${(G-Math.cos(l)*(Q-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=i}renderCons(t){let e=t.st/12*Math.PI,a=z+Math.sin(e)*Z,i=G-Math.cos(e)*Q,r=this.el("moon"),l=this.el("ray");r.setAttribute("cx",a.toFixed(1)),r.setAttribute("cy",i.toFixed(1)),l.setAttribute("x2",a.toFixed(1)),l.setAttribute("y2",i.toFixed(1));let p=this.$$(".star");p.forEach(T=>T.classList.remove("lit")),p.length&&p[(t.st%p.length+p.length)%p.length].classList.add("lit");let n=this.el("tempoArc"),o=170,u=Math.max(-50,Math.min(50,t.tempo))/50,f=Math.PI*.62,c=f+u*.45,h=T=>[z+Math.cos(T)*o,G+Math.sin(T)*o*.55],[g,w]=h(f),[I,H]=h(c);n.setAttribute("d",`M${g.toFixed(1)} ${w.toFixed(1)} A${o} ${(o*.55).toFixed(1)} 0 0 ${u>=0?1:0} ${I.toFixed(1)} ${H.toFixed(1)}`)}};var Xt=()=>location.hostname.endsWith("youtube.com")&&location.pathname==="/watch",jt=()=>new URLSearchParams(location.search).get("v")||"";function mt(){return document.querySelector("#movie_player video.html5-main-video")||document.querySelector("#movie_player video")||null}var D=()=>document.getElementById("movie_player");function Jt(s=15e3){return new Promise(t=>{let e=mt();if(e)return t(e);let a=new MutationObserver(()=>{let r=mt();r&&(a.disconnect(),clearTimeout(i),t(r))});a.observe(document.documentElement,{childList:!0,subtree:!0});let i=setTimeout(()=>{a.disconnect(),t(mt())},s)})}function Zt(s){let t=location.href,e=()=>{location.href!==t&&(t=location.href,s())};document.addEventListener("yt-navigate-finish",()=>{t="",e()});let a=new MutationObserver(e);return a.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("popstate",e),()=>a.disconnect()}var Yt=()=>{let s=D();return!!s&&(s.classList.contains("ad-showing")||s.classList.contains("ad-interrupting"))};function Qt(s){let t=Yt();s(t);let e=()=>{let a=D();return a?(new MutationObserver(()=>{let r=Yt();r!==t&&(t=r,s(r))}).observe(a,{attributes:!0,attributeFilter:["class"]}),!0):!1};if(!e()){let a=new MutationObserver(()=>{e()&&a.disconnect()});a.observe(document.documentElement,{childList:!0,subtree:!0})}}var R=()=>{let s=D();return!!s&&s.classList.contains("ytp-player-minimized")},te=()=>{let s=D();return!!s&&s.classList.contains("ytp-autohide")};var ft={skin:"org",kariColor:"blue",cap:!1,shades:!1,shoes:!1,plush:!0,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1},N="kari.settings",bt="kari.video.";function ee(s){let t={};try{let e=globalThis.chrome?.storage?.[s];if(e)return{get:a=>e.get(a),set:a=>e.set(a),remove:a=>e.remove(a)}}catch{}return{async get(e){let a=Array.isArray(e)?e:[e],i={};for(let r of a)r in t&&(i[r]=t[r]);return i},async set(e){Object.assign(t,e)},async remove(e){delete t[e]}}}var et=ee("sync"),at=ee("local");async function gt(){try{let s=await et.get(N);return{...ft,...s[N]||{}}}catch{return{...ft}}}async function vt(s){let e={...await gt(),...s};try{await et.set({[N]:e})}catch{}return e}function ae(s){try{globalThis.chrome?.storage?.onChanged?.addListener((t,e)=>{e==="sync"&&t[N]&&s({...ft,...t[N].newValue})})}catch{}}async function se(s){let t=bt+s;try{let e=await at.get(t);if(e[t])return e[t];let i=(await et.get(t))[t]||null;if(i)try{await at.set({[t]:i}),await et.remove(t)}catch{}return i}catch{return null}}async function ie(s,t){try{t?await at.set({[bt+s]:t}):await at.remove(bt+s)}catch{}}var re=["loop-h","loop-1","loop-bar","loop-2bar","tap"],Re={"loop-h":36,"loop-1":37,"loop-bar":38,"loop-2bar":39,tap:40};function oe(s){let t={...Re};if(s&&typeof s=="object")for(let e of re){let a=s[e];typeof a=="number"&&Number.isInteger(a)&&a>=0&&a<=127&&(t[e]=a)}return t}var st=class{access=null;map;_state={supported:typeof navigator<"u"&&"requestMIDIAccess"in navigator,connected:!1,inputs:0,learning:null,lastNote:null,error:null};onAction;onMap;onState;constructor(t,e,a,i){this.onAction=e,this.onMap=a,this.onState=i,this.map=oe(t)}get state(){return this._state}get mapping(){return this.map}noteFor(t){return this.map[t]}set(t){this._state={...this._state,...t},this.onState(this._state)}async connect(){if(!this._state.supported)return this.set({error:"no Web MIDI in this browser"}),!1;if(this.access)return!0;try{let t=await navigator.requestMIDIAccess({sysex:!1});this.access=t;let e=()=>{let a=0;t.inputs.forEach(i=>{i.onmidimessage=this.onMessage,a++}),this.set({connected:a>0,inputs:a,error:a?null:"no MIDI inputs"})};return t.onstatechange=e,e(),this._state.connected}catch(t){return this.set({error:String(t?.message||t),connected:!1}),!1}}learn(t){this.set({learning:t})}setMap(t){this.map=oe(t)}onMessage=t=>{let e=t.data;if(!e||e.length<3)return;let a=e[0]&240,i=e[1],r=e[2];if(!(a!==144||r===0)){if(this.set({lastNote:i}),this._state.learning){let l=this._state.learning;this.map={...this.map,[l]:i},this.onMap(this.map),this.set({learning:null});return}for(let l of re)if(this.map[l]===i){this.onAction(l);return}}}};var m=null,b=null,F=null,x={...A},k,B="",ne=0,yt="",Be={worklet:chrome.runtime.getURL("worklet.js"),wasm:chrome.runtime.getURL("rubberband.wasm")};async function it(s){x=s,await m?.apply(s),k.rememberPerVideo&&B&&(clearTimeout(ne),ne=window.setTimeout(()=>{let t=K(s)?null:{st:s.st,cents:s.cents,tempo:s.tempo,keyLock:s.keyLock,range:s.range},e=B+":"+(t?JSON.stringify(t):"");e!==yt&&(yt=e,ie(B,t).then(()=>console.debug("[kari] saved",B,t?JSON.stringify(t):"cleared")))},400))}var _e={"loop-h":.5,"loop-1":1,"loop-bar":4,"loop-2bar":8};function Ce(s){if(!m)return;let t=_e[s];t?m.toggleLoop(t).then(e=>{e&&b?.react(),b?.render()}):s==="tap"&&(m.tap(),b?.react()),b?.render()}async function xt(){if(!Xt()&&!R()){$e();return}let s=await Jt(),t=D();if(!s||!t)return;getComputedStyle(t).position==="static"&&(t.style.position="relative"),k=k||await gt();let e=jt()||(R()?B:"");if(e!==B){B=e;let a=k.rememberPerVideo?await se(e):null;x=a?{...A,...a}:{...A,range:k.defaultRange,keyLock:k.keyLockDefault},yt=e+":"+(a?JSON.stringify({st:x.st,cents:x.cents,tempo:x.tempo,keyLock:x.keyLock,range:x.range}):""),console.debug("[kari] mount",e,"memory:",a?JSON.stringify(a):"none"),m?.setGrid(null)}m?m.rebind(s):(m=new j(s,Be),m.setEnginePreference(k.engine)),F||(F=new st(k.midiMap,Ce,a=>{vt({midiMap:a}).then(i=>{k=i})},a=>b?.setMidiState(a))),b&&!t.contains(b.hostEl)&&(b.destroy(),b=null),b?b.render():(b=new tt(t,{getParams:()=>x,apply:a=>{it(a)},setCompare:a=>m?.setCompare(a),settings:k,saveSettings:a=>{vt(a).then(i=>{k=i,b?.applySettings(i),a.engine&&m?.setEnginePreference(i.engine)})},level:()=>m?.level()??0,optionsUrl:chrome.runtime.getURL("options.html"),loop:{latch:a=>m?m.latchLoop(a):Promise.resolve(!1),release:()=>m?.releaseLoop(),tap:()=>m?.tap()??null,setBpm:a=>m?.setBpm(a),nudge:a=>m?.nudgeBpm(a)},midi:F}),b.setMidiState(F.state),m.onStatus(a=>b?.setStatus(a)),Qt(a=>m?.setAds(a)),De(t)),await it(x)}function $e(){b?.destroy(),b=null}function De(s){let t=R();new MutationObserver(()=>{b?.setControlsHidden(te()),b?.setSmall(R()||s.clientWidth<520);let a=R();a!==t&&(t=a,xt())}).observe(s,{attributes:!0,attributeFilter:["class"]}),new ResizeObserver(()=>b?.setSmall(R()||s.clientWidth<520)).observe(s)}chrome.runtime.onMessage.addListener(s=>{if(s?.type!=="kari:command"||!b)return;let e={"pitch-up":()=>C(x,1),"pitch-down":()=>C(x,-1),"tempo-up":()=>_(x,1),"tempo-down":()=>_(x,-1)}[s.command];e&&(it(e()),b.react(),b.render())});globalThis.__kari={get params(){return x},get audio(){return m},get dock(){return b},get settings(){return k},apply:s=>it(s),get grid(){return m?.getGrid()??null},get midi(){return F},tap:()=>m?.tap()??null,setBpm:s=>m?.setBpm(s),latch:s=>m?.latchLoop(s),release:()=>m?.releaseLoop(),toggle:s=>m?.toggleLoop(s),get tempo(){return m?.detectorState??null},get estimate(){return m?.lastEstimate??null},get tempoDebug(){return m?.detectorDebug??null}};ae(s=>{k=s,b?.applySettings(s),m?.setEnginePreference(s.engine),F?.setMap(s.midiMap||{})});Zt(()=>{xt()});xt();})();
