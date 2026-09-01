from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.database import get_db
from app.models.match import Innings, Match, MatchPlayer
from app.models.user import User
from app.schemas.match import (DeliveryCreate, InningsResponse, InningsStartRequest, InningsStateUpdate, MatchCreate, MatchPlayerIds,
                               MatchResponse, MatchSetupResponse, MatchUpdate, TossRequest, TossResponse)
from app.services.match_service import MatchService
from app.services.scoring_service import ScoringService
from app.services.analytics_service import AnalyticsService
from app.services.scorecard_service import ScorecardService
from app.services.result_service import ResultService

router = APIRouter(prefix="/matches", tags=["Matches"])


def fail(exc: Exception):
    if isinstance(exc, PermissionError): raise HTTPException(status_code=403, detail=str(exc))
    raise HTTPException(status_code=409, detail=str(exc))

@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(data: MatchCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try: return MatchService.create(db, user.id, data)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))

@router.get("", response_model=list[MatchResponse])
def list_matches(live: bool = Query(False), db: Session = Depends(get_db)):
    return MatchService.list(db, live_only=live)

@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = MatchService.get(db, match_id)
    if not match: raise HTTPException(status_code=404, detail="Match not found.")
    return match

@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(match_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        MatchService.delete(db, match_id, user.id)
    except (PermissionError, ValueError) as exc:
        fail(exc)
    return None

@router.put("/{match_id}", response_model=MatchResponse)
def update_match(match_id: int, data: MatchUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try: return MatchService.update(db, match_id, user.id, data)
    except (PermissionError, ValueError) as exc: fail(exc)

@router.get("/{match_id}/playing-xi", response_model=MatchSetupResponse)
def get_xi(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match: raise HTTPException(status_code=404, detail="Match not found.")
    return {"match": MatchService.response(match), "playing_xi": MatchService.playing_xi_response(db, match)}

@router.put("/{match_id}/playing-xi", response_model=MatchSetupResponse)
def set_xi(match_id: int, data: MatchPlayerIds, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        match = MatchService.set_playing_xi(db, match_id, user.id, data)
        return {"match": MatchService.response(match), "playing_xi": MatchService.playing_xi_response(db, match)}
    except (PermissionError, ValueError) as exc: fail(exc)

@router.post("/{match_id}/toss", response_model=TossResponse)
def conduct_toss(match_id: int, data: TossRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try: return MatchService.toss(db, match_id, user.id, data.team_id, data.call)
    except (PermissionError, ValueError) as exc: fail(exc)

@router.post("/{match_id}/toss-decision", response_model=MatchResponse)
def toss_decision(match_id: int, decision: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try: return MatchService.set_toss_decision(db, match_id, user.id, decision.upper())
    except (PermissionError, ValueError) as exc: fail(exc)

@router.post("/{match_id}/start", response_model=MatchResponse)
def start_match(match_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try: return MatchService.start(db, match_id, user.id)
    except (PermissionError, ValueError) as exc: fail(exc)

@router.post("/{match_id}/innings/start", response_model=InningsResponse)
def start_innings(match_id: int, data: InningsStartRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        match = db.get(Match, match_id)
        if not match: raise ValueError("Match not found.")
        if match.creator_id != user.id: raise PermissionError("Only the match creator can operate the scorer.")
        return ScoringService.start_innings(db, match, data)
    except (PermissionError, ValueError) as exc: fail(exc)

@router.get("/{match_id}/awards")
def match_awards(match_id: int, db: Session = Depends(get_db)):
    try: return AwardService.match(db, match_id)
    except ValueError as exc: raise HTTPException(status_code=404, detail=str(exc))

@router.get("/{match_id}/scorecard")
def match_scorecard(match_id: int, db: Session = Depends(get_db)):
    scorecard = ScorecardService.build(db, match_id)
    if not scorecard:
        raise HTTPException(status_code=404, detail="Match not found.")
    return scorecard

@router.get("/{match_id}/analytics")
def match_analytics(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    return AnalyticsService.match_analytics(db, match_id)

@router.get("/{match_id}/result")
def match_result(match_id: int, db: Session = Depends(get_db)):
    try:
        return ResultService.summary(db, match_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get("/{match_id}/innings", response_model=list[InningsResponse])
def list_innings(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match: raise HTTPException(status_code=404, detail="Match not found.")
    return [ScoringService.innings_response(i) for i in db.scalars(select(Innings).where(Innings.match_id == match_id).order_by(Innings.number)).all()]

@router.patch("/{match_id}/innings/{innings_id}/state", response_model=InningsResponse)
def update_innings_state(match_id: int, innings_id: int, data: InningsStateUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        match = db.get(Match, match_id)
        if not match: raise ValueError("Match not found.")
        if match.creator_id != user.id: raise PermissionError("Only the match creator can operate the scorer.")
        return ScoringService.update_state(db, match, innings_id, data)
    except (PermissionError, ValueError) as exc: fail(exc)

@router.post("/{match_id}/innings/{innings_id}/deliveries", response_model=InningsResponse)
def add_delivery(match_id: int, innings_id: int, data: DeliveryCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        match = db.get(Match, match_id)
        if not match: raise ValueError("Match not found.")
        if match.creator_id != user.id: raise PermissionError("Only the match creator can operate the scorer.")
        return ScoringService.add_delivery(db, match, innings_id, data)
    except (PermissionError, ValueError) as exc: fail(exc)
