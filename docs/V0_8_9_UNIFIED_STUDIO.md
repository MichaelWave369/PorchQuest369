# PorchQuest369 v0.8.9 — Unified Studio Cleanup

## Purpose

v0.8.9 is a UX cleanup sprint for the Campaign Studio stack.

Earlier v0.8.x releases intentionally layered new dashboards by wrapping the previous app shell. That was safe for rapid iteration, but it created a confusing public page where old versions appeared one after another.

v0.8.9 replaces the public entrypoint with a single standalone studio shell.

## What changed

- Public Pages now renders `AppV20.jsx`.
- `AppV20.jsx` does not import `AppV19`, `AppV18`, `AppV17`, or older wrappers.
- `main.jsx` now imports only:
  - `styles.css`
  - `v20.css`
  - `AppV20.jsx`
- Old app shells remain in the repository for history and rollback, but they are no longer part of the live public render tree.

## Current public studio sections

The unified studio has five primary tabs:

1. `overview` — validation, manifest preview, route graph, and fixture checks.
2. `editor` — pack identity, quests, scenes, NPCs, rewards, and route edges.
3. `gallery` — reviewed pack loading with thumbnail/status/tag metadata.
4. `review` — approval timeline and maintainer review queue.
5. `json` — route-pack JSON import/export and approval receipt export.

## Why this matters

This sprint converts the creator tool from a visible sprint history into a clean user-facing product surface.

The old chain was useful internally, but users should not see:

- v0.8.7 bridge
- v0.8.6 console
- v0.8.5 submission console
- v0.8.4 editor
- older shells

all on the same page.

Now the public app presents one current version: `PorchQuest369 v0.8.9 — Unified Campaign Studio`.

## Compatibility

The unified app continues to use the existing route-pack localStorage key:

```text
porchquest369.routePack.v7
```

This keeps the current edited pack visible to tooling that already expects the v0.8.x route-pack save key.

## Next lane

v0.9.0 should focus on release-candidate polish:

- clearer onboarding
- a default play mode versus creator mode toggle
- route-pack schema test in CI
- contributor guide
- first public release notes
