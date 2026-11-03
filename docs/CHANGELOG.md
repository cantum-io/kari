# Changelog

The public record, one line per build; the full notes are the `docs/RELEASE-*.md` files.

## 0.9.0 · 2026-11-03
On SoundCloud, her panel gets the bottom row it has on YouTube.

## 0.8.0 · 2026-11-03
Two Karis on one page (a store copy beside an unpacked build) no longer fight for the audio in silence: the first to arrive owns the page, a later one stands down, and the panel says "two Karis are on this page — switch the other one off at chrome://extensions, then reload". An older copy that grabs the video first gets the same line instead of "couldn't reach the audio".

## 0.7.0 · 2026-11-03
The first-run hint no longer covers Hide and Full control on a taller panel.

## 0.6.0 · 2026-11-03
Hide Kari per site: a switch for YouTube and one for SoundCloud in her settings, and a "Hide Kari on …" button in her panel's gear. Hidden, she leaves the page and the audio plays as the site sends it; the key and speed she remembers for a song wait for her return, and her toolbar icon on that site's tab brings her back. The store listing and privacy policy now name SoundCloud and her current permissions.

## 0.5.0 · 2026-10-15
The control panel stays while it is in use: a pointer parked on it, focus inside it, or a tap or click in the last 3 s holds it through YouTube's control fade, so a tap burst never pauses the video. Kari herself still never fades. Auto tempo reads onsets against a 30 ms memory instead of the previous frame alone, so a dense mix no longer reads as twelve onsets a second and the detector commits on tracks it used to give up on.

## 0.4.0 · 2026-10-15
The tempo readout says what it knows (`play to learn` · `learning…` · the bpm · `tap` only after 12 s with no steady beat). A track already playing when Kari arrives attaches at once. The plush trophy is retired. SoundCloud per-track memory survives SoundCloud's `/undefined/slug` badge link.

## 0.3.0 · 2026-10-15
SoundCloud (optional permission, granted from Kari's icon on a SoundCloud tab; Kari rides SoundCloud's own Web Audio graph). Beat loops: ½ beat · 1 beat · 1 bar · 2 bars as toggles under Pitch and Speed, slip mode, 6 ms seam crossfade, MIDI pads. In-house tempo detection. Kari stays visible when YouTube's controls fade.

## 0.1.1 · 2026-09-29
First public build: YouTube watch pages, pitch −12…+12, speed ±8/16/50 %, vinyl and key lock, hold to compare, per-video memory, Rubber Band R3 with Signalsmith fallback.
