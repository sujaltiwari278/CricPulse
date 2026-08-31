from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.player import Player
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.team import TeamCreate, TeamUpdate


class TeamService:
    @staticmethod
    def _member_response(db: Session, member: TeamMember) -> dict:
        player = member.player
        user = db.get(User, player.user_id)
        return {
            "player_id": player.id,
            "username": user.username,
            "display_name": player.display_name,
            "role": player.role,
            "photo_url": player.photo_url,
        }

    @classmethod
    def _response(cls, db: Session, team: Team) -> dict:
        return {
            "id": team.id,
            "name": team.name,
            "short_name": team.short_name,
            "city": team.city,
            "description": team.description,
            "logo_url": team.logo_url,
            "country": team.country,
            "owner_id": team.owner_id,
            "members": [cls._member_response(db, member) for member in team.members],
        }

    @staticmethod
    def create(db: Session, owner_id: int, data: TeamCreate):
        existing = db.scalar(select(Team).where(or_(Team.name == data.name, Team.short_name == data.short_name)))
        if existing:
            raise ValueError("Team name or short name is already in use.")

        players = list(db.scalars(select(Player).where(Player.id.in_(data.player_ids))).all())
        if len(players) != len(data.player_ids):
            raise ValueError("One or more selected players do not exist.")

        team = Team(
            name=data.name.strip(),
            short_name=data.short_name.strip().upper(),
            city=data.city,
            description=data.description,
            logo_url=data.logo_url,
            country=data.country,
            owner_id=owner_id,
        )
        db.add(team)
        db.flush()

        for player in players:
            db.add(TeamMember(team_id=team.id, player_id=player.id))

        db.commit()
        db.refresh(team)
        return TeamService._response(db, team)

    @staticmethod
    def get(db: Session, team_id: int):
        team = db.get(Team, team_id)
        return None if not team else TeamService._response(db, team)

    @staticmethod
    def list(db: Session, query: str | None = None):
        stmt = select(Team).order_by(Team.name.asc())
        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(or_(Team.name.ilike(pattern), Team.short_name.ilike(pattern), Team.city.ilike(pattern)))
        return [TeamService._response(db, team) for team in db.scalars(stmt).all()]

    @staticmethod
    def update(db: Session, owner_id: int, team_id: int, data: TeamUpdate):
        team = db.get(Team, team_id)
        if not team:
            raise ValueError("Team not found.")
        if team.owner_id != owner_id:
            raise PermissionError("Only the team owner can edit this team.")

        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            duplicate = db.scalar(select(Team).where(Team.name == changes["name"], Team.id != team_id))
            if duplicate:
                raise ValueError("Team name is already in use.")
        if "short_name" in changes:
            changes["short_name"] = changes["short_name"].upper()
            duplicate = db.scalar(select(Team).where(Team.short_name == changes["short_name"], Team.id != team_id))
            if duplicate:
                raise ValueError("Team short name is already in use.")

        for key, value in changes.items():
            setattr(team, key, value)
        db.commit()
        db.refresh(team)
        return TeamService._response(db, team)

    @staticmethod
    def add_member(db: Session, owner_id: int, team_id: int, player_id: int):
        team = db.get(Team, team_id)
        if not team:
            raise ValueError("Team not found.")
        if team.owner_id != owner_id:
            raise PermissionError("Only the team owner can manage the squad.")
        if len(team.members) >= 11:
            raise ValueError("A team can have at most 11 players.")
        if db.scalar(select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.player_id == player_id)):
            raise ValueError("Player is already in this team.")
        if not db.get(Player, player_id):
            raise ValueError("Player not found.")

        db.add(TeamMember(team_id=team_id, player_id=player_id))
        db.commit()
        db.refresh(team)
        return TeamService._response(db, team)

    @staticmethod
    def remove_member(db: Session, owner_id: int, team_id: int, player_id: int):
        team = db.get(Team, team_id)
        if not team:
            raise ValueError("Team not found.")
        if team.owner_id != owner_id:
            raise PermissionError("Only the team owner can manage the squad.")
        if len(team.members) <= 5:
            raise ValueError("A team must contain at least 5 players.")

        member = db.scalar(select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.player_id == player_id))
        if not member:
            raise ValueError("Player is not in this team.")
        db.delete(member)
        db.commit()
        db.refresh(team)
        return TeamService._response(db, team)
