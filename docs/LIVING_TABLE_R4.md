# The Living Table R4: Encounter Creator

**Status:** Experimental creator milestone. R4 extends the existing PorchQuest369 Living Table and preserves the R1/R2/R3 save format and original Classic/Studio mode.

## What you can build

The Living Table **Encounter Creator** appears where the R3 launch button used to be, before a tactical battle begins. It provides:

- A **7×7 visual map painter** with walls and reserved hero/companion deployment positions.
- Three terrain presets: **Open Forest**, **Broken Ruins**, and **Twisted Grove**. Choose a preset, then paint or erase wall tiles. At most 18 solid walls may be placed.
- Exactly **two configurable opponents**, using a finite original monster catalog: **Ash Wisp** (Cinder Bolt), **Briar Sentinel** (Thorn Slam), **Shade Moth** (Shadow Dust), and **Stone Keeper** (Stone Fist).
- Monster template statistics with fixed legal **attack range, bonus, armor class, base damage and HP limits**; configurable initial HP and positions.
- A title for each reusable encounter design.
- **Save encounter** into the active campaign, **Export blueprint** into portable JSON, and **Import blueprint** from JSON. The entire saved design also travels with **Export Campaign**.
- Deterministic tactical play driven by the saved design. Walls block movement, enemy pursuit and ranged line of sight; the game continues to generate legal options for approved companion and AI suggestions.
- Original rules and game state remain authoritative. The optional AI tactic selector sees a finite validated menu. Neither authoring JSON nor model output can install code, spawn additional enemy actors or invent combat abilities.

## Use

In the R4 feature branch, start a Living Table campaign and recruit your companions first if you want them to fight. Choose **Edit encounter**, select the map brush, paint the arena, move the two enemy spawns, choose their monster types and HP, then **Save encounter**. Click **Launch saved encounter** when ready.

Editable tiles reserve the hero and three potential companion deployment positions, so a saved blueprint remains valid even if you later recruit new allies. A wall may not overlap enemy spawns or reserved ally positions; enemies may not overlap each other. Unsaved edits are separate from the next battle, and the launch control is disabled while editing.

The classic default Blackwood encounter remains available without authoring a custom design. An existing R3 save with an active battle can still be restored. Importing a corrupt or out-of-bounds custom battle fails closed rather than executing the untrusted content.

## Local development

~~~powershell
git fetch origin
git switch feat/living-table-r4-encounter-creator
cd apps/web
npm install
npm run test:living
npm run dev
~~~

No model or server is needed to paint or play tactical maps. To enable AI companion tactic suggestions, follow [R1](LIVING_TABLE_R1.md) to run the existing optional local FastAPI + Ollama connection.

## Design rules, privacy and limitations

- The prototype is **7×7, two enemy slots, and a bounded catalog**. Arbitrarily scripted monster abilities, custom maps larger than 7×7, unlimited enemies, cover/elevation, AI-authored monster definitions, multilayer dungeons, and automatic campaign-wide encounter spawning are **not yet implemented**.
- Monster abilities here are **data-driven combat profiles** (range, accuracy, AC, base damage). They do not have separately animated effects, status conditions or spell scripts yet.
- Walls block ranged attacks through a deterministic grid line check. This is a first-pass square-grid line of sight, not a complete tabletop geometry implementation.
- The encounter editor saves **one reusable blueprint per campaign**. Multi-encounter libraries, tagging, world-level encounter assignment and collaborative publishing are future work.
- The generated battle instance snapshots its blueprint. Editing that blueprint later does not retroactively alter an already running encounter.
- The app is local-first. The authored blueprint and campaign exports are plain JSON, not encrypted. They do not add model access to private companion memories.
- Tests cover legacy R3 encounters, wall/overlap prevention, line-of-sight denial, monster stat bounds, serialized battle snapshots, and ignored unrecognized JSON keys. Browser/Quest 3, manual accessibility and real-model acceptance remain separate gates.

## Next checkpoints

1. Review CI for R1–R4 regression tests and production web build.
2. Manual desktop playthrough of painter, blueprint import/export, AI tactic integration, retreat, victory and resume.
3. Expand to an encounter **library** indexed by world and scene; scripted but deterministic status abilities; optional NPC/faction tools.
4. Add item/monster/ability authoring with bounded rule schemas, then evaluate optional 3D/WebXR map adapters.

Original tabletop-inspired fantasy; not affiliated with the Dungeons & Dragons brand.
