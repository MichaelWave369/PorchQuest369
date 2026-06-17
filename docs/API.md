# API

Default base URL: `http://127.0.0.1:8787`

## `GET /api/health`

Returns service status.

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

## `GET /api/campaigns/{campaign_id}`

Loads a campaign.

## `POST /api/campaigns/{campaign_id}/turn`

Submits a player action.

```json
{
  "action": "I sneak toward the blue lantern.",
  "manual_roll": null
}
```

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
