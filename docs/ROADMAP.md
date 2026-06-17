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

Status: landed and hardened.

- server-side OpenAI-compatible adapter
- backend DM status endpoint
- automatic fallback to deterministic local DM
- browser DM settings panel
- optional custom browser endpoint contract
- no model keys in the public Pages app
- stronger model output validator
- world_patch JSON conversion into the visible canon queue
- endpoint test button in the DM Engine panel
- clearer fallback receipts when an adapter fails

## v0.4 — tabletop feel pass

Status: landed.

- encounter cards with scene, stakes, skill DC, reward, and optional canon proposal
- usable inventory actions
- quest progress and clue triggers
- browser save migration to v3
- v0.4 gameplay docs

## v0.5 — starter adventure loop

Status: first pass landed.

- browser save migration to v4
- scene deck / room deck with act labels, locations, choices, DCs, rewards, and quest movement
- NPC cards with role, vibe, trust, and ask-for-help actions
- camp/rest action with HP recovery and state receipt
- adventure state panel for in-motion / hot thread / finale ready / complete
- finale and partial-ending recorder for Blackwood Hill
- styling for scene cards, NPC cards, trust rows, and ending cards

Next hardening pass:

- backend parity for scene, NPC, camp, and ending endpoints
- condition tags such as watched, tired, inspired, marked, hidden
- scene/encounter balancing pass
- starter adventure content expansion
- lightweight achievement receipts

## v0.6 — campaign studio

- world node editor
- NPC editor
- quest builder
- map/tile hint view
- export/import quest packs
- campaign seed selector

## v0.7 — deeper character builder

- point buy / standard array
- background packages
- class packages
- skill proficiency toggles
- simple equipment kits
- level-up receipts

## v0.8 — multiplayer table mode

- local co-op session
- multiple character sheets
- shared dice log
- DM override controls
- shareable table state
