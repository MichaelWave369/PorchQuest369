# PorchQuest369

A clean extraction from **The Infinite Porch** game/world concepts into a public-repo-safe prompt RPG seed.

PorchQuest369 is a single-player, prompt-based fantasy RPG engine with:

- a lightweight d20 dice engine
- instant browser play through GitHub Pages
- local browser campaign saves for the public demo
- campaign save/load state through the optional FastAPI backend
- character sheet, HP, AC, inventory, skills, quests, and flags
- world nodes and canon patch approval
- story/game prompt contracts
- starter React UI
- FastAPI backend
- starter campaign: **Lanterns Under Blackwood Hill**

This repository intentionally does **not** include the full Infinite Porch script, private WELL data, API keys, token handling, RAG stores, ComfyUI jobs, local network bridges, or other Porch systems.

## Play instantly

The public web build is designed to run as a static GitHub Pages app:

```txt
https://michaelwave369.github.io/PorchQuest369/
```

The Pages version runs in **browser play mode**. It does not need the FastAPI backend. It saves the demo campaign to localStorage in the visitor's browser.

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

By default, local development tries the API at `http://127.0.0.1:8787`. If the API is not running, the app falls back to browser play mode. You can override the API with `VITE_API_BASE`.

## Build for GitHub Pages

```bash
cd apps/web
VITE_STATIC_PLAY=1 VITE_BASE_PATH=/PorchQuest369/ npm run build
```

The deployment workflow at `.github/workflows/deploy-pages.yml` builds the app with those settings and deploys `apps/web/dist` to GitHub Pages.

## Repo-safety stance

The original Porch file had many unrelated systems in one large desktop script. This repo is a clean-room-style extraction of the game architecture only: dice, campaign state, world ledger, quest pack, and prompt contracts.

See:

- `docs/EXTRACTION_REPORT.md`
- `docs/DESIGN.md`
- `docs/RULES_BOUNDARY.md`
- `docs/ROADMAP.md`
- `docs/GITHUB_PAGES.md`
