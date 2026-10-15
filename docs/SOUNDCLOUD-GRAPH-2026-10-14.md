# SoundCloud's Web Audio graph — static read of the live bundle (2026-10-14)

Read on 2026-10-14 23:36–23:50 PT from `https://soundcloud.com/discover` with a plain download
(no browser, nothing executed). Facts only: names, call order, node types, byte offsets.
No SoundCloud code is in this repo; the downloaded chunks live in `tools/soundcloud-guard/cache/`
(gitignored) and are untrusted data. Anything not seen in the bytes is marked UNVERIFIED.

## Verdict

**Route 0 holds.** SoundCloud still calls `createMediaElementSource` as a dynamic prototype lookup
on its one `AudioContext` and wires the result with a plain `connect` into its own gain chain. A
MAIN-world `document_start` patch of `AudioContext.prototype.createMediaElementSource` and
`AudioNode.prototype.connect` sits exactly on that path. One correction to the research doc: the
element is `document.createElement("audio")`, never `new Audio()`, so any element hook (route 1)
must patch `createElement`, not `window.Audio`.

**Route 2 (dummy element) is a fallback, not a peer.** It works for audio but hands SoundCloud's
pause/seek fades and its 100 ms first-attach mute to a silent element, so every pause, play and
seek would click on the real one. Keep it behind route 0.

**Breakage check built:** `npm run check:soundcloud` (`tools/soundcloud-guard/`), 17 probes, exits 1
when a hooked call moves or vanishes. Baseline recorded for chunk `55-313c5966.js`.

## Source identity

| Item | Value |
|---|---|
| Page | `https://soundcloud.com/discover`, HTTP 200, headers `x-frame-options: SAMEORIGIN`, **no Content-Security-Policy** (third read; matches 10-14 research) |
| Scripts listed in the page | 8: `0-d4276671`, `1-8a7baab3`, `2-6d1224c7`, `55-313c5966`, `56-0455fbd6`, `57-f301081c`, `58-ccf1b1a8`, `59-ac0a49ce` (all `a-v2.sndcdn.com/assets/*.js`) |
| Chunk that builds the audio graph | **only `55-313c5966.js`**, 2,910,970 bytes, sha256 `f55e13a645505ed67f58d30742b760cce948dd5c59de51de2bacf27e717fb90c`. Same file name the 10-14 research read, so the graph below is the one Jesse saw live. |
| Keyword counts in chunk 55 | `createMediaElementSource` 6 · `AudioContext` 13 · `createGain` 3 · `MediaSource` 41 · `SourceBuffer` 51 · `playbackRate` 11 · `mediaKeys` 24 · `preservesPitch` 0 · `new Audio(` 0 · `AudioWorklet`/`ScriptProcessor`/`createMediaStreamSource`/`createBufferSource` 0 |
| Other chunks | no Web Audio calls at all (one `encrypted` string in chunk 0, `audio/mp4` strings in 56, one `SourceBuffer` in 57) |
| Vendor versions seen | SoundCloud player core `32.0.0` build 2285 · player packages `25.0.0` build 1274 · hls.js `1.5.13` (@973581) · react-dom 16.14.0 · statsig 3.14.1 · airbrake-js 2.1.8 |
| REA evidence | full chunk: `ev_ef36de95abcfd10883fc62ac571765234fa0aeeb0dcac44237a571e56daf1b89` (parsed, 632,374 AST nodes, 701 findings; the semantic pass **exhausted a 3 GB heap**, so relations are partial). Player module slice (bytes 481651–517639) + hls.js subclass slice: `ev_54dcea4241558383ddc245b29295a979bbcd25106626324970e7812008daba8d` (semantic graph complete: 5,557 data-flow, 757 object-flow, 145 call relations). Guard baseline evidence: `ev_1d958e2fa1016db742f2f264264ba551d0736b700dc45df7df293d1403051398`. Exported bundle: scratchpad `rea-evidence-2026-10-14.json` (13 MB, 9 records; contains SoundCloud text, so it stays out of the repo). |

Byte offsets below are into `55-313c5966.js` as downloaded; `@n` = byte n. They are the probe
anchors the guard re-finds.

