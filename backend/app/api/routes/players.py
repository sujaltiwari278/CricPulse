from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.player import PlayerCreate, PlayerResponse, PlayerUpdate
from app.services.player_service import PlayerService
from app.services.player_stats_service import PlayerStatsService

router = APIRouter(prefix="/players", tags=["Players"])


@router.post("/me", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
def create_my_player(data: PlayerCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return PlayerService.create(db, user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/me", response_model=PlayerResponse)
def get_my_player(user: User = Depends(current_user), db: Session = Depends(get_db)):
    player = PlayerService.get_by_user(db, user.id)
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found.")
    return PlayerService.get(db, player.id)


@router.put("/me", response_model=PlayerResponse)
def update_my_player(data: PlayerUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return PlayerService.update(db, user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_player(user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        PlayerService.delete(db, user.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return None


@router.get("/search", response_model=list[PlayerResponse])
def search_players(q: str | None = Query(None, max_length=100), db: Session = Depends(get_db)):
    return PlayerService.search(db, q)


@router.get("/{player_id}/stats")
def get_player_stats(player_id: int, db: Session = Depends(get_db)):
    try:
        return PlayerStatsService.career(db, player_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = PlayerService.get(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found.")
    return player
