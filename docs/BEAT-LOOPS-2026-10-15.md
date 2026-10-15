# Beat loops — build note (2026-10-15)

> **v2 (same day, below) supersedes the lengths, the × button, the dock layout, the MIDI pads, the ring size and the
> auto-detect seam described in the v1 sections.** The v1 numbers for the seam, slip and engage still hold.

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

## v2 (2026-10-15, branch claude/loops-v2-a3a0ea)

Jesse's rulings after an evening with v1 in his Chrome, built on top of the SoundCloud bridge commit (`d0e4d1b`).
Every number here came from `npm test`, `node bench/tempo.mjs`, `node bench/loop_stage.mjs`, `node tools/probe/dock.mjs`
and `node tools/probe/soundcloud.mjs … --loop` on this machine (MacBook Air M4, Node 25.5, Chromium 153 headless) on
2026-10-15. Still nothing heard by a person: the ear list at the end stands.

`STACK:` dock template + `dock.css.ts` tokens (unchanged language) → `tools/probe/dock.mjs` (the real `Dock` class
headless, computed styles, screenshots) → `taste_lint.py --brand none` on the rendered dock → `impeccable detect` on the
rendered dock and on `src/content/ui`.
`TASTE:` taste lint exit 1, 3 FAIL, all pre-existing and all in skins v2 did not touch (Void glow ×2, constellation
`transition: all`); v2 adds two WARNs (the 9 px tempo readout on the dock's existing 9 px label scale; the readout's
"learning…" breath, gated behind `prefers-reduced-motion` like the sweep). `impeccable detect`: 14 findings on the rendered
dock and 3 on the source, every one a category v1 already shipped (Instrument Sans, the cyan glow, the step blocks' flush
padding, the lit pill's sweep read as a marquee, a contrast false positive from the scratch page's white body); none on
the new row itself.

### What changed

