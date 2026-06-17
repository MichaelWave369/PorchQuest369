# PorchQuest369 v0.9.4 — Action Completion Polish

v0.9.4 turns the polished overview into a stronger action surface. The previous dashboard showed next actions, but exports and maintainer queue steps did not leave enough visible completion receipts.

## What landed

- Session export receipts stored in localStorage.
- Export Review Bundle action from the overview.
- Last export and export checksum shown in the overview.
- Session action log for playtest, import, edit, route, queue, and export actions.
- Maintainer queue local actions: reviewed, deferred, and needs changes.
- Export Center now includes a full review bundle JSON.

## Public build note

The public entrypoint remains stable and imports `AppV24`, but `AppV24` now forwards to `AppV25`. This avoids re-triggering the connector issue around `main.jsx` while still moving the live app to v0.9.4.

The live stylesheet path remains stable too: `v24.css` now carries the small v0.9.4 action-completion style patch.

## Boundary

This remains a public-safe fantasy tabletop-inspired campaign studio. The review queue actions are local browser workflow helpers, not GitHub write actions.
