# Kari 0.12.0 (2026-11-26)

0.11.0 plus one fix: the panel no longer changes height when its readings change. Jesse reported it on SoundCloud from
the store build: the amber a/v figure came and went, the panel jumped, and he could not land on the control he was
aiming at.

## The defect

- The status line at the bottom of Full control (`key / engine / a/v / loop`) was a wrapping flex row. A longer reading
  ("2081 ms" on a slow output device, a latched loop's length, "at the ring's ceiling") needed another row.
- The loop row wrapped its four pills by text width, and its tempo readout left the layout when it was empty.
- On SoundCloud the panel hangs from its bottom edge (`bottom:10px`), so every added row pushed the controls above it
  upward. On YouTube it hangs from the top, so only the rows below moved.
- The mono font is not shipped, so the wrap points differed from one machine to the next.

Measured on the 0.11.0 source with the new probe rows (headless Chromium, 12 statuses): Full control on, the panel was
370.3 px, 352.6 px with no detector, 384 px with a latched loop on a slow device and 395.7 px at the ring's ceiling. On
the SoundCloud layout its top edge moved between 314 and 357 px.

## The fix

| Change | What |
|---|---|
| Status line | A two-column grid; every cell is one line and clips with an ellipsis (the full text is the cell's tooltip). |
| Loop row | Four columns sized to their labels, the tempo readout on its own line that is kept when it is empty. |
| SoundCloud | The a/v cell is hidden (no picture); the loop reading takes the second line. |
| Engine reading | Amber only when the key change was dropped (`worklet-failed`, `busy`). |
| a/v figure | Redrawn only when it has moved by more than 20 ms; amber above 125 ms as before, never while detached. |

Not done: shipping the mono font. The layout no longer depends on text width, so the font no longer decides the height.

Not established: why Jesse's reading was 2081 ms. The figure is the output device's reported delay plus the engine's;
about two seconds points at AirPlay or Bluetooth output, and one live reading on his setup would settle it.

## Gates

`npm run build` byte-identical to the committed `extension/`; `tsc --noEmit` 0; `npm test`; `dock.mjs` 44 rows (the
ten new ones cover height, top edge, the a/v cell, the engine color and pill clipping; the height, a/v and engine rows
fail on the 0.11.0 source and hold on this one); `record.mjs`; `hide.mjs` and `record-sc.mjs` on the
SoundCloud test build; the `KARI_RECORD=0` string check. Not run: a live SoundCloud session in a real Chrome.

## Store

One upload replaces 0.11.0: the release asset zip and `docs/STORE-LISTING.md` (header only; the listing text is unchanged).
