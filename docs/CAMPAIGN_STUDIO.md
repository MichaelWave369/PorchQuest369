# Campaign Studio v0.8.1

PorchQuest369 v0.8 adds a browser-first Campaign Studio. v0.8.1 hardens it into a contributor-ready editor: route packs can be edited, validated, imported, exported, and reviewed without touching core game code.

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

The app validates imported content before it becomes active. Text fields are trimmed, numbers are clamped, unknown quest links become warnings, and missing arrays fall back to safe starter content.

## Editor tabs

v0.8.1 exposes five editor tabs:

- **Quests** — edit quest ID, title, and max progress.
- **Scenes** — edit scene ID, act, title, skill, DC, linked quest, reward label, and scene text.
- **NPCs** — edit NPC ID, name, role, linked quest, and clue text.
- **Rewards** — edit reward ID, title, text, items, HP delta, linked quest, clue, add tags, and clear tags.
- **JSON** — paste/import a route pack and inspect the normalized export.

## Validation badges

The studio shows badges for:

- pass / warning / error state
- quest count
- scene count
- NPC count
- reward count

Warnings do not block export. They tell the contributor that a card needed normalization, usually because it referenced an unknown quest. Errors should be fixed before submitting a content pack.

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

A scene links to one quest and can be playtested by the game shell. Success advances the linked quest, records a reward label, writes a world node, and can unlock a receipt.

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

Asking an NPC advances the linked quest and grants the clue text.

## Reward cards

Each reward card can define:

```json
{
  "id": "rest_token",
  "title": "Rest Token",
  "text": "Restore 1 HP and clear tired.",
  "items": ["rest token"],
  "hp": 1,
  "quest_id": "",
  "clue": "",
  "add": [],
  "clear": ["tired"]
}
```

Allowed condition tags are:

- `watched`
- `tired`
- `inspired`
- `marked`
- `hidden`

## Export and import

Use **Export Pack** to download the current route-pack JSON.

Use the **JSON** tab to paste route-pack JSON back into the browser. The app validates the imported pack and replaces the local editing copy only after the JSON parses.

## Contributor-safe workflow

Recommended contribution path:

1. Open the public Pages app.
2. Edit quests, scenes, NPCs, and rewards in the studio.
3. Check the validation badges.
4. Normalize if needed.
5. Export the route pack JSON.
6. Submit the JSON as a proposed content pack.

This keeps contribution focused on content instead of requiring contributors to edit React or backend code.

## Reviewed content packs

Reviewed route packs live in `content-packs/`. The starter pack is:

- `content-packs/blackwood-starter.route-pack.json`

Route-pack structure is formalized in:

- `schemas/route-pack.schema.json`

## Boundaries

- Route packs should use original content.
- Avoid brand-owned settings, characters, monsters, or logos.
- Keep route cards short and easy to review.
- The public app keeps working offline in the browser.

## Next hardening targets

- Per-card validation highlights.
- Import from reviewed `content-packs/` list.
- Optional backend content-pack loader.
- Studio playtest mode that can switch between edit and run views.
