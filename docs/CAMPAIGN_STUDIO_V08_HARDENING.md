# Campaign Studio v0.8 Hardening

Status: landed as a safe contributor-content pass.

## What this pass adds

- A formal JSON Schema for route packs at `schemas/route-pack.schema.json`.
- A reviewed starter pack at `content-packs/blackwood-starter.route-pack.json`.
- A new `AppV11.jsx` studio shell with focused quest and reward editors.
- Compact `v11.css` styles for the hardening shell.

## Route pack shape

A route pack is plain JSON with these top-level fields:

- `schema`: must be `porchquest.route_pack.v1`
- `id`: stable pack id
- `title`: player-facing pack title
- `summary`: short description
- `quests`: quest cards with progress thresholds
- `scenes`: scene cards linked to quests
- `npcs`: helper cards linked to quests
- `rewards`: reward cards that can add items, HP, clues, or condition tags

## Contributor workflow

1. Copy a reviewed pack from `content-packs/`.
2. Change card ids and titles carefully.
3. Keep quest ids stable before linking scenes, NPCs, or rewards.
4. Validate against `schemas/route-pack.schema.json`.
5. Paste the JSON into Campaign Studio and normalize it.
6. Export the normalized pack for review.

## App shell note

`AppV11.jsx` is committed and ready. During this sprint, the connector blocked the tiny `main.jsx` entrypoint replacement, so the public Pages app may still load the previous AppV10 shell until that import switch is applied.

Required entrypoint switch:

```jsx
import './v11.css';
import AppV11 from './AppV11.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV11 />
  </React.StrictMode>
);
```

## Safe content boundary

Route packs are data. They should not contain scripts, secrets, credentials, private user data, network calls, or dependency changes. New contributors can propose packs without editing runtime code.
