# Chrome Web Store listing — Kari

Publisher: the Cantum Google account, display name **YGG HOMME**. Jesse registers the account and clicks submit.
Everything below is ready to paste. The product name never contains the word YouTube.

## Title (≤45)

Kari — pitch & speed for music

## Summary (≤132, also the manifest description)

Key and speed of music on youtube.com and soundcloud.com. Slide for speed, tap for pitch. By YGG HOMME, powered by Cantum.

## Detailed description (plain text)

Kari changes the key and the speed of music on youtube.com and soundcloud.com while it plays, with studio accuracy, and a small animated character to keep you company.

How it works
• Slide left to slow a song down, right to speed it up. By default the pitch moves with the speed, like a record (vinyl mode), using only Chrome's own resampler.
• Tap Pitch − or + to change the key without changing the speed.
• Turn on key lock and the pitch stays put while the speed changes.
• Everything starts at zero, and one tap resets it.
• Loop ½ beat, 1 beat, 1 bar or 2 bars. Kari reads the tempo from the music, or you tap or type it.
• Hide Kari on YouTube or on SoundCloud from her settings. Her toolbar icon brings her back.

Studio accuracy
The pitch engine is Rubber Band Library R3, running in an audio worklet. Measured on the audio that actually reaches your speakers, every step from −12 to +12 semitones lands within 0.02 cents, and key lock holds 440.00 Hz at ±16 % speed. The engine runs only when the key changes and never stacks a second pass. If it ever stalls, you hear the original sound, never silence.

Full control
Vinyl or key lock, a ±8, ±16 or ±50 % speed range, hold-to-compare against the untouched sound (level- and delay-matched), key names, and a live readout of how far the sound runs behind the picture. Kari remembers the key and speed you chose for each song, on your own device.

Free and private
Kari is free, with no paid tier and no account. It never sends your data to us or anyone else: no analytics, no servers. The code is open source under the GPL-2.0 at https://github.com/cantum-io/kari.

Works on youtube.com video pages and soundcloud.com in desktop Chrome. SoundCloud is allowed once, from Kari's icon on a SoundCloud tab.

Screenshots show "Ritual Fire Dance" performed by the Illinois Brass Band, shared under a Creative Commons Attribution licence.

YouTube is a trademark of Google LLC. Use of this trademark is subject to Google Permissions. Kari is not affiliated with or endorsed by YouTube, Google or SoundCloud.

YGG HOMME · powered by Cantum · Rubber Band Library (GPL)

## Category

Entertainment. It is a listening tool, not a productivity tool.

## Language

English (United States)

## Single purpose

Change the pitch and speed of the music playing on a youtube.com watch page or a soundcloud.com page.

## Permission justifications

- **storage** — saves the user's interface preferences and, if enabled, the pitch and speed chosen per video (keyed by video id). Nothing else is stored.
- **Host permission www.youtube.com** — the extension runs on youtube.com watch pages: it finds the page's video element, routes its audio through the pitch engine, and draws its controls on the player.
- **Optional host permission soundcloud.com** — asked for only when the user clicks Kari's icon on a SoundCloud tab or turns SoundCloud on in her settings; Kari then routes that page's audio through the same engine and draws her controls on the play bar. No other site is touched.
- **scripting** — registers Kari's SoundCloud scripts after the user allows soundcloud.com, and starts them in SoundCloud tabs that are already open.
- **activeTab** — the toolbar click on a SoundCloud tab starts Kari on that tab in the same click.

No remote code. The worklet and the WebAssembly engine ship inside the package.

## Privacy practices (dashboard answers)

- Does the extension collect user data: **No.** No user data collected. Per-song memory (pitch and speed, keyed by YouTube video id or SoundCloud track link) stays in `chrome.storage.local` on the device and is never synced or sent anywhere; preferences (including the sites where she is hidden) use `chrome.storage.sync`.
- Personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity, website content: **none collected.**
- Certifications: not sold to third parties; not used for purposes unrelated to the single purpose; not used for creditworthiness or lending. **All three: yes.**
- Privacy policy URL: https://cantum.io/kari/privacy/

## URLs

- Homepage URL: https://cantum.io/kari/
- Support URL: https://cantum.io/kari/#support
- Official URL: None for now (needs cantum.io verified in Google Search Console under info@cantum.io)
- Privacy policy URL: https://cantum.io/kari/privacy/ (mirror of docs/PRIVACY.md)

## Contact

- Support email: info@cantum.io
- Homepage: https://cantum.io/kari
- Security: security@cantum.io

## Screenshots (1280×800, in `docs/store/`, real youtube.com)

Four screenshots. Shot with `tools/probe/shoot-store.sh` on the current build, in theater mode, with YouTube's
recommendations and everything below the player hidden, on a Creative Commons performance (Illinois Brass Band,
"Ritual Fire Dance", video `i0riJz2U6Zs`, channel Creative Commons Music and Audio), so no third-party thumbnail, title
or music video appears in the listing. The Constellation shot is dropped.

1. `01-dock.png` — the dock on the player: speed 0.80×, pitch −2, key lock, Kari beside it.
2. `02-full-control.png` — full control open: vinyl / key lock, range, hold to compare, key names, engine R3, a/v readout.
3. `03-kari-folded.png` — controls folded into Kari (pink, YGG cap).
4. `05-options.png` — the settings page: interface, Kari's colour and wardrobe, controls, engine tier.

Promo tile 440×280: `promo-440x280.png` ("Kari · Key and speed for music. Studio-accurate. Free.").

## Promo tile (440×280)

Kari on ink, one line: "Key and speed for music. Studio-accurate. Free." Credit line small at the bottom.

## Updating to a new release

1. Publish the GitHub release; CI attaches `kari-extension.zip` built from the tag
   (`https://github.com/cantum-io/kari/releases/download/vX.Y.Z/kari-extension.zip`). Check its manifest version.
2. Developer dashboard (the Cantum publisher account) → Kari → **Package** → Upload new package → that zip.
3. **Store listing**: paste the detailed description above if it changed. **Privacy**: the permission justifications above.
4. Submit for review. A new upload replaces any item still in review.

First submission (0.1.1, 2026-09-28) needed the developer account, 2-Step Verification, the verified contact email and
the trader declaration (Cantum LLC); those are done once.
