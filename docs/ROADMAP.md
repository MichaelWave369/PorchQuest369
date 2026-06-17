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

Status: landed and hardened.

- browser save migration to v4
- scene deck / room deck with act labels, locations, choices, DCs, rewards, and quest movement
- NPC cards with role, vibe, trust, and ask-for-help actions
- camp/rest action with HP recovery and state receipt
- adventure state panel for in-motion / hot thread / finale ready / complete
- finale and partial-ending recorder for Blackwood Hill
- styling for scene cards, NPC cards, trust rows, and ending cards
- backend parity for scene, NPC, camp, and ending endpoints
- condition tags such as watched, tired, inspired, marked, hidden

## v0.6 — backend bridge hardening

Status: landed and hardened.

- Pages condition-chip UI
- backend mode controls in the browser app
- Load ID flow for continuing a server campaign
- Save to Server flow for pushing browser progress to the API
- sync_from_client endpoint
- bridge docs for browser-first and backend-linked play

## v0.7 — content expansion pack

Status: landed and hardened through v0.7.2.

- browser save migration to v7, then v8, then v9
- expanded scene deck
- expanded encounter deck
- expanded NPC helper deck
- reward table for small discoveries, clues, and condition changes
- lightweight receipt milestones
- supplemental v0.7 styling
- public Pages entrypoint switched through AppV7, AppV8, then AppV9
- backend reward-table parity through `POST /api/campaigns/{campaign_id}/reward/draw`
- quest-complete celebration panel
- ending screen polish
- compact route tracker
- seed presets for replayable runs
- route reset control
- world-node detail drawer

## v0.8 — campaign studio

Status: landed and hardened through v0.8.2.

- public Pages entrypoint switched to AppV10, AppV12, then AppV13
- browser studio localStorage route-pack migration through v5
- contributor-safe route-pack JSON format
- formal route-pack schema file
- reviewed `content-packs/` starter pack folder
- public reviewed-pack index under `apps/web/public/content-packs/`
- route-pack validation and normalization
- route-pack export/import
- quest editor UI
- scene editor UI
- NPC editor UI
- reward editor UI
- validation badges for pass/warning/error and pack counts
- per-card validation highlights
- import from reviewed content-pack list
- optional backend content-pack loader through `GET /api/content-packs`
- Studio edit/playtest mode toggle
- Campaign Studio docs for contributor workflow and content boundaries

## v0.8.3 — next focus

- field-level schema badge details
- multiple reviewed content packs
- backend content-pack save endpoint for maintainers
- route flow graph for scenes and quests
- playtest receipts and exportable playtest transcript

## v0.9 — deeper character builder

- point buy / standard array
- background packages
- class packages
- skill proficiency toggles
- simple equipment kits
- level-up receipts

## v1.0 — multiplayer table mode

- local co-op session
- multiple character sheets
- shared dice log
- DM override controls
- shareable table state
