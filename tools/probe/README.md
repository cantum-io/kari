# Live-probe harness

Drives a Playwright Chromium with the unpacked extension and measures the audio that actually reaches the output,
independently of the extension's own readouts. This is how the numbers in `docs/LIVE-PROBE.md` were taken.

```
cd tools/probe
npm init -y >/dev/null && npm i playwright && npx playwright install chromium
EXT="$(cd ../../extension && pwd)" UDD=/tmp/kari-udd HEADLESS=1 node server.mjs &
./fresh.sh ymJIXzvDvj4          # 60 BPM metronome: unambiguous delay measurement
node q.mjs iso <<'JS'
await __kari.apply({st:0,cents:1,tempo:0,range:50,keyLock:false}); await new Promise(r=>setTimeout(r,1500));
__probe.record(3.2); await new Promise(r=>setTimeout(r,3600)); return JSON.stringify(__probe.xcorr(6000,0.2,1.5));
JS
```

- `server.mjs` — the HTTP control surface (see the header comment for endpoints). `HEADLESS=1` keeps the browser off
  the screen; `MUTE=0` lets it play through the speakers.
- `iso-probe.js` — installed into the content script's isolated world; taps `src` (input) and the summing analyser
  (output) with analysers and a dual recorder. `measure()` gives in/out frequency (zero-crossing, ±0.05 cents on a
  sine) and level; `xcorr()` / `xcorrEnv()` give the in→out stream delay; `analyzeEnv()` finds holes and clicks.
- `q.mjs` — one-shot client. `fresh.sh` — load a video, wait out the ad, attach, install the taps.
- `__kari` is the content script's debug surface (isolated world only, invisible to the page).

YouTube throttles the automation profile (`googlevideo.com` 403s after ~15–45 s and long unskippable pre-rolls), so
each measurement starts from a fresh load. Rows that need ears or a real device (AirPods, fullscreen, global
shortcuts) are run in a normal Chrome with the extension loaded unpacked.

## Dock layout (`dock.mjs`)

The real `Dock` class on a blank page, headless, no YouTube: bundles `src/content/ui/dock.ts` into `test-build/`, mounts
it with fake deps and reads computed styles, never the extension's readouts. Rows (loops v2): the loop row under the
steppers with Full control off and on, the four pills, disabled until a tempo, the tempo readout's three states, latch /
lit-release / switch calls, the clamp text, controls hidden on every skin (Kari's anchor stays visible and clickable,
panel and gear go), miniplayer, collapsed, reduced motion. `--shots dir` saves screenshots.

```
node tools/probe/dock.mjs --shots test-build/dock-shots      # 19/19 rows hold, 2026-10-15
```

## Tempo readout, YouTube (`tempo.mjs`)

The production build on a watch page, headless, no click anywhere first: the player is started from page script (the
autoplay case; Playwright's Chromium lets media and audio contexts start without a gesture, like a Chrome profile that
listens to youtube.com often) and the dock's tempo readout, the engine readout, the controller's detector state and the
`[kari]` console lines are sampled every second for 20 s; if no bpm came, one click on the player and 20 s more. Exit 0
= a bpm appeared on its own. `--no-click` stops after the first window; `--watch ms` sets the windows; `--json` dumps it.

```
npm run build
node tools/probe/tempo.mjs                                   # 60 bpm metronome ymJIXzvDvj4
node tools/probe/tempo.mjs https://www.youtube.com/watch?v=…
```

The readout contract it watches (`src/content/ui/tempo-readout.ts`): `play to learn` until something plays through Kari ·
`click to learn` while the track plays but Chrome will not start the context before the page's first click · `learning…`
only while the detector listens · `N bpm` · `tap` only once it listened for 12 s of audio and found no steady beat.

## Tap tempo + panel fade, YouTube (`tapfade.mjs`)

