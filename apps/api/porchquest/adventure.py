from __future__ import annotations

import random
from typing import Any, Dict, List

from .campaigns import now_iso
from .dice import d20
from .dm_engine import apply_update, log_add


SCENE_CARDS: List[Dict[str, Any]] = [
    {
        "id": "porch_threshold",
        "act": "I",
        "title": "The Porch Threshold",
        "location": "The Infinite Porch",
        "text": "The porch boards knock beneath your boots. Blue lanterns pulse beyond the rail, and Old Joss waits as if he already heard your next question.",
        "choices": [
            {"label": "Search under the loose board", "skill": "perception", "dc": 12, "quest_id": "q_main_1", "reward": "threshold knock clue", "patch": {"type": "append_fact", "node_id": "infinite_porch", "facts": ["The porch boards knock when a key-fragment is close."], "reason": "Scene deck revealed a porch threshold clue."}},
            {"label": "Ask Old Joss what the hill wants", "skill": "persuasion", "dc": 12, "quest_id": "q_mystery_1", "reward": "Old Joss warning", "patch": {"type": "upsert_node", "node": {"id": "old_joss_warning", "title": "Old Joss Warning", "summary": "Keys remember mercy; doors remember lies.", "type": "clue", "tags": ["joss", "door"]}, "reason": "Scene deck recorded Old Joss warning."}},
        ],
    },
    {
        "id": "left_trail",
        "act": "I",
        "title": "The Left Trail",
        "location": "Blackwood Hill",
        "text": "A left-hand trail curls upward through wet fern. Someone small left lantern soot on the stones.",
        "choices": [
            {"label": "Track the lantern soot", "skill": "survival", "dc": 12, "quest_id": "q_side_1", "reward": "apprentice soot clue", "add_items": ["lantern soot sample"], "patch": {"type": "upsert_node", "node": {"id": "left_trail", "title": "The Left Trail", "summary": "A root-laced path where lantern soot marks the apprentice route.", "type": "trail", "tags": ["apprentice", "hill"]}, "reason": "Scene deck established the left trail."}},
            {"label": "Move silently past the black pines", "skill": "stealth", "dc": 13, "quest_id": "q_main_1", "reward": "safe trail marker", "add_items": ["safe trail marker"]},
        ],
    },
    {
        "id": "lantern_maker_window",
        "act": "II",
        "title": "Lantern-Maker's Window",
        "location": "Hill Workshop Ruin",
        "text": "A cracked workshop window glows with a cold blue afterimage. A child-sized handprint shines in ash on the sill.",
        "choices": [
            {"label": "Read the ash handprint", "skill": "arcana", "dc": 13, "quest_id": "q_side_1", "reward": "apprentice handprint clue", "patch": {"type": "upsert_node", "node": {"id": "missing_apprentice", "title": "Missing Apprentice", "summary": "The lantern-maker apprentice left blue ash marks while fleeing uphill.", "type": "npc", "tags": ["apprentice", "rescue"]}, "reason": "Scene deck introduced the apprentice trail."}},
            {"label": "Use the lantern light in the window", "skill": "perception", "dc": 12, "quest_id": "q_main_1", "reward": "key shadow clue"},
        ],
    },
    {
        "id": "memory_door",
        "act": "II",
        "title": "The Door That Keeps Receipts",
        "location": "Blackwood Hill",
        "text": "A door stands alone in the rain. Every drop that touches it becomes handwriting for one breath, then vanishes.",
        "choices": [
            {"label": "Answer the door truthfully", "skill": "persuasion", "dc": 13, "quest_id": "q_mystery_1", "reward": "truthful answer receipt", "patch": {"type": "append_fact", "node_id": "blackwood_hill", "facts": ["Truthful answers weaken the hill doors, while lies feed them."], "reason": "Scene deck tested the memory door."}},
            {"label": "Write down what the door asks", "skill": "arcana", "dc": 14, "quest_id": "q_mystery_1", "reward": "door question receipt", "add_items": ["door question receipt"]},
        ],
    },
    {
        "id": "iron_saint_beneath",
        "act": "III",
        "title": "The Iron Saint Beneath the Hill",
        "location": "Under Blackwood Hill",
        "text": "Below the roots, an iron figure kneels in a chapel of soil. Its chest has a keyhole shaped like a mercy you have not chosen yet.",
        "requires": ["q_main_1"],
        "choices": [
            {"label": "Offer the repaired key-sign", "skill": "perception", "dc": 14, "quest_id": "q_main_1", "reward": "repaired porch key", "add_items": ["repaired porch key"], "patch": {"type": "upsert_node", "node": {"id": "iron_saint", "title": "Iron Saint", "summary": "A buried guardian under Blackwood Hill whose keyhole opens only to mercy and truthful memory.", "type": "guardian", "tags": ["finale", "key"]}, "reason": "Scene deck revealed the Iron Saint."}},
            {"label": "Speak the receipts aloud", "skill": "persuasion", "dc": 14, "quest_id": "q_mystery_1", "reward": "hill truth receipt"},
        ],
    },
]

