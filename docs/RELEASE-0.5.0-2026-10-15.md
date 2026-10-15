# Kari 0.5.0 — the two YouTube defects from the 0.4.0 ear test (2026-10-15)

0.4.0 (`docs/RELEASE-0.4.0-2026-10-15.md`, tag `v0.4.0`, submitted to the Chrome Web Store) went through Jesse's ear
test at ~11:45 PT: "tap works sometimes and sometimes not" · "the control screen keeps fading away and doesn't stick
with kari". One mechanism behind both, fixed in this build; the full write-up with the before/after tables is
`docs/TAP-FADE-2026-10-15.md`.

| Change | Commit | What |
|---|---|---|
| Panel kept while in use | 793069f | A pointer parked on the dock is idle to YouTube, so `ytp-autohide` landed after ~3 s and the panel hid with it; the next tap fell through to the player, paused the video, and every tap after that was a 0 s gap. The panel now stays while the pointer is inside it (or the gear or settings), while anything in the dock has focus, and for 3 s after a real click, key or input; YouTube's `cursor:none` stays off the kept panel. Kari's blob unchanged (never fades). |
| Probe | 793069f | `tools/probe/tapfade.mjs`: both defects as rows, headless, trusted mouse input on the dock's own buttons; `dock.mjs` +5 rows. |

Gates on this build: build 0 (`extension/` = fresh build, stamp `0.5.0+6ca283d3`) · `npm test` 80/80 · `tsc --noEmit` 0 ·
`check:soundcloud` PASS · `dock.mjs` 24/24 · `tempo.mjs` exit 0 (`60 bpm` at 9.8 s) · `tapfade.mjs` exit 0 on both of
Jesse's links from fresh profiles · `soundcloud.mjs --loop` exit 0 on the test build · `npm run zip` → `kari-extension.zip`
(17 files, 248 KB). Taste lint on the dock CSS identical before and after (pre-existing findings only); `impeccable
detect` not installed here: UNVERIFIED.

Not in this build: the auto-tempo miss on link 1 (`V3bLpIXaFp8` never commits, says `tap` at 15 s) — a detector
question in its own session, needs Jesse's count on that track.

## Live check for Jesse

`chrome://extensions` → Reload on the Kari card (0.5.0) → a YouTube watch page → play → Full control on. Park the
pointer on **Tap** for 5 s: YouTube's bar fades, the Kari panel stays, the cursor stays an arrow over it. Tap eight
times without moving the mouse: every tap counts and the video never pauses. The rest of the ear list is in
`docs/TAP-FADE-2026-10-15.md`.

Store: the zip is ready; 0.4.0 is still in review, so uploading 0.5.0 replaces that pending item. Tag `v0.5.0` is local;
the push is Jesse's.