Built 2026-10-15 for Jesse's ear test on 0.4.0 ("tap works sometimes and sometimes not" · "the control screen keeps
fading away and doesn't stick with kari"). The production build on a watch page, headless; everything a user would do is
done with Playwright's mouse on the dock's own buttons (trusted input), and the answers come from YouTube's own
`ytp-autohide` class, computed styles inside the dock's open shadow root, the controller's tap log in the isolated world
(`AudioController.tap` is wrapped there: what it returned, the tapper's taps, the media time, paused, the grid) and the
`[kari]` console lines.

```
npm run build
node tools/probe/tapfade.mjs https://www.youtube.com/watch?v=…   [--only ABC] [--stage ms] [--json] [--headed]
                                                                  [--dump frames.json] [--pcm audio.pcm]
node tools/probe/replay.mjs frames.json [--at seconds] [--bpm a,b] [--window s] [--odf sum|low|high] [--ioi]
```

Phases, each from a fresh load (YouTube throttles the automation profile after ~15–45 s): **A** the stage — play from
page script, sample the readout and the detector's estimate every second until a bpm or `--stage` ms · **B** idle under
the pointer — park the pointer still over the video, YouTube's own control bar, Kari's Tap pill, Kari's blob and the
panel's top edge, 5 s each, and watch `ytp-autohide` and the panel's visibility · **C** taps — five clicks on the Tap
pill 500 ms apart, then a 4 s hold still on the pill, then five more clicks at the same spot: did they reach `tap()` or
the player? Exit 0 = the panel held under the pointer and every click reached `tap()`.

**Offline bench (2026-10-15, for the link-1 detector question).** `--dump` wraps `AutoBeatDetector.feed` in the
isolated world and records every onset batch the worklet posts (the ODF and low-band frames, the batch's context time,
both clocks as the detector read them, playing or not) plus every estimate the detector made; `--pcm` adds a
ScriptProcessor on the controller's own source node and records what Kari hears (mono 16-bit at the context's rate,
the rate in a `.json` sidecar). `replay.mjs` feeds a dump back through the real `AutoBeatDetector` in Node and prints
every run next to what the page recorded (the replay reproduces the page's runs to the digit on both of Jesse's
links), and `--at s` opens the window ending at media time `s`: the prior-free autocorrelation peaks, the best comb at
every bpm with its P / E / empty teeth, the novelty's density and the inter-onset intervals. The method and the
numbers: `docs/TEMPO-LINK1-2026-10-15.md`.

### Run: 2026-10-15 ~12:30 PT, 0.4.0 as shipped (f8b62bc), Chromium 153 headless, MacBook Air M4

Both of Jesse's links. The defect, in one line: a pointer parked on the dock is idle to YouTube (the dock stops clicks at
its host, never mousemove), so `ytp-autohide` lands after 3–4.5 s, the dock hides its panel with it (visibility hidden),
and the next click at the same spot falls through to the player and pauses the video; every tap after that is a bounce
(media time frozen) and returns nothing.

```
                                      V3bLpIXaFp8 (link 1)              IcxJHQ0N13s (link 2)
A  bpm on its own                     none in 30 s: "tap" at 15.0 s     "135 bpm" 12.1 s after play (conf 0.47)
   detector's estimate meanwhile      82 / 122 / 153 bpm, conf 0.17–0.27 (bar 0.35), E 0.09–0.17
B1 pointer still over the video       autohide 3.0 s, panel hidden      autohide 3.0 s, panel hidden
B2 … over YouTube's own control bar   autohide 3.0 s                    autohide 3.0 s
B3 … over Kari's Tap pill             autohide 4.5 s, PANEL HIDDEN      autohide never (5 s), panel stayed
B4 … over Kari's blob                 autohide never, blob visible      autohide 4.0 s, blob visible
B5 … over the panel's top edge        —                                 autohide 3.0 s, PANEL HIDDEN
C1 5 clicks on Tap, 500 ms apart      5/5 reached tap(): null, 116.5, 116.3, 116.5, 116.8 → "116.8 bpm"; gaps 0.511–0.517 s
C2 4 s hold still on the pill         autohide true, panel hidden/0     same
C3 5 more clicks at the same spot     #6 fell through to the player → video paused; #7–#10 reached tap() while paused → null ×4
```

