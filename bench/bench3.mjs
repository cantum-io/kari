import SignalsmithStretch from './loader.mjs';
const SR=48000,BLOCK=128,CH=1;
async function eng(blockMs,intervalDiv=4){const m=await SignalsmithStretch();m._main();if(blockMs){m._configure(CH,Math.round(blockMs/1000*SR),Math.round(blockMs/intervalDiv/1000*SR),false);m._reset();}else m._presetDefault(CH,SR);const len=m._inputLatency()+m._outputLatency();const ptr=m._setBuffers(CH,len);return{m,lat:len,bi:ptr,bo:ptr+len*4,blk:m._blockSamples(),iv:m._intervalSamples()};}
function run(e,x,st){e.m._setTransposeSemitones(st,8000/SR);e.m._setFormantSemitones(0,false);e.m._setFormantBase(0);const o=new Float32Array(x.length);for(let i=0;i<x.length;i+=BLOCK){const n=Math.min(BLOCK,x.length-i);new Float32Array(e.m.HEAP8.buffer,e.bi,n).set(x.subarray(i,i+n));e.m._process(n,n);o.set(new Float32Array(e.m.HEAP8.buffer,e.bo,n),i);}return o;}
const sine=(f,s)=>Float32Array.from({length:SR*s},(_,i)=>0.5*Math.sin(2*Math.PI*f*i/SR));
function zcHz(x,a,b){let first=-1,last=-1,n=0;for(let i=a+1;i<b;i++){if(x[i-1]<0&&x[i]>=0){const t=i-1+(-x[i-1])/(x[i]-x[i-1]);if(first<0)first=t;last=t;n++;}}return (n-1)*SR/(last-first);}
const cents=(f,r)=>1200*Math.log2(f/r);
const freqs=[55,82.4,110,196,440,1046.5];
console.log('block/interval'.padEnd(18)+'lat'.padEnd(8)+'blk'.padEnd(7)+freqs.map(f=>(f+'Hz').padEnd(10)).join('')+'| +3 st error in cents');
for(const [b,d] of [[null,4],[120,4],[160,4],[200,4],[240,4],[120,8],[160,8],[200,8]]){
  const e=await eng(b,d);const errs=[];
  for(const f0 of freqs){e.m._reset();const o=run(e,sine(f0,5),3);errs.push(cents(zcHz(o,SR*2.5,SR*5),f0*2**(3/12)));}
  console.log(((b||'default')+'/'+d).padEnd(18)+(e.lat/SR*1000).toFixed(0).padEnd(8)+String(e.blk).padEnd(7)+errs.map(c=>((c>=0?'+':'')+c.toFixed(1)).padEnd(10)).join(''));
}
