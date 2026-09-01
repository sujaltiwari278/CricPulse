import secrets

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.player import Player
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)


class AuthService:

    @staticmethod
    def register(
        db: Session,
        data: RegisterRequest,
    ) -> AuthResponse:

        username = data.username.strip().lower()
        email = data.email.strip().lower()
        existing_user = db.scalar(
            select(User).where(
                or_(
                    User.username == username,
                    User.email == email,
                )
            )
        )

        if existing_user:
            if existing_user.username == data.username:
                raise ValueError("Username already exists.")

            raise ValueError("Email already exists.")

        user = User(
            username=username,
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id)

        return AuthResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    def delete_account(
        db: Session,
        user: User,
    ) -> None:
        # Preserve match/team history while removing the user's ability to
        # authenticate and anonymizing their personal/profile information.
        player = db.scalar(select(Player).where(Player.user_id == user.id))
        if player:
            player.display_name = "Deleted Player"
            player.role = None
            player.batting_style = None
            player.bowling_style = None
            player.location = None
            player.bio = None
            player.photo_url = None
            player.country = None

        user.is_active = False
        user.name = "Deleted User"
        user.username = f"deleted_{user.id}"
        user.email = f"deleted_{user.id}@cricpulse.invalid"
        user.password_hash = hash_password(secrets.token_urlsafe(48))

        db.commit()

    @staticmethod
    def login(
        db: Session,
        data: LoginRequest,
    ) -> AuthResponse:

        identifier = data.identifier.strip().lower()
        user = db.scalar(
            select(User).where(
                or_(
                    User.username == identifier,
                    User.email == identifier,
                )
            )
        )

        if not user or not user.is_active:
            raise ValueError(
                "Invalid username/email or password."
            )

        if not verify_password(
            data.password,
            user.password_hash,
        ):
            raise ValueError(
                "Invalid username/email or password."
            )

        token = create_access_token(user.id)

        return AuthResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )