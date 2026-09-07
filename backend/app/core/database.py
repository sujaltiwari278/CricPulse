from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


engine_options = {
    "pool_pre_ping": True,
}

# Keep SQLite-compatible local development simple. Production PostgreSQL gets a
# bounded pool of up to ten active connections.
if settings.DATABASE_URL.startswith("postgresql"):
    engine_options.update(
        pool_recycle=300,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        connect_args={"connect_timeout": 10},
    )

engine = create_engine(settings.DATABASE_URL, **engine_options)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
