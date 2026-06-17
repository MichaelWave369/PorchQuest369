# PorchQuest369 v0.6 Backend Bridge

v0.6 makes the public Pages game feel more like a portable tabletop client. The browser game still works by itself, but the Adventure Buttons can optionally call the FastAPI backend when a player provides a reachable API base URL.

v0.6.1 hardens that bridge with explicit server campaign loading and browser-to-server save sync.

## Browser-first rule

The GitHub Pages app remains the default play surface. It stores the campaign in localStorage and can resolve scenes, encounters, NPC help, camp, finale attempts, inventory use, canon approvals, and prompt actions without a server.

The backend bridge is optional. If the server is offline or returns an error, the browser falls back to its local resolver and records the error in the Backend Bridge status line.

## Condition tags

v0.6 exposes condition tags directly in the character panel. v0.6.1 changes them from plain buttons into readable status chips.

| Tag | Meaning | Type |
| --- | --- | --- |
| `watched` | The hill has noticed the player route. Camp clears it. | pressure |
| `tired` | The player needs recovery. Camp clears it and restores HP. | pressure |
| `inspired` | The next risky roll receives a +1 browser bonus, then clears. | boon |
| `marked` | A trail sign follows the player until camp clears it. | pressure |
| `hidden` | The player is moving quietly through the hill paths. | boon |

Condition chips can be clicked to clear the tag locally. Camp still remains the normal in-story way to clear pressure tags.

## Backend Bridge panel

The panel contains:

- API base URL, defaulting to `VITE_API_BASE` or `http://127.0.0.1:8787`
- linked campaign ID field
- mode selector: Browser Oracle or Backend if online
- Test button: calls `GET /api/health`
- Create/Link button: calls `POST /api/campaigns` and stores the returned campaign id
- Load ID button: calls `GET /api/campaigns/{id}` and replaces the browser campaign with the server campaign
- Save to Server button: calls `POST /api/campaigns/{id}/sync_from_client` and replaces the server campaign with the current browser campaign

The Save to Server action is explicit on purpose. The browser does not silently overwrite the server table.

## Backend-powered buttons

When backend mode is enabled, these buttons call the server endpoints first:

| Button | Endpoint |
| --- | --- |
| Draw Scene | `POST /api/campaigns/{id}/scene/draw` |
| Resolve Scene Choice | `POST /api/campaigns/{id}/scene/resolve` |
| Draw Encounter | `POST /api/campaigns/{id}/encounter/draw` |
| Resolve Encounter | `POST /api/campaigns/{id}/encounter/resolve` |
| Meet NPC | `POST /api/campaigns/{id}/npc/meet` |
| Ask NPC | `POST /api/campaigns/{id}/npc/{npc_id}/ask` |
| Camp | `POST /api/campaigns/{id}/camp` |
| Attempt Finale | `POST /api/campaigns/{id}/finale` |

If a call succeeds and returns `campaign`, the browser replaces its local campaign with the normalized server campaign. If a call fails, it runs the matching browser resolver instead.

## Server sync endpoint

v0.6.1 adds:

```http
POST /api/campaigns/{campaign_id}/sync_from_client
```

Request body:

```json
{
  "campaign": {
    "id": "browser-blackwood-hill",
    "version": 6,
    "name": "Lanterns Under Blackwood Hill"
  }
}
```

The backend stores the submitted campaign under `{campaign_id}` and returns:

```json
{
  "campaign": {},
  "sync": {
    "ok": true,
    "source": "client",
    "campaign_id": "..."
  }
}
```

## Save migration

The Pages app now writes `porchquest369.browserCampaign.v6` and still attempts to read older v5, v4, v3, v2, and v1 saves.

Exported saves use the same normalized v6 shape, so a player can keep a portable JSON campaign file while the project continues to evolve.
