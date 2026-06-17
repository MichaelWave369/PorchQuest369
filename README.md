# PorchQuest369

A clean extraction from **The Infinite Porch** game/world concepts into a public-repo-safe prompt RPG seed.

PorchQuest369 is a single-player, prompt-based fantasy RPG engine with:

- a lightweight d20 dice engine
- campaign save/load state
- character sheet, HP, AC, inventory, skills, quests, and flags
- world nodes and canon patch approval
- story/game prompt contracts
- starter React UI
- FastAPI backend
- starter campaign: **Lanterns Under Blackwood Hill**

This repository intentionally does **not** include the full Infinite Porch script, private WELL data, API keys, token handling, RAG stores, ComfyUI jobs, local network bridges, or other Porch systems.

## Run the backend

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn porchquest.main:app --reload --port 8787
```

## Run the web app

```bash
cd apps/web
npm install
npm run dev
```

The web app expects the API at `http://127.0.0.1:8787`. You can override it with `VITE_API_BASE`.

## Repo-safety stance

The original Porch file had many unrelated systems in one large desktop script. This repo is a clean-room-style extraction of the game architecture only: dice, campaign state, world ledger, quest pack, and prompt contracts.

See:

- `docs/EXTRACTION_REPORT.md`
- `docs/DESIGN.md`
- `docs/RULES_BOUNDARY.md`
- `docs/ROADMAP.md`
