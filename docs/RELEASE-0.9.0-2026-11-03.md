# Kari 0.9.0 (2026-11-03)

0.8.0 plus #10: the take on SoundCloud. Jesse's ruling of 2026-11-03 11:19–11:21 UTC holds: the record button is written
nowhere a user reads (changelog, store listing, README, privacy policy, cantum.io/kari). The public changelog line says
only that the SoundCloud panel gets the bottom row it has on YouTube. This file and `docs/RECORD-2026-11-03.md` are the
engineering record.

0.8.0 was staged for the store and never uploaded; 0.9.0 takes its place, so one review carries #7, #8 and #10.

| Change | PR | What |
|---|---|---|
| The take on SoundCloud | #10 | The Rec pill on the dock above SoundCloud's player bar; the recorder runs in the MAIN-world hook, the bridge saves the WAV and the moves file, named from the badge title. A hide holds the take (`holdTake`), as a park does on YouTube; an ad ending while Kari is parked no longer resumes a take. |
| Version, docs | this PR | 0.9.0; one neutral changelog line; the listing header names 0.9.0 and the live store state. |

## Gates

From the #10 thread: `npm test` 131/131, `tsc --noEmit` 0, committed `extension/` matches a fresh build, the fixture probe
7/7 with planted faults caught; on Jesse's Mac, live soundcloud.com, `record-sc.mjs` 5/5 and `soundcloud.mjs --loop` pass.

This PR: build byte-identical to `extension/`, `tsc --noEmit`, `npm test`, `dock.mjs` in the cloud; CI on the PR. Jesse's
Mac on this branch: `record-live.mjs` and `take-pitch.mjs` on live youtube.com (the controller's take paths changed),
`record-sc.mjs` on live soundcloud.com. Results are in the PR.
