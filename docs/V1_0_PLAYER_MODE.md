# PorchQuest369 v1.0 Player Mode

Status: landed.

This sprint adds the first clean player-facing doorway to PorchQuest369. Earlier v0.8-v0.9 work focused on the creator studio, route-pack validation, receipts, reviewed-pack gallery, and maintainer tooling. v1.0 makes the public page open to a direct adventure experience.

## What the player sees

- `Play Adventure` as the default landing page.
- A character picker with four presets:
  - Lantern Seeker
  - Porch Warden
  - Hill Scout
  - Memory Bard
- A Start Adventure button.
- A scene panel showing the current route scene.
- Scene check, helper, and reward actions.
- Route continuation choices from the pack's `edges`.
- A player sheet with HP, bonus, scene, inventory, clues, and conditions.
- An adventure receipt log.
- A downloadable adventure receipt JSON.

## Creator Studio access

The Creator Studio is still available from Player Mode through `Open Creator Studio`. The public app uses the same route-pack localStorage key as the studio so edited or imported packs can be played without changing formats.

## Receipt boundary

Player Mode does not claim simulation truth or external state. It creates local play receipts only:

- character choice
- scene checks
- helper clues
- rewards
- route movement
- ending/session notes
- exported adventure receipt

## Public build note

The public entrypoint still imports the stable `AppV24` shell. `AppV24` now forwards to `AppV26`, which contains Player Mode. This avoids recurring connector friction around direct `main.jsx` edits while keeping the live public page pointed at the newest app.

## Next focus

v1.0.1 should improve player feel:

- better scene outcome copy
- route ending screen
- visual dice roll animation
- save/resume run controls
- better mobile player layout
- optional character naming
