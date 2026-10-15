# Kari: SoundCloud and beat loops — research (2026-10-14)

Research only. Nothing is built. Items marked UNVERIFIED were not confirmed by a live read or source.

## Jesse's rulings

| Topic | Ruling |
|---|---|
| Scope of this build | YouTube + SoundCloud. Bandcamp skipped. Spotify and Apple Music saved for a later build (terms risk accepted; no logged-in accounts yet, so their DRM test waits). |
| Packaging | One Chrome extension for every site. |
| Keyboard | Kari never takes over the user's keyboard. Loop buttons and pads are click and MIDI only. |
| "Does nothing until asked" | Dropped. Goal is state of the art; beat detection may listen from playback start. |
| Loop buffer legal read | Jesse accepts the exposure. Use is internal plus beatmakers he invites. |
| SoundCloud capture | Hook into the page first; tab capture as the fallback. |
| Loop buttons | Three buttons (¼, ½, 1 beat), tap to latch. |
| After a loop | Slip mode: the track runs underneath and playback drops back in where it would be. |
| Beat grid | Auto-detect with tap-tempo override. |
| A♭m placeholder | Stays on YouTube until real key detection ships. |

## What Kari has today (read from source)

- Audio: `createMediaElementSource` on YouTube's `<video>` → Rubber Band worklet → limiter → out, with delay-matched dry paths (`src/content/audio/controller.ts`).
- Speed: `video.playbackRate` with `preservesPitch = false`.
- **No key or BPM detection.** The key readout is a fixed A♭m (`src/content/ui/dock.ts:152`, `BASE_KEY = 8`, "until detection exists"); the BPM slot is empty.
- Keyboard: Chrome commands only (Alt+arrows, rebindable), plus keys inside the focused dock.

## SoundCloud

