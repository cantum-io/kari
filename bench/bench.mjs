// Sprint 0 accuracy bench — Signalsmith Stretch WASM driven directly in Node.
// Mirrors the worklet's call sequence: presetDefault → setBuffers → setTranspose → process(128-sample blocks).
import SignalsmithStretch from './loader.mjs';

const SR = 48000, BLOCK = 128, CH = 1;

async function makeEngine({ blockMs = null, preset = 'default' } = {}) {
  const m = await SignalsmithStretch();
  m._main();
  if (blockMs) m._configure(CH, Math.round(blockMs / 1000 * SR), Math.round(blockMs / 4 / 1000 * SR), false), m._reset();
  else if (preset === 'cheaper') m._presetCheaper(CH, SR);
  else m._presetDefault(CH, SR);
  const inLat = m._inputLatency(), outLat = m._outputLatency();
  const len = inLat + outLat;
  const ptr = m._setBuffers(CH, len);
  const bufIn = ptr, bufOut = ptr + len * 4 * CH;
  return { m, inLat, outLat, latency: inLat + outLat, bufIn, bufOut };
}

function run(eng, input, semitones, { formant = false } = {}) {
  const { m, bufIn, bufOut } = eng;
  m._setTransposeSemitones(semitones, 8000 / SR);
  m._setFormantSemitones(0, formant);
  m._setFormantBase(0);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += BLOCK) {
    const n = Math.min(BLOCK, input.length - i);
    const heap = new Float32Array(m.HEAP8.buffer, bufIn, n);
    heap.set(input.subarray(i, i + n));
    m._process(n, n);
    out.set(new Float32Array(m.HEAP8.buffer, bufOut, n), i);
  }
  return out;
}

// --- signal generators ---
const sine = (f, sec, amp = 0.5) => Float32Array.from({ length: SR * sec }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / SR));
const chord = (fs, sec) => { const o = new Float32Array(SR * sec); for (const f of fs) { const s = sine(f, sec, 0.5 / fs.length); for (let i = 0; i < o.length; i++) o[i] += s[i]; } return o; };

// --- measurement: frequency via FFT peak with parabolic interpolation ---
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]];[im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
function peakHz(x, start, N = 32768) {
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re[i] = (x[start + i] || 0) * w; }
  fft(re, im);
  let k = 1, best = 0; for (let i = 1; i < N / 2; i++) { const p = re[i] * re[i] + im[i] * im[i]; if (p > best) { best = p; k = i; } }
  const mag = i => Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  const a = Math.log(mag(k - 1) + 1e-12), b = Math.log(mag(k) + 1e-12), c = Math.log(mag(k + 1) + 1e-12);
  const d = 0.5 * (a - c) / (a - 2 * b + c);
  return (k + d) * SR / N;
}
const cents = (f, ref) => 1200 * Math.log2(f / ref);
const rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);

// --- tests ---
const results = [];
function row(test, target, value, pass) { results.push({ test, target, value, pass: pass ? 'PASS' : 'FAIL' }); }

