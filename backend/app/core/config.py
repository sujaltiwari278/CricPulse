import logging

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

logger = logging.getLogger("cricpulse.config")

_PLACEHOLDER_SECRETS = {
    "",
    "change_this_to_a_long_random_secret",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    APP_NAME: str = "CricPulse API"
    APP_ENV: str = "development"  # set to "production" on Render

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ---- CORS -------------------------------------------------------------
    FRONTEND_URL: str = "http://localhost:5173"
    # Extra exact origins, comma separated (e.g. a custom domain).
    ALLOWED_ORIGINS: str = ""
    # Matches every Vercel deployment of this project, including the random
    # preview URLs Vercel creates on each deploy. A hard-coded preview URL
    # silently breaks the next time you redeploy the frontend.
    ALLOWED_ORIGIN_REGEX: str = r"^https://cric-pulse[a-z0-9-]*\.vercel\.app$"

    # ---- Database pool ----------------------------------------------------
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 15
    DB_CONNECT_TIMEOUT: int = 10

    # How hard the background startup task tries to reach the database
    # before giving up (it keeps the API alive and reports 503 meanwhile).
    DB_INIT_RETRIES: int = 12
    DB_INIT_RETRY_DELAY: float = 3.0

    BCRYPT_ROUNDS: int = 12

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    @field_validator("DATABASE_URL")
    @classmethod
    def normalise_database_url(cls, value: str) -> str:
        """Accept the URL exactly as Render/Heroku hand it out.

        Render gives ``postgres://...`` or ``postgresql://...``; SQLAlchemy
        needs an explicit driver. External Render hosts also require SSL.
        """
        value = value.strip()
        url = make_url(value)

        if url.drivername in {"postgres", "postgresql"}:
            url = url.set(drivername="postgresql+psycopg2")

        if (
            url.drivername.startswith("postgresql")
            and url.host
            and url.host.endswith((".render.com", ".neon.tech"))
            and "sslmode" not in url.query
        ):
            url = url.update_query_dict({"sslmode": "require"})

        return url.render_as_string(hide_password=False)

    @model_validator(mode="after")
    def check_secrets(self):
        weak = (
            self.JWT_SECRET_KEY.strip().lower() in _PLACEHOLDER_SECRETS
            or len(self.JWT_SECRET_KEY) < 32
        )
        if weak:
            if self.is_production:
                raise ValueError(
                    "JWT_SECRET_KEY must be a random string of at least 32 "
                    "characters in production."
                )
            logger.warning("JWT_SECRET_KEY is weak - fine for local dev only.")
        return self

    # ------------------------------------------------------------------ #
    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in {"production", "prod"}

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            self.FRONTEND_URL.strip().rstrip("/"),
        }
        origins.update(
            o.strip().rstrip("/")
            for o in self.ALLOWED_ORIGINS.split(",")
            if o.strip()
        )
        return sorted(o for o in origins if o)


settings = Settings()