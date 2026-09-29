# Claude Code kickoff — Kari (YGG HOMME × Cantum)

Paste everything below the line into a fresh Claude Code session opened in an empty folder on the Mac (e.g. `~/Projects/kari`). Have the `kari-v1-scaffold.zip` from the claude.ai chat in that folder before you start; the prompt tells Claude Code to unpack it and continue. Nothing else is needed from you: the session creates the repo, installs, builds, and tells you when to load the extension in Chrome and what to listen for.

---

You are ATLAS, building **Kari**: a free, open-source (GPL-2.0) Chrome extension by YGG HOMME, powered by Cantum, that changes pitch and speed of YouTube videos in real time with studio-grade accuracy, fronted by a small animated character named Kari. Audio precision is the product; Kari is its face. YouTube `/watch` pages only for v1 (no Shorts, no YouTube Music).

## Read first
1. Unzip `kari-v1-scaffold.zip` in this folder. It is a git repo with one commit: the full Sprint 0–3 code from the cloud session — `extension/` (built MV3 bundle, loadable as-is), `src/`, `bench/`, `tests/` (15 passing, run against the shipped worklet bundle), `docs/` (build brief, bench results, UI playground, this file, `LIVE-PROBE.md`). Read `README.md`, `docs/BUILD-BRIEF.md`, `docs/SPRINT-0-BENCH.md` and `docs/LIVE-PROBE.md` end to end before writing code. They carry every decision already made; do not relitigate them.
2. `npm install`, `npm run build`, `npm test`. Report the test result before touching anything. Everything in the code has been verified in Node only; **nothing has run in Chrome yet.** Your first real job is the live probe.

