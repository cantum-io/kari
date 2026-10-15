// Offline replay of a tempo capture (`tapfade.mjs --only A --dump file.json`): the onset batches the worklet posted
// on a real page, with both clocks as the detector read them, fed again through the real AutoBeatDetector in Node so
// a run on the page can be reproduced, and then opened up: what the autocorrelation offers, what each candidate's
// comb explains, where the novelty sits. Built 2026-10-15 for the link-1 question (V3bLpIXaFp8 never commits).
//
//   node tools/probe/replay.mjs capture.json [--at seconds] [--bpm 110,165] [--json]
//
//   (no flags)   replay the detector; print every run (bpm, confidence, P, E, autocorr) next to what the page recorded.
//   --at s       open the window that ends at media time s: the prior-free autocorrelation peaks, the seeds, each
//                seed's best P/E/score, and the share of novelty under a comb at every bpm in --bpm (default: the
//                detector's own winner plus 60–200 in steps the comb can tell apart).
//   --bpm a,b    extra bpm values to comb at (Jesse's count goes here).
//   --window s   analyse with a window of s seconds instead of the tracker's own (experiments only).
//   --odf sum|low|high   which onset signal feeds the tracker: the summed bands (what ships), the low band alone, or
//                the sum minus the low band (experiments only).
//   --ioi        also print the inter-onset-interval histogram of the window's novelty peaks.
//
// Exit 0 always; this is an instrument, not a gate.
import fs from "node:fs";
import { TempoTracker, AutoBeatDetector, tempoPrior, MIN_CONFIDENCE, WINDOW_SEC, BPM_LO, BPM_HI } from "../../src/content/beat/detect.ts";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") && fs.existsSync(a));
if (!file) { console.error("usage: node tools/probe/replay.mjs capture.json [--at s] [--bpm a,b] [--json]"); process.exit(2); }
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const AT = opt("--at", null); const EXTRA = (opt("--bpm", "") || "").split(",").map(Number).filter((x) => x > 0);
const JSON_OUT = argv.includes("--json"), IOI = argv.includes("--ioi");
const WIN = +opt("--window", WINDOW_SEC); const ODF = opt("--odf", "sum");
const pick = (b, k) => ODF === "low" ? b.low[k] : ODF === "high" ? Math.max(0, b.odf[k] - b.low[k]) : b.odf[k];
const cap = JSON.parse(fs.readFileSync(file, "utf8"));
const batches = cap.batches.map((b) => ({ ...b, odf: Float32Array.from(b.odf), low: Float32Array.from(b.low) }));
const f1 = (x) => (x === null || x === undefined ? "–" : (+x).toFixed(1)), f2 = (x) => (x === null || x === undefined ? "–" : (+x).toFixed(2));

/* ---------------- 1. faithful replay through AutoBeatDetector with the recorded clocks */
let clock = { media: 0, ctx: 0, rate: 1, playing: false };
const det = new AutoBeatDetector(() => clock);
const grids = []; det.onGrid((g) => grids.push({ ...g, run: runs.length }));
det.start({ sampleRate: 48000 }, { connect() {} });
const runs = [];
for (let i = 0; i < batches.length; i++) {
  const b = batches[i]; clock = { media: b.media, ctx: b.ctx, rate: b.rate, playing: b.playing };
  const r0 = det.debug.runs; det.feed({ type: "onset", t: b.t, hop: b.hop, odf: b.odf, low: b.low, rms: b.rms });
  if (det.debug.runs !== r0) runs.push({ batch: i + 1, media: b.media, played: det.debug.played, state: det.state, est: det.last });
}
const recorded = cap.runs || [];
const replayRows = runs.map((r, i) => {
  const p = recorded[i], e = r.est, pe = p && p.est;
  return { run: i + 1, media: r.media, bpm: e && e.bpm, conf: e && e.confidence, P: e && e.precision, E: e && e.explained, ac: e && e.autocorr, state: r.state, pageBpm: pe && pe.bpm, pageConf: pe && pe.confidence, pageState: p && p.state, published: grids.some((g) => g.run === i + 1) };
});

