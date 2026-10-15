# Live probe — things only a real Chrome on a real machine can verify

Run on: MacBook Air M4, Chrome 153 (Jesse's Chrome, extension loaded unpacked) and Chrome for Testing 153 driven by
`tools/probe` (headless, instrumented). AudioContext 44.1 kHz, built-in output (`outputLatency` 24 ms, `baseLatency`
6 ms). Dates: 2026-09-26. Numbers marked *probe* were read by the harness's own analysers on the audio that reaches the
speakers, not from Kari's readouts. Numbers marked *ear* are Jesse listening. UNVERIFIED means neither happened yet.

YouTube throttles the automation profile (`googlevideo.com` 403s after 15–45 s, long unskippable pre-rolls), so probe
measurements start from a fresh load each time. Ears and devices ran in Jesse's Chrome.

| # | Check | Pass | Result |
|---|---|---|---|
| 1 | Worklet + WASM load under YouTube's CSP | R3 within 2 s | **PASS** (probe). No CSP errors in the console. Cold start to R3 running: 26–42 ms (context, module, WASM compile, engine init). |
| 2 | First-attach click | no audible click | **PASS by instrument, ear pending.** Probe: max sample step in the output never exceeds the input's; no hole (the crossfade now waits for the engine's first block). The very first engine start crosses from the un-delayed wire to the 67 ms-late engine over 40 ms, so a brief doubling is expected once per page. Every later start and every return to 0 is delay-matched. *Ear: Jesse reported the first presses "work" on the a cappella before this build; the doubling on the current build is UNVERIFIED.* |
| 3 | Pitch accuracy on real music | in tune, no warble | **PASS.** Probe on a 440 Hz tone, output vs input: +1 st 99.98–100.02 c, ±5 st ±500.00 c, ±12 st ±1200.00 c, +50 cents 50.00 c. Ear: −7 st and +2 to +5 st on Ariana Grande a cappella "all sound good". |
| 4 | Drum-heavy track at ±5 st | transients crisp | **UNVERIFIED by ear.** Probe on Thomas Lang / Jordan Cannata drum solos: no holes, no clicks, 0 underruns/s at +5 st. Smear is a listening call. |
| 5 | Key lock tempo ±16 % | pitch unchanged, no drift | **PASS.** Probe: input resampled to 510.40 / 369.60 Hz, engine output 439.97–440.00 Hz both ways. Drift: the engine changes no duration and the video clock drives it; ring occupancy is flat (89–241 frames) with 0 underruns in steady state. Ear: 1.29× with key lock on a cappella "sounds good", lips in sync. 10-minute drift run UNVERIFIED (streams cut at 45 s in the probe). |
| 6 | Vinyl mode | pitch rides speed, zero artefacts | **PASS.** Probe: at +16 % the engine is not attached and the output equals the input at 510.40 Hz (0.00 c, 0.00 dB). Ear: 0.70× on a cappella "a lot better", the slowdown is obvious. |
| 7 | A/V offset, speakers | ≤90 ms | **FAIL by 7 ms, honest number.** Readout 97 ms = engine 61 + limiter look-ahead 6 + output 24 + base 6. Before today the readout said 33–61 ms because it omitted the output latency and used the engine's self-reported start delay (27 ms) instead of the measured stream delay (61 ms). Clap/lip test by eye: UNVERIFIED. |
| 8 | A/V offset, AirPods | note the number | **UNVERIFIED.** No AirPods were connected during the probe. The readout will show `outputLatency` live once they are. |
| 9 | Hold to compare | level- and delay-matched | **PASS** (probe). Wet path 2952 frames, compare path 2953 frames: 1 frame (0.02 ms) apart. Level: dry path is a true straight wire (0.00 dB); wet path within 0.65 dB on a click train, 0.35–0.63 dB on tones before the limiter trim, 0.00 after. Ear UNVERIFIED. |
| 10 | YouTube speed menu 1.5× with Kari at +4 % | readout yt 1.50×, pitch locked | **PASS** (Jesse's Chrome, DOM). Menu 1.5× → readout "yt 1.50×", video rate 1.56; back to 1× → 1.04, Kari's +4 % survives. Key lock now also undoes the menu rate. Failed on the first build (read "yt 1.44×" and lost the +4 %); fixed 1b4485d. |
| 11 | Mid-roll ad | audio untouched during ad, resumes after | **PASS on pre-roll, mid-roll UNVERIFIED.** Pre-rolls on every probe load (14–45 s, skippable and not): `ad-showing` bypasses the engine and resets the rate to YouTube's base; after the ad the remembered params re-engage (probe, several runs, and Jesse's Chrome). Mid-roll: three attempts on the Journey concert (`lDNmyxF-TxA`, seeks to 20:00 and 40:00, 20–75 s watches in both browsers) served no mid-roll ad. The code path is the same class flag, so the pre-roll result covers the mechanism; the timing of a mid-roll cut-in is untested. |
| 12 | SPA navigation to next video | dock re-mounts, memory restores | **PASS** (probe + Jesse's Chrome). Autoplay to the next video and related-link clicks re-mount one dock inside `#movie_player`; memory saves on change and restores on return (`[kari] mount … memory:` lines). Two bugs fixed: the engine kept the previous video's ratio on a video with no memory (c04ad31, df5b991), and the miniplayer unmounted the dock (aa33659, df5b991). |
| 13 | Miniplayer / theater / fullscreen | Kari alone in mini; dock in fullscreen | **Mini PASS** (probe): dock stays in the minimized player, controls hidden, Kari 65×75 px top-right, memory kept, returns to the full dock on expand. **Theater PASS** (Jesse's Chrome): dock at the player's top-right at 1048 px width. **Fullscreen UNVERIFIED**: synthetic `f` did not enter fullscreen (needs a real key press). |
| 14 | DRM (movie rental) | fault message, no silence | **UNVERIFIED.** No rental on the account. The storefront in both browsers listed only streaming-service shows (Peacock, HBO Max, amc+) with no watch links, and the one free-with-ads title the probe found (`8B1farnlE_k`) never finished loading in the automation profile. The code path (2.5 s of silence while playing → "this video's audio is protected", Kari's failure face, dry path stays audible) is exercised in Node only. Needs one rental or free movie opened in a normal Chrome with the extension loaded. |
| 15 | CPU: 40 tabs open | underruns stay 0 | **UNVERIFIED.** With 40 headless YouTube tabs the probe session itself was killed twice before the 12 s window completed. Single-tab load is 6–10 % of the audio budget; the step-down ladder no longer counts warm-up as trouble. |
| 16 | Reduced motion | no drift/bob; usable | **PASS** (probe, `prefers-reduced-motion: reduce` emulated): body, lids, void and cloud animations all `none`; restored when the preference is cleared. |
| 17 | Keyboard: Alt+arrows | steps land; YouTube's keys don't fire while dock focused | **UNVERIFIED for the shortcuts** (synthetic Alt+Arrow does not reach Chrome's command layer; needs a real Option+↑). The second half was a FAIL and is fixed: a blanket `stopPropagation` killed every YouTube shortcut after any click in the dock and Space re-fired the last button (3a50315: keys are swallowed only when the focused control consumes them, and clicks no longer park focus). |
| 18 | Restore-from-memory before any click | video not muted; attach waits for first click (loops v2, 2026-10-15: the chain now attaches on `playing` once the page has had a click, as a straight wire, so the tempo detector hears the track; the no-gesture guard is unchanged) | **PASS** (Jesse's Chrome, page load with a remembered +4 %): rate 1.04 applied, `muted=false`, engine "wire", a/v 0 ms before any click. Strict variant with a remembered pitch after a hard reload: UNVERIFIED. |
| 19 | Loops v2 dock: Kari visible with controls hidden, loop row with Full control off, reduced motion | blob `visible`/clickable under `ytp-autohide` on every skin, panel and gear gone; row under the steppers; no sweep/breath under reduced motion | **PASS headless** (`node tools/probe/dock.mjs`, 19/19 rows, 2026-10-15: computed styles on the real Dock class; rows 13 and 16 re-read the same way: miniplayer Kari alone 64×74, reduced motion no bob). **Fullscreen in Jesse's Chrome UNVERIFIED** (same rule as the fade, no new CSS path). **Live on YouTube (probe server, headless, 60 bpm metronome `ymJIXzvDvj4`, 2026-10-15)**: `ytp-autohide` set → blob `visible`/opacity 1/pointer-events auto, panel and gear `hidden`/0; loop row shown with Full control off; the in-house detector read `60.1 bpm` 6 s after play (confidence 0.93). |

## SoundCloud harness rows (probe-readable; H-numbers, the hook's own rows are S1–S17 below)

Harness: `node tools/probe/soundcloud.mjs <track> --kari` on the test build (`KARI_TEST_HOSTS=soundcloud npm run build`),
see `tools/probe/README.md`. Baseline with today's Kari, 2026-10-15 00:08 PT: "SoundCloud graph present, Kari not
attached" (one AudioContext, one MediaElementAudioSourceNode, MediaElementSource → Gain → Gain → Gain → destination,
`crossorigin="anonymous"`, `playbackRate` set to 1 twice before play, no mediaKeys, −23.2 dBFS at the destination).
Use free Creative Commons tracks; the baseline used "Cave" by LOFI LION (CC BY).

| # | Check | Pass | Result |
|---|---|---|---|
| H1 | Hook fires | `hook order` shows the hook wrapped `createMediaElementSource` and `connect`; one source node per element; verdict "Kari attached"; a `[kari]` line names the route | **UNVERIFIED.** |
| H2 | Worklet + WASM load under SoundCloud (no CSP sent) | `AudioWorkletNode` in the page graph, dock engine `R3` within 2 s of the first change, no worklet or chrome-extension errors | **UNVERIFIED.** |
| H3 | Pitch accuracy on SoundCloud | same bar as row 3: ±0.05 c on a tone, in tune by ear | **UNVERIFIED.** Needs the iso-probe taps on SoundCloud's context (harness RMS only today) or a CC tone track. |
| H4 | Rate guard survives SoundCloud's `playbackRate = 1` reset | after a seek, a track change and a pause/play, the element's rate returns to Kari's value (`rateSets` in `--json` shows SoundCloud's 1 followed by Kari's) and the dock speed holds | **UNVERIFIED.** |
| H5 | Seek and pause fades, no click | SoundCloud's pausePlay/seek fades still act on Kari's output (they are downstream); max sample step at the destination no larger than the input's across pause, play and seek | **UNVERIFIED.** |
| H6 | SPA navigation between tracks | clicking to the next track keeps one dock, the bottom bar (`.playControls`) keeps playing, no second source node per element, params follow the track | **UNVERIFIED.** |
| H7 | Go+ track (Widevine) | speed only: the rate change works, Kari does not route the audio through the engine, no silence; `mediaKeys` present in the table | **UNVERIFIED.** Whether a Widevine track is audible through the source node at all is open (`docs/SOUNDCLOUD-GRAPH-2026-10-14.md`). Needs a Go+ account in a normal Chrome; headless Chromium has no Widevine. |

## Defects found and fixed today (all reproduced in Chrome, all committed on `main`)

1. Build script broke on a folder name containing `~` (`%7E`) — `cb4b04d`.
2. Crossfade read a mid-ramp gain value and routed back to dry; the engine ran inaudibly — `92ddb5a`.
3. Faded dock still took clicks meant for the player — `92ddb5a` (visibility).
4. Every dock button was dead: `stopPropagation` ran inside the shadow tree before the click handler — `92ddb5a`.
5. Chrome's compressor added +0.57 dB even on the dry path — dry path bypasses it, wet trimmed — `92ddb5a`.
6. Controls column 146 px: Pitch + sat under Speed −, labels clipped — dock widened to 330 px — `ebd8503`.
7. YouTube's speed menu was read as a multiplier, not an absolute rate — `1b4485d`.
8. Previous video's pitch/tempo leaked into the next video (two variants) — `c04ad31`, `df5b991`.
9. Miniplayer removed the dock — `aa33659`, `df5b991`.
10. Engine start left a ~70 ms hole (crossfade before the first block) — `1d8307d` (warm-gated crossfade).
11. Ring starved in steady state: one 3 ms gap every few hundred ms and 128 frames of delay creep each time; reported delay was 27–49 ms while the true delay was 65 ms — `2875983` (ring cushion; reported delay = measured deficit, exact within 25 frames at 44.1 k and 48 k).
12. Dry delay was automated while audible (60 ms pitch sweep on every return to 0) — `2875983` (direct + matched dry branches).
13. Compare path missed the limiter's 6 ms look-ahead — `278ff24`.
14. Manifest description 171 chars (limit 132); `author` string form; no licence texts in the package — `3a50315`.
15. Keyboard leak / focus parking (row 17) — `3a50315`.

## Numbers to carry forward

- Engine stream delay: 2688 frames = 61 ms at 44.1 kHz, 56 ms at 48 kHz. Plus 6 ms limiter look-ahead on the wet path.
- Sound behind picture on this Mac, built-in output: 97 ms. Target was 90.
- Underruns in steady state: 0 (probe, 8 s windows at +1 and +5 st; Node bench 7 s at ratios 0.5–2.0).
- Load: 6–10 % of the audio-thread budget, single tab.

## How to re-run

`tools/probe/README.md`. Ears: load `extension/` unpacked in Chrome, open a watch page, use Full control's engine and
a/v readouts. Console lines start with `[kari]`.

---

# SoundCloud — live probe (build 2026-10-15, route 0)

Everything below is **UNVERIFIED** until it runs in Jesse's Chrome. The adapter was built on the static read of
SoundCloud's bundle (`docs/SOUNDCLOUD-GRAPH-2026-10-14.md`) and passes `npm run build`, `npm test` (11 SoundCloud
tests under fake Web Audio classes: route 0 wrap and redirect, route 1 fallback, late-install fault, rate guard,
flush events, track key, world-message guard) and `npm run check:soundcloud` (exit 0, bundle `55-313c5966.js`
unchanged). None of that is a browser. No store update before every row below has a result.

## Method

1. `npm run build`, then load `extension/` unpacked in Chrome (chrome://extensions → Developer mode → Load unpacked).
   Already loaded: click Reload on the card. Note the extension id.
2. Open Kari's settings (click the toolbar icon) → **Sites → SoundCloud** → switch on → accept Chrome's prompt.
   Expected: the switch stays on. Service-worker console (chrome://extensions → the card → "service worker"):
   `[kari] soundcloud scripts registered (permission added)`.
3. Open `https://soundcloud.com/discover` in a **new tab** (a tab opened before step 2 has no scripts: row S2).
   Open DevTools. Console lines from Kari start with `[kari]`; the bridge's debug surface is `__kari` in the
   content-script context (DevTools console → context dropdown → "Kari"). `__kari.log` holds the last 60 events,
   `__kari.status` the hook's last status (`route`, `engine`, `fault`, `ctxState`), `__kari.key` the track key.
4. Play any free track from the Discover page. The dock should appear above the bottom player bar, right side,
   Kari's blob at the bottom-right of it.
5. Numbers marked *probe* can be read by the harness in `tools/probe` once it has a SoundCloud mode (separate
   session, `sc-probe`); until then rows are *ear* and *DOM* (DevTools).

Read-back for any row: `__kari.status` plus the console, never the dock alone (the dock renders what it is told).

## Rows

| # | Check | Pass | Result |
|---|---|---|---|
| S1 | Hook installs at document_start, before SoundCloud's graph | `__kari.hookReady === true` within 1 s of load; `__kari.log` has `hook ready` before any `event {"type":"source"…}` | UNVERIFIED |
| S2 | Tab opened before the permission → honest notice | on that older tab the dock (if the bar is up) shows "reload this page so Kari can reach the player"; after reload it works | UNVERIFIED |
| S3 | Route 0 wins | after the first play: `__kari.status.route === 0`; `__kari.log` has exactly one `{"type":"source","route":0}` per element; **no** `route:1` | UNVERIFIED |
| S4 | Untouched audio before any change | play 20 s with Kari at neutral: sound identical to Kari switched off; since loops v2 (2026-10-15) the chain attaches on `playing` (the 0 ms dry wire, engine "wire"), so expect `__kari.status.attached === true` with the readout `learning…` → a bpm | UNVERIFIED (ear) (ear) |
| S5 | First pitch change | press Pitch + once: engine R3 within 2 s (`__kari.status.engine === "r3"`, `attached === true`), audible +1 st, no hole longer than the 40 ms crossfade; console has no CSP error on `addModule` of `chrome-extension://<id>/worklet.js`; no "worklet via blob" note in `__kari.log` | UNVERIFIED |
| S6 | SoundCloud's rate reset is caught | at Speed +4 %, skip to another track from the Discover page: speed stays 1.04 (`__kari.status.baseRate === 1`), no 1.00 blip audible at the track start; DevTools: `document.querySelector` finds no `<audio>` (element is detached), so read the rate from `__kari.log` events instead | UNVERIFIED |
| S7 | Pause / seek / play fades are SoundCloud's, downstream of Kari | with R3 active, pause, play, scrub: SoundCloud's own short fades are heard, no click, no doubled audio; `__kari.log` shows `media pause` / `seeking` → engine flushes (ring re-primes, one short `warm` per flush) | UNVERIFIED (ear) |
| S8 | Track change keeps or restores memory | set −3 st on track A, skip to B (neutral), back to A: A reopens at −3 (`[kari] track /user/slug … memory: {…}`), B at 0; keys look like `/user/slug` in `__kari.key` | UNVERIFIED |
| S9 | Idle suspend | pause for 60 s: `__kari.status.ctxState` turns "suspended" (SoundCloud's own Suspender), then "running" on play; audio resumes at the set pitch with no silence longer than SoundCloud's own fade | UNVERIFIED |
| S10 | Key lock at ±16 % | Key lock on, slider to +16: pitch unchanged by ear, speed clearly faster; vinyl (default): pitch rides speed | UNVERIFIED (ear) |
| S11 | Hold to compare | level- and delay-matched by ear, as on YouTube | UNVERIFIED (ear) |
| S12 | Go+ / protected track (needs a Go+ account) | the dock shows "this track's audio is protected — speed only"; speed still works; `__kari.status.fault === "drm-silent"`; whether the node is audible at all is the open question from the graph doc | UNVERIFIED — no Go+ account on hand |
| S13 | Dock placement | dock above `.playControls` at the right, not clipped by the bar (if clipped: `.playControls` has overflow hidden → mount at body level, fixed above the bar); gear and settings at the left; SoundCloud's own buttons in the bar still clickable; Kari's blob toggles the panel | UNVERIFIED |
| S14 | Keyboard | Alt+↑/↓ and Alt+→/← step pitch/speed on a SoundCloud tab; SoundCloud's own shortcuts (Space, Shift+→) untouched when the dock is not focused | UNVERIFIED |
| S15 | Permission off | settings → SoundCloud off: SW console `unregistered`; a new SoundCloud tab shows no dock; YouTube unaffected | UNVERIFIED |
| S16 | YouTube still works on this build | one watch page: Pitch +1 → R3, memory, miniplayer — same as rows 1–18 above (controller gained an external-graph mode; the YouTube branch is unchanged by construction) | UNVERIFIED |
| S17 | Guard before shipping | `npm run check:soundcloud` exit 0 on the day of the store update | PASS 2026-10-15 00:09 PT (bundle unchanged) |

## If a row fails

- S3 shows `route: 1`: SoundCloud's `fadeSupportEnabled` is off for this account/build → Kari's own context carries
  the audio; everything else should still pass. Note it; route 0 is not required for sound, only preferred.
- S3 shows `fault: "capture-failed"` with `route: "late"`: the hook ran after SoundCloud claimed the element →
  check S1 (registration order) before anything else.
- S5 has a CSP error: SoundCloud started sending a Content-Security-Policy. The hook falls back to a `blob:` URL
  (`__kari.log`: "worklet via blob"); if that fails too, the engine stays off and the dock says "couldn't reach".
- S6 blips to 1.00: the prototype setter guard missed — read `__kari.log` for a `media loadstart` without a
  preceding rate write; the fix is in `src/soundcloud/hook-core.ts` (rate guard).
- Silence with R3 active on a free track: run `npm run check:soundcloud` first, then read
  `docs/SOUNDCLOUD-GRAPH-2026-10-14.md` § "What would break route 0".
