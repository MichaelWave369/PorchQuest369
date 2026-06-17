# v0.8.5 Submission Console

v0.8.5 hardens Campaign Studio for creator submission and maintainer review.

## Landed

- AppV16 submission console wraps the existing AppV15 full editor.
- Real schema-rule validation checks required fields, slug-safe pack IDs, item caps, duplicate IDs, scene/NPC/reward issues, and route-edge scene references.
- Approval receipt export records validation status, pack counts, checklist state, and safe-content boundary.
- Reviewed Pack Gallery adds search and tag filters.
- Route graph polish adds edge up/down reorder controls.
- Backend submission packaging returns branch-ready file payloads without writing to disk.
- Backend write mode remains gated behind `PORCHQUEST_ALLOW_PACK_WRITES=1` for trusted local saves only.
- A third reviewed pack, `porch-rain-archive`, expands the gallery and route-edge test coverage.

## Submission Package Flow

1. Edit the route pack in the Campaign Studio editor.
2. Use **Refresh Current Pack** in the submission console.
3. Review schema errors and warnings.
4. Export an approval receipt.
5. Export a playtest transcript from the editor below.
6. Use **Backend Submission Package** to create a branch-ready JSON package when a backend is running.
7. A maintainer can review the returned file payloads and decide whether to open a branch/PR.

## Safe Boundary

The submission console packages content for review. It does not automatically promote unreviewed packs into public reviewed content. Public promotion still requires maintainer review, schema checks, playtest receipt, and safe-content approval.

## Backend Endpoints

- `GET /api/content-packs`
- `GET /api/content-packs/{pack_id}`
- `POST /api/content-packs/{pack_id}/save` — trusted write gate required
- `POST /api/content-packs/{pack_id}/submission-package` — branch-ready package, no write required
