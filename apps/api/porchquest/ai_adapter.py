from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from .dice import d20
from .dm_engine import apply_update, extract_json_update, log_add, skill_for_action
from .prompt_engine import build_messages
from .world_ledger import extract_world_patch_json


SUPPORTED_BACKENDS = {"local", "openai_compat"}


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

    narrative, update = extract_json_update(raw_text)
    if not narrative.strip():
        narrative = raw_text.strip()
    if not isinstance(update, dict):
        update = {}

    world_patch = extract_world_patch_json(raw_text)
    if world_patch:
        campaign.setdefault("pending_world_patches", []).append(world_patch)

    log_add(campaign, "player", action)
    receipt = apply_update(campaign, update)
    log_add(campaign, "dm", narrative)

    return {
        "narrative": narrative,
        "roll": roll,
        "update": update,
        "receipt": receipt,
        "world_patch": world_patch,
        "dm_backend": status,
        "campaign": campaign,
    }
