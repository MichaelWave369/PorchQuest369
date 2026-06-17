# PorchQuest369 v0.8.6 — Package Export & Diff Console

v0.8.6 turns the Campaign Studio submission layer into a stronger maintainer workflow without removing the proven editor underneath it.

## What landed

- `AppV17.jsx` wraps `AppV16.jsx` so the full v0.8.5 editor remains available.
- Public Pages loads `AppV17` and `v17.css`.
- The submission console can sync the current route pack from the full editor by reading the shared route-pack save key.
- The browser can export a local submission package as a real `.zip` file.
- The browser can request a backend submission package and export the returned files as a `.zip` file.
- The gallery index includes `thumbnail` and `status` metadata for reviewed packs.
- The console includes a content-pack diff viewer against any reviewed pack in the public gallery.
- Promotion status now shows a richer label and progress count.

## Local package zip

The local zip contains:

1. `content-packs/<pack-id>.route-pack.json`
2. `content-packs/<pack-id>.approval-receipt.json`
3. `docs/reviews/<pack-id>.md`

This allows contributors to export a branch-ready content packet without needing backend access.

## Backend package zip

When an API host is available, the console calls:

```http
POST /api/content-packs/{pack_id}/submission-package
```

The backend does not write files for this route. It returns a package object with proposed file paths and file contents. The browser turns those returned files into a `.zip` download.

## Diff viewer

The diff viewer compares the current editor pack against a selected reviewed pack and reports added/removed IDs across:

- quests
- scenes
- NPCs
- rewards
- route edges

## Gallery thumbnails

The public gallery index now supports:

```json
{
  "thumbnail": "lantern",
  "status": "reviewed"
}
```

This is lightweight metadata for the browser gallery. It does not imply automated approval. Approval still belongs to review receipts and maintainer checks.

## Claim boundary

v0.8.6 remains a content-authoring workflow for a fantasy tabletop-style browser game. The package export, diff viewer, and approval receipt system are editorial governance tools, not proof of external claims.
