from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_-]+", "-", (text or "campaign").strip()).strip("-").lower()
    return s or "campaign"


def data_dir() -> Path:
    base = os.getenv("PORCHQUEST_DATA_DIR")
    if base:
        return Path(base).resolve()
    return (Path(__file__).resolve().parents[4] / "data").resolve()


def campaigns_dir() -> Path:
    p = data_dir() / "campaigns"
    p.mkdir(parents=True, exist_ok=True)
    return p


def default_campaign(player_name: str = "Mikey", campaign_name: str = "Lanterns Under Blackwood Hill") -> Dict[str, Any]:
    cid = slugify(f"{campaign_name}-{int(time.time())}")
    ts = now_iso()
    return {
        "id": cid,
        "version": 5,
        "campaign_name": campaign_name,
        "setting": "A threshold-fantasy mystery beginning on an impossible porch beside Blackwood Hill.",
        "tone": "cozy mystery, wonder, lantern-lit heroism",
        "safety": "PG-13: no gore, no sexual content, no hate",
        "ruleset": "5e-light inspired / original campaign content",
        "seed": 123,
        "turn": 0,
        "location": "The Infinite Porch",
        "state_stack": ["exploration"],
        "player": {
            "name": player_name or "Mikey",
            "ancestry": "Human",
            "class_name": "Lantern-Seeker",
            "background": "Wanderer",
            "level": 1,
            "hp": 12,
            "hp_max": 12,
            "ac": 12,
            "stats": {"str": 10, "dex": 12, "con": 11, "int": 11, "wis": 13, "cha": 12},
            "skills": {"athletics": 0, "stealth": 1, "perception": 2, "persuasion": 1, "arcana": 0, "survival": 2},
            "inventory": ["weathered cloak", "porch key ring", "lantern stub", "waterskin", "10 gp"],
            "conditions": [],
            "notes": "",
        },
        "quests": [
            {"id": "q_main_1", "title": "Find the missing porch key before midnight", "type": "main", "status": "open", "progress": 0, "max_progress": 3, "clues": []},
            {"id": "q_side_1", "title": "Rescue the lantern-maker's apprentice", "type": "side", "status": "open", "progress": 0, "max_progress": 3, "clues": []},
            {"id": "q_mystery_1", "title": "Learn why every door on Blackwood Hill remembers lies", "type": "mystery", "status": "open", "progress": 0, "max_progress": 3, "clues": []},
        ],
        "npcs": {
            "old_joss": {"id": "old_joss", "title": "Old Joss", "name": "Old Joss", "role": "Porchkeeper", "trust": 1},
            "mara_lanternwright": {"id": "mara_lanternwright", "title": "Mara Lanternwright", "name": "Mara Lanternwright", "role": "Lantern-maker", "trust": 0},
        },
        "npc_log": [],
        "active_encounter": None,
        "encounter_log": [],
        "active_scene": None,
        "scene_log": [],
        "pending_patches": [],
        "pending_world_patches": [],
        "ending": None,
        "flags": {},
        "log": [
            {
                "role": "dm",
                "content": "Rain taps the roof of a porch that should not exist. Beyond the steps, Blackwood Hill glows with blue lanterns between the trees. Old Joss hands you a ring with one missing key and says, 'Find what was taken before midnight, or the hill will remember you wrong.'\n\nA) Step toward Blackwood Hill.\nB) Question Old Joss about the missing key.\nC) Inspect the porch and lanterns for clues.",
                "ts": ts,
            }
        ],
        "world": {
            "nodes": {
                "infinite_porch": {
                    "id": "infinite_porch",
                    "type": "threshold",
                    "title": "The Infinite Porch",
                    "tags": ["safe-start", "threshold", "home"],
                    "summary": "A porch between ordinary life and the lantern road.",
                    "facts": ["The porch appears during rain.", "One key is missing from the porch key ring."],
                    "updated_at": ts,
                },
                "blackwood_hill": {
                    "id": "blackwood_hill",
                    "type": "location",
                    "title": "Blackwood Hill",
                    "tags": ["forest", "blue-lanterns", "ruins"],
                    "summary": "A forested hill where blue lanterns burn and doors remember lies.",
                    "facts": ["Blue lanterns burn on the path after sunset.", "Every door remembers the last lie spoken near it."],
                    "updated_at": ts,
                },
            },
            "edges": [{"from": "infinite_porch", "to": "blackwood_hill", "rel": "threshold_to"}],
        },
        "created_at": ts,
        "updated_at": ts,
    }


