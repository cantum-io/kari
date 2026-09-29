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
