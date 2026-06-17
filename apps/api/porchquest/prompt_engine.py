from __future__ import annotations

from typing import Any, Dict, List

from .world_ledger import retrieve_world_nodes

DM_SYSTEM_PROMPT = """
You are the PorchQuest369 Dungeon Master inside a prompt RPG app.
Run a single-player, choice-driven fantasy adventure.
Keep content PG-13: no gore, no sexual content, no hate.
Be vivid but concise. Track inventory, quests, HP, location, flags, and state stack.
If combat happens, keep it abstract and non-graphic.

OUTPUT FORMAT:
1) Narrative, 2-8 short paragraphs.
2) End with exactly three options labeled A), B), C) as actionable next moves.
3) Then include a JSON block in a ```json fence with this structure:
{"update": {"location": "...", "hp_delta": 0, "add_items": [], "remove_items": [], "quest_updates": [], "push_state": "", "pop_state": false, "flags": {}}}
Only include keys you are changing. Do not include any other JSON outside the fenced block.
""".strip()

WORLD_PATCH_CONTRACT = """
WORLD LEDGER:
If new durable canon should be proposed, include a separate object like:
{"world_patch":{"upsert_nodes":[],"append_facts":[],"delete_nodes":[],"new_edges":[]}}
The app should ask the player to approve world patches before applying them.
""".strip()

STORY_MODE_CONTRACT = """
STORY MODE:
Write immersive narrative. Offer 3 numbered choices at the end when appropriate.
""".strip()

GAME_MODE_CONTRACT = """
GAME MODE:
Offer concise choices, rolls, and next actions when appropriate.
""".strip()


def build_messages(campaign: Dict[str, Any], action: str, roll_info: str = "", story_mode: bool = True, game_mode: bool = True) -> List[Dict[str, str]]:
    p = campaign.get("player", {})
    nodes = retrieve_world_nodes(campaign, f"{campaign.get('location','')} {action}", k=6)
    world_block = "\n".join([
        f"[{n.get('id')}] {n.get('title')} ({n.get('type')}): {n.get('summary')} | facts: {'; '.join(n.get('facts', [])[:5])}"
        for n in nodes
    ]) or "(none)"

    system_parts = [DM_SYSTEM_PROMPT, WORLD_PATCH_CONTRACT]
    if story_mode:
        system_parts.append(STORY_MODE_CONTRACT)
    if game_mode:
        system_parts.append(GAME_MODE_CONTRACT)

    context = f"""
CAMPAIGN_NAME: {campaign.get('campaign_name','')}
SETTING: {campaign.get('setting','')}
TONE: {campaign.get('tone','')}
LOCATION: {campaign.get('location','')}
STATE_STACK: {campaign.get('state_stack', [])}
PLAYER: {p}
QUESTS: {campaign.get('quests', [])}
RECENT_ROLL: {roll_info or '(none)'}
WORLD_NODES:
{world_block}
""".strip()

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": "\n\n".join(system_parts)},
        {"role": "user", "content": context},
    ]
    for item in (campaign.get("log") or [])[-12:]:
        role = item.get("role")
        content = item.get("content", "")
        if role == "dm":
            messages.append({"role": "assistant", "content": content})
        elif role == "player":
            messages.append({"role": "user", "content": content})
    messages.append({"role": "user", "content": f"PLAYER_ACTION: {action.strip()}"})
    return messages