def campaign_path(campaign_id: str) -> Path:
    return campaigns_dir() / f"{slugify(campaign_id)}.json"


def migrate_campaign(campaign: Dict[str, Any]) -> Dict[str, Any]:
    """Bring older server saves up to the v0.5 browser-compatible shape."""
    if not isinstance(campaign, dict):
        campaign = {}
    base = default_campaign(campaign.get("player", {}).get("name", "Mikey"), campaign.get("campaign_name", "Lanterns Under Blackwood Hill"))
    merged = {**base, **campaign}
    merged["player"] = {**base["player"], **(campaign.get("player") or {})}
    merged["player"]["inventory"] = list(merged["player"].get("inventory") or [])
    merged["player"]["conditions"] = list(dict.fromkeys(map(str, merged["player"].get("conditions") or [])))

    quest_by_id: Dict[str, Dict[str, Any]] = {q["id"]: dict(q) for q in base["quests"]}
    for raw in campaign.get("quests") or []:
        if not isinstance(raw, dict):
            continue
        qid = str(raw.get("id") or "").strip()
        if not qid:
            continue
        current = quest_by_id.get(qid, {"id": qid, "title": qid, "type": "side", "status": "open", "progress": 0, "max_progress": 3, "clues": []})
        current.update(raw)
        current["progress"] = max(0, int(current.get("progress") or 0))
        current["max_progress"] = max(1, int(current.get("max_progress") or 3))
        current["clues"] = [str(c)[:160] for c in (current.get("clues") or [])][:10]
        if current["progress"] >= current["max_progress"] and current.get("status") == "open":
            current["status"] = "ready"
        quest_by_id[qid] = current
    merged["quests"] = list(quest_by_id.values())

    merged["npcs"] = campaign.get("npcs") if isinstance(campaign.get("npcs"), dict) else {npc.get("id", npc.get("name", "npc")): npc for npc in campaign.get("npcs", []) if isinstance(npc, dict)}
    merged["npc_log"] = list(campaign.get("npc_log") or [])
    merged["active_encounter"] = campaign.get("active_encounter")
    merged["encounter_log"] = list(campaign.get("encounter_log") or [])
    merged["active_scene"] = campaign.get("active_scene")
    merged["scene_log"] = list(campaign.get("scene_log") or [])
    merged["pending_patches"] = list(campaign.get("pending_patches") or [])
    merged["pending_world_patches"] = list(campaign.get("pending_world_patches") or [])
    merged["ending"] = campaign.get("ending")
    merged["flags"] = dict(campaign.get("flags") or {})
    merged["world"] = campaign.get("world") or base["world"]
    merged.setdefault("log", base["log"])
    merged["version"] = 5
    return merged


def save_campaign(campaign: Dict[str, Any]) -> Dict[str, Any]:
    campaign = migrate_campaign(campaign)
    campaign["updated_at"] = now_iso()
    cid = campaign.get("id") or slugify(campaign.get("campaign_name", "campaign"))
    campaign["id"] = cid
    p = campaign_path(cid)
    p.write_text(json.dumps(campaign, indent=2, ensure_ascii=False), encoding="utf-8")
    return campaign


def load_campaign(campaign_id: str) -> Dict[str, Any]:
    p = campaign_path(campaign_id)
    if not p.exists():
        raise FileNotFoundError(f"Campaign not found: {campaign_id}")
    return migrate_campaign(json.loads(p.read_text(encoding="utf-8")))


def list_campaigns() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for p in sorted(campaigns_dir().glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            c = migrate_campaign(json.loads(p.read_text(encoding="utf-8")))
            out.append({
                "id": c.get("id", p.stem),
                "campaign_name": c.get("campaign_name", p.stem),
                "location": c.get("location", ""),
                "turn": c.get("turn", 0),
                "updated_at": c.get("updated_at", ""),
            })
        except Exception:
            continue
    return out
