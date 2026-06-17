from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = ROOT / "content-packs"
WRITE_ENV = "PORCHQUEST_ALLOW_PACK_WRITES"


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isalnum() or ch in "-_")[:80] or "route-pack"


def _pack_files() -> List[Path]:
    if not PACK_DIR.exists():
        return []
    return sorted(PACK_DIR.glob("*.route-pack.json"))[:50]


def _read_pack(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("Content pack must be a JSON object.")
    return data


def _write_enabled() -> bool:
    return os.getenv(WRITE_ENV, "").strip().lower() in {"1", "true", "yes", "on"}


def write_gate_status() -> Dict[str, Any]:
    return {
        "enabled": _write_enabled(),
        "env": WRITE_ENV,
        "message": "Reviewed pack writes require PORCHQUEST_ALLOW_PACK_WRITES=1."
    }


def list_route_packs() -> Dict[str, Any]:
    packs = []
    for path in _pack_files():
        try:
            data = _read_pack(path)
            packs.append({
                "id": str(data.get("id") or path.stem.replace(".route-pack", "")),
                "title": str(data.get("title") or path.stem),
                "summary": str(data.get("summary") or ""),
                "path": f"content-packs/{path.name}"
            })
        except Exception:
            continue
    return {"schema": "porchquest.reviewed_pack_index.v1", "write_gate": write_gate_status(), "packs": packs}


def load_route_pack(pack_id: str) -> Dict[str, Any]:
    safe_id = _safe_id(pack_id)
    for path in _pack_files():
        data = _read_pack(path)
        data_id = str(data.get("id") or "")
        if data_id == safe_id or path.name == f"{safe_id}.route-pack.json":
            return data
    raise FileNotFoundError(f"Route pack not found: {pack_id}")


def save_route_pack(pack_id: str, pack: Dict[str, Any]) -> Dict[str, Any]:
    if not _write_enabled():
        raise PermissionError("Route pack writes are disabled. Set PORCHQUEST_ALLOW_PACK_WRITES=1 for trusted local/backend editing.")
    if not isinstance(pack, dict):
        raise ValueError("Route pack payload must be an object.")
    safe_id = _safe_id(pack_id or str(pack.get("id") or "route-pack"))
    data = dict(pack)
    data["schema"] = str(data.get("schema") or "porchquest.route_pack.v1")
    data["id"] = safe_id
    data.setdefault("title", safe_id.replace("-", " ").replace("_", " ").title())
    data.setdefault("summary", "Saved route pack.")
    for key in ("quests", "scenes", "npcs", "rewards", "edges"):
        if not isinstance(data.get(key), list):
            data[key] = []
    PACK_DIR.mkdir(parents=True, exist_ok=True)
    path = PACK_DIR / f"{safe_id}.route-pack.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    return {"ok": True, "id": safe_id, "path": f"content-packs/{path.name}", "write_gate": write_gate_status(), "pack": data}
