# Contributing to Mimi

Mimi is free software under the GPL-2.0-only licence (see `LICENSE`). By contributing you agree your work is released under the same licence.

## Developer Certificate of Origin

Every commit must carry a `Signed-off-by:` line certifying the [Developer Certificate of Origin 1.1](https://developercertificate.org/):

```
git commit -s
```

Commits without a sign-off are not merged.

## Build and test

```
npm install
npm run build        # → extension/
npm test             # node --test: one-pass math + the shipped worklet in a simulated AudioWorkletGlobalScope
```

Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → `extension/`.

## Ground rules

- **The one-pass rule is settled.** Speed rides the `<video>` element (`playbackRate`, `preservesPitch=false`); one engine applies only a pitch ratio. Never two lossy passes. Never SoundTouch or delay-line shifters.
- **Silence is never acceptable.** Any engine failure falls back to a straight wire.
- **Hook only the `<video>` and `#movie_player`.** Never YouTube's control-bar class names.
- **Permissions stay at `storage` + the youtube.com host.** No remote code, no telemetry, no accounts.
- **Free, no paid tier, no gating.**
- **Motion is transform/opacity only** and honours `prefers-reduced-motion`.

## Pull requests

1. One change per PR, small.
2. `npm run build && npm test` green; CI runs the same.
3. Anything only Chrome can verify (audio, CSP, player behaviour) goes through `docs/LIVE-PROBE.md`: state what you ran and what you measured. Label anything unmeasured `UNVERIFIED`.
4. Verify claims by a path independent of the code that made them (a test, a console reading, a measured number).

## Reporting bugs

Open an issue with the video URL, what you set (pitch, speed, key lock), what you heard, and the engine + a/v readout from Full control.