/* ---------------- 2. the window ending at --at, opened up */
function windowAt(sec) {
  const dt = batches[0].hop * batches[0].rate;
  const tr = new TempoTracker(dt, WIN);
  // the same gating as the detector: playing batches only, in order, until the window's end
  let rawSum = 0, rawLow = 0;
  for (const b of batches) { if (!b.playing) continue; const start = b.media - (b.ctx - b.t) * b.rate; if (start > sec) break; for (let k = 0; k < b.odf.length; k++) { tr.push(pick(b, k), b.low[k], start + k * dt); rawSum += b.odf[k]; rawLow += b.low[k]; } }
  return { tr, dt, rawLowShare: rawSum > 0 ? rawLow / rawSum : 0 };
}
/** The tracker's own novelty (private): rebuilt here the same way so the comb can be read at any bpm. */
function noveltyOf(tr, src) {
  const n = tr.count, size = tr.size, w = tr.w, start = w - n, M = Math.max(1, Math.round(0.5 / tr.dt / 2));
  const dst = new Float32Array(n), tmp = new Float32Array(n);
  for (let k = 0; k < n; k++) dst[k] = src[(start + k) % size];
  let sum = 0, lo = 0, hi = -1;
  for (let k = 0; k < n; k++) { const nlo = Math.max(0, k - M), nhi = Math.min(n - 1, k + M); while (hi < nhi) sum += dst[++hi]; while (lo < nlo) sum -= dst[lo++]; tmp[k] = sum / (nhi - nlo + 1); }
  let m = 0; const pos = [];
  for (let k = 0; k < n; k++) { const v = dst[k] - tmp[k]; dst[k] = v > 0 ? v : 0; if (v > 0) pos.push(v); }
  m = pos.length; if (!m) return dst;
  pos.sort((a, b) => a - b); const ref = pos[Math.min(m - 1, Math.floor(m * 0.95))] || pos[m - 1];
  if (ref > 0) for (let k = 0; k < n; k++) dst[k] /= ref;
  return dst;
}
const tooth = (nov, n, t, tol = 1) => { const c = Math.round(t); let v = 0; for (let j = c - tol; j <= c + tol; j++) if (j >= 0 && j < n && nov[j] > v) v = nov[j]; return v; };
/** Best comb at period tau (frames) over every phase: P, E, the phase, and which teeth were empty. */
function combAt(nov, n, tau, total) {
  let best = null;
  for (let end = n - 1; end > n - 1 - tau; end -= 0.25) {
    let sum = 0, teeth = 0, empty = 0; for (let t = end; t >= -1; t -= tau) { const v = tooth(nov, n, t); sum += v; teeth++; if (v < 0.05) empty++; }
    const P = sum / teeth, E = sum / total; if (!best || P * E > best.P * best.E) best = { P, E, end, teeth, empty };
  }
  return best;
}
function openWindow(sec, extraBpm) {
  const { tr, dt, rawLowShare } = windowAt(sec); const n = tr.count;
  const nov = noveltyOf(tr, tr.odf), lnov = noveltyOf(tr, tr.low);
  let total = 0, energy = 0, ltotal = 0; for (let k = 0; k < n; k++) { total += nov[k]; energy += nov[k] * nov[k]; ltotal += lnov[k]; }
  // prior-free autocorrelation over the search range
  const tauMin = Math.max(2, Math.floor(60 / (BPM_HI * dt))), tauMax = Math.min(n >> 1, Math.ceil(60 / (BPM_LO * dt)));
  const r = new Float64Array(tauMax + 2);
  for (let tau = tauMin; tau <= tauMax; tau++) { let s = 0; for (let k = 0; k + tau < n; k++) s += nov[k] * nov[k + tau]; r[tau] = s / energy; }
  const peaks = []; for (let tau = tauMin; tau <= tauMax; tau++) if (r[tau] >= (r[tau - 1] || 0) && r[tau] >= (r[tau + 1] || 0)) peaks.push({ tau, bpm: 60 / (tau * dt), r: r[tau], rp: r[tau] * tempoPrior(60 / (tau * dt)) });
  peaks.sort((a, b) => b.rp - a.rp);
  // the novelty itself: how many frames carry it, how peaky it is, the low band's share
  const sortedNov = Array.from(nov).sort((a, b) => b - a); let acc = 0, k50 = 0; for (; k50 < n && acc < 0.5 * total; k50++) acc += sortedNov[k50];
  const over = Array.from(nov).filter((v) => v > 0.3).length;
  // combs at the asked bpm values and at the detector's own winner
  const est = tr.analyze();
  const bpms = new Set(extraBpm); if (est) bpms.add(+est.bpm.toFixed(1)); for (let b = 60; b <= 200; b += 1) bpms.add(b);
  const combs = [...bpms].sort((a, b) => a - b).map((bpm) => { const tau = 60 / (bpm * dt); const c = combAt(nov, n, tau, total); const lc = combAt(lnov, n, tau, ltotal); return { bpm, tau, ...c, score: c.P * c.E * tempoPrior(bpm), r: r[Math.round(tau)] || 0, lowE: lc.E }; });
  const top = combs.slice().sort((a, b) => b.P * b.E - a.P * a.E).slice(0, 8);
  // inter-onset intervals between novelty peaks (local maxima over 0.2)
  const pk = []; for (let k = 1; k < n - 1; k++) if (nov[k] > 0.2 && nov[k] >= nov[k - 1] && nov[k] > nov[k + 1]) pk.push(k);
  const ioi = new Map(); for (let i = 1; i < pk.length; i++) { const d = pk[i] - pk[i - 1]; ioi.set(d, (ioi.get(d) || 0) + 1); }
  const ioiRows = [...ioi.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([d, c]) => ({ frames: d, ms: Math.round(d * dt * 1000), count: c }));
  return { sec, n, total, energy, rawLowShare, peaksCount: pk.length, ioi: ioiRows, frames50: k50, framesOver03: over, est, peaks: peaks.slice(0, 8), combs, top, dt };
}

