# PorchQuest369 v1.0.4 — Adventure Table Feedback

v1.0.4 is a player-facing table feedback pass. It keeps the Play Adventure front door from v1.0.1–v1.0.3 and makes the active turn loop easier to understand.

## What landed

- The live player shell now forwards to AppV30.
- Packs with no valid authored route edges get generated safe route choices from scene order.
- The active run shows a clear next-action label for roll, helper, reward, route, or export.
- Route choices stay locked until the turn actions are complete.
- The table shows a Last table note card based on the newest receipt entry.
- Receipt exports create visible session export feedback.
- Missing helper or reward cards no longer block the turn; Player Mode can mark those steps complete with a receipt note.

## Player loop

1. Choose a pack and hero.
2. Start the adventure.
3. On each turn, roll the scene check.
4. Ask a helper.
5. Draw a reward.
6. Choose a route.
7. Repeat until the player ends the session and exports the receipt.

## Boundary

This is still a local-first browser playtest runtime. It does not require accounts, payment, multiplayer services, or AI services. Creator Studio remains available through the Play Mode header.
