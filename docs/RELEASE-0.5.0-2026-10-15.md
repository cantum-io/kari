# Kari 0.5.0 — the two YouTube defects from the 0.4.0 ear test (2026-10-15)

0.4.0 (`docs/RELEASE-0.4.0-2026-10-15.md`, tag `v0.4.0`, submitted to the Chrome Web Store) went through Jesse's ear
test at ~11:45 PT: "tap works sometimes and sometimes not" · "the control screen keeps fading away and doesn't stick
with kari". One mechanism behind both, fixed in this build; the full write-up with the before/after tables is
`docs/TAP-FADE-2026-10-15.md`.

| Change | Commit | What |
|---|---|---|
| Panel kept while in use | 793069f | A pointer parked on the dock is idle to YouTube, so `ytp-autohide` landed after ~3 s and the panel hid with it; the next tap fell through to the player, paused the video, and every tap after that was a 0 s gap. The panel now stays while the pointer is inside it (or the gear or settings), while anything in the dock has focus, and for 3 s after a real click, key or input; YouTube's `cursor:none` stays off the kept panel. Kari's blob unchanged (never fades). |
| Probe | 793069f | `tools/probe/tapfade.mjs`: both defects as rows, headless, trusted mouse input on the dock's own buttons; `dock.mjs` +5 rows. |
| Auto tempo on dense mixes | (this build) | The onset function read link 1's frame-to-frame flicker as twelve onsets a second, so no period could explain it and the readout gave up ("tap" at 15 s). The rise is now measured against the loudest of the last three frames (30 ms, `FLUX_MEMORY` in `detect.ts`), SuperFlux's trick along time, no model, no dependency. Found by the tempo session offline on exact captures of what the page computed (`docs/TEMPO-LINK1-2026-10-15.md`, `tapfade.mjs --dump/--pcm`, `replay.mjs`). Shipped on Jesse's order before his count on link 1 arrived. |

Auto tempo on this build, headless, fresh profiles (`tapfade.mjs --only A --stage 30000`): the 60 bpm metronome `60 bpm`
at 9.5 s · link 1 (`V3bLpIXaFp8`) `121.8 bpm` 16.7 s after play (0.4.0: never; conf 0.37; the readout says `tap` at 15 s
and then the bpm 4 s later) · link 2 (`IcxJHQ0N13s`) `90 bpm` at 10.6 s on one run and `136 bpm` at 8.6 s on the
next (0.4.0 said 135 at 12.1 s; 90 and 136 are a 2:3 pair and both runs cleared the 0.35 bar by a hair, 0.36 and 0.35).
**Nothing was heard.** Jesse's count on link 1 and link 2 decides whether 122 and 90/136 are right; a wrong octave or
2:3 alias is the usual miss and is a prior/alias choice, not the onset fix.

Gates on this build: build 0 (`extension/` = fresh build, stamp `0.5.0+accde037`) · `npm test` 81/81 · `tsc --noEmit` 0 ·
`check:soundcloud` PASS · `dock.mjs` 24/24 · `tempo.mjs` exit 0 (`60 bpm` at 9.8 s) · `tapfade.mjs` exit 0 on both of
Jesse's links from fresh profiles · `soundcloud.mjs --loop` exit 0 on the test build · `npm run zip` → `kari-extension.zip`
(17 files). Taste lint on the dock CSS identical before and after (pre-existing findings only); `impeccable
detect` not installed here: UNVERIFIED.

## Live check for Jesse

`chrome://extensions` → Reload on the Kari card (0.5.0) → a YouTube watch page → play → Full control on. Park the
pointer on **Tap** for 5 s: YouTube's bar fades, the Kari panel stays, the cursor stays an arrow over it. Tap eight
times without moving the mouse: every tap counts and the video never pauses. The rest of the ear list is in
`docs/TAP-FADE-2026-10-15.md`.

Store: the zip is ready; 0.4.0 is still in review, so uploading 0.5.0 replaces that pending item. Tag `v0.5.0` and main
pushed to cantum-io/kari on Jesse's order ("just fix and push and give me v.5 ready").