## Decisions already made (do not reopen)
- **One-pass rule.** Speed rides the `<video>` element: `playbackRate = r`, `preservesPitch = false` (Chrome's resampler; picture and sound share one clock). **Default is vinyl: pitch moves with speed like a record, and the engine is not attached at all.** The engine attaches only when the Pitch buttons change the key (`2^(k/12)`), or when the opt-in key lock is on (`2^(k/12) ÷ r`). At 0 st the path is a straight wire regardless of speed.
- **Engine: Rubber Band R3** (`rubberband-wasm` 3.3.0, GPL) — options `ProcessRealTime | EngineFiner | PitchHighQuality | WindowShort | ChannelsTogether`. Bench: ≤0.9 cents error at every step 55 Hz–1 kHz, 22 ms delay. **Fallback tier: Signalsmith Stretch** (`signalsmith-stretch` 1.3.2, MIT) at `blockMs:120, intervalMs:15`, engaged by the underrun watchdog. Never SoundTouch, never Tone.js/jungle delay-line shifters.
- **Bypass-on-failure**: a pure `GainNode` path that carries audio if the worklet ever stalls or throws. Silence is never an acceptable failure mode.
- **Attach late, crossfade in** over ~40 ms to avoid the first-attach click.
- **SPA navigation**: listen for `yt-navigate-finish` on `document`; fallback `MutationObserver` on `body` comparing `location.href`; wait for the `<video>` element, never a fixed timer. The `<video>` inside `#movie_player` is reused across videos; keep the `MediaElementSource`, re-mount the dock, re-read the video id.
- **Hooks**: only the `<video>` element and `#movie_player`. Never YouTube's control-bar class names.
- **Ads**: bypass while the player has the ad-showing class; DRM: detect silence after attach and show Kari's failure face with a one-line reason.
- **YouTube's own speed menu**: listen for `ratechange`, adopt their rate as the new base, re-assert `preservesPitch=false`.
- **Permissions**: `host_permissions` for `*://www.youtube.com/*` and `storage` only. No `tabs`, no remote code. Worklet and WASM ship inside the extension as `web_accessible_resources`; WASM is compiled in the page context and the module is transferred to the worklet over the port.
- **UI**: in-player dock, top-right of `#movie_player`, inside a Shadow DOM, fades with YouTube's controls on idle, collapses to Kari alone in miniplayer/narrow players. Controls: one slider (left slow, right fast; pitch follows), Pitch −/+ and Speed −/+ buttons, everything at 0 by default. **Full control** toggle reveals vinyl (default) / key lock, range ±8/16/50, hold-to-compare, reset, key names, live A/V delay readout. **Hide** folds the controls into Kari; click Kari to bring them back. Gear opens Settings: interface (Organism default, Void Signal, Alien Weather, Constellation), Kari colour (blue/pink/black), wardrobe (YGG cap, thin black sunglasses, chunky sneakers), plush trophy toggle, link to the options page. `chrome.storage.sync` for all of it. The reference implementation of every skin, Kari, the beat pulse, blink, bubble, hide/absorb and settings is in `docs/playground.html` — port it, don't redesign it.
- **Kari's idle** pulses on the music from an `AnalyserNode` RMS envelope (not on a BPM timer). She blinks, and blows a bubble on every parameter change. She has a failure face (dim, one eye closed, readout) for DRM/engine-down.
- **Motion budget**: transform/opacity only, ≤5% CPU while audio runs, all loops pause when the tab is hidden, `prefers-reduced-motion` honoured. Register R2 (floaty), never busier.
- **Options page** (`options.html`): everything durable — interface, Kari, wardrobe, plush, shortcuts, default range, engine tier (auto / R3 / Signalsmith), reset. Same storage keys as the dock.
- **Name**: product is "Kari". Store listing must not contain the word "YouTube" in the name. Credit line: "YGG HOMME · powered by Cantum · Rubber Band Library (GPL)". **Free, no paid tier, no gating of any kind.**

## What already exists (built, Node-tested, Chrome-UNVERIFIED)
Audio spine (`src/content/audio/controller.ts`, `src/worklet/processor.js`): late attach that waits for user activation, 40 ms crossfade, dry/wet routing with delay-matched compare, R3 with `PitchHighConsistency|WindowShort|ChannelsTogether`, Signalsmith fallback at 120 ms/÷8, underrun + load watchdog with the step-down ladder, straight-wire bypass on any engine error, `ratechange` adoption of YouTube's own speed, ad bypass, DRM silence detection, A/V offset computed from `outputLatency + baseLatency + engine delay`. Dock (`src/content/ui/`): all four skins, Kari with audio-reactive pulse from an AnalyserNode, blink, bubble, wardrobe, colourways, failure face, hide/absorb, gear settings, intro tip, fades with YouTube's controls, collapses to Kari alone on narrow/miniplayer. Options page. Keyboard commands. Per-video memory.

## Sprints from here
- **Sprint 3 — Live probe + fixes**: run every row of `docs/LIVE-PROBE.md` in real Chrome on real videos, record results in that file, fix what fails. Expected trouble spots: CSP on worklet/WASM load (competitors prove it works, but verify), the Shadow DOM z-index against YouTube's own overlays, click-through to the player, font fallbacks, AirPods offset.
- **Sprint 4 — Ship**: store screenshots from real YouTube, privacy policy text (no data collected), listing copy, `npm run zip`. Stop before submitting; Jesse clicks submit.

## How to work
- Use the Chrome extension tools to load the unpacked extension and test on real videos: one drum-heavy track, one vocal track, one bass-heavy track, one with a mid-roll ad, one movie/rental (DRM). Record what you hear as text in `docs/LIVE-PROBE.md` with the console underrun counts and measured `outputLatency`.
- Verify every claim by a path independent of the code that made it (a test, a console reading, a measured number). Label anything unmeasured UNVERIFIED.
- Ship at 80% and iterate. Commit small. Message Jesse only at sprint boundaries, or when a decision can't be reversed, with: what shipped, what to listen for, the two questions you couldn't decide.
- Never send, post, submit, or sign anything as Jesse. Web Store submission is his click.