- Checked live: no `<audio>` or `<video>` in the page. The bottom bar `.playControls` (skip, play, shuffle, repeat, timeline, cast, volume, sound badge) persists across pages. That is Kari's home on SoundCloud.
- SoundCloud plays HLS through MSE and builds its own Web Audio graph on a detached `new Audio()` ([SoundCloud engineering blog](https://developers.soundcloud.com/blog/playback-on-web-at-soundcloud)). A second `createMediaElementSource` throws.
- Proven hook: a MAIN-world script at `document_start` patches `AudioContext.prototype.createMediaElementSource` and `AudioNode.prototype.connect` so SoundCloud's own source feeds our worklet. Reference: [Itslush/soundcloud-track-control](https://github.com/Itslush/soundcloud-track-control) (MIT, `src/soundcloud/tempo-wasm.js:631`, confirmed). The same pattern appears in patchrome-ext, youtube-musical-spectrum, chromic, soundstage.
- Fallbacks: dummy-element trick (globalSpeed, Firefox only, UNVERIFIED on Chrome); `chrome.tabCapture` + offscreen document.
- Encrypted (DRM) and `snipped` preview transcodings exist (soundcloud-dl `src/background.ts:660-670`). Behaviour on DRM tracks is UNVERIFIED.
- Nobody has shipped BPM/key detection or beat-locked loops for SoundCloud.

## Beat loops

- Seeking the media element is unusable at ¼ beat (117 ms at 128 BPM, 86 ms at 174 BPM). Plan: a ~2 s ring buffer in the worklet, before the pitch engine, so the key change applies to the loop and Rubber Band stays the only lossy stage. 1 beat at 60 BPM = 1 s = 384 KB at 48 kHz stereo float32.
- Reference design: Mixxx (`GPL-2.0-or-later`): `src/engine/controls/loopingcontrol.cpp` (beatlooproll, slip, quantized start), `readaheadmanager.cpp` (seam crossfade), `cuecontrol.cpp` (hot cues).

## Beat and key detection candidates (licence vs GPL-2.0-only)

| Option | Licence | Fit |
|---|---|---|
| CPJKU/beat_this (small ≈ 8 MB) | MIT, code and weights | Beats + downbeats, SOTA; run via onnxruntime-web |
| c4dm/qm-dsp (TempoTrackV2, key mode) | GPL-2.0 (confirmed via API) | WASM via Emscripten, like Rubber Band; gives key |
| chrisguttandin/web-audio-beat-detector | MIT | Quick BPM + offset seed |
| realtime-bpm-analyzer | Apache-2.0 | Incompatible — ideas only |
| aubio, BTrack, libKeyFinder | GPL-3.0 | Incompatible |
| essentia.js | AGPL-3.0 | Incompatible |
| madmom models | CC-BY-NC-SA | Incompatible |

## Later: Spotify and Apple Music

- Both use Widevine in Chrome. Whether `createMediaElementSource` passes protected audio or silence is UNVERIFIED (sources conflict). Tab capture is reported working on Spotify by four repos (06T/Slowed-And-Reverb-Extension, RafaCMur/true-resonance-extension, lemara98/karafilt, sam-coolshrestha/TabTune).
- Spotify's media element is created with `document.createElement` and never enters the DOM; Spotify resets `playbackRate`. Apple Music's MusicKit `playbackRate` is read-only; the element is `#apple-music-player`.
- Spotify User Guidelines bar modifying the service. Jesse accepted the risk for a later build.
- First step when resumed: a 30-minute probe per service on a logged-in account.

## Feature ideas surfaced (not yet chosen)

Chop to 16 pads (click + MIDI), beat and key detection with confidence and "match my key", performance FX (filter sweep, echo-out, brake/spinback, reverse roll), grab-to-WAV, per-track crates. Stems parked: no real-time browser path.

## Second search (in progress)

SoundCloud hook build spec, MV3 build and test tooling, SoundCloud fallback routes, beat/key detection build. Results to be appended below.

### 2a. MV3 build, test and distribution tooling

- **Permissions:** `https://soundcloud.com/*` goes in `optional_host_permissions`, requested from a click. Then `chrome.scripting.registerContentScripts` (needs `"scripting"`) registers two `document_start` scripts: a MAIN-world hook and an isolated bridge. Never static `content_scripts` for SoundCloud: static matches count as required hosts and disable Kari for existing users until they accept. Optional permissions do not disable it ([permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)).
- **Registration upkeep:** re-sync on `onInstalled`, `onStartup`, `permissions.onAdded/onRemoved` with `getRegisteredContentScripts` → update/register (duplicate IDs reject the batch). Already-open SoundCloud tabs need a reload.
- **World messaging:** `window.postMessage` with a source/origin check, a namespaced type and a per-session nonce; treat everything from MAIN as hostile (SoundCloud's JS shares it). Transfer ArrayBuffers; or hand over one `MessageChannel` port.
- **Page CSP risk:** MAIN-world code runs under SoundCloud's CSP, so `audioWorklet.addModule(chrome-extension://…)` and WASM compile depend on its `script-src` / `'wasm-unsafe-eval'` — UNVERIFIED, read the live header first. Fallback: pass compiled WASM bytes through the worklet port, or process in an offscreen document (globalSpeed pattern).
- **Testing:** branded Chrome 137+ ignores `--load-extension`; use Playwright `launchPersistentContext` with `channel: 'chromium'` (headless supported), or CDP `Extensions.loadUnpacked`. Optional-permission prompts can't be clicked by automation; use a test build with SoundCloud in `host_permissions`.
- **Build:** one esbuild call per format — IIFE for the MAIN hook and bridge, ESM for the worklet, plus offscreen. Same split as igrigorik/videospeed (esbuild) and polywock/globalSpeed (Vite).
- **Distribution:** updates go to Kari's existing Chrome Web Store listing (Jesse's ruling, 10-14). Optional host permissions keep existing users enabled after the update. Self-hosted CRX is blocked on macOS outside enterprise policy; load-unpacked works but has no auto-update.

### 2b. SoundCloud backup routes (ranked)

| # | Route | Reliability / cost | Notes |
|---|---|---|---|
| 0 | Primary: patch `createMediaElementSource` + `connect`, our worklet inside SoundCloud's graph | High / low | soundcloud-track-control (MIT) |
| 1 | Element hooks: `play`, `src` setter, `window.Audio`, `createElement` at `document_start`; WeakRef the element; if no `createMediaElementSource` call within ~1.5 s of `playing`, create our own source | High / low | Pattern from lento-ext `page-hook.js:835-883`, soundcloud-looper `inject.js:23-30` (both unlicensed: ideas only) |
| 2 | Dummy element: give SoundCloud's call a throwaway `<audio>`, claim the real one ourselves | Medium / ~10 lines | globalSpeed `src/contentScript/main/index.ts:71-78` (Firefox only, no licence). Cost: SoundCloud's play/pause/seek fades land on the dummy, so those transitions may click; Kari adds its own fades. Chrome behaviour UNVERIFIED |
| 3 | `chrome.tabCapture` → offscreen document (`USER_MEDIA`) → worklet → speakers | Most robust to player rewrites / highest cost | Needs a click on the Kari icon, shows a capture indicator, adds latency (UNVERIFIED, est. 20–60 ms). Speed still via page `playbackRate`. MIT examples: Levosilimo/speed-watching, colorfulclover/tab-output-audio-selector |
| — | Widget API | Metadata only | iframe embeds only; no rate, no audio |
| — | webpack internals (`HLSMSEPlayer` etc.) | Not recommended | Minified names, no public precedent |

**Runtime switching:** hook never fired → route 1. `InvalidStateError` → element already claimed, use the patched-node path. Silence check: RMS ≈ 0 for ~1 s while `currentTime` advances → switch; also check `media.mediaKeys != null` (DRM). Route 3 only behind a prompt. Log the winning route locally (never sent anywhere: Kari makes no network requests).

**SoundCloud changes 2025–2026:** streams moved to AAC HLS (MP3/Opus removed late 2025, [SoundCloud blog](https://developers.soundcloud.com/blog/api-streaming-urls)) — no effect on element-level routes. Some tracks carry DRM transcodings (`ctr-`/`cbc-`, per yt-dlp `soundcloud.py:309-317`); on those, Web Audio routes likely go silent (UNVERIFIED), leaving speed-only. Kari must detect and say so on the dock.

### 2c. SoundCloud adapter build spec

**SoundCloud's own graph** (live bundle `a-v2.sndcdn.com/assets/55-313c5966.js`, SDK 32.0.0): `source → pausePlay → seek → glitchCoverup → destination`, all GainNodes, one lazily created `AudioContext`. It caches the source per element in its own WeakMap, then calls `source.connect(pausePlay)`.

**Hook (from soundcloud-track-control, MIT, `src/soundcloud/tempo-wasm.js`):**
- Save native `connect` / `disconnect` / `createMediaElementSource` (lines 29–31).
- Wrap `createMediaElementSource` (631–692): call native once, build `source → {dry, worklet → wet} → output`, store `routes.set(source, output)`.
- Wrap `AudioNode.prototype.connect` (693–698) to redirect through `routes`, so SoundCloud's `source.connect(pausePlay)` wires our output. SoundCloud's play/pause/seek fades stay downstream of Kari. Kari never creates a second source.
- Our own wiring uses the saved native `connect`. Rubber Band replaces STC's Signalsmith node.
- Rejected: patchrome's fake-AudioContext proxy (non-AudioNode objects, 50 ms polling).

**Loading:** SoundCloud sends **no Content-Security-Policy header** (checked live twice, 2026-10-15; only `x-frame-options: SAMEORIGIN`). Use the soundstage pattern: isolated world posts `chrome.runtime.getURL("worklet.js")` to MAIN, MAIN calls `ctx.audioWorklet.addModule(url)` (file in `web_accessible_resources`); WASM bytes go to the worklet via `processorOptions` (as Kari does today). Cache the `addModule` promise per context. Re-check the CSP in the probe; `blob:` is the fallback.

**Rate guard:** SoundCloud sets `playbackRate = 1` in `_initMediaElement`. Copy STC `media-guards.js` (8–20 native descriptors, 67–89 prototype setters re-applying our values, 90–101 `play()` discovery), forcing `preservesPitch = false`. The element is detached: its events never reach `document`; listen on the element itself.

**Track key:** `.playControls__soundBadge .playbackSoundBadge__titleLink` href, normalised to `/user/slug` (STC `parseTrackKey`, drops private `s-` tokens), watched with a MutationObserver plus `loadstart`/`emptied` on the element (SoundCloud reuses elements). Avoid STC's `soundcloud-host-clock.mjs` (pins webpack module IDs and SDK hashes).

**Edge cases:** flush Rubber Band on `seeking`, `emptied`, `loadstart`, `pause`, `ended`. SoundCloud suspends its context when idle → handle `statechange`. `SNIP` previews stream ~30 s. Go+ / encrypted streams wire Web Audio only after the key session starts, so the hook fires late; audible-vs-silent is UNVERIFIED.

**Failure table:** hook installed late → show "reload", rate-only mode · `InvalidStateError` → never call `createMediaElementSource` ourselves · worklet/WASM load fails (6 s timeout, `processorerror`) → dry path at 1 · context suspended/closed → pause/rebuild · DRM silence (RMS 0 while playing) → bypass + dock notice · route unused → log locally · CSP appears → `blob:` fallback.

**Attribution:** copied/adapted STC code keeps "Copyright (c) 2026 SoundCloud Tempo Control contributors" + the MIT text in each file header and in `THIRD-PARTY-NOTICES.txt` shipped in the zip. patchrome-ext, globalSpeed, lento-ext: no licence, copy nothing.

Local copies of the downloaded sources (scratchpad, temporary): `stc/`, `scjs/`, `other/`.

### 2d. Beat and key detection build

**Recommended stack:**
| Part | Choice | Size | Licence |
|---|---|---|---|
| Beats, downbeats, BPM | Beat This! `small0` (2M params) | 7.4 MB int8 / 10.5 MB fp32 | MIT (code and weights, per README) |
| Inference runtime | onnxruntime-web 1.30 WASM, single thread, in an offscreen document — **or** our own small engine | ORT 14.2 MB (3.65 MB gz) | ORT is MIT but bundles Apache-2.0 parts (onnx, abseil, flatbuffers): **incompatible with GPL-2.0-only** |
| Mel frontend | JS port using shiwano/beat-this-onnx `frontend.json` | ~0.3 MB | MIT |
| Key + fallback tempo | qm-dsp `GetKeyMode` + `TempoTrackV2`, Emscripten (no existing WASM build) | est. a few hundred KB | GPL-2.0-or-later |
| Override | Tap tempo snaps the grid phase to the nearest model beat | — | own |

- Accuracy (Beat This! paper, GTZAN F1): small beat 88.8 / downbeat 77.2; final 89.1 / 78.3; previous best 88.7 / 75.6.
- Input: 22.05 kHz mono, hop 441 (50 fps), 128 mel bands 30 Hz–11 kHz, `log1p(1000·mel)`; trained on 30 s chunks.
- Measured by the research agent (onnxruntime-web WASM in Node, one thread, Apple M4): small0 = 317 ms per 10 s of audio (~3.3 s per minute). Browser and low-end CPU timings UNVERIFIED.
- Live: provisional grid after ~8 s of playback; refine every 10 s (6-frame overlap); downbeat settles in 2–3 bars. Key stable after ~20–30 s (UNVERIFIED); show it as provisional until then.
- BPM/phase fit template: grmchn/kawaii-audio-visualizer (MIT; already runs small0 in onnxruntime-web, chunks at 1500 frames to avoid WASM out-of-memory).
- MV3: `'wasm-unsafe-eval'` in extension-page CSP, `ort.env.wasm.wasmPaths` set to the bundled file, `numThreads = 1`. Not in the service worker, not under the page's CSP.

**Licence way out for the ORT blocker (Jesse's call):**
1. Relicense Kari from GPL-2.0-only to GPL-3.0-or-later. GPL-3 is compatible with Apache-2.0. Rubber Band is "GPL v2 (or later, at your option)" per `THIRD-PARTY-NOTICES.txt:11`; qm-dsp is GPL-2.0-or-later; Signalsmith is MIT. The `rubberband-wasm` wrapper's package.json says "GPLv2" — whether "or later" applies is UNVERIFIED. Kari's own commits are by Jesse's accounts (amai h20, ATLAS).
2. Write our own inference engine for small0 (conv stem + 3 frontend blocks + 6 transformer blocks with rotary embeddings), weights exported as a flat binary. Keeps GPL-2.0-only; more build work.
3. tract (MIT-or-Apache, WASM target); dependency crate licences UNVERIFIED.

## Decisions after the second search (2026-10-14)

- **Licence (Jesse delegated: "determine"):** move Kari to **GPL-3.0-or-later** and compile Rubber Band from its own source (GPL-2.0-or-later) with Emscripten, next to qm-dsp. Reason: the `rubberband-wasm` wrapper declares only "GPLv2" in package.json, so the shipped `rubberband.wasm` cannot be assumed upgradable; building it ourselves removes that link. GPL-3 then accepts onnxruntime-web's Apache-2.0 parts. Pending Jesse's one-line go (legal floor).
- **Install (corrected by Jesse):** ship as an update to Kari's **existing Chrome Web Store listing** — same link, no new listing, no unlisted copy, no private Google Group.
- **Go+:** not a blocker. Free SoundCloud tracks are not encrypted. On Go+/DRM tracks Kari detects silence plus `mediaKeys` and offers speed only with a dock notice. Test key-change on DRM later if a Go+ account appears.
- **morluto/rea** (MIT, "Reverse Engineer Anything" MCP): useful for static analysis of SoundCloud's minified player bundle (map the audio graph, diff new bundles to catch breakage early). **Not** for cloning a closed engine (Serato, Transpose, élastique) into Kari: the result would be a derivative of proprietary code, and a GPL licence does not cure that. Kari's engine is already Rubber Band R3 (measured within 0.02 cents). The repo shows 250k stars and 62k forks six months after creation, and its README warns of look-alike copies: install only from the official npm package, as a staged step Jesse approves.

## REA (morluto/rea) — full read and install

**Installed** 2026-10-14 by a separate session: `rea-agents@6.5.0` (pinned), user-scope MCP entry in `~/.claude.json` plus the `reverse-engineer-anything` skill; backups `~/.claude.json.rea.backup` and `.pre-rea-20261014`. Read back independently: `claude mcp list` → `rea ... ✔ Connected`. Caveat: local Node is v25.5.0, which REA lists as unsupported (`^22.19 || ^24.11 || >=26`); smoke test passed. WABT (needed for WASM inspection) is not installed.

**Trust:** genuine project (3,246 commits, real contributors, npm tarballs carry SLSA provenance from `morluto/rea` release workflow). Star/fork counts (≈250k / 63k in six months) and the npm download spike are not evidence either way. Malware look-alike exists (`rea-githu/REA`, Windows zip). Only ever use npm `rea-agents` or `morluto/rea`, pinned.

**What it is:** one stdio MCP server + CLI, 207 tools, every result an evidence record (observed / inferred / unknown). Static JS, website (via Chrome's debugging port), WASM, .NET, Go, Rust run without extra software; native needs Hopper/Ghidra/IDA (not installed, not needed). The JS de-minifier is Linux-only.

**Where it helps Kari:**
| Task | REA tools |
|---|---|
| Map SoundCloud's player bundle and audio graph | Chrome with `--remote-debugging-port=9222 --user-data-dir=<throwaway>` → `list_browser_targets` → `inspect_web_page` (`include_script_sources`, `allowed_origins` soundcloud.com + a-v2.sndcdn.com) → `export_web_scripts` → `analyze_javascript_application` → `trace_application_feature` seeded on `createMediaElementSource` |
| Watch the page while it plays | `observe_web_session`, `observe_web_execution`, `inspect_web_event_listeners` (REA never runs JS in the page, so the live AudioContext graph still comes from our own MAIN-world probe) |
| Catch a breaking SoundCloud bundle | `compare_application_versions` on two retained captures; nightly guard = cheaper hash + grep for `createMediaElementSource` and the graph names, REA to explain what changed |
| Our WASM | `inspect_wasm_artifact`, `compare_wasm_interfaces` (needs WABT; 8 MiB cap) |

**Rules (REA's DISCLAIMER plus copyright):** keep only interface facts (node names, call order) from SoundCloud/YouTube analysis in the repo. Never copy recovered code from SoundCloud, YouTube or competitor extensions into Kari; a GPL licence cannot cover code we don't own. For competitor behaviour, write a behavioural spec and implement fresh. "Clone an engine" is out; Rubber Band R3 stays.

**Recommended re-scope (Jesse's call, not done):** move Node to 24 LTS; remove the user-scope entry and re-add REA as a local-scope MCP in the Kari folder only.
