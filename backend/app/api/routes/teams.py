from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamResponse, TeamUpdate
from app.services.team_service import TeamService
from app.services.team_stats_service import TeamStatsService

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(data: TeamCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return TeamService.create(db, user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("", response_model=list[TeamResponse])
def list_teams(q: str | None = Query(None, max_length=100), db: Session = Depends(get_db)):
    return TeamService.list(db, q)


@router.get("/{team_id}/stats")
def get_team_stats(team_id: int, db: Session = Depends(get_db)):
    try:
        return TeamStatsService.summary(db, team_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = TeamService.get(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    return team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, data: TeamUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return TeamService.update(db, user.id, team_id, data)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        TeamService.delete(db, user.id, team_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return None


@router.post("/{team_id}/members", response_model=TeamResponse)
def add_member(team_id: int, data: TeamMemberAdd, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return TeamService.add_member(db, user.id, team_id, data.player_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.delete("/{team_id}/members/{player_id}", response_model=TeamResponse)
def remove_member(team_id: int, player_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return TeamService.remove_member(db, user.id, team_id, player_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
