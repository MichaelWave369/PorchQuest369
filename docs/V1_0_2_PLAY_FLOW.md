# PorchQuest369 v1.0.2 — Play Flow Polish

v1.0.2 improves the player-facing adventure door after the first live play screenshots.

## What changed

- The play lobby now shows a selected pack and hero summary before Start Adventure.
- The lobby includes a route health notice so players know whether a pack has authored routes or is using safe fallback travel.
- A Load Fresh Starter button reloads the reviewed starter pack and clears stale player-run state.
- Active runs now include an At the Table intro card explaining the click flow: roll, ask helper, draw reward, choose route.
- Missing authored route edges now produce clearer fallback-route messaging.
- The public entrypoint keeps using the stable AppV24 forwarder, now pointed at AppV28.

## Player promise

A player should be able to arrive at the public page, choose a pack, choose a hero, start a run, understand what to click next, and export an adventure receipt without opening Creator Studio.

## Creator boundary

Creator Studio remains available from Play Mode, but it is not required to begin playing. Route-pack repair and authored-edge work still belong in Creator Studio.
