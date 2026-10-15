# Beat loops — build note (2026-10-15)

Branch `claude/beat-loops-f975be` (kari repo), four commits on top of `1953301`. Not pushed, no PR. Every number
below came from `npm test` and `node bench/loop_stage.mjs` on this machine (MacBook Air M4, Node 25.5) on
2026-10-15. Nothing has been heard yet: everything in "UNVERIFIED by ear" needs Jesse's Chrome.

`STACK:` dock template + `dock.css.ts` tokens (Kari's shipped dock language, unchanged) → a scratch harness of the
real `Dock` class in the browser pane for layout → `taste_lint.py --brand none` on the extracted CSS and template.
`TASTE:` lint exit 1 on the whole dock, all three FAILs pre-existing (Void skin glow ×2, constellation
`transition: all`); the additions add three WARNs (two 9 px labels on the dock's existing 9 px label scale, one
infinite sweep already gated behind `prefers-reduced-motion`). `impeccable detect` is not installed here: UNVERIFIED.

## What was built

| Piece | Where | What it does |
|---|---|---|
| Loop stage | `src/worklet/loop.js` | A capture ring (2^17 frames, 2.73 s at 48 kHz) in front of the engine. A latch names a body of `lenFrames` that began `backFrames` ago; playback stays live until the body ends, wraps under a 6 ms equal-power crossfade from the body's tail into its pre-roll, and a release or re-latch jumps back to the live position under the same fade. Slip is the ring itself: the track underneath never stops, nothing is seeked. |
| Bypass delay | `src/worklet/loop.js` `DelayLine` | The bypass engine runs through a delay set to the matched dry delay, so a loop with no key change is lossless and its latch/release crossfades are time-aligned. |
| Protocol | `processor.js` | `{type:"loop", on, lenFrames, backFrames}` and `{type:"loop", on:false}`; applied in `onmessage` between render quanta, so the next `process()` already plays it. `config.bypassDelay`. Stats carry `loopOn`, `loopLen`, `captured`. |
| Beat grid | `src/content/beat/grid.ts` | `{bpm, phase, source}` in media time. Grid line at or before a time for ¼/½/1-beat cells; loop length and back-frames in real-time frames carrying `playbackRate`; slip position; bpm clamp 40–300 and nudge. |
| Tap tempo | `src/content/beat/tap.ts` | Taps are media times; median of the last 8 intervals; a bounce (< 0.2 s) is ignored; a gap over 2 s or a seek backwards starts over. Phase = the last tap. |
| Auto-detect | `src/content/beat/detect.ts` | Interface + `NullBeatDetector`. The TODO names the blocker: Beat This! needs onnxruntime-web, whose Apache-2.0 parts are incompatible with GPL-2.0-only. Jesse's call (research doc § 2d). No model, no new dependency. |
| Controller | `src/content/audio/controller.ts` | Owns the grid and the latch. A grid attaches the graph early (after any click) so the ring has history by the first latch. `latchLoop` reads the clock after attach and posts the plan. Loop + no key = wet through bypass. Key change while looping: dry during the ~60 ms engine warm-up, then back. Releases on pause, seeking, ended, emptied, an ad, a rebind, a new video. |
| Dock | `src/content/ui/dock.ts`, `dock.css.ts` | In Full control: `loop ¼ ½ 1 ×` and `Tap · − bpm + · MIDI`; the loop readout sits in the meta line. Buttons are disabled until a bpm exists. The bpm field owns keys only while focused (Enter/Escape blur it). The latched pill sweeps once per pass, `prefers-reduced-motion` gated. |
| MIDI | `src/content/midi.ts` | Note-on → action, any channel. Default pads C1–E1 (36 ¼, 37 ½, 38 1, 39 release, 40 tap). Learn mode in the settings aside; the map persists in settings. Connect only from a click (the browser prompts). No sysex. |
| Debug | `__kari.grid / tap() / setBpm() / latch(beats) / release() / midi` | For the live probe. |

Manifest, background and `src/content/sites` untouched. No code copied from Mixxx or anywhere else.

## Measured

| Figure | Value | How |
|---|---|---|
| Seam step, worst phase | **0.0266** max sample step at the wrap vs **0.0288** in the input itself; a hard cut would step **0.972** | 440 Hz sine, ¼ beat at 128 bpm (5625 frames = 51.56 periods, so the wrap lands near antiphase), 29 seams (`tests/loop.test.mjs`) |
| Repeat exactness | bit-exact: `out[o] == out[o − len]` for every frame after the first wrap | deterministic noise, 1 s+ checked |
| Slip resume | bit-exact: `out == in` from one fade (288 frames, 6 ms) after release | noise, held across several wraps |
| Engage latency | the next render quantum after the message: ≤ 128 frames = **2.67 ms** at 48 kHz (2.9 ms at 44.1) — the first wrap landed on the exact frame | `tests/loop.test.mjs` "engage takes effect on the very next block" |
| CPU, stage | idle **0.34 µs**/block, looping **0.54 µs**/block = **0.02 %** of the 2.667 ms budget | `bench/loop_stage.mjs`, 200 000 blocks |
| CPU, latch | the body copy: **6 µs** (¼ beat at 128 bpm), **51 µs** (1 beat at 60 bpm), once per latch, in `onmessage` | same |
| CPU, bypass delay | **0.22 µs**/block | same |
| Memory | ring + body + fades ≈ **2.1 MB** stereo float32 at 48 kHz; delay line 128 KB | arithmetic |
| Longest loop | `maxLen` = 130 784 frames = **2.72 s** at 48 kHz: 1 beat down to 22 bpm at 1×, 44 bpm at 0.5× (longer is clamped) | `tests/loop.test.mjs` |
| Tests | **35 pass, 0 fail** (`npm test`), `npm run build` reproducible: committed `extension/` matches a fresh build | this session |

The seam being below the input's own max step means the crossfade never adds an edge the signal did not have.

## Known behaviour (by design, worth hearing)

- **A latch inside the last 6 ms of a cell loops the next cell** (a mid-fade start would carry a step). The output stays live until that cell begins.
- **First latch within ~1 s of the first bpm** on a page: if the grid line is older than the ring's capture, the loop anchors on the oldest frame held. Never silence, slightly off-grid. The early attach on `setGrid` is what makes this rare.
- **Key change 0 ↔ non-0 while looping**: the engine switch empties Rubber Band; the controller sits on the matched dry path (the live track) for about 60 ms, then returns to the loop. Changing the key between two non-zero values has no such gap.
- **First latch on a page with no prior key change**: the crossfade goes from the 0 ms dry wire to the wet path, which carries the limiter's 6 ms look-ahead. A 6 ms time shift over a 40 ms fade, once. After any key change both sides are delay-matched.
- **Loop length is an integer frame count**: at 128 bpm ¼ beat is exactly 5625 frames at 48 kHz; in general the rounding error is < 0.5 frame per pass (about 1 ms after 100 passes).
- **Speed change while looping**: the body keeps its captured length; the track underneath runs at the new rate; release lands where that track is.

## UNVERIFIED by ear or by a live Chrome

1. **Grid alignment to the beat.** `video.currentTime` and the frame reaching the worklet are not the same clock: the media pipeline offset is unknown (tens of ms is plausible), port message latency adds ~1–3 ms, and tap reaction is late by whatever the listener's is. All three are systematic, so the loop should land consistently near the beat, but "near" is unmeasured. A phase nudge is the fix if it is audibly off.
2. The 6 ms shift at a first latch and the ~60 ms dropout on a 0 ↔ non-0 key change while looping.
3. The seam through Rubber Band at ±semitones: the engine sees a seamed signal; a phase vocoder may smear the wrap.
4. Web MIDI from a content script on youtube.com: the permission prompt, device enumeration, pad latency.
5. CPU and underruns in Chrome (Node figures only), and nothing was run under 40 tabs.
6. The bpm field's keyboard isolation on the real page, and reduced motion on the latched pill.
7. The media element's own fades on pause/seek were not exercised with a loop latched (the loop releases first).

## Live checks for Jesse

Load unpacked from `extension/` (chrome://extensions → reload Kari). Open a watch page with a steady 4/4 track
at a known bpm (a 128 bpm metronome or DJ-tool video is ideal). Switch Full control on.

1. **Tap**: click Tap on 8 beats. Readout shows `… bpm`; expect within ±1 of the known value. Type the exact bpm in the field, Enter. `−`/`+` step by 1.
2. **Latch ¼ while playing**: no click at the latch; readout `loop ¼ · 117 ms` at 128 bpm; engine `wire`; a/v unchanged (±6 ms on the very first latch). Listen for a click at the seam over ten passes.
3. **½ then 1, then ¼ again**: length changes with no click; the second ¼ re-triggers at the live position.
4. **×**: the track continues from where it would have been. Check against YouTube's progress bar: no jump.
5. **Pitch +3, latch ¼**: engine `R3`, the loop is pitched. Move pitch to +5 while looping: the loop holds, the key moves. Move pitch to 0 while looping: expect ~60 ms of the live track, then the loop again. Say whether it is audible.
6. **Pause, seek, next video** while looping: each releases (`loop —`); the next video has no bpm until tapped.
7. **Speed −12 % (vinyl) while looping**: the loop keeps its length; × lands in the right place.
8. **Alignment**: on the metronome video, latch ¼ and listen whether each pass starts on the click. If every pass is late or early by the same amount, that is the pipeline offset from UNVERIFIED 1: report it (ms by ear is enough) and the fix is a phase nudge.
9. **MIDI**: plug a pad controller, click MIDI (Chrome prompts for the site), readout `1 input`. Pads C1–E1 fire ¼ ½ 1 × Tap. Settings → MIDI → Learn, click ¼, hit any pad: it binds; Learn off.
10. **Keys**: focus the bpm field, type digits: YouTube's shortcuts stay quiet. Enter, then `k`: YouTube pauses again.
11. **Reduced motion** (System Settings → Accessibility → Display → Reduce motion): the latched pill shows no sweep.

## SoundCloud (added 2026-10-15, branch claude/infallible-tharp-1c2f4a)

On SoundCloud the controller (grid, tap tempo, latch, release) runs inside the MAIN-world hook, next to the element it
reads the clock from, while the dock and the MIDI pads live in the isolated bridge. The bridge protocol carries the gap:

| Piece | Where | What |
|---|---|---|
| Loop status | `src/soundcloud/protocol.ts` `HookStatus` | now the full `AudioStatus` (`loop`, `loopMs`, `bpm`, `gridSource`) plus route and context state; `sanitizeStatus` checks every field (loop ∈ {0, ¼, ½, 1}, bpm finite in 1–1000 or null, gridSource an enum) |
| Loop commands | `protocol.ts` `LoopCommand`, `parseLoopCommand` | bridge → hook `{type:"loop", action: latch\|release\|tap\|bpm\|nudge\|clear}`; same origin, source, namespace, direction and nonce checks as every other message; a latch carries a `seq` the hook answers with `{type:"loop-ack", seq, ok}` |
| Routing | `src/soundcloud/loops.ts` | `LoopRequests` (bridge: the dock's loop deps as messages, a latch promise that resolves on the ack or false after 2 s) and `runLoopCommand` (hook: the command onto the active unit's controller) |
| Dock | `src/soundcloud/bridge.ts` | real `loop` and `midi` deps: the loop row and the MIDI group show on SoundCloud; `Midi` is built from `settings.midiMap`, pads fire the same actions as on YouTube |
| Release | controller `INTERRUPTS` on the real element + bridge | pause, SoundCloud's own seek (`seeking`), ended and emptied release the loop exactly as on YouTube; a track change (new badge key in the bottom bar) also clears the grid (`clear`), so the next track starts without a bpm, as a new video does |

Checked headless (`node tools/probe/soundcloud.mjs <track> --loop`, table in `tools/probe/README.md`): five taps → 119
bpm, ¼ latched 126 ms and shown 8 ms after the click, non-silent output while looping, the element clock advancing
under the loop, × back to the live track. Node tests cover the protocol round trip, the guards (wrong nonce, bad
beats, no controller, hostile ack) and the status sanitizer (`tests/soundcloud.test.mjs`).

UNVERIFIED on SoundCloud, by ear or in a real Chrome: the seam and the grid alignment (the same unknowns as above,
plus SoundCloud's own pause/seek fades downstream of the loop); the 100 ms first-attach mute against a latch within
the first second; Web MIDI from the isolated world on soundcloud.com; the dock in the bottom bar with the two extra
rows on a narrow window.

## Follow-ups (not built)

- Per-video bpm memory next to pitch/speed (today the grid is cleared on every new video).
- A phase nudge (± a few ms) if check 8 shows a consistent offset; and a tap-to-downbeat if 1-beat loops want bars.
- Auto-detect once the licence decision lands (`detect.ts` is the seam; the controller already calls `start()` on attach).
- `docs/playground.html` does not carry the new rows; a LIVE-PROBE row for loops once Jesse runs the checks.
- `impeccable detect` on the dock when the tool is installed.
