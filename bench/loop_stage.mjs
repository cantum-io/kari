// Cost of the beat-loop stage per 128-frame block, stereo, 48 kHz: idle (no loop), looping (¼ beat at 128 bpm),
// and through a jump fade. `node bench/loop_stage.mjs`. Budget per block at 48 kHz = 2.667 ms.
import { LoopStage, DelayLine } from "../src/worklet/loop.js";
const SR = 48000, Q = 128, BUDGET_MS = Q / SR * 1000;
const inL = new Float32Array(Q), inR = new Float32Array(Q);
for (let i = 0; i < Q; i++) { inL[i] = Math.sin(i * 0.1) * 0.5; inR[i] = -inL[i]; }
function time(label, setup, blocks = 200000) {
  const st = new LoopStage(SR); setup(st);
  for (let i = 0; i < 2000; i++) st.process([inL, inR], Q);           // warm the JIT
  const t0 = performance.now();
  for (let i = 0; i < blocks; i++) st.process([inL, inR], Q);
  const us = (performance.now() - t0) / blocks * 1000;
  console.log(`${label.padEnd(44)} ${us.toFixed(2).padStart(6)} µs/block   ${(us / 1000 / BUDGET_MS * 100).toFixed(2).padStart(5)} % of budget`);
  return us;
}
console.log(`LoopStage at ${SR} Hz, ${Q}-frame blocks, stereo; budget ${BUDGET_MS.toFixed(3)} ms/block\n`);
time("idle: capture ring only (no loop latched)", () => {});
time("looping ¼ beat at 128 bpm (5625 frames)", (st) => { for (let i = 0; i < 100; i++) st.process([inL, inR], Q); st.engage(5625, 1000); });
time("looping 1 beat at 60 bpm (48000 frames)", (st) => { for (let i = 0; i < 400; i++) st.process([inL, inR], Q); st.engage(48000, 40000); });
// engage cost: a 1-beat latch at 60 bpm copies up to 48000 frames out of the ring
{
  const st = new LoopStage(SR); for (let i = 0; i < 500; i++) st.process([inL, inR], Q);
  let t = 0; for (let k = 0; k < 2000; k++) { const t0 = performance.now(); st.engage(48000, 40000); t += performance.now() - t0; }
  console.log(`${"engage(): 1-beat body copy at 60 bpm".padEnd(44)} ${(t / 2000 * 1000).toFixed(2).padStart(6)} µs (once per latch)`);
  t = 0; for (let k = 0; k < 2000; k++) { const t0 = performance.now(); st.engage(5625, 5000); t += performance.now() - t0; }
  console.log(`${"engage(): ¼-beat body copy at 128 bpm".padEnd(44)} ${(t / 2000 * 1000).toFixed(2).padStart(6)} µs (once per latch)`);
}
{
  const dl = new DelayLine(16384); dl.setDelay(2952); const o0 = new Float32Array(Q), o1 = new Float32Array(Q);
  for (let i = 0; i < 2000; i++) dl.process(inL, inR, o0, o1, Q);
  const t0 = performance.now(); for (let i = 0; i < 200000; i++) dl.process(inL, inR, o0, o1, Q);
  const us = (performance.now() - t0) / 200000 * 1000;
  console.log(`${"bypass DelayLine at 2952 frames".padEnd(44)} ${us.toFixed(2).padStart(6)} µs/block   ${(us / 1000 / BUDGET_MS * 100).toFixed(2).padStart(5)} % of budget`);
}
