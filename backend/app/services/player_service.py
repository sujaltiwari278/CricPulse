from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.models.player import Player
from app.models.user import User
from app.schemas.player import PlayerCreate, PlayerUpdate

class PlayerService:
    @staticmethod
    def _response(player, user):
        return {"id": player.id, "user_id": player.user_id, "username": user.username,
                "display_name": player.display_name, "role": player.role,
                "batting_style": player.batting_style, "bowling_style": player.bowling_style,
                "location": player.location, "bio": player.bio, "photo_url": player.photo_url,
                "country": player.country}

    @staticmethod
    def get_by_user(db, user_id):
        return db.scalar(select(Player).where(Player.user_id == user_id))

    @staticmethod
    def create(db, user_id, data: PlayerCreate):
        if PlayerService.get_by_user(db, user_id):
            raise ValueError("Player profile already exists.")
        user = db.get(User, user_id)
        if not user:
            raise ValueError("User not found.")
        player = Player(user_id=user_id, **data.model_dump())
        db.add(player); db.commit(); db.refresh(player)
        return PlayerService._response(player, user)

    @staticmethod
    def update(db, user_id, data: PlayerUpdate):
        player = PlayerService.get_by_user(db, user_id)
        if not player:
            raise ValueError("Player profile not found.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(player, key, value)
        db.commit(); db.refresh(player)
        return PlayerService._response(player, db.get(User, user_id))

    @staticmethod
    def get(db, player_id):
        row = db.execute(select(Player, User).join(User, User.id == Player.user_id).where(Player.id == player_id)).first()
        return None if not row else PlayerService._response(row[0], row[1])

    @staticmethod
    def search(db, query=None):
        stmt = select(Player, User).join(User, User.id == Player.user_id).order_by(Player.display_name.asc())
        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(or_(Player.display_name.ilike(pattern), User.username.ilike(pattern)))
        return [PlayerService._response(p, u) for p, u in db.execute(stmt).all()]
