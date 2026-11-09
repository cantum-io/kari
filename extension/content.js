"use strict";(()=>{var Ve=["C","D\u266D","D","E\u266D","E","F","G\u266D","G","A\u266D","A","B\u266D","B"],zt={st:12,cents:50,tempoRanges:[8,16,50]},gt=(a,t,e)=>Math.min(e,Math.max(t,a));function Gt(a){let t=1+a.tempo/100,e=Math.pow(2,(a.st+a.cents/100)/12),s=a.keyLock?e/t:e,r=Math.abs(s-1)>1e-6;return{rate:t,keyRatio:e,engineRatio:s,engineActive:r,attached:r}}function yt(a,t,e=!0){let s=((a+t)%12+12)%12;return Ve[s]+(e?"m":"")}var Ut=a=>(1+a/100).toFixed(2)+"\xD7",Wt=(a,t=0)=>(a>0?"+":a<0?"\u2212":"")+Math.abs(a).toFixed(t);function H(a,t){return{...a,tempo:gt(+(a.tempo+t).toFixed(1),-a.range,a.range)}}function N(a,t){return{...a,st:gt(a.st+t,-zt.st,zt.st)}}function qt(a,t){return{...a,range:t,tempo:gt(a.tempo,-t,t)}}var J=a=>a.st===0&&a.cents===0&&a.tempo===0,P={st:0,cents:0,tempo:0,range:50,keyLock:!1};var Vt=[.5,1,4,8];var kt=40,xt=300,Yt=a=>Math.min(xt,Math.max(kt,a)),Ye=a=>60/a.bpm;function Xe(a,t,e){let s=Ye(a)*e;return a.phase+Math.floor((t-a.phase)/s+1e-9)*s}function je(a,t,e,s){return Math.round(t*60/a.bpm/e*s)}function Xt(a,t,e,s,r){let n=Xe(a,t,r),l=je(a,r,e,s),i=Math.min(l,Math.max(0,Math.round((t-n)/e*s)));return{lenFrames:l,backFrames:i,startMedia:n}}function jt(a,t,e,s="manual"){return{bpm:Yt(t),phase:a?a.phase:e,source:s}}var Qt=(a,t)=>({...a,bpm:Yt(+(a.bpm+t).toFixed(1)),source:"manual"}),q=a=>(Math.round(a*10)/10).toFixed(1).replace(/\.0$/,""),vt=a=>a===.5?"\xBD":a===1?"1":a===4?"1 bar":"2 bars",Zt=a=>a===.5?"Loop half a beat":a===1?"Loop one beat":a===4?"Loop one bar":"Loop two bars";function Qe(a){let t=[...a].sort((s,r)=>s-r),e=t.length>>1;return t.length%2?t[e]:(t[e-1]+t[e])/2}function Jt(a){if(a.length<2)return null;let t=[];for(let e=Math.max(1,a.length-8);e<a.length;e++)t.push(a[e]-a[e-1]);return 60/Qe(t)}var tt=class{taps=[];tap(t){let e=this.taps[this.taps.length-1];if(e!==void 0){let s=t-e;if(s<.2&&s>=0)return Jt(this.taps);(s>2||s<0)&&(this.taps=[])}return this.taps.push(t),this.taps.length>9&&this.taps.shift(),Jt(this.taps)}get count(){return this.taps.length}reset(){this.taps=[]}};var Ze=6,Je=2,te=60,ta=200,ee=80,ae=160,ea=.35,aa=.5,K=1,sa=.5,se=.5;function et(a){let t=a<ee?Math.log2(ee/a):a>ae?Math.log2(a/ae):0;return Math.max(.4,1-1.2*t)}var Mt=class{size;odf;low;time;w=0;nov;lnov;ord;dt;constructor(t,e=Ze){this.dt=t,this.size=Math.max(64,Math.round(e/t)),this.odf=new Float32Array(this.size),this.low=new Float32Array(this.size),this.time=new Float64Array(this.size),this.nov=new Float32Array(this.size),this.lnov=new Float32Array(this.size),this.ord=new Float32Array(this.size)}get count(){return Math.min(this.w,this.size)}get full(){return this.w>=this.size}push(t,e,s){let r=this.w%this.size;this.odf[r]=t,this.low[r]=e,this.time[r]=s,this.w++}reset(){this.w=0}novelty(t,e){let s=this.count,r=this.w-s,n=Math.max(1,Math.round(aa/this.dt/2));for(let c=0;c<s;c++)e[c]=t[(r+c)%this.size];let l=this.ord,i=0,o=0,d=-1;for(let c=0;c<s;c++){let b=Math.max(0,c-n),y=Math.min(s-1,c+n);for(;d<y;)i+=e[++d];for(;o<b;)i-=e[o++];l[c]=i/(y-b+1)}let u=0;for(let c=0;c<s;c++){let b=e[c]-l[c];e[c]=b>0?b:0,b>0&&(l[u++]=b)}if(!u)return;let h=l.subarray(0,u).slice().sort(),f=h[Math.min(u-1,Math.floor(u*.95))]||h[u-1];if(f>0)for(let c=0;c<s;c++)e[c]/=f}tooth(t,e,s){let r=Math.round(s),n=0;for(let l=r-K;l<=r+K;l++)l>=0&&l<e&&t[l]>n&&(n=t[l]);return n}comb(t,e,s,r){let n=0,l=0;for(let i=r;i>=-K;i-=s)n+=this.tooth(t,e,i),l++;return{sum:n,teeth:l}}analyze(){let t=this.count;if(t<2*Math.round(60/(te*this.dt)))return null;let e=this.nov,s=this.lnov;this.novelty(this.odf,e),this.novelty(this.low,s);let r=0,n=0;for(let p=0;p<t;p++)r+=e[p],n+=e[p]*e[p];if(!(r>0)||!(n>0))return null;let l=Math.max(2,Math.floor(60/(ta*this.dt))),i=Math.min(t>>1,Math.ceil(60/(te*this.dt)));if(i<=l)return null;let o=p=>60/(p*this.dt),d=this.ord;d.fill(0);for(let p=l;p<=i;p++){let k=0;for(let R=0;R+p<t;R++)k+=e[R]*e[R+p];d[p]=k/n*et(o(p))}let u=[];for(let p=l;p<=i;p++)d[p]>0&&d[p]>=(d[p-1]||0)&&d[p]>=(d[p+1]||0)&&u.push(p);u.sort((p,k)=>d[k]-d[p]),u.length=Math.min(u.length,4);let h=[],f=p=>{p>=l&&p<=i&&!h.some(k=>Math.abs(k-p)<1.5)&&h.push(p)};for(let p of u)f(p),f(p/2),f(p*2);if(!h.length)return null;let c=null;for(let p of h){let k=t-1,R=-1;for(let w=t-1;w>t-1-p;w--){let A=this.comb(e,t,p,w);A.sum>R&&(R=A.sum,k=w)}let _=Math.sqrt(Math.min(1,d[Math.round(p)]/et(o(Math.round(p)))/se));for(let w=p-1.5;w<=p+1.5;w+=.05){if(w<l-.5||w>i+.5)continue;let A=et(o(w))*_;for(let Z=k-2;Z<=k+2;Z+=.25){let bt=this.comb(e,t,w,Z),Ht=bt.sum/bt.teeth,Nt=bt.sum/r,Kt=Ht*Nt*A;(!c||Kt>c.score)&&(c={tau:w,end:Z,score:Kt,P:Ht,E:Nt})}}}if(!c)return null;let b=0,y=0,v=0,S=0,x=0,L=0;for(let p=c.end;p>=0;p-=c.tau,L++){let k=Math.round(p),R=0,_=0;for(let A=k-K;A<=k+K;A++)A>=0&&A<t&&(R+=A*e[A],_+=e[A]);if(_<=0)continue;let w=R/_;b+=_,y+=_*L,v+=_*w,S+=_*L*L,x+=_*L*w}let T=c.tau,D=c.end,I=b*S-y*y;if(b>0&&I>1e-9){let p=(b*x-y*v)/I,k=(v-p*y)/b;Math.abs(-p-c.tau)<1&&(T=-p,D=k)}let O=[0,0,0,0];L=0;for(let p=D;p>=-K;p-=T,L++)O[L&3]+=this.tooth(s,t,p);let Q=0;for(let p=1;p<4;p++)O[p]>O[Q]&&(Q=p);let Ot=p=>{let k=Math.max(0,Math.min(t-1,Math.round(p)));return this.time[(this.w-t+k)%this.size]+(p-k+sa)*this.dt},Dt=d[Math.round(T)]/et(o(Math.round(T)));return{bpm:o(T),beat:Ot(D),phase:Ot(D-Q*T),confidence:Math.min(1,Math.sqrt(Math.min(1,c.P)*c.E)*Math.sqrt(Math.min(1,Dt/se))),period:T,precision:c.P,explained:c.E,downbeatClass:Q,autocorr:Dt}}};function re(a,t){return t.blocked||t.muted?"off":t.gesture&&a!=="found"?"gesture":a==="idle"||a==="learning"&&!t.heard?"idle":a}var ra=.001,wt=20,at=class{name="auto";active=!1;frozen=!1;muted=!1;tracker=null;rate=1;played=0;sinceRun=0;lastConf=0;pending=null;_state="idle";_last=null;fed=0;skipped={paused:0,silent:0};lastRms=0;runs=0;quiet=wt;gridCb=null;stateCb=null;clock;constructor(t){this.clock=t}get state(){return this._state}get last(){return this._last}get debug(){return{state:this._state,fed:this.fed,played:this.played,skipped:{...this.skipped},lastRms:this.lastRms,runs:this.runs,rate:this.rate,window:this.tracker?.count??0,lastConf:this.lastConf,frozen:this.frozen,muted:this.muted,active:this.active}}start(t,e){this.active=!0,this.setState(this.muted?"idle":"learning")}stop(){this.active=!1,this.setState("idle")}onGrid(t){this.gridCb=t}onState(t){this.stateCb=t}reset(){this.tracker=null,this.played=0,this.sinceRun=0,this.pending=null,this.quiet=wt,this.lastConf*=.5,this.active&&!this.muted&&this.setState("learning")}freeze(t){if(this.frozen=t,!t&&this.pending){let e=this.pending;this.pending=null,this.emit(e)}}mute(t){t!==this.muted&&(this.muted=t,t?(this.pending=null,this.setState("idle")):this.active&&(this.lastConf=0,this.reset()))}get listening(){return this.active&&!this.muted}get isMuted(){return this.muted}get heard(){return this.played}setState(t){t!==this._state&&(this._state=t,this.stateCb?.(t))}feed(t){if(!this.listening||!t||t.odf.length===0)return;this.fed++,this.lastRms=t.rms;let e=this.clock();if(!e.playing){this.skipped.paused++;return}if(t.rms>=ra)this.quiet=0;else if(++this.quiet>wt){this.skipped.silent++;return}let s=e.rate>0?e.rate:1;this.tracker&&Math.abs(s-this.rate)>.001&&this.reset(),this.tracker||(this.rate=s,this.tracker=new Mt(t.hop*s));let r=e.media-(e.ctx-t.t)*s,n=t.hop*s;for(let u=0;u<t.odf.length;u++)this.tracker.push(t.odf[u],t.low[u],r+u*n);let l=this.played===0;this.played+=t.odf.length,this.sinceRun+=t.odf.length,l&&this._state==="learning"&&this.stateCb?.(this._state);let i=this.tracker.size,o=Math.round(Je/t.hop);if(this.played<i||this.sinceRun<o)return;this.sinceRun=0,this.runs++;let d=this.tracker.analyze();this._last=d,d&&d.confidence>=ea&&d.confidence>=this.lastConf*.85?this.publish(d):this._state==="learning"&&this.played>=2*i&&this.setState("none")}publish(t){if(this.frozen){this.pending=t;return}this.emit(t)}emit(t){this.lastConf=t.confidence,this.setState("found"),this.gridCb?.({bpm:t.bpm,phase:t.phase,source:"auto"})}};var $=(a,t,e)=>{for(let s=0;s<e.length;s++)a.setUint8(t+s,e.charCodeAt(s))},ia=a=>{if(typeof TextEncoder<"u")return new TextEncoder().encode(a);let t=[];for(let e=0;e<a.length;e++){let s=a.charCodeAt(e);s<128?t.push(s):t.push(63)}return Uint8Array.from(t)};function oa(a){let t=ia(String(a).replace(/[\u0000-\u001f]/g," "));if(t.length<=64)return t;let e=64;for(;e>0&&(t[e]&192)===128;)e--;return t.subarray(0,e)}var st=class a{sampleRate;channels;bits;blockAlign;maxFrames;parts=[];_frames=0;cues=[];finished=!1;constructor(t){let e=Math.round(t.sampleRate),s=Math.round(t.channels),r=t.bits??24;if(!Number.isFinite(e)||e<8e3||e>384e3)throw new RangeError(`sample rate ${t.sampleRate}`);if(!Number.isFinite(s)||s<1||s>2)throw new RangeError(`channels ${t.channels}`);if(r!==16&&r!==24)throw new RangeError(`bits ${r}`);this.sampleRate=e,this.channels=s,this.bits=r,this.blockAlign=s*(r/8),this.maxFrames=Math.floor(4294836178/this.blockAlign)}get frames(){return this._frames}get seconds(){return this._frames/this.sampleRate}get full(){return this._frames>=this.maxFrames}get bytes(){return 44+this._frames*this.blockAlign}get cueCount(){return this.cues.length}write(t,e){if(this.finished)throw new Error("finished");let s=e??(t.length?t[0].length:0),r=Math.max(0,Math.min(s,this.maxFrames-this._frames));if(r===0)return 0;let n=this.channels,l=new Uint8Array(r*this.blockAlign),i=0;if(this.bits===24)for(let o=0;o<r;o++)for(let d=0;d<n;d++){let u=t.length?t[d<t.length?d:t.length-1]:null,h=u?u[o]:0;h!==h&&(h=0);let f=Math.round(h*8388608);f>8388607?f=8388607:f<-8388608&&(f=-8388608),l[i]=f&255,l[i+1]=f>>8&255,l[i+2]=f>>16&255,i+=3}else for(let o=0;o<r;o++)for(let d=0;d<n;d++){let u=t.length?t[d<t.length?d:t.length-1]:null,h=u?u[o]:0;h!==h&&(h=0);let f=Math.round(h*32768);f>32767?f=32767:f<-32768&&(f=-32768),l[i]=f&255,l[i+1]=f>>8&255,i+=2}return this.parts.push(l),this._frames+=r,r}cue(t,e=this._frames){if(this.finished)throw new Error("finished");if(this.cues.length>=1024)return!1;let s=Math.round(e);return!Number.isFinite(s)||s<0||s>this.maxFrames?!1:(this.cues.push({frame:s,label:String(t)}),!0)}finish(){if(this.finished)return this.out;let t=this._frames*this.blockAlign,e=t&1,s=[...this.cues].sort((u,h)=>u.frame-h.frame),r=[],n=0;if(s.length){let u=new Uint8Array(12+24*s.length),h=new DataView(u.buffer);$(h,0,"cue "),h.setUint32(4,4+24*s.length,!0),h.setUint32(8,s.length,!0);let f=[],c=4;s.forEach((v,S)=>{let x=12+24*S;h.setUint32(x,S+1,!0),h.setUint32(x+4,v.frame,!0),$(h,x+8,"data"),h.setUint32(x+12,0,!0),h.setUint32(x+16,0,!0),h.setUint32(x+20,v.frame,!0);let L=oa(v.label),T=4+L.length+1,D=T&1,I=new Uint8Array(8+T+D),O=new DataView(I.buffer);$(O,0,"labl"),O.setUint32(4,T,!0),O.setUint32(8,S+1,!0),I.set(L,12),f.push(I),c+=I.length});let b=new Uint8Array(12),y=new DataView(b.buffer);$(y,0,"LIST"),y.setUint32(4,c,!0),$(y,8,"adtl"),r.push(u,b,...f),n=u.length+b.length+f.reduce((v,S)=>v+S.length,0)}let l=28+(8+t+e)+n;if(l>4294967295)throw new RangeError("file too large for RIFF");let i=new Uint8Array(44),o=new DataView(i.buffer);$(o,0,"RIFF"),o.setUint32(4,l,!0),$(o,8,"WAVE"),$(o,12,"fmt "),o.setUint32(16,16,!0),o.setUint16(20,1,!0),o.setUint16(22,this.channels,!0),o.setUint32(24,this.sampleRate,!0),o.setUint32(28,this.sampleRate*this.blockAlign,!0),o.setUint16(32,this.blockAlign,!0),o.setUint16(34,this.bits,!0),$(o,36,"data"),o.setUint32(40,t,!0);let d=[i,...this.parts];return e&&d.push(new Uint8Array(1)),d.push(...r),this.out=d,this.finished=!0,d}out=null;static encode(t,e,s=[]){let r=new a(e);r.write(t);for(let n of s)r.cue(n.label,n.frame);return r.finish()}},ie=a=>a.reduce((t,e)=>t+e.length,0);function oe(a){return new Blob(a,{type:"audio/wav"})}var ne=60*60,na=a=>{let t=a.data||{};switch(a.kind){case"params":return`pitch ${t.st>=0?"+":""}${t.st} st${t.cents?` ${t.cents>=0?"+":""}${t.cents} c`:""} \xB7 ${(1+(t.tempo||0)/100).toFixed(2)}\xD7${t.keyLock?" \xB7 key lock":""}`;case"loop":return t.beats?`loop ${t.beats} beat${t.beats===1?"":"s"}`:"loop off";case"seek":return`seek ${typeof t.to=="number"?t.to.toFixed(2)+" s":""}`.trim();default:return a.kind}},it=class{constructor(t,e,s,r={}){this.ctx=t;this.tap=e;this.meta=s;this.opts=r}node=null;writer=null;marks=[];holds=[];startFrame=-1;expect=-1;_dropped=0;_peak=0;startedAt="";flushed=null;lastParams="";closed=!1;get on(){return!!this.node&&!this.closed}get holding(){let t=this.holds[this.holds.length-1];return!!t&&t.to===1/0}get frames(){return this.writer?this.writer.frames:0}get seconds(){return this.writer?this.writer.seconds:0}get dropped(){return this._dropped}get peak(){return this._peak}get full(){return!!this.writer&&(this.writer.full||this.writer.seconds>=ne)}now(){return Math.round(this.ctx.currentTime*this.ctx.sampleRate)}start(){if(this.node)return;this.startedAt=new Date().toISOString(),this.writer=new st({sampleRate:this.ctx.sampleRate,channels:2,bits:24});let t=new AudioWorkletNode(this.ctx,"kari-recorder",{numberOfInputs:1,numberOfOutputs:0,channelCount:2,channelCountMode:"explicit",channelInterpretation:"speakers",processorOptions:{chunkFrames:this.opts.chunkFrames,on:!0}});t.port.onmessage=e=>this.onMessage(e.data),this.tap.connect(t),this.node=t,this.lastParams=JSON.stringify(this.meta.params),this.mark("start",{...this.meta.params})}mark(t,e){if(!(!this.node||this.closed)){if(t==="params"){let s=JSON.stringify(e);if(s===this.lastParams)return;this.lastParams=s}this.marks.push({ctx:this.now(),kind:t,data:e})}}hold(){!this.node||this.closed||this.holding||(this.holds.push({from:this.now(),to:1/0}),this.mark("hold"),this.opts.onHold?.(!0))}resume(){!this.node||this.closed||!this.holding||(this.holds[this.holds.length-1].to=this.now(),this.mark("resume"),this.opts.onHold?.(!1))}onMessage(t){if(!(!t||typeof t!="object")){if(t.type==="chunk")this.onChunk(t);else if(t.type==="flushed"&&this.flushed){let e=this.flushed;this.flushed=null,e.resolve()}}}onChunk(t){let e=this.writer;if(!e||this.closed)return;this.startFrame<0&&(this.startFrame=t.frame),this.expect>=0&&t.frame!==this.expect&&(this._dropped+=Math.max(0,t.frame-this.expect)),this.expect=t.frame+t.frames,t.peak>this._peak&&(this._peak=t.peak);let s=t.frame,r=t.frame+t.frames;for(let n of this.holds)if(!(n.to<=s)&&(n.from>=r||(n.from>s&&this.put(t,s-t.frame,n.from-t.frame),s=Math.max(s,n.to),s>=r)))break;s<r&&this.put(t,s-t.frame,r-t.frame),this.opts.onProgress?.(e.frames,t.peak)}put(t,e,s){let r=this.writer;if(s<=e||this.full)return;let n=Math.min(s-e,Math.round(ne*this.ctx.sampleRate)-r.frames);n>0&&r.write(t.data.map(l=>l.subarray(e,e+n)),n)}async stop(){let t=this.node,e=this.writer;if(!t||!e)throw new Error("not recording");if(this.closed)throw new Error("stopped");this.holding&&this.resume();let s=this.now();await new Promise(o=>{this.flushed={resolve:o},t.port.postMessage({type:"rec",on:!1}),setTimeout(()=>{this.flushed&&(this.flushed=null,o())},1500)}),this.closed=!0;try{this.tap.disconnect(t)}catch{}try{t.port.postMessage({type:"close"})}catch{}t.port.onmessage=null,this.node=null,this.marks.push({ctx:s,kind:"stop"});let r=this.startFrame>=0?this.startFrame:s,n=this.marks.map(o=>{let d=Math.max(0,Math.min(e.frames,this.takeFrame(o.ctx,r)));return{frame:d,t:+(d/this.ctx.sampleRate).toFixed(4),kind:o.kind,...o.data?{data:o.data}:{}}});for(let o of n)(o.kind==="params"||o.kind==="loop"||o.kind==="seek")&&e.cue(na(o),o.frame);let l=e.finish(),i={version:1,kari:this.meta.build||"",startedAt:this.startedAt,site:this.meta.site,track:this.meta.track,title:this.meta.title,sampleRate:this.ctx.sampleRate,channels:2,bits:24,frames:e.frames,seconds:+e.seconds.toFixed(4),dropped:this._dropped,peak:+this._peak.toFixed(6),...this.meta.volume!==void 0?{volume:this.meta.volume,muted:!!this.meta.muted}:{},params:this.meta.params,moves:n};return{wav:oe(l),bytes:ie(l),log:i,frames:e.frames,seconds:e.seconds,sampleRate:this.ctx.sampleRate,channels:2,peak:this._peak,dropped:this._dropped,startedAt:this.startedAt}}takeFrame(t,e){let s=0;for(let r of this.holds){if(r.from>=t)break;s+=Math.min(r.to,t)-r.from}return t-e-s}},rt=a=>String(a).padStart(2,"0");function la(a){let t=new Date(a.startedAt),e=a.log.params,s=`${t.getFullYear()}-${rt(t.getMonth()+1)}-${rt(t.getDate())}-${rt(t.getHours())}-${rt(t.getMinutes())}`,r=(a.log.title||a.log.track||"take").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"take";return`kari-${s}-${r}-${e.st>=0?"+":""}${e.st}st-${(1+e.tempo/100).toFixed(2)}x`}function Et(a,t=la(a)){let e=(s,r)=>{let n=URL.createObjectURL(s),l=document.createElement("a");l.href=n,l.download=r,l.rel="noopener",l.style.display="none",document.body.appendChild(l),l.click(),l.remove(),setTimeout(()=>URL.revokeObjectURL(n),6e4)};e(a.wav,`${t}.wav`),e(new Blob([JSON.stringify(a.log,null,2)],{type:"application/json"}),`${t}.moves.json`)}function St(a,t){if(t)return 1;let e=Number.isFinite(a)?Math.min(1,a):1;return 1/Math.max(.05,e)}var ca=.04,da=Math.pow(10,-.57/20),le=.006,ot=class a{constructor(t,e,s=null){this.video=t;this.urls=e;this.ext=s;this.detector.onGrid(r=>this.onAutoGrid(r)),this.detector.onState(()=>this.emitTempo()),this.listen(t)}ctx=null;src=null;node=null;dryDirect;dryMatched;wet;dryDelay;matchedReady=!1;analyser;limiter;trim;params={...P};compare=!1;baseRate=1;lastSetRate=1;_status={attached:!1,engine:"bypass",engineLatencyMs:0,outputLatencyMs:0,avOffsetMs:0,underruns:0,load:0,fault:null,baseRate:1,loop:0,loopMs:0,loopClamped:!1,bpm:null,gridSource:null,tempo:"idle",recording:!1,recSeconds:0,recHeld:!1};latencyFrames={r3:0,ss:0};hotBlocks=0;tier="r3";pinned="auto";silentSince=0;rmsBuf=new Uint8Array(512);listeners=new Set;adActive=!1;parked=!1;wetWanted=!1;engineWarm=!1;lastWantedEngine=null;lastRing=0;routedWet=!1;grid=null;tapper=new tt;loopBeats=0;matchedFrames=0;loopMax=(1<<19)-288;detector=new at(()=>{let t=this.video;return{media:t.currentTime,ctx:this.ctx?this.ctx.currentTime:0,rate:t.playbackRate||1,playing:!t.paused&&!t.ended&&t.readyState>=3&&!this.adActive}});static INTERRUPTS=["pause","seeking","ended","emptied"];listen(t){t.addEventListener("ratechange",this.onRateChange);for(let e of a.INTERRUPTS)t.addEventListener(e,this.onInterrupt);t.addEventListener("playing",this.onPlaying),a.isPlaying(t)&&this.onPlaying()}static isPlaying(t){return!t.paused&&!t.ended&&t.readyState>=3}unlisten(t){t.removeEventListener("ratechange",this.onRateChange);for(let e of a.INTERRUPTS)t.removeEventListener(e,this.onInterrupt);t.removeEventListener("playing",this.onPlaying)}onInterrupt=t=>{this.loopBeats&&this.releaseLoop(),(t.type==="seeking"||t.type==="emptied")&&this.detector.reset(),this.recorder&&(t.type==="seeking"&&this.recorder.mark("seek",{to:this.video.currentTime}),this.recorder.hold()),this.emitTempo()};onPlaying=()=>{if(this.recorder&&!this.adActive&&!this.parked&&!this.takeHidden&&this.recorder.resume(),this.parked||this.src||this.adActive||this.video.mediaKeys){this.emitTempo();return}this.attach().then(()=>this.apply(this.params,!0)).catch(()=>{})};waitingGesture=!1;phase(){let t=!!this.video.mediaKeys||this._status.fault==="drm-silent";return re(this.detector.state,{muted:this.detector.isMuted,blocked:t,gesture:this.waitingGesture,heard:this.detector.heard>0})}emitTempo(){let t=this.phase();t!==this._status.tempo&&this.emit({tempo:t})}get detectorState(){return this.detector.state}get detectorDebug(){return this.detector.debug}get lastEstimate(){return this.detector.last}flush(){this.node?.port.postMessage({type:"reset"})}noteDrm(){this._status.fault!=="drm-silent"&&(this.emit({fault:"drm-silent"}),this.emitTempo(),this.ext?.speedOnlyOnDrm&&this.apply(this.params,!0))}get speedOnly(){return!!this.ext?.speedOnlyOnDrm&&this._status.fault==="drm-silent"}flagDuplicate(){this._status.fault!=="duplicate"&&this.emit({fault:"duplicate"})}onStatus(t){return this.listeners.add(t),t(this._status),()=>this.listeners.delete(t)}emit(t){this._status={...this._status,...t};for(let e of this.listeners)e(this._status)}setEnginePreference(t){this.pinned=t,this.tier=t==="signalsmith"?"ss":"r3",this.hotBlocks=0,this.applyEngine()}rebind(t){if(t!==this.video){if(this.unlisten(this.video),this.loopBeats&&this.releaseLoop(),this.video=t,this.detector.reset(),this.listen(t),this.src){try{this.src.disconnect()}catch{}this.src=null,this.emit({attached:!1})}this.apply(this.params,!0)}}setAds(t){t!==this.adActive&&(this.adActive=t,t&&this.loopBeats&&this.releaseLoop(),this.detector.reset(),this.recorder&&(t?this.recorder.hold():a.isPlaying(this.video)&&!this.parked&&!this.takeHidden&&this.recorder.resume()),this.apply(this.params,!0))}getParams(){return this.params}get status(){return this._status}park(t){if(t===this.parked||(this.parked=t,this.recorder&&(t?this.recorder.hold():a.isPlaying(this.video)&&!this.adActive&&!this.takeHidden&&this.recorder.resume()),!t))return;this.loopBeats&&this.releaseLoop(),this.apply({...this.params,st:0,cents:0,tempo:0,keyLock:!1},!0);let e=this.video;try{e.preservesPitch=!0,e.mozPreservesPitch=!0,e.webkitPreservesPitch=!0}catch{}}get isParked(){return this.parked}async apply(t,e=!1){this.params=t,this.recorder?.mark("params",{st:t.st,cents:t.cents,tempo:t.tempo,keyLock:t.keyLock,range:t.range});let s=Gt(t),r=this.adActive?this.baseRate:this.baseRate*s.rate;this.setVideoRate(r);let n=t.keyLock?s.engineRatio/this.baseRate:s.engineRatio,l=Math.abs(n-1)>1e-6&&!this.speedOnly,i=this.loopBeats>0&&!this.adActive&&!this.speedOnly;if((l&&!this.adActive||this.compare&&!this.speedOnly||i)&&!this.src&&await this.attach(),t!==this.params||!this.src)return;let d=this.adActive?1:n;this.node?.port.postMessage({type:"ratio",ratio:d});let u=this.applyEngine(l&&!this.adActive),h=(l||i)&&!this.adActive&&!this.compare;this.wetWanted=h,!h||this.engineWarm?this.route(h,e):u&&this.routedWet&&this.route(!1,e,!0)}getGrid(){return this.grid}setGrid(t){this.grid=t,t||(this.tapper.reset(),this.loopBeats&&this.releaseLoop()),this.detector.mute(!!t&&t.source!=="auto"),this.syncOnset(),this.emit({bpm:t?t.bpm:null,gridSource:t?t.source:null,tempo:this.phase()}),t&&!this.src&&this.attach().catch(()=>{})}onAutoGrid(t){this.grid&&this.grid.source!=="auto"||this.setGrid(t)}tap(){let t=this.video.currentTime,e=this.tapper.tap(t);return e?this.setGrid({bpm:e,phase:t,source:"tap"}):this.grid?.source==="auto"?this.setGrid({bpm:this.grid.bpm,phase:t,source:"tap"}):this.src||this.attach().catch(()=>{}),e}syncOnset(){this.node?.port.postMessage({type:"config",onset:this.detector.listening})}setBpm(t){Number.isFinite(t)&&this.setGrid(jt(this.grid,t,this.video.currentTime))}nudgeBpm(t){this.grid&&this.setGrid(Qt(this.grid,t))}get loop(){return this.loopBeats}toggleLoop(t){return this.loopBeats===t?(this.releaseLoop(),Promise.resolve(!0)):this.latchLoop(t)}async latchLoop(t){if(this.parked||!this.grid||this.video.paused||this.video.ended||(this.src||await this.attach(),this.parked||!this.src||!this.node||!this.ctx))return!1;let e=this.video,s=e.playbackRate||1,r=Xt(this.grid,e.currentTime,s,this.ctx.sampleRate,t),n=r.lenFrames>this.loopMax,l=n?this.loopMax:r.lenFrames;return this.node.port.postMessage({type:"loop",on:!0,lenFrames:l,backFrames:Math.min(l,r.backFrames)}),this.loopBeats=t,this.recorder?.mark("loop",{beats:t,lenMs:Math.round(l/this.ctx.sampleRate*1e3)}),this.detector.freeze(!0),this.emit({loop:t,loopMs:Math.round(l/this.ctx.sampleRate*1e3),loopClamped:n}),await this.apply(this.params,!0),!0}releaseLoop(){this.loopBeats&&(this.node?.port.postMessage({type:"loop",on:!1}),this.loopBeats=0,this.recorder?.mark("loop",{beats:0}),this.emit({loop:0,loopMs:0,loopClamped:!1}),this.apply(this.params,!0),this.detector.freeze(!1))}recorder=null;recEmit=0;recTap=null;takeHidden=!1;get take(){return this.recorder}holdTake(t){this.takeHidden=t,this.recorder&&(t?this.recorder.hold():a.isPlaying(this.video)&&!this.adActive&&!this.parked&&this.recorder.resume())}async startRecording(t={}){{if(this.recorder)return!0;if(this.parked||(this.src||await this.attach(),!this.src||!this.ctx||!this.analyser||this._status.fault==="drm-silent"))return!1;let e=this.ctx.sampleRate,s=this.ctx,r=this.video,n=s.createGain();n.gain.value=St(r.volume,r.muted),this.analyser.connect(n);let l=new it(s,n,{...t,params:this.params,volume:r.volume,muted:r.muted},{onProgress:o=>{let d=performance.now();d-this.recEmit>250&&(this.recEmit=d,this.emit({recSeconds:Math.floor(o/e*10)/10}))},onHold:o=>this.emit({recHeld:o})});this.recorder=l;let i=()=>{let o=St(r.volume,r.muted);n.gain.setValueAtTime(o,s.currentTime),l.mark("volume",{volume:+r.volume.toFixed(4),muted:r.muted,gain:+o.toFixed(4)})};return r.addEventListener("volumechange",i),this.recTap={comp:n,off:()=>{r.removeEventListener("volumechange",i);try{this.analyser?.disconnect(n)}catch{}}},l.start(),(!a.isPlaying(this.video)||this.adActive||this.takeHidden)&&l.hold(),this.emit({recording:!0,recSeconds:0,recHeld:l.holding}),!0}return!1}async stopRecording(){let t=this.recorder;if(!t)return null;this.recorder=null;try{return await t.stop()}finally{this.recTap?.off(),this.recTap=null,this.emit({recording:!1,recSeconds:0,recHeld:!1})}}setCompare(t){this.compare=t,this.apply(this.params,!0)}level(){if(!this.analyser)return 0;this.analyser.getByteTimeDomainData(this.rmsBuf);let t=0;for(let e=0;e<this.rmsBuf.length;e++){let s=(this.rmsBuf[e]-128)/128;t+=s*s}return Math.sqrt(t/this.rmsBuf.length)}setVideoRate(t){let e=this.video;try{this.parked||(e.preservesPitch=!1,e.mozPreservesPitch=!1,e.webkitPreservesPitch=!1),Math.abs(e.playbackRate-t)>1e-4?(this.lastSetRate=t,this.ext?this.ext.writeRate(t):e.playbackRate=t):(this.lastSetRate=t,this.ext&&this.ext.writeRate(t))}catch{}}onRateChange=()=>{let t=this.video;this.parked||(t.preservesPitch=!1),Math.abs(t.playbackRate-this.lastSetRate)>.001&&(this.baseRate=t.playbackRate,this.emit({baseRate:this.baseRate}),this.apply(this.params,!0)),this.detector.reset()};attaching=null;async attach(){return this.attaching?this.attaching:(this.attaching=this._attach().finally(()=>{this.attaching=null}),this.attaching)}async waitForActivation(){navigator.userActivation?.hasBeenActive||await new Promise(t=>{let e=()=>{window.removeEventListener("pointerdown",e,!0),window.removeEventListener("keydown",e,!0),t()};window.addEventListener("pointerdown",e,!0),window.addEventListener("keydown",e,!0)})}contextRunning(t,e){return t.state==="running"?Promise.resolve(!0):new Promise(s=>{let r=!1,n=i=>{r||(r=!0,t.removeEventListener("statechange",l),s(i))},l=()=>{t.state==="running"&&n(!0)};t.addEventListener("statechange",l),t.resume().then(()=>n(!0),()=>n(t.state==="running")),setTimeout(()=>n(t.state==="running"),e)})}async _attach(){let t=this.ext;if(!this.src)try{let e=t?t.ctx:new AudioContext({latencyHint:"interactive"});if(!t&&!await this.contextRunning(e,400)){this.waitingGesture=!0,this.emitTempo(),await this.waitForActivation(),this.waitingGesture=!1;try{await e.resume()}catch{}this.emitTempo()}this.ctx=e,t?await t.loadWorklet(e):await e.audioWorklet.addModule(this.urls.worklet);let s=t?await t.wasm():await(await fetch(this.urls.wasm)).arrayBuffer(),r=t?t.src:e.createMediaElementSource(this.video);if(this.src=r,this.dryDirect=e.createGain(),this.dryMatched=e.createGain(),this.wet=e.createGain(),this.dryDelay=e.createDelay(1),this.matchedReady=!1,this.limiter=e.createDynamicsCompressor(),this.limiter.threshold.value=-1,this.limiter.knee.value=0,this.limiter.ratio.value=20,this.limiter.attack.value=.001,this.limiter.release.value=.05,this.trim=e.createGain(),this.trim.gain.value=da,this.analyser=e.createAnalyser(),this.analyser.fftSize=512,this.node=new AudioWorkletNode(e,"kari-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{rbWasm:s,engine:this.tier}}),this.node.port.onmessage=n=>this.onWorklet(n.data),this.node.onprocessorerror=()=>{this.emit({fault:"worklet-failed",engine:"bypass"}),this.route(!1,!0)},r.connect(this.dryDirect),this.dryDirect.connect(this.analyser),r.connect(this.dryDelay),this.dryDelay.connect(this.dryMatched),this.dryMatched.connect(this.analyser),r.connect(this.node),this.node.connect(this.wet),this.wet.connect(this.limiter),this.limiter.connect(this.trim),this.trim.connect(this.analyser),this.analyser.connect(t?t.sink:e.destination),this.detector.start(e,r),this.syncOnset(),this.dryDirect.gain.value=1,this.dryMatched.gain.value=0,this.wet.gain.value=0,t?.onWired?.(),!t||t.ownsContext){if(e.state!=="running")try{await e.resume()}catch{}if(e.state!=="running"){let n=()=>{e.resume(),window.removeEventListener("pointerdown",n,!0),window.removeEventListener("keydown",n,!0)};window.addEventListener("pointerdown",n,!0),window.addEventListener("keydown",n,!0)}}this.emit({attached:!0,outputLatencyMs:Math.round((e.outputLatency||0)*1e3)}),this.watchSilence()}catch(e){this.waitingGesture=!1;let s=!t&&e?.name==="InvalidStateError";console.warn("[kari] attach failed:",e),this.emit({fault:s?"duplicate":"capture-failed",attached:!1}),this.src=null,this.emitTempo()}}setMatchedDelay(t){if(!this.ctx)return;let e=Math.min(.99,t/this.ctx.sampleRate+le);this.matchedReady&&!this.wetWanted&&this.dryMatched.gain.value>.01?this.dryDelay.delayTime.setTargetAtTime(e,this.ctx.currentTime,.05):this.dryDelay.delayTime.setValueAtTime(e,this.ctx.currentTime),this.matchedReady=!0,this.matchedFrames=t,this.node?.port.postMessage({type:"config",bypassDelay:t})}route(t,e,s=!1){if(s||(this.wetWanted=t),this.routedWet=t,!this.ctx)return;let r=this.ctx.currentTime,n=ca/3,l=!t&&this.matchedReady,i=!t&&!this.matchedReady;this.wet.gain.setTargetAtTime(t?1:0,r,n),this.dryMatched.gain.setTargetAtTime(l?1:0,r,n),this.dryDirect.gain.setTargetAtTime(i?1:0,r,n),this.updateAv()}applyEngine(t=!0){if(!this.node)return!1;let e=t?this.tier:"bypass",s=e!==this.lastWantedEngine;return s&&(this.engineWarm=!1,this.lastWantedEngine=e,this.hotBlocks=0),this.node.port.postMessage({type:"engine",engine:e}),s}onWorklet(t){switch(t.type){case"ready":this.latencyFrames={r3:t.latency.r3||0,ss:t.latency.ss||0},typeof t.loopMax=="number"&&t.loopMax>0&&(this.loopMax=t.loopMax);break;case"onset":this.detector.feed(t);break;case"engine":this.emit({engine:t.engine,engineLatencyMs:Math.round((t.latency||0)/(this.ctx?.sampleRate||48e3)*1e3)}),this.updateAv();break;case"warm":{typeof t.latency=="number"&&t.engine!=="bypass"&&(this.latencyFrames[t.engine]=t.latency,this.emit({engineLatencyMs:Math.round(t.latency/(this.ctx?.sampleRate||48e3)*1e3)}),this.setMatchedDelay(t.latency)),this.engineWarm=!0,this.route(this.wetWanted,!0);break}case"stats":{let e=t.budgetMs?t.avgBlockMs/t.budgetMs:0;this.lastRing=t.ringFrames||0,this.emit({underruns:t.underruns,load:e}),this.updateAv(),this.stepdown(e,t.underruns);break}case"error":this.emit({engine:"bypass",fault:t.where==="process"?"worklet-failed":this._status.fault});break}}lastUnderruns=0;stepdown(t,e){if(this.pinned!=="auto")return;let s=e-this.lastUnderruns;this.lastUnderruns=e,t>.85||s>5?this.hotBlocks++:this.hotBlocks=Math.max(0,this.hotBlocks-1),this.hotBlocks>=4&&(this.hotBlocks=0,this.tier==="r3"?this.tier="ss":this.tier==="ss"&&(this.tier="bypass"),this.applyEngine(),this.tier==="bypass"&&!this._status.fault&&this.emit({fault:"busy"}))}updateAv(){let t=this.ctx?Math.round((this.ctx.outputLatency||0)*1e3):0,e=this.wetWanted?this._status.engineLatencyMs+Math.round(le*1e3):this.matchedReady&&this.ctx?Math.round(this.dryDelay.delayTime.value*1e3):0,s=this.ctx?Math.round(this.ctx.baseLatency*1e3):0;this.emit({outputLatencyMs:t,avOffsetMs:t+e+s})}watchSilence(){let t=this.ext?.silenceMs??2500,e=-1,s=()=>{if(!this.ctx||!this.src)return;let r=this.video,n=!r.paused&&!r.ended&&r.readyState>=3&&!r.muted&&r.volume>0,l=this.ext?r.currentTime>e:!0;e=r.currentTime;let i=!!this.ext&&!!r.mediaKeys,o=this.level(),d=performance.now();n&&(i||o<1e-4&&l)?this.silentSince?(i||d-this.silentSince>t)&&this._status.fault!=="drm-silent"&&(this.emit({fault:"drm-silent"}),this.speedOnly&&this.apply(this.params,!0)):this.silentSince=d:(this.silentSince=0,this._status.fault==="drm-silent"&&(this.emit({fault:null}),this.ext?.speedOnlyOnDrm&&this.apply(this.params,!0))),setTimeout(s,500)};setTimeout(s,1500)}};var ce=`
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
`;var At=a=>{let t=Math.max(0,Math.floor(Number.isFinite(a)?a:0));return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`};function de(a,t,e=performance.now()){return a?.recording?`${At(a.recSeconds)}${a.recHeld?" \xB7 paused":""}`:t&&t.until>e?t.text:""}var V=[{id:"kari",name:"Kari",colorway:!0,wear:!0,label:"Kari, the original"},{id:"nebula",name:"Nebula",colorway:!0,wear:!0,label:"Nebula, Kari in glass with a galaxy inside"},{id:"medusa",name:"Medusa",colorway:!0,wear:!1,label:"Medusa, Kari as a jellyfish"},{id:"hex",name:"Hex",colorway:!1,wear:!1,label:"Hex, the sister with horns and a tail"},{id:"chrome",name:"Chrome",colorway:!1,wear:!1,label:"Chrome, the holographic sister"},{id:"hood",name:"Hood",colorway:!1,wear:!1,label:"Hood, the hooded sister"}],fe=V.map(a=>a.id),be=a=>V.find(t=>t.id===a)||V[0],ge=`
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
</svg>`,pe=`
    <g class="acc shoes">
      <path d="M34 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M30 176 h40 M32 172 l3 3 M38 171 l3 4 M44 171 l3 4 M50 171 l3 4 M56 171 l3 4 M62 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M40 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
      <path d="M90 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M86 176 h40 M88 172 l3 3 M94 171 l3 4 M100 171 l3 4 M106 171 l3 4 M112 171 l3 4 M118 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M96 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
    </g>`,he=`
    <g class="acc shades">
      <rect x="47" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <rect x="83" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <path d="M77 85 h6" stroke="#050507" stroke-width="2"/><path d="M47 84 l-10 -4 M113 84 l10 -4" stroke="#050507" stroke-width="1.6"/>
      <path d="M52 83 h10 M88 83 h10" stroke="rgba(255,255,255,.45)" stroke-width="1"/>
    </g>`,ue=`
    <g class="acc cap">
      <path d="M46 46 q34 -30 68 0 v6 h-68z" fill="#0d0d12"/><path d="M40 52 h84 q-4 -6 -8 -6 h-68 q-4 0 -8 6z" fill="#0d0d12"/>
      <path d="M104 50 q22 -2 30 6 q-14 0 -30 -2z" fill="#0d0d12"/><path d="M46 46 q34 -30 68 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <text x="80" y="40" font-size="8.5" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" fill="#efece4" letter-spacing="1">YGG</text>
    </g>`,z=(a,t)=>`<text class="zz" x="${a}" y="${t}">zz</text>`,pa=(a,t,e,s,r)=>r?`<animate attributeName="d" dur="${e}" begin="${s}" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="${a};${t};${a}"/>`:"",F=(a,t,e,s,r,n)=>`<path class="${a}" d="${t}">${pa(t,e,s,r,n)}</path>`,me={kari:a=>`
  <g class="beat"${a?' data-el="beat"':""}>
    <g class="blob" style="transform-origin:80px 90px">
      <ellipse cx="80" cy="95" rx="54" ry="60"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/>
      <ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/>
      <ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/>
    </g>
    <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${a?pe:""}
    <g class="lid l"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
    <g class="lid r"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
    <g class="lid l"><circle class="iris" cx="64" cy="88" r="4"/></g>
    <g class="lid r"><circle class="iris" cx="100" cy="88" r="4"/></g>
    <path class="mouth" d="M70 112 q10 8 20 0" fill="none" stroke="#03141a" stroke-width="2" stroke-linecap="round"/>
    ${a?z(118,60)+he+ue:""}
  </g>${a?`
  <circle class="bubble" data-el="bubble" cx="118" cy="76" r="14"/>`:""}`,nebula:a=>`
  <g class="idle">
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M10 116 A70 14 0 0 1 150 116"/><path class="ring" d="M10 116 A70 14 0 0 1 150 116"/>${a?'<circle class="moon" data-moon="back" r="4" cx="10" cy="116"/>':""}</g>
    <g class="beat"${a?' data-el="beat"':""}>
      <use href="#kari-core" class="neb"/>
      <g clip-path="url(#kari-cp-body)"><g class="swirl"><ellipse cx="62" cy="80" rx="36" ry="15" fill="#b69cff" opacity=".5" filter="url(#kari-soft)"/><ellipse cx="100" cy="114" rx="32" ry="12" style="fill:var(--m1)" opacity=".5" filter="url(#kari-soft)"/></g>
        <g><circle class="speck" cx="50" cy="70" r="1"/><circle class="speck" cx="112" cy="70" r="1.3"/><circle class="speck" cx="98" cy="130" r="1"/><circle class="speck" cx="58" cy="128" r="1.4"/><circle class="speck" cx="122" cy="108" r="1"/><circle class="speck" cx="38" cy="104" r="1"/></g></g>
      <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${a?pe:""}
      <g class="lidf"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><circle class="iris" cx="64" cy="88" r="4"/><circle cx="59" cy="81" r="1.2" fill="#fff"/></g>
      <g class="lidf"><circle class="iris" cx="100" cy="88" r="4"/><circle cx="95" cy="81" r="1.2" fill="#fff"/></g>
      <path class="mouth" d="M70 112 q10 8 20 0"/>
      ${a?z(118,60)+he+ue:""}
    </g>
    <circle class="cres" cx="40" cy="38" r="13" mask="url(#kari-m-cresl)"/><circle class="cres b" cx="120" cy="44" r="10" mask="url(#kari-m-cresr)"/>
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M150 116 A70 14 0 0 1 10 116"/><path class="ring" d="M150 116 A70 14 0 0 1 10 116"/><circle class="moon"${a?' data-moon="front"':""} r="4" cx="${a?150:124}" cy="${a?116:128}"/></g>
  </g>`,medusa:a=>`
  <g class="idle"><g class="beat"${a?' data-el="beat"':""}>
    <g>
      ${F("tent","M128.3 108 C135 122 121 138 129 150","M128.3 108 C121 122 135 138 127 150","2.6s","0s",a)}
      ${F("tent","M109 108 C116 124 102 142 110 160","M109 108 C102 124 116 142 108 160","2.6s","-.4s",a)}
      ${F("tent","M89.7 108 C96 126 83 146 91 166","M89.7 108 C83 126 96 146 88 166","2.6s","-.8s",a)}
      ${F("tent","M70.3 108 C77 126 64 146 72 166","M70.3 108 C64 126 77 146 69 166","2.6s","-1.2s",a)}
      ${F("tent","M51 108 C58 124 44 142 52 160","M51 108 C44 124 58 142 50 160","2.6s","-1.6s",a)}
      ${F("tent","M31.7 108 C38 122 24 138 32 150","M31.7 108 C24 122 38 138 30 150","2.6s","-2s",a)}
      ${F("oral","M74 106 C68 122 80 134 72 152","M74 106 C80 122 68 134 76 152","3.4s","0s",a)}
      ${F("oral","M86 106 C92 122 80 134 88 152","M86 106 C80 122 92 134 84 152","3.4s","-1.7s",a)}
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
      ${a?z(128,26):""}
    </g>
  </g></g>`,hex:a=>`
  <g class="idle"><g class="beat"${a?' data-el="beat"':""}>
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
    ${a?z(136,70):""}
  </g></g>`,chrome:a=>`
  <g class="idle"><g class="beat"${a?' data-el="beat"':""}>
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
    ${a?`<circle class="gum" cx="80" cy="118" r="2"/>
    <circle class="bit" cx="80" cy="118" r="1.6" style="--bx:-18px;--by:-10px"/><circle class="bit" cx="80" cy="118" r="1.6" style="--bx:18px;--by:-12px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:-12px;--by:14px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:14px;--by:12px"/>
    ${z(136,66)}`:""}
  </g>
    <use class="ystar" href="#kari-spk" transform="translate(14 72) scale(.5)"/><use class="ystar b" href="#kari-spk" transform="translate(148 40) scale(.6)"/><use class="ystar" href="#kari-spk" transform="translate(150 150) scale(.4)"/>
  </g>`,hood:a=>`
  <g class="duck"><g class="idle"><g class="beat"${a?' data-el="beat"':""}>
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
    ${a?z(138,34):""}
  </g></g></g>`},ha={kari:!1,nebula:!1,medusa:!1,hex:!0,chrome:!0,hood:!0};function Lt(a,t){let e=me[a]?a:"kari";return`<svg class="kf f-${e}${ha[e]?" sis":""}" viewBox="0 0 160 180" aria-hidden="true" focusable="false">${me[e](t)}
</svg>`}function ye(a){return{x:80+70*Math.cos(a),y:116+14*Math.sin(a),back:Math.sin(a)<0}}var ua={off:"",idle:"play to learn",gesture:"click to learn",learning:"learning\u2026",none:"tap"};function ke(a,t){if(!t)return{state:"off",text:""};let e=a?.bpm??null;if(e)return{state:"found",text:`${q(e)} bpm`};let s=a?.tempo??"idle",r=s==="found"?"idle":s;return{state:r,text:ua[r]}}var xe={yt:"hideOnYouTube",sc:"hideOnSoundCloud"},ve={yt:"YouTube",sc:"SoundCloud"};var ma={yt:{"drm-silent":"this video's audio is protected \u2014 Kari can't touch it","capture-failed":"couldn't reach the audio on this page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page so Kari can reach the player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload",busy:"this machine is busy \u2014 playing the song as it is; reload to try again"},sc:{"drm-silent":"this track's audio is protected \u2014 speed only","capture-failed":"couldn't reach SoundCloud's player \u2014 reload the page","worklet-failed":"engine hiccup \u2014 playing untouched audio","hook-missing":"reload this page so Kari can reach the player",late:"reload this page once \u2014 Kari arrived after SoundCloud set up its player",duplicate:"two Karis are on this page \u2014 switch the other one off at chrome://extensions, then reload",busy:"this machine is busy \u2014 playing the track as it is; reload to try again"}},fa={"0.5":"loop-h",1:"loop-1",4:"loop-bar",8:"loop-2bar",tap:"tap"},ba=Vt.map(a=>`<button class="pill loop" data-a="loop" data-v="${a}" aria-pressed="false" aria-label="${Zt(a)}" disabled>${vt(a)}</button>`).join(""),ga='<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',nt=`
<div class="ctl absorb" data-full="0">
  <div class="read"><b class="ro"><span data-b="speed">1.00\xD7</span></b><span class="p ro">pitch <span data-b="st">0</span><span data-b="yt"></span></span></div>
  <div class="slider"><span>slow</span><input class="range" type="range" min="-50" max="50" step="0.5" value="0" data-a="tempo" aria-label="Speed: left slower, right faster"><span>fast</span></div>
  <div class="btns">
    <div class="step"><button data-a="st-" aria-label="Pitch down">\u2212</button><span>Pitch</span><button data-a="st+" aria-label="Pitch up">+</button></div>
    <div class="step"><button data-a="tempo-" aria-label="Slow down">\u2212</button><span>Speed</span><button data-a="tempo+" aria-label="Speed up">+</button></div>
  </div>
  <div class="loops">${ba}<span class="tro ro" data-b="tempo" data-state="idle" aria-live="polite"></span></div>
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
      <span class="bpmbox"><button data-a="bpm-" aria-label="BPM down">\u2212</button><input class="bpm ro" type="number" min="${kt}" max="${xt}" step="0.1" data-a="bpm" inputmode="decimal" aria-label="BPM" placeholder="bpm"><button data-a="bpm+" aria-label="BPM up">+</button></span>
      <button class="pill" data-a="midi" aria-pressed="false" aria-label="Connect MIDI">MIDI</button>
    </div>
    <div class="meta"><span>key <em class="ro" data-b="keypair"></em></span><span>engine <em data-b="engine">\u2014</em></span><span>a/v <em class="ro" data-b="av">\u2014</em></span><span>loop <em class="ro" data-b="loopinfo">\u2014</em></span></div>
  </div>
  <div class="rowend"><button class="hidebtn" data-a="hide">Hide</button><button class="fulltog" data-a="full" aria-pressed="false">Full control <span class="sw"></span></button></div>
</div>`,ya='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>',ka=[["kari","Kari"],["look","Interface"],["midi","MIDI"],["page","Page"]],xa=[["org","Kari","Kari beside the controls",'<path d="M10 3.5c3.6 0 6 2.9 6 6.6S13.6 16.5 10 16.5 4 13.8 4 10.1 6.4 3.5 10 3.5z"/><path d="M8 9.5v1M12 9.5v1"/>'],["void","Void Signal","A black panel that glows once you change the sound",'<rect x="3" y="4.5" width="14" height="11" rx="2.5"/><circle cx="14" cy="13" r="1.2"/>'],["weather","Alien Weather","A frosted pod under a small sun and a cloud",'<path d="M6.5 15.5h7.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8 1.2 2.4 2.4 0 0 0 .5 4.8z"/><path d="M4.5 4.5l1.2 1.2M8.5 2.5v1.6"/>'],["cons","Constellation","Drag the moon around its orbit to change key",'<ellipse cx="10" cy="11" rx="7" ry="3.6"/><circle cx="10" cy="11" r="1"/><circle cx="15.6" cy="8.8" r="1.6"/>']],va=`
  <aside class="settings" data-el="settings" hidden aria-label="Kari settings">
    <div class="snav">
      <div class="tabs" role="tablist" aria-label="Kari settings">${ka.map(([a,t],e)=>`<button class="tab" role="tab" id="kari-tab-${a}" aria-controls="kari-pane-${a}" data-tab="${a}" aria-selected="${e===0}" tabindex="${e===0?0:-1}"${a==="midi"?' data-el="miditab"':""}>${t}</button>`).join("")}</div>
      <button class="x" data-s="close" aria-label="Close settings">${ya}</button>
    </div>
    <div class="panes" data-el="panes">
      <section class="pane" role="tabpanel" id="kari-pane-kari" aria-labelledby="kari-tab-kari" data-pane="kari">
        <div class="forms" role="group" aria-label="Form">${V.map(a=>`<button class="form" data-form="${a.id}" aria-pressed="false" aria-label="${a.label}"><span class="fthumb">${Lt(a.id,!1)}</span><span class="fname" aria-hidden="true">${a.name}</span></button>`).join("")}</div>
        <div class="opt"><span class="ol" id="kari-l-color">Color</span><div class="row" role="group" aria-labelledby="kari-l-color">
          <button class="swatch" data-kari="blue" style="--c:#5cf2ff">Blue</button><button class="swatch" data-kari="pink" style="--c:#ff7ad9">Pink</button><button class="swatch" data-kari="black" style="--c:#2a2a33">Black</button></div></div>
        <div class="opt"><span class="ol" id="kari-l-wear">Wear</span><div class="row" role="group" aria-labelledby="kari-l-wear">
          <button class="chip" data-wear="cap" aria-pressed="false">YGG cap</button><button class="chip" data-wear="shades" aria-pressed="false" aria-label="Thin black sunglasses">Shades</button><button class="chip" data-wear="shoes" aria-pressed="false" aria-label="Chunky sneakers">Sneakers</button></div></div>
        <p class="note" data-el="formnote" aria-live="polite"></p>
      </section>
      <section class="pane" role="tabpanel" id="kari-pane-look" aria-labelledby="kari-tab-look" data-pane="look" hidden>
        <div class="skins" role="group" aria-label="Interface">${xa.map(([a,t,e,s])=>`<button class="skinrow" data-skin="${a}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true">${s}</svg><b>${t}</b><span>${e}</span></button>`).join("")}</div>
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
  </aside>`,wa=`
<div class="root" data-collapsed="0" data-small="0">${ge}
  <section class="skin" data-skin="org">
    <div class="org" data-kari="blue" data-cap="0" data-shades="0" data-shoes="0" data-fault="0">
      ${nt}
      <div class="body anchor" data-el="kari" data-a="show" role="button" tabindex="0" aria-label="Show or hide controls"></div>
    </div>
  </section>
  <section class="skin" data-skin="void" hidden>
    <div class="void absorb" data-off="1">${nt}<div class="glow"></div></div>
    <button class="void-orb anchor" data-a="show" aria-label="Show controls"></button>
  </section>
  <section class="skin" data-skin="weather" hidden>
    <div class="suncap" aria-hidden="true"></div>
    <button class="cloudlet anchor" data-a="show" aria-label="Show controls"></button>
    <div class="pod absorb">${nt}</div>
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
    <div class="cons-ctl absorb">${nt}</div>
  </section>
  <div class="intro" data-el="intro" hidden>slide to slow down or speed up the music (pitch moves with it, like a record) \xB7 pitch buttons change the key<br><button data-a="intro-ok" style="margin-top:6px;text-decoration:underline">got it</button></div>
  <div class="fault" data-el="fault" hidden></div>
  <button class="gear" data-el="gear" aria-label="Kari settings" aria-expanded="false">${ga}</button>
  ${va}
</div>`,Y=330,X=200,lt=120,ct=52,Me=8,Ee=3e3,dt=class{constructor(t,e){this.host=t;this.deps=e;let s=document.createElement("div");this.wrap=s,s.id="kari-dock",s.dataset.build="0.11.0+551cbc4f",s.style.cssText=e.mountStyle||"position:absolute;inset:0;pointer-events:none;z-index:60",this.shadow=s.attachShadow({mode:"open"});let r=document.createElement("style");r.textContent=ce,this.shadow.appendChild(r);let n=document.createElement("template");n.innerHTML=wa,this.shadow.appendChild(n.content.cloneNode(!0)),t.appendChild(s),this.root=this.shadow.querySelector(".root"),this.root.dataset.site=e.site||"yt";try{new ResizeObserver(l=>{let i=l[0]?.contentRect.height||0;i&&this.root.style.setProperty("--host-h",`${Math.round(i)}px`)}).observe(s)}catch{}this.el("hidesite").textContent=`Hide Kari on ${ve[e.site||"yt"]}`,this.el("ver").textContent="0.11.0+551cbc4f".split("+")[0];try{this.rm=matchMedia("(prefers-reduced-motion: reduce)"),this.rm.addEventListener?.("change",()=>this.syncSmil())}catch{}this.seedStars(),this.wire(),this.applySettings(e.settings),this.render(),this.startPulse()}root;shadow;wrap;get hostEl(){return this.wrap}el=t=>this.shadow.querySelector(`[data-el="${t}"]`);$$=t=>Array.from(this.shadow.querySelectorAll(t));status=null;midiState=null;learnOn=!1;raf=0;visible=!0;consDrag=!1;ytHidden=!1;over=new Set;keptUntil=0;keptTimer=0;form=null;moons=[];theta=.9;boostUntil=0;reactTimer=0;tab="kari";rm=null;destroy(){cancelAnimationFrame(this.raf),clearTimeout(this.keptTimer),clearTimeout(this.noteTimer),clearTimeout(this.reactTimer),this.host.querySelector("#kari-dock")?.remove()}takeNote=null;noteTimer=0;note(t){clearTimeout(this.noteTimer),this.takeNote=t?{text:t,until:performance.now()+4e3}:null,this.render(),t&&(this.noteTimer=window.setTimeout(()=>{this.takeNote=null,this.render()},4e3))}setStatus(t){this.status=t;let e=this.el("fault"),s=t.fault&&ma[this.deps.site||"yt"][t.fault]||"";e.hidden=!s,e.textContent=s,this.shadow.querySelector(".org")?.setAttribute("data-fault",t.fault?"1":"0"),this.render()}setControlsHidden(t){this.ytHidden=t,this.syncHidden()}get kept(){return this.over.size>0||this.focusInside()||performance.now()<this.keptUntil}focusInside(){let t=this.shadow.activeElement;return!!t&&!t.matches(".anchor")}syncHidden(){let t=this.kept,e=this.ytHidden&&!t?"1":"0",s=t?"1":"0";this.root.dataset.hiddenWithControls!==e&&(this.root.dataset.hiddenWithControls=e),this.root.dataset.kept!==s&&(this.root.dataset.kept=s)}used(){this.keptUntil=performance.now()+Ee,clearTimeout(this.keptTimer),this.keptTimer=window.setTimeout(()=>this.syncHidden(),Ee+50),this.syncHidden()}setBarHidden(t){this.root.dataset.barHidden=t?"1":"0"}setMidiState(t){this.midiState=t;let e=t.learning;this.$$("[data-arm]").forEach(n=>{e||n.removeAttribute("data-arm")});let s=t.supported?t.error?t.error:t.connected?`${t.inputs} input${t.inputs===1?"":"s"}${t.lastNote!==null?` \xB7 note ${t.lastNote}`:""}${e?" \xB7 hit a pad":""}`:"not connected":"no Web MIDI here",r=this.el("midist");r&&r.textContent!==s&&(r.textContent=s),this.render()}setSmall(t){this.root.dataset.small=t?"1":"0"}applySettings(t){this.$$(".skin").forEach(s=>s.hidden=s.dataset.skin!==t.skin),this.$$(".skinrow[data-skin]").forEach(s=>s.setAttribute("aria-pressed",String(s.dataset.skin===t.skin)));let e=this.shadow.querySelector(".org");e.dataset.kari=t.kariColor,e.dataset.cap=t.cap?"1":"0",e.dataset.shades=t.shades?"1":"0",e.dataset.shoes=t.shoes?"1":"0",this.root.dataset.kari=t.kariColor,this.$$("[data-kari]").forEach(s=>s.setAttribute("aria-pressed",String(s.dataset.kari===t.kariColor))),this.$$("[data-wear]").forEach(s=>s.setAttribute("aria-pressed",String(!!t[s.dataset.wear]))),this.applyForm(fe.includes(t.form)?t.form:"kari"),t.collapsed&&this.root.dataset.collapsed!=="1"&&(this.over.clear(),this.syncHidden()),this.root.dataset.collapsed=t.collapsed?"1":"0",this.$$(".ctl").forEach(s=>s.dataset.full=t.fullControl?"1":"0"),this.$$('[data-a="full"]').forEach(s=>s.setAttribute("aria-pressed",String(t.fullControl))),this.el("intro").hidden=t.seenIntro,this.el("more").href=this.deps.optionsUrl,this.deps.settings=t}react(){let t=this.el("kari");t.classList.remove("react"),t.offsetWidth,t.classList.add("react"),clearTimeout(this.reactTimer),this.reactTimer=window.setTimeout(()=>t.classList.remove("react"),1700);let e=this.el("bubble");e&&(e.classList.remove("go"),e.getBBox?.(),e.classList.add("go")),this.$$(".org .body .iris, .org .body .glow").forEach(s=>{s.classList.add("lit"),setTimeout(()=>s.classList.remove("lit"),700)}),this.form==="nebula"&&(this.boostUntil=performance.now()+1400)}applyForm(t){let e=this.shadow.querySelector(".org"),s=be(t);if(t!==this.form){let l=this.form===null;this.form=t;let i=this.el("kari");i.innerHTML=Lt(t,!0),this.moons=Array.from(i.querySelectorAll("[data-moon]")),this.placeMoons(),this.syncSmil(),l||requestAnimationFrame(()=>this.react())}e.dataset.form=t,this.$$(".form[data-form]").forEach(l=>l.setAttribute("aria-pressed",String(l.dataset.form===t))),this.$$(".swatch[data-kari]").forEach(l=>l.disabled=!s.colorway),this.$$(".chip[data-wear]").forEach(l=>l.disabled=!s.wear);let r=s.colorway?s.wear?"":"The wardrobe fits Kari and Nebula.":"The sisters keep their own colors and clothes.",n=this.el("formnote");n.textContent!==r&&(n.textContent=r)}motionOK(){return!this.rm?.matches}syncSmil(){let t=this.el("kari")?.querySelector("svg");if(t)try{this.motionOK()?t.unpauseAnimations():t.pauseAnimations()}catch{}}placeMoons(){if(!this.moons.length)return;let t=ye(this.theta);for(let e of this.moons){e.setAttribute("cx",t.x.toFixed(1)),e.setAttribute("cy",t.y.toFixed(1));let s=e.dataset.moon==="back"===t.back;e.style.opacity=s?"1":"0"}}selectTab(t,e=!1){this.$$(".tab[data-tab]").filter(r=>!r.hidden).some(r=>r.dataset.tab===t)||(t="kari"),this.tab=t;for(let r of this.$$(".tab[data-tab]")){let n=r.dataset.tab===t;r.setAttribute("aria-selected",String(n)),r.tabIndex=n?0:-1,n&&e&&r.focus()}for(let r of this.$$(".pane[data-pane]"))r.hidden=r.dataset.pane!==t;this.el("panes").scrollTop=0}render(){let t=this.deps.getParams(),e=this.status,s=e?.bpm??null,r=e?.loop??0,n=e?.baseRate&&Math.abs(e.baseRate-1)>.001?` \xB7 ${this.deps.site==="sc"?"sc":"yt"} ${e.baseRate.toFixed(2)}\xD7`:"",{state:l,text:i}=ke(e,!!this.deps.loop),o={speed:Ut(t.tempo),st:Wt(t.st),yt:n,bpm:s?`${q(s)} bpm`:"",tempo:i,keypair:`${yt(Me,0)} \u2192 ${yt(Me,t.st)}`,engine:e?e.engine==="r3"?"R3":e.engine==="ss"?"SS":"wire":"\u2014",av:e?e.attached?`${e.avOffsetMs} ms`:"0 ms":"\u2014",loopinfo:this.deps.loop?r?`${vt(r)} \xB7 ${e.loopMs} ms${e.loopClamped?" \xB7 at the ring's ceiling":""}`:s?"\u2014":"no tempo yet":"\u2014"};this.$$("[data-b]").forEach(c=>{let b=o[c.dataset.b];b!==void 0&&c.textContent!==b&&(c.textContent=b)});let d=this.shadow.querySelector(".loops");d&&(d.hidden=!this.deps.loop),this.$$('[data-b="tempo"]').forEach(c=>{c.dataset.state!==l&&(c.dataset.state=l)});{let c=this.shadow.querySelector(".take");c&&(c.hidden=!this.deps.record);let b=de(e,this.takeNote);this.$$('[data-b="take"]').forEach(y=>{y.textContent!==b&&(y.textContent=b)}),this.$$('[data-a="rec"]').forEach(y=>{let v=!!e?.recording,S=v&&!!e.recHeld;y.setAttribute("aria-pressed",String(v)),y.dataset.held!==(S?"1":"0")&&(y.dataset.held=S?"1":"0");let x=v?"Stop and save the take":"Record a take";y.getAttribute("aria-label")!==x&&y.setAttribute("aria-label",x)})}let u=this.shadow.querySelector('[data-el="midisg"]');u&&(u.hidden=!this.deps.midi);let h=this.el("miditab");h&&h.hidden!==!this.deps.midi&&(h.hidden=!this.deps.midi,h.hidden&&this.tab==="midi"&&this.selectTab("kari")),this.$$('[data-a="loop"]').forEach(c=>{let b=r>0&&+c.dataset.v===r;c.setAttribute("aria-pressed",String(b)),c.disabled=!s,b&&c.style.setProperty("--loop-ms",`${e.loopMs}ms`)}),this.$$('[data-a="bpm-"],[data-a="bpm+"]').forEach(c=>{c.disabled=!s}),this.$$('input[data-a="bpm"]').forEach(c=>{if(this.shadow.activeElement===c)return;let b=s?q(s):"";c.value!==b&&(c.value=b)});let f=this.midiState;this.$$('[data-a="midi"]').forEach(c=>{c.setAttribute("aria-pressed",String(!!f?.connected))}),this.$$('[data-m="learn"]').forEach(c=>c.setAttribute("aria-pressed",String(this.learnOn))),this.$$('[data-b="av"]').forEach(c=>c.classList.toggle("warn",!!e&&e.avOffsetMs>125)),this.$$('input[data-a="tempo"]').forEach(c=>{c.min=String(-t.range),c.max=String(t.range),+c.value!==t.tempo&&(c.value=String(t.tempo))}),this.$$('[data-a="lock"]').forEach(c=>c.setAttribute("aria-pressed",String(t.keyLock))),this.$$('[data-a="vinyl"]').forEach(c=>c.setAttribute("aria-pressed",String(!t.keyLock))),this.$$('[data-a="range"]').forEach(c=>c.setAttribute("aria-pressed",String(+c.dataset.v===t.range))),this.shadow.querySelector(".void").dataset.off=J(t)?"1":"0",this.renderCons(t)}wire(){let t=this.shadow;t.addEventListener("click",i=>{let o=i.target.closest("[data-a]");if(!o)return;let d=o.dataset.a,u=this.deps.getParams(),h=f=>{this.deps.apply(f),this.react(),this.render()};switch(d){case"st+":h(N(u,1));break;case"st-":h(N(u,-1));break;case"tempo+":h(H(u,1));break;case"tempo-":h(H(u,-1));break;case"lock":h({...u,keyLock:!0});break;case"vinyl":h({...u,keyLock:!1});break;case"reset":h({...P,range:u.range,keyLock:u.keyLock});break;case"range":h(qt(u,+o.dataset.v));break;case"full":this.deps.saveSettings({fullControl:!this.deps.settings.fullControl});break;case"hide":this.deps.saveSettings({collapsed:!0}),this.react();break;case"show":this.deps.saveSettings({collapsed:!this.deps.settings.collapsed}),this.react();break;case"intro-ok":this.deps.saveSettings({seenIntro:!0});break;case"hide-site":this.deps.saveSettings({[xe[this.deps.site||"yt"]]:!0});break;case"rec":{let f=this.deps.record;if(!f)break;this.status?.recording?f.stop().then(c=>this.note(c===null?"nothing recorded":`saved ${At(c)}`)):f.start().then(c=>{c?this.render():this.note("nothing to record")}),this.react(),this.render()}break;case"loop":case"tap":{let f=d==="loop"?o.dataset.v:"tap";if(this.learnOn&&this.midiState?.connected){this.$$("[data-arm]").forEach(c=>c.removeAttribute("data-arm")),o.dataset.arm="1",this.deps.midi?.learn(fa[f]);break}if(d==="loop"){let c=+o.dataset.v;(this.status?.loop??0)===c?this.deps.loop?.release():this.deps.loop?.latch(c)?.then(b=>{b&&this.react(),this.render()})}else this.deps.loop?.tap(),this.react();this.render();break}case"bpm-":this.deps.loop?.nudge(-1),this.render();break;case"bpm+":this.deps.loop?.nudge(1),this.render();break;case"midi":this.deps.midi?.connect()?.then(()=>this.render());break}}),t.addEventListener("click",i=>{let o=i.target.closest("[data-m]");o&&(o.dataset.m==="connect"&&this.deps.midi?.connect()?.then(()=>this.render()),o.dataset.m==="learn"&&(this.learnOn=!this.learnOn,this.learnOn||(this.deps.midi?.learn(null),this.$$("[data-arm]").forEach(d=>d.removeAttribute("data-arm"))),this.render()))});let e=i=>{let o=i.target;return o.matches('input[type="number"]')?!0:o.matches('input[type="range"]')?["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(i.key):o.matches('[role="tab"]')?["ArrowLeft","ArrowRight","Home","End","Enter"," "].includes(i.key):i.key==="Escape"&&o.closest(".settings")?!0:o.matches('button, [role="button"], input[type="checkbox"], a')?i.key==="Enter"||i.key===" ":!1};t.addEventListener("keydown",i=>{let o=i,d=o.target.closest('[role="button"][data-a]');d&&(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),d.click()),o.target.matches('input[data-a="bpm"]')&&(o.key==="Enter"||o.key==="Escape")&&(o.preventDefault(),o.target.blur());let u=o.target.closest('[role="tab"]');if(u&&["ArrowLeft","ArrowRight","Home","End"].includes(o.key)){o.preventDefault();let h=this.$$(".tab[data-tab]").filter(b=>!b.hidden),f=h.indexOf(u),c=o.key==="Home"?0:o.key==="End"?h.length-1:(f+(o.key==="ArrowRight"?1:-1)+h.length)%h.length;this.selectTab(h[c].dataset.tab,!0)}o.key==="Escape"&&o.target.closest(".settings")&&(o.preventDefault(),this.closeSettings(!0)),e(o)&&o.stopPropagation()}),t.addEventListener("keyup",i=>{e(i)&&i.stopPropagation()}),t.addEventListener("mousedown",i=>{i.target.closest('button, [role="button"]')&&i.preventDefault()}),t.addEventListener("input",i=>{let o=i.target;if(o.matches('input[data-a="tempo"]')){let d=this.deps.getParams();this.deps.apply({...d,tempo:+o.value}),this.render()}}),t.addEventListener("change",i=>{let o=i.target;if(o.matches('input[data-a="tempo"]')&&this.react(),o.matches('input[data-a="bpm"]')){let d=parseFloat(o.value);Number.isFinite(d)&&(this.deps.loop?.setBpm(d),this.react()),this.render()}}),t.addEventListener("pointerdown",i=>{let o=i.target.closest('[data-a="compare"]');o&&(this.hold(!0),o.setPointerCapture?.(i.pointerId))}),["pointerup","pointercancel"].forEach(i=>t.addEventListener(i,()=>{this.holding&&this.hold(!1)})),t.addEventListener("keydown",i=>{let o=i;o.target.closest('[data-a="compare"]')&&o.key===" "&&!o.repeat&&(o.preventDefault(),this.hold(!0))}),t.addEventListener("keyup",i=>{let o=i;o.target.closest('[data-a="compare"]')&&o.key===" "&&(o.preventDefault(),this.hold(!1))});let s=this.el("gear"),r=this.el("settings");s.addEventListener("click",()=>{let i=r.hidden;r.hidden=!i,s.setAttribute("aria-expanded",String(i))}),r.addEventListener("click",i=>{i.target.closest('[data-s="close"]')&&this.closeSettings(!1)}),this.$$(".tab[data-tab]").forEach(i=>i.addEventListener("click",()=>this.selectTab(i.dataset.tab))),this.$$(".skinrow[data-skin]").forEach(i=>i.addEventListener("click",()=>this.deps.saveSettings({skin:i.dataset.skin}))),this.$$(".form[data-form]").forEach(i=>i.addEventListener("click",()=>this.deps.saveSettings({form:i.dataset.form,skin:"org"}))),this.$$("[data-kari]").forEach(i=>i.addEventListener("click",()=>{this.deps.saveSettings({kariColor:i.dataset.kari,skin:"org"}),this.react()})),this.$$("[data-wear]").forEach(i=>i.addEventListener("click",()=>{let o=i.dataset.wear;this.deps.saveSettings({[o]:!this.deps.settings[o],skin:"org"})}));let n=this.el("consSvg"),l=i=>{let o=n.getBoundingClientRect(),d=(i.clientX-o.left)/o.width*640,u=(i.clientY-o.top)/o.height*360,h=Math.atan2((d-Y)/lt,-(u-X)/ct);return Math.max(-12,Math.min(12,Math.round(h/Math.PI*12)))};n.addEventListener("pointerdown",i=>{if(!this.deps.settings.collapsed&&i.target.closest(".hit,.moon")){this.consDrag=!0,n.setPointerCapture(i.pointerId);let o=l(i),d=this.deps.getParams();o!==d.st&&(this.deps.apply({...d,st:o}),this.render())}}),n.addEventListener("pointermove",i=>{if(!this.consDrag)return;let o=l(i),d=this.deps.getParams();o!==d.st&&(this.deps.apply({...d,st:o}),this.render())}),["pointerup","pointercancel"].forEach(i=>n.addEventListener(i,()=>{this.consDrag&&(this.consDrag=!1,this.react())}));for(let i of this.$$(".absorb, .gear, .settings, .intro, .fault"))i.addEventListener("pointerenter",()=>{this.over.add(i),this.syncHidden()}),i.addEventListener("pointerleave",()=>{this.over.delete(i),this.syncHidden()});t.addEventListener("focusin",()=>this.syncHidden()),t.addEventListener("focusout",()=>{setTimeout(()=>this.syncHidden(),0)}),["pointerdown","click","input","keydown"].forEach(i=>t.addEventListener(i,o=>{o.isTrusted&&this.used()})),["click","dblclick","pointerdown","pointerup","mousedown","mouseup","wheel","contextmenu"].forEach(i=>this.wrap.addEventListener(i,o=>o.stopPropagation()))}closeSettings(t){let e=this.el("gear");this.el("settings").hidden=!0,e.setAttribute("aria-expanded","false"),t&&e.focus()}holding=!1;hold(t){this.holding=t,this.deps.setCompare(t),this.$$('[data-a="compare"]').forEach(e=>e.dataset.held=t?"1":"0")}startPulse(){let t=0,e=0,s=performance.now(),r=n=>{this.raf=requestAnimationFrame(r);let l=Math.min(100,n-s);if(s=n,document.hidden||!!this.shadow.querySelector('.skin[data-skin="org"]').hidden||(this.moons.length&&this.motionOK()&&(this.theta+=l/1e3*(n<this.boostUntil?3.2:.9),this.placeMoons()),n-t<33))return;t=n;let o=this.deps.level();e=Math.max(o,e*.85);let d=1+Math.min(.08,e*.35),u=1-Math.min(.06,e*.25);this.el("beat").style.transform=`scale(${d.toFixed(3)},${u.toFixed(3)})`};this.raf=requestAnimationFrame(r)}seedStars(){let t=this.el("starfield"),e="";[[70,60],[130,300],[210,70],[290,330],[380,60],[470,90],[540,140],[590,300],[100,180],[560,330],[420,320],[250,290]].forEach((n,l)=>{let i=l%3===0?9:6;e+=`<path class="star" transform="translate(${n[0]} ${n[1]})" d="M0 -${i} L${i*.3} -${i*.3} L${i} 0 L${i*.3} ${i*.3} L0 ${i} L-${i*.3} ${i*.3} L-${i} 0 L-${i*.3} -${i*.3}Z"/>`}),t.innerHTML=e;let r="";for(let n=-12;n<=12;n+=3){let l=n/12*Math.PI;r+=`<line class="tick" x1="${(Y+Math.sin(l)*(lt+4)).toFixed(1)}" y1="${(X-Math.cos(l)*(ct+4)).toFixed(1)}" x2="${(Y+Math.sin(l)*(lt-4)).toFixed(1)}" y2="${(X-Math.cos(l)*(ct-4)).toFixed(1)}"/>`}this.el("ticks").innerHTML=r}renderCons(t){let e=t.st/12*Math.PI,s=Y+Math.sin(e)*lt,r=X-Math.cos(e)*ct,n=this.el("moon"),l=this.el("ray");n.setAttribute("cx",s.toFixed(1)),n.setAttribute("cy",r.toFixed(1)),l.setAttribute("x2",s.toFixed(1)),l.setAttribute("y2",r.toFixed(1));let i=this.$$(".star");i.forEach(x=>x.classList.remove("lit")),i.length&&i[(t.st%i.length+i.length)%i.length].classList.add("lit");let o=this.el("tempoArc"),d=170,u=Math.max(-50,Math.min(50,t.tempo))/50,h=Math.PI*.62,f=h+u*.45,c=x=>[Y+Math.cos(x)*d,X+Math.sin(x)*d*.55],[b,y]=c(h),[v,S]=c(f);o.setAttribute("d",`M${b.toFixed(1)} ${y.toFixed(1)} A${d} ${(d*.55).toFixed(1)} 0 0 ${u>=0?1:0} ${v.toFixed(1)} ${S.toFixed(1)}`)}};var Ae=()=>location.hostname.endsWith("youtube.com")&&location.pathname==="/watch",Le=()=>new URLSearchParams(location.search).get("v")||"";function Tt(){return document.querySelector("#movie_player video.html5-main-video")||document.querySelector("#movie_player video")||null}var G=()=>document.getElementById("movie_player");function Te(a=15e3){return new Promise(t=>{let e=Tt();if(e)return t(e);let s=new MutationObserver(()=>{let n=Tt();n&&(s.disconnect(),clearTimeout(r),t(n))});s.observe(document.documentElement,{childList:!0,subtree:!0});let r=setTimeout(()=>{s.disconnect(),t(Tt())},a)})}function Re(a){let t=location.href,e=()=>{location.href!==t&&(t=location.href,a())};document.addEventListener("yt-navigate-finish",()=>{t="",e()});let s=new MutationObserver(e);return s.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("popstate",e),()=>s.disconnect()}var Se=()=>{let a=G();return!!a&&(a.classList.contains("ad-showing")||a.classList.contains("ad-interrupting"))};function _e(a){let t=Se();a(t);let e=()=>{let s=G();return s?(new MutationObserver(()=>{let n=Se();n!==t&&(t=n,a(n))}).observe(s,{attributes:!0,attributeFilter:["class"]}),!0):!1};if(!e()){let s=new MutationObserver(()=>{e()&&s.disconnect()});s.observe(document.documentElement,{childList:!0,subtree:!0})}}var B=()=>{let a=G();return!!a&&a.classList.contains("ytp-player-minimized")},Rt=()=>{let a=G();return!!a&&a.classList.contains("ytp-autohide")};var _t={skin:"org",kariColor:"blue",form:"kari",cap:!1,shades:!1,shoes:!1,collapsed:!1,fullControl:!1,engine:"auto",defaultRange:50,keyLockDefault:!1,rememberPerVideo:!0,seenIntro:!1,hideOnYouTube:!1,hideOnSoundCloud:!1},j="kari.settings",$t="kari.video.";function $e(a){let t={};try{let e=globalThis.chrome?.storage?.[a];if(e)return{get:s=>e.get(s),set:s=>e.set(s),remove:s=>e.remove(s)}}catch{}return{async get(e){let s=Array.isArray(e)?e:[e],r={};for(let n of s)n in t&&(r[n]=t[n]);return r},async set(e){Object.assign(t,e)},async remove(e){delete t[e]}}}var pt=$e("sync"),ht=$e("local");async function Ct(){try{let a=await pt.get(j);return{..._t,...a[j]||{}}}catch{return{..._t}}}async function Pt(a){let e={...await Ct(),...a};try{await pt.set({[j]:e})}catch{}return e}function Ce(a){try{globalThis.chrome?.storage?.onChanged?.addListener((t,e)=>{e==="sync"&&t[j]&&a({..._t,...t[j].newValue})})}catch{}}async function Pe(a){let t=$t+a;try{let e=await ht.get(t);if(e[t])return e[t];let r=(await pt.get(t))[t]||null;if(r)try{await ht.set({[t]:r}),await pt.remove(t)}catch{}return r}catch{return null}}async function Fe(a,t){try{t?await ht.set({[$t+a]:t}):await ht.remove($t+a)}catch{}}var Ie=["loop-h","loop-1","loop-bar","loop-2bar","tap"],Ma={"loop-h":36,"loop-1":37,"loop-bar":38,"loop-2bar":39,tap:40};function Be(a){let t={...Ma};if(a&&typeof a=="object")for(let e of Ie){let s=a[e];typeof s=="number"&&Number.isInteger(s)&&s>=0&&s<=127&&(t[e]=s)}return t}var ut=class{access=null;map;_state={supported:typeof navigator<"u"&&"requestMIDIAccess"in navigator,connected:!1,inputs:0,learning:null,lastNote:null,error:null};onAction;onMap;onState;constructor(t,e,s,r){this.onAction=e,this.onMap=s,this.onState=r,this.map=Be(t)}get state(){return this._state}get mapping(){return this.map}noteFor(t){return this.map[t]}set(t){this._state={...this._state,...t},this.onState(this._state)}async connect(){if(!this._state.supported)return this.set({error:"no Web MIDI in this browser"}),!1;if(this.access)return!0;try{let t=await navigator.requestMIDIAccess({sysex:!1});this.access=t;let e=()=>{let s=0;t.inputs.forEach(r=>{r.onmidimessage=this.onMessage,s++}),this.set({connected:s>0,inputs:s,error:s?null:"no MIDI inputs"})};return t.onstatechange=e,e(),this._state.connected}catch(t){return this.set({error:String(t?.message||t),connected:!1}),!1}}learn(t){this.set({learning:t})}setMap(t){this.map=Be(t)}onMessage=t=>{let e=t.data;if(!e||e.length<3)return;let s=e[0]&240,r=e[1],n=e[2];if(!(s!==144||n===0)){if(this.set({lastNote:r}),this._state.learning){let l=this._state.learning;this.map={...this.map,[l]:r},this.onMap(this.map),this.set({learning:null});return}for(let l of Ie)if(this.map[l]===r){this.onAction(l);return}}}};var Oe="data-kari",De="data-kari-duplicate",He="kari:duplicate";function Ne(a,t,e,s){return a.hasAttribute(Oe)?(a.setAttribute(De,e),t.dispatchEvent(new Event(He)),!1):(a.setAttribute(Oe,e),t.addEventListener(He,()=>s(a.getAttribute(De)||"?"),!0),!0)}var m=null,g=null,U=null,E={...P},M,C="",Ke=0,Bt="",It=!1,W=()=>!!M?.hideOnYouTube,ze=!1,Ge=null,Ea={worklet:chrome.runtime.getURL("worklet.js"),wasm:chrome.runtime.getURL("rubberband.wasm")},Ue=null,Sa=Ne(document.documentElement,document,"0.11.0+551cbc4f",a=>{Ue=a,console.warn("[kari] another Kari is on this page:",a),m?.flagDuplicate()});async function mt(a){E=a,await m?.apply(a),M.rememberPerVideo&&C&&(clearTimeout(Ke),Ke=window.setTimeout(()=>{let t=J(a)?null:{st:a.st,cents:a.cents,tempo:a.tempo,keyLock:a.keyLock,range:a.range},e=C+":"+(t?JSON.stringify(t):"");e!==Bt&&(Bt=e,Fe(C,t).then(()=>console.debug("[kari] saved",C,t?JSON.stringify(t):"cleared")))},400))}var Aa={"loop-h":.5,"loop-1":1,"loop-bar":4,"loop-2bar":8};function La(a){if(!m||W())return;let t=Aa[a];t?m.toggleLoop(t).then(e=>{e&&g?.react(),g?.render()}):a==="tap"&&(m.tap(),g?.react()),g?.render()}async function ft(){if(M=M||await Ct(),W()){Ft();return}if(It=!1,!Ae()&&!B()){We();return}let a=await Te(),t=G();if(!a||!t)return;if(W()){Ft();return}getComputedStyle(t).position==="static"&&(t.style.position="relative");let e=Le()||(B()?C:"");if(e!==C){C=e;let s=M.rememberPerVideo?await Pe(e):null;E=s?{...P,...s}:{...P,range:M.defaultRange,keyLock:M.keyLockDefault},Bt=e+":"+(s?JSON.stringify({st:E.st,cents:E.cents,tempo:E.tempo,keyLock:E.keyLock,range:E.range}):""),console.debug("[kari] mount",e,"memory:",s?JSON.stringify(s):"none"),m?.setGrid(null)}if(W()){Ft();return}m?m.rebind(a):(m=new ot(a,Ea),m.setEnginePreference(M.engine)),Ue&&m.flagDuplicate(),m.park(!1),U||(U=new ut(M.midiMap,La,s=>{Pt({midiMap:s}).then(r=>{M=r})},s=>g?.setMidiState(s))),g&&!t.contains(g.hostEl)&&(g.destroy(),g=null),g?g.render():(g=new dt(t,{getParams:()=>E,apply:s=>{mt(s)},setCompare:s=>m?.setCompare(s),settings:M,saveSettings:s=>{Pt(s).then(r=>{M=r,g?.applySettings(r),s.engine&&m?.setEnginePreference(r.engine),qe()})},level:()=>m?.level()??0,optionsUrl:chrome.runtime.getURL("options.html"),loop:{latch:s=>m?m.latchLoop(s):Promise.resolve(!1),release:()=>m?.releaseLoop(),tap:()=>m?.tap()??null,setBpm:s=>m?.setBpm(s),nudge:s=>m?.nudgeBpm(s)},midi:U,record:{start:()=>m?m.startRecording({site:"yt",track:C,title:document.title.replace(/ - YouTube$/,""),build:"0.11.0+551cbc4f"}):Promise.resolve(!1),stop:async()=>{let s=m?await m.stopRecording():null;return!s||!s.frames?null:(Et(s),s.seconds)}}}),g.setMidiState(U.state),g.setStatus(m.status),g.setControlsHidden(Rt()),g.setSmall(B()||t.clientWidth<520),ze||(ze=!0,m.onStatus(s=>g?.setStatus(s))),Ge!==t&&(Ge=t,_e(s=>m?.setAds(s)),Ta(t))),await mt(E)}function We(){g?.destroy(),g=null}function Ft(){It=!0,We(),m?.park(!0)}function qe(){W()!==It&&ft()}function Ta(a){let t=B();new MutationObserver(()=>{g?.setControlsHidden(Rt()),g?.setSmall(B()||a.clientWidth<520);let s=B();s!==t&&(t=s,ft())}).observe(a,{attributes:!0,attributeFilter:["class"]}),new ResizeObserver(()=>g?.setSmall(B()||a.clientWidth<520)).observe(a)}chrome.runtime.onMessage.addListener(a=>{if(a?.type!=="kari:command"||!g||W())return;let e={"pitch-up":()=>N(E,1),"pitch-down":()=>N(E,-1),"tempo-up":()=>H(E,1),"tempo-down":()=>H(E,-1)}[a.command];e&&(mt(e()),g.react(),g.render())});globalThis.__kari={get params(){return E},get audio(){return m},get dock(){return g},get settings(){return M},apply:a=>mt(a),get grid(){return m?.getGrid()??null},get midi(){return U},tap:()=>m?.tap()??null,setBpm:a=>m?.setBpm(a),latch:a=>m?.latchLoop(a),release:()=>m?.releaseLoop(),toggle:a=>m?.toggleLoop(a),get tempo(){return m?.detectorState??null},get estimate(){return m?.lastEstimate??null},get tempoDebug(){return m?.detectorDebug??null},record:{start:()=>m?m.startRecording({site:"yt",track:C,title:document.title.replace(/ - YouTube$/,""),build:"0.11.0+551cbc4f"}):Promise.resolve(!1),stop:()=>m?m.stopRecording():Promise.resolve(null),save:a=>Et(a),get on(){return!!m?.status.recording}}};Sa?(Ce(a=>{M=a,g?.applySettings(a),m?.setEnginePreference(a.engine),U?.setMap(a.midiMap||{}),qe()}),Re(()=>{ft()}),ft()):console.warn("[kari] another Kari owns this page; build","0.11.0+551cbc4f","stands down (switch one copy off at chrome://extensions)");})();
