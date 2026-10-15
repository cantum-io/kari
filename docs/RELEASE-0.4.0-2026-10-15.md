# Kari 0.4.0 — Jesse's last two changes after the 0.3.0 live test (2026-10-15)

0.3.0 (`docs/RELEASE-0.3.0-2026-10-15.md`) was reloaded in Jesse's Chrome at ~03:50 PT and read back live: dock above
the SoundCloud bar, blob at the bottom right, loop row under the steppers; Jesse: "working on youtube on soundcloud
now. the audio works good job." His two rulings for v.4, both in this build:

| Change | Commit | What |
|---|---|---|
| Trophy removed | 61ba1f5 | The plush trophy — the creature toggle in the control panel's settings — is gone completely: SVG, toggle, corner button and animation, options switch, stored setting, CSS. |
| Tempo autodetect | 116b00f (branch `claude/tempo-fix`, merged 9deb62b) | Read live: the readout said `tap` before anything had played (its default for "not learning, no bpm"), and two attach gaps sat behind it. Now the readout says `play to learn` · `click to learn` · `learning…` · `N bpm` · `tap` (only after 12 s of music with no beat); an element already playing when Kari arrives attaches at once; YouTube tries the audio context before waiting for a click. Headless: YouTube `play to learn` → `learning…` → `60 bpm` 7 s after play with no click; SoundCloud "Cave" `learning…` → `70 bpm` in 1.5 s. |
| Track key | 1f12f60 | SoundCloud's bottom-bar title link read `/undefined/cave` on Jesse's account; Kari's per-track memory now rejects that and rebuilds the key from the badge's user link or the page address. |

Gates on this build: build 0 (`extension/` = fresh build, stamp `0.4.0+46ab0667`) · `npm test` 80/80 · `tsc --noEmit` 0 · `check:soundcloud` PASS · `dock.mjs` 19/19 · `tempo.mjs` exit 0 (YouTube, production build, no click: `60 bpm` at 10.1 s, 7 s after play) · `soundcloud.mjs --loop` exit 0 (test build, "Cave": `learning…` → `70 bpm` in 1.5 s, 1-bar latch 2026 ms, release) · `sc-grant.mjs` exit 0 (A1–A5, B1–B6).

## Live check for Jesse (the one thing not measured headless)

`chrome://extensions` → Reload on the Kari card (0.4.0) → a SoundCloud track page or a YouTube watch page in a new
tab → play. The readout under Pitch / Speed: `play to learn` until the music runs through Kari, `learning…` for about
six seconds, then the bpm. `click to learn` (YouTube only) means one click anywhere on the page starts it. `tap` now
means twelve seconds of music went by with no steady beat. The ear list is unchanged (`docs/BEAT-LOOPS-2026-10-15.md`).