NPC_CARDS: List[Dict[str, Any]] = [
    {"id": "old_joss", "title": "Old Joss", "role": "Porchkeeper", "vibe": "Kind, evasive, and allergic to simple answers.", "ask": "Old Joss taps his pipe and gives you a rule: take the left trail when the hill asks your name.", "aid": {"quest_id": "q_main_1", "clue": "Old Joss says the missing key answers to mercy, not force.", "add_items": ["Joss left-trail note"]}},
    {"id": "mara_lanternwright", "title": "Mara Lanternwright", "role": "Lantern-maker", "vibe": "Tired hands, bright eyes, refusing to give up on her apprentice.", "ask": "Mara shows you a soot pattern that only appears when the apprentice is alive and nearby.", "aid": {"quest_id": "q_side_1", "clue": "Mara identifies blue ash as the apprentice signal.", "add_items": ["lanternwright ash lens"]}},
    {"id": "nix_understep", "title": "Nix Understep", "role": "Hill-runner", "vibe": "Fast, funny, and very serious about never lying to doors.", "ask": "Nix warns you that every door is hungry for a contradiction.", "aid": {"quest_id": "q_mystery_1", "clue": "Nix knows the doors lose power when a witness writes the truth down.", "add_items": ["Nix door-map scrap"]}},
    {"id": "sister_candle", "title": "Sister Candle", "role": "Candle Court exile", "vibe": "Formal, sorrowful, and secretly rooting for impossible rescues.", "ask": "Sister Candle admits the Candle Court trades in memories, but fears written receipts.", "aid": {"quest_id": "q_mystery_1", "clue": "The Candle Court cannot easily alter witnessed records.", "add_items": ["wax-sealed memory token"]}},
]

ENCOUNTER_CARDS: List[Dict[str, Any]] = [
    {"id": "blue_moth_swarm", "title": "Blue-Fire Moth Swarm", "scene": "A spiral of blue-fire moths forms a living arrow above the wet path.", "danger": "If startled, the swarm marks you with cold sparks that draw hill-watchers.", "skill": "survival", "dc": 12, "reward": "moth-marked trail clue", "quest_id": "q_side_1", "patch": {"type": "upsert_node", "node": {"id": "blue_fire_moth", "title": "Blue-Fire Moth", "summary": "A tiny watcher with flame-blue wings that appears when stealth changes the path.", "type": "creature", "tags": ["encounter", "lantern"]}, "reason": "Encounter card revealed the blue-fire moths."}},
    {"id": "lying_door", "title": "The Lying Door", "scene": "A freestanding door waits between two black pines. Its knob is warm as a living hand.", "danger": "It asks one question and remembers the answer forever.", "skill": "persuasion", "dc": 13, "reward": "door-memory clue", "quest_id": "q_mystery_1", "patch": {"type": "append_fact", "node_id": "blackwood_hill", "facts": ["A freestanding door on the hill tests answers and remembers lies."], "reason": "Encounter card revealed how hill doors behave."}},
    {"id": "porch_key_echo", "title": "Porch Key Echo", "scene": "Something under the boards knocks in the exact rhythm of your heartbeat.", "danger": "The echo can pull a memory loose if you answer too quickly.", "skill": "perception", "dc": 12, "reward": "brass key tooth clue", "quest_id": "q_main_1", "patch": {"type": "upsert_node", "node": {"id": "brass_key_tooth", "title": "Brass Key Tooth", "summary": "A broken piece of a missing porch key. It points toward unresolved truths.", "type": "relic", "tags": ["key", "porch"]}, "reason": "Encounter card surfaced the key mystery."}},
]


