# Kari 0.7.0 — the record button in the store build (2026-11-03)

Jesse, 2026-11-03 08:57 UTC: "skip the local build I want to push to google chrome and download from there". The take
(docs/RECORD-2026-11-03.md) was compiled out of 0.6.0 pending his ruling; this is the ruling. #5 turned
`__KARI_RECORD__` on in the default build. 0.7.0 is 0.6.0 with the take, and it is the store's next package (the store
is on 0.4.0, so this upload carries 0.5.0, 0.6.0 and 0.7.0). v0.6.0 stays published on GitHub as the hide-only build.

| Change | PR | What |
|---|---|---|
| Record on by default | #5 | `scripts/build.mjs` defaults the take on (`KARI_RECORD=0` compiles it out, stamp `+norec`). The bundle test asserts presence. `docs/PRIVACY.md` says what a take is and where it goes, and the listing and README name the button. No new permission: the files go through an anchor. |
| Version, changelog | this PR | `package.json` 0.7.0, `extension/` rebuilt, `docs/CHANGELOG.md`, the listing header, and the listing's single purpose with the record clause. |
| First-run hint fix | this PR | The gate caught the intro hint covering Hide and Full control under the taller panel. It moves down by the take row and is not drawn while Full control is on. `dock.mjs` checks that every visible control's centre hits that control. |
| `record-live.mjs` | this PR | A take on live youtube.com. The browser's files are read back by ffprobe and ffmpeg. |

## Store policy

The Chrome Web Store program policies (read live 2026-11-03, last updated 2025-05-22) say: "Do not encourage,
facilitate, or enable the unauthorized access, download, or streaming of copyrighted content or media". Video
downloaders are also listed as not featured. Jesse saw the line before the submission. Review can reject the package
(hide would wait with it), and a strike lands on the Cantum publisher account. The copy describes the take as what it
is, a practice take of what Kari plays at the user's key and speed, and never sells it as saving songs.

Tripwire: if review rejects on this policy, `KARI_RECORD=0 npm run zip` gives the same version without the take
(stamp `+norec`). It goes up under a new version number, and the GitHub release keeps the default build.

## Gates

Cloud, every commit: `npm run build` leaves `extension/` byte-identical to the committed files. `npm test` 116/116,
`tsc --noEmit` 0. The default build carries `kari-recorder` (content, sc-hook, worklet) and `Record a take`.
`KARI_RECORD=0` gives 0 recorder files and stamp `0.7.0+…+norec`, and the default rebuild after it is byte-identical
again. `dock.mjs` 32/32. CI green on the PR.

Jesse's Mac, real youtube.com and soundcloud.com, fresh headless profiles (`/tmp/kari-gate-070.sh`):

| Gate | 04ca32e (first run) | 4dbf9c8 (hint fix), full run |
|---|---|---|
| build, then `git status -- extension` | 0 lines | 0 lines |
| `npm test` | 116/116 | 116/116 |
| `dock.mjs` | pass | 32/32 (the new first-run row fails 31/32 without the fix) |
| `hide.mjs` · `hide-live.mjs` | pass · 6/6 | 9/9 · 6/6 |
| `record.mjs` (Chrome's decoder, ffprobe) | 19/19 | 19/19 |
| `tempo.mjs` (60 bpm metronome) | pass | `60 bpm` at 10.1 s, no click |
| `tapfade.mjs` link 1 `V3bLpIXaFp8` · link 2 `IcxJHQ0N13s` | **FAIL both**: "Full control did not turn on" | 9 pass, 0 fail · 9 pass, 0 fail |
| `soundcloud.mjs --loop` ("sittin gin my room") | pass | graph present, Kari attached, 1 bar latched and released, 0/40 windows silent |
| `record-live.mjs` (a take on live YouTube) | FAIL (the probe clicked while YouTube's controls slept) | 5/5: two files `kari-…-60-bpm-metronome-+0st-1.00x.wav` / `.moves.json`, ffprobe `pcm_s24le` 2 ch 44.1 kHz, 7.05 s against 7.0 s held, max 0 dB, moves start … stop |
| rebuild after the test build | byte-identical | byte-identical |

The tapfade failure was real. A layout read on the live player found that the toggle's centre hit the intro hint in
the default build and hit the toggle itself in a `KARI_RECORD=0` build of the same commit. Fixed in 4dbf9c8.

record-live's moves file had an empty `kari` field, so ccf911e passes the build stamp to the take. Re-gate on ccf911e
(`/tmp/kari-gate-070b.sh`, the rows that touch the take path): build 0 lines of `extension/` diff, `npm test` 116/116, `dock.mjs` 32/32, `record.mjs` 19/19,
`record-live.mjs` 5/5 (the moves name `0.7.0+e43f5800`), `tapfade.mjs` link 1 9 pass and 0 fail, `hide-live.mjs` 6/6,
and the rebuild after the test build leaves 0 lines of diff.

UNVERIFIED: ears (nothing was listened to), the toolbar click itself (its decision is unit-tested in
`sites.test.mjs`), a take on SoundCloud (no record path there yet; the pill is hidden), and Chrome's "download
multiple files" prompt in a normal profile (headless Chromium accepted both files without asking).
