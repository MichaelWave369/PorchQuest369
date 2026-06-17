# PorchQuest369 v0.5 Gameplay Loop

v0.5 turns the GitHub Pages build into a more complete starter adventure for **Lanterns Under Blackwood Hill**. The public app still runs without a backend, API key, login, or server.

## Browser save version

The browser save key moved to `porchquest369.browserCampaign.v4`.

Older browser saves from v3, v2, and v1 still migrate through the app's normalizer when loaded.

## Scene Deck

The Scene Deck is a structured room/scene system. A scene card includes:

- act label
- location
- boxed scene text
- two or more player choices
- skill and DC
- reward or clue
- optional quest progress
- optional canon proposal

Scene results clear the active scene, write to the story log, push quest clues, and may add a pending Canon Queue card.

## NPC Cards

NPC cards add table characters without needing a full conversation system yet.

Each NPC has:

- name
- role
- vibe
- trust score
- ask-for-help action
- optional quest clue
- optional item reward

Using **Ask** raises trust and can advance a quest ledger clue.

## Camp / Rest

The camp action gives the player a small recovery loop:

- HP recovery
- story log receipt
- adventure state reminder
- clears trail-prep style temporary benefits

This gives the player a safe pacing action between scenes, encounters, and prompt turns.

## Adventure State and Endings

The Adventure State panel reads quest progress and shows:

- adventure in motion
- hot thread
- one thread ready
- finale ready
- starter adventure complete

The player can record either:

- a **partial ending**, if they want to close the session early
- the **full finale**, once the key, apprentice, and door-truth threads are all ready

Endings are stored on the campaign save as an `ending` receipt.

## Current boundary

v0.5 is implemented first in the static Pages layer so anyone can play instantly.

Backend parity is the next hardening target: scene, NPC, camp, and ending endpoints can be added to FastAPI after the browser loop feels good.
