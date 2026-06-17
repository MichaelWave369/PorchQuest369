from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .ai_adapter import adapter_status, ai_turn, dm_test_turn
from .campaigns import default_campaign, list_campaigns, load_campaign, save_campaign
from .dice import roll_expr
from .dm_engine import fallback_turn
from .questpack import campaign_to_questpack
from .world_ledger import apply_world_patch

app = FastAPI(title="PorchQuest369 API", version="0.3.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateCampaignRequest(BaseModel):
    player_name: str = "Mikey"
    campaign_name: str = "Lanterns Under Blackwood Hill"


class TurnRequest(BaseModel):
    action: str = Field(..., min_length=1)
    manual_roll: Optional[Dict[str, Any]] = None
    allow_ai: bool = True


class DmTestRequest(BaseModel):
    action: str = "Connection test: describe the porch in one sentence."


class RollRequest(BaseModel):
    expr: str = "1d20"
    dc: Optional[int] = None
    label: str = "Roll"


class WorldPatchRequest(BaseModel):
    world_patch: Dict[str, Any]


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "porchquest369-api", "version": app.version}


@app.get("/api/dm/status")
def dm_status() -> Dict[str, Any]:
    return {"dm": adapter_status()}


@app.post("/api/dm/test")
def dm_test(req: DmTestRequest) -> Dict[str, Any]:
    try:
        return dm_test_turn(req.action)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/campaigns")
def campaigns() -> Dict[str, Any]:
    return {"campaigns": list_campaigns()}


@app.post("/api/campaigns")
def create_campaign(req: CreateCampaignRequest) -> Dict[str, Any]:
    campaign = default_campaign(player_name=req.player_name, campaign_name=req.campaign_name)
    save_campaign(campaign)
    return {"campaign": campaign}


@app.get("/api/campaigns/{campaign_id}")
def get_campaign(campaign_id: str) -> Dict[str, Any]:
    try:
        return {"campaign": load_campaign(campaign_id)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/turn")
def turn(campaign_id: str, req: TurnRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = ai_turn(campaign, req.action, req.manual_roll) if req.allow_ai else None
        if result is None:
            result = fallback_turn(campaign, req.action, req.manual_roll)
            result["dm_backend"] = adapter_status()
        save_campaign(result["campaign"])
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/roll")
def roll(campaign_id: str, req: RollRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = roll_expr(req.expr, dc=req.dc, seed=int(campaign.get("seed", 123)))
        campaign["seed"] = result.seed
        save_campaign(campaign)
        payload = result.__dict__
        payload["label"] = req.label
        return {"roll": payload, "campaign": campaign}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/world_patch")
def world_patch(campaign_id: str, req: WorldPatchRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        receipt = apply_world_patch(campaign, {"world_patch": req.world_patch})
        save_campaign(campaign)
        return {"receipt": receipt, "campaign": campaign}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/campaigns/{campaign_id}/questpack")
def questpack(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        return {"questpack": campaign_to_questpack(campaign)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
