from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
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

        if not user:
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