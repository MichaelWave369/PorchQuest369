# AI DM Adapter

PorchQuest369 v0.3 keeps the public GitHub Pages game playable without any backend, while adding an optional smart-DM lane for people who want to connect a model.

## Modes

### 1. Browser oracle fallback

This is the default public mode. It runs fully in the browser, uses local dice rolls, saves to localStorage, and never needs an API key.

### 2. Custom browser endpoint

The Pages app can call a custom endpoint that you control. The browser sends:

```json
{
  "contract": "porchquest369-browser-dm-v0.3",
  "campaign": {},
  "action": "I inspect the blue lanterns."
}
```

The endpoint may return either a full updated campaign:

```json
{
  "campaign": {},
  "roll": { "label": "Perception Check", "detail": "14 + 2 = 16 vs DC 12", "outcome": "success" }
}
```

or a compact turn result:

```json
{
  "narrative": "The lanterns answer in a cold blue line...",
  "roll": { "label": "Perception Check", "detail": "14 + 2 = 16 vs DC 12", "outcome": "success" },
  "update": {
    "location": "Blackwood Hill Path",
    "add_items": ["blue lantern clue"],
    "quest_updates": []
  },
  "pending_patches": [
    {
      "id": "blue_lanterns_custom",
      "type": "upsert_node",
      "node": { "id": "blue_lanterns", "title": "Blue Lanterns", "summary": "Cold lights that reveal hidden tracks." },
      "reason": "The player investigated the lantern trail."
    }
  ]
}
```

Do not put model keys in the browser. The custom endpoint should own any model credentials server-side.

### 3. FastAPI server-side AI adapter

The backend supports an OpenAI-compatible `/v1/chat/completions` provider. This works with hosted gateways or local OpenAI-compatible model servers.

Set environment variables before running the API:

```bash
PORCHQUEST_DM_BACKEND=openai_compat
PORCHQUEST_OPENAI_COMPAT_BASE_URL=https://your-provider.example
PORCHQUEST_OPENAI_COMPAT_MODEL=your-model-name
PORCHQUEST_OPENAI_COMPAT_API_KEY=your-server-side-key
PORCHQUEST_DM_TEMPERATURE=0.7
```

Then run:

```bash
cd apps/api
uvicorn porchquest.main:app --reload --port 8787
```

The frontend will call the backend. If the adapter is not configured or the app is running on GitHub Pages, PorchQuest369 falls back to the browser/local DM.

## Safety boundaries

- Public Pages does not require or store model keys.
- The FastAPI adapter reads secrets only from server-side environment variables.
- The fallback DM always remains available.
- Generated world memory should go through the canon approval flow before becoming durable campaign truth.
- Keep content PG-13 and SRD-inspired, not official D&D-branded.
