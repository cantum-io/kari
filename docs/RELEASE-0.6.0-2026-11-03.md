# Kari 0.6.0 — hide Kari per site (2026-11-03)

Jesse, 2026-11-03: "collect the new record button build out and kari hide and lets prepare to build next version of
kari and update on github and our google chrome extension. after we build and test". The Chrome Web Store was still on
0.4.0 (read live 2026-11-03, "Updated October 15, 2026"), so this store package also carries 0.5.0's two fixes.

| Change | PR | What |
|---|---|---|
| Hide Kari per site | #1 | `hideOnYouTube` / `hideOnSoundCloud` switches in settings, a "Hide Kari on …" button in the dock's gear panel, the toolbar icon on that site's tab brings her back. Hidden = no dock, neutral audio with `preservesPitch` handed back to the element, commands and track changes inert; the remembered key and speed wait for her return. |
| Recorder | #2 | `kari-recorder` worklet stage, streaming 24-bit WAV writer with cue markers, the moves log, the download path. **Compiled out of this build** (`__KARI_RECORD__`); see `docs/RECORD-2026-11-03.md`. |
| Record pill | #3 | One pill under the loop row, click to start, click again to stop and save. **Compiled out of this build** too: it exists only in a `KARI_RECORD=1` build. |
| Store listing + privacy | this PR | The 2026-10-15 store-edit drafts (found uncommitted on Jesse's Mac) committed, then Hide Kari and the update steps on top; `docs/CHANGELOG.md`; two SoundCloud store shots. |
| `hide-live.mjs` | this PR | The hide rows on live youtube.com and soundcloud.com. |

Site-audio export stays out of every public zip (store and GitHub) until Jesse's legal ruling. His local build with the
record pill is `KARI_RECORD=1 npm run zip` (stamp `0.6.0+e4f15061+rec`); never commit `extension/` from it.

## Gates on this build (commit 35a031a, stamp `0.6.0+e4f15061`)

Cloud: `npm run build` → `extension/` byte-identical to the committed files · `npm test` 116/116 · `tsc --noEmit` 0 ·
the committed bundles carry none of `kari-recorder`, `Record a take`, `nothing to record`, `moves.json`, `audio/wav`
(0 files) · a `KARI_RECORD=1` build carries them (content, sc-bridge, sc-hook, worklet) and the public rebuild after it
is byte-identical again. CI green on the PR.

Jesse's Mac (`/tmp/kari-gate.sh`, real youtube.com and soundcloud.com, fresh headless profiles):

| Gate | Result |
|---|---|
| build, then `git status -- extension` | 0 lines |
| `npm test` | 116/116 |
| `dock.mjs` | 24/24 |
| `hide.mjs` (fixtures) | 9/9 |
| `hide-live.mjs` (live sites) | 6/6. Run against `v0.5.0` it fails LY2 (dock still there, playbackRate 1.01), so it can fail. |
| `record.mjs` (real Chromium contexts, Chrome's decoder, ffprobe) | 19/19 |
| `tempo.mjs` (60 bpm metronome) | `60.1 bpm` at 9.8 s, no click |
| `tapfade.mjs` link 1 `V3bLpIXaFp8` · link 2 `IcxJHQ0N13s` | 8 pass, 0 fail each; tap() 5/5 after the hold, play/pause toggled 0× |
| `soundcloud.mjs --loop` ("sittin gin my room") | graph present, Kari attached, 1 bar latched and released, 0/38 windows silent |
| rebuild after the test build | byte-identical |

UNVERIFIED: ears (nothing was listened to), the toolbar click itself (its decision is unit-tested in `sites.test.mjs`),
a take recorded on a live page in a `+rec` build.

## Release

Tag `v0.6.0` on the merge commit; publishing the GitHub release runs `release.yml`, which builds from the tag, checks
`extension/` against a fresh build, runs the tests and attaches `kari-extension.zip`. Store: the same zip, uploaded on
the Cantum developer account (info@cantum.io) per `docs/STORE-LISTING.md`, with the listing text and the two SoundCloud
shots. cantum.io/kari (page 600) and /kari/privacy/ (631) move to 0.6.0; the stage stays on kari 0.4.0.
