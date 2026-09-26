// Stream-latency + underrun bench of the SHIPPED worklet (extension/worklet.js) in a simulated AudioWorkletGlobalScope.
// Feeds a click train, measures the real in→out delay by envelope cross-correlation, and compares it with what the
// worklet reports ('warm' message). Usage: node bench/latency.mjs [sampleRate=44100] [dropStart=auto]
import fs from "node:fs"; import vm from "node:vm";
const SR = +(process.argv[2] || 44100), Q = 128, DROP = process.argv[3] === undefined || process.argv[3] === "auto" ? "auto" : +process.argv[3], CUSHION = +(process.argv[4] || 512), RATIO = +(process.argv[5] || Math.pow(2, 1 / 1200));
const code = fs.readFileSync(new URL("../extension/worklet.js", import.meta.url), "utf8");
let registered = null;
const ctx = vm.createContext({ sampleRate: SR, currentTime: 0, currentFrame: 0,
  AudioWorkletProcessor: class { constructor() { this.port = { postMessage: () => {}, onmessage: null }; } },
  registerProcessor: (n, c) => { registered = c; },
  WebAssembly, console, Date, Math, Float32Array, Uint8Array, Uint32Array, Int32Array, ArrayBuffer, TextDecoder, TextEncoder, Promise, setTimeout, clearTimeout, performance, Error, Array, Object, Symbol, URL, globalThis: undefined });
ctx.globalThis = ctx; ctx.self = ctx; vm.runInContext(code, ctx, { filename: "worklet.js" });
const wasm = fs.readFileSync(new URL("../extension/rubberband.wasm", import.meta.url)).buffer.slice(0);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const msgs = []; const p = new registered({ processorOptions: { rbWasm: wasm, engine: "bypass", signalsmith: false, dropStart: DROP, cushion: CUSHION } });
p.port.postMessage = (m) => msgs.push(m);
for (let i = 0; i < 100 && !p.ready.r3; i++) await wait(50);
// click train: 1 ms burst every 0.5 s, 8 s long, plus low-level noise so R3 has something between clicks
const N = Math.floor(SR * 8 / Q) * Q; const x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = (Math.random() * 2 - 1) * 0.002;
for (let t = 0.25; t < 7.8; t += 0.5) { const s = Math.round(t * SR); for (let i = 0; i < SR * 0.001; i++) x[s + i] = 0.8 * (1 - i / (SR * 0.001)) * (i % 2 ? -1 : 1); }
const out = new Float32Array(N); const inL = new Float32Array(Q), inR = new Float32Array(Q), oL = new Float32Array(Q), oR = new Float32Array(Q);
let switchedAt = -1;
for (let i = 0; i < N; i += Q) {
  if (i === Math.floor(SR / Q) * Q /* switch engine on at ~1 s */) { p.onMessage({ type: "ratio", ratio: RATIO }); p.onMessage({ type: "engine", engine: "r3" }); switchedAt = i; }
  inL.set(x.subarray(i, i + Q)); inR.set(inL); p.process([[inL, inR]], [[oL, oR]]); out.set(oL, i); ctx.currentTime += Q / SR;
}
const warm = msgs.find(m => m.type === "warm" && m.engine === "r3");
const underrunsAfterWarm = p.underruns; const ringMin = p.ringMin, ringMax = p.ringMax;
// envelope xcorr over 2..7 s
const hop = 16; const env = (a, from, count) => { const e = new Float32Array(count); for (let k = 0; k < count; k++) { let s = 0; const b = from + k * hop; for (let j = 0; j < hop; j++) s += a[b + j] * a[b + j]; e[k] = Math.sqrt(s / hop); } return e; };
const start = SR * 2, count = Math.floor(SR * 5 / hop), maxLag = Math.floor(SR * 0.2 / hop);
const ex = env(x, start, count), ey = env(out, start, count + maxLag);
let best = -2, bestLag = 0; for (let lag = 0; lag <= maxLag; lag++) { let num = 0, dx = 0, dy = 0; for (let k = 0; k < count; k++) { num += ex[k] * ey[k + lag]; dx += ex[k] * ex[k]; dy += ey[k + lag] * ey[k + lag]; } const c = num / Math.sqrt(dx * dy || 1); if (c > best) { best = c; bestLag = lag; } }
// refine by waveform xcorr around the envelope peak (±2 hops)
let bestW = -2, lagW = 0; for (let lag = Math.max(0, (bestLag - 2) * hop); lag <= (bestLag + 2) * hop; lag++) { let c = 0; for (let i = start; i < start + SR * 5; i += 1) c += x[i] * out[i + lag]; if (c > bestW) { bestW = c; lagW = lag; } }
// level check: rms of out vs in between clicks
const rms = (a, f, t) => { let s = 0; for (let i = f; i < t; i++) s += a[i] * a[i]; return Math.sqrt(s / (t - f)); };
console.log(JSON.stringify({ sr: SR, ratio: +RATIO.toFixed(4), cushion: CUSHION, ringMin, ringMax, dropStart: DROP, startDelay: warm && warm.startDelay, startPad: warm && warm.startPad, dropped: warm && warm.dropped, reportedLatency: warm && warm.latency, trueLagEnvelope: bestLag * hop, trueLagWave: lagW, trueLagMs: +(lagW / SR * 1000).toFixed(2), envCorr: +best.toFixed(3), residual_true_minus_reported: lagW - (warm ? warm.latency : 0), underrunsSteady: underrunsAfterWarm, levelDb: +(20 * Math.log10(rms(out, SR * 3, SR * 7) / rms(x, SR * 3 - lagW, SR * 7 - lagW))).toFixed(2) }));
