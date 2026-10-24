# CricPulse

**A full-stack cricket match management and scoring application.**

CricPulse provides a web interface for cricket team and match management, with ball-by-ball scoring backed by a REST API.

- **Live frontend:** https://cric-pulse-blond.vercel.app/
- **Repository:** https://github.com/sujaltiwari278/CricPulse

## Features

The repository documents the following application areas:

- User registration/login and JWT-based authentication.
- Team and player management.
- Match setup and participating-team selection.
- Playing XI and match configuration flows.
- Ball-by-ball scoring, including runs, wickets, innings and striker/non-striker/bowler state.
- Match information such as score, overs, wickets, current batting/bowling state, and match status.
- A React-based responsive interface that communicates with a FastAPI backend.

The exact availability of individual flows may depend on the current code and deployment configuration. This README does not claim external professional match feeds or third-party live-score ingestion.

## Important update semantics

**Score changes are API-driven.** The frontend requests data from the backend and updates its UI based on API responses or the refresh behavior implemented by the client.

This project does **not** currently claim WebSocket or Server-Sent Events push updates. Do not describe it as WebSocket-based real-time push until that transport is implemented and verified. A future improvement could introduce WebSockets or SSE for server-initiated updates.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| API client and styling | Axios, Tailwind CSS, Lucide React |
| Backend | Python, FastAPI, Uvicorn |
| Data access | SQLAlchemy |
| Database | PostgreSQL |
| Validation/authentication | Pydantic, JWT, password-hashing library |

See `frontend/package.json` and `backend/requirements.txt` for the current dependency list.

## Architecture

```text
Browser
  |
  v
React + TypeScript frontend
  | HTTP/JSON via Axios
  v
FastAPI REST API
  |
  v
SQLAlchemy
  |
  v
PostgreSQL
```

The repository also includes `openapi.json`, an API specification.

## Repository layout

```text
CricPulse/
├── backend/
│   ├── app/
│   └── requirements.txt
├── frontend/
│   └── src/
├── openapi.json
└── README.md
```

Consult the repository for the current complete file tree.

## Local development

### Prerequisites

- Python compatible with the backend dependencies
- Node.js and npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/sujaltiwari278/CricPulse.git
cd CricPulse
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` and configure values expected by the backend. The current README has documented these example variables:

```dotenv
DATABASE_URL=postgresql://username:password@localhost:5432/cricpulse
SECRET_KEY=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Check the current settings code for exact names and any additional required variables. Never commit credentials.

Start the API from the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The documented local API address is `http://127.0.0.1:8000`. FastAPI's interactive documentation is usually available at `http://127.0.0.1:8000/docs`.

### 3. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Confirm that the frontend API base URL points to the local backend or the intended deployment.

## Database

CricPulse uses PostgreSQL through SQLAlchemy. Create the database and configure the connection string before starting the backend. Apply any database setup or migration steps that are present in the repository; do not assume the database schema is automatically initialized unless the current code does so.

## Testing and CI status

Automated tests and a CI workflow are **not documented as implemented in the current repository**. This README therefore makes no claim that tests pass or that CI runs. A useful next step is to add backend API/unit tests, frontend tests for key scoring flows, and a GitHub Actions workflow that runs the checks on pull requests.

## Potential future improvements

- WebSocket or Server-Sent Events updates
- Multiplayer scoring
- Player statistics and rankings
- Tournament management, leaderboards, and commentary
- Match history and analytics
- Push notifications
- Automated tests and CI/CD
- Caching and deployment hardening

These are roadmap items, not claims of current functionality.

## Author

**Sujal Tiwari** — https://github.com/sujaltiwari278
