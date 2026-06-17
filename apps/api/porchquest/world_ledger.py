from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from .campaigns import now_iso


def _normalize_node(node: Dict[str, Any]) -> Dict[str, Any]:
    node_id = str(node.get("id") or node.get("node_id") or "").strip()
    if not node_id:
        raise ValueError("World node requires id.")
    tags = node.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    facts = node.get("facts") or []
    if isinstance(facts, str):
        facts = [ln.strip("- ").strip() for ln in facts.splitlines() if ln.strip()]
    return {
        "id": node_id,
        "type": str(node.get("type") or node.get("node_type") or "note").strip() or "note",
        "title": str(node.get("title") or node_id).strip(),
        "tags": [str(t).strip() for t in tags if str(t).strip()],
        "summary": str(node.get("summary") or "").strip(),
        "facts": [str(f).strip() for f in facts if str(f).strip()],
        "updated_at": str(node.get("updated_at") or now_iso()),
    }


def apply_world_patch(campaign: Dict[str, Any], patch_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Apply an approved world patch to a campaign state document."""
    patch = patch_obj.get("world_patch", patch_obj)
    if not isinstance(patch, dict):
        return {"applied": False, "reason": "patch must be an object"}

    world = campaign.setdefault("world", {})
    nodes = world.setdefault("nodes", {})
    edges = world.setdefault("edges", [])
    receipt = {"applied": True, "upserted": 0, "deleted": 0, "facts_appended": 0, "edges_added": 0}

    upserts = patch.get("upsert_nodes") or []
    if isinstance(upserts, dict):
        upserts = [upserts]
    for raw in upserts:
        if isinstance(raw, dict):
            node = _normalize_node(raw)
            nodes[node["id"]] = node
            receipt["upserted"] += 1

    deletes = patch.get("delete_nodes") or []
    if isinstance(deletes, str):
        deletes = [deletes]
    for node_id in deletes:
        node_id = str(node_id).strip()
        if node_id and node_id in nodes:
            del nodes[node_id]
            receipt["deleted"] += 1

    appends = patch.get("append_facts") or []
    if isinstance(appends, dict):
        appends = [appends]
    for item in appends:
        if not isinstance(item, dict):
            continue
        node_id = str(item.get("id") or item.get("node_id") or "").strip()
        facts = item.get("facts") or []
        if isinstance(facts, str):
            facts = [ln.strip("- ").strip() for ln in facts.splitlines() if ln.strip()]
        if not node_id or node_id not in nodes:
            continue
        node = nodes[node_id]
        node.setdefault("facts", [])
        for fact in facts:
            fact = str(fact).strip()
            if fact and fact not in node["facts"]:
                node["facts"].append(fact)
                receipt["facts_appended"] += 1
        node["updated_at"] = now_iso()

    new_edges = patch.get("new_edges") or []
    if isinstance(new_edges, dict):
        new_edges = [new_edges]
    existing = {(e.get("from"), e.get("to"), e.get("rel")) for e in edges if isinstance(e, dict)}
    for edge in new_edges:
        if not isinstance(edge, dict):
            continue
        clean = {"from": edge.get("from"), "to": edge.get("to"), "rel": edge.get("rel")}
        key = (clean["from"], clean["to"], clean["rel"])
        if all(key) and key not in existing:
            edges.append(clean)
            existing.add(key)
            receipt["edges_added"] += 1

    return receipt


def retrieve_world_nodes(campaign: Dict[str, Any], query: str, k: int = 6) -> List[Dict[str, Any]]:
    """Small keyword scorer. Replace with embeddings later if desired."""
    world = campaign.get("world", {}) if isinstance(campaign, dict) else {}
    nodes = world.get("nodes", {}) if isinstance(world, dict) else {}
    terms = [t.lower() for t in re.findall(r"[a-zA-Z0-9_'-]+", query or "")]
    scored: list[tuple[int, Dict[str, Any]]] = []
    for node in nodes.values():
        blob = " ".join([
            str(node.get("id", "")), str(node.get("type", "")), str(node.get("title", "")),
            " ".join(node.get("tags", []) or []), str(node.get("summary", "")),
            " ".join(node.get("facts", []) or []),
        ]).lower()
        score = sum(blob.count(t) for t in terms) if terms else 0
        if score or not terms:
            scored.append((score, node))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [n for _, n in scored[: max(0, int(k))]]


def extract_world_patch_json(text: str) -> Optional[Dict[str, Any]]:
    """Extract a world_patch object from tags, fenced json, or trailing JSON."""
    if not text:
        return None

    def try_load(candidate: str) -> Optional[Dict[str, Any]]:
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) and "world_patch" in obj else None
        except Exception:
            return None

    m = re.search(r"<WORLD_PATCH>(.*?)</WORLD_PATCH>", text, flags=re.S | re.I)
    if m:
        obj = try_load(m.group(1).strip())
        if obj:
            return obj

    for m in re.finditer(r"```json\s*(.*?)\s*```", text, flags=re.S | re.I):
        obj = try_load(m.group(1).strip())
        if obj:
            return obj

    start = text.find('{"world_patch"')
    if start >= 0:
        for end in range(len(text), start, -1):
            obj = try_load(text[start:end].strip())
            if obj:
                return obj
    return None
