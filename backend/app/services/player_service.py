from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.player import Player
from app.models.team import TeamMember
from app.models.user import User
from app.schemas.player import PlayerCreate, PlayerUpdate


class PlayerService:
    @staticmethod
    def _response(player, user):
        return {
            "id": player.id,
            "user_id": player.user_id,
            "username": user.username,
            "display_name": player.display_name,
            "role": player.role,
            "batting_style": player.batting_style,
            "bowling_style": player.bowling_style,
            "location": player.location,
            "bio": player.bio,
            "photo_url": player.photo_url,
            "country": player.country,
        }

    @staticmethod
    def get_by_user(db: Session, user_id: int):
        return db.scalar(
            select(Player).where(
                Player.user_id == user_id,
                Player.is_deleted.is_(False),
            )
        )

    @staticmethod
    def create(db: Session, user_id: int, data: PlayerCreate):
        # user_id is unique, so a deleted profile is reactivated instead
        # of creating a second Player row and violating the unique constraint.
        existing = db.scalar(select(Player).where(Player.user_id == user_id))
        user = db.get(User, user_id)

        if not user:
            raise ValueError("User not found.")

        if existing:
            if not existing.is_deleted:
                raise ValueError("Player profile already exists.")

            for key, value in data.model_dump().items():
                setattr(existing, key, value)
            existing.is_deleted = False
            db.commit()
            db.refresh(existing)
            return PlayerService._response(existing, user)

        player = Player(user_id=user_id, **data.model_dump())
        db.add(player)
        db.commit()
        db.refresh(player)
        return PlayerService._response(player, user)

    @staticmethod
    def update(db: Session, user_id: int, data: PlayerUpdate):
        player = PlayerService.get_by_user(db, user_id)
        if not player:
            raise ValueError("Player profile not found.")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(player, key, value)

        db.commit()
        db.refresh(player)
        return PlayerService._response(player, db.get(User, user_id))

    @staticmethod
    def delete(db: Session, user_id: int):
        player = PlayerService.get_by_user(db, user_id)
        if not player:
            raise ValueError("Player profile not found.")

        # Keep the Player row because historical MatchPlayer, Innings and
        # Delivery records reference it. Removing the row would break or
        # delete historical score data.
        player.is_deleted = True

        # Remove only active team memberships. Historical match records remain.
        db.query(TeamMember).filter(
            TeamMember.player_id == player.id
        ).delete(synchronize_session=False)

        db.commit()

    @staticmethod
    def get(db: Session, player_id: int):
        row = db.execute(
            select(Player, User)
            .join(User, User.id == Player.user_id)
            .where(
                Player.id == player_id,
                Player.is_deleted.is_(False),
            )
        ).first()
        return None if not row else PlayerService._response(row[0], row[1])

    @staticmethod
    def search(db: Session, query=None):
        stmt = (
            select(Player, User)
            .join(User, User.id == Player.user_id)
            .where(Player.is_deleted.is_(False))
            .order_by(Player.display_name.asc())
        )

        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Player.display_name.ilike(pattern),
                    User.username.ilike(pattern),
                )
            )

        return [
            PlayerService._response(p, u)
            for p, u in db.execute(stmt).all()
        ]
