# PorchQuest369 v0.8.7 — Live Bridge and Review Console

Status: landed.

v0.8.7 adds a live review layer above the existing Campaign Studio without replacing the proven editor stack.

## Public app entrypoint

The public Pages build now loads `AppV18` and `v18.css`.

`AppV18` wraps `AppV17`, which wraps the existing submission console and full editor below it. This keeps the working editing surface intact while adding a live bridge/review console above it.

## Live state bridge

The live bridge watches the route-pack localStorage key used by the full editor and refreshes the review console when the saved pack changes.

It still includes a Force Sync button for explicit operator control, but the review console no longer depends only on manual sync.

## Zip manifest preview

The review console shows the files that will be included in a submission package before download:

- `content-packs/<pack-id>.route-pack.json`
- `content-packs/<pack-id>.approval-receipt.json`
- `docs/reviews/<pack-id>.md`

The existing AppV17 package exporter remains below the bridge for actual zip downloads.

## Approval receipt timeline

The public app now loads `content-packs/approval-receipts.json` and renders reviewed-pack approval history as timeline cards.

This gives maintainers and contributors a visible receipt trail for reviewed packs.

## Schema validation fixtures

Two schema fixtures were added:

- `schemas/fixtures/route-pack.valid.json`
- `schemas/fixtures/route-pack.invalid.json`

These give future tests a known valid pack and a known invalid pack for route-pack validation behavior.

## Gallery sort controls

The reviewed-pack gallery now has local search and sort controls:

- sort by title
- sort by first tag
- sort by status
- search by title, tag, or status

## Claim boundary

The studio remains a safe fantasy/adventure content tool. Route packs must not include secrets, private data, real-world targeting, or unsupported real-world claims.

## Next hardening lane

v0.8.8 should add automated fixture tests, manifest checksums, approval receipt diffing, gallery favorites, and a maintainer review queue.
