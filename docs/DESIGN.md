# PorchQuest369 Design

## Core loop

1. Player enters an action.
2. Engine decides whether a roll is useful.
3. Dice engine returns transparent result.
4. DM engine narrates outcome.
5. Engine proposes/apply updates to campaign state.
6. World ledger stores approved canon facts.
7. React UI renders story, character, quests, inventory, rolls, and world memory.

## Main objects

### CampaignState

The campaign is a JSON document with:

- `campaign_name`
- `setting`
- `tone`
- `safety`
- `turn`
- `location`
- `state_stack`
- `player`
- `quests`
- `npcs`
- `flags`
- `log`
- `world`

### Player

The player has:

- name, ancestry, class name, background
- level, HP, HP max, AC
- six familiar fantasy stats
- lightweight skill modifiers
- inventory and notes

### World ledger

World state is stored as nodes and edges:

```json
{
  "nodes": {
    "blackwood_hill": {
      "id": "blackwood_hill",
      "type": "location",
      "title": "Blackwood Hill",
      "tags": ["forest", "ruins"],
      "summary": "A hill where blue lanterns burn in the rain.",
      "facts": ["Every door remembers the last falsehood spoken near it."]
    }
  },
  "edges": [
    {"from": "infinite_porch", "to": "blackwood_hill", "rel": "threshold_to"}
  ]
}
```

Patch shape:

```json
{
  "world_patch": {
    "upsert_nodes": [],
    "append_facts": [],
    "delete_nodes": [],
    "new_edges": []
  }
}
```

## Architecture

```txt
React UI
  ↓
FastAPI
  ↓
porchquest.dice        transparent rolls
porchquest.campaigns   save/load campaign JSON
porchquest.dm_engine   turn handling + update application
porchquest.world_ledger canon memory patches
porchquest.questpack   adventure module export
porchquest.prompt_engine AI/DM prompt contracts
```

## AI integration point

`prompt_engine.py` builds the exact message contract a future AI DM can use. v0.1 ships with a deterministic local fallback so the app can run before any paid API is connected.
