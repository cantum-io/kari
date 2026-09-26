# Live probe — things only a real Chrome on a real machine can verify

Run on: MacBook Air M4 (built-in speakers, then AirPods). Load unpacked `extension/`. Open DevTools console on youtube.com; the dock's "Full control" shows engine + a/v readouts.

| # | Check | How | Pass | Result |
|---|---|---|---|---|
| 1 | Worklet + WASM load on youtube.com under its CSP | change pitch; console shows no CSP error; engine readout says R3 | R3 within 2 s | |
| 2 | First-attach click | headphones, silence between tracks, first change | no audible click | |
| 3 | Pitch accuracy on real music | +2, +5, −5 st on a vocal track vs original played in a DAW/pitch-shifted reference | in tune, no warble | |
| 4 | Drum-heavy track at ±5 st | listen for smear/flam | transients crisp | |
| 5 | Key lock tempo ±16% | pitch unchanged, no drift vs picture after 10 min | lips in sync | |
| 6 | Vinyl mode | pitch rides speed, zero artifacts | | |
| 7 | A/V offset, speakers | a/v readout + a clap/lip test | ≤90 ms | |
| 8 | A/V offset, AirPods | a/v readout (outputLatency) | note the number | |
| 9 | Hold to compare | level- and delay-matched | no jump, no delay hop | |
| 10 | YouTube speed menu 1.5× while Mimi at +4% | readout shows yt 1.50×, pitch still locked | | |
| 11 | Mid-roll ad | audio untouched during ad, resumes after | | |
| 12 | SPA navigation to next video | dock re-mounts, per-video memory restores | | |
| 13 | Miniplayer / theater / fullscreen | Mimi alone in mini; dock visible in fullscreen | | |
| 14 | DRM (movie rental) | fault message, no silence | | |
| 15 | CPU: 40 tabs open | underruns stay 0; step-down only when hot | | |
| 16 | Reduced motion (macOS setting) | no drift/bob; still usable | | |
| 17 | Keyboard: Alt+arrows | steps land; YouTube shortcuts don't fire while dock focused | | |
| 18 | Restore-from-memory before any click | video is NOT muted; attach waits for first click | | |
