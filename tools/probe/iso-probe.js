// Installed into the content script's isolated world (POST /iso with this file as the body) once the engine is
// attached. Taps the audio graph with analysers and a dual recorder and exposes measurement helpers on __probe.
// The taps read the actual audio that reaches the speakers, independently of the code under test.
const a = __kari.audio; if (!a || !a.ctx) return 'no ctx yet: ' + JSON.stringify(a ? a.status : null);
if (!globalThis.__probe) {
  const ctx = a.ctx;
  const anIn = ctx.createAnalyser(); anIn.fftSize = 32768; anIn.smoothingTimeConstant = 0;
  const anOut = ctx.createAnalyser(); anOut.fftSize = 32768; anOut.smoothingTimeConstant = 0;
  a.src.connect(anIn); a.analyser.connect(anOut); // analyser = the summing point (dry + wet), what the speakers get
  const bufIn = new Float32Array(32768), bufOut = new Float32Array(32768);
  const zc = (x) => { let first=-1,last=-1,n=0; for (let i=1;i<x.length;i++){ if (x[i-1]<0 && x[i]>=0){ const t=i-1+(-x[i-1])/(x[i]-x[i-1]); if(first<0)first=t; last=t; n++; } } return n>1 ? (n-1)*ctx.sampleRate/(last-first) : 0; };
  const rms = (x) => { let s=0; for (let i=0;i<x.length;i++) s+=x[i]*x[i]; return Math.sqrt(s/x.length); };
  // dual recorder: ch0 = input (src, mono), ch1 = output (mix, mono)
  const merger = ctx.createChannelMerger(2); const mIn = ctx.createGain(); const mOut = ctx.createGain();
  a.src.connect(mIn); a.analyser.connect(mOut); mIn.connect(merger, 0, 0); mOut.connect(merger, 0, 1);
  let rec = null;
  const sp = ctx.createScriptProcessor(4096, 2, 2); const g0 = ctx.createGain(); g0.gain.value = 0;
  merger.connect(sp); sp.connect(g0); g0.connect(ctx.destination);
  sp.onaudioprocess = (e) => { if (!rec) return; const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.getChannelData(1); if (rec.w + L.length <= rec.in.length) { rec.in.set(L, rec.w); rec.out.set(R, rec.w); rec.w += L.length; } else rec.done = true; };
  globalThis.__probe = {
    measure() { anIn.getFloatTimeDomainData(bufIn); anOut.getFloatTimeDomainData(bufOut); const fin = zc(bufIn), fout = zc(bufOut); const ri = rms(bufIn), ro = rms(bufOut); return { fin: +fin.toFixed(3), fout: +fout.toFixed(3), cents: fin && fout ? +(1200*Math.log2(fout/fin)).toFixed(2) : null, rmsIn: +ri.toFixed(4), rmsOut: +ro.toFixed(4), dB: ri ? +(20*Math.log10(ro/ri)).toFixed(2) : null, sr: ctx.sampleRate, ctxState: ctx.state, t: +ctx.currentTime.toFixed(2), engine: a.status.engine, wet: +a.wet.gain.value.toFixed(3) }; },
    record(sec) { const n = Math.round(sec*ctx.sampleRate); rec = { in: new Float32Array(n), out: new Float32Array(n), w: 0, done: false, t0: ctx.currentTime }; return 'recording ' + sec + 's'; },
    recStatus() { return rec ? { w: rec.w, len: rec.in.length, done: rec.done || rec.w >= rec.in.length } : null; },
    analyzeEnv(win=Math.round(ctx.sampleRate/100), lag=0) { if (!rec) return null; const n=rec.w-lag, x=rec.in, y=lag?rec.out.subarray(lag):rec.out; const rmsAt=(a,i,m)=>{let s=0;for(let j=i;j<i+m;j++)s+=a[j]*a[j];return Math.sqrt(s/m);}; const ein=[],eout=[]; for(let i=0;i+win<=n;i+=win){ein.push(rmsAt(x,i,win));eout.push(rmsAt(y,i,win));} let maxD=0,at=-1; for(let i=1;i<n;i++){const dd=Math.abs(y[i]-y[i-1]); if(dd>maxD){maxD=dd;at=i;}} let maxDin=0; for(let i=1;i<n;i++){const dd=Math.abs(x[i]-x[i-1]); if(dd>maxDin)maxDin=dd;} const dips=[]; for(let i=0;i<eout.length;i++){ if(ein[i]>0.01 && eout[i]<0.35*ein[i]) dips.push({t:+(i*win/ctx.sampleRate).toFixed(3), in:+ein[i].toFixed(3), out:+eout[i].toFixed(3)}); } return { sec:+(n/ctx.sampleRate).toFixed(2), maxStepOut:+maxD.toFixed(3), maxStepAt:+(at/ctx.sampleRate).toFixed(3), maxStepIn:+maxDin.toFixed(3), nDips:dips.length, dips:dips.slice(0,30), ratioOutIn: eout.map((v,i)=>ein[i]>0.01?+(v/ein[i]).toFixed(2):null) }; },
    xcorr(maxLag=4000, startSec=0.3, lenSec=1.5) { if (!rec || rec.w < Math.round((startSec+lenSec)*ctx.sampleRate)+maxLag) return {error:'recording too short', w: rec && rec.w}; const sr=ctx.sampleRate, x=rec.in, y=rec.out; const start=Math.round(startSec*sr), len=Math.round(lenSec*sr); const rmsAt=(a,i,m)=>{let s=0;for(let j=i;j<i+m;j++)s+=a[j]*a[j];return Math.sqrt(s/m);}; const ex=rmsAt(x,start,len), ey=rmsAt(y,start,len+maxLag); let best=-1,bestLag=0; for(let lag=0;lag<=maxLag;lag++){ let c=0; for(let i=0;i<len;i++) c+=x[start+i]*y[start+i+lag]; c/=(len*ex*ey); if(c>best){best=c;bestLag=lag;} } return { sr, lagSamples:bestLag, lagMs:+(bestLag/sr*1000).toFixed(2), corr:+best.toFixed(3), rmsIn:+ex.toFixed(3), rmsOut:+ey.toFixed(3), len }; },
    xcorrEnv(hop=64, maxLagMs=120, startSec=0.3, lenSec=1.8) { if (!rec) return null; const sr=ctx.sampleRate, x=rec.in, y=rec.out; const env=(arr,from,count)=>{const e=new Float32Array(count); for(let k=0;k<count;k++){let s=0; const b=from+k*hop; for(let i=0;i<hop;i++){const v=arr[b+i]||0; s+=v*v;} e[k]=Math.sqrt(s/hop);} return e;}; const maxLag=Math.round(maxLagMs/1000*sr/hop); const start=Math.round(startSec*sr); const count=Math.floor((Math.round(lenSec*sr))/hop); if (rec.w < start+(count+maxLag)*hop) return {error:'short', w:rec.w}; const ex=env(x,start,count), ey=env(y,start,count+maxLag); const mean=(e)=>e.reduce((s,v)=>s+v,0)/e.length; const mx=mean(ex), my=mean(ey); let best=-2,bestLag=0; const curve=[]; for(let lag=0;lag<=maxLag;lag++){ let num=0,dx=0,dy=0; for(let k=0;k<count;k++){ const a1=ex[k]-mx, b1=ey[k+lag]-my; num+=a1*b1; dx+=a1*a1; dy+=b1*b1; } const c=num/Math.sqrt(dx*dy||1); curve.push(+c.toFixed(2)); if(c>best){best=c;bestLag=lag;} } return { lagSamples: bestLag*hop, lagMs:+(bestLag*hop/sr*1000).toFixed(2), corr:+best.toFixed(3), hopMs:+(hop/sr*1000).toFixed(2), curveEvery10:curve.filter((_,i)=>i%10===0) }; },
    ad() { return !!a.adActive; },
    status() { return { ...a.status, ctxState: a.ctx.state, baseMs: +(a.ctx.baseLatency*1000).toFixed(2), outMs: +(a.ctx.outputLatency*1000).toFixed(2), sr: a.ctx.sampleRate, ring: a.lastRing, wet: +a.wet.gain.value.toFixed(3), rate: a.video.playbackRate, pp: a.video.preservesPitch }; },
  };
}
return 'ok';