B3/B4 differ between the links only in whether YouTube's timer happened to be fed by the approach move; the panel's
fate under the autohide was the same everywhere. C3 is the mechanism of "sometimes": one lost click pauses the video,
and a paused video makes every later tap a 0 s gap (a bounce, ignored by design).

### Fix and re-run (same session; dock.ts `kept`)

The dock now keeps the panel through the autohide while it is in use: pointer inside the panel, the gear or the
settings; focus inside the dock; or a real (trusted) click, pointer-down, key or input within the last 3 s. A
synthetic click (a MIDI pad, a test) is not use. Under the autohide `.root[data-kept="1"]` sets `cursor:default` so
YouTube's `cursor:none` on the player does not reach the panel. `dock.mjs` gained five rows for it (24/24).



One command, one track, one table: what SoundCloud's own Web Audio graph is doing and whether Kari is in it. Built for
the SoundCloud hook (route 0, `docs/SOUNDCLOUD-GRAPH-2026-10-14.md`) so it can be checked headless before anyone
listens.

```
npm run build                                       # production extension/, unchanged by the switch below
KARI_TEST_HOSTS=soundcloud npm run build            # + test-build/soundcloud/ (gitignored)
node tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --kari
```

Flags: `--kari` reads Kari too · `--loop` (implies `--kari`) drives beat loops through the dock, see below · `--json`
prints the report as JSON for assertions · `--verbose` logs clicks and page warnings · `--headed` shows the window ·
`--ext <dir>` another build · `--settle <ms>` wait after play starts (2500).
Exit `0` played · `1` play never started within 20 s of the page load · `2` setup failed (no test build, no load) ·
`3` the `--loop` check failed (played, but no 1-bar loop latched, or it was silent, or the second click did not release it).

**Why a test build.** Kari asks for SoundCloud as an optional permission, and automation cannot click Chrome's
permission prompt. `scripts/test-hosts.mjs` (run by `npm run build`, a no-op unless `KARI_TEST_HOSTS` is set) copies
`extension/` to `test-build/soundcloud/`, moves `https://soundcloud.com/*` into `host_permissions`, adds it to the
web-accessible resources, and registers the SoundCloud scripts statically: `sc-hook.js` (MAIN world,
`document_start`) and `sc-bridge.js` (isolated, `document_start`), the names in `src/background/sw.ts`. Rename them in the
`HOSTS` table at the top of the script if the hook ships other names. The switch lives outside `scripts/build.mjs`
because that file is hashed into the build stamp; touching it would change every shipped file. Proof it changes
nothing: sha256 of all 14 files in `extension/` identical before the change, after it, and after a test build
(2026-10-14, late evening PT). Never load `test-build/` as the real extension.

**How it measures.** Chromium (Playwright `launchPersistentContext`, `channel: "chromium"`, headless, muted) with the
test build loaded unpacked; a fresh profile per run. Before any page script, the harness installs its own MAIN-world
observer (`addInitScript`, the same `document_start` MAIN-world position the hook uses). It wraps `AudioContext`,
`createMediaElementSource`, `AudioNode.connect/disconnect`, `document.createElement` for media elements and the
`playbackRate` setter, always calls through, and never changes an argument or a return value, so it composes with
Kari's wrapper in either order (the `hook order` row says which one is outermost). Every node that connects into a
destination is also connected into one analyser of the harness's own: `RMS at destination` is what reaches the
speakers, summed, sampled every 50 ms for 2 s, independent of Kari's readouts. The gain chain is replayed from the
recorded connect/disconnect log, starting at the newest source node.

Page handling: the OneTrust banner gets "I'm a GPC user, please maintain my preferences" (the opt-out, never
"Continue"); its close button is tried on the sign-in dialog a logged-out page opens; play is the bottom bar's button when it is live, otherwise the track's
hero button (the bar is `.disabled` on a cold load until something is queued). The first click usually lands before
the player hydrates and is dropped, so it retries every 2 s, never while the bar already says playing. Play starts
12–15 s after load on a cold profile (seven runs).

