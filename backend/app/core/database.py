from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


engine_options: dict = {
    # Test a connection before handing it out. After Render pauses the
    # service, every pooled connection is dead; without this the first
    # request after wake-up fails with "server closed the connection".
    "pool_pre_ping": True,
}

if settings.is_postgres:
    engine_options.update(
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        # Recycle before managed-Postgres / proxy idle limits close sockets.
        pool_recycle=280,
        connect_args={
            "connect_timeout": settings.DB_CONNECT_TIMEOUT,
            # TCP keep-alives detect silently dropped connections quickly.
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    )
elif settings.DATABASE_URL.startswith("sqlite"):
    # FastAPI runs sync endpoints in a thread pool.
    engine_options["connect_args"] = {"check_same_thread": False}

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