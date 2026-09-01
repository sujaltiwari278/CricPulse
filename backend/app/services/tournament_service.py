from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.team import Team
from app.models.tournament import Tournament, TournamentTeam
from app.schemas.tournament import TournamentCreate

class TournamentService:
    @staticmethod
    def _status(t: Tournament) -> str:
        today = date.today()
        if t.end_date and today > t.end_date:
            return "COMPLETED"
        if t.start_date and today >= t.start_date:
            return "ONGOING"
        return "UPCOMING"

    @classmethod
    def _response(cls, tournament: Tournament) -> dict:
        return {
            "id": tournament.id,
            "creator_id": tournament.creator_id,
            "name": tournament.name,
            "location": tournament.location,
            "start_date": tournament.start_date,
            "end_date": tournament.end_date,
            "format": tournament.format,
            "overs": tournament.overs,
            "description": tournament.description,
            "status": cls._status(tournament),
            "teams": [
                {
                    "id": row.team.id,
                    "name": row.team.name,
                    "short_name": row.team.short_name,
                    "logo_url": row.team.logo_url,
                    "city": row.team.city,
                }
                for row in tournament.teams
            ],
            "created_at": tournament.created_at,
        }

    @classmethod
    def list(cls, db: Session, q: str = ""):
        stmt = select(Tournament).options(joinedload(Tournament.teams).joinedload(TournamentTeam.team)).order_by(Tournament.created_at.desc())
        if q.strip():
            stmt = stmt.where(Tournament.name.ilike(f"%{q.strip()}%"))
        tournaments = db.scalars(stmt).unique().all()
        changed = False
        for t in tournaments:
            new_status = cls._status(t)
            if t.status != new_status:
                t.status = new_status
                changed = True
        if changed:
            db.commit()
        return [cls._response(t) for t in tournaments]

    @classmethod
    def get(cls, db: Session, tournament_id: int):
        t = db.scalar(
            select(Tournament)
            .options(joinedload(Tournament.teams).joinedload(TournamentTeam.team))
            .where(Tournament.id == tournament_id)
        )
        return None if not t else cls._response(t)

    @classmethod
    def create(cls, db: Session, creator_id: int, data: TournamentCreate):
        teams = db.scalars(select(Team).where(Team.id.in_(data.team_ids))).all()
        if len(teams) != len(set(data.team_ids)):
            raise ValueError("One or more selected teams do not exist.")
        if len(data.team_ids) < 2:
            raise ValueError("A tournament needs at least two teams.")
        t = Tournament(
            creator_id=creator_id,
            name=data.name.strip(),
            location=data.location.strip() if data.location else None,
            start_date=data.start_date,
            end_date=data.end_date,
            format=data.format,
            overs=data.overs,
            description=data.description.strip() if data.description else None,
            status="UPCOMING",
        )
        db.add(t)
        db.flush()
        for team in teams:
            db.add(TournamentTeam(tournament_id=t.id, team_id=team.id))
        db.commit()
        db.refresh(t)
        return cls.get(db, t.id)

    @classmethod
    def delete(cls, db: Session, tournament_id: int, owner_id: int):
        t = db.get(Tournament, tournament_id)
        if not t:
            raise ValueError("Tournament not found.")
        if int(t.creator_id) != int(owner_id):
            raise PermissionError("Only the tournament creator can delete it.")
        db.delete(t)
        db.commit()
