from __future__ import annotations

import random
from typing import Any, Dict, List

from .campaigns import now_iso
from .dm_engine import apply_update, log_add


REWARD_TABLE: List[Dict[str, Any]] = [
    {"id": "rest_token", "title": "Rest Token", "text": "A small comfort restores 1 HP and clears tired.", "items": ["rest token"], "hp_delta": 1, "clear_conditions": ["tired"]},
    {"id": "blue_thread", "title": "Blue Thread", "text": "A blue thread points toward the key route.", "items": ["blue thread"], "quest_id": "q_main_1", "clue": "Blue thread points toward the missing porch key."},
    {"id": "apprentice_mark", "title": "Apprentice Mark", "text": "A small sign points toward the apprentice route.", "items": ["apprentice mark"], "quest_id": "q_side_1", "clue": "A small mark points toward the apprentice route."},
    {"id": "truth_note", "title": "Truth Note", "text": "A short written note steadies the memory-door thread.", "items": ["truth note"], "quest_id": "q_mystery_1", "clue": "Written notes help steady the memory-door thread."},
    {"id": "porch_coin", "title": "Porch Coin", "text": "A small coin gives the player confidence.", "items": ["porch coin"], "conditions": ["inspired"]},
    {"id": "blue_map", "title": "Blue Map", "text": "A small map points toward a key clue.", "items": ["blue map"], "quest_id": "q_main_1", "clue": "The blue map points toward a key clue."},
]


def _rng(campaign: Dict[str, Any]) -> random.Random:
    seed = int(campaign.get("seed", 123)) + len(campaign.get("reward_log") or [])
    return random.Random(seed)


def draw_reward(campaign: Dict[str, Any]) -> Dict[str, Any]:
    seen = {entry.get("id") for entry in (campaign.get("reward_log") or [])[-6:] if isinstance(entry, dict)}
    pool = [card for card in REWARD_TABLE if card["id"] not in seen] or REWARD_TABLE
    card = dict(_rng(campaign).choice(pool))
    update: Dict[str, Any] = {
        "add_items": card.get("items", []),
        "add_conditions": card.get("conditions", []),
        "remove_conditions": card.get("clear_conditions", []),
        "hp_delta": int(card.get("hp_delta", 0)),
    }
    if card.get("quest_id"):
        update["quest_updates"] = [{"id": card["quest_id"], "progress": 1, "clue": card.get("clue", card["title"])}]
    apply_update(campaign, update)
    campaign["reward_log"] = list(campaign.get("reward_log") or []) + [{"id": card["id"], "title": card["title"], "ts": now_iso()}]
    receipt_id = f"reward-{card['id']}"
    receipts = campaign.setdefault("receipts", [])
    if receipt_id not in receipts:
        receipts.append(receipt_id)
    log_add(campaign, "dm", f"Reward found: {card['title']}\n\n{card['text']}")
    return {"reward": card, "campaign": campaign}
