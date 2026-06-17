from __future__ import annotations

from typing import Any, Dict

from .campaigns import now_iso


def campaign_to_questpack(campaign: Dict[str, Any]) -> Dict[str, Any]:
    player = campaign.get("player", {})
    world = campaign.get("world", {})
    nodes = world.get("nodes", {}) if isinstance(world, dict) else {}
    title = campaign.get("campaign_name", "PorchQuest")
    return {
        "schema": "porchquest.questpack.v1",
        "title": title,
        "created_utc": now_iso(),
        "ruleset": campaign.get("ruleset", "5e-light inspired"),
        "player_seed": {
            "name": player.get("name", "Hero"),
            "class_name": player.get("class_name", "Adventurer"),
            "level": player.get("level", 1),
        },
        "npcs": campaign.get("npcs", []),
        "quests": campaign.get("quests", []),
        "beats": [
            {"id": "enter", "text": f"Enter the threshold. {title} begins."},
            {"id": "first_choice", "text": "Choose a path, ask a question, or inspect the scene."},
            {"id": "reveal", "text": "A hidden truth becomes visible through play."},
            {"id": "return", "text": "Return to the Porch with a receipt of what changed."},
        ],
        "world_nodes": list(nodes.values()),
        "tilemap_hint": {
            "width": 16,
            "height": 9,
            "ascii": [
                "################",
                "#P.....L.......#",
                "#..####....###.#",
                "#..#..#....#...#",
                "#..#..#....#...#",
                "#..####....###.#",
                "#......H.......#",
                "#....S....E....#",
                "################",
            ],
            "legend": {"#": "wall", ".": "floor", "P": "porch", "L": "lantern", "H": "hill", "S": "start", "E": "exit"},
        },
    }
