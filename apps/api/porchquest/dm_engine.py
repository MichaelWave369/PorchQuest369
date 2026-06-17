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


def _condition_list(campaign: Dict[str, Any]) -> list[str]:
    player = campaign.setdefault("player", {})
    conditions = player.setdefault("conditions", [])
    if not isinstance(conditions, list):
        conditions = []
        player["conditions"] = conditions
    return conditions


def apply_conditions(campaign: Dict[str, Any], add: list[Any] | None = None, remove: list[Any] | None = None) -> Dict[str, int]:
    conditions = _condition_list(campaign)
    current = list(dict.fromkeys(str(c).strip() for c in conditions if str(c).strip()))
    before = set(current)
    remove_set = {str(c).strip() for c in (remove or []) if str(c).strip()}
    current = [c for c in current if c not in remove_set]
    for item in add or []:
        text = str(item).strip().lower().replace(" ", "_")
        if text and text not in current:
            current.append(text)
    campaign.setdefault("player", {})["conditions"] = current[:12]
    after = set(current)
    return {"added": len(after - before), "removed": len(before - after)}


def _merge_quest_update(campaign: Dict[str, Any], q_upd: Dict[str, Any]) -> bool:
    qid = str(q_upd.get("id") or "").strip()
    title = str(q_upd.get("title") or "").strip()
    qtype = str(q_upd.get("type") or "side").strip() or "side"
    status = str(q_upd.get("status") or "").strip()
    if not qid:
        qid = "q_" + re.sub(r"[^a-zA-Z0-9]+", "_", title.lower()).strip("_")[:30]
    if not qid:
        return False

    quests = campaign.setdefault("quests", [])
    found = None
    for q in quests:
        if isinstance(q, dict) and q.get("id") == qid:
            found = q
            break
    if found is None:
        found = {"id": qid, "title": title or qid, "type": qtype, "status": "open", "progress": 0, "max_progress": 3, "clues": []}
        quests.append(found)

    if title:
        found["title"] = title
    if qtype:
        found["type"] = qtype
    if status:
        found["status"] = status
    found["progress"] = max(0, int(found.get("progress") or 0) + int(q_upd.get("progress") or 0))
    found["max_progress"] = max(1, int(q_upd.get("max_progress") or found.get("max_progress") or 3))
    clues = list(found.get("clues") or [])
    if q_upd.get("clue"):
        clues.append(str(q_upd["clue"])[:160])
    for clue in q_upd.get("clues") or []:
        clues.append(str(clue)[:160])
    found["clues"] = list(dict.fromkeys(clues))[-10:]
    if found["progress"] >= found["max_progress"] and found.get("status", "open") == "open":
        found["status"] = "ready"
    return True


def apply_update(campaign: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(update, dict):
        return {"applied": False, "reason": "update must be an object"}
    receipt = {"applied": True, "hp_delta": 0, "items_added": 0, "items_removed": 0, "quests_changed": 0, "conditions_added": 0, "conditions_removed": 0}
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

    condition_receipt = apply_conditions(campaign, update.get("add_conditions") or [], update.get("remove_conditions") or [])
    receipt["conditions_added"] = condition_receipt["added"]
    receipt["conditions_removed"] = condition_receipt["removed"]

    if isinstance(update.get("npcs"), dict):
        campaign.setdefault("npcs", {}).update(update["npcs"])

    for q_upd in update.get("quest_updates", []) or []:
        if isinstance(q_upd, dict) and _merge_quest_update(campaign, q_upd):
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
    """Deterministic local DM so the game plays before an AI adapter is connected."""
    action = (action or "").strip()
    if not action:
        raise ValueError("Action cannot be empty.")

    player = campaign.get("player", {})
    skill, default_mod, dc = skill_for_action(action)
    condition_bonus = 1 if "inspired" in (player.get("conditions") or []) else 0
    condition_penalty = 1 if "tired" in (player.get("conditions") or []) else 0
    mod = (int((player.get("skills", {}) or {}).get(skill, default_mod)) if skill != "luck" else default_mod) + condition_bonus - condition_penalty

    if manual_roll:
        roll = manual_roll
        roll_info = f"{manual_roll.get('label','Manual')} -> {manual_roll.get('detail','')} ({manual_roll.get('outcome','ROLLED')})"
        outcome = str(manual_roll.get("outcome", "ROLLED"))
    else:
        r = d20(mod=mod, dc=dc, seed=int(campaign.get("seed", 123)))
        campaign["seed"] = r.seed
        roll = r.__dict__
        roll_info = f"{skill.title()} check -> {r.detail} ({r.outcome})"
        outcome = r.outcome

    nodes = retrieve_world_nodes(campaign, action, k=3)
    location = campaign.get("location", "the road")
    node_hint = nodes[0]["title"] if nodes else location

    if "CRITICAL SUCCESS" in outcome:
        effect = "The moment opens like a lantern. You spot the hidden pattern and gain the advantage before danger can answer."
        update = {"flags": {"last_outcome": "critical_success"}, "add_conditions": ["inspired"], "remove_conditions": ["tired"]}
    elif "SUCCESS" in outcome:
        effect = "Your approach works. The scene shifts in your favor, and one useful detail becomes clear."
        update = {"flags": {"last_outcome": "success"}}
    elif "CRITICAL FAILURE" in outcome:
        effect = "Fate clicks wrong for a heartbeat. Nothing graphic happens, but the hill notices your move and the air tightens."
        update = {"hp_delta": 0, "flags": {"last_outcome": "critical_failure", "hill_noticed": True}, "add_conditions": ["watched"]}
    else:
        effect = "The attempt does not land cleanly. You still learn something, but the path asks for a different angle."
        update = {"flags": {"last_outcome": "failure"}, "add_conditions": ["tired"] if "tired" not in (player.get("conditions") or []) else []}

    if "key" in action.lower():
        update.setdefault("quest_updates", []).append({"id": "q_main_1", "title": "Find the missing porch key before midnight", "type": "main", "status": "open", "progress": 1, "clue": "A key-sign responded during the turn."})
    if "lantern" in action.lower():
        update.setdefault("add_items", [])
        if "blue lantern clue" not in player.get("inventory", []):
            update["add_items"].append("blue lantern clue")
    if "door" in action.lower() or "lie" in action.lower() or "memory" in action.lower():
        update.setdefault("quest_updates", []).append({"id": "q_mystery_1", "progress": 1, "clue": "The hill reacts to witnessed truth."})
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
