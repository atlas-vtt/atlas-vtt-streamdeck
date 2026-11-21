# Atlas VTT Sound for Stream Deck

Control the music and ambience of [Atlas VTT](https://atlas-vtt.dev) from an Elgato Stream Deck: press your moods, stop and bring back, pause, skip, shuffle, repeat, mute, and turn levels on keys or on the dials of a Stream Deck +. Each mood key shows the mood's crest in its colour and lights up while that mood plays; Atlas pushes every change, so the keys follow whatever you press on the Sound page, the palette or the scene that changes the mood.

## Actions

| Action | Key | Dial (Stream Deck +) |
| --- | --- | --- |
| **Play mood** | Plays the mood you pick from the list Atlas sends. Shows its crest, colour and name; lit while it plays. | |
| **Next mood** | Plays the mood after the one that plays; shows which one comes next. | |
| **Stop all** | Stops all music and ambience; lit while stopped, and a second press brings everything back. | |
| **Play / pause music** | Pauses the music where it is (the ambience plays on) and goes on from there. Shows the track. | |
| **Next track**, **Previous track** | Skip through the music's list. | |
| **Shuffle**, **Repeat**, **Mute music** | Switch them; lit while on. Repeat goes all → one → off. | |
| **Volume** | Moves a level by its step (±1, 2 or 5 dB, or back to 0 dB): Master, Music, Ambience (this computer's levels), or the music in the mix (which online players hear too). | Turn to change the level, push or tap the strip for 0 dB; the strip shows the level and a bar. |

Keys go dim with a plug in the corner while Atlas is not running, and with a key in the corner while the plugin is not paired.

## What you need

- Atlas VTT with Stream Deck support, in the Obsidian desktop app.
- In Obsidian: **Settings → Atlas VTT → Stream Deck → Control sound from a Stream Deck** switched on.
- Stream Deck 7.1 or later (macOS 13+, Windows 10+), or OpenDeck 2.14 or later with Node.js 20 or later on Linux.

## Install

### Elgato Stream Deck app (macOS, Windows)

1. Download `dev.atlas-vtt.sound.streamDeckPlugin` from the [latest release](https://github.com/atlas-vtt/atlas-vtt-streamdeck/releases/latest) (or press **Get the plugin** in **Settings → Atlas VTT → Stream Deck**) and double-click it. Stream Deck asks to install it.
2. Drag **Play mood** (category **Atlas VTT Sound**) onto a key.
3. In the key's settings, press **Pair with Atlas**, switch to Obsidian and press **Allow** in the prompt.
4. Pick a mood. Every other key works as soon as the plugin is paired once.

### OpenDeck (Linux)

Elgato's app does not run on Linux; [OpenDeck](https://github.com/nekename/OpenDeck) runs Stream Deck plugins there.

1. Install OpenDeck and Node.js. On Arch: `sudo pacman -S opendeck nodejs`. Other distributions: the [OpenDeck install script or packages](https://github.com/nekename/OpenDeck#linux). A Flatpak OpenDeck needs Node.js installed natively, not as a Flatpak.
2. Let your user reach the Stream Deck (udev rules; packages from `.deb`/`.rpm` do this for you):
   ```sh
   curl -LO https://raw.githubusercontent.com/OpenActionAPI/rust-elgato-streamdeck/main/40-streamdeck.rules
   sudo cp 40-streamdeck.rules /etc/udev/rules.d/
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```
   Then plug the Stream Deck in again (or restart).
3. Download `dev.atlas-vtt.sound.streamDeckPlugin` from the [latest release](https://github.com/atlas-vtt/atlas-vtt-streamdeck/releases/latest). Start OpenDeck, open **Plugins**, press the install-from-file button (arrow on a file) and pick it.
4. Drag **Play mood** onto a key, click it, press **Pair with Atlas** and allow it in Obsidian.

The plugin's log is in `~/.local/share/opendeck/logs/plugins/dev.atlas-vtt.sound.log`.

## Privacy and security

The plugin talks only to Atlas on the same computer (`127.0.0.1`, port 47823) and to the Stream Deck app. Atlas refuses requests from web pages and from other host names, and does nothing for the plugin until you allow it in Obsidian. The key Atlas gives on pairing is kept in the plugin's settings on this computer; **Revoke** in Atlas' settings cancels it, and the keys then show that the plugin needs pairing again.

## Development

```sh
npm install
npm run build      # bundles src/ into dev.atlas-vtt.sound.sdPlugin/bin/plugin.js
npm test           # unit tests and an end-to-end test of the built plugin under a stand-in Stream Deck and Atlas
npm run typecheck
npm run validate   # Elgato's manifest checks
npm run pack       # dist/dev.atlas-vtt.sound.streamDeckPlugin
node scripts/icons.ts   # rewrites the manifest's images after a glyph or key look changed
```

With the Elgato app, `npm run link` links the plugin folder and `npm run watch` rebuilds on save. With OpenDeck, symlink `dev.atlas-vtt.sound.sdPlugin` into `~/.config/opendeck/plugins/` and restart OpenDeck.

The protocol is Atlas' sound remote, version 1: its source is `src/app/soundRemote/remoteProtocol.ts` in the Atlas repository, mirrored in `src/atlas/protocol.ts` here.

## Licence

Copyright (C) 2026 Fabian Urbanek.

Atlas VTT Sound is free software: you can redistribute it and/or modify it under the terms of the [GNU Affero General Public License, version 3](LICENSE) (`AGPL-3.0-only`), the same licence as [Atlas VTT](https://github.com/atlas-vtt/atlas-vtt). It is distributed in the hope that it will be useful, but without any warranty; see the licence for details. Bundled third-party code and art keep their own licences, listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