## The graph SoundCloud builds

```
MediaElementManager                       (module @338825–344182)
  element = document.createElement("audio")   @342447   one element, reused across players; a new one only on the "recreate" flag
  h = new WebAudioContext (module-level, shared)

WebAudioContext                            (@487698–488200)
  S(): E ??= { context: new window.AudioContext, suspender: new Suspender(context) }   @487698   lazy singleton
        throws if !context.destination.maxChannelCount
  getAudioContextWithSuspender() = enabled ? S() : null                                 @487862
  activate(): context.resume() with a 5 s timeout                                       @488093
  Suspender: _scheduleSuspend → setTimeout → context.suspend() when no watched player plays  @487227

HTML5PlayerBase constructor                 (@488852–490300)
  _shouldCoverGlitch = true
  _webAudioOrchestration = fadeSupportEnabled ? _initWebAudio() : null                  @490125
  _fadeManagers = { pausePlay: FadeManager(ctx, gains.pausePlay), seek: FadeManager(ctx, gains.seek) }   @490212

_initWebAudio()                             (@514713–515055)
  n = ctx.createGain()   // pausePlay
  i = ctx.createGain()   // seek
  o = ctx.createGain()   // glitchCoverup
  n.connect(i); i.connect(o); o.connect(ctx.destination)
  → { context, suspender, gainNodes: { glitchCoverup: o, pausePlay: n, seek: i } }

_initMediaElementLocal(el, attachSrc)       (@511900–512440)
  abort any in-flight seek
  if attachSrc:
    if orchestration: el.setAttribute("crossorigin","anonymous")                         @512011
    el.src = _getUrlForMediaElement(); el.volume = …; el.muted = …
    _createMediaElementSource(el)                                                        @512195
  el.playbackRate = 1                                                                    @512224   ← rate reset on every (re)init
  el.preload = "metadata"; pause; el.load()

_createMediaElementSource(el)               (@508752–509400)   ← THE HOOK POINT
  guard: orchestration && fadeManagers (else: no graph, no call)
  t = U.get(el)                     // U = module-level SCWeakMap @488726, one source per element
  if !t: t = orchestration.context.createMediaElementSource(el); U.set(el, t)           @509009   ← patched call 1
  orchestration.mediaElementSource = t
  t.connect(orchestration.gainNodes.pausePlay)                                          @509108   ← patched call 2 (99 bytes later)
  if _shouldCoverGlitch: glitchCoverup.gain.setValueAtTime(0, now); setValueAtTime(1, now + 0.1)   @509363   100 ms mute, once per player
  disconnect path: mediaElementSource.disconnect(gains.pausePlay)                       @511693
  kill path: glitchCoverup.disconnect(ctx.destination)                                  @506336

FadeManager.performFade(rate, done)         (@483332–484000)
  rate = ±Infinity → cancelScheduledValues(now); setValueAtTime(1|0, now)               @483555
  finite → compute current value c; setValueAtTime(c, now); linearRampToValueAtTime(target, now + d)   @483916–483975
  _completeCurrentFade(): pausePlay.performFade(isPlaying ? +∞ : −∞)                    @~509430

Streaming players (all extend HTML5PlayerBase, both `}(x.HTML5PlayerBase)` @953439 and @1378543)
  HLSMSEPlayer (SoundCloud's own MSE, module @922823–~955000): no override of _createMediaElementSource;
    MediaSource created @925182, el.src = URL.createObjectURL(mediaSource) @925439
  HLSJSPlayer (hls.js subclass @1375175–1378543):
    _initMediaElement(el, attachSrc): _detach(); if DRM: _waitingForKeySession = isFirefox;   @1377852
                                      super._initMediaElement(el, attachSrc);                 (source node created here)
                                      if attachSrc: _hls.attachMedia(el)                      @1377931   ← HLS/MSE attach point, AFTER the source node
    _createMediaElementSource(el): if !_waitingForKeySession: super(el)                       @1378066
    _keySessionStarted(): _createMediaElementSource(_hls.media)   (Firefox DRM only)          @1378196
    _getUrlForMediaElement() → ""                                                              @1377748
  HTML5Player (progressive mp3/http): plain src, same base path.
```

