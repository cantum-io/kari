// Cost of the in-house tempo detector: the onset front end per 128-frame block (audio thread, stereo, 48 kHz), one
// posted batch's feed, and one analysis of a full 6 s window (main thread, every 2 s). `node bench/tempo.mjs`.
import { OnsetFeature, TempoTracker, AutoBeatDetector, ONSET_HZ } from "../src/content/beat/detect.ts";
const SR = 48000, Q = 128, BUDGET_MS = Q / SR * 1000;
const inL = new Float32Array(Q), inR = new Float32Array(Q);
for (let i = 0; i < Q; i++) { inL[i] = Math.sin(i * 0.1) * 0.5; inR[i] = -inL[i]; }
console.log(`tempo detector at ${SR} Hz, ${Q}-frame blocks; audio budget ${BUDGET_MS.toFixed(3)} ms/block\n`);
{
  const of = new OnsetFeature(SR); let frame = 0, batches = 0;
  for (let i = 0; i < 4000; i++) { if (of.push([inL, inR], Q, frame)) batches++; frame += Q; }
  const N = 400000; const t0 = performance.now();
  for (let i = 0; i < N; i++) { if (of.push([inL, inR], Q, frame)) batches++; frame += Q; }
  const us = (performance.now() - t0) / N * 1000;
  console.log(`${"onset feature (4 bands, log energy, per block)".padEnd(50)} ${us.toFixed(2).padStart(6)} µs/block   ${(us / 1000 / BUDGET_MS * 100).toFixed(2).padStart(5)} % of budget   (${batches} batches posted)`);
}
{
  // a 6 s window of a 128 bpm click-like novelty, then analyze() timed on its own
  const tr = new TempoTracker(1 / ONSET_HZ); const beat = 60 / 128;
  for (let k = 0; k < 600; k++) { const t = k / ONSET_HZ; const onBeat = Math.abs(((t % beat) + beat) % beat) < 0.011; tr.push(onBeat ? 3 : 0.2 + 0.1 * Math.sin(k), onBeat && (Math.round(t / beat) % 4 === 0) ? 2 : 0, t); }
  for (let i = 0; i < 20; i++) tr.analyze();
  const N = 200; const t0 = performance.now();
  for (let i = 0; i < N; i++) tr.analyze();
  const ms = (performance.now() - t0) / N;
  console.log(`${"analyze(): 6 s window, 60–200 bpm, comb refine".padEnd(50)} ${ms.toFixed(3).padStart(6)} ms   (main thread, once per 2 s)`);
}
{
  const st = { ctx: 0 }; const d = new AutoBeatDetector(() => ({ media: st.ctx, ctx: st.ctx, rate: 1, playing: true }));
  d.start({ sampleRate: SR }, { connect() {} });
  const odf = new Float32Array(10).fill(0.3), low = new Float32Array(10).fill(0.1);
  const N = 100000; let t = 0; const t0 = performance.now();
  for (let i = 0; i < N; i++) { t += 0.1; st.ctx = t + 0.03; d.feed({ type: "onset", t, hop: 0.01, odf, low, rms: 0.1 }); }
  const us = (performance.now() - t0) / N * 1000;
  console.log(`${"detector.feed(): one 100 ms batch (incl. the 2 s analyses)".padEnd(50)} ${us.toFixed(2).padStart(6)} µs/batch   (10 batches/s)`);
}
