# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Kari is a Chrome extension (Manifest V3). Its surfaces are a control dock drawn on the YouTube player inside a Shadow DOM, and a settings page (`extension/options.html`).

## Users

Two audiences, both confirmed as primary:

- **Musicians.** Singers and instrumentalists who change a song's key to fit their range or instrument, or slow it down to learn a part. They set the accuracy bar.
- **Listeners.** People who enjoy slowed, sped-up or re-pitched versions of songs for their own sake. They are the volume.

Both are mid-song on a youtube.com watch page when they reach for Kari. They are listening, often with the video in view, and want the change to land without leaving the player.

## Product Purpose

Kari changes the key and the speed of music on youtube.com watch pages in real time, with studio-grade accuracy, fronted by a small animated character.

Success means the audio is measurably accurate and never worse than YouTube's own when nothing has been changed.

## Positioning

Accuracy is the point. Kari follows the one-pass rule: at most one lossy processing stage, and none until the user changes the key.

- Speed rides the video element's own playback rate with pitch correction off, so Chrome's resampler does the work and picture and sound share one clock.
- One engine applies only the pitch ratio. There is never a second lossy pass.
- If the engine stalls, audio falls back to a straight wire. Silence is not a failure mode.

Kari is free, with no paid tier, no accounts and no data collection, and is open source under GPL-2.0.

## Operating Context

- Runs only on `www.youtube.com/watch` pages, on top of YouTube's own player. YouTube's interface and the playing video sit behind and around the controls.
- The dock has a folded state (Kari alone on the player), an unfolded state (speed slider, pitch steppers), and Full control (vinyl or key lock, range, hold to compare, key names, readouts).
- Keyboard commands go through Chrome's command system: Alt/Option + Up/Down for pitch, Alt/Option + Right/Left for speed.
- Settings and the pitch and speed chosen per video are remembered in `chrome.storage.sync`.

## Capabilities and Constraints

Shipped in 0.1.0:

- Pitch from −12 to +12 semitones. Speed with a ±8 %, ±16 % or ±50 % range.
- Vinyl mode (pitch moves with speed) is the default. Key lock holds pitch while speed changes.
- Hold to compare against the untouched sound, level-matched and delay-matched.
- A live sound-behind-picture readout.
- Engines: Rubber Band Library R3 (primary) and Signalsmith Stretch (fallback), with an Auto setting that steps down when the machine can't keep up.
- Six interfaces: Organism, Void, Signal, Alien Weather, Constellation. Kari comes in blue, pink or black, with a wardrobe: YGG cap, thin black sunglasses, chunky sneakers, plush trophy.

Constraints:

- No YouTube API anywhere in the product.
- Permissions are `storage` and the `www.youtube.com` host only. No remote code. No network requests.
- The product name never contains the word "YouTube". Kari is not affiliated with YouTube or Google.
- The Rubber Band GPL licence requires its credit to stay visible.

Committed roadmap (confirmed; future design work should leave room for it):

- A DJ layer: effects rack, BPM and beat-synced effects, key detection, tuning snap, slip-mode roll and brake, MIDI, and a side-panel deck view.

Open decisions:

- Whether the roadmap features stay inside the "free, no paid tier" promise has not been restated since the build brief. The shipped README and store listing say free forever.
- Later ideas that depend on a legal read of YouTube's Terms (stems, buffer tapping, two decks) are not committed.

## Brand Commitments

- **Name:** Kari. Brand: YGG HOMME. Builder of record: Cantum Marketing LLC. Credit line: "YGG HOMME · powered by Cantum".
- **Character:** Kari, a small animated character who fronts the controls (`extension/icons/kari.svg`).
- **Voice:** plain, exact and measured. Claims come with numbers. Examples from shipped copy: "Everything starts at 0." "Silence is not a failure mode."
- **Store category:** Entertainment. It is a listening tool, not a productivity tool.

## Evidence on Hand

- Accuracy measurements: within 0.02 cents at every step from −12 to +12 semitones; key lock holds 440.00 Hz at ±16 % speed; engine delay 61 ms at 44.1 kHz (56 ms at 48 kHz) plus 6 ms of limiter look-ahead; 97 ms total sound-behind-picture on a MacBook Air's built-in output. Sources: `docs/SPRINT-0-BENCH.md`, `docs/LIVE-PROBE.md`.
- Five store screenshots taken on real youtube.com and a promo tile: `docs/store/`.
- Store listing copy: `docs/STORE-LISTING.md`. Privacy policy: `docs/PRIVACY.md`.
- UI playground: `docs/playground.html`.

Absent, and not to be fabricated: user counts, reviews, testimonials, press, and listening-test results against competitors. Competitor figures in `docs/BUILD-BRIEF.md` marked † are unverified.

## Product Principles

1. **Accuracy before features.** Nothing ships that adds a second lossy pass or degrades untouched audio.
2. **Do nothing until asked.** Everything starts at zero and returns to zero with one tap.
3. **Claims are measured.** Every number shown to users comes from a bench or a live probe.
4. **The controls live on the video.** The user never leaves the player to change the sound.
5. **Nothing leaves the browser.** No accounts, no telemetry, no network requests.

## Accessibility & Inclusion

No formal standard has been chosen; this is an open decision.

Current practice in the code: keyboard commands for pitch and speed, `aria-pressed` and `aria-expanded` states on controls, and motion gated behind `prefers-reduced-motion: no-preference`.