**`--kari` reads**: `[kari]` console lines from the page and the service worker (plus console errors mentioning
kari, worklet, chrome-extension or AudioContext); the dock's `engine` and `a/v` readouts and its host element when
`#kari-dock` mounted; and `__kari.audio.status` from the extension's isolated world over CDP (same route as
`server.mjs`). The hook session asserts on these: engine `wire` / `R3`, a/v ms, `attached`. `--json` carries all of
it under `kari`. The verdict says "Kari attached" when an `AudioWorkletNode` appears in the page's graph, the dock
mounted, or `__kari.audio.status.attached` is true.

### Run: 2026-10-15 00:08 PT, today's Kari (no SoundCloud hook), Chromium 153 headless, MacBook Air M4

Track: "Cave [Creative Commons]" by LOFI LION, licensed CC BY (`"license":"cc-by"` in the page's own data,
read 2026-10-15), https://soundcloud.com/lofilion/cave.

```
track                        https://soundcloud.com/lofilion/cave
play started                 yes, 12153 ms after load (clicked .sc-button-play.playButton ×2)
AudioContext                 running 44100 Hz base 5.8 ms out 24 ms (1)
MediaElementAudioSourceNode  1 created (first at 11345 ms)
gain chain                   MediaElementSource → Gain → Gain → Gain → destination
node types                   GainNode, AudioDestinationNode, MediaElementAudioSourceNode
hook order                   at install: cmes native, connect native; harness still outermost: cmes true, connect true
element                      #3 via createElement, src blob, in DOM false, readyState 4, t 2.98
element.playbackRate         1 (sets: 1, 1) preservesPitch true
crossorigin                  anonymous
mediaKeys                    null
RMS at destination, 2 s      mean 0.0695 (-23.2 dBFS), min 0.02, max 0.2058, 0/37 windows silent, ctx running
kari scripts in test build   none (hook not built)
kari dock                    not mounted
kari isolated world          none
[kari] lines                 none
verdict                      SoundCloud graph present, Kari not attached
```

Expected "SoundCloud graph present, Kari not attached", and that is what it says. Read live in this run, closing items
the static read left UNVERIFIED: the graph is on in desktop Chromium (`fadeSupportEnabled` true: one context, one
source node, three gains in series to the destination, which is the static read's pausePlay → seek → glitchCoverup);
the playing element came from `document.createElement`, plays a `blob:` URL (MSE; which of SoundCloud's two MSE
players is still open), and is not in the DOM; SoundCloud set `crossorigin="anonymous"` and `playbackRate = 1` twice
before play. In the `--json` run SoundCloud made 6 media elements on this page (1 video, 5 audio, 1 playing). Seven runs that
played, late 10-14 to 00:08 PT 10-15, gave −22.5 to −23.2 dBFS with no silent window. The `--kari` isolated-world reader was also checked once
against a scratch build that registered today's `content.js` as `soundcloud.js`: it found the world and reported
"__kari present, audio not created" (that script only attaches on YouTube). The dock and `[kari]` line readers have
not seen a positive case yet; the hook's first run is their test.

## SoundCloud grant (`sc-grant.mjs`)

How Kari gets onto soundcloud.com, on the **production** build, and the two orders that used to leave a blank page:
a tab opened before the grant, and Kari arriving after SoundCloud built its graph. Written 2026-10-15 after the
first live load showed nothing on SoundCloud (the permission had never been granted; `docs/LIVE-PROBE.md`,
"If nothing appears on SoundCloud").

```
npm run build
node tools/probe/sc-grant.mjs [--track https://soundcloud.com/lofilion/cave] [--headed] [--json] [--verbose]
```

Phase A loads `extension/` as shipped (soundcloud.com optional, nothing static) in a fresh headless Chromium:
install state and Chrome's own error list for the extension, the options page by direct URL and by
`openOptionsPage`, what a mistyped id looks like (`ERR_BLOCKED_BY_CLIENT`), the toolbar action's logic
(`__kari.soundcloud.activate` on the service-worker global — the request is reached and refused for want of a
gesture), a SoundCloud tab before any grant, and YouTube (pitch +1 → R3, no wasm error). Phase B copies the build with
`https://soundcloud.com/*` moved into `host_permissions` — the state right after a user's Allow — and still no static
scripts, so `src/background/soundcloud.ts` runs exactly as shipped: install registers both scripts; a fresh tab
attaches on route 0; a tab open and **playing** before the grant gets the scripts injected on the icon's path and
the dock says "reload this page"; a tab open and **idle** before the grant gets injected and the dock is up at
once, but SoundCloud builds its graph at hydration (one `createMediaElementSource` 6.5 s after load, before any
click, measured 2026-10-15), so on play the same notice shows — only a tab that has not hydrated yet attaches
without a reload; the second click answers "present" (ping), nothing injected twice.

What automation cannot do is click Chrome's permission bubble: rows H1–H3 (the Allow via icon or switch, the revoke,
the grant arriving while the worker is asleep) are printed as checks for a human, not counted.
`chrome.developerPrivate.addHostPermission` was tried as a proxy: it returns ok and grants nothing for an optional
host. Pre-seeding `granted_permissions` in the profile's Secure Preferences is reset by Chrome's pref-hash check,
and `--load-extension` re-installs on every launch anyway. Exit `0` every automated row passed · `1` a row failed ·
`2` setup failed.

