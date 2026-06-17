# PorchQuest369 v0.7.2 — Replay + World Node Drawer

v0.7.2 hardens the v0.7 content pack into a more replayable starter adventure.

## What changed

- The public Pages app now loads `AppV9.jsx`.
- Browser saves now use save version `v9` while older v8/v7/v6/v5/v4/v3/v2/v1 saves migrate forward.
- The backend reward module is wired into `POST /api/campaigns/{campaign_id}/reward/draw`.
- The Pages reward button still has browser fallback, but hosted backend play can now use the same reward endpoint.
- Seed presets let a player replay Blackwood Hill with repeatable route/reward/NPC draws.
- Route reset starts a new route run while preserving the character, class, inventory, and selected seed.
- The world-node drawer turns route progress, NPCs, quest clues, and world facts into inspectable map cards.

## Seed presets

The current presets are:

- Porch 369
- Mirror 963
- Lantern 144
- Lattice 20736

Changing the seed logs a system receipt so the player knows the run table changed.

## Route reset

Route reset clears the route run state:

- route visited list
- seen rewards
- seen NPCs
- condition tags
- ending receipt
- run receipts
- generated world nodes

It keeps the current character, class, inventory, and seed. This makes repeated playthroughs quick without forcing a full character rebuild.

## World-node drawer

The drawer builds node cards from:

- cleared route steps
- met NPCs
- quest clues/completions
- generated world nodes from campaign state

The intent is to make the campaign feel like a small living atlas instead of just a story log.

## Backend reward parity

The backend now exposes:

```text
POST /api/campaigns/{campaign_id}/reward/draw
```

The endpoint applies the reward to the campaign, saves it, and returns:

```json
{
  "reward": {},
  "campaign": {}
}
```

The Pages app calls this endpoint in backend mode and falls back to browser rewards if the backend is unavailable.

## Next hardening target

v0.8 should focus on content authoring:

- editable scene cards
- editable NPC cards
- exportable route packs
- lightweight campaign pack import
- contributor-safe content format
