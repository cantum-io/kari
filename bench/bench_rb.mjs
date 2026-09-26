import fs from 'node:fs';
import { RubberBandInterface, RubberBandOption as O } from 'rubberband-wasm';
const SR=48000,BLOCK=128;
const wasm=await WebAssembly.compile(fs.readFileSync('node_modules/rubberband-wasm/dist/rubberband.wasm'));
const rb=await RubberBandInterface.initialize(wasm);
const sine=(f,s,a=0.5)=>Float32Array.from({length:SR*s},(_,i)=>a*Math.sin(2*Math.PI*f*i/SR));
function zcHz(x,a,b){let first=-1,last=-1,n=0;for(let i=a+1;i<b;i++){if(x[i-1]<0&&x[i]>=0){const t=i-1+(-x[i-1])/(x[i]-x[i-1]);if(first<0)first=t;last=t;n++;}}return (n-1)*SR/(last-first);}
const cents=(f,r)=>1200*Math.log2(f/r);
const rms=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);
function mk(opts){const st=rb.rubberband_new(SR,1,O.RubberBandOptionProcessRealTime|opts,1,1);rb.rubberband_set_max_process_size(st,BLOCK);return st;}
function run(st,x,semis){
  rb.rubberband_set_pitch_scale(st,2**(semis/12));
  const inPtr=rb.malloc(BLOCK*4),inArr=rb.malloc(4),outPtr=rb.malloc(BLOCK*4*4),outArr=rb.malloc(4);
  rb.memWrite(inArr,new Uint8Array(new Uint32Array([inPtr]).buffer));rb.memWrite(outArr,new Uint8Array(new Uint32Array([outPtr]).buffer));
  const out=new Float32Array(x.length);let w=0;
  // pre-pad with start pad silence
  const pad=rb.rubberband_get_preferred_start_pad(st);const delay=rb.rubberband_get_start_delay(st);
  const feed=(chunk,fin)=>{rb.memWrite(inPtr,chunk);rb.rubberband_process(st,inArr,chunk.length,fin?1:0);let av;while((av=rb.rubberband_available(st))>0){const n=Math.min(av,BLOCK*4);const got=rb.rubberband_retrieve(st,outArr,n);const o=rb.memReadF32(outPtr,got);const take=Math.min(got,out.length-w);if(take>0){out.set(o.subarray(0,take),w);w+=take;}if(got<=0)break;}};
  for(let i=0;i<pad;i+=BLOCK)feed(new Float32Array(Math.min(BLOCK,pad-i)),false);
  for(let i=0;i<x.length;i+=BLOCK)feed(x.subarray(i,Math.min(i+BLOCK,x.length)),false);
  rb.free(inPtr);rb.free(inArr);rb.free(outPtr);rb.free(outArr);
  return {out,delay,pad};
}
const configs={
  'R3 finer · HQ · together': O.RubberBandOptionEngineFiner|O.RubberBandOptionPitchHighQuality|O.RubberBandOptionChannelsTogether,
  'R3 finer · HighConsistency': O.RubberBandOptionEngineFiner|O.RubberBandOptionPitchHighConsistency|O.RubberBandOptionChannelsTogether,
  'R3 finer · WindowShort': O.RubberBandOptionEngineFiner|O.RubberBandOptionPitchHighQuality|O.RubberBandOptionWindowShort,
  'R2 faster · HQ': O.RubberBandOptionEngineFaster|O.RubberBandOptionPitchHighQuality,
};
const freqs=[55,110,196,440,1046.5];
console.log('config'.padEnd(30)+'delay ms'.padEnd(10)+freqs.map(f=>(f+'Hz').padEnd(9)).join('')+'| +3 st cents  ||  440Hz @ +1/-1/+5/-5/+12/-12   | level dB | ×RT');
for(const [name,opts] of Object.entries(configs)){
  const st=mk(opts);
  const errs=[];let delay=0;
  for(const f0 of freqs){rb.rubberband_reset(st);const r=run(st,sine(f0,5),3);delay=r.delay;errs.push(cents(zcHz(r.out,SR*2.5,SR*5),f0*2**(3/12)));}
  const e440=[];for(const s of [1,-1,5,-5,12,-12]){rb.rubberband_reset(st);const r=run(st,sine(440,4),s);e440.push(cents(zcHz(r.out,SR*2,SR*4),440*2**(s/12)));}
  rb.rubberband_reset(st);const inp=sine(440,4);const r=run(st,inp,5);const db=20*Math.log10(rms(r.out.subarray(SR,SR*4))/rms(inp.subarray(SR,SR*4)));
  rb.rubberband_reset(st);const t0=performance.now();run(st,sine(440,10),3);const x=10000/(performance.now()-t0);
  console.log(name.padEnd(30)+(delay/SR*1000).toFixed(0).padEnd(10)+errs.map(c=>((c>=0?'+':'')+c.toFixed(1)).padEnd(9)).join('')+'| '+e440.map(c=>((c>=0?'+':'')+c.toFixed(1))).join('/').padEnd(38)+'| '+db.toFixed(2).padEnd(8)+'| '+x.toFixed(0));
  rb.rubberband_delete(st);
}
