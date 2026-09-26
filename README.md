# Mimi

Real-time pitch and speed for music on YouTube, with studio-grade accuracy, fronted by a small animated character.
By **YGG HOMME**, powered by **Cantum**. Free software under the GPL-2.0.

- Slide left to slow the song down, right to speed it up. Tap Pitch −/+ to change the key. Everything starts at 0.
- Nothing touches the audio until you change something. At 0 st / 1.00× the path is a straight wire.
- Accuracy: ≤1 cent across 55 Hz–1 kHz and ±12 semitones (Rubber Band R3), 22 ms engine delay. See `docs/SPRINT-0-BENCH.md`.
- YouTube `/watch` pages only. No data leaves your browser. No accounts.

## How it works — the one-pass rule
Tempo rides the `<video>` element (`playbackRate` with `preservesPitch=false`, so Chrome's resampler does the work and picture and sound share one clock). One engine applies only a pitch ratio: `2^(k/12) ÷ r` with key lock on, `2^(k/12)` with it off. Never two lossy passes.

Engines: **Rubber Band Library R3** (primary, GPL) and **Signalsmith Stretch** (fallback, MIT), both compiled to WebAssembly and run inside one AudioWorklet. A parallel `GainNode` bypass path guarantees audio if the engine ever stalls.

## Develop
```
npm install
npm run build        # → extension/
npm test             # runs the shipped worklet bundle in a simulated AudioWorkletGlobalScope + one-pass math
npm run bench        # engine accuracy bench (Rubber Band); see bench/ for the Signalsmith sweeps
npm run zip          # → mimi-extension.zip for the Chrome Web Store
```
Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → pick `extension/`.

## Layout
```
extension/        manifest, options page, icons, built bundles (content.js, worklet.js, sw.js, options.js, rubberband.wasm)
src/shared/       math.ts (one-pass rule, readouts), storage.ts (settings + per-video memory)
src/content/      index.ts (bootstrap), yt.ts (page plumbing), audio/controller.ts, ui/dock.ts + dock.css.ts
src/worklet/      processor.js (R3 + Signalsmith host, bypass, watchdog)
src/background/   sw.ts (defaults, commands)
src/options/      options.ts
tests/            node --test
bench/            Sprint 0 accuracy benches
docs/             build brief, bench results, UI playground, Claude Code kickoff, live-probe checklist
```

## Credits
Rubber Band Library © Particular Programs Ltd, GPL-2.0 — https://breakfastquay.com/rubberband/
Signalsmith Stretch © Geraint Luff, MIT — https://signalsmith-audio.co.uk/code/stretch/
`rubberband-wasm` and `signalsmith-stretch` npm builds by their respective authors.

## Licence
GPL-2.0-only. See `LICENSE`. If this project is ever distributed under a proprietary licence, the Rubber Band commercial licence must be obtained first.
