# Castle Wolfenstein — Apple IIe Web Edition

A zero-build static HTML5 browser remake of Silas Warner's 1981 Apple IIe stealth-action classic **Castle Wolfenstein**, ready to host for free on GitHub Pages.

## Features

- **Authentic Apple IIe Hi-Res Mixed Mode (`280×192`)**: `280×160` crisp pixelated playfield + 4-line 40-column Apple II bitmap text status bar, with **Hi-Res Color**, **Green Phosphor**, and **Amber CRT** monitor modes + toggleable scanlines.
- **Classic Gameplay Mechanics**:
  - Procedurally generated 3-floor castle (27 interconnected rooms) with Dungeon, Barracks, High Command, War Room Vault, and Castle Exit Gate.
  - **Hold-Up & Frisk**: Sneak up on unalerted regular guards with a drawn pistol (even empty!) to make them surrender (*"NEIN!"*) and frisk them for ammo, keys, or grenades.
  - **Uniform Disguise & Holster**: Put on a Guard Uniform and holster your weapon to walk right past regular guards—while bulletproof **SS Stormtroopers** see straight through disguises and chase you across rooms!
  - **Chests & Loot**: Crack open timed supply chests for Bullets, Grenades, Uniforms, Bulletproof Vests, Brass Keys, Bratwurst, Schnapps, and the **Secret War Plans**.
  - **Locked Doors**: Open with a Brass Key, pick the lock, or blast them open with a Grenade.
  - **Rank Progression**: Escape with the War Plans to climb from `PRIVATE` to `GENERAL`, saved automatically in `localStorage`.
- **Dual Control Schemes**: Switch anytime between **Modern** (`WASD` + Mouse/Arrows) and **Classic Apple IIe** (`QWEADZXC` + `IJKL`).
- **Procedural 1-Bit Audio & Guard Speech**: 100% Web Audio API Apple II speaker sound effects and lo-fi formant-synthesized German guard shouts (*"HALT!"*, *"ACHTUNG!"*, *"SS!"*, *"KAPUT!"*, *"NEIN!"*, *"ALARM!"*) with zero external audio files.

## Running Locally

Because the app uses standard ES modules (`<script type="module">`), serve it with any static HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Live Demo & Hosting on GitHub Pages

- **Play Online**: https://impulsiverobot.github.io/wolf-apple-iie/
- **Repository**: https://github.com/ImpulsiveRobot/wolf-apple-iie

Hosted as a zero-build static site directly from the `main` branch (`/`) via GitHub Pages.
