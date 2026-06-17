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

Status: landed and hardened through v0.8.9.

- public Pages entrypoint switched through AppV10-AppV19 during iterative studio hardening
- browser studio localStorage route-pack migration through v7
- contributor-safe route-pack JSON format
- formal route-pack schema file with optional route `edges`
- reviewed `content-packs/` starter pack folder
- public reviewed-pack index under `apps/web/public/content-packs/`
- route-pack validation and normalization
- route-pack export/import
- quest editor UI
- scene editor UI
- NPC editor UI
- reward editor UI
- route edge editor for explicit scene-to-scene links
- validation badges for pass/warning/error and pack counts
- per-card validation highlights
- field-level validation badges
- multiple reviewed content packs
- optional backend content-pack loader through `GET /api/content-packs`
- backend content-pack save endpoint through `POST /api/content-packs/{pack_id}/save`
- safer backend write-mode gating with `PORCHQUEST_ALLOW_PACK_WRITES=1`
- route flow graph for scenes, quests, and route edges
- Studio edit/playtest mode toggle
- exportable playtest transcript receipts
- reviewed-pack promotion checklist
- GitHub Pages content-pack gallery polish
- schema-rule validation beyond helper metadata
- reviewed-pack approval receipt ledger
- filtered/searchable content-pack gallery
- route-edge reorder controls
- backend submission package endpoint through `POST /api/content-packs/{pack_id}/submission-package`
- backend submission packages now include `zip_name`, title, and summary metadata
- browser one-click `.zip` export for local and backend submission packages
- richer promotion review status labels
- content-pack diff viewer against reviewed packs
- reviewed-pack gallery thumbnails and status metadata
- live state bridge above the full editor stack
- package zip manifest preview before download
- approval receipt timeline view
- schema validation fixtures
- gallery sort controls and thumbnail polish
- automated fixture checks for the valid and invalid schema packs
- manifest checksum preview before zip export
- approval receipt diff view against current pack
- maintainer review queue scaffold
- v0.8.9 unified studio cleanup removed the recursive wrapper chain from the live public page

## v0.9 — unified UI polish

Status: landed and hardened through v0.9.3.

- public Pages entrypoint moved to standalone unified shells with only base styles plus the current version stylesheet
- compact hero and promotion digest badge
- denser metric strip for pack, cards, validation, and gallery count
- fuller overview grid with validation, manifest, route graph, and fixture checks
- visible fixture loading and pass/fail states
- gallery, review, editor, and JSON tools kept in one current standalone studio shell
- old version panels remain available in source history but are not rendered by the public app
- v0.9.1 creator-flow guide strip for pack selection, editing, validation, playtesting, and export readiness
- v0.9.1 playtest tab for scenes, helpers, rewards, and transcript receipts
- v0.9.1 gallery details action that inspects pack metadata without immediately loading a pack
- v0.9.1 export center for route-pack JSON, approval receipts, playtest transcripts, and manifest review
- v0.9.1 editor quality-of-life actions for clone pack, reset starter, route-edge reorder, and long-text fields
- v0.9.2 deterministic fixture fallback rows so the overview never sits empty on GitHub Pages
- v0.9.2 quick playtest receipt button from the overview
- v0.9.2 playtest metric and readiness strip update immediately after quick playtest
- v0.9.2 route graph wrapping for long scene IDs, labels, and conditions
- v0.9.2.1 layout repair restored the full v22 card/grid layout under the v23 reliability patch
- v0.9.3 overview action polish with Next Action, Playtest Momentum, Review Snapshot, and recent export tracking

## v0.9.4 — next focus

- improve route graph visuals with directional arrows and scene-node grouping
- add recent packs and favorite packs stored locally
- add keyboard-friendly editor shortcuts and focus order
- add mobile compact mode for the editor cards
- add playtest outcome labels for success, partial, and complication