/* ---------------- output */
if (!AT) {
  if (JSON_OUT) { console.log(JSON.stringify({ file, url: cap.url, found: cap.found, replay: replayRows, grids })); process.exit(0); }
  console.log(`Replay of ${file}\n${cap.url}  captured ${cap.at}  ${batches.length} batches (${batches.filter((b) => b.playing).length} playing), page found: ${cap.found ? `"${cap.found.text}" at ${(cap.found.ms / 1000).toFixed(1)} s` : "nothing"}\n`);
  console.log("run  media   bpm    conf   P     E     ac    state     | page: bpm    conf   state    | published");
  for (const r of replayRows) console.log(`${String(r.run).padStart(3)}  ${f1(r.media).padStart(5)}  ${f1(r.bpm).padStart(5)}  ${f2(r.conf)}   ${f2(r.P)}  ${f2(r.E)}  ${f2(r.ac)}  ${(r.state || "").padEnd(8)}  | ${f1(r.pageBpm).padStart(5)}  ${f2(r.pageConf)}   ${(r.pageState || "–").padEnd(8)} | ${r.published ? "yes" : ""}`);
  const same = replayRows.every((r) => r.pageBpm === undefined || (Math.abs(r.bpm - r.pageBpm) < 0.05 && Math.abs(r.conf - r.pageConf) < 0.005));
  console.log(`\n${same ? "replay matches the page's runs" : "REPLAY DIFFERS from the page's runs"} (${replayRows.length} runs replayed, ${recorded.length} recorded, ${grids.length} grids published offline)`);
} else {
  const w = openWindow(+AT, EXTRA);
  if (JSON_OUT) { console.log(JSON.stringify(w)); process.exit(0); }
  console.log(`Window ending at ${AT} s of ${cap.url} (${w.n} frames, ${(w.n * w.dt).toFixed(1)} s)`);
  console.log(`odf ${ODF}, window ${WIN} s. novelty: total ${w.total.toFixed(1)}, half of it in ${w.frames50} frames, ${w.framesOver03} frames over 0.3, ${w.peaksCount} peaks over 0.2 (${(w.peaksCount / (w.n * w.dt)).toFixed(1)}/s); the low band is ${(w.rawLowShare * 100).toFixed(0)}% of the raw summed ODF`);
  if (IOI) console.log(`inter-onset intervals (top): ${w.ioi.map((r) => `${r.ms} ms ×${r.count}`).join(", ")}`);
  const e = w.est; console.log(`detector's answer: ${e ? `${e.bpm.toFixed(1)} bpm conf ${e.confidence.toFixed(2)} (P ${e.precision.toFixed(2)} E ${e.explained.toFixed(2)} ac ${e.autocorr.toFixed(2)}, class ${e.downbeatClass})` : "null"}  bar ${MIN_CONFIDENCE}`);
  console.log("\nautocorrelation peaks (prior-free r, and r·prior as the search ranks them):");
  for (const p of w.peaks) console.log(`  ${p.bpm.toFixed(1).padStart(6)} bpm  tau ${String(p.tau).padStart(3)}  r ${p.r.toFixed(3)}  r·prior ${p.rp.toFixed(3)}`);
  console.log("\nbest comb by P·E (any phase), with the share of low-band novelty it explains:");
  for (const c of w.top) console.log(`  ${c.bpm.toFixed(1).padStart(6)} bpm  P ${c.P.toFixed(2)}  E ${c.E.toFixed(2)}  P·E ${(c.P * c.E).toFixed(3)}  ×prior ${c.score.toFixed(3)}  r ${c.r.toFixed(2)}  teeth ${c.teeth} (${c.empty} empty)  lowE ${c.lowE.toFixed(2)}`);
  if (EXTRA.length) { console.log("\nasked:"); for (const b of EXTRA) { const c = w.combs.find((x) => x.bpm === b); if (c) console.log(`  ${c.bpm.toFixed(1).padStart(6)} bpm  P ${c.P.toFixed(2)}  E ${c.E.toFixed(2)}  P·E ${(c.P * c.E).toFixed(3)}  r ${c.r.toFixed(2)}  teeth ${c.teeth} (${c.empty} empty)  lowE ${c.lowE.toFixed(2)}`); } }
}
