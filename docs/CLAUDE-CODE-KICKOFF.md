# Claude Code kickoff — Mimi (YGG HOMME × Cantum)

Paste everything below the line into a fresh Claude Code session opened in an empty folder on the Mac (e.g. `~/Projects/mimi`). Have the `mimi-v1-scaffold.zip` from the claude.ai chat in that folder before you start; the prompt tells Claude Code to unpack it and continue. Nothing else is needed from you: the session creates the repo, installs, builds, and tells you when to load the extension in Chrome and what to listen for.

---

You are ATLAS, building **Mimi**: a free, open-source (GPL-2.0) Chrome extension by YGG HOMME, powered by Cantum, that changes pitch and speed of YouTube videos in real time with studio-grade accuracy, fronted by a small animated character named Mimi. Audio precision is the product; Mimi is its face. YouTube `/watch` pages only for v1 (no Shorts, no YouTube Music).

## Read first
1. Unzip `mimi-v1-scaffold.zip` in this folder. It contains the full Sprint 0–2 build from the cloud session: `extension/` (MV3 source), `bench/` (engine accuracy bench with results), `docs/` (build brief, bench results, UI playground HTML), tests. Read `docs/BUILD-BRIEF.md` and `docs/SPRINT-0-BENCH.md` end to end before writing code. They carry every decision already made; do not relitigate them.
2. `git init`, first commit as-is, then `npm install` and `npm test`. Report the test result before touching anything.

## Decisions already made (do not reopen)
- **One-pass rule.** Tempo rides the `<video>` element: `playbackRate = r`, `preservesPitch = false` (Chrome's resampler; picture and sound share one clock). The engine applies only a pitch ratio: `2^(k/12) ÷ r` with key lock on, `2^(k/12)` with it off. Nothing is attached to the audio graph until the user's first change; at 0 st / 1.0× the path is a straight wire.
- **Engine: Rubber Band R3** (`rubberband-wasm` 3.3.0, GPL) — options `ProcessRealTime | EngineFiner | PitchHighQuality | WindowShort | ChannelsTogether`. Bench: ≤0.9 cents error at every step 55 Hz–1 kHz, 22 ms delay. **Fallback tier: Signalsmith Stretch** (`signalsmith-stretch` 1.3.2, MIT) at `blockMs:120, intervalMs:15`, engaged by the underrun watchdog. Never SoundTouch, never Tone.js/jungle delay-line shifters.
- **Bypass-on-failure**: a pure `GainNode` path that carries audio if the worklet ever stalls or throws. Silence is never an acceptable failure mode.
- **Attach late, crossfade in** over ~40 ms to avoid the first-attach click.
- **SPA navigation**: listen for `yt-navigate-finish` on `document`; fallback `MutationObserver` on `body` comparing `location.href`; wait for the `<video>` element, never a fixed timer. The `<video>` inside `#movie_player` is reused across videos; keep the `MediaElementSource`, re-mount the dock, re-read the video id.
- **Hooks**: only the `<video>` element and `#movie_player`. Never YouTube's control-bar class names.
- **Ads**: bypass while the player has the ad-showing class; DRM: detect silence after attach and show Mimi's failure face with a one-line reason.
- **YouTube's own speed menu**: listen for `ratechange`, adopt their rate as the new base, re-assert `preservesPitch=false`.
- **Permissions**: `host_permissions` for `*://www.youtube.com/*` and `storage` only. No `tabs`, no remote code. Worklet and WASM ship inside the extension as `web_accessible_resources`; WASM is compiled in the page context and the module is transferred to the worklet over the port.
- **UI**: in-player dock, top-right of `#movie_player`, inside a Shadow DOM, fades with YouTube's controls on idle, collapses to Mimi alone in miniplayer/narrow players. Controls: one slider (left slow, right fast), Pitch −/+ and Tempo −/+ buttons, everything at 0 by default. **Full control** toggle reveals key lock, vinyl, range ±8/16/50, hold-to-compare, reset, key names, live A/V delay readout. **Hide** folds the controls into Mimi; click Mimi to bring them back. Gear opens Settings: interface (Organism default, Void Signal, Alien Weather, Constellation), Mimi colour (blue/pink/black), wardrobe (YGG cap, thin black sunglasses, chunky sneakers), plush trophy toggle, link to the options page. `chrome.storage.sync` for all of it. The reference implementation of every skin, Mimi, the beat pulse, blink, bubble, hide/absorb and settings is in `docs/playground.html` — port it, don't redesign it.
- **Mimi's idle** pulses on the music from an `AnalyserNode` RMS envelope (not on a BPM timer). She blinks, and blows a bubble on every parameter change. She has a failure face (dim, one eye closed, readout) for DRM/engine-down.
- **Motion budget**: transform/opacity only, ≤5% CPU while audio runs, all loops pause when the tab is hidden, `prefers-reduced-motion` honoured. Register R2 (floaty), never busier.
- **Options page** (`options.html`): everything durable — interface, Mimi, wardrobe, plush, shortcuts, default range, engine tier (auto / R3 / Signalsmith), reset. Same storage keys as the dock.
- **Name**: product is "Mimi". Store listing must not contain the word "YouTube" in the name. Credit line: "YGG HOMME · powered by Cantum · Rubber Band Library (GPL)".

## Sprints from here
- **Sprint 3 — Truth layer**: underrun watchdog + step-down ladder (R3 short → R3 standard → Signalsmith → bypass), A/V delay readout (`AudioContext.outputLatency + engine delay`), Mimi failure face, first-open one-liner ("slide to slow down or speed up the music"), ad/DRM handling verified live.
- **Sprint 4 — Ship**: options page polish, Weather + Constellation skins ported, icons (16/32/48/128), store screenshots from real YouTube, privacy policy (no data collected), `README` with GPL notice and Rubber Band credit, zip for the Web Store. Stop before submitting; Jesse clicks submit.

## How to work
- Use the Chrome extension tools to load the unpacked extension and test on real videos: one drum-heavy track, one vocal track, one bass-heavy track, one with a mid-roll ad, one movie/rental (DRM). Record what you hear as text in `docs/LIVE-PROBE.md` with the console underrun counts and measured `outputLatency`.
- Verify every claim by a path independent of the code that made it (a test, a console reading, a measured number). Label anything unmeasured UNVERIFIED.
- Ship at 80% and iterate. Commit small. Message Jesse only at sprint boundaries, or when a decision can't be reversed, with: what shipped, what to listen for, the two questions you couldn't decide.
- Never send, post, submit, or sign anything as Jesse. Web Store submission is his click.
