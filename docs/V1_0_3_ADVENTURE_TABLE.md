# PorchQuest369 v1.0.3 — Adventure Table Polish

v1.0.3 makes Player Mode feel more like an actual table session instead of only a launcher.

## What changed

- Added a turn status panel that tells the player the next action.
- Added a four-step turn tracker: Roll, Ask, Reward, Route.
- Added completion states for scene checks, helpers, and rewards.
- Added route choice cards with destination titles and route conditions.
- Added a visited-scene count on the player sheet.
- Added a wider adventure receipt panel with End Session and Download controls.
- Preserved the Pack/Hero lobby from v1.0.1 and the play-flow guidance from v1.0.2.

## Player loop

1. Choose a reviewed pack.
2. Choose a hero.
3. Start the adventure.
4. Each turn: roll the scene, ask a helper, draw a reward, then choose a route.
5. End the session and export the adventure receipt.

## Public-build note

The live public app still uses the stable AppV24 entry chain. AppV28 now forwards to AppV29, and main imports v29.css for the v1.0.3 table styles.

## Claim boundary

This is a public-safe browser adventure runner. It is not a tabletop rules engine, not a gambling system, and not a real-money reward system. Rolls are lightweight story checks used to create a playable receipt trail.
