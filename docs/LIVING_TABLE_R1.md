# The Living Table R1 — AI Dungeon Master + Companion Seats

**Status:** experimental feature branch. The classic PorchQuest369 Player Mode v1.0.6 and Creator Studio are preserved behind a reversible mode switch. No automatic save migration occurs.

## Working in this slice

- Free-form player actions, seven selectable skills, seeded d20, scene difficulty checks, explicit roll arithmetic and an auditable canonical event log.
- Five recruitable characters: Mira, Kael, Nessa, Bram and Iri. Three party seats, distinctive personalities and +2 assists on a matching skill.
- Player-approved world facts, clue discovery after successful scene checks, validated route choices, browser-local saves and portable campaign export/import.
- Existing Creator Studio route-pack format is used to seed each new Living Table campaign.
- Optional server-side AI Dungeon Master and companion responses via the existing OpenAI-compatible FastAPI adapter.
- AI-generated prose is labeled non-canonical. It cannot mutate game-state, grant items, roll dice or change quests.
- Unit tests for the deterministic engine and local AI bridge security boundaries.

## Launch locally without any model

In PowerShell:

~~~powershell
git clone https://github.com/MichaelWave369/PorchQuest369.git
cd PorchQuest369
git switch feat/living-table-r1-ai-dm-companions
cd apps/web
npm install
npm run test:living
npm run dev
~~~

Open the Vite URL and choose **The Living Table · Beta**. Start from the default Blackwood Hill world or your latest locally saved Creator Studio pack. The offline rules and scripted narration work without the server.

## Enable the AI Dungeon Master with local Ollama

Start Ollama and install a model, for example:

~~~powershell
ollama pull qwen3:4b
~~~

In a separate PowerShell terminal, from the repository root:

~~~powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PORCHQUEST_DM_BACKEND = 'openai_compat'
$env:PORCHQUEST_OPENAI_COMPAT_BASE_URL = 'http://127.0.0.1:11434'
$env:PORCHQUEST_OPENAI_COMPAT_MODEL = 'qwen3:4b'
$env:PORCHQUEST_OPENAI_COMPAT_API_KEY = 'local-only-dummy'
uvicorn porchquest.main:app --host 127.0.0.1 --port 8787
~~~

Ollama's OpenAI-compatible API accepts a dummy local key in this configuration. Other hosted models need actual credentials **only in the backend environment**, never in the public React app.

In The Living Table, keep the default local API address at http://127.0.0.1:8787 and press **Test / Connect DM**. The AI only runs when explicitly connected. The browser provides an offline scripted alternative if the model cannot be reached.

The local API must remain bound to 127.0.0.1. The bridge only accepts browser requests from localhost Vite or https://michaelwave369.github.io. If your browser blocks GitHub Pages-to-localhost requests under local-network or mixed-origin policies, use the Vite frontend on localhost.

## Game truth versus AI narrative

The canonical state includes current scene, world-pack snapshot, recruited party, player facts, discovered clues, deterministic roll seed and bounded events. Model responses appear in a separate non-canonical transcript, rendered as escaped text. The model cannot directly execute mutations.

The browser save is stored at the Living Table v1 key; the classic save and Creator Studio remain separate. Use **Export Campaign** for durable backups. Local browser storage is not a backup. Connected AI providers receive bounded scene and player text; do not put secrets into game fields.

## Not yet built

AI companion independent action proposals, autonomous turns, tactical combat maps and tokens, multiuser campaigns, model-driven NPC memory with secret compartments, item/spell/monster builders, voice, Quest 3, and a verified PixelForge/WorldForge bridge. The route-pack condition field is descriptive metadata in R1, not an enforced gameplay prerequisite.

## Next acceptance gates

1. Real desktop and local Ollama browser playthrough proving DM respects failed checks.
2. Companion propose/validate/approve action pipeline with deterministic replay.
3. Memory attribution, party knowledge boundaries and long-form campaign continuity.
4. World Studio editor expansion for settlements, maps, factions, spells, monsters and inventories.
5. Optional tabletop maps, multiplayer and VR adapters after core quality gates.

PorchQuest369 is original tabletop-inspired fantasy software, not an official Dungeons & Dragons product. Use original or appropriately licensed settings and rules.
