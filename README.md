# Kari

Real-time pitch and speed for music on YouTube, with studio-grade accuracy, fronted by a small animated character.
YGG HOMME · powered by Cantum. Free software under the GPL-2.0.
Source: https://github.com/cantum-io/kari · Privacy: [docs/PRIVACY.md](docs/PRIVACY.md) · Contributing: [CONTRIBUTING.md](CONTRIBUTING.md) · Security: [SECURITY.md](SECURITY.md)

- Slide left to slow the song down, right to speed it up; pitch moves with it, like a record. Tap Pitch −/+ to change the key. Everything starts at 0. Key lock (pitch held while speed changes) is under Full control.
- Nothing touches the audio until you change the key. Speed alone is Chrome's own resampler, artifact-free; the engine only runs when the key changes.
- Accuracy: within 0.02 cents at every step from −12 to +12 semitones, measured on the audio that reaches the speakers on youtube.com; key lock holds 440.00 Hz at ±16 % speed. Engine delay 61 ms at 44.1 kHz (56 ms at 48 kHz) plus 6 ms of limiter look-ahead; total sound-behind-picture 97 ms on a MacBook Air's built-in output. See `docs/SPRINT-0-BENCH.md` and `docs/LIVE-PROBE.md`.
- YouTube `/watch` pages only. No data leaves your browser. No accounts.

## Install (no building needed)
1. Download **[kari-extension.zip](https://github.com/cantum-io/kari/releases/latest/download/kari-extension.zip)** and unzip it.
   (Or use GitHub's green **Code → Download ZIP**: the ready-to-load folder is `extension/` inside it.)
2. Open `chrome://extensions`, switch on **Developer mode** (top right), click **Load unpacked**, and pick the unzipped folder.
3. Open any music video on youtube.com. The dock sits at the top right of the player.

The Chrome Web Store listing comes later; until then this is the official way in.

## How it works — the one-pass rule
Tempo rides the `<video>` element (`playbackRate` with `preservesPitch=false`, so Chrome's resampler does the work and picture and sound share one clock). One engine applies only a pitch ratio: `2^(k/12) ÷ r` with key lock on, `2^(k/12)` with it off. Never two lossy passes.

Engines: **Rubber Band Library R3** (primary, GPL) and **Signalsmith Stretch** (fallback, MIT), both compiled to WebAssembly and run inside one AudioWorklet. A parallel `GainNode` bypass path guarantees audio if the engine ever stalls.

## Develop
```
npm install
npm run build        # → extension/
npm test             # runs the shipped worklet bundle in a simulated AudioWorkletGlobalScope + one-pass math
npm run bench        # engine accuracy bench (Rubber Band); see bench/ for the Signalsmith sweeps
npm run zip          # → kari-extension.zip for the Chrome Web Store
```
Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → pick `extension/`.
`extension/` is committed and reproducible: CI rebuilds it from source and fails if the committed files differ, so after changing `src/` run `npm run build` and commit `extension/` too.

## Layout
```
extension/        manifest, options page, icons, built bundles (content.js, worklet.js, sw.js, options.js, rubberband.wasm)
src/shared/       math.ts (one-pass rule, readouts), storage.ts (settings + per-video memory)
src/content/      index.ts (bootstrap), yt.ts (page plumbing), audio/controller.ts, ui/dock.ts + dock.css.ts
src/worklet/      processor.js (R3 + Signalsmith host, bypass, watchdog)
src/background/   sw.ts (defaults, commands)
src/options/      options.ts
tests/            node --test
bench/            Sprint 0 accuracy benches + bench/latency.mjs (stream delay, underruns)
tools/probe/      live-probe harness (Playwright driver + isolated-world audio taps)
docs/             build brief, bench results, UI playground, Claude Code kickoff, live-probe checklist
```

## Credits
Cantum Marketing LLC (cantum.io) is the builder of record; YGG HOMME is the brand.
Rubber Band Library © Particular Programs Ltd, GPL-2.0 — https://breakfastquay.com/rubberband/
Signalsmith Stretch © Geraint Luff, MIT — https://signalsmith-audio.co.uk/code/stretch/
`rubberband-wasm` and `signalsmith-stretch` npm builds by their respective authors.

## Licence
GPL-2.0-only. See `LICENSE`. Free, no paid tier.
