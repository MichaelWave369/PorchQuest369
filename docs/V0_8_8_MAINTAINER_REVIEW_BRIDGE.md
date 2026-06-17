# PorchQuest369 v0.8.8 — Maintainer Review Bridge

v0.8.8 adds a maintainer-facing review layer above the existing Campaign Studio stack. It does not replace the editor; it wraps the proven v0.8.7 bridge and keeps the full studio below it.

## What landed

- AppV19 public shell.
- Automated route-pack fixture checks.
- Zip manifest checksum preview.
- Approval receipt diff view.
- Maintainer review queue scaffold.
- Public review queue JSON.
- Public Pages entrypoint switch to AppV19.

## Automated fixture checks

AppV19 loads the public schema fixtures:

- `schemas/fixtures/route-pack.valid.json`
- `schemas/fixtures/route-pack.invalid.json`

The app validates each fixture using the same in-browser rule set used by the promotion console. Each fixture shows expected result, actual result, and pass/warning status.

## Manifest checksum preview

Before a submission package is downloaded or promoted, AppV19 previews the three expected package files:

- `content-packs/<id>.route-pack.json`
- `content-packs/<id>.approval-receipt.json`
- `docs/reviews/<id>.md`

Each row receives a deterministic lightweight checksum. The console also shows a combined manifest digest for quick visual comparison.

## Approval receipt diff view

The maintainer can select a reviewed approval receipt and compare the current route pack against the reviewed baseline pack. The first pass compares counts for:

- quests
- scenes
- NPCs
- rewards
- route edges

This is intentionally simple and explainable. Deeper object-level diffs can be added in a later sprint.

## Maintainer review queue scaffold

The public file `apps/web/public/content-packs/review-queue.json` defines a queue shape for future submitted packs. It is currently a scaffold row only; real submissions should point to an actual pack JSON, approval receipt JSON, and review checklist.

## Safety boundary

v0.8.8 does not enable public write access. The backend trusted write gate from v0.8.4/v0.8.5 remains the boundary for server-side pack writes. Public Pages remains read/import/export only.

## Next lane

v0.8.9 should focus on object-level diff rows, review queue actions, fixture test documentation, checksum receipt export, and optional PR branch helper packaging.
