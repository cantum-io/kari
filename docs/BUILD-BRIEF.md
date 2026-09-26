# YouTube DJ Extension — Pitch & Tempo Build Brief v1

CANTUM · 2026-09-26 · project "youtube dj mixer chrome extension" · cloud session linked to MacBook Air M4 · claude-opus-5-5

## The call

Accurate pitch and tempo means **at most one lossy processing stage, and none when nothing is changed.**

- Tempo rides YouTube's own player speed with pitch correction switched off. Chrome's clean resampler does the work, and picture and sound share one clock, so they can't drift.
- One top-tier engine applies only the pitch correction.
- Until you change something, the audio isn't touched at all.

**First action: a $0 accuracy bench, 1–2 working sessions.** It measures pitch error, drift, A/V offset and dropouts. It also blind-tests Rubber Band R3 against Signalsmith before any money goes to the £590 engine licence.

Legend: † = reported by a research agent and not re-checked by me (UNVERIFIED). Everything else was read live on 2026-09-26 or computed.

## 1. Your questions, answered

### Use YouTube's official API?

No. It's free, but it can't reach the audio, and using it would forbid our core feature.

- The IFrame Player API only plays, pauses, seeks, sets volume and sets speed (0.25×–2×, depending on the video). It has no pitch control and no access to the audio.
- The Data API has no listed fee. It runs on a daily quota (10,000 units by default, more on request) and returns metadata only.
- Any app that uses these APIs is an "API Client". Policy III.I.7 bars API clients from separating, isolating **or modifying** the audio of YouTube content. That covers pitch shifting itself, not just AI isolation. III.I.6 also bars modifying the player.
- **Decision: no YouTube API anywhere in the product.** The extension works on youtube.com's own player, the way the existing pitch extensions do (Transpose, 1M+ users†).
- Because we don't use the API, its ban doesn't bind us. Per your rule, AI isolation stays on the roadmap, parked behind accuracy.
- YouTube's general Terms of Service still apply. Reading them is a gate before Phase 3.

### Has anyone done it?

Not at studio grade.† Transpose's figures were reported independently by two agents.

| Product | Users† | What we know† |
|---|---|---|
| Transpose | 1M Chrome + 81k Edge, 4.46★ | Engine undisclosed. Reviews call it warbly and robotic, and its own blog advises staying within ±3 st. Free core; Studio is $4.99/mo with on-device stems |
| YOU.DJ "YouTube DJ effects" | 200k, 4.16★ | Tab capture. Reviews report crackle and broken fullscreen. Last updated May 2024: the stale DJ-effects incumbent |
| Transpose by Chordify | 5k, 3.5★ | Signalsmith engine. Clean small shifts, but buffer glitches |
| Wave Shifter | 239 | Signalsmith in WASM plus EQ, reverb and delay; MIT |
| TEMPO Slider | 150 | Rubber Band R3, but tempo only (no key shift); GPL |
| The reference extension | 58 | SoundTouch; skips and silence (read live, see below) |
| Web DJ mixers (DJ7X, YouDJ web) | — | Can't reach the audio inside YouTube's embedded player, so no EQ or pitch |
| YouTube and YouTube Music | — | No pitch or key control; Premium added speed options |
| Moises | 70M | Won't import YouTube links |

**Verdict: nobody ships studio-grade key and tempo, or DJ effects, on YouTube at scale.**

### Why the reference extension sounds bad

Read from its source code:

- It uses SoundTouch, a time-domain method. That family scored poorly on music in a 42,529-rating listening study.†
- When more than 4,096 processed frames pile up (32 × the 128-frame block, ≈85 ms at 48 kHz), it throws the extra away. You hear that as skips.
- When the engine falls behind, it writes silence. You hear that as clicks and gaps.
- There is no bypass, so audio is processed even at 0 semitones.
- Also reported:† it resamples by linear interpolation with no anti-alias filter, and it never corrects for the delay against the video.

## 2. What "accurate" means — the spec we test against

