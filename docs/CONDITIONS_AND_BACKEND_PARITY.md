# Conditions and Backend Parity

PorchQuest369 v0.5.1 hardens the hosted FastAPI backend so it can run the same adventure loop that the GitHub Pages app already supports.

## Backend parity scope

The backend now supports:

- scene draw and scene choice resolution
- encounter draw and encounter resolution
- NPC meet and ask-for-help actions
- camp/rest action
- adventure-state checks
- full or partial finale recording
- player condition tags
- quest progress and clue merging
- pending canon patches from scenes and encounters

This keeps the public Pages game fast and static while giving a hosted deployment the same campaign vocabulary.

## Condition tags

Conditions are stored on:

```json
{
  "player": {
    "conditions": ["tired", "watched", "inspired"]
  }
}
```

Current tags are intentionally lightweight:

| Tag | Meaning |
|---|---|
| `tired` | The hero is worn down; backend checks apply a small penalty. |
| `watched` | The hill has noticed the hero. |
| `marked` | An encounter complication left a trail-sign on the hero. |
| `hidden` | The hero has a stealth/perception advantage. |
| `inspired` | The hero gains a small bonus and feels supported. |

The condition system is not a full rules engine yet. It is a compact status layer that can be carried in save files, used by future UI panels, and interpreted by AI/custom DM adapters.

## How conditions change

Freeform backend turns can add or remove conditions through the normal `update` object:

```json
{
  "update": {
    "add_conditions": ["watched"],
    "remove_conditions": ["tired"]
  }
}
```

Scenes, encounters, NPCs, camp, and finale actions also use condition tags:

- scene failure can add `watched`
- encounter failure can add `marked`
- NPC help can add `inspired`
- camp/rest clears `tired` and `marked`
- finale clears unresolved pressure tags and adds `inspired`

## Quest progress shape

Quest updates now support progress and clues:

```json
{
  "id": "q_main_1",
  "progress": 1,
  "clue": "The porch boards knock when a key-fragment is close."
}
```

When progress reaches `max_progress`, open quests become `ready`. The finale checks the three starter threads:

- `q_main_1`
- `q_side_1`
- `q_mystery_1`

If all three are ready, the backend records the full Blackwood Hill ending. Otherwise, it records a partial ending.

## Backend and Pages boundary

The browser game remains the public instant-play source for GitHub Pages. The backend parity layer exists for local hosted play, future multiplayer/shared campaigns, and AI DM deployments where state should live on a server.

No API keys are required for Pages play. If a model is used, model secrets belong behind a hosted backend or custom DM endpoint, never in the browser.
