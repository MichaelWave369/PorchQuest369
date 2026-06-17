# PorchQuest369 v0.8.4 — Campaign Studio Hardening

v0.8.4 turns the Campaign Studio into a safer contributor workflow: creators can shape route edges, check promotion readiness, load the formal schema file, browse reviewed packs, and understand backend write protections before saving content.

## What landed

- **Route edge editor**: route packs now support an optional `edges` array. Each edge has `from`, `to`, `label`, and optional `condition` fields.
- **Route flow graph**: the studio renders route edges as readable flow cards, showing scene-to-scene movement and any condition text.
- **Schema helper**: the browser loads `schemas/route-pack.schema.json` and reports whether the schema file is available while still running lightweight client validation.
- **Promotion checklist**: packs get a simple readiness list before review: no blocking errors, at least two scenes, at least one edge, scene text filled, NPC clues filled, and at least one reward.
- **Safer backend write gate**: backend content-pack saves now require `PORCHQUEST_ALLOW_PACK_WRITES=1`. Listing and loading packs remain available without the flag.
- **Gallery polish**: reviewed packs render as cards with summaries and load buttons.

## Route edge shape

```json
{
  "from": "porch_threshold",
  "to": "left_trail",
  "label": "follow the soft path",
  "condition": "optional condition text"
}
```

Edges are intentionally small. They do not execute logic yet; they describe the route graph for authors, reviewers, and future playtest tooling.

## Backend write-mode gate

The API still supports:

- `GET /api/content-packs`
- `GET /api/content-packs/{pack_id}`

Saving is gated:

- `POST /api/content-packs/{pack_id}/save`

To enable trusted/local saves:

```bash
PORCHQUEST_ALLOW_PACK_WRITES=1 uvicorn porchquest.main:app --reload
```

If the flag is not set, the save route returns a `403` and the browser shows a write-gate message.

## Promotion checklist

The checklist is not a legal or security review. It is a creator-facing readiness pass before a content pack is proposed for the reviewed pack folder.

A pack is closer to promotion when:

1. validation has no blocking errors,
2. it includes at least two scenes,
3. it includes at least one route edge,
4. all scenes include text,
5. all NPC helpers include clues,
6. it includes at least one reward.

## Next hardening lane

v0.8.5 should add schema-file validation beyond the current helper pass, reviewed-pack approval receipts, branch/PR packaging for submitted packs, and stronger visual route graph editing.
