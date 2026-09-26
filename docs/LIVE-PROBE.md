# Live probe — things only a real Chrome on a real machine can verify

Run on: MacBook Air M4, Chrome 153 (Jesse's Chrome, extension loaded unpacked) and Chrome for Testing 153 driven by
`tools/probe` (headless, instrumented). AudioContext 44.1 kHz, built-in output (`outputLatency` 24 ms, `baseLatency`
6 ms). Dates: 2026-09-26. Numbers marked *probe* were read by the harness's own analysers on the audio that reaches the
speakers, not from Mimi's readouts. Numbers marked *ear* are Jesse listening. UNVERIFIED means neither happened yet.

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
| 10 | YouTube speed menu 1.5× with Mimi at +4 % | readout yt 1.50×, pitch locked | **PASS** (Jesse's Chrome, DOM). Menu 1.5× → readout "yt 1.50×", video rate 1.56; back to 1× → 1.04, Mimi's +4 % survives. Key lock now also undoes the menu rate. Failed on the first build (read "yt 1.44×" and lost the +4 %); fixed 1b4485d. |
| 11 | Mid-roll ad | audio untouched during ad, resumes after | **PASS on pre-roll, mid-roll UNVERIFIED.** Pre-rolls on every probe load (14–45 s, skippable and not): `ad-showing` bypasses the engine and resets the rate to YouTube's base; after the ad the remembered params re-engage (probe, several runs, and Jesse's Chrome). Mid-roll: three attempts on the Journey concert (`lDNmyxF-TxA`, seeks to 20:00 and 40:00, 20–75 s watches in both browsers) served no mid-roll ad. The code path is the same class flag, so the pre-roll result covers the mechanism; the timing of a mid-roll cut-in is untested. |
| 12 | SPA navigation to next video | dock re-mounts, memory restores | **PASS** (probe + Jesse's Chrome). Autoplay to the next video and related-link clicks re-mount one dock inside `#movie_player`; memory saves on change and restores on return (`[mimi] mount … memory:` lines). Two bugs fixed: the engine kept the previous video's ratio on a video with no memory (c04ad31, df5b991), and the miniplayer unmounted the dock (aa33659, df5b991). |
| 13 | Miniplayer / theater / fullscreen | Mimi alone in mini; dock in fullscreen | **Mini PASS** (probe): dock stays in the minimized player, controls hidden, Mimi 65×75 px top-right, memory kept, returns to the full dock on expand. **Theater PASS** (Jesse's Chrome): dock at the player's top-right at 1048 px width. **Fullscreen UNVERIFIED**: synthetic `f` did not enter fullscreen (needs a real key press). |
| 14 | DRM (movie rental) | fault message, no silence | **UNVERIFIED.** No rental on the account. The storefront in both browsers listed only streaming-service shows (Peacock, HBO Max, amc+) with no watch links, and the one free-with-ads title the probe found (`8B1farnlE_k`) never finished loading in the automation profile. The code path (2.5 s of silence while playing → "this video's audio is protected", Mimi's failure face, dry path stays audible) is exercised in Node only. Needs one rental or free movie opened in a normal Chrome with the extension loaded. |
| 15 | CPU: 40 tabs open | underruns stay 0 | **UNVERIFIED.** With 40 headless YouTube tabs the probe session itself was killed twice before the 12 s window completed. Single-tab load is 6–10 % of the audio budget; the step-down ladder no longer counts warm-up as trouble. |
| 16 | Reduced motion | no drift/bob; usable | **PASS** (probe, `prefers-reduced-motion: reduce` emulated): body, lids, void and cloud animations all `none`; restored when the preference is cleared. |
| 17 | Keyboard: Alt+arrows | steps land; YouTube's keys don't fire while dock focused | **UNVERIFIED for the shortcuts** (synthetic Alt+Arrow does not reach Chrome's command layer; needs a real Option+↑). The second half was a FAIL and is fixed: a blanket `stopPropagation` killed every YouTube shortcut after any click in the dock and Space re-fired the last button (3a50315: keys are swallowed only when the focused control consumes them, and clicks no longer park focus). |
| 18 | Restore-from-memory before any click | video not muted; attach waits for first click | **PASS** (Jesse's Chrome, page load with a remembered +4 %): rate 1.04 applied, `muted=false`, engine "wire", a/v 0 ms before any click. Strict variant with a remembered pitch after a hard reload: UNVERIFIED. |

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
a/v readouts. Console lines start with `[mimi]`.