for (const cfg of [{ name: 'default', preset: 'default' }, { name: 'cheaper', preset: 'cheaper' }, { name: 'block40ms', blockMs: 40 }, { name: 'block25ms', blockMs: 25 }]) {
  const eng = await makeEngine(cfg);
  const latMs = eng.latency / SR * 1000;
  console.log(`\n== ${cfg.name} · latency ${latMs.toFixed(1)} ms (${eng.latency} samples) ==`);
  row(`${cfg.name} latency`, '≤120 ms (lip-sync target ≤90)', latMs.toFixed(1) + ' ms', latMs <= 120);

  // Pitch accuracy at ±1, ±5, ±12 st on 440 Hz
  for (const st of [1, -1, 5, -5, 12, -12]) {
    eng.m._reset();
    const out = run(eng, sine(440, 4), st);
    const expect = 440 * Math.pow(2, st / 12);
    const f = peakHz(out, SR * 2);
    const err = cents(f, expect);
    row(`${cfg.name} pitch ${st > 0 ? '+' : ''}${st} st`, '≤2 cents', `${f.toFixed(2)} Hz (${err >= 0 ? '+' : ''}${err.toFixed(2)} c)`, Math.abs(err) <= 2);
  }

  // Pitch stability: +3 st, measure 6 windows across 3 s, report spread
  eng.m._reset();
  { const out = run(eng, sine(440, 4), 3); const ref = 440 * Math.pow(2, 3 / 12);
    const fs = []; for (let s = SR; s + 32768 < out.length; s += 16384) fs.push(cents(peakHz(out, s), ref));
    const spread = Math.max(...fs) - Math.min(...fs);
    row(`${cfg.name} stability +3 st`, '≤1 cent wobble', `${spread.toFixed(3)} c spread over ${fs.length} windows`, spread <= 1); }

  // Level: output RMS within ±0.5 dB of input at +5 st
  eng.m._reset();
  { const inp = sine(440, 4); const out = run(eng, inp, 5);
    const db = 20 * Math.log10(rms(out.subarray(SR)) / rms(inp.subarray(SR)));
    row(`${cfg.name} level +5 st`, '±0.5 dB', `${db >= 0 ? '+' : ''}${db.toFixed(2)} dB`, Math.abs(db) <= 0.5); }

  // Chord (A minor triad) +3 st: each partial lands where it should
  eng.m._reset();
  { const fs = [220, 261.63, 329.63]; const out = run(eng, chord(fs, 4), 3);
    const N = 32768, re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re[i] = out[SR * 2 + i] * w; } fft(re, im);
    const errs = fs.map(f0 => { const ex = f0 * Math.pow(2, 3 / 12); const k0 = Math.round(ex / SR * N); let k = k0, best = 0; for (let i = k0 - 6; i <= k0 + 6; i++) { const p = re[i] * re[i] + im[i] * im[i]; if (p > best) { best = p; k = i; } } const mag = i => Math.sqrt(re[i] ** 2 + im[i] ** 2); const a = Math.log(mag(k - 1)), b = Math.log(mag(k)), c = Math.log(mag(k + 1)); const d = 0.5 * (a - c) / (a - 2 * b + c); return cents((k + d) * SR / N, ex); });
    const worst = Math.max(...errs.map(Math.abs));
    row(`${cfg.name} chord +3 st`, '≤3 cents each partial', errs.map(e => e.toFixed(2) + 'c').join(' / '), worst <= 3); }

  // Formant preservation sanity (+7 st with compensation): pitch still correct
  eng.m._reset();
  { const out = run(eng, sine(220, 4), 7, { formant: true }); const ex = 220 * Math.pow(2, 7 / 12); const err = cents(peakHz(out, SR * 2), ex);
    row(`${cfg.name} formant-preserve +7 st`, '≤3 cents', `${err >= 0 ? '+' : ''}${err.toFixed(2)} c`, Math.abs(err) <= 3); }

  // Throughput: how many seconds of audio per second of CPU (single core, this sandbox)
  eng.m._reset();
  { const inp = sine(440, 10); const t0 = performance.now(); run(eng, inp, 3); const ms = performance.now() - t0;
    const x = 10000 / ms; row(`${cfg.name} throughput`, '≥10× realtime (mono)', `${x.toFixed(0)}× realtime · ${(100 / x).toFixed(1)}% of one core`, x >= 10); }
}

console.log('\n' + 'TEST'.padEnd(36) + 'TARGET'.padEnd(32) + 'VALUE'.padEnd(46) + 'RESULT');
for (const r of results) console.log(r.test.padEnd(36) + r.target.padEnd(32) + r.value.padEnd(46) + r.pass);
const fails = results.filter(r => r.pass === 'FAIL').length;
console.log(`\n${results.length - fails}/${results.length} passed`);
