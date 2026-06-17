# PorchQuest369 v0.9 — Unified UI Polish

Status: landed.

## Why this pass exists

The v0.8.9 cleanup successfully removed the recursive legacy wrapper chain. A screenshot review of the public page showed the next user-experience issues clearly:

- the dashboard was much cleaner, but the hero was still visually heavy;
- the overview needed denser, more useful information above the fold;
- fixture checks needed visible loading and pass/fail states;
- the gallery, review, and JSON tools needed to feel like one current studio instead of separate sprint artifacts.

v0.9 keeps the no-wrapper-chain guarantee and improves the live public dashboard without reintroducing old version panels.

## What changed

- Public entrypoint now loads `AppV21` and `v21.css` only, plus the base `styles.css`.
- AppV21 remains standalone and does not import AppV20, AppV19, AppV18, AppV17, or older shells.
- Hero is more compact and pairs the pack digest with the promotion status.
- The metric strip now surfaces pack title, card counts, validation count, and reviewed-pack count.
- The overview shows validation, manifest preview, route graph, and fixture checks in one balanced grid.
- Fixture checks now have a clear loading state and pass/fail rows.
- Gallery, review, editor, and JSON tabs remain available from one clean current surface.

## Compatibility

AppV21 continues to use the existing route-pack localStorage key:

```text
porchquest369.routePack.v7
```

That preserves compatibility with the v0.8.x Campaign Studio data while removing the stacked public UI.

## Current public expectation

After the Pages build completes, the public app should show:

```text
PorchQuest369 v0.9
Unified Campaign Studio
```

It should not show prior version headers stacked below the dashboard.
