# PorchQuest369 v1.0.1 — Player Lobby Fix

v1.0 made PorchQuest369 open as a play-first adventure. v1.0.1 fixes the first real UX issue from live testing: players could start in an existing run and not know how to choose another pack, choose another hero, or continue when a route pack had no authored edge from the current scene.

## What changed

- The live public shell now forwards to `AppV27`.
- Player Mode includes a clear lobby before starting a run.
- Players can choose a reviewed adventure pack before starting.
- Players can choose a hero before starting.
- Active runs include a `Change Pack / Hero` button that clears the run and returns to the lobby.
- Reviewed pack loading clears the previous run, preventing stale scene state.
- If a current scene has no authored route edge, Player Mode shows fallback scene choices so a player is not stuck.
- Creator Studio remains one click away.

## Player path

1. Open the public page.
2. Choose a reviewed pack.
3. Choose a hero.
4. Start the adventure.
5. Roll scene checks, ask helpers, draw rewards, and follow route choices.
6. Export the adventure receipt.

## Claim boundary

This is a playtest-first browser adventure shell. It uses route-pack data and local browser storage. It is not a multiplayer service and does not require AI or backend access to play.
