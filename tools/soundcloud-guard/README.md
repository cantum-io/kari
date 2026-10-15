# SoundCloud graph guard

Dev-only check that SoundCloud's player bundle still makes the two calls Kari's SoundCloud
hook (route 0) patches: `AudioContext.prototype.createMediaElementSource` and
`AudioNode.prototype.connect`. Kari itself makes no network requests; this script does,
from your machine, when you run it.

```
npm run check:soundcloud            # hash + probes, ~2 s
npm run check:soundcloud -- --rea   # also REA analyze/compare on the 36 KB player module
npm run check:soundcloud -- --update [--rea]   # accept the current bundle as baseline
```

Exit codes: `0` ok · `1` a probe failed, the hook is at risk · `2` could not fetch or parse
the page · `3` bundle changed but probes hold (only with `--strict`).

What it records in `baseline.json`: the script list with hashes, the graph chunk's hash and
size, each probe's count and first byte offset, and REA evidence ids. No SoundCloud bytes.
Downloads land in `cache/` (gitignored) and are untrusted data.

When it fails: read `docs/SOUNDCLOUD-GRAPH-2026-10-14.md` for what each probe protects,
re-run with `--rea` to see what REA says changed in the player module, then re-verify the
hook live (`docs/LIVE-PROBE.md` method) before updating the baseline.

Run it before any SoundCloud build ships, and whenever a SoundCloud user reports silence.
