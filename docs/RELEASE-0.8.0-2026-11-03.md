# Kari 0.8.0 (2026-11-03)

0.7.0 plus #7 and #8. Jesse's ruling of 2026-11-03 11:19–11:21 UTC: the record button stays where it is and is written
nowhere a user reads: not in the changelog, the store listing, the README, the privacy policy or cantum.io/kari. This
file and `docs/RECORD-2026-11-03.md` are the engineering record and keep the facts.

| Change | PR | What |
|---|---|---|
| Two Karis on one page | #7 | The first content script claims the page; a later copy stands down; the owner's panel says "two Karis are on this page — switch the other one off at chrome://extensions, then reload". An older copy that grabs the video first gets the same line (InvalidStateError on createMediaElementSource). |
| A take at the engine's level | #8 | Chrome scales the element's captured audio by the page's volume slider; the recorder's tap now undoes it (floored at a 26 dB lift) and logs every slider move. `take-pitch.mjs`: what a take carries, proven on live youtube.com. |
| Version, docs | this PR | 0.8.0; the listing, README, privacy policy and changelog carry no record line; the 0.7.0 changelog entry keeps its hint fix only. |

## Gates

Cloud, every commit: build byte-identical to `extension/`, `tsc --noEmit` 0, `npm test`, `dock.mjs`. CI green on the PR.

Jesse's Mac, real youtube.com, head aded360 (the #8 branch, same source as 0.8.0 minus the version and docs):
`record-live.mjs` 7/7 (LR6: slider 1 → 0.25 mid-take, halves peak 0 dB and 0 dB), `take-pitch.mjs` 5/5 (440.00 Hz;
+5 st 587.33 Hz; after a mid-take press 622.26 Hz; 0.94× 413.60 Hz; the moves file logs the press). `dock.mjs` 34/34 in the
cloud on #7.

UNVERIFIED on this exact commit: the Mac gates ran on aded360; 0.8.0 adds the version bump and doc edits only.