| Check | Target | How we measure |
|---|---|---|
| Nothing changed | Untouched: the extension doesn't attach to the audio until your first change. After that, 0 st at 1.0× is a straight wire with no processing | Null test on the straight-wire path in the bench: output minus input is silence |
| Pitch accuracy | ≤2 cents error at ±1, ±5 and ±12 st | Test tones through the engine: 440 Hz up 3 st must read 523.25 Hz |
| Pitch stability | Steady tones stay steady: tracked pitch wobbles ≤1 cent | Catches the "warble" of delay-line shifters |
| Tempo | Zero drift between sound and picture | Tempo comes from the video's own clock, and a pitch-only engine never changes duration. Check beat marks against frames after 10 minutes |
| A/V offset | ≤90 ms audio-late on built-in or wired output. Viewers start noticing around 125 ms late† | Flash-and-beep test video plus the audio clock's output timestamps |
| Dropouts | 0 in 10 minutes at ±12 st with a busy YouTube page | Underrun counter in the audio thread |
| Drums and vocals | Blind listeners prefer ours over Transpose at ±2 and ±5 st on drum-heavy clips | MUSHRA-style blind test: hidden original, the reference extension as low anchor, level-matched |
| Stereo | No phasing when summed to mono | Channels processed together, the fix Mixxx needed† |
| Level | Within ±0.5 dB of the original; never clips | Meter plus true-peak limiter |

## 3. How pitch and tempo work — the one-pass rule

Controls: **Key** (semitones plus cents), **Tempo** (ranges of ±8, ±16 or ±50%), **Key lock** on or off.

1. Set `video.playbackRate = r` and `video.preservesPitch = false`. Chrome resamples the audio with its sinc resampler,† which is clean, and the picture plays at exactly the same rate.
2. The engine applies one pitch ratio: `2^(k/12) ÷ r` with key lock on, `2^(k/12)` with it off.

| You set | What runs | Quality |
|---|---|---|
| 0 st, 1.0× | Nothing | Identical to YouTube |
| Key only | Engine at `2^(k/12)` | Set by the engine |
| Tempo, key lock on | Chrome's resample plus engine at `1/r` | Set by the engine |
| Tempo, key lock off (vinyl) | Chrome's resample only | Artifact-free; pitch moves with tempo like a turntable |
| Key and tempo | Chrome's resample plus engine at `2^(k/12) ÷ r` | Set by the engine, one pass |

- **Never used: Chrome's built-in keep-pitch speed mode stacked under a second shifter.** Chrome's mode uses WSOLA,† so the stack is two lossy passes. That's the likely route to "robotic".
- If you use YouTube's own speed menu, we read the change and apply the same math, so the two controls never fight.
- Whether YouTube resets the pitch setting on its own speed changes is UNVERIFIED, so we re-assert it on every speed change.

## 4. Engine

