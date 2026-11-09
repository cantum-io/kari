# Kari — privacy policy

**Last updated: 2026-11-09**

Kari collects no data.

- **No accounts.** There is nothing to sign up for or sign in to.
- **No data leaves your browser.** Kari makes no network requests of its own. It never contacts Cantum, YGG HOMME, or any third party. There is no analytics, telemetry, crash reporting, or advertising.
- **Audio stays on your machine.** Pitch, speed, loops and the tempo reading are processed inside the browser tab in real time. Nothing is uploaded.
- **What is stored, and where.** Kari stores two things, both with Chrome's extension storage and nowhere else:
  - **Preferences** (interface, Kari's look, default range, engine choice, MIDI pads, the sites where you hid her) are saved in `chrome.storage.sync`. If you are signed into Chrome with sync turned on, Chrome may sync them across your own devices through your Google account — that is Chrome's sync, governed by Google's privacy policy, not a Kari server.
  - **Per-video and per-track pitch and speed**, if you leave "Remember settings per video" on, are saved keyed by the YouTube video id or the SoundCloud track address in `chrome.storage.local`. That stays on this device: it is never synced and never sent anywhere.
  Turn "Remember settings per video" off in Kari's options to stop it; uninstalling the extension removes all of it.
- **Permissions.** `storage` (the preferences above). Access to `www.youtube.com` pages (to find the video element and draw the controls on the player). Access to `soundcloud.com` only if you allow it: Chrome asks once, when you click Kari's icon on a SoundCloud tab, and the switch in Kari's options turns it off again. `scripting` registers Kari's SoundCloud scripts once you have allowed soundcloud.com, so she starts there without a reload; `activeTab` lets her see that the tab you clicked is a SoundCloud tab. Every script is in the package; nothing is loaded from the network. Nothing else.
- **MIDI.** Only if you press Connect MIDI on Kari's dock: she then asks the browser for Web MIDI, and Chrome asks you before any MIDI device is used (never for sysex). She reads pad presses only, to work the loops and tap tempo, and sends nothing to the device. Until you press it, Kari does not ask for MIDI at all; the pad map you learn is one of the preferences above.
- **Limited Use.** Kari's use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
- **Open source.** The full source is at https://github.com/cantum-io/kari under the GPL-2.0, so all of the above can be checked.

Questions: info@cantum.io. Security reports: info@cantum.io (see `SECURITY.md`).

Kari is made by YGG HOMME · powered by Cantum (Cantum LLC, cantum.io). YouTube is a trademark of Google LLC; SoundCloud is a trademark of SoundCloud Global Limited & Co. KG. Kari is not affiliated with or endorsed by YouTube, Google or SoundCloud.
