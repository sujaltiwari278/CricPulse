"""Database bootstrap that never blocks or kills the web server.

The old ``main.py`` ran ``create_all`` and the ALTER TABLE migration at import
time. On Render that meant: if Postgres was slow or briefly unreachable, the
process hung or crashed before it could answer a single request, which the
frontend reported as "server is still waking up".

Now the web server starts immediately and this module prepares the database
in a background thread, retrying with back-off. Until it succeeds, API calls
get a clean ``503`` + ``Retry-After`` instead of a hang or a stack trace.
"""
import logging
import threading
import time

from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core import security
from app.core.config import settings
from app.core.database import Base, engine

# Importing the models registers every table on Base.metadata.
from app.models.user import User  # noqa: F401
from app.models.player import Player  # noqa: F401
from app.models.team import Team, TeamMember  # noqa: F401
from app.models.match import Match, MatchPlayer, Innings, Delivery  # noqa: F401
from app.models.tournament import Tournament, TournamentTeam  # noqa: F401

logger = logging.getLogger("cricpulse.startup")

# Arbitrary constant: makes concurrent workers queue up instead of racing
# each other through CREATE TABLE / ALTER TABLE.
_ADVISORY_LOCK_KEY = 727_2026

# Columns added after the first release. Mirrors the old inline migration.
_COLUMN_MIGRATIONS: dict[str, dict[str, str]] = {
    "player_profiles": {
        "photo_url": "TEXT",
        "country": "VARCHAR(100)",
        "is_deleted": "BOOLEAN NOT NULL DEFAULT FALSE",
    },
    "teams": {
        "logo_url": "TEXT",
        "country": "VARCHAR(100)",
        "captain_id": "INTEGER",
    },
    "matches": {
        "toss_result": "VARCHAR(10)",
        "man_of_match_id": "INTEGER",
    },
}


class DatabaseState:
    """Tiny thread-safe holder read by the middleware and /health."""

    def __init__(self) -> None:
        self.ready = False
        self.error: str | None = None
        self.attempts = 0
        self._lock = threading.Lock()

    def set_ready(self) -> None:
        with self._lock:
            self.ready, self.error = True, None

    def set_error(self, message: str) -> None:
        with self._lock:
            self.ready, self.error = False, message


db_state = DatabaseState()


def _prepare_schema() -> None:
    """Create missing tables and add missing columns (idempotent)."""
    with engine.begin() as conn:
        if settings.is_postgres:
            conn.execute(
                text("SELECT pg_advisory_xact_lock(:key)"),
                {"key": _ADVISORY_LOCK_KEY},
            )

        Base.metadata.create_all(bind=conn)

        inspector = inspect(conn)
        for table, columns in _COLUMN_MIGRATIONS.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for column, sql_type in columns.items():
                if column not in existing:
                    logger.info("Adding column %s.%s", table, column)
                    conn.execute(
                        text(f'ALTER TABLE {table} ADD COLUMN {column} {sql_type}')
                    )


def init_database() -> bool:
    """Block until the database is usable or retries are exhausted."""
    delay = settings.DB_INIT_RETRY_DELAY

    for attempt in range(1, settings.DB_INIT_RETRIES + 1):
        db_state.attempts = attempt
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            _prepare_schema()
        except (OperationalError, SQLAlchemyError, OSError) as exc:
            message = f"{type(exc).__name__}: {str(exc).splitlines()[0][:200]}"
            db_state.set_error(message)
            logger.warning(
                "Database not ready (attempt %d/%d): %s",
                attempt, settings.DB_INIT_RETRIES, message,
            )
            engine.dispose()  # drop any half-open pooled connections
            time.sleep(min(delay * attempt, 15))
            continue

        db_state.set_ready()
        logger.info("Database ready after %d attempt(s).", attempt)
        return True

    logger.error("Database still unavailable after %d attempts.", settings.DB_INIT_RETRIES)
    return False


def _background_boot() -> None:
    try:
        security.warm_up()  # first bcrypt call is slow on small instances
    except Exception:  # never let warm-up stop the boot
        logger.exception("bcrypt warm-up failed")

    # Keep trying forever: a database that comes back later should heal the
    # API without a redeploy.
    while not init_database():
        time.sleep(30)


def start_background_boot() -> threading.Thread:
    thread = threading.Thread(target=_background_boot, name="db-boot", daemon=True)
    thread.start()
    return thread