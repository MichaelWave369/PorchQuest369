# The Living Table R3: Tactical Encounters

**Status:** experimental 7×7 tactical MVP. This builds on [R1](LIVING_TABLE_R1.md) and [R2](LIVING_TABLE_R2.md) without a new repository, runtime dependency, or game save key.

## What is playable

- A **7×7 turn-based encounter board** accessible from The Living Table. Fight two fixed, original-fantasy opponents: an Ash Wisp and Briar Sentinel.
- The hero and up to three recruited companions are distinct units with HP, positions, action availability and a visible combat log.
- Each living ally takes **one legal action per round**: move one orthogonal square, strike an opponent in range, or guard. After all living allies act, enemies take deterministic pursuit or attack actions and a new round starts.
- Dice are drawn from the campaign's seeded deterministic d20. Attack rolls, bonuses, target AC, hit/miss, bounded damage, enemy moves, combat victory and defeat all become canonical receipts.
- Guarding reduces incoming hit damage by 2 for the round; the guardian may still take damage.
- **Offline companion tactics** select an explicitly legal option based on proximity, the companion's authored goal and injury-related memory. They still require **Approve Action**; declining never rolls dice.
- **Optional AI tactic picking:** when a local model is configured, the selected companion can choose only an option ID from the already computed legal-action menu. The model cannot invent a move, target, die result, item, creature or world mutation.
- The tactical encounter is persisted inside the existing Living Table portable campaign save as an additive \`combat\` field. Older R1/R2 JSON saves import with no encounter.
- The classic PorchQuest adventure, Creator Studio, noncombat DM narration and R2 companion notebooks remain present.

## Play and test

The tactical feature lives in PR #3's branch while under review:

~~~powershell
git fetch origin
git switch feat/living-table-r3-tactical-encounters
cd apps/web
npm install
npm run test:living
npm run dev
~~~

Begin or import a Living Table campaign, recruit some companions, and press **Start Tactical Encounter**. Select an ally or click its token; use the legal action buttons or highlighted target squares. Observe the foe phase and fight to victory, defeat or retreat. Use **Export Campaign** to check save portability.

For optional AI suggestions, start the local FastAPI + Ollama process using the documented [R1 instructions](LIVING_TABLE_R1.md) and connect it in the DM console. R3 adds a bounded \`POST /api/living-table/choose-tactic\` route. If the model responds incorrectly or is unavailable, the frontend stages a clearly labeled **LOCAL** legal tactic instead. No local model is necessary to play the offline combat game.

## State authority and model safety

The browser rules engine is the tactical authority, not the LLM. Each pending companion tactic is anchored to the companion ID, location, canonical turn, dice seed, battle round and battle sequence. **The same option is validated again at approval time.** Any action, enemy phase, expired actor turn or scene change makes a stale tactic unusable.

The UI and reducer block exploration rolls, route movement and recruiting/dismissing party members during an active encounter. Combat does not create quests or rewards. Victory is canonical but grants no items, XP or permanent world facts until a future explicitly designed reward pipeline exists.

The model receives only a bounded view of the selected companion's authored goal, its own memory notes, notes explicitly marked party-shared from other characters, currently visible opponents and an enumerated list of candidate option IDs. Private notes from other characters are not included by the client. This is **prompt-context isolation**, not authentication, encryption or a server-enforced database ACL. Browser storage and JSON exports remain plaintext.

The optional local API accepts only the established browser origins and model credentials stay on the backend. Do not expose the local adapter on a public IP.

## Known deliberate limitations

- Grid has no authored cover, elevation, line of sight, obstacles or fog-of-war yet. Movement is one orthogonal square; range is Manhattan distance. The UI is an early tactical tabletop, not a full tabletop simulator.
- Enemy AI is deterministic pursuit and attacks, not model-controlled. Enemy encounters are manually started, not automatically spawned from quests.
- Companion combat suggestions are **player requested and player approved**, not unattended or self-executing. No multiplayer sessions, tactical networking, voice, dynamic monsters, inventory-based equipment stats, character progression or VR controls.
- Companion HP is encounter-local and currently resets with a new battle; hero HP persists. Retreat preserves existing damage.
- The save normalizer rejects impossible rosters and coordinates and strips stale proposals. It does not protect against a person who directly edits their own local JSON save. There is no competitive multiplayer authority.
- The local-model API is optional and still requires real browser/model acceptance, including browser local-network restrictions.

## Acceptance plan

1. GitHub CI must pass R1, R2, and R3 JavaScript tests, all API tests, and production Vite build on the exact PR head.
2. Manual browser playthrough: start, move, strike, guard, recruit-lock, damage, retreat, victory, export/import, responsive mobile layout.
3. Manual Ollama test: legal option selected; illegal/model-failed selection falls back to LOCAL proposal without applying any action.
4. Follow-up: data-driven encounter editor in Creator Studio, terrain and LOS, explicit encounter reward proposals, richer model-selected tactics, 3D and WebXR adapters.

PorchQuest369 remains original tabletop-inspired fantasy software, not an official Dungeons & Dragons product.
