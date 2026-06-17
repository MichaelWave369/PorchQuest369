# PorchQuest369 v0.4 Gameplay Loop

v0.4 makes the public GitHub Pages build feel more like a playable tabletop loop while staying browser-first and key-free.

## What v0.4 adds

### Encounter Cards

The browser app can now draw lightweight encounter cards. Each card has:

- a scene prompt
- a danger/stakes line
- a skill and DC
- a reward on success
- an optional canon proposal

A resolved encounter can add an item, advance a quest clue, create a Canon Queue proposal, or apply a small complication such as HP loss.

### Inventory Actions

Inventory is no longer just a list. Each item can be used. Item-use actions can:

- heal or ground the character
- add a flag to the campaign state
- advance quest progress
- create a Canon Queue proposal
- add a memory receipt or world clue

The public app still stores everything in browser localStorage unless a backend is connected.

### Quest Progress Triggers

Quests now support `progress`, `max_progress`, and `clues`. Browser turns, inventory actions, and encounters can advance quest progress. A quest can become `ready` once progress reaches its maximum.

### Save Migration

The browser save key moved to `porchquest369.browserCampaign.v3`, while v2 and v1 saves still migrate forward when loaded.

## Design stance

v0.4 keeps PorchQuest369 public-safe:

- no API keys in the browser
- no official D&D branding or protected settings
- no required backend for instant play
- canon changes still wait for player approval

## Next sprint ideas

v0.5 should add a more explicit adventure structure:

- scene deck / room deck
- NPC cards
- rest/camp action
- condition tags
- encounter difficulty tiers
- simple win states for the Blackwood Hill starter adventure
