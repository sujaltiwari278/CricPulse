from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    burn_password_check,
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
    def _duplicate_message(db: Session, username: str, email: str) -> str | None:
        """Return which field is already taken, or None if both are free."""
        rows = db.execute(
            select(User.username, User.email).where(
                or_(
                    func.lower(User.username) == username,
                    func.lower(User.email) == email,
                )
            )
        ).all()

        if any(row.username.lower() == username for row in rows):
            return "Username already exists."
        if any(row.email.lower() == email for row in rows):
            return "Email already exists."
        return None

    @staticmethod
    def register(db: Session, data: RegisterRequest) -> AuthResponse:
        username = data.username.strip().lower()
        email = data.email.strip().lower()
        name = " ".join(data.name.split())

        message = AuthService._duplicate_message(db, username, email)
        if message:
            raise ValueError(message)

        user = User(
            username=username,
            name=name,
            email=email,
            password_hash=hash_password(data.password),
        )
        db.add(user)

        try:
            db.commit()
        except IntegrityError:
            # Two sign-ups raced past the check above and the database's
            # unique constraint caught the loser. Report it as a normal
            # conflict instead of a 500.
            db.rollback()
            raise ValueError(
                AuthService._duplicate_message(db, username, email)
                or "Username or email already exists."
            )

        db.refresh(user)

        return AuthResponse(
            access_token=create_access_token(user.id),
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    def login(db: Session, data: LoginRequest) -> AuthResponse:
        identifier = data.identifier.strip().lower()

        user = db.scalar(
            select(User).where(
                or_(
                    func.lower(User.username) == identifier,
                    func.lower(User.email) == identifier,
                )
            )
        )

        if user is None:
            burn_password_check(data.password)  # same timing as a real check
            raise ValueError("Invalid username/email or password.")

        if not verify_password(data.password, user.password_hash):
            raise ValueError("Invalid username/email or password.")

        if not user.is_active:
            raise PermissionError("This account has been deactivated.")

        return AuthResponse(
            access_token=create_access_token(user.id),
            user=UserResponse.model_validate(user),
        )