### Beat loops (`--loop`), v2

Everything a user would do, done to the dock's own buttons inside its open shadow root; the answers come from three
independent places: the dock's readouts, `__kari.status` in the isolated world (the hook's status, sanitized by
`sanitizeStatus`) and the harness's analyser at the destination. Steps (v2, 2026-10-15): Full control OFF (the loop row
sits under the steppers now) · read the row: shown, four pills disabled before a tempo · watch the tempo readout leave
`learning…` on its own (the in-house detector; up to 14 s) and record what it said · click Tap five times 500 ms apart
(a tap overrides the detector; wait for `gridSource: "tap"`) · click `1 bar` and wait for `1 bar · … ms` · read
`__kari.status`, 2 s of RMS at the destination and the element clock across it (slip: the track underneath must keep
moving, nothing is seeked) · click the lit `1 bar` again (there is no ×) and wait for `loop —` · 2 s of RMS again.
Pass = status `loop 4` with a positive `loopMs`, a bpm from `tap`, `attached`, Full control off, the `1 bar` pill
pressed, no silent RMS window while looping or after the release, the clock advanced, and `loop 0` with the pill unlit
after the second click. The auto-tempo row is reported, not gated (a track with no beat is allowed to say `tap`).

### Run: 2026-10-15 ~02:00 PT, loops v2 (branch claude/loops-v2-a3a0ea), Chromium 153 headless, MacBook Air M4

Same track (LOFI LION, "Cave", CC BY). `node tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --loop`, exit 0, twice.

```
loop: dock rows                Full control off, loop row shown, pills disabled before a tempo [true,true,true,true], MIDI group shown
loop: auto tempo               readout "learning…" → "70 bpm" after 1775 ms; status bpm 69.95, grid auto, learning false, attached true
loop: tap                      5 taps 500 ms apart → readout "118.8 bpm"
loop: 1-bar latch              dock "1 bar · 2019 ms" 4 ms after the click, 1 bar pill pressed true
loop: __kari.status            loop 4, loopMs 2019, bpm 118.85, grid tap, engine r3, attached true, route 0
loop: RMS at destination, 2 s  mean 0.0718 (-22.9 dBFS), min 0.036, max 0.2123, 0/38 windows silent
loop: slip                     element clock 9.282 → 11.336 s while looping (kept moving)
loop: release (2nd click)      dock "—", status loop 0, loopMs 0, pill unlit
loop: RMS after release, 2 s   mean 0.0906 (-20.9 dBFS), min 0.0504, max 0.2045, 0/39 windows silent
verdict                        SoundCloud graph present, Kari attached, 1-bar loop latched and released
```

