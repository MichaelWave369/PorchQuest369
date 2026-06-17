# PorchQuest369 v1.0.5 — Feel in the Bones

v1.0.5 is a story-feel pass focused on making Player Mode feel warmer, stranger, and less mechanical.

## Why this sprint exists

After playing the first public Player Mode, the core loop worked but felt too cold:

- roll results were clear but blunt,
- helper and reward text felt mechanical,
- the starter pack could still fall into safe-route mode,
- the Blackwood Hill atmosphere was not carrying enough of the game.

This sprint improves the content layer first, because the player should feel the place before the engine asks for more complexity.

## What changed

### Warmer scene text

The starter scenes now open with fuller sensory descriptions:

- rain on the old porch rail,
- wet roots and listening woods,
- a gate warmed by hesitant hands,
- damp pages in the rain library,
- blue candles mapping the safe way home.

### Helper voices

Helper clues now carry voice and personality instead of plain state hints:

- Old Joss speaks in porch wisdom.
- Mara Lanternwright gives practical lantern-maker logic.
- Nix Understep whispers the rule of memory-doors.

### Reward reveals

Rewards now feel discovered rather than dispensed:

- Rest Token gives breath and warmth.
- Blue Thread tugs toward the key route.
- Porch Coin becomes a small symbolic return-path object.

### Authored route edges

The public starter pack and repo content-pack copy now include five authored edges:

1. Porch Threshold → Left Trail
2. Left Trail → Name Gate
3. Name Gate → Rain Library
4. Rain Library → Candle Market
5. Candle Market → Porch Threshold

This removes the confusing zero-edge starter-pack experience after loading the fresh reviewed starter.

## Public play note

Because Player Mode stores the current pack in browser localStorage, players who already loaded the older zero-edge starter should click **Load Fresh Starter** once after this sprint. That reloads the enriched reviewed pack and clears the stale route shape.

## Design principle

The game should feel like:

> a lantern-lit storyteller that happens to keep receipts.

The receipts stay. The structure stays. The clicks now have more weather, voice, and memory around them.

## Next lane

v1.0.6 should move the feeling layer into the runtime itself:

- richer roll-result narration,
- hero-specific narration tint,
- mood/mystery/objective strip,
- route transition lines,
- ending text variants.
