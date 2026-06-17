# v0.7 Content Expansion Pack

v0.7 expands the instant GitHub Pages adventure without requiring a backend. The public app remains browser-first, while the optional backend bridge still works for linked campaigns.

## What changed

- Browser save version moved to `v7`.
- Older browser saves from v6 through v1 still migrate forward.
- The scene deck expanded from a starter loop into a fuller Blackwood Hill route.
- The encounter deck gained more route events.
- The NPC deck now includes more helper characters.
- A reward table gives small discoveries, items, clues, and condition changes.
- Lightweight receipt milestones record first successes, NPC help, camp rest, rewards, and endings.

## New play loop

The player can now move between several button-driven actions:

1. **Draw Scene** — pulls a structured scene card with choices and skill checks.
2. **Draw Encounter** — pulls a short obstacle or clue event.
3. **Meet NPC** — introduces a helper character.
4. **Reward** — draws a small reward or clue from the reward table.
5. **Camp** — restores HP and clears pressure tags.
6. **Finale** — records a complete or partial ending.

The prompt box still supports freeform player intent, but v0.7 gives the browser table more structured content to keep play moving.

## Expanded content

### Scenes

The v0.7 browser deck includes:

- The Porch Threshold
- The Left Trail
- The Toll of Names
- Lantern-Maker's Window
- The Root Bridge
- The Rain Library
- The Door That Keeps Receipts
- The Candle Market
- The Iron Saint Beneath the Hill

### Encounters

The v0.7 browser deck includes:

- Blue-Fire Moth Swarm
- The Lying Door
- Porch Key Echo
- Rootbound Choir
- Lantern-Glass Fox
- Apprentice Whistle

### NPCs

The v0.7 browser deck includes:

- Old Joss
- Mara Lanternwright
- Nix Understep
- Sister Candle
- Bram Bleecker
- Thimble Ren

### Reward table

The reward table is intentionally small and gentle. It can add items, clues, conditions, and receipt milestones without turning the app into a combat or loot simulator.

Examples:

- Warm Cider Receipt
- Blue Thread Spool
- Apprentice Button
- Truth Chalk
- Porch Coin
- Dry Matchbook

## Receipt milestones

Receipts are lightweight achievement records stored in the browser save. They are not achievements from an external platform. They help a player see what kind of progress they have made inside the starter module.

Examples:

- first scene success
- first encounter success
- first NPC help
- reward receipt
- camp rest receipt
- starter ending receipt

## Backend boundary

The backend bridge remains optional. If a backend campaign is linked and backend mode is enabled, scene, encounter, NPC, camp, and finale buttons try the backend first. If a backend call fails, the browser resolver continues the game locally.

The new reward table currently resolves in the browser only. Backend parity for the reward table can land in a later sprint.

## Next sprint candidates

- Backend reward-table parity
- Cleaner ending screen
- Quest completion celebration panel
- More world-node rendering
- A compact mini-map / route tracker
