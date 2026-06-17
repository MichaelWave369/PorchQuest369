# Campaign Studio v0.8

PorchQuest369 v0.8 adds a browser-first Campaign Studio. The goal is simple: let players and contributors edit a starter adventure without changing the core game code.

## What the studio edits

The studio edits a **route pack**. A route pack is plain JSON with:

- `schema`
- `id`
- `title`
- `summary`
- `quests`
- `scenes`
- `npcs`
- `rewards`

The app validates imported content before it becomes active. Text fields are trimmed, numbers are clamped, and missing arrays fall back to safe starter content.

## Scene cards

Each scene card can define:

```json
{
  "id": "porch_threshold",
  "act": "I",
  "title": "Porch Threshold",
  "skill": "perception",
  "dc": 12,
  "quest_id": "q_main_1",
  "reward": "threshold clue",
  "text": "A route mark waits under the porch rail."
}
```

A scene is playtested with a d20 check. Success grants the scene reward, advances the linked quest, writes a world node, and records a receipt. A miss continues the story and adds a pressure tag.

## NPC cards

Each NPC card can define:

```json
{
  "id": "old_joss",
  "title": "Old Joss",
  "role": "Porchkeeper",
  "quest_id": "q_main_1",
  "clue": "Old Joss marks the kind route."
}
```

Asking an NPC advances the linked quest, adds a note, raises trust, and grants an inspired condition.

## Export and import

Use **Export route pack** to download the current JSON content pack.

Use the **Import** tab to paste route-pack JSON back into the browser. The app validates the imported pack and then resets the quest list to match the imported pack.

## Contributor-safe workflow

Recommended contribution path:

1. Open the public Pages app.
2. Edit scenes and NPCs in the studio.
3. Playtest the route.
4. Export the route pack JSON.
5. Submit the JSON as a proposed content pack.

This keeps contribution focused on content instead of requiring contributors to edit React or backend code.

## Boundaries

- Route packs should use original content.
- Avoid brand-owned settings, characters, monsters, or logos.
- Keep route cards short and easy to review.
- The public app keeps working offline in the browser.

## Next hardening targets

- Quest editor UI.
- Reward editor UI.
- Route-pack schema file.
- Content-pack folder for reviewed packs.
- In-app validation messages per card.
