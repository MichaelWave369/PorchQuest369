# API

Default base URL: `http://127.0.0.1:8787`

## `GET /api/health`

Returns service status and API version.

## Content pack API

### `GET /api/content-packs`

Lists reviewed route packs available to the API host. v0.8.4 also returns the backend write-gate status.

```json
{
  "schema": "porchquest.reviewed_pack_index.v1",
  "write_gate": {
    "enabled": false,
    "env": "PORCHQUEST_ALLOW_PACK_WRITES",
    "message": "Reviewed pack writes require PORCHQUEST_ALLOW_PACK_WRITES=1."
  },
  "packs": [
    {
      "id": "blackwood-starter",
      "title": "Lanterns Under Blackwood Hill",
      "summary": "Reviewed starter route pack for Campaign Studio.",
      "path": "content-packs/blackwood-starter.route-pack.json"
    }
  ]
}
```

### `GET /api/content-packs/{pack_id}`

Loads one reviewed route pack by ID.

```json
{
  "pack": {
    "schema": "porchquest.route_pack.v1",
    "id": "blackwood-starter",
    "quests": [],
    "scenes": [],
    "npcs": [],
    "rewards": [],
    "edges": []
  }
}
```

### `POST /api/content-packs/{pack_id}/save`

Saves a route pack into the backend `content-packs/` folder. This is intended for trusted local/dev authoring only.

By default this route returns `403`. To enable it for trusted local editing:

```bash
PORCHQUEST_ALLOW_PACK_WRITES=1 uvicorn porchquest.main:app --reload
```

Request shape:

```json
{
  "pack": {
    "schema": "porchquest.route_pack.v1",
    "id": "example-pack",
    "title": "Example Pack",
    "quests": [],
    "scenes": [],
    "npcs": [],
    "rewards": [],
    "edges": []
  }
}
```

Success response shape:

```json
{
  "saved": {
    "ok": true,
    "id": "example-pack",
    "path": "content-packs/example-pack.route-pack.json",
    "write_gate": { "enabled": true },
    "pack": {}
  }
}
```

Blocked response shape:

```json
{
  "detail": "Route pack writes are disabled. Set PORCHQUEST_ALLOW_PACK_WRITES=1 for trusted local/backend editing."
}
```

## DM adapter API

### `GET /api/dm/status`

Returns the configured DM adapter mode.

### `POST /api/dm/test`

Runs a safe DM adapter test without saving a campaign.

```json
{
  "action": "Connection test: describe the porch in one sentence."
}
```

## Campaign API

### `GET /api/campaigns`

Lists saved campaigns.

### `POST /api/campaigns`

Creates a new campaign.

```json
{
  "player_name": "Mikey",
  "campaign_name": "Lanterns Under Blackwood Hill"
}
```

New campaigns use the portable adventure shape: quest progress/clues, NPC dictionary, active scene, active encounter, pending canon patches, ending receipt, and player condition tags.

### `GET /api/campaigns/{campaign_id}`

Loads a campaign. Older server saves are migrated into the current adventure shape when loaded.

### `POST /api/campaigns/{campaign_id}/sync_from_client`

Explicitly replaces a server campaign with a browser campaign payload. This supports the Pages app's **Save to Server** button.

```json
{
  "campaign": {
    "id": "browser-blackwood-hill",
    "version": 9,
    "name": "Lanterns Under Blackwood Hill",
    "conditions": ["inspired"],
    "pending_patches": []
  }
}
```

The endpoint stores the submitted campaign under the URL `{campaign_id}`. It is explicit on purpose; the browser does not silently overwrite server state.

### `POST /api/campaigns/{campaign_id}/reward/draw`

Draws and applies a backend reward to a saved campaign.

### `POST /api/campaigns/{campaign_id}/turn`

Submits a freeform player action.

```json
{
  "action": "I inspect the route mark.",
  "manual_roll": null,
  "allow_ai": true
}
```

The turn engine can apply quest progress, quest clues, NPC updates, inventory changes, HP changes, and condition tags such as `tired`, `watched`, `marked`, `hidden`, and `inspired`.

### Other campaign endpoints

- `POST /api/campaigns/{campaign_id}/roll`
- `POST /api/campaigns/{campaign_id}/world_patch`
- `GET /api/campaigns/{campaign_id}/questpack`
- `GET /api/campaigns/{campaign_id}/adventure_state`
- `POST /api/campaigns/{campaign_id}/scene/draw`
- `POST /api/campaigns/{campaign_id}/scene/resolve`
- `POST /api/campaigns/{campaign_id}/encounter/draw`
- `POST /api/campaigns/{campaign_id}/encounter/resolve`
- `POST /api/campaigns/{campaign_id}/npc/meet`
- `POST /api/campaigns/{campaign_id}/npc/{npc_id}/ask`
- `POST /api/campaigns/{campaign_id}/camp`
- `POST /api/campaigns/{campaign_id}/finale`
