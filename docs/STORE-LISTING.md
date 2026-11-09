# Chrome Web Store listing — Kari 0.9.0

Publisher: the Cantum Google account; the store shows the account's verified trader name, **Cantum LLC**. Jesse pastes and clicks submit. The product name never
contains the word YouTube. Drafted 2026-10-15, updated 2026-11-03 for the 0.9.0 upload. The live listing (read
2026-11-03 17:20 UTC) is 0.7.0 with the 0.7.0 text, its Rec bullet included; this file replaces that text field by field.

## Title (≤45)

Kari — pitch & speed for music

The store shows the manifest's `name`; a new name ("Kari — pitch, speed & loops for music", 37 characters) needs a
manifest change; proposed 2026-10-15, not taken (the name stays).

## Summary (≤132)

Key, speed and beat loops for music on YouTube and SoundCloud, live in the player. By YGG HOMME, powered by Cantum.

(115 characters, proposed 2026-10-15. The dashboard reads the summary from the package, so until the manifest changes the
store shows the manifest description, unchanged since 0.3.0: "Key and speed of music on youtube.com and soundcloud.com.
Slide for speed, tap for pitch. By YGG HOMME, powered by Cantum.")

## Detailed description (plain text)

Kari changes the key and the speed of music on YouTube and SoundCloud while it plays, loops a bar of it, and keeps a small animated character on the player.

How it works
• Slide left to slow the song down, right to speed it up. The pitch rides the speed, like a record, until you turn on key lock.
• Tap Pitch − or + to change the key a semitone at a time, from −12 to +12.
• Tap ½, 1, 1 bar or 2 bars to loop that much of the song. Tap it again and the song carries on where it would have been.
• Kari reads the tempo herself after about six seconds. Tap tempo, or type a bpm, to override her.
• Everything starts at zero, and one tap resets it.
• Hide Kari on YouTube or on SoundCloud from her settings or the gear on her panel. Her toolbar icon brings her back.

Measured, not promised
The pitch engine is Rubber Band Library R3 in an audio worklet. On the audio that reaches your speakers, every step from −12 to +12 semitones lands within 0.02 cents, and key lock holds 440.00 Hz at ±16 % speed. The engine runs only when the key changes and never stacks a second pass. If it ever stalls, you hear the original sound, never silence.

Full control
Vinyl or key lock, a ±8, ±16 or ±50 % speed range, hold-to-compare against the untouched sound (level- and delay-matched), key names, a typed bpm, MIDI pads for the loops, and a live readout of how far the sound runs behind the picture. Kari remembers the key and speed you chose for each video or track, on your own device.

SoundCloud
Optional. Click Kari's icon on a SoundCloud tab and allow her once; she then sits above the player bar. A tab that was open before needs one reload. Go+ tracks are speed only.

Free and private
Kari is free, with no paid tier and no account. She never sends your data to us or anyone else: no analytics, no servers, no network requests. The code is open source under the GPL-2.0 at https://github.com/cantum-io/kari.

Works in desktop Chrome on youtube.com video pages and on soundcloud.com.

Screenshots show "Ritual Fire Dance" performed by the Illinois Brass Band (Creative Commons Attribution) and music by AMAI on SoundCloud, used with permission.

YouTube is a trademark of Google LLC. SoundCloud is a trademark of SoundCloud Global Limited & Co. KG. Kari is not affiliated with or endorsed by YouTube, Google or SoundCloud.

YGG HOMME · powered by Cantum · Rubber Band Library (GPL)

## Category

Entertainment. It is a listening tool, not a productivity tool.

## Language

English (United States)

## Single purpose

Change the pitch and speed of, and loop, the audio of the music playing on a youtube.com watch page or a soundcloud.com page.

## Permission justifications

- **storage** — saves the user's interface preferences and, if enabled, the pitch and speed chosen per video or track (keyed by the YouTube video id or the SoundCloud track address). Nothing else is stored.
- **Host permission www.youtube.com** — the extension runs on youtube.com watch pages: it finds the page's video element, routes its audio through the pitch engine, and draws its controls on the player.
- **Optional host permission soundcloud.com** — off until the user allows it. The user grants it from the toolbar icon on a SoundCloud tab, or from the switch in the settings page; it can be turned off there. Once granted, Kari registers its two bundled content scripts for soundcloud.com so it can hook the page's own Web Audio graph and draw the dock above the player bar.
- **scripting** — registers those SoundCloud content scripts only after the optional permission is granted (they cannot be declared statically, because the permission is optional), and injects them into the tab the user granted from so the dock appears without a reload. Only Kari's own bundled scripts are ever registered or injected.
- **activeTab** — when the user clicks Kari's icon, lets Kari act on that one tab for that click: the service worker reads the clicked tab's URL to tell that it is a soundcloud.com tab before asking for the optional permission, then injects its bundled scripts into the page that was already open. No other use; the URL is the only thing read from the tab, never its content.

No remote code. The worklet, the WebAssembly engine and both content scripts ship inside the package.

## Privacy practices (dashboard answers)

- Does the extension collect user data: **No.** Per-video and per-track memory (pitch and speed) stays in `chrome.storage.local` on the device and is never synced or sent anywhere; preferences use `chrome.storage.sync`.
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
- Security: info@cantum.io

## Screenshots (1280×800, in `docs/store/`)

Six screenshots. 01–04 shot with `tools/probe/shoot-store.sh` on youtube.com in theater mode, recommendations hidden,
on a Creative Commons performance (Illinois Brass Band, "Ritual Fire Dance", video `i0riJz2U6Zs`). 05–06 shot with
`tools/probe/shoot-sc.mjs` on the SoundCloud test build, on "sittin gin my room" by AMAI (Jesse's own music, soundcloud.com/amaixamai/sittin-gin-my-room; the detector read 104.8 bpm on its own).

1. `01-dock.png` — the dock on the YouTube player: speed 0.80×, pitch −2, key lock, Kari beside it.
2. `02-full-control.png` — full control open: vinyl / key lock, range, hold to compare, key names, engine R3, a/v readout.
3. `03-kari-folded.png` — controls folded into Kari (pink, YGG cap).
4. `05-options.png` — the settings page: interface, Kari's colour and wardrobe, controls, engine tier.
5. `06-soundcloud-dock.png` — the dock above SoundCloud's player bar, loop row under the steppers, tempo read.
6. `07-loop-row.png` — a 1-bar loop lit, the tempo readout, Kari beside it.

Promo tile 440×280: `promo-440x280.png` ("Kari · Key and speed for music. Studio-accurate. Free.").

## Updating to a new release

1. Publish the GitHub release; CI attaches `kari-extension.zip` built from the tag
   (`https://github.com/cantum-io/kari/releases/download/vX.Y.Z/kari-extension.zip`). Check its manifest version.
2. Developer dashboard (the Cantum publisher account) → Kari → **Package** → Upload new package → that zip.
3. **Store listing**: paste the description above; add `06-soundcloud-dock.png` and `07-loop-row.png` beside the four
   existing shots. **Privacy**: the single purpose (changed in 0.7.0) and the five justifications above; the data answers are unchanged.
4. Submit for review. A new upload replaces any item still in review.

The first submission (0.1.1, 2026-09-28) set up the developer account, 2-Step Verification, the verified contact email
and the trader declaration (Cantum LLC); those are done once.
