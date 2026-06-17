# Campaign Studio v0.8.2

PorchQuest369 v0.8 adds a browser-first Campaign Studio. v0.8.2 hardens it into a contributor-ready editor: route packs can be edited, validated, imported, exported, loaded from reviewed packs, loaded from an optional backend, and playtested without touching core game code.

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

v0.8.2 exposes five editor tabs plus a Playtest mode:

- **Quests** — edit quest ID, title, and max progress.
- **Scenes** — edit scene ID, act, title, skill, DC, linked quest, reward label, and scene text.
- **NPCs** — edit NPC ID, name, role, linked quest, and clue text.
- **Rewards** — edit reward ID, title, text, items, HP delta, linked quest, clue, add tags, and clear tags.
- **JSON** — paste/import a route pack and inspect the normalized export.
- **Playtest** — run selected scene, NPC, and reward cards inside the studio to check flow.

## Validation badges

The studio shows badges for:

- pass / warning / error state
- quest count
- scene count
- NPC count
- reward count
- per-card ready / issue state

Warnings do not block export. They tell the contributor that a card needs attention, such as missing text or an unknown quest link. Errors should be fixed before submitting a content pack.

## Reviewed pack import

The public Pages build copies reviewed packs from:

- `apps/web/public/content-packs/index.json`
- `apps/web/public/content-packs/*.route-pack.json`

This lets the public Studio load reviewed starter packs directly from GitHub Pages without a backend.

The source-of-truth reviewed packs remain in:

- `content-packs/`

## Optional backend pack loader

API deployments can expose the same reviewed packs through:

- `GET /api/content-packs`
- `GET /api/content-packs/{pack_id}`

The Studio's backend loader points at an API base URL and imports the returned pack into the browser editor.

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
3. Check the validation badges and per-card issue chips.
4. Switch to Playtest mode and click through a few cards.
5. Normalize if needed.
6. Export the route pack JSON.
7. Submit the JSON as a proposed content pack.

This keeps contribution focused on content instead of requiring contributors to edit React or backend code.

## Boundaries

- Route packs should use original content.
- Avoid brand-owned settings, characters, monsters, or logos.
- Keep route cards short and easy to review.
- The public app keeps working offline in the browser.

## Next hardening targets

- Schema badge details per field.
- Reviewed pack chooser with multiple packs.
- Backend pack save endpoint for maintainers.
- Playtest receipts and route flow graph.
