import SignalsmithStretch from './loader.mjs';
const SR=48000,BLOCK=128,CH=1;
async function eng(cfg){const m=await SignalsmithStretch();m._main();if(cfg.blockMs){m._configure(CH,Math.round(cfg.blockMs/1000*SR),Math.round(cfg.blockMs/4/1000*SR),false);m._reset();}else m._presetDefault(CH,SR);const len=m._inputLatency()+m._outputLatency();const ptr=m._setBuffers(CH,len);return{m,lat:len,bi:ptr,bo:ptr+len*4};}
function run(e,x,st){e.m._setTransposeSemitones(st,8000/SR);e.m._setFormantSemitones(0,false);e.m._setFormantBase(0);const o=new Float32Array(x.length);for(let i=0;i<x.length;i+=BLOCK){const n=Math.min(BLOCK,x.length-i);new Float32Array(e.m.HEAP8.buffer,e.bi,n).set(x.subarray(i,i+n));e.m._process(n,n);o.set(new Float32Array(e.m.HEAP8.buffer,e.bo,n),i);}return o;}
const sine=(f,s)=>Float32Array.from({length:SR*s},(_,i)=>0.5*Math.sin(2*Math.PI*f*i/SR));
// zero-crossing frequency over [a,b) with linear interpolation
function zcHz(x,a,b){let first=-1,last=-1,n=0;for(let i=a+1;i<b;i++){if(x[i-1]<0&&x[i]>=0){const t=i-1+(-x[i-1])/(x[i]-x[i-1]);if(first<0)first=t;last=t;n++;}}return (n-1)*SR/(last-first);}
const cents=(f,r)=>1200*Math.log2(f/r);
console.log('cfg'.padEnd(12)+'lat ms'.padEnd(9)+['+1','-1','+3','-3','+5','-5','+7','-7','+12','-12'].map(s=>(s+' st').padEnd(10)).join('')+' | max|err| cents');
for(const cfg of [{n:'default'},{n:'100ms',blockMs:100},{n:'80ms',blockMs:80},{n:'60ms',blockMs:60},{n:'50ms',blockMs:50}]){
  const e=await eng(cfg);const errs=[];
  for(const st of [1,-1,3,-3,5,-5,7,-7,12,-12]){e.m._reset();const o=run(e,sine(440,4),st);const f=zcHz(o,SR*2,SR*4);errs.push(cents(f,440*2**(st/12)));}
  console.log(cfg.n.padEnd(12)+(e.lat/SR*1000).toFixed(0).padEnd(9)+errs.map(c=>((c>=0?'+':'')+c.toFixed(2)).padEnd(10)).join('')+' | '+Math.max(...errs.map(Math.abs)).toFixed(2));
}
// Different input frequencies at default, +3 st (bin-alignment check)
console.log('\ndefault +3 st across input frequencies (zero-crossing):');
{const e=await eng({});for(const f0 of [110,196,261.63,440,659.26,1046.5,2093]){e.m._reset();const o=run(e,sine(f0,4),3);const f=zcHz(o,SR*2,SR*4);console.log(String(f0).padEnd(10)+((cents(f,f0*2**(3/12))>=0?'+':'')+cents(f,f0*2**(3/12)).toFixed(2)+' c'));}}