def _rng(campaign: Dict[str, Any]) -> random.Random:
    seed = int(campaign.get("seed", 123)) + int(campaign.get("turn", 0))
    return random.Random(seed)


def _quests_by_id(campaign: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {q.get("id", ""): q for q in campaign.get("quests", []) if isinstance(q, dict)}


def _roll_skill(campaign: Dict[str, Any], skill: str, dc: int, label: str) -> Dict[str, Any]:
    player = campaign.get("player", {})
    conditions = set(player.get("conditions") or [])
    mod = int((player.get("skills", {}) or {}).get(skill, 0))
    if "inspired" in conditions:
        mod += 1
    if "tired" in conditions:
        mod -= 1
    if "hidden" in conditions and skill in ("stealth", "perception"):
        mod += 1
    roll = d20(mod=mod, dc=dc, seed=int(campaign.get("seed", 123)))
    campaign["seed"] = roll.seed
    payload = roll.__dict__
    payload["label"] = label
    payload["skill"] = skill
    return payload


def adventure_state(campaign: Dict[str, Any]) -> Dict[str, Any]:
    quests = campaign.get("quests", [])
    by_id = _quests_by_id(campaign)
    all_ready = all((by_id.get(qid, {}).get("progress", 0) or 0) >= (by_id.get(qid, {}).get("max_progress", 3) or 3) for qid in ["q_main_1", "q_side_1", "q_mystery_1"])
    ready = [q for q in quests if q.get("status") in ("ready", "completed") or (q.get("progress", 0) or 0) >= (q.get("max_progress", 3) or 3)]
    if (campaign.get("ending") or {}).get("status") == "complete":
        return {"label": "Starter adventure complete", "detail": (campaign.get("ending") or {}).get("title", "Ending recorded"), "complete": True, "readyFinale": False}
    if all_ready:
        return {"label": "Finale ready", "detail": "All three starter quests have enough clues for the Blackwood Hill finale.", "complete": False, "readyFinale": True}
    if (by_id.get("q_main_1", {}).get("progress", 0) or 0) >= 2:
        return {"label": "Key mystery hot", "detail": "The porch key trail is close. Push one more scene, NPC, or item receipt.", "complete": False, "readyFinale": False}
    if ready:
        return {"label": "One thread ready", "detail": f"{ready[0].get('title', 'A quest')} can be resolved soon.", "complete": False, "readyFinale": False}
    return {"label": "Adventure in motion", "detail": "Gather clues through scenes, encounters, NPCs, and item actions.", "complete": False, "readyFinale": False}


def draw_scene(campaign: Dict[str, Any]) -> Dict[str, Any]:
    quests = _quests_by_id(campaign)
    seen = {entry.get("id") for entry in (campaign.get("scene_log") or [])[-5:] if isinstance(entry, dict)}
    eligible = []
    for scene in SCENE_CARDS:
        reqs = scene.get("requires") or []
        req_ok = all((quests.get(qid, {}).get("progress", 0) or 0) >= max(1, (quests.get(qid, {}).get("max_progress", 3) or 3) - 1) for qid in reqs)
        if req_ok and scene["id"] not in seen:
            eligible.append(scene)
    pool = eligible or [scene for scene in SCENE_CARDS if scene["id"] not in seen] or SCENE_CARDS
    card = dict(_rng(campaign).choice(pool))
    card["drawn_at"] = now_iso()
    campaign["active_scene"] = card
    campaign["location"] = card.get("location", campaign.get("location", "Blackwood Hill"))
    log_add(campaign, "dm", f"Scene drawn: {card['title']}\n\n{card['text']}")
    return {"scene": card, "campaign": campaign}


def resolve_scene(campaign: Dict[str, Any], choice_index: int = 0) -> Dict[str, Any]:
    scene = campaign.get("active_scene")
    if not scene:
        raise ValueError("No active scene to resolve.")
    choices = scene.get("choices") or []
    if choice_index < 0 or choice_index >= len(choices):
        raise ValueError("Invalid scene choice index.")
    choice = choices[choice_index]
    skill = choice.get("skill", "perception")
    roll = _roll_skill(campaign, skill, int(choice.get("dc", 12)), f"{scene.get('title')}: {skill}")
    success = "SUCCESS" in roll.get("outcome", "").upper()
    if success:
        update = {"add_items": choice.get("add_items") or ([choice["reward"]] if choice.get("reward") else []), "quest_updates": [{"id": choice.get("quest_id", "q_main_1"), "progress": 1, "clue": f"{scene.get('title')}: {choice.get('reward') or choice.get('label')}"}], "flags": {f"scene_{scene.get('id')}": True}, "remove_conditions": ["tired"]}
        pending = [choice["patch"]] if choice.get("patch") else []
        text = f"Scene beat cleared: {choice.get('label')}. You gain {choice.get('reward', 'a clue')}; the ledger advances."
    else:
        update = {"hp_delta": -1, "add_conditions": ["watched"]}
        pending = []
        text = f"Scene complication: {choice.get('label')}. The hill resists, HP -1, but the story remains playable."
    apply_update(campaign, update)
    campaign["pending_patches"] = list(campaign.get("pending_patches") or []) + pending
    campaign["scene_log"] = list(campaign.get("scene_log") or []) + [{"id": scene.get("id"), "title": scene.get("title"), "choice": choice.get("label"), "outcome": roll.get("outcome"), "ts": now_iso()}]
    campaign["active_scene"] = None
    log_add(campaign, "player", f"Scene choice: {choice.get('label')}")
    log_add(campaign, "dm", f"{text}\n\nRoll: {roll.get('detail')} · {roll.get('outcome')}")
    return {"narrative": text, "roll": roll, "campaign": campaign}


def draw_encounter(campaign: Dict[str, Any]) -> Dict[str, Any]:
    seen = {entry.get("id") for entry in (campaign.get("encounter_log") or [])[-4:] if isinstance(entry, dict)}
    pool = [card for card in ENCOUNTER_CARDS if card["id"] not in seen] or ENCOUNTER_CARDS
    card = dict(_rng(campaign).choice(pool))
    card["drawn_at"] = now_iso()
    campaign["active_encounter"] = card
    log_add(campaign, "dm", f"Encounter drawn: {card['title']}\n\n{card['scene']}\n\nDanger: {card['danger']}\nChallenge: {card['skill']} vs DC {card['dc']}.")
    return {"encounter": card, "campaign": campaign}


def resolve_encounter(campaign: Dict[str, Any], skill_override: str | None = None) -> Dict[str, Any]:
    encounter = campaign.get("active_encounter")
    if not encounter:
        raise ValueError("No active encounter to resolve.")
    skill = skill_override or encounter.get("skill", "perception")
    roll = _roll_skill(campaign, skill, int(encounter.get("dc", 12)), f"{encounter.get('title')}: {skill}")
    success = "SUCCESS" in roll.get("outcome", "").upper()
    if success:
        update = {"add_items": [encounter.get("reward", "clue")], "quest_updates": [{"id": encounter.get("quest_id", "q_main_1"), "progress": 1, "clue": f"{encounter.get('title')}: {encounter.get('reward', 'clue')}"}], "remove_conditions": ["watched"]}
        pending = [encounter["patch"]] if encounter.get("patch") else []
        text = f"Encounter cleared: {encounter.get('title')}. You gain {encounter.get('reward', 'a clue')}."
    else:
        update = {"hp_delta": -1, "add_conditions": ["marked"]}
        pending = []
        text = f"Encounter complication: {encounter.get('title')}. The danger bites, HP -1, but the trail remains open."
    apply_update(campaign, update)
    campaign["pending_patches"] = list(campaign.get("pending_patches") or []) + pending
    campaign["encounter_log"] = list(campaign.get("encounter_log") or []) + [{"id": encounter.get("id"), "title": encounter.get("title"), "outcome": roll.get("outcome"), "ts": now_iso()}]
    campaign["active_encounter"] = None
    log_add(campaign, "dm", f"{text}\n\nRoll: {roll.get('detail')} · {roll.get('outcome')}")
    return {"narrative": text, "roll": roll, "campaign": campaign}


def meet_npc(campaign: Dict[str, Any]) -> Dict[str, Any]:
    known = set((campaign.get("npcs") or {}).keys())
    pool = [npc for npc in NPC_CARDS if npc["id"] not in known] or NPC_CARDS
    npc = dict(_rng(campaign).choice(pool))
    npc["trust"] = int((campaign.get("npcs") or {}).get(npc["id"], {}).get("trust", 0))
    campaign.setdefault("npcs", {})[npc["id"]] = npc
    campaign["npc_log"] = list(campaign.get("npc_log") or []) + [{"id": npc["id"], "title": npc["title"], "action": "met", "ts": now_iso()}]
    log_add(campaign, "dm", f"NPC card met: {npc['title']}, {npc['role']}.\n\n{npc['vibe']}")
    return {"npc": npc, "campaign": campaign}


def ask_npc(campaign: Dict[str, Any], npc_id: str) -> Dict[str, Any]:
    npcs = campaign.setdefault("npcs", {})
    npc = npcs.get(npc_id) or next((dict(card) for card in NPC_CARDS if card["id"] == npc_id), None)
    if not npc:
        raise ValueError("NPC not found.")
    base = next((card for card in NPC_CARDS if card["id"] == npc_id), npc)
    aid = base.get("aid") or {}
    npc["trust"] = min(5, int(npc.get("trust", 0)) + 1)
    npcs[npc_id] = npc
    apply_update(campaign, {"add_items": aid.get("add_items", []), "quest_updates": [{"id": aid.get("quest_id"), "progress": 1, "clue": aid.get("clue")}] if aid.get("quest_id") else [], "npcs": {npc_id: npc}, "add_conditions": ["inspired"]})
    campaign["npc_log"] = list(campaign.get("npc_log") or []) + [{"id": npc_id, "title": npc.get("title"), "action": "asked for help", "ts": now_iso()}]
    log_add(campaign, "player", f"Ask {npc.get('title')} for help")
    log_add(campaign, "dm", f"{base.get('ask', npc.get('vibe', 'They help as best they can.'))}\n\nTrust +1. {aid.get('clue', '')}")
    return {"npc": npc, "campaign": campaign}


def camp_rest(campaign: Dict[str, Any]) -> Dict[str, Any]:
    state = adventure_state(campaign)
    conditions = set((campaign.get("player") or {}).get("conditions") or [])
    heal = 1 if campaign.get("flags", {}).get("rested_this_scene") else 2
    update = {"hp_delta": heal, "flags": {"rested_once": True, "rested_this_scene": True, "trail_kit_ready": False}, "remove_conditions": ["tired", "marked"], "add_conditions": ["inspired"] if "tired" in conditions else []}
    apply_update(campaign, update)
    log_add(campaign, "dm", f"Camp action: You make a small safe circle of light, food, and receipts. HP +{heal}.\n\nAdventure state: {state['label']}. {state['detail']}")
    return {"camp": {"healed": heal, "state": state}, "campaign": campaign}


def complete_finale(campaign: Dict[str, Any]) -> Dict[str, Any]:
    state = adventure_state(campaign)
    full_clear = bool(state.get("readyFinale"))
    title = "The Porch Key Opens With Mercy" if full_clear else "A Partial Dawn on Blackwood Hill"
    ending_text = "With the key repaired, the apprentice found, and the door-truth written down, Blackwood Hill releases its grip. The porch becomes a way home instead of a trap." if full_clear else "You do not solve every mystery tonight, but you carry enough truth to keep the porch open and return stronger."
    for q in campaign.get("quests", []):
        if full_clear or (q.get("progress", 0) or 0) >= (q.get("max_progress", 3) or 3):
            q["status"] = "completed"
    campaign["ending"] = {"status": "complete", "title": title, "completed_at": now_iso(), "full_clear": full_clear}
    campaign.setdefault("flags", {})["adventure_complete"] = True
    apply_update(campaign, {"remove_conditions": ["watched", "marked", "tired"], "add_conditions": ["inspired"]})
    log_add(campaign, "dm", f"Finale: {title}\n\n{ending_text}")
    return {"ending": campaign["ending"], "campaign": campaign}
