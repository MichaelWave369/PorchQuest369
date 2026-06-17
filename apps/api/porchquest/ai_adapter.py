from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from .dice import d20
from .dm_engine import apply_update, extract_json_update, log_add, skill_for_action
from .prompt_engine import build_messages
from .world_ledger import extract_world_patch_json


SUPPORTED_BACKENDS = {"local", "openai_compat"}
MAX_NARRATIVE_CHARS = 5000
ALLOWED_UPDATE_KEYS = {"location", "push_state", "pop_state", "flags", "hp_delta", "add_items", "remove_items", "quest_updates"}


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or default).strip()


def adapter_status() -> Dict[str, Any]:
    """Return safe, non-secret adapter status for the UI/API."""
    backend = _env("PORCHQUEST_DM_BACKEND", "local").lower()
    if backend not in SUPPORTED_BACKENDS:
        backend = "local"

    base_url = _env("PORCHQUEST_OPENAI_COMPAT_BASE_URL")
    model = _env("PORCHQUEST_OPENAI_COMPAT_MODEL")
    has_key = bool(_env("PORCHQUEST_OPENAI_COMPAT_API_KEY"))
    configured = backend == "openai_compat" and bool(base_url and model and has_key)

    return {
        "backend": backend,
        "configured": configured,
        "mode": "ai" if configured else "local_fallback",
        "model": model if configured else "deterministic-browser-or-local-dm",
        "base_url_set": bool(base_url),
        "api_key_set": has_key,
    }


def _post_json(url: str, payload: Dict[str, Any], headers: Dict[str, str], timeout: float = 45.0) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw or "{}")


def _openai_compat_chat(messages: List[Dict[str, str]]) -> str:
    base_url = _env("PORCHQUEST_OPENAI_COMPAT_BASE_URL").rstrip("/")
    model = _env("PORCHQUEST_OPENAI_COMPAT_MODEL")
    api_key = _env("PORCHQUEST_OPENAI_COMPAT_API_KEY")
    if not (base_url and model and api_key):
        raise RuntimeError("OpenAI-compatible DM adapter is not fully configured.")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": float(_env("PORCHQUEST_DM_TEMPERATURE", "0.7")),
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    response = _post_json(f"{base_url}/v1/chat/completions", payload, headers=headers)
    choices = response.get("choices") or []
    if not choices:
        raise RuntimeError("DM adapter returned no choices.")
    message = (choices[0] or {}).get("message") or {}
    content = message.get("content") or choices[0].get("text") or ""
    if not content.strip():
        raise RuntimeError("DM adapter returned empty content.")
    return str(content)


def _roll_for_action(campaign: Dict[str, Any], action: str, manual_roll: Optional[Dict[str, Any]]) -> tuple[Dict[str, Any], str]:
    player = campaign.get("player", {})
    skill, default_mod, dc = skill_for_action(action)
    mod = int((player.get("skills", {}) or {}).get(skill, default_mod)) if skill != "luck" else default_mod

    if manual_roll:
        roll = dict(manual_roll)
        roll_info = f"{roll.get('label', 'Manual roll')} -> {roll.get('detail', '')} ({roll.get('outcome', 'ROLLED')})"
        return roll, roll_info

    result = d20(mod=mod, dc=dc, seed=int(campaign.get("seed", 123)))
    campaign["seed"] = result.seed
    roll = result.__dict__
    roll["label"] = f"{skill.title()} Check"
    roll_info = f"{skill.title()} check -> {result.detail} ({result.outcome})"
    return roll, roll_info


def _clean_text(value: Any, limit: int = 160) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit]