Element events SoundCloud listens to on the element it owns: `play`, `playing`, `pause`,
`ended` (`_addPausedHandlers` @512439), `seeking` (@497631), `seeked` with a retry loop that
nudges the seek by 0.001 s until within 100 ms (@505044), plus a stall-check interval. The
element never enters the DOM (consistent with the 10-14 live DOM check; not provable statically →
UNVERIFIED by this read).

## What this means for route 0

| Assumption in the route 0 design | Current bundle | Probe |
|---|---|---|
| The call is a prototype lookup on a real `AudioContext`, not a saved native reference | `orchestration.context.createMediaElementSource(el)` @509009, looked up each time | `source-call` = 1 |
| `connect` on the source node is a prototype call | `t.connect(gains.pausePlay)` @509108 | `source-connect` = 1, `source-then-connect` gap 99 B |
| Only one context, one source per element | singleton @487698; `SCWeakMap` cache @488726 → SoundCloud never calls the native twice for one element. Kari's wrapper must likewise return the same node per element and must never call the native itself. | `one-context` = 1 |
| SoundCloud's fades stay downstream of Kari | gain chain pausePlay → seek → glitchCoverup → destination; Kari's output replaces `source` at the `connect(pausePlay)` edge | `gain-chain`, `gain-names` |
| The 100 ms first-attach mute | lives on glitchCoverup, downstream; harmless | — |
| CORS | SoundCloud sets `crossorigin=anonymous` itself when the graph exists @512011; HLS/MSE src is a blob URL anyway | `crossorigin` = 1 |
| Rate guard still needed | `el.playbackRate = 1` on every (re)init @512224; `preservesPitch` untouched | `rate-reset`, `no-preserves-pitch` |
| DRM timing | On Chrome `_waitingForKeySession` is `false` (it is literally `isFirefox()` @1375237), so the source node is created before the key session even on Go+ tracks. Whether a Widevine track is audible or silent through the node stays **UNVERIFIED**. | `drm-wait-guard` = 1 |
| Both streaming players go through one hook | both extend `HTML5PlayerBase`; which one desktop Chrome picks is decided by a controller list iterated via `isRenditionSupported` @170609, order not resolved statically → UNVERIFIED, and irrelevant to route 0 | `players-extend-base` = 2 |

**Only thing that switches the graph off:** `fadeSupportEnabled` (= `fadeOnPauseAndPlay ||
fadeOnSeek`, passed by the controllers @342345 and @569384). It is runtime config. If SoundCloud
ever ships it `false`, no `AudioContext`, no source node, no call for the patch to see. The hook
must detect "no source call within ~1.5 s of `playing`" and fall back to route 1 (create its own
source on the element captured through a `document.createElement` hook). The 10-14 live read
observed the graph with gains, so it is on today.

## What would break route 0 (and what the guard watches)

1. SoundCloud saving the native `createMediaElementSource` or `connect` before page scripts run
   (not possible: `document_start` MAIN world precedes every page script; a saved reference inside
   the bundle would show as a changed `source-call` pattern).
2. Moving to `AudioWorklet`, `ScriptProcessor`, `createMediaStreamSource` or `createBufferSource`
   (`no-other-source-kinds` = 0 today).
3. A second `AudioContext` or `OfflineAudioContext` (`one-context`).
4. The source and connect calls drifting into separate functions or the connect target changing
   from `pausePlay` (`source-connect`, `source-then-connect`).
5. The gain chain changing shape (`gain-chain`, `gain-names`).
6. `fadeSupportEnabled` turned off: invisible to a static probe. Runtime detector in the hook.
7. Route 1 only: element made with `new Audio()` instead of `createElement` (`element-create`,
   `no-new-audio`).

## Route 2 (dummy element) under this graph

