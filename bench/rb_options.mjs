import fs from 'node:fs';
import { RubberBandInterface, RubberBandOption as O } from 'rubberband-wasm';
const SR=48000,Q=128;
const rb=await RubberBandInterface.initialize(await WebAssembly.compile(fs.readFileSync('node_modules/rubberband-wasm/dist/rubberband.wasm')));
const sine=(f,s)=>Float32Array.from({length:SR*s},(_,i)=>0.5*Math.sin(2*Math.PI*f*i/SR));
function zcHz(x,a,b){let first=-1,last=-1,n=0;for(let i=a+1;i<b;i++){if(x[i-1]<0&&x[i]>=0){const t=i-1+(-x[i-1])/(x[i]-x[i-1]);if(first<0)first=t;last=t;n++;}}return (n-1)*SR/(last-first);}
const cents=(f,r)=>1200*Math.log2(f/r);
function run(opts,ch,x,st){
  const s=rb.rubberband_new(SR,ch,O.RubberBandOptionProcessRealTime|opts,1,2**(st/12));rb.rubberband_set_max_process_size(s,Q);
  const inB=rb.malloc(Q*4*ch),outB=rb.malloc(Q*16*ch),inP=rb.malloc(4*ch),outP=rb.malloc(4*ch);
  const ip=new Uint32Array(ch),op=new Uint32Array(ch);for(let c=0;c<ch;c++){ip[c]=inB+c*Q*4;op[c]=outB+c*Q*16;}
  rb.memWrite(inP,new Uint8Array(ip.buffer));rb.memWrite(outP,new Uint8Array(op.buffer));
  const out=new Float32Array(x.length);let w=0;const pad=rb.rubberband_get_preferred_start_pad(s);
  const feed=(chunk)=>{for(let c=0;c<ch;c++)rb.memWrite(inB+c*Q*4,chunk);rb.rubberband_process(s,inP,chunk.length,0);let av;while((av=rb.rubberband_available(s))>0){const n=Math.min(av,Q*4);const got=rb.rubberband_retrieve(s,outP,n);if(got<=0)break;const o=rb.memReadF32(outB,got);const take=Math.min(got,out.length-w);if(take>0){out.set(o.subarray(0,take),w);w+=take;}}};
  for(let i=0;i<pad;i+=Q)feed(new Float32Array(Math.min(Q,pad-i)));
  for(let i=0;i<x.length;i+=Q)feed(x.subarray(i,Math.min(i+Q,x.length)));
  rb.rubberband_delete(s);[inB,outB,inP,outP].forEach(p=>rb.free(p));return out;
}
const F=O.RubberBandOptionEngineFiner,HQ=O.RubberBandOptionPitchHighQuality,HC=O.RubberBandOptionPitchHighConsistency,WS=O.RubberBandOptionWindowShort,CT=O.RubberBandOptionChannelsTogether,SM=O.RubberBandOptionSmoothingOn,PR=O.RubberBandOptionStretchPrecise;
const sets={'F|HQ|WS|CT stereo':[F|HQ|WS|CT,2],'F|HQ|WS mono':[F|HQ|WS,1],'F|HQ|WS stereo apart':[F|HQ|WS,2],'F|HC|WS|CT stereo':[F|HC|WS|CT,2],'F|HQ|CT std-window stereo':[F|HQ|CT,2],'F|HQ|WS|CT|Precise stereo':[F|HQ|WS|CT|PR,2]};
console.log('set'.padEnd(30)+[1,-1,3,-3,5,-5,7,-7,12,-12].map(s=>(s+'st').padEnd(8)).join('')+'| max');
for(const [name,[opts,ch]] of Object.entries(sets)){
  const errs=[];for(const st of [1,-1,3,-3,5,-5,7,-7,12,-12]){const o=run(opts,ch,sine(440,4),st);errs.push(cents(zcHz(o,SR*2,SR*4),440*2**(st/12)));}
  console.log(name.padEnd(30)+errs.map(c=>((c>=0?'+':'')+c.toFixed(2)).padEnd(8)).join('')+'| '+Math.max(...errs.map(Math.abs)).toFixed(2));
}