def sanitize_update(update: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
    """Keep model updates small and inside the game-state contract."""
    if not isinstance(update, dict):
        return {}, ["ignored non-object update"]

    clean: Dict[str, Any] = {}
    warnings: List[str] = []
    for key, value in update.items():
        if key not in ALLOWED_UPDATE_KEYS:
            warnings.append(f"ignored unsupported update key: {key}")
            continue

        if key in {"location", "push_state"} and isinstance(value, str):
            clean[key] = _clean_text(value, 120)
        elif key == "pop_state":
            clean[key] = bool(value)
        elif key == "flags" and isinstance(value, dict):
            clean[key] = {str(k)[:80]: v for k, v in value.items() if isinstance(k, str)}
        elif key == "hp_delta":
            try:
                clean[key] = max(-20, min(20, int(value)))
            except Exception:
                warnings.append("ignored invalid hp_delta")
        elif key in {"add_items", "remove_items"}:
            values = value if isinstance(value, list) else []
            clean[key] = [_clean_text(item, 80) for item in values[:20] if _clean_text(item, 80)]
        elif key == "quest_updates":
            values = value if isinstance(value, list) else []
            quests = []
            for item in values[:20]:
                if not isinstance(item, dict):
                    continue
                title = _clean_text(item.get("title") or item.get("id"), 140)
                qid = _clean_text(item.get("id") or title.lower().replace(" ", "_"), 80)
                if not qid:
                    continue
                quests.append({
                    "id": qid,
                    "title": title or qid,
                    "type": _clean_text(item.get("type") or "side", 40),
                    "status": _clean_text(item.get("status") or "open", 40),
                })
            clean[key] = quests

    return clean, warnings


def _stable_patch_id(prefix: str, raw: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", raw).strip("_").lower()[:60] or "patch"
    return f"{prefix}_{slug}"


def world_patch_to_pending_patches(raw: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert a model world_patch into UI Canon Queue cards."""
    if not isinstance(raw, dict):
        return []
    patch = raw.get("world_patch", raw)
    if not isinstance(patch, dict):
        return []

    out: List[Dict[str, Any]] = []

    upserts = patch.get("upsert_nodes") or []
    if isinstance(upserts, dict):
        upserts = [upserts]
    for node in upserts[:20]:
        if not isinstance(node, dict):
            continue
        node_id = _clean_text(node.get("id") or node.get("node_id") or node.get("title"), 80)
        if not node_id:
            continue
        title = _clean_text(node.get("title") or node_id, 120)
        summary = _clean_text(node.get("summary") or "", 300)
        out.append({
            "id": _stable_patch_id("upsert", node_id),
            "type": "upsert_node",
            "node": {
                "id": node_id,
                "title": title,
                "summary": summary,
                "type": _clean_text(node.get("type") or node.get("node_type") or "note", 40),
                "tags": [str(t).strip() for t in (node.get("tags") or [])[:12]] if isinstance(node.get("tags"), list) else [],
                "facts": [str(f).strip() for f in (node.get("facts") or [])[:20]] if isinstance(node.get("facts"), list) else [],
            },
            "reason": _clean_text(raw.get("reason") or "AI DM proposed this world node.", 220),
        })

    appends = patch.get("append_facts") or []
    if isinstance(appends, dict):
        appends = [appends]
    for item in appends[:20]:
        if not isinstance(item, dict):
            continue
        node_id = _clean_text(item.get("id") or item.get("node_id"), 80)
        facts = item.get("facts") or []
        if isinstance(facts, str):
            facts = [facts]
        facts = [_clean_text(fact, 220) for fact in facts[:12] if _clean_text(fact, 220)]
        if not node_id or not facts:
            continue
        out.append({
            "id": _stable_patch_id("fact", f"{node_id}_{'_'.join(facts)}"),
            "type": "append_fact",
            "node_id": node_id,
            "facts": facts,
            "title": f"Add fact to {node_id}",
            "summary": " ".join(facts)[:300],
            "reason": _clean_text(raw.get("reason") or "AI DM proposed this fact update.", 220),
        })

    edges = patch.get("new_edges") or []
    if isinstance(edges, dict):
        edges = [edges]
    for edge in edges[:20]:
        if not isinstance(edge, dict):
            continue
        from_id = _clean_text(edge.get("from"), 80)
        to_id = _clean_text(edge.get("to"), 80)
        rel = _clean_text(edge.get("rel") or "related", 80)
        if not from_id or not to_id:
            continue
        out.append({
            "id": _stable_patch_id("edge", f"{from_id}_{rel}_{to_id}"),
            "type": "new_edge",
            "edge": {"from": from_id, "to": to_id, "rel": rel},
            "title": f"{from_id} -> {to_id}",
            "summary": rel,
            "reason": _clean_text(raw.get("reason") or "AI DM proposed this world relationship.", 220),
        })

    return out


def validate_ai_output(raw_text: str) -> tuple[str, Dict[str, Any], Optional[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    warnings: List[str] = []
    narrative, update = extract_json_update(raw_text)
    if not narrative.strip():
        narrative = raw_text.strip()
    if len(narrative) > MAX_NARRATIVE_CHARS:
        narrative = narrative[:MAX_NARRATIVE_CHARS] + "\n\n[Trimmed by PorchQuest369 guardrail.]"
        warnings.append("narrative trimmed")

    clean_update, update_warnings = sanitize_update(update if isinstance(update, dict) else {})
    warnings.extend(update_warnings)

    world_patch = extract_world_patch_json(raw_text)
    pending_patches = world_patch_to_pending_patches(world_patch)
    if world_patch and not pending_patches:
        warnings.append("world_patch detected but no supported canon cards were found")

    return narrative, clean_update, world_patch, pending_patches, warnings


def ai_turn(campaign: Dict[str, Any], action: str, manual_roll: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Resolve a turn through a configured model adapter.

    Returns None when no AI adapter is configured, allowing callers to use the
    deterministic fallback DM. Secrets stay server-side through environment variables.
    """
    status = adapter_status()
    if not status.get("configured"):
        return None

    action = (action or "").strip()
    if not action:
        raise ValueError("Action cannot be empty.")

    roll, roll_info = _roll_for_action(campaign, action, manual_roll)
    messages = build_messages(campaign, action, roll_info=roll_info, story_mode=True, game_mode=True)

    try:
        raw_text = _openai_compat_chat(messages)
    except (urllib.error.URLError, TimeoutError, RuntimeError, ValueError) as exc:
        raise RuntimeError(f"AI DM adapter failed: {exc}") from exc

    narrative, update, world_patch, pending_patches, warnings = validate_ai_output(raw_text)
    if pending_patches:
        campaign.setdefault("pending_patches", []).extend(pending_patches)
        narrative += f"\n\nCanon proposals: {len(pending_patches)} AI world update{'s' if len(pending_patches) != 1 else ''} waiting for approval."
    if warnings:
        narrative += "\n\nDM guardrails: " + "; ".join(warnings) + "."

    log_add(campaign, "player", action)
    receipt = apply_update(campaign, update)
    log_add(campaign, "dm", narrative)

    return {
        "narrative": narrative,
        "roll": roll,
        "update": update,
        "receipt": receipt,
        "world_patch": world_patch,
        "pending_patches": pending_patches,
        "warnings": warnings,
        "dm_backend": status,
        "campaign": campaign,
    }


def dm_test_turn(action: str = "Connection test: describe the porch in one sentence.") -> Dict[str, Any]:
    """Small non-persistent adapter test used by the UI."""
    status = adapter_status()
    if not status.get("configured"):
        return {
            "ok": True,
            "dm": status,
            "message": "No AI adapter configured. Local/browser fallback is ready.",
            "fallback_ready": True,
        }

    demo_campaign = {
        "id": "dm-test",
        "campaign_name": "Lanterns Under Blackwood Hill",
        "location": "The Infinite Porch",
        "turn": 0,
        "seed": 123,
        "player": {"name": "Tester", "skills": {"perception": 2}, "inventory": []},
        "world": {"nodes": {"infinite_porch": {"id": "infinite_porch", "title": "The Infinite Porch", "summary": "A threshold between worlds."}}, "edges": []},
        "quests": [],
        "flags": {},
        "log": [],
        "pending_patches": [],
    }
    result = ai_turn(demo_campaign, action)
    return {
        "ok": bool(result),
        "dm": status,
        "message": "AI adapter responded.",
        "narrative_preview": (result or {}).get("narrative", "")[:500],
        "pending_patches": (result or {}).get("pending_patches", []),
        "warnings": (result or {}).get("warnings", []),
    }
