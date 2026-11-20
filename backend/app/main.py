import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError

from app.api.routes import auth, matches, players, teams, tournaments
from app.core.config import settings
from app.core.database import engine
from app.core.startup import db_state, start_background_boot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("cricpulse")

VERSION = "2.2.0"
RETRY_AFTER_SECONDS = "5"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # The port opens right away; the database is prepared in the background.
    start_background_boot()
    yield
    engine.dispose()


app = FastAPI(title=settings.APP_NAME, version=VERSION, lifespan=lifespan)


def _unavailable(detail: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": detail, "code": code},
        headers={"Retry-After": RETRY_AFTER_SECONDS},
    )


# --------------------------------------------------------------------------
# Error handling. These run *inside* the CORS middleware, so even failures
# carry CORS headers. Without that, the browser hides a plain 500/503 behind
# "blocked by CORS policy / network error" - which the frontend then mislabels
# as "server is waking up".
# --------------------------------------------------------------------------
@app.exception_handler(OperationalError)
async def db_operational_error(_: Request, exc: OperationalError):
    logger.warning("Database error: %s", str(exc).splitlines()[0])
    return _unavailable(
        "The database is temporarily unavailable. Please try again in a moment.",
        "DATABASE_UNAVAILABLE",
    )


@app.exception_handler(PoolTimeoutError)
async def db_pool_timeout(_: Request, exc: PoolTimeoutError):
    logger.warning("Database pool exhausted: %s", str(exc).splitlines()[0])
    return _unavailable(
        "The server is busy. Please try again in a moment.",
        "SERVER_BUSY",
    )


@app.middleware("http")
async def api_guard(request: Request, call_next):
    """Readiness gate + last-resort JSON for unexpected crashes."""
    if request.url.path.startswith("/api") and not db_state.ready:
        return _unavailable(
            "The CricPulse server is starting up. Please try again in a moment.",
            "SERVER_STARTING",
        )

    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on our side.", "code": "INTERNAL_ERROR"},
        )


# Added last => outermost, so it wraps every response above (including 503s
# and preflight OPTIONS requests).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(tournaments.router, prefix="/api")


# --------------------------------------------------------------------------
# Health endpoints. HEAD is allowed because uptime monitors (UptimeRobot,
# cron-job.org, Better Stack) often use it and plain @app.get() returns 405.
# --------------------------------------------------------------------------
@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def root():
    return {"message": "CricPulse API is running!"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    """Cheap liveness probe - never touches the database.

    Point Render's Health Check Path and your uptime pinger here.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": VERSION,
        "database_ready": db_state.ready,
    }


@app.get("/health/ready")
def ready():
    """Readiness probe - verifies the database round-trip. 200 or 503."""
    if not db_state.ready:
        return _unavailable(
            db_state.error or "Database is still being prepared.",
            "SERVER_STARTING",
        )
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        return _unavailable("Database is unreachable.", "DATABASE_UNAVAILABLE")
    return {"status": "ready", "database": "ok"}