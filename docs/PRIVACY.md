# Kari — privacy policy

**Last updated: 2026-11-03**

Kari collects no data.

- **No accounts.** There is nothing to sign up for or sign in to.
- **No data leaves your browser.** Kari makes no network requests of its own. It never contacts Cantum, YGG HOMME, or any third party. There is no analytics, telemetry, crash reporting, or advertising.
- **Audio stays on your machine.** Pitch and speed are processed inside the browser tab in real time. Nothing is recorded, uploaded, or stored.
- **What is stored, and where.** Kari stores two things, both with Chrome's extension storage and nowhere else:
  - **Preferences** (interface, Kari's look, default range, engine choice, the sites where you hid her) are saved in `chrome.storage.sync`. If you are signed into Chrome with sync turned on, Chrome may sync them across your own devices through your Google account — that is Chrome's sync, governed by Google's privacy policy, not a Kari server.
  - **Per-song pitch and speed**, if you leave "Remember settings per video" on, are saved keyed by the YouTube video id or the SoundCloud track link in `chrome.storage.local`. That stays on this device: it is never synced and never sent anywhere.

  Turn "Remember settings per video" off in Kari's options to stop per-video memory; uninstalling the extension removes all of it.
- **Permissions.** `storage` (the preferences above); access to `www.youtube.com` pages (to find the video element and draw the controls on the player); `soundcloud.com` only after you allow it from Kari's icon or her settings, with `scripting` and `activeTab` to start her on that tab. Nothing else.
- **Limited Use.** Kari's use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
- **Open source.** The full source is at https://github.com/cantum-io/kari under the GPL-2.0, so all of the above can be checked.

Questions: info@cantum.io. Security reports: security@cantum.io (see `SECURITY.md`).

Kari is made by YGG HOMME · powered by Cantum (Cantum LLC, cantum.io).
