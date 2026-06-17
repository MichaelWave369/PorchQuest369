from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .adventure import adventure_state, ask_npc, camp_rest, complete_finale, draw_encounter, draw_scene, meet_npc, resolve_encounter, resolve_scene
from .ai_adapter import adapter_status, ai_turn, dm_test_turn
from .campaigns import default_campaign, list_campaigns, load_campaign, save_campaign
from .content_packs import list_route_packs, load_route_pack, package_route_pack, save_route_pack
from .dice import roll_expr
from .dm_engine import fallback_turn
from .questpack import campaign_to_questpack
from .rewards import draw_reward
from .world_ledger import apply_world_patch

app = FastAPI(title="PorchQuest369 API", version="0.8.5")
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


class RoutePackSaveRequest(BaseModel):
    pack: Dict[str, Any]


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


@app.post("/api/content-packs/{pack_id}/save")
def save_content_pack(pack_id: str, req: RoutePackSaveRequest) -> Dict[str, Any]:
    try:
        return {"saved": save_route_pack(pack_id, req.pack)}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/content-packs/{pack_id}/submission-package")
def submission_package(pack_id: str, req: RoutePackSaveRequest) -> Dict[str, Any]:
    try:
        return {"package": package_route_pack(pack_id, req.pack)}
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
    save_campaign(campaign)
    return {"campaign": campaign, "synced": True}


@app.post("/api/campaigns/{campaign_id}/reward/draw")
def campaign_reward(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = draw_reward(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "reward": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/turn")
def run_turn(campaign_id: str, req: TurnRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = ai_turn(campaign, req.action) if req.allow_ai else fallback_turn(campaign, req.action, req.manual_roll)
        save_campaign(campaign)
        return {"campaign": campaign, "turn": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/roll")
def roll(campaign_id: str, req: RollRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = roll_expr(req.expr, dc=req.dc, label=req.label)
        campaign.setdefault("roll_log", []).insert(0, result)
        campaign["roll_log"] = campaign["roll_log"][:20]
        save_campaign(campaign)
        return {"campaign": campaign, "roll": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/world_patch")
def world_patch(campaign_id: str, req: WorldPatchRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = apply_world_patch(campaign, req.world_patch)
        save_campaign(campaign)
        return {"campaign": campaign, "world_patch": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/campaigns/{campaign_id}/questpack")
def questpack(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        return campaign_to_questpack(campaign)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/campaigns/{campaign_id}/adventure_state")
def api_adventure_state(campaign_id: str) -> Dict[str, Any]:
    try:
        return {"adventure": adventure_state(load_campaign(campaign_id))}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/scene/draw")
def api_draw_scene(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        scene = draw_scene(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "scene": scene}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/scene/resolve")
def api_resolve_scene(campaign_id: str, req: SceneChoiceRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = resolve_scene(campaign, req.choice_index)
        save_campaign(campaign)
        return {"campaign": campaign, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/encounter/draw")
def api_draw_encounter(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        encounter = draw_encounter(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "encounter": encounter}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/encounter/resolve")
def api_resolve_encounter(campaign_id: str, req: EncounterResolveRequest) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = resolve_encounter(campaign, req.skill)
        save_campaign(campaign)
        return {"campaign": campaign, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/npc/meet")
def api_meet_npc(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        npc = meet_npc(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "npc": npc}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/npc/{npc_id}/ask")
def api_ask_npc(campaign_id: str, npc_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = ask_npc(campaign, npc_id)
        save_campaign(campaign)
        return {"campaign": campaign, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/camp")
def api_camp(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = camp_rest(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "camp": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/campaigns/{campaign_id}/finale")
def api_finale(campaign_id: str) -> Dict[str, Any]:
    try:
        campaign = load_campaign(campaign_id)
        result = complete_finale(campaign)
        save_campaign(campaign)
        return {"campaign": campaign, "ending": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
