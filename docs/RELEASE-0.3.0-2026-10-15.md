# Kari 0.3.0 — YouTube + SoundCloud, beat loops, and why SoundCloud showed nothing (2026-10-15)

One build from six sessions' work, for Jesse to load once and test. Branch `claude/sc-noshow-e10a4a` (commits 2e7811e, f80a3c0, bc86fd7 merge of loops-v2, f7ce47a 0.3.0, plus this note), fast-forwarded onto kari `main` so the folder already loaded unpacked
(`~/Desktop/WDC_AGENT/~:Projects:kari/kari/extension`, Chrome id `nljfopkjcihikbhbjfbggdemilelmokh`) carries it after
one **Reload** on the card. Nothing pushed, no store update.

## What is in it

| Piece | Branch · commit | What it does |
|---|---|---|
| SoundCloud adapter, route 0 | `soundcloud-route0` 62c05e7 (in main 202ed3b) | MAIN-world hook wraps SoundCloud's own Web Audio graph at `document_start`; isolated bridge puts the dock on the bottom bar; `https://soundcloud.com/*` is an optional host permission. |
| Probe harness | `claude/sc-probe-harness-e8dbf5` fc08824 (in 202ed3b) | `KARI_TEST_HOSTS=soundcloud npm run build` + `tools/probe/soundcloud.mjs`: headless Chromium, the page's graph, RMS at the destination, Kari's readouts. |
| Beat loops (worklet, grid, tap, MIDI) | `claude/beat-loops-f975be` e93c354 (in 202ed3b) | Capture ring in front of the engine, 6 ms equal-power seam, slip release, bypass delay line, beat grid in media time, tap tempo, Web MIDI. |
| Loops on SoundCloud | `claude/infallible-tharp-1c2f4a` d0e4d1b | Loop row + MIDI on the SoundCloud dock; latch/release/tap/bpm cross the bridge with acks. |
| Loops v2 (Jesse's rulings) | `claude/loops-v2-a3a0ea` 09b7a8b | ½ · 1 · 1 bar · 2 bars as click-on/click-off toggles under Pitch and Speed with Full control off; in-house tempo detection ("learning…" → bpm); Kari the blob stays visible on YouTube when the controls auto-hide. |
| SoundCloud grant without the options page | this branch 2e7811e | Kari's icon on a soundcloud.com tab asks for the permission in that click, registers the scripts and injects them into the open tab; a grant from the options switch injects into every open SoundCloud tab; the bridge answers a ping and never runs twice; an already-open tab says "reload this page once". `activeTab` added (no warning). |
| SoundCloud dock placement | this branch f80a3c0 | The dock had mounted off-screen (panel hanging below the bar's top edge) and inherited `visibility:hidden` from `.playControls`. Now `top:auto` + `visibility:visible` on the host, and the dock follows the bar's `m-visible` (everything hides when no track is queued). |
| 0.3.0 | this branch | Version, manifest description names both sites. |

## The SoundCloud no-show, in order (the full record: `docs/LIVE-PROBE.md`, "If nothing appears on SoundCloud")

1. **The permission had never been granted.** The live profile is Chrome's "Profile 16" (jesse@wdconstructions.com,
   managed) — not "Default", which is the amaixamai@gmail.com YouTube profile also named Jesse. Its prefs showed the
   unpacked Kari enabled, worker started, granted hosts youtube.com only, no dynamic scripts. No policy anywhere.
2. **`ERR_BLOCKED_BY_CLIENT` on the options URL was a mistyped id** (31 characters, missing an "i"): Chromium answers
   exactly that for any id it does not have; the right id loads the page.
3. **After the toggle (~02:20 PT) the dock still showed nothing** because on main 202ed3b it mounted off-screen and
   hidden (measured: `#kari-dock` at y = bar top, h 320; root `visibility:hidden`). Nobody had checked row S13
   visually; the harness only asked whether the element existed. Fixed; `tools/probe/sc-grant.mjs` rows B2/B3 now
   require the dock visible, above the bar, on screen and hit-tested.
4. **The YouTube "Unsafe attempt to load URL …/rubberband.wasm" error** on the card is benign: one request, finished
   HTTP 200, R3 running 50–61 ms later; nondeterministic; main 202ed3b's own folder logs it too. Not a block.
5. **SoundCloud builds its graph at hydration** (one `createMediaElementSource` 6.5 s after load, before any click),
   so a SoundCloud tab that was open before the grant needs one reload; the dock says so now instead of staying blank.

## Gates on this build (each read back by exit code)

| Gate | Result |
|---|---|
| `npm run build` | 0; committed `extension/` equals a fresh build (stamp `0.3.0+ed68a837`) |
| `npm test` | 76/76 |
| `./node_modules/.bin/tsc --noEmit` | 0 |
| `npm run check:soundcloud` | PASS, bundle unchanged, all probes hold |
| `KARI_TEST_HOSTS=soundcloud npm run build && node tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --loop` | exit 0: dock in `.playControls`, loop row shown with Full control off, "learning…" → 70 bpm in 1.5 s, 5 taps → 119.2 bpm, 1-bar latch 2014 ms shown 4 ms after the click, loop 4 / route 0 / attached, 0 silent RMS windows looping and after release, element clock kept moving |
| `node tools/probe/dock.mjs` | 19/19 rows (loop row under the steppers, readout states, latch/release wiring, Kari visible with controls hidden on every skin, miniplayer, collapsed, reduced motion) |
| `node tools/probe/sc-grant.mjs` | exit 0, A1–A5 and B1–B6 (install state, options page, action logic, YouTube R3 in ≤ 61 ms, registration, dock SHOWN above the bar and hit-tested, injection into open tabs, reload notice, second click → present) |
| Screenshot, test build, 1440×900 | panel above the bar, controls + loop row + readout at the right, Kari bottom-right, gear left (`#kari-dock` y 532–852, bar top 852, root visibility visible) |

## What only Jesse's Chrome can verify (in this order)

1. `chrome://extensions` in the **jesse@wdconstructions.com** profile: Reload on the Kari card (0.3.0 shows on the
   card after the reload). The SoundCloud switch you turned on stays on across the reload.
2. Open `soundcloud.com` → **new tab** (or reload the one that is open) → play any free track. Expect: the dock above
   the bottom bar at the right, Kari's blob at its bottom-right, gear at the left; the loop row (½ · 1 · 1 bar · 2 bars)
   under Pitch and Speed with Full control off; "learning…" turning into a bpm within ~14 s; Pitch + → R3 within 2 s.
   Worker console (card → "service worker"): `[kari] soundcloud scripts registered (…)`.
3. YouTube: any watch page → Pitch + → R3; Kari stays visible when YouTube's controls fade; loops ½ / 1 / 1 bar /
   2 bars toggle on and off; Alt+↑/↓/←/→.
4. Ears (never measured, every session says so): the loop seam at ± semitones, grid alignment on real music,
   SoundCloud's pause/seek fades under a loop, hold-to-compare, key lock at ±16 %. Lists: `docs/BEAT-LOOPS-2026-10-15.md`
   ("UNVERIFIED by ear", "Live checks for Jesse", v2 and SoundCloud sections) and `docs/LIVE-PROBE.md` rows S1–S16.
5. Still open, not built: a Go+ (Widevine) track on SoundCloud (speed only is the design; audibility unknown); the
   licence call on the beat detector; the manifest description/store listing for the store update (`docs/STORE-LISTING.md`).
