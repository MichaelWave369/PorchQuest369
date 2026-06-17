# PorchQuest369 v0.9.1 — Creator Flow Polish

v0.9.1 keeps the v0.9 no-wrapper-chain rule and improves the public studio as a practical creator workflow.

## Goals

- Preserve the single current dashboard.
- Make the next authoring steps obvious.
- Add a real playtest transcript lane.
- Improve reviewed-pack gallery details.
- Separate export/download actions from raw JSON editing.

## Public app shell

The public entrypoint loads `AppV22.jsx` and `v22.css` only, plus the shared base stylesheet. Old wrapper shells remain in the repository for history, but they are not imported by the live page.

## New creator-flow tools

### Guided readiness strip

A five-step flow shows whether the creator has chosen a pack, edited cards, cleared blocking validation errors, playtested at least once, and reached promotion-ready status.

### Playtest tab

Creators can click through scenes, helpers, and rewards. Each click adds a timestamped transcript entry. The transcript can be exported as JSON for review receipts.

### Gallery details

Reviewed-pack cards now support a details action, showing path and tag metadata without immediately replacing the current working pack.

### Export center

Export actions are grouped into one tab for route-pack JSON, approval receipt JSON, playtest transcript JSON, and manifest review.

## Boundary

This remains a public-safe fantasy tabletop-inspired campaign studio. It does not publish private Infinite Porch systems or secret runtime material.
