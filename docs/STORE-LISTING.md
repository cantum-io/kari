# Chrome Web Store listing — Kari

Publisher: the Cantum Google account, display name **YGG HOMME**. Jesse registers the account and clicks submit.
Everything below is ready to paste. The product name never contains the word YouTube.

## Title (≤45)

Kari — pitch & speed for music

## Summary (≤132, also the manifest description)

Change the key and speed of music on youtube.com in real time. Slide for speed, tap for pitch. By YGG HOMME, powered by Cantum.

## Detailed description (plain text)

Kari changes the key and the speed of music on youtube.com watch pages while it plays, with studio accuracy, and a small animated character to keep you company.

Slide left to slow the song down, right to speed it up. By default the pitch moves with the speed, like a record: that is vinyl mode, and it uses nothing but Chrome's own resampler, so nothing is touched until you ask for something a resampler cannot do. Tap Pitch − or + to change the key. Turn on key lock and the pitch stays put while the speed changes. Everything starts at zero and returns to zero with one tap.

Accuracy is the point. The engine is Rubber Band Library R3, the same engine DJ software ships for key lock, running in an audio worklet. Measured on the real audio that reaches your speakers: within 0.02 cents at every step from −12 to +12 semitones, key lock holding 440.00 Hz at ±16 % speed. The engine runs once, only when the key changes; there is never a second lossy pass. If the engine ever stalls, the audio falls back to a straight wire. Silence is not a failure mode.

Full control adds vinyl or key lock, a ±8, ±16 or ±50 % range, hold-to-compare against the untouched sound (level- and delay-matched), key names, and a live sound-behind-picture readout. Settings and the pitch you chose per video are remembered. Keyboard: Option+↑/↓ for pitch, Option+→/← for speed.

Kari is free forever. No paid tier, no accounts, no data collected, nothing leaves your browser. Open source under the GPL-2.0 at https://github.com/cantum-io/kari.

Works on www.youtube.com/watch pages. Not affiliated with YouTube or Google.

YGG HOMME · powered by Cantum · Rubber Band Library (GPL)

## Category

Entertainment. It is a listening tool, not a productivity tool.

## Language

English (United States)

## Single purpose

Change the pitch and speed of the audio of the video playing on a youtube.com watch page.

## Permission justifications

- **storage** — saves the user's interface preferences and, if enabled, the pitch and speed chosen per video (keyed by video id). Nothing else is stored.
- **Host permission www.youtube.com** — the extension runs only on youtube.com watch pages: it finds the page's video element, routes its audio through the pitch engine, and draws its controls on the player. No other site is touched.

No remote code. The worklet and the WebAssembly engine ship inside the package.

## Privacy practices (dashboard answers)

- Does the extension collect user data: **No.**
- Personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity, website content: **none collected.**
- Certifications: not sold to third parties; not used for purposes unrelated to the single purpose; not used for creditworthiness or lending. **All three: yes.**
- Privacy policy URL: https://github.com/cantum-io/kari/blob/main/docs/PRIVACY.md

## Contact

- Support email: info@cantum.io
- Homepage: https://cantum.io/kari
- Security: security@cantum.io

## Screenshots (1280×800, taken on real youtube.com)

1. The dock on a music video, controls unfolded, slider at −20 %, pitch −2, engine R3, a/v readout visible.
2. Full control open: vinyl / key lock, range pills, hold to compare, key names, readouts.
3. Kari folded alone on the player (hidden state), pink colourway with the YGG cap.
4. The Constellation interface, moon on the orbit at +3.
5. The settings page: interface, Kari's look, wardrobe, engine tier, privacy line.

## Promo tile (440×280)

Kari on ink, one line: "Key and speed for music. Studio-accurate. Free." Credit line small at the bottom.

## Before submitting (Jesse)

1. `npm run zip` → `kari-extension.zip` (contains LICENSE and THIRD-PARTY-NOTICES.txt).
2. Developer account under the Cantum Google account, display name YGG HOMME, one-time registration fee.
3. Paste the fields above. Upload five screenshots and the promo tile.
4. The privacy policy URL and the source link resolve only once the GitHub repository is public.
