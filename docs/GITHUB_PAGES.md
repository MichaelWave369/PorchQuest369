# GitHub Pages Deployment

PorchQuest369 can be played as a static GitHub Pages app.

## Public URL

```txt
https://michaelwave369.github.io/PorchQuest369/
```

## How it works

The Pages workflow builds only the React app in `apps/web`.

It sets:

```bash
VITE_STATIC_PLAY=1
VITE_BASE_PATH=/PorchQuest369/
```

That means the hosted app:

- does not require the FastAPI backend
- resolves turns in the browser
- rolls dice in the browser
- stores the visitor's campaign in localStorage
- uses the correct `/PorchQuest369/` base path for GitHub project pages

## Workflow

The deployment workflow lives at:

```txt
.github/workflows/deploy-pages.yml
```

It runs on every push to `main` and can also be started manually with `workflow_dispatch`.

## Repo setting to check

If the deploy job fails with a Pages source or permission message, open the repository settings and check:

```txt
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

Once GitHub Pages is using GitHub Actions as the source, the workflow should publish automatically.

## Local equivalent

```bash
cd apps/web
npm install
VITE_STATIC_PLAY=1 VITE_BASE_PATH=/PorchQuest369/ npm run build
npm run preview
```
