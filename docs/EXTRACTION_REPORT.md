# PorchQuest369 Extraction Report

## Source intent

The Infinite Porch script already contained a game-shaped core:

- `GameMaster` with deterministic d20 rolling and a `.wwf` world forge
- a Dungeon Master state object with player sheet, HP, AC, stats, skills, inventory, quests, flags, location, state stack, and log
- a DM prompt contract for single-player, choice-driven RPG output
- JSON update extraction and application for location, HP, inventory, quests, state stack, and flags
- World Nodes / graph-style memory with `upsert_nodes`, `append_facts`, `delete_nodes`, and `new_edges`
- Story Mode and Game Mode prompt instructions
- a lightweight Quest Pack generator with NPCs, beats, and tilemap hints

## What was pulled

| Porch concept | New module/file |
|---|---|
| `GameMaster.roll_d20` | `apps/api/porchquest/dice.py` |
| `.wwf` world forge idea | `apps/api/porchquest/campaigns.py`, `campaigns/blackwood-hill/campaign.json` |
| DM default state | `apps/api/porchquest/campaigns.py` |
| DM update extraction/application | `apps/api/porchquest/dm_engine.py` |
| World patch approval model | `apps/api/porchquest/world_ledger.py` |
| Story/Game mode prompt lines | `apps/api/porchquest/prompt_engine.py` |
| Quest Pack generator | `apps/api/porchquest/questpack.py`, `campaigns/blackwood-hill/quest_pack.json` |
| Desktop UI idea | `apps/web/src/App.jsx` |

## What was intentionally left out

- CustomTkinter desktop app
- WELL folder runtime data
- RAG/embedding database
- Tavily online assist
- ComfyUI job runner
- Bifrost websocket bridge
- local API key/token handling
- music studio, haptics, XR, Kiwix, GBCBS, and other non-game Porch systems
- any private local history, memory, keys, or generated files

## Public repo stance

This package is safe to initialize as a new public repo after you review it. It contains only clean game-engine code and placeholder starter data.
