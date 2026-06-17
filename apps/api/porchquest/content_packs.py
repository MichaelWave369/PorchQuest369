from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = ROOT / "content-packs"


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
    return {"schema": "porchquest.reviewed_pack_index.v1", "packs": packs}


def load_route_pack(pack_id: str) -> Dict[str, Any]:
    safe_id = "".join(ch for ch in pack_id if ch.isalnum() or ch in "-_")[:80]
    for path in _pack_files():
        data = _read_pack(path)
        data_id = str(data.get("id") or "")
        if data_id == safe_id or path.name == f"{safe_id}.route-pack.json":
            return data
    raise FileNotFoundError(f"Route pack not found: {pack_id}")