Read from the run: the chain attached on `playing` (v2: Kari is in the chain from play, a straight wire, so the
detector hears the first beat); the detector called "Cave" 70 bpm on its own before anyone tapped; the taps overrode
it (`grid tap`); a 1-bar latch at 118.8 bpm is 2019 ms and showed 4 ms after the click; the second click on the lit
pill released it. The v1 run below is kept for the ¼ numbers.

### Run: 2026-10-15 00:5x PT, v1 loops (branch claude/infallible-tharp-1c2f4a), Chromium 153 headless, MacBook Air M4 — superseded by v2 above (¼ and × no longer exist)

Same track as above (LOFI LION, "Cave", CC BY). `node tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --loop`, exit 0.

```
track                          https://soundcloud.com/lofilion/cave
play started                   yes, 12423 ms after load (clicked .sc-button-play.playButton ×2)
AudioContext                   running 44100 Hz base 5.8 ms out 24 ms (1)
MediaElementAudioSourceNode    1 created (first at 11417 ms)
gain chain                     MediaElementSource → Gain → Gain → Gain → Gain → destination
node types                     GainNode, AudioDestinationNode, MediaElementAudioSourceNode
hook order                     at install: cmes native, connect native; harness still outermost: cmes false, connect false
element                        #3 via createElement, src blob, in DOM false, readyState 4, t 2.93
element.playbackRate           1 (sets: 1, 1, 1) preservesPitch false
crossorigin                    anonymous
mediaKeys                      null
RMS at destination, 2 s        mean 0.0676 (-23.4 dBFS), min 0.019, max 0.2076, 0/37 windows silent, ctx running
kari scripts in test build     sc-hook.js, sc-bridge.js
kari dock                      engine wire, a/v 0 ms, in div.playControls, build 0.1.1+fcf2180a
kari isolated world            __kari.status {"attached":false,"engine":"bypass",…,"loop":0,"loopMs":0,"bpm":null,"gridSource":null,"route":0,"ctxState":"running"}, ctx running
loop: dock rows                loop row shown, MIDI group shown
loop: tap                      5 taps 500 ms apart → readout "119 bpm"
loop: ¼ latch                  dock "¼ · 126 ms" 8 ms after the click, ¼ pill pressed true
loop: __kari.status            loop 0.25, loopMs 126, bpm 118.98246198510341, grid tap, engine bypass, attached true, route 0
loop: RMS at destination, 2 s  mean 0.2159 (-13.3 dBFS), min 0.0206, max 0.3057, 0/37 windows silent
loop: slip                     element clock 7.523 → 9.526 s while looping (kept moving)
loop: graph                    1 worklet node(s): MediaElementSource → {Gain → Analyser → Gain → Gain → Gain → Gain → destination | Delay → Gain → Analyser → Gain → Gain → Gain → Gain → destination | AudioWorklet → Gain → DynamicsCompressor → Gain → Analyser → Gain → Gain → Gain → Gain → destination}
loop: × release                dock "—", status loop 0, loopMs 0
loop: RMS after release, 2 s   mean 0.1078 (-19.3 dBFS), min 0.0364, max 0.3219, 0/37 windows silent
verdict                        SoundCloud graph present, Kari attached, ¼ loop latched and released
```

Read from the run: the loop row and the MIDI group render on SoundCloud; the first tap attached the chain (the worklet
node and Kari's three branches appear in the graph, SoundCloud's four gains downstream, exactly the route 0 shape);
the ¼ latch at 119 bpm is 126 ms and the dock showed it 8 ms after the click (one status round trip over
`window.postMessage`); the element clock kept moving under the loop (slip, no seek); × went back to the live track.
The RMS while looping (−13 dBFS) is above the intro (−23) and the post-release stretch (−19) because the latched slice
holds a beat hit that repeats every 126 ms: the peaks match (0.31 vs 0.32), which a doubled dry+wet path would not.
Two identical runs (00:4x and 00:5x PT), both exit 0. Nothing here was heard; the seam and the grid alignment on
SoundCloud are UNVERIFIED by ear (docs/BEAT-LOOPS-2026-10-15.md).

