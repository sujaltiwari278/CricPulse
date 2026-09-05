from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models.user import User
from app.models.player import Player
from app.models.team import Team, TeamMember
from app.models.match import Match, MatchPlayer, Innings, Delivery
from app.models.tournament import Tournament, TournamentTeam
from app.api.routes import auth, players, teams, matches, tournaments


Base.metadata.create_all(bind=engine)

# Lightweight development migration for optional profile media fields.
# Existing SQLite databases created before these fields existed are upgraded
# without requiring Alembic. Safe to run repeatedly.
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in {
            "player_profiles": {"photo_url": "TEXT", "country": "VARCHAR(100)", "is_deleted": "BOOLEAN NOT NULL DEFAULT FALSE"},
            "teams": {"logo_url": "TEXT", "country": "VARCHAR(100)"},
            "matches": {"toss_result": "VARCHAR(10)"},
        }.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for column, sql_type in columns.items():
                if column not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))
except Exception:
    # The app can still start when a non-SQLite production database manages
    # schema separately.
    pass

app = FastAPI(title="CricPulse API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cric-pulse-blond.vercel.app",
        "https://cric-pulse-in75yv6pm-sujaltiwari278s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(tournaments.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "CricPulse API is running!"}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "CricPulse API", "version": "2.1.0"}