| Piece | Where | What |
|---|---|---|
| Lengths | `grid.ts` `LoopBeats = 0.5 \| 1 \| 4 \| 8`, `LOOP_BEATS`, `isLoopBeats`, `loopLabel`, `loopAria` | ½ beat, 1 beat, 1 bar (4 beats), 2 bars (8 beats). ¼ is gone from the type, the grid math, the dock, the MIDI map, the protocol sanitizer and the tests. Bars count from the grid's phase, which is the "1". |
| Ring | `loop.js` `DEFAULT_SECONDS = 7` → N = 2^19 | **maxLen = 524 000 frames = 10.92 s at 48 kHz (11.88 s at 44.1)**: 2 bars down to **44 bpm** at 1× (88 bpm at half speed), 1 bar down to 22 bpm. Asked for 70 bpm: 2 bars there is 6.86 s, inside with 4 s to spare. Memory **8 MB** stereo float32 for ring + body (was 2.1 MB). A longer loop is clamped to maxLen by `engage()` and the controller flags it (`loopClamped`); the readout says `2 bars · 10917 ms · at the ring's ceiling`. The worklet reports `loopMax` on `ready`. |
| Toggle | `controller.toggleLoop`, dock click handler, `index.ts` / `bridge.ts` pad handlers | A click on an unlit length latches; a click on the lit length releases; a click on another length re-latches at that length from the live position in one `engage()` (the stage fades the old body out and starts the new body at the live frame, the same 6 ms equal-power fade as before). The × button is gone. A MIDI pad does exactly what the button does. |
| Layout | dock template: `.loops` row moved out of `.full` to sit under `.btns`; `.tro` readout | With Full control OFF: Pitch / Speed steppers, then `½ · 1 · 1 bar · 2 bars` plus a mono tempo readout right-aligned (`learning…` while the detector listens, `128 bpm` once a tempo exists, `tap` when nothing came). Full control ON: the same row, and Tap · − bpm + · MIDI where they were. Pills are disabled until a tempo exists. The read line lost its bpm (the row carries it) and keeps `yt 1.50×`. |
| Auto tempo | `src/content/beat/detect.ts` (`OnsetFeature`, `TempoTracker`, `AutoBeatDetector`), `processor.js` (`config.onset`, `onset` batches) | In-house, no dependency, GPL-2.0-only. Front end on the audio thread: mono mix → four first-order bands (<150 Hz, 150–1000, 1–4 kHz, >4 kHz) → per-hop log energies at 100 frames/s → half-wave-rectified difference summed over bands (the low band kept apart for the "1"); ten frames per batch posted with the context time of the first frame. Tracker on the controller's thread: 6 s window in media time, novelty = strength minus its 0.5 s moving mean, rectified, scaled to its 95th percentile; autocorrelation over 60–200 bpm (prior flat on 80–160, down to 0.4 outside) for candidates and their octaves; each refined by a comb anchored on the newest frame, scored P · E · prior (P = mean novelty under the teeth, E = the share of all novelty the teeth explain: the fastest period that explains every onset beats its double, and the slower period wins when the half-beats are empty); sub-frame period and phase by weighted least squares through the novelty centroids at the teeth; the "1" = the beat class (mod 4) with the most low-band novelty, taken as the newest beat of that class; confidence = √(P·E) scaled by the autocorrelation peak, bar 0.35. |
| Clock | `AutoBeatDetector.feed` | Each batch is mapped from context time to media time with one synchronous read of `ctx.currentTime` and `video.currentTime` at receipt, so main-thread lag cancels (both clocks moved on); frames count only while the element plays (`!paused && !ended && readyState ≥ 3`, no ad) and the batch is above −60 dBFS. Publishes after 6 s of such frames, re-runs every 2 s and re-publishes while confidence holds (≥ 85 % of the last), never under a latched loop (held, lands on release), never once a tap or a typed bpm owns the grid (worklet posting stops), starts over on a seek, a rate change or a new track (the published grid stays). The systematic media→worklet pipeline offset is the same one the tap path carries (v1 UNVERIFIED 1), nothing new. |
| Attach | `controller.onPlaying` | The chain attaches on `playing` (a straight 0 ms wire, as before any change) so the detector hears the track from its first beat. Not when the element carries `mediaKeys`, not under an ad; on YouTube still after the page's first click. This is a behaviour change: Kari is in the chain from play, not from the first change (LIVE-PROBE rows 18 and S4 note it). |
| Tap on auto | `controller.tap` | One tap on an auto grid keeps the detected bpm and moves the "1" to the tap; more taps override the bpm too. A typed bpm overrides. |
| Kari always visible | `dock.css.ts` controls-hidden rules | v1 faded the whole `.root` to opacity 0 and visibility hidden, and `.anchor{opacity:1}` under it could not undo a parent's opacity, so the blob vanished when YouTube's controls auto-hid. v2 fades the parts instead (`.absorb` panels, gear, settings, intro, fault, plush, suncap, the constellation's figures) and pins every skin's anchor (`.body`, `.void-orb`, `.cloudlet`, `.moon`) to `visibility:visible; opacity:1; pointer-events:auto`. Miniplayer (`data-small`) and collapsed states unchanged. |
| MIDI | `midi.ts` `validMidiMap` | Actions `loop-h` `loop-1` `loop-bar` `loop-2bar` `tap`, default pads C1 ½ · C#1 1 · D1 1 bar · D#1 2 bars · E1 tap. A saved map keeps the actions it still knows, drops `loop-q` / `release` and bad notes, fills the rest from the defaults. |
| SoundCloud | `protocol.ts` (`loopClamped`, `learning`, beats {½,1,4,8}), `bridge.ts`, `tools/probe/soundcloud.mjs` | Status carries the two new fields through `sanitizeStatus`; the detector runs inside the hook with the controller, so the readout learns on SoundCloud with no bridge change; a pad toggles against the sanitized status. |

### Measured

| Figure | Value | How |
|---|---|---|
| Detector, click tracks (kick on the 1, clicks on 2–4, over a quiet pink bed, 8 s, three seeds each) | **90 → 90.03–90.05 · 128 → 127.97–127.99 · 174 → 173.95–173.99 bpm**; beat phase **0.2–2.6 ms** off; the "1" **1.3–2.6 ms** off a true downbeat; confidence 0.67–0.81. Below the preferred band: 60 → 60.00–60.03, 70 → 70.05 (beat within 5 ms, confidence 0.60) | `tests/detect.test.mjs` (asserts ±1 bpm, 20 ms); the 60/70 rows from the same generator, not asserted |
| Detector, swung pattern (kick on the beat, hat at 2/3) at 100 bpm | **100.00 bpm**, beat 5.0 ms off, confidence 0.74 | same |
| Detector, pink noise (10 seeds) | confidence **0.16–0.25**, bar 0.35: silent; digital silence: no estimate | same |
| Detector, gates | nothing before 6 s of playing frames; a 3 s pause skipped; silent batches skipped; frozen under a loop and landing on release; muted by a tap; a seek starts over; noise settles on "none" after 12 s | same |
| Detector, live | SoundCloud "Cave" (LOFI LION, CC BY): readout `learning…` → **`70 bpm`** on its own, `__kari.status.bpm 69.95`, grid `auto`, `learning false`, within 1.8 s of the probe starting to watch (≈ 8 s after play) | `tools/probe/soundcloud.mjs --loop`, twice |
| Detector, cost | front end **0.86 µs** per 128-frame block = **0.03 %** of the 2.667 ms budget (audio thread); `analyze()` on a full 6 s window **0.83 ms** on the controller's thread, once per 2 s; `feed()` **0.40 µs** per 100 ms batch | `bench/tempo.mjs` |
| Ring | idle 0.31 µs/block, looping 0.51 µs/block (½ beat or 2 bars alike, 0.02 %); `engage()` body copy **10.6 µs** (½ beat at 128), **310 µs** (2 bars at 70 bpm), **611 µs** at the ceiling, once per latch in `onmessage` between quanta | `bench/loop_stage.mjs` |
| 2-bar repeat | a 329 143-frame loop (2 bars at 70 bpm) repeats bit-exact through two full passes | `tests/loop.test.mjs` |
| Dock | 19/19 rows: row under the steppers (8 px below `.btns`) with Full control off and on; the four pills on one line inside the panel; disabled until a tempo; readout `learning…` → `128 bpm` → `tap`; latch / lit-release / switch calls; clamp text; controls hidden on all four skins: anchor `visible`, opacity 1, pointer-events auto, panel and gear `hidden`; miniplayer 64×74 with Kari alone; collapsed; reduced motion kills the sweep, the breath and the bob | `node tools/probe/dock.mjs --shots test-build/dock-shots` |
| SoundCloud loop | Full control off, loop row shown, pills disabled before a tempo; auto 70 bpm; 5 taps → 118.8 bpm (tap overrides); **1 bar · 2019 ms** shown **4 ms** after the click; `__kari.status` loop 4 / loopMs 2019 / grid tap / attached / route 0; RMS −22.9 dBFS, 0 silent windows; element clock 9.28 → 11.34 s under the loop (slip); second click on the lit pill → `—`, loop 0, pill unlit; RMS −20.9 dBFS after | `tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --loop`, exit 0, twice |
| Tests | **65 pass, 0 fail** (was 50; +10 detector, +3 MIDI, +2 grid/ring); `tsc --noEmit` 0; `npm run build` reproducible; `npm run check:soundcloud` PASS bundle unchanged | this session |

On the fold toward 80–160: the prior is soft and the autocorrelation at a candidate's period enters the search score
(not only the confidence), so a candidate needs onsets at its period to win. A bare 60 bpm click train has nothing at
the half period (r ≈ 0 there) and reads **60**, a 70 bpm one **70**; a 174 bpm click stays **174** because its period
explains every onset (E = 1) while 87 leaves half of them out. Real music at 60–70 with half-beat hats has support at
the half period and can fold to 120–140 there, which is the prior doing its job. The old rule-of-thumb "double anything
under 80" would have broken the 60 and 70 cases; it is not what ships.

YouTube, live (`tools/probe/server.mjs`, headless Chromium, the 60 bpm metronome `ymJIXzvDvj4`, no ad, fresh profile):
the chain attached on play (engine `bypass`, a/v 30 ms, load 0.2 %), the row read `learning…` with Full control off and
flipped to **`60.1 bpm`** 6 s after play (`__kari.estimate`: 60.07 bpm, period 99.88 frames, confidence 0.93, P 1.03,
E 0.87, r 0.71; 600 frames counted, 0 skipped). Then, with the mouse resting on the player, YouTube added
`ytp-autohide`: the blob stayed `visible` / opacity 1 / pointer-events auto at 98×111 px while the panel and the gear
went `hidden` / opacity 0. Two defects found and fixed on the way: the attach-on-play skipped `apply()`, so the engine
sat on R3 for a neutral video (now attach → apply → bypass); and the silence gate dropped every batch between the
metronome's clicks (now silence counts for 2 s after the last sound, a rest, before it stops counting).

### Known behaviour (new in v2)

- **Switching length while looping** is one `engage()`: the running body fades out over 6 ms into the live track and the
  new body starts at the live frame on its grid line; what you hear is live until that body's first wrap. No gap.
- **The first auto grid lands ~6 s into play**, then refines every 2 s while a loop is not latched. The grid never
  moves under a loop; the refinement lands at release (the phase is in media time, so it is still right then).
- **A quiet intro** delays the verdict: silent batches do not count toward the 6 s, and a track with no steady beat
  reads `tap` after 12 s of playing audio, then keeps trying every 2 s (the readout flips to a bpm if the beat arrives).
- **Speed change** resets the learning window (the frame spacing in media time changed) but keeps the published grid.
- **DRM**: a protected element is never auto-attached, so the readout stays `tap` and nothing goes silent at play.
- **The ring's ceiling**: 2 bars below 44 bpm at 1× (or below 88 bpm at half speed) runs at 10.92 s and says so.

### UNVERIFIED by ear or in a real Chrome (v2 additions)

1. The auto grid's alignment to the beat on real music (the pipeline offset from v1's UNVERIFIED 1, now also under the
   detected phase). On the synthetic path the beat is within 3 ms; the live path adds the media→worklet offset.
