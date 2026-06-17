# v0.7.1 Hardening Pass

Status: landed.

This pass hardens the v0.7 content expansion without changing the browser-first promise.

## Pages app

The public app now loads `AppV8.jsx` through `main.jsx`.

Highlights:

- browser save migration to v8
- compact route tracker for the Blackwood Hill route
- quest-complete celebration panel
- polished ending panel for full or partial endings
- reward button with backend attempt plus browser fallback
- continued export/import support
- continued backend bridge support for create, load, save, camp, finale, and reward attempts

## Route tracker

The route tracker shows each starter route step as one of:

- cleared
- next
- locked

Route state is stored in `campaign.flags.routeVisited`.

## Quest celebration

When a quest crosses its `max_progress` threshold, the browser app:

- marks the quest complete
- writes a story-log celebration line
- adds a quest receipt
- shows completed quests in the celebration panel

## Ending polish

The ending panel stays visible after a full or partial ending is recorded.

A full ending requires all three starter quest threads to complete. A partial ending can be recorded earlier so a player can close a session without losing their progress.

## Backend reward parity

A new backend reward table module exists at:

```txt
apps/api/porchquest/rewards.py
```

It mirrors the browser reward loop: items, quest clues, HP deltas, condition changes, reward log, receipts, and story-log output.

The Pages app calls:

```txt
POST /api/campaigns/{campaign_id}/reward/draw
```

when backend mode is enabled. If that endpoint is unavailable, browser fallback resolves the reward locally.

## Next hardening target

- wire the backend reward route into `main.py`
- add world-node detail drawer
- add route reset / route seed selector
- add compact credits/about panel
