from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import current_user
from app.core.database import get_db
from app.schemas.tournament import TournamentCreate, TournamentResponse
from app.services.tournament_service import TournamentService
from app.services.award_service import AwardService
from app.models.user import User

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])

@router.get("", response_model=list[TournamentResponse])
def list_tournaments(q: str = Query("", max_length=100), db: Session = Depends(get_db)):
    return TournamentService.list(db, q)

@router.get("/{tournament_id}", response_model=TournamentResponse)
def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    item = TournamentService.get(db, tournament_id)
    if not item:
        raise HTTPException(status_code=404, detail="Tournament not found.")
    return item

@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
def create_tournament(data: TournamentCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return TournamentService.create(db, user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(tournament_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        TournamentService.delete(db, tournament_id, user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return None