Give SoundCloud's `createMediaElementSource` call a throwaway `<audio>` and take the real element
ourselves. Audio works: the real element plays, Kari sources it. Costs seen in the bytes:
SoundCloud's `pausePlay`/`seek` fades (@483916) and the 100 ms glitch mute (@509363) all act on the
dummy, so the real element starts, stops and seeks hard. SoundCloud's play/pause/seek/stall logic
listens on the element it owns (@497631, @505044, @512439), which is still the real one, so state
tracking is unaffected. Verdict: usable, audibly worse than route 0, keep as the second fallback
after route 1.

## The breakage check (`tools/soundcloud-guard/`)

- `npm run check:soundcloud`: download the page, list the 8 script tags, download every chunk,
  hash each, pick the one chunk containing `createMediaElementSource` (fails if not exactly one),
  run 16 count probes plus the ordering rule, compare the hash to `baseline.json`.
- Exit codes: `0` unchanged or changed-with-all-probes-holding (prints a loud WARN) · `1` a
  probe failed · `2` fetch/parse failure · `3` changed bundle under `--strict`.
- `--rea`: slices the webpack module that contains `_createMediaElementSource` (36 KB, the
  2.9 MB chunk exhausts REA's heap) into `cache/<hash>/slice/`, runs
  `rea analyze-javascript-application`, stores the evidence, and when the bundle changed and a
  baseline evidence exists runs `rea compare-application-versions` to print what REA sees as
  added/removed/changed. REA explains; the probes decide. REA runs under node@22 when present.
- `--update [--rea]`: accept the current bundle as the baseline (hashes, probe counts, offsets,
  evidence ids; never bytes). `--probe-file <path>`: run the probes offline on a local chunk.
- Proven today (each run read back by its exit code, 23:44–23:55 PT):
  - live bundle → `PASS bundle unchanged, all probes hold`, exit 0;
  - `--probe-file` on a copy with the source call renamed to `createMediaStreamSource` → three
    probes fail (`source-call`, `no-other-source-kinds`, `source-then-connect`), exit 1;
  - baseline hash tampered → `WARN BUNDLE CHANGED`, exit 0; with `--strict` exit 3;
  - REA compare of the real player-module slice against a mutated copy (source call renamed,
    `linearRamp` → `exponentialRamp`) → `{"unchanged":0,"added":0,"removed":0,"changed":2,"unknown":6}`,
    so the diff is module-coarse: it says *that* the module changed, the probes say *what*;
  - REA refuses to compare a record with itself (`Application version Evidence must be distinct`);
    the script reports that as "nothing to compare" instead of failing.
- Not scheduled. Jesse's ruling: manual script, run before any SoundCloud build ships and on
  any silence report.

## REA notes (what it did and did not do here)

- `analyze_web_bundle` needs a live Chrome debugging endpoint; it cannot fetch a URL. The
  download route was chosen (Jesse, 23:35 PT).
- On the full chunk REA parsed everything but its semantic worker ran out of a 3 GB heap; on the
  36 KB slice the semantic graph completed. Feature and property traces seeded on
  `createMediaElementSource` matched no graph entity in either case (minified member expressions
  are not what its seeds index), so the call-site facts above come from a byte-offset read of the
  downloaded chunk, which anyone can re-run with the guard. REA's value here is artifact identity,
  parse proof and version-to-version diffs of the module, not the graph map itself.
- Static analysis only. No Hopper, Ghidra or IDA.

## UNVERIFIED (needs the live probe, `docs/LIVE-PROBE.md` method)

- `fadeSupportEnabled` is true on desktop Chrome today (observed live 10-14, not in the bytes).
- Which streaming player desktop Chrome picks (own MSE vs hls.js).
- Go+/Widevine track: audible or silent through the source node.
- The element never enters the DOM (DOM check 10-14 said none; the bytes do not prove it).
- Worklet `addModule` from a `chrome-extension://` URL under SoundCloud's (absent) CSP, and the
  100 ms glitch mute interacting with Kari's first-attach crossfade.

## Next step

Build the hook with the facts above: patch the two prototypes at `document_start` in the MAIN
world, wrap once per element, never call the native yourself, redirect `connect` when the source
is one you wrapped, re-apply the rate after every `playbackRate = 1`, and arm the no-call → route 1
detector. Then run the live probe before any store update.
