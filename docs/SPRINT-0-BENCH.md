# Sprint 0 — accuracy bench

Two measurements: the engine alone in Node (`npm run bench`), and the shipped worklet on youtube.com in Chrome
(`tools/probe`). Every number below was produced by those scripts on 2026-09-26 on a MacBook Air M4 (Node 25.5,
Chrome 153, rubberband-wasm 3.3.0, signalsmith-stretch 1.3.2). Anything not re-run that day is marked UNVERIFIED.

## 1. Engine bench (`bench/bench_rb.mjs`)

Method: mono sines at 48 kHz fed through Rubber Band in 128-frame blocks in real-time mode; frequency of the
output read by zero-crossing over the last 2.5 s of a 5 s tone; error in cents against the expected pitch.

| config | start delay | +3 st error at 55 / 110 / 196 / 440 / 1046.5 Hz (cents) | 440 Hz at +1 / −1 / +5 / −5 / +12 / −12 st (cents) | level | × realtime |
|---|---|---|---|---|---|
| R3 finer · HighQuality · together | 36 ms | +1.8 · +1.9 · +0.4 · +0.5 · +0.0 | +0.0 / +0.0 / +0.3 / −0.0 / +0.2 / +0.3 | −0.06 dB | 18 |
| R3 finer · HighConsistency | 36 ms | +1.8 · +1.9 · +0.4 · +0.5 · +0.0 | +0.0 / −0.0 / +0.3 / +0.0 / +0.2 / −0.0 | −0.06 dB | 19 |
| **R3 finer · WindowShort** | **22 ms** | **−0.0 · +0.0 · +0.3 · +0.5 · −0.0** | **+0.0 / +0.9 / +0.2 / +0.0 / +0.0 / +0.0** | **−0.04 dB** | **38** |
| R2 faster · HighQuality | 18 ms | +67.8 · −16.6 · +18.3 · −0.0 · +3.9 | +23.3 / +1.8 / −8.7 / +8.9 / −11.4 / +38.5 | −0.27 dB | 41 |

Shipped configuration: `ProcessRealTime | EngineFiner | PitchHighConsistency | WindowShort | ChannelsTogether`.
The WindowShort row is the closest bench row; HighConsistency was added for stable pitch across parameter changes
and costs nothing measurable here. R2 is out: tens of cents off on bass.

"Start delay" is what `rubberband_get_start_delay()` reports. It is **not** the delay you get in a real-time
stream; see §3.

Signalsmith Stretch (fallback tier, 120 ms block / interval ÷8) was swept in `bench/bench.mjs`–`bench3.mjs` during
Sprint 0. Those sweeps were not re-run on 2026-09-26: UNVERIFIED today.

## 2. Live confirmation in Chrome (`tools/probe`, youtube.com)

The shipped worklet, attached to the real `<video>` on a watch page, AudioContext at 44.1 kHz, MacBook Air built-in
output. The probe taps the input to the engine and the summing point that feeds the speakers with its own analysers
and reads both frequencies by zero-crossing over 0.74 s windows; the engine's own readouts are not used.

440 Hz test tone (video `eo1xFsEXkpY`), error of output against input:

| setting | expected | measured (3 reads) |
|---|---|---|
| +1 st | +100.00 c | 99.98 · 100.00 · 100.02 |
| +5 st | +500.00 c | 500.00 · 500.00 · 500.00 |
| −5 st | −500.00 c | −499.99 · −499.99 · −499.99 |
| +12 st | +1200.00 c | 1200.00 · 1200.00 · 1200.01 |
| −12 st | −1200.00 c | −1199.99 · −1199.99 · −1199.99 |
| +50 cents | +50.00 c | 50.00 · 50.00 · 50.00 |
| key lock, +16 % speed | output 440.00 Hz (input 510.40) | 439.97 · 440.00 · 440.00 |
| key lock, −16 % speed | output 440.00 Hz (input 369.60) | 440.00 · 440.00 · 440.00 |
| vinyl, +16 % speed | straight wire, 0 c | 0.00 (engine not attached) |
| neutral | straight wire, 0 c, 0 dB | 0.00 c, 0.00 dB after the limiter trim |

Cold start from the first Pitch press to Rubber Band running: 26–42 ms (context creation, worklet module load,
WASM compile, engine init). Load: 6–10 % of the audio-thread budget on this machine.

## 3. Stream latency (`bench/latency.mjs`)

A click train through the shipped worklet in a simulated `AudioWorkletGlobalScope`; in→out delay by envelope
cross-correlation, refined by waveform cross-correlation; the value the worklet reports on its `warm` message
alongside it.

| cushion (frames held before going live) | 44.1 kHz reported / true | 48 kHz reported / true | steady-state underruns in 7 s |
|---|---|---|---|
| 0 | 2176 / 2601 | 2176 / 2590 | 102 |
| 256 | 2688 / 2676 | 2688 / 2690 | 0 |
| **512 (shipped)** | **2688 / 2697** | **2688 / 2689** | **0** |
| 768 | 3200 / 3202 | 3200 / 3177 | 0 |

With no cushion the ring starves every few hundred milliseconds: each starvation is one block of silence and adds
128 frames of permanent delay, which is why the true delay drifts above what the worklet reports. With the cushion
the reported delay is the true delay within 25 frames, and the ratio sweep at 0.5 / 0.84 / 1.12 / 1.5 / 2.0 stays at
zero underruns.

**The engine's real delay is therefore 2688 frames: 61 ms at 44.1 kHz, 56 ms at 48 kHz.** The wet path adds the 6 ms
look-ahead of Chrome's `DynamicsCompressor` (used as the peak limiter). Measured on youtube.com with a 60 BPM
metronome (`ymJIXzvDvj4`): wet path 2953 frames, hold-to-compare path 2688 + 265 frames once the look-ahead is
included. Total sound-behind-picture on this Mac's built-in output: 61 + 6 + 24 (output) + 6 (base) = **97 ms**,
against the 90 ms target in the build brief. The brief's "≈43 ms" and the README's earlier "22 ms" were the engine's
self-reported start delay, not a measured stream delay.
