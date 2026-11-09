# Kari 0.10.0 (2026-11-09)

0.9.0 plus #13: Kari on computers other than a Mac. The store dashboard shows most installs on an OS other than macOS, and
every Kari so far was built and gated on a Mac. A per-platform read of the code (PR #13's thread, two agents, every claim
from the source or a Google page) found two things that differ by operating system and one that the store could not say.

| Change | PR | What |
|---|---|---|
| Shortcuts per platform | #13 | `commands.suggested_key` gets a `mac` key (Alt+arrows, as before) and a `default` for Windows, Linux and ChromeOS (Alt+Shift+arrows). On those three, Alt+Left and Alt+Right are Chrome's back and forward keys and on ChromeOS Alt+Up and Alt+Down are page up and page down (Google's shortcut pages, read 2026-11-09), so the old defaults either took Chrome's keys or never fired. On a Mac back and forward are ⌘[ and ⌘], so Alt+arrows were free, which is why they always worked here. |
| Settings page shows the live keys | #13 | `options.ts` reads `chrome.commands.getAll()` and writes what Chrome has bound on this machine (platform default or the user's own choice); an unbound command reads "not set". The static line underneath names both defaults. |
| `minimum_chrome_version` 124 | #13 | The build targets Chrome 120 (esbuild) and the privacy policy's MIDI line (Chrome asks before a device is used) is true from Chrome 124. Without the field an older Chrome installs Kari and she fails silently; with it the store shows "not compatible" instead. |
| The panel stays inside a small player | #13 | A 1366×768 laptop at Windows' default 125 % scale gives YouTube a player about 619×348 CSS px; the Full-control panel (370 to 400 px) ran 69 px past its bottom with key, engine, a/v, Hide and the Full-control toggle cut off (measured in the audit). `dock.ts` reports the host's height to the root as `--host-h` through a ResizeObserver and `dock.css.ts` caps `.org .ctl` at 90 % of it with `overflow-y:auto` (YouTube only; SoundCloud's dock mounts on the page, not in a box). Measured on this branch: 619×348 → panel 17 to 331 px inside the 348 px box, scrolls 366 in 311; 1280×720 and 854×480 unchanged (337 px, no scroll). |
| A slow machine says so | #13 | The step-down ladder (`controller.ts`) reaches bypass after sustained load and dropped the key change with no line on the dock (only "engine: wire" under Full control). It now raises the fault `busy` ("this machine is busy — playing the song as it is; reload to try again"), so Kari naps and the readout says why; `protocol.ts` carries it to the SoundCloud bridge. The ladder still never steps back up: parked. |
| Version, docs | #13 | 0.10.0; the changelog line; the listing header and its requirements line. |

Platform audit, verdicts from the source (every line cited in the PR thread): shortcuts (fixed above), the panel at 125 % (fixed above), silent bypass (fixed above), no minimum Chrome (fixed above); Sev-3 left for later with a tripwire: the named fonts are not bundled (every OS renders its system fallbacks; store screenshots show the Mac's), Brave's audio farbling keeps the protected-audio watchdog from firing (Brave is not a supported browser), the take's two files trigger Chrome's one-time "download multiple files" prompt.

Checked and left alone: audio (AudioWorklet, WebAssembly, `AudioContext` at the device rate, 8000 to 384000 Hz accepted by
the WAV writer) has no platform branch; the take lands through `chrome.downloads`-free anchor downloads with a filename
sanitised to `[a-z0-9-]`, which every filesystem takes; the dock's type is `system-ui` and `monospace` fallbacks on every
OS (Instrument Sans and Space Mono are named but not bundled, and the Mac that built Kari does not have them either, read
2026-11-09); MIDI is Web MIDI on all four platforms (Linux through ALSA; a snap Chromium may not see devices). ChromeOS's
Alt+Shift+Up/Down may still be rewritten by the OS before Chrome sees them: UNVERIFIED on a real Chromebook; the settings
line and chrome://extensions/shortcuts are the remedy.

## Gates

Cloud: `npm run build` byte-identical to the committed `extension/`, `tsc --noEmit` 0, `npm test` 131/131, `dock.mjs`
and `record.mjs` (headless Chromium, fixture pages); CI on the PR runs the same plus `hide.mjs` and `record-sc.mjs`.
Not run: a Windows, Linux or ChromeOS machine (none in reach); the per-platform shortcut defaults are read from Google's
pages and the manifest schema, not pressed on those keyboards.

## Store

One upload replaces 0.7.0: `kari-0.10.0-store.zip` (the GitHub release asset) and `docs/STORE-LISTING.md` field by field.
