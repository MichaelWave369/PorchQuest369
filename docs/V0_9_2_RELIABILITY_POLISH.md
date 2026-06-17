# PorchQuest369 v0.9.2 — Creator Flow Reliability Polish

v0.9.2 is a screenshot-driven polish sprint. The v0.9.1 dashboard looked good, but the overview still had three friction points:

- Fixture Checks could remain in a loading state if static fixture fetches failed or were delayed.
- Route graph labels could crowd the row when scene IDs or conditions were long.
- The readiness strip required a playtest receipt, but the overview did not offer a quick way to create one.

## What changed

- The live public entrypoint now loads `AppV23` and `v23.css` only.
- AppV23 remains standalone and does not import the legacy wrapper chain.
- Fixture checks start with deterministic fallback rows and then upgrade when fixture JSON loads.
- The overview Validation panel includes a `Quick Playtest Receipt` button.
- The Playtest metric and readiness strip update as soon as a transcript entry exists.
- Route graph rows wrap long scene IDs and conditions instead of stretching the panel.

## Why this matters

The studio should feel reliable even on GitHub Pages, where static fetches can momentarily lag after a deployment. v0.9.2 makes the dashboard useful immediately and gives creators a clear one-click path to complete the playtest step before export.
