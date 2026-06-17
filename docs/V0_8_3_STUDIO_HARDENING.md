# PorchQuest369 v0.8.3 Campaign Studio Hardening

v0.8.3 turns Campaign Studio from a route-pack editor into a stronger authoring loop. The public app now supports field-level validation, multiple reviewed packs, backend pack save, a route flow graph, and exportable playtest transcripts.

## Public Pages changes

- `apps/web/src/AppV14.jsx` is the active Campaign Studio shell.
- `apps/web/src/main.jsx` imports `AppV14` and `v14.css`.
- `apps/web/public/content-packs/index.json` now lists more than one reviewed pack.
- `apps/web/public/content-packs/porch-market-day.route-pack.json` adds a second safe route pack for static import.

## Field-level validation

Each editor card still has a card readiness badge, but v0.8.3 also gives individual fields an `ok` or warning badge.

Field checks include:

- Missing ID or title.
- Scene skill outside the supported skill list.
- Scene DC outside the 5-30 range.
- Scene, NPC, or reward links to an unknown quest.
- Missing scene text, NPC role, NPC clue, or reward text.

This helps authors fix the exact field instead of reading only a top-level warning list.

## Reviewed packs

The reviewed-pack list now contains:

1. `blackwood-starter` — Lanterns Under Blackwood Hill.
2. `porch-market-day` — a smaller market route pack for testing multi-pack import and reward flow.

The browser studio loads these from the static `content-packs/index.json` file.

## Backend content-pack save

The API now includes a trusted/local save path:

```http
POST /api/content-packs/{pack_id}/save
Content-Type: application/json

{
  "pack": {
    "schema": "porchquest.route_pack.v1",
    "id": "example-pack",
    "title": "Example Pack",
    "quests": [],
    "scenes": [],
    "npcs": [],
    "rewards": []
  }
}
```

The API sanitizes the pack ID, normalizes missing top-level arrays, writes the file into `content-packs/`, and returns the saved pack metadata.

This endpoint is intended for trusted local/dev authoring environments. Public hosted deployments should protect write routes behind their own access controls.

## Route flow graph

The studio now renders a simple route graph from scene order. Each node shows:

- Step number.
- Act.
- Scene title.
- Linked quest title.
- Scene reward text.

This is a lightweight authoring map, not a full graph engine yet.

## Playtest transcript export

Playtest mode now records structured transcript entries for scene, NPC, and reward clicks. Authors can export a transcript JSON receipt with:

- Pack ID and title.
- Current validation summary.
- Playtest log entries with timestamps, card type, ID, title, and note.

## Next hardening

v0.8.4 should add:

- A real graph editor for route edges.
- Schema validation against the JSON Schema file, not just local JS checks.
- Reviewed-pack promotion workflow.
- Safer backend write-mode gating.