| Engine | Role | Delay | Licence |
|---|---|---|---|
| Rubber Band R3 (Finer, real-time, channels together) | Ship pick if it wins the bench. The vendor documents it as best on bass-heavy mixes and vocals,† and Mixxx ships it for key lock† | ≈43 ms (2,048-sample start delay† at 48 kHz) | GPL, or one-time **£590 Standard** (prominent credit, "any platforms", unlimited apps). £1,490 without credit for teams under 10 |
| Signalsmith Stretch | Bench baseline and free fallback. Official WASM/AudioWorklet npm build, with formant control | ≈120 ms at its default preset.† Too late for lip sync unless the block shrinks | MIT, $0 |
| Bungee Pro, élastique | Only if R3 loses on drum-heavy material at ±8/±16%. Traktor and djay use élastique† | Not published | Quote needed |
| Out | SoundTouch (the reference's engine), and delay-line shifters like Tone.js and Jungle (warble, comb filtering†) | — | — |

The £590 tier requires a prominent credit; an About line in the panel covers it. It's over $500, so it waits for your approval after the bench.

## 5. Architecture

**Process model (Chrome MV3):**

- **Content script** on youtube.com and music.youtube.com:
  - finds the video element; YouTube is believed to reuse one element across pages (UNVERIFIED; the Phase 0 probe checks);
  - owns one AudioContext at 48 kHz;
  - attaches to the audio only on your first change;
  - drives the player's speed;
  - injects the in-player panel inside a Shadow DOM so YouTube's styles can't touch it.
- **One AudioWorklet running one WASM core** on the audio thread, away from YouTube's busy page:
  - chain: pitch engine, then the Phase 2 effects, then a true-peak limiter;
  - parameters are smoothed and nothing is allocated per block;
  - it counts underruns and CPU load.
- **Service worker:** settings, per-video memory, keyboard commands, licence check.
- **Side panel (Phase 2):** deck view and MIDI controllers.
- **Not used:** YouTube APIs, and tab capture (YOU.DJ's method, whose reviews report crackle and broken fullscreen†).
- **Permissions:** YouTube hosts plus storage.
- **Once attached, the video's audio stays routed through the extension until the page reloads.** That's a browser rule, and it's why we attach late.

```
<video>   playbackRate = r, preservesPitch = false   (tempo: Chrome resampler; picture + sound share one clock)
   │
   ├── nothing changed yet ────────────► native YouTube audio path (extension not attached)
   │
MediaElementSource  (attached on first change)
   ├── 0 st at 1.0× ───────────────────► speakers   (straight wire)
   └── AudioWorklet, one WASM core ────► speakers
         pitch engine   ratio 2^(k/12) ÷ r  (key lock on)
         → DJ effects (Phase 2)
         → true-peak limiter
```

**Latency budget (R3, built-in speakers):**

| Stage | Time |
|---|---|
| Audio block | 2.7 ms (128 frames at 48 kHz) |
| Pitch engine | ≈43 ms† |
| Effects and limiter | ≤5 ms |
| Output device | ≈10–40 ms (UNVERIFIED typical) |
| **Sound behind picture** | **≈60–90 ms**, under the ≈125 ms point viewers notice† |

Effects sit after the engine, so knob moves skip its delay and are heard in under ≈50 ms.

## 6. DJ effects (Phase 2) — same WASM core, after the pitch engine

- Isolator EQ (3 bands with full kills), a one-knob resonant filter (low-pass to high-pass), tempo-synced echo, reverb, flanger or phaser, and a gate.
- **Slip-mode performance effects** from a ring buffer of the last few seconds: loop roll, brake, spinback and short scratches. YouTube keeps playing underneath, so letting go lands back in time, like a CDJ's slip mode. Design idea; untested.
- Beat sync needs BPM detection: web-audio-beat-detector (MIT†) or realtime-bpm-analyzer (Apache-2.0†).
- Every parameter is ramped, so there's no zipper noise.

## 7. Creative ways to pitch-shift YouTube — ranked, accuracy first

1. **The one-pass rule** (section 3). Ready now.
2. **Vinyl mode.** Pitch and tempo move together by resampling alone, with zero artifacts. It also covers nightcore and slowed edits. Ready now.
3. **Auto tuning snap.** Detect how far a recording sits off concert pitch and fix it in one click; 30 cents is a 1.75% resample. No product found does the detection.† Needs our own detector, since Essentia is AGPL.†
4. **Key names, not just numbers.** Show "E♭ → F", plus one tap to match another track's key (Camelot wheel). Serato charges for key sync.†
5. **Vocal mode.** Formant-preserved shifts, so voices don't chipmunk. R3 and Signalsmith both support it.
6. **Drums stay dry.** Separate harmonic from percussive sound with classic DSP (median-filter HPSS, not AI) and shift only the harmonic part, so drums keep their punch.
   - Research-backed; no shipped product found.†
   - Adds ≈50–90 ms on the live path,† so it pairs with idea 7.
7. **Instant, then refine.** Render ahead of the playhead at maximum quality and crossfade in, with zero added delay.
   - Needs YouTube's buffered audio, which is fragile and raises a Terms question.
   - Phase 3.
8. **Pre-render one step each way** (with idea 7), so single-semitone moves land at full quality instantly. Idea; untested.

## 8. Interface and motion

**Layout and controls**

- **Controls live on the video.** A button in YouTube's control bar opens a compact panel, not a toolbar popup that closes when you click back into the page.
- **Readout order:** key name first, then semitones, then cents. For example: "E♭ → F", "+2 st", "0 cents".
- **Tempo fader** with a ±8/±16/±50% range switch and a key-lock toggle, like a CDJ. Tempo shows as BPM once detected.
- **Hold to compare** original against processed, level-matched and delay-matched so the comparison is honest. It's the fastest proof of "accurate".
- **Shortcuts** go through Chrome's command system and avoid YouTube's own keys: space, k, j, l, m, f, c, arrows, Shift + period or comma, and digits.

**Motion** (atlas-taste): **register R0**, because this is a tool used constantly while listening.

- Knobs, faders, steppers and shortcuts respond instantly, and the readout updates the moment a change is sent.
- Only the panel animates: 200 ms in, 150 ms out, 97% scale plus fade.
- Presses get 160 ms of feedback.
- Reduced-motion users get fades only.
- Every drag control also has steppers, and focus is always visible.

**Visual system:** Cantum's spine from CANTUM HUB — ink, graphite, hairlines, no shadows or gradients.

- Signal indigo (#6E63FF on ink) is used only as the "processing on" light, which is exactly how Cantum's brand rations it.
- The panel's backing matches YouTube's own menus, so it reads as part of the player.
- The full design pass happens at build, including a check that Schibsted Grotesk has tabular figures for the readout.

**Name:** open. I recommend a product name of its own with a "made by Cantum" credit, since DJs and musicians aren't Cantum's GC buyers.

## 9. Plan and costs

| Phase | Ships | Time (estimate) | Cost |
|---|---|---|---|
| 0 — Accuracy bench | Bench page running R3 and Signalsmith on the same clips; every check in section 2; blind test against Transpose's recorded output; 10-minute live probe on youtube.com (worklet loading under YouTube's security rules; delay on speakers vs AirPods) | 1–2 sessions | $0 (R3's GPL build, internal testing only) |
| 1 — MVP | Key ±12 st plus cents; tempo ±8/16/50% with key lock and vinyl mode; bypass; per-video memory; shortcuts; in-player panel; limiter; Chrome Web Store listing | ≈2–3 weeks | £590 R3 licence if it wins |
| 2 — DJ layer | Effects rack, BPM and beat-synced effects, key detection, tuning snap, slip-mode roll and brake, MIDI, headphone cue (UNVERIFIED in extensions) | ≈3–4 weeks | $0 |
| 3 — Moat, after a legal read | Instant-then-refine, drums stay dry, AI stems, two decks | TBD | Legal review |

**Your decisions:**

1. Go on Phase 0: $0.
2. After the bench, the R3 Standard licence: £590 (confirm-first, since it's over $500).
3. Before Phase 3, a legal read of YouTube's Terms for stems, buffer tapping and two-deck mixing. DJ.Studio pulled its YouTube mixing in December 2024 after a record-label warning.†

## 10. Risks

| Risk | Answer |
|---|---|
| YouTube updates break it. Transpose reviews report breakage after September 2026 updates† | Hook the video element, never YouTube's interface classes; nightly check on 5 test videos; fast releases |
| Bluetooth headphones: routing audio through Web Audio likely drops Chrome's automatic output-delay compensation, so AirPods users hear sound late (my inference, UNVERIFIED) | Measure in Phase 0. If real: show the delay, offer a low-delay engine setting, and delay the picture only as a last resort. Users who change nothing are unaffected, because we never attach |
| Weak laptops glitch | Step down automatically when the underrun counter trips: R3 Finer, then R3 short window, then R2, then Signalsmith's cheaper preset |
| Ads get processed | Bypass during ads |
| Protected videos (movies, rentals) may go silent through Web Audio (UNVERIFIED) | Detect and switch off cleanly |
| Label or legal pushback on stems and mixing | Phase 3 waits for the legal read |

**Kill criterion:** if the Phase 0 blind test can't show listeners prefer ours over Transpose at ±2 and ±5 st on drum-heavy clips, "accurate audio" isn't a wedge. Rethink before Phase 1.

## Objections that survived

Adversary: Transpose's lead engineer, whose 1M users ride on "good enough" pitch.

1. "Nobody hears the difference at ±2 st." **Survives as the kill criterion.** The bench answers it before money moves.
2. "R3 in WASM will crackle on cheap laptops, just like ours." **Fixed:** the step-down ladder plus a zero-dropout target, measured on the weakest machine available.
3. "AirPods users will hear lag on any Web Audio pitch path." **Survives as a risk.** It's measured in Phase 0 and the mitigations are listed. Users who change nothing never see it.

## Sources

**Read live this session:**

- [Reference extension source](https://cdn.jsdelivr.net/gh/snpranav/pitch-shifter-extension@main/src/worklet/pitchProcessor.js)
- [Rubber Band licence](https://breakfastquay.com/technology/license.html)
- [Signalsmith Stretch](https://github.com/Signalsmith-Audio/signalsmith-stretch)
- [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies)
- [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Data API quota](https://developers.google.com/youtube/v3/getting-started)
- CANTUM HUB brand spine (Notion)

**Agent-reported (†):**

- [Transpose on chrome-stats](https://chrome-stats.com/d/ioimlbgefgadofblnajllknopjboejda)
- [YOU.DJ effects on chrome-stats](https://chrome-stats.com/d/defekohaofmambflfpfoojkmfdpcbgko)
- [Chromium audio renderer](https://raw.githubusercontent.com/chromium/chromium/main/media/filters/audio_renderer_algorithm.cc)
- [Rubber Band integration notes](https://breakfastquay.com/rubberband/integration.html)
- [Mixxx channels issue](https://github.com/mixxxdj/mixxx/issues/11361)
- [Listening study, arXiv 2006.00848](https://arxiv.org/abs/2006.00848)
- [Harmonic–percussive time-scale modification](https://www.mdpi.com/2076-3417/6/2/57)
- [DJ.Studio on YouTube mixing](https://dj.studio/blog/dj-with-youtube-old)
- [A/V sync thresholds](https://en.wikipedia.org/wiki/Audio-to-video_synchronization)