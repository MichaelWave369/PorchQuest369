# PorchQuest369 v1.0.6 — Runtime Feel Layer

v1.0.6 is the first player-runtime feel pass. v1.0.5 warmed the route-pack content itself; v1.0.6 makes the buttons speak with more story texture.

## What changed

- Added `apps/web/src/feelLayer.js` as a small reusable narration layer.
- Added `apps/web/src/AppV31.jsx` as the v1.0.6 player shell.
- Forwarded the live player shell to AppV31 through the stable AppV28/AppV24 path.
- Added `apps/web/src/v31.css` and loaded it from `main.jsx`.

## Player-facing improvements

- A Mood / Mystery / Objective / Hero Lens strip appears during active runs.
- Scene panels use warmer scene-intro narration instead of only raw route-pack text.
- Roll results now narrate strong success, success, partial success, and complication tones.
- Helper actions use helper voice narration.
- Reward actions read like discovered objects instead of dispensed state.
- Route travel writes transition narration into the receipt.
- Ending receipts now close the session with a warmer summary.

## Design boundary

The game still works offline and remains deterministic in static mode. This layer does not require AI calls. It adds authored narration helpers around the existing local gameplay loop so the player gets more atmosphere while the receipt stays transparent.

## How to test

1. Open the public page.
2. Click Load Fresh Starter if an old local pack is cached.
3. Start a hero.
4. Roll, ask, reward, and route.
5. Read the Last Table Note and Adventure Receipt entries.

The run should feel less like a status report and more like a lantern-lit tabletop narrator that keeps receipts.
