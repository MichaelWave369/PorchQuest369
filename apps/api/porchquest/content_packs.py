from __future__ import annotations

import json
import os
from datetime import datetime, timezone
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


def _normal_pack(pack_id: str, pack: Dict[str, Any]) -> Dict[str, Any]:
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
    return data


def save_route_pack(pack_id: str, pack: Dict[str, Any]) -> Dict[str, Any]:
    if not _write_enabled():
        raise PermissionError("Route pack writes are disabled. Set PORCHQUEST_ALLOW_PACK_WRITES=1 for trusted local/backend editing.")
    data = _normal_pack(pack_id, pack)
    safe_id = data["id"]
    PACK_DIR.mkdir(parents=True, exist_ok=True)
    path = PACK_DIR / f"{safe_id}.route-pack.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    return {"ok": True, "id": safe_id, "path": f"content-packs/{path.name}", "write_gate": write_gate_status(), "pack": data}


def package_route_pack(pack_id: str, pack: Dict[str, Any]) -> Dict[str, Any]:
    """Return a branch-ready submission package without writing to disk."""
    data = _normal_pack(pack_id, pack)
    safe_id = data["id"]
    now = datetime.now(timezone.utc).isoformat()
    pack_json = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    receipt = {
        "schema": "porchquest.pack_submission_receipt.v1",
        "pack_id": safe_id,
        "title": data.get("title", safe_id),
        "created_at": now,
        "counts": {
            "quests": len(data.get("quests", [])),
            "scenes": len(data.get("scenes", [])),
            "npcs": len(data.get("npcs", [])),
            "rewards": len(data.get("rewards", [])),
            "edges": len(data.get("edges", []))
        },
        "review_steps": [
            "schema-check",
            "claim-boundary-check",
            "playtest-transcript-check",
            "maintainer-approval"
        ]
    }
    receipt_json = json.dumps(receipt, indent=2, ensure_ascii=False) + "\n"
    checklist = "\n".join([
        f"# {data.get('title', safe_id)} Submission Checklist",
        "",
        "- [ ] Schema validation has no blocking errors.",
        "- [ ] All scenes are claim-safe fantasy/adventure content.",
        "- [ ] Playtest transcript has been exported and reviewed.",
        "- [ ] Maintainer approves promotion into reviewed packs.",
        ""
    ])
    return {
        "schema": "porchquest.pack_submission_package.v1",
        "pack_id": safe_id,
        "branch_name": f"content-pack/{safe_id}",
        "write_gate": write_gate_status(),
        "files": [
            {"path": f"content-packs/{safe_id}.route-pack.json", "content": pack_json},
            {"path": f"content-packs/{safe_id}.approval-receipt.json", "content": receipt_json},
            {"path": f"docs/reviews/{safe_id}.md", "content": checklist}
        ],
        "receipt": receipt
    }
