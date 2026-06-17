# PorchQuest369 v0.6 Backend Bridge

v0.6 makes the public Pages game feel more like a portable tabletop client. The browser game still works by itself, but the Adventure Buttons can optionally call the FastAPI backend when a player provides a reachable API base URL.

## Browser-first rule

The GitHub Pages app remains the default play surface. It stores the campaign in localStorage and can resolve scenes, encounters, NPC help, camp, finale attempts, inventory use, canon approvals, and prompt actions without a server.

The backend bridge is optional. If the server is offline or returns an error, the browser falls back to its local resolver and records the error in the Backend Bridge status line.

## Condition tags

v0.6 exposes condition tags directly in the character panel:

| Tag | Meaning |
| --- | --- |
| `watched` | The hill has noticed the player route. Camp clears it. |
| `tired` | The player needs recovery. Camp clears it and restores HP. |
| `inspired` | The next risky roll receives a +1 browser bonus, then clears. |
| `marked` | A trail sign follows the player until camp clears it. |
| `hidden` | The player is moving quietly through the hill paths. |

These tags are saved in the browser campaign and are also compatible with the backend campaign shape introduced in v0.5.1.

## Backend Bridge panel

The panel contains:

- API base URL, defaulting to `VITE_API_BASE` or `http://127.0.0.1:8787`
- mode selector: Browser Oracle or Backend if online
- Test button: calls `GET /api/health`
- Create/Link button: calls `POST /api/campaigns` and stores the returned campaign id

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

## Save migration

The Pages app now writes `porchquest369.browserCampaign.v5` and still attempts to read older v4, v3, v2, and v1 saves.

Exported saves use the same normalized v5 shape, so a player can keep a portable JSON campaign file while the project continues to evolve.
