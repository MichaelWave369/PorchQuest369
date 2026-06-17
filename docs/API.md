# API

Default base URL: `http://127.0.0.1:8787`

## `GET /api/health`

Returns service status and API version.

## `GET /api/dm/status`

Returns the configured DM adapter mode.

## `POST /api/dm/test`

Runs a safe DM adapter test without saving a campaign.

```json
{
  "action": "Connection test: describe the porch in one sentence."
}
```

## `GET /api/campaigns`

Lists saved campaigns.

## `POST /api/campaigns`

Creates a new campaign.

```json
{
  "player_name": "Mikey",
  "campaign_name": "Lanterns Under Blackwood Hill"
}
```

New campaigns use the portable adventure shape: quest progress/clues, NPC dictionary, active scene, active encounter, pending canon patches, ending receipt, and player condition tags.

## `GET /api/campaigns/{campaign_id}`

Loads a campaign. Older server saves are migrated into the current adventure shape when loaded.

## `POST /api/campaigns/{campaign_id}/sync_from_client`

Explicitly replaces a server campaign with a browser campaign payload. This supports the Pages app's **Save to Server** button.

```json
{
  "campaign": {
    "id": "browser-blackwood-hill",
    "version": 6,
    "name": "Lanterns Under Blackwood Hill",
    "conditions": ["inspired"],
    "pending_patches": []
  }
}
```

Response:

```json
{
  "campaign": {},
  "sync": {
    "ok": true,
    "source": "client",
    "campaign_id": "browser-blackwood-hill"
  }
}
```

The endpoint stores the submitted campaign under the URL `{campaign_id}`. It is explicit on purpose; the browser does not silently overwrite server state.

## `POST /api/campaigns/{campaign_id}/turn`

Submits a freeform player action.

```json
{
  "action": "I sneak toward the blue lantern.",
  "manual_roll": null,
  "allow_ai": true
}
```

The turn engine can apply quest progress, quest clues, NPC updates, inventory changes, HP changes, and condition tags such as `tired`, `watched`, `marked`, `hidden`, and `inspired`.

## `POST /api/campaigns/{campaign_id}/roll`

Rolls dice.

```json
{
  "expr": "1d20+3",
  "dc": 12,
  "label": "Stealth"
}
```

## `POST /api/campaigns/{campaign_id}/world_patch`

Applies an approved world patch.

```json
{
  "world_patch": {
    "append_facts": [
      {"id": "blackwood_hill", "facts": ["A hidden stair was found beneath the roots."]}
    ]
  }
}
```

## Adventure parity endpoints

These endpoints mirror the instant-play GitHub Pages loop so hosted/server play can run the same starter-adventure structure.

### `GET /api/campaigns/{campaign_id}/adventure_state`

Returns the current starter-adventure state: in motion, hot thread, finale ready, or complete.

### `POST /api/campaigns/{campaign_id}/scene/draw`

Draws a structured scene card and saves it as `active_scene`.

### `POST /api/campaigns/{campaign_id}/scene/resolve`

Resolves the active scene choice.

```json
{
  "choice_index": 0
}
```

Successful choices add rewards, quest progress, clues, and optional pending canon patches. Failed choices keep the story playable but can cost HP or add a condition.

### `POST /api/campaigns/{campaign_id}/encounter/draw`

Draws a lightweight encounter card and saves it as `active_encounter`.

### `POST /api/campaigns/{campaign_id}/encounter/resolve`

Resolves the active encounter.

```json
{
  "skill": "perception"
}
```

Omit `skill` to use the encounter's default skill.

### `POST /api/campaigns/{campaign_id}/npc/meet`

Draws or reintroduces an NPC card and stores it in the campaign NPC ledger.

### `POST /api/campaigns/{campaign_id}/npc/{npc_id}/ask`

Asks a known NPC for help. This can increase trust, add a clue, add an item, and grant the `inspired` condition.

### `POST /api/campaigns/{campaign_id}/camp`

Runs the camp/rest action. It restores HP, clears `tired`/`marked`, may add `inspired`, and logs a rest receipt.

### `POST /api/campaigns/{campaign_id}/finale`

Records a full or partial ending depending on quest readiness. Full finale requires the three starter threads to be ready.

## `GET /api/campaigns/{campaign_id}/questpack`

Exports a simple quest-pack view of the campaign world.
