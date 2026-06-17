from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .adventure import adventure_state, ask_npc, camp_rest, complete_finale, draw_encounter, draw_scene, meet_npc, resolve_encounter, resolve_scene
from .ai_adapter import adapter_status, ai_turn, dm_test_turn
from .campaigns import default_campaign, list_campaigns, load_campaign, save_campaign
from .content_packs import list_route_packs, load_route_pack
from .dice import roll_expr
from .dm_engine import fallback_turn
from .questpack import campaign_to_questpack
from .rewards import draw_reward
from .world_ledger import apply_world_patch

app = FastAPI(title="PorchQuest369 API", version="0.8.2")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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


class ClientSyncRequest(BaseModel):
    campaign: Dict[str, Any]


class SceneChoiceRequest(BaseModel):
    choice_index: int = 0


class EncounterResolveRequest(BaseModel):
    skill: Optional[str] = None


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "porchquest369-api", "version": app.version}


@app.get("/api/content-packs")
def content_pack_index() -> Dict[str, Any]:
    return list_route_packs()


@app.get("/api/content-packs/{pack_id}")
def content_pack(pack_id: str) -> Dict[str, Any]:
    try:
        return {"pack": load_route_pack(pack_id)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


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


@app.post("/api/campaigns/{campaign_id}/sync_from_client")
def sync_from_client(campaign_id: str, req: ClientSyncRequest) -> Dict[str, Any]:
    campaign = dict(req.campaign or {})
    if not campaign:
        raise HTTPException(status_code=400, detail="Missing campaign payload.")
    campaign["id"] = campaign_id
    campaign.setdefault("version", 5)
    campaign.setdefault("name", "Lanterns Under Blackwood Hill")
    campaign.setdefault("story_log", [])
    campaign.setdefault("pending_patches", [])
    campaign.setdefault("conditions", [])
    save_campaign(campaign)
    return {"campaign": campaign, "sync": {"ok": True, "source": "client", "campaign_id": campaign_id}}


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


@app.get("/api/campaigns/{campaign_id}/adventure_state")
def get_adventure_state(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        return {"adventure_state": adventure_state(campaign), "campaign": campaign}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/scene/draw")
def api_draw_scene(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = draw_scene(campaign)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/scene/resolve")
def api_resolve_scene(campaign_id: str, req: SceneChoiceRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = resolve_scene(campaign, req.choice_index)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/encounter/draw")
def api_draw_encounter(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = draw_encounter(campaign)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/encounter/resolve")
def api_resolve_encounter(campaign_id: str, req: EncounterResolveRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = resolve_encounter(campaign, req.skill)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/npc/meet")
def api_meet_npc(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = meet_npc(campaign)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/npc/{npc_id}/ask")
def api_ask_npc(campaign_id: str, npc_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = ask_npc(campaign, npc_id)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/camp")
def api_camp_rest(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = camp_rest(campaign)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/finale")
def api_complete_finale(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = complete_finale(campaign)
        save_campaign(campaign)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/reward/draw")
def api_draw_reward(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = draw_reward(campaign)
        save_campaign(campaign)
        return result
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
