# Security policy

Kari runs entirely inside your browser, on youtube.com watch pages and, once you allow it, on soundcloud.com. It collects no data, makes no network requests of its own, and asks for `storage`, `scripting`, `activeTab` and the youtube.com host permission, plus `https://soundcloud.com/*` as an optional host permission that you grant yourself.

## Reporting a vulnerability

Email **info@cantum.io**. Please include the extension version, Chrome version, steps to reproduce, and impact. Do not open a public issue for security reports.

You will get an acknowledgement within 3 business days. Fixes ship as a new Chrome Web Store release; credit is given in the release notes unless you ask otherwise.

## Scope

- The extension bundle in `extension/` (content script, worklet, service worker, options page)
- The build pipeline in `scripts/`

Out of scope: YouTube itself, Chrome itself, and the upstream audio libraries (report those to [Rubber Band](https://breakfastquay.com/rubberband/) or [Signalsmith](https://signalsmith-audio.co.uk/code/stretch/) directly, and tell us so we can update).
