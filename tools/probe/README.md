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

## SoundCloud (`soundcloud.mjs`)

One command, one track, one table: what SoundCloud's own Web Audio graph is doing and whether Kari is in it. Built for
the SoundCloud hook (route 0, `docs/SOUNDCLOUD-GRAPH-2026-10-14.md`) so it can be checked headless before anyone
listens.

```
npm run build                                       # production extension/, unchanged by the switch below
KARI_TEST_HOSTS=soundcloud npm run build            # + test-build/soundcloud/ (gitignored)
node tools/probe/soundcloud.mjs https://soundcloud.com/lofilion/cave --kari
```

Flags: `--kari` reads Kari too · `--json` prints the report as JSON for assertions · `--verbose` logs clicks and page
warnings · `--headed` shows the window · `--ext <dir>` another build · `--settle <ms>` wait after play starts (2500).
Exit `0` played · `1` play never started within 20 s of the page load · `2` setup failed (no test build, no load).

**Why a test build.** Kari asks for SoundCloud as an optional permission, and automation cannot click Chrome's
permission prompt. `scripts/test-hosts.mjs` (run by `npm run build`, a no-op unless `KARI_TEST_HOSTS` is set) copies
`extension/` to `test-build/soundcloud/`, moves `https://soundcloud.com/*` into `host_permissions`, adds it to the
web-accessible resources, and registers the SoundCloud scripts statically: `soundcloud-main.js` (MAIN world,
`document_start`) and `soundcloud.js` (isolated, `document_start`) when they exist in `extension/`. Rename them in the
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
