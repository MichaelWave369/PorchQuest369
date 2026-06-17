from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional, Tuple

from .campaigns import now_iso
from .dice import d20
from .world_ledger import retrieve_world_nodes


def log_add(campaign: Dict[str, Any], role: str, content: str) -> None:
    campaign.setdefault("log", [])
    campaign["log"].append({"role": role, "content": content, "ts": now_iso()})
    if len(campaign["log"]) > 2000:
        campaign["log"] = campaign["log"][-1500:]


def apply_update(campaign: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(update, dict):
        return {"applied": False, "reason": "update must be an object"}
    receipt = {"applied": True, "hp_delta": 0, "items_added": 0, "items_removed": 0, "quests_changed": 0}
    campaign["turn"] = int(campaign.get("turn", 0)) + 1

    if isinstance(update.get("location"), str) and update["location"].strip():
        campaign["location"] = update["location"].strip()

    if isinstance(update.get("push_state"), str) and update["push_state"].strip():
        campaign.setdefault("state_stack", []).append(update["push_state"].strip())
    if update.get("pop_state") and campaign.get("state_stack"):
        campaign["state_stack"].pop()

    if isinstance(update.get("flags"), dict):
        campaign.setdefault("flags", {}).update({str(k): v for k, v in update["flags"].items()})

    p = campaign.setdefault("player", {})
    try:
        hp_delta = int(update.get("hp_delta", 0))
    except Exception:
        hp_delta = 0
    if hp_delta:
        p["hp"] = max(0, min(int(p.get("hp", 0)) + hp_delta, int(p.get("hp_max", p.get("hp", 0)))))
        receipt["hp_delta"] = hp_delta

    inv = p.setdefault("inventory", [])
    if not isinstance(inv, list):
        inv = []
        p["inventory"] = inv
    for item in update.get("add_items", []) or []:
        item = str(item).strip()
        if item and item not in inv:
            inv.append(item)
            receipt["items_added"] += 1
    for item in update.get("remove_items", []) or []:
        item = str(item).strip()
        if item in inv:
            inv.remove(item)
            receipt["items_removed"] += 1

    for q_upd in update.get("quest_updates", []) or []:
        if not isinstance(q_upd, dict):
            continue
        qid = str(q_upd.get("id") or "").strip()
        title = str(q_upd.get("title") or "").strip()
        qtype = str(q_upd.get("type") or "side").strip() or "side"
        status = str(q_upd.get("status") or "open").strip() or "open"
        if not qid:
            qid = "q_" + re.sub(r"[^a-zA-Z0-9]+", "_", title.lower()).strip("_")[:30]
        found = False
        for q in campaign.setdefault("quests", []):
            if isinstance(q, dict) and q.get("id") == qid:
                q.update({"title": title or q.get("title", qid), "type": qtype, "status": status})
                found = True
                receipt["quests_changed"] += 1
                break
        if not found:
            campaign.setdefault("quests", []).append({"id": qid, "title": title or qid, "type": qtype, "status": status})
            receipt["quests_changed"] += 1
    return receipt


def extract_json_update(text_out: str) -> Tuple[str, Dict[str, Any]]:
    raw = (text_out or "").strip()
    if not raw:
        return "", {}
    update: Dict[str, Any] = {}
    try:
        m = re.search(r"```json\s*(\{.*?\})\s*```", raw, flags=re.S | re.I)
        if not m:
            m = re.search(r"(\{\s*\"update\"\s*:\s*\{.*?\}\s*\})", raw, flags=re.S)
        if m:
            obj = json.loads(m.group(1))
            if isinstance(obj, dict) and isinstance(obj.get("update"), dict):
                update = obj["update"]
            elif isinstance(obj, dict):
                update = obj
            raw = raw[:m.start()].rstrip()
    except Exception:
        update = {}
    return raw, update


def skill_for_action(action: str) -> tuple[str, int, int]:
    a = (action or "").lower()
    if any(k in a for k in ["sneak", "hide", "quiet", "shadow"]):
        return "stealth", 1, 12
    if any(k in a for k in ["inspect", "search", "look", "listen", "notice", "clue"]):
        return "perception", 2, 11
    if any(k in a for k in ["convince", "persuade", "talk", "ask", "question"]):
        return "persuasion", 1, 10
    if any(k in a for k in ["track", "survive", "forest", "trail"]):
        return "survival", 2, 11
    if any(k in a for k in ["study", "rune", "magic", "arcane", "spell"]):
        return "arcana", 0, 12
    if any(k in a for k in ["force", "climb", "lift", "break"]):
        return "athletics", 0, 12
    return "luck", 0, 10


def fallback_turn(campaign: Dict[str, Any], action: str, manual_roll: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Deterministic local DM so v0.1 plays before an AI adapter is connected."""
    action = (action or "").strip()
    if not action:
        raise ValueError("Action cannot be empty.")

    player = campaign.get("player", {})
    skill, default_mod, dc = skill_for_action(action)
    mod = int((player.get("skills", {}) or {}).get(skill, default_mod)) if skill != "luck" else default_mod

    if manual_roll:
        roll = manual_roll
        roll_info = f"{manual_roll.get('label','Manual')} → {manual_roll.get('detail','')} ({manual_roll.get('outcome','ROLLED')})"
        outcome = str(manual_roll.get("outcome", "ROLLED"))
    else:
        r = d20(mod=mod, dc=dc, seed=int(campaign.get("seed", 123)))
        campaign["seed"] = r.seed
        roll = r.__dict__
        roll_info = f"{skill.title()} check → {r.detail} ({r.outcome})"
        outcome = r.outcome

    nodes = retrieve_world_nodes(campaign, action, k=3)
    location = campaign.get("location", "the road")
    node_hint = nodes[0]["title"] if nodes else location

    if "CRITICAL SUCCESS" in outcome:
        effect = "The moment opens like a lantern. You spot the hidden pattern and gain the advantage before danger can answer."
        update = {"flags": {"last_outcome": "critical_success"}}
    elif "SUCCESS" in outcome:
        effect = "Your approach works. The scene shifts in your favor, and one useful detail becomes clear."
        update = {"flags": {"last_outcome": "success"}}
    elif "CRITICAL FAILURE" in outcome:
        effect = "Fate clicks wrong for a heartbeat. Nothing graphic happens, but the hill notices your move and the air tightens."
        update = {"hp_delta": 0, "flags": {"last_outcome": "critical_failure", "hill_noticed": True}}
    else:
        effect = "The attempt does not land cleanly. You still learn something, but the path asks for a different angle."
        update = {"flags": {"last_outcome": "failure"}}

    if "key" in action.lower():
        update.setdefault("quest_updates", []).append({"id": "q_main_1", "title": "Find the missing porch key before midnight", "type": "main", "status": "in-progress"})
    if "lantern" in action.lower():
        update.setdefault("add_items", [])
        if "blue lantern clue" not in player.get("inventory", []):
            update["add_items"].append("blue lantern clue")
    if "hill" in action.lower() or "blackwood" in action.lower():
        update["location"] = "Blackwood Hill Path"

    narrative = (
        f"You choose: {action}\n\n"
        f"{roll_info}.\n\n"
        f"At {location}, the world leans toward **{node_hint}**. {effect}\n\n"
        "A) Press deeper into the mystery.\n"
        "B) Pause and inspect your surroundings.\n"
        "C) Return to a safer threshold and plan your next move."
    )

    log_add(campaign, "player", action)
    receipt = apply_update(campaign, update)
    log_add(campaign, "dm", narrative)
    return {"narrative": narrative, "roll": roll, "update": update, "receipt": receipt, "campaign": campaign}
