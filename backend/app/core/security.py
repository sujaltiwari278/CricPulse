from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt only looks at the first 72 bytes. Truncating explicitly keeps old
# hashes (created through passlib) valid and avoids the hard error newer
# bcrypt releases raise for longer input.
_BCRYPT_MAX_BYTES = 72

# A real hash used to burn the same CPU time when a login names an account
# that does not exist (stops "does this username exist?" timing probes).
_DUMMY_HASH: bytes | None = None


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        _prepare(password),
        bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            _prepare(plain_password),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        # Malformed hash in the database - treat as a failed login, not a 500.
        return False


def burn_password_check(plain_password: str) -> None:
    """Spend the time of one verification without any real account."""
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = bcrypt.hashpw(
            b"cricpulse-dummy", bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
        )
    bcrypt.checkpw(_prepare(plain_password), _DUMMY_HASH)


def warm_up() -> None:
    """Load bcrypt and build the dummy hash before the first real login."""
    burn_password_check("warm-up")


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require_exp": True, "require_sub": True},
        )
        return int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None