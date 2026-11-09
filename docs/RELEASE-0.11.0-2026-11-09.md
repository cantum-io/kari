# Kari 0.11.0 (2026-11-09)

0.10.0 plus #15: five new forms for Kari and a settings panel rebuilt around tabs. Jesse picked the forms from the
nine-design showcase (C2 Nebula, A3 Medusa, S1 Hex, S2 Chrome, S3 Hood) and asked for the settings menu and its nav to
hold the options better. 0.10.0 is tagged and public, so this is a new version, not a re-cut.

| Change | PR | What |
|---|---|---|
| Six forms | #15 | `forms.ts` draws Kari, Nebula (glass with a galaxy inside, crescent buns, an orbiting moon), Medusa (a jellyfish bell with swimming tentacles) and the three sisters Hex, Chrome and Hood on Kari's own 160×180 canvas, so every form is the same size on the player. Kari, Nebula and Medusa wear the colorway (blue, pink, black); the sisters keep their own palettes. The wardrobe (YGG cap, shades, sneakers) fits Kari and Nebula. Each form has its own idle loop and its own reaction when you change the sound. `Settings.form` is new and defaults to `kari`, so every existing install opens unchanged. |
| Settings as tabs | #15 | The gear opens four tabs, Kari · Interface · MIDI · Page, in place of one long list that ran past the panel's bottom. Kari holds the six form portraits (drawn in the colorway she wears now), color and wear; Interface holds the four looks as rows with a mark and one line each; MIDI holds Connect, Learn and the status; Page holds hide dock, hide on this site, More settings and the build. The tabs are ARIA tabs (arrow keys, Home, End; Escape closes and returns focus to the gear), the panes share one grid cell so the panel keeps one height and the tabs never move, and on a 348 px player the tab bar stays put while the pane scrolls. The panel is opaque (no blur), sans for options and mono only for data, and its text is 4.5:1 or better. |
| Settings page | #15 | `options.html` gets a form row in its Kari section; picking a form there brings the Kari interface back, as a color does. |
| Motion | #15 | Every loop and reaction sits inside `prefers-reduced-motion: no-preference`; with reduced motion the forms stand still and Medusa's SVG animation is paused. The settings thumbnails never animate. |
| Version, docs | #15 | 0.11.0; the changelog line; the listing header and one line on the forms; `PRODUCT.md`. |

`docs/playground.html` still shows the 0.10.0 dock; it is a design sandbox, not shipped.

## Gates

Cloud: `npm run build` twice, byte-identical, and equal to the committed `extension/`; `tsc --noEmit` 0; `npm test`;
`dock.mjs` and `record.mjs` (headless Chromium, fixture pages); `hide.mjs` and `record-sc.mjs` on the SoundCloud test
build (`hide.mjs` now opens the Page tab before it presses the hide button); a `KARI_RECORD=0` build carries no Rec
string. A render check of the real `Dock` at 1280×720 and 619×348 covers every tab, every form, the colorway and
wardrobe on Nebula, the orbit, the tab keys, Escape, and reduced motion. The YGG taste lint, the motion lint and
`impeccable detect` 4.5.2 ran on the dock's styles and markup. CI on the PR runs the build, tests and probes again.

## Store

One upload replaces 0.7.0: `kari-0.11.0-store.zip` (the GitHub release asset) and `docs/STORE-LISTING.md` field by field.
It carries 0.10.0's changes as well.
