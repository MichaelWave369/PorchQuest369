# Roadmap

## v0.1 — playable seed

- FastAPI backend
- React frontend
- campaign JSON save/load
- d20 dice tray
- player sheet
- quest ledger
- inventory display
- world node memory
- starter campaign
- deterministic fallback DM

## v0.2 — instant browser table

Status: landed.

- GitHub Pages static play mode
- browser-only turn resolver
- localStorage campaign saves
- character setup with class presets
- portable save export/import
- canon queue for approve/reject world patches
- cleaner mobile-friendly UI

## v0.3 — AI DM adapter

Status: first pass landed.

- server-side OpenAI-compatible adapter
- backend DM status endpoint
- automatic fallback to deterministic local DM
- browser DM settings panel
- optional custom browser endpoint contract
- no model keys in the public Pages app
- docs for AI adapter setup and response shape

Next hardening pass:

- stronger model output validator
- better conversion from generated world_patch JSON into the visible canon queue
- endpoint test button in the DM Engine panel
- clearer error receipts when an adapter fails
- sample local model recipe

## v0.4 — campaign studio

- world node editor
- NPC editor
- quest builder
- map/tile hint view
- export/import quest packs
- campaign seed selector

## v0.5 — deeper character builder

- point buy / standard array
- background packages
- class packages
- skill proficiency toggles
- simple equipment kits
- level-up receipts

## v0.6 — multiplayer table mode

- local co-op session
- multiple character sheets
- shared dice log
- DM override controls
- shareable table state