2. Whether 70 bpm is the right call on "Cave" (it may be felt at 140). The fold rule and the empty half-beats say 70.
3. The 2-bar body copy (0.3–0.6 ms in `onmessage` on the audio thread) against Rubber Band at ±semitones: no underrun in
   Node; Chrome is the test.
4. Kari staying visible through a real `ytp-autohide` in fullscreen (holds headless in the normal player; fullscreen needs a real key press, as row 13 says).
5. Everything in v1's list that needed ears still does.

### Live checks for Jesse (v2)

Load unpacked from `extension/` (chrome://extensions → reload Kari). Open a watch page with a steady 4/4 track at a
known bpm. Full control OFF.

1. **Play, wait**: the row under Pitch / Speed reads `learning…`, then within ~8 s `… bpm` (±1 of the known value) and
   the four pills light up. On a track with no beat it reads `tap` after ~12 s.
2. **Latch 1 bar**: click `1 bar`; it lights, the meta line (Full control on) says `1 bar · … ms`; no click at the latch;
   each pass starts on the 1. Click `2 bars`: it switches in one step; click the lit `2 bars`: back to the live track
   where it would have been (YouTube's progress bar does not jump). Click `½`, then `½` again: on, off.
3. **Kari**: let the mouse rest; when YouTube's controls fade, the panel fades with them and the blob stays and is
   clickable; click it to fold and unfold. Same in theater and fullscreen. Miniplayer: Kari alone, as before.
4. **Tap on an auto grid**: one Tap moves the "1" to your tap (bars re-anchor), the bpm stays; four more taps override
   the bpm. Type a bpm: it overrides; the readout stops learning for this video.
5. **Seek / pause / next video**: a seek releases the loop and restarts learning (`learning…` again, the bpm stays);
   a pause does not count toward the 6 s; the next video starts without a bpm and learns again.
6. **Speed −12 % while looping**: the loop keeps its length; releasing lands in the right place; the readout relearns
   (bpm shown is the song's, not the played rate).
7. **Slow track**: on a track under 44 bpm (or at half speed under 88), latch 2 bars: the meta line says
   `… · at the ring's ceiling` and the loop runs 10.9 s.
8. **MIDI**: pads C1–E1 are ½ · 1 · 1 bar · 2 bars · Tap; a pad on the lit length releases. A map learned on v1 keeps
   its ½ / 1 / Tap notes and gets the default pads for the bars.
9. **Alignment**: on a metronome video, latch 1 bar on the auto grid and listen whether every pass starts on the click
   (as v1 check 8, now without tapping). A consistent offset is the pipeline offset: report it in ms by ear.
10. **Reduced motion**: no sweep on the lit pill, no breath on `learning…`.
11. **SoundCloud**: the same row above the bottom bar; play any free track: `learning…` → a bpm; 1 bar on, 2 bars, off.

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

## Tempo readout and attach (2026-10-15, branch claude/tempo-fix)

Jesse, with 0.3.0 live in his Chrome: "tempo autodetect still not working." What the readout had been saying, read live.

### What was measured

| Where | Reading | Meaning |
|---|---|---|
| Jesse's Chrome (Profile 16), the open `soundcloud.com/lofilion/cave` tab, 0.3.0+ed68a837, read through the dock's open shadow root | readout **`tap`** (state `none`), engine `wire`, a/v `0 ms`, fault none, bar at **0:00**, nothing had played | "tap" shown before the detector ever listened: the dock drew `tap` whenever `learning` was false and no bpm existed, which is also the state before any playback |
| same tab, the bar's play (the queued mix; his layout has no hero play button on the track page) | the element called `play()`, then `waiting` at t = 0; after 40 s still `readyState 0`, `currentTime 0` (no media data arrived in the background tab); readout `tap` throughout | no audio ever reached Kari, and the readout still claimed a verdict. The hook had patched the page (createMediaElementSource / connect / createElement all wrapped), so Kari was in place |
| headless, production build, YouTube `ymJIXzvDvj4`, no click (`tools/probe/tempo.mjs`, before the fix) | video paused at 0 s for 20 s, detector `idle`, readout **`tap`**; one click → play → `learning…` → **`60 bpm`** 6 s later | same misleading `tap` while idle; the detector itself works |
| headless, test build, SoundCloud "Cave" (`soundcloud.mjs --loop`, before and after) | `learning…` → **`70 bpm`** 1.5–1.8 s after the probe starts watching (≈ 8 s after play) | the detector works on real music in Chromium 153 |

Root cause: the readout had three states (`learning…`, bpm, `tap`) for a detector with five situations, and `tap` was the
default for "not learning and no bpm", i.e. also for "nothing has played yet". Two attach gaps sat behind it: the chain
attaches on the element's `playing` event only, so an element already running when Kari arrived (a watch page whose
video started before the content script ran at `document_idle`, an SPA rebind onto a running element) never attached
until a pause or a seek; and on YouTube the attach always waited for the page's first click, silently, even where
Chrome would have started the context without one.

### What changed

| Piece | Where | What |
|---|---|---|
| Phase | `detect.ts` `TempoPhase`, `tempoPhase()` | `off · idle · gesture · learning · found · none`: the detector's state, or why it is not running (protected audio or a tap/typed grid → `off`; waiting for the page's first click → `gesture`; started but no playing frame counted yet → still `idle`). The detector re-announces `learning` on its first heard frame, so the readout flips idle → learning only once audio counts. |
| Status | `controller.ts` `AudioStatus.tempo` (replaces `learning: boolean`), `protocol.ts` `HookStatus.tempo` + sanitizer (unknown phase → `idle`, never `none`) | emitted whenever an input moves: detector state, pause/playing, seek, DRM, grid ownership, the gesture wait |
| Readout | `src/content/ui/tempo-readout.ts` (pure, Node-tested), `dock.ts` | `play to learn` · `click to learn` · `learning…` · `N bpm` · `tap` · hidden. `tap` only when the detector listened for 12 s of audio and found nothing. |
| Attach | `controller.listen()` | an element already playing when Kari starts listening is treated as its `playing` event: attach now |
| Gesture | `controller._attach()`, `contextRunning()` | YouTube: the context is created and tried first (400 ms); Chrome runs it without a click on a site the profile listens to often (media-engagement index), so the detector starts on autoplay. Only a context Chrome keeps suspended waits for the first click, and the readout says `click to learn` while it does. SoundCloud's graph belongs to the page and never waited. |
| Tests | `tests/readout.test.mjs` (+3), `tests/soundcloud.test.mjs` | every readout state; the phase table; the detector's first-heard-frame announcement; the sanitizer's phase set. 79/79. |
| Probes | `tools/probe/tempo.mjs` (new), `dock.mjs` (readout row covers all six states), `soundcloud.mjs` (verdict = bpm or tap) | |

Measured after the change: YouTube, production build, headless, the metronome started from page script with no click:
`play to learn` (attached, 0 frames heard) → `learning…` 1 s after play → **`60 bpm`** 7 s after play, engine `wire`,
no click at all. SoundCloud test build, "Cave": `learning…` → **`70 bpm`** after 1531 ms, status `tempo: found`, then
the whole `--loop` row as before (5 taps → 119 bpm, 1 bar · 2017 ms, release). `dock.mjs` 19/19 with the six-state row.

Not measured, and the one live check this needs: a bpm appearing in Jesse's Chrome on a track that actually plays.
Headless Chromium reports user activation on its own, so the `click to learn` branch is covered by the unit test and the
dock probe, not by a live run.

### Live check for Jesse

`chrome://extensions` → Reload on the Kari card (0.3.1), then open a SoundCloud track page or a YouTube watch page in a
new tab and press play. The readout under Pitch / Speed says `play to learn` until the music runs through Kari,
`learning…` for about six seconds, then the bpm. If it says `click to learn` (YouTube, a profile Chrome does not yet
trust with autoplay audio), one click anywhere on the page starts it. `tap` now means only one thing: twelve seconds of
music went by with no steady beat found.

## Follow-ups (not built)

- Per-video bpm memory next to pitch/speed (today the grid is cleared on every new video).
- A phase nudge (± a few ms) if check 8 shows a consistent offset; and a tap-to-downbeat if 1-beat loops want bars.
- Auto-detect once the licence decision lands (`detect.ts` is the seam; the controller already calls `start()` on attach).
- `docs/playground.html` does not carry the new rows; a LIVE-PROBE row for loops once Jesse runs the checks.
- `impeccable detect` on the dock when the tool is installed.
