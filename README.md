# 🏏 CricPulse

### A Full-Stack Cricket Match Management & Live Scoring Platform

**CricPulse** is a full-stack cricket management platform designed to provide a complete digital experience for managing cricket teams, players, matches, live scoring, and match information.

It provides a modern web interface for users to manage cricket-related activities while communicating with a RESTful backend API.

🔗 **Live Demo:** https://cric-pulse-blond.vercel.app/

🔗 **GitHub Repository:** https://github.com/sujaltiwari278/CricPulse

---

## 🚀 Features

### 👤 Authentication & User Management

* User registration and login
* JWT-based authentication
* Protected application routes
* Persistent authentication state
* User profile management

### 🏏 Team Management

* Create and manage cricket teams
* Add players to teams
* Manage team information
* Organize players for matches

### 🏟️ Match Management

* Create cricket matches
* Select participating teams
* Configure match details
* Manage playing XI
* Start and manage matches

### 📊 Live Cricket Scoring

* Ball-by-ball match scoring
* Track runs and wickets
* Maintain innings information
* Track striker and non-striker
* Track bowler information
* Update match state during gameplay
* Display live match information

### 📈 Match Information

* Team scores
* Overs
* Wickets
* Current batsmen
* Current bowler
* Innings information
* Match status

### 🎨 Modern Frontend

* Responsive React interface
* Component-based architecture
* Client-side routing
* API integration using Axios
* Modern UI icons
* Tailwind CSS styling

---

# 🏗️ System Architecture

CricPulse follows a **three-layer full-stack architecture**:

```text
                         ┌──────────────────────┐
                         │       USER           │
                         │   Web Browser        │
                         └──────────┬───────────┘
                                    │
                                    │ HTTPS
                                    ▼
                    ┌─────────────────────────────┐
                    │       REACT FRONTEND        │
                    │                             │
                    │ React + TypeScript          │
                    │ Vite                       │
                    │ React Router               │
                    │ Axios                      │
                    │ Tailwind CSS               │
                    └──────────────┬──────────────┘
                                   │
                                   │ REST API
                                   │ JSON
                                   ▼
                    ┌─────────────────────────────┐
                    │       FASTAPI BACKEND       │
                    │                             │
                    │ Authentication             │
                    │ Business Logic              │
                    │ Match Management             │
                    │ Team Management              │
                    │ Scoring Logic               │
                    │ API Validation              │
                    └──────────────┬──────────────┘
                                   │
                                   │ SQLAlchemy
                                   ▼
                    ┌─────────────────────────────┐
                    │        PostgreSQL           │
                    │                             │
                    │ Users                       │
                    │ Teams                       │
                    │ Players                     │
                    │ Matches                     │
                    │ Match State                 │
                    │ Scores                      │
                    └─────────────────────────────┘
```

---

# 🔄 Application Flow

The high-level request flow is:

```text
User
  │
  ▼
React UI
  │
  ▼
Axios API Request
  │
  ▼
FastAPI Endpoint
  │
  ▼
Authentication / Validation
  │
  ▼
Business Logic
  │
  ▼
SQLAlchemy ORM
  │
  ▼
PostgreSQL Database
  │
  ▼
JSON Response
  │
  ▼
React State Update
  │
  ▼
Updated UI
```

---

# 🧩 Technology Stack

## Frontend

| Technology   | Purpose                |
| ------------ | ---------------------- |
| React        | UI development         |
| TypeScript   | Type-safe development  |
| Vite         | Frontend build tool    |
| React Router | Client-side routing    |
| Axios        | HTTP/API communication |
| Tailwind CSS | UI styling             |
| Lucide React | Icons                  |

The frontend uses React, TypeScript, Vite, React Router, Axios and Tailwind CSS.

## Backend

| Technology | Purpose                  |
| ---------- | ------------------------ |
| FastAPI    | REST API framework       |
| Python     | Backend development      |
| SQLAlchemy | ORM/database interaction |
| PostgreSQL | Relational database      |
| Pydantic   | Data validation          |
| JWT        | Authentication           |
| Passlib    | Password hashing         |
| Uvicorn    | ASGI server              |

---

# 🔐 Authentication Architecture

CricPulse uses token-based authentication.

```text
User
 │
 │ Login credentials
 ▼
React Frontend
 │
 │ POST /login
 ▼
FastAPI
 │
 ├── Validate credentials
 │
 ├── Verify hashed password
 │
 └── Generate JWT
 │
 ▼
JWT Access Token
 │
 ▼
Frontend
 │
 │ Authorization: Bearer <token>
 ▼
Protected API
 │
 ▼
Authenticated User
```

Passwords are not stored as plain text. Password hashing is handled using the backend authentication stack.

JWT tokens are used to authenticate requests to protected API endpoints.

---

# 🏏 Cricket Match Flow

A typical match flow is:

```text
Create / Select Teams
        │
        ▼
Select Players
        │
        ▼
Configure Match
        │
        ▼
Select Playing XI
        │
        ▼
Start Match
        │
        ▼
Select Striker / Non-Striker
        │
        ▼
Select Bowler
        │
        ▼
Record Ball
        │
        ├── Runs
        ├── Wicket
        ├── Extras
        └── Over completion
        │
        ▼
Update Match State
        │
        ▼
Update Scorecard
        │
        ▼
Continue Until Innings Ends
        │
        ▼
Match Result
```

---

# 📁 Project Structure

```text
CricPulse/
│
├── backend/
│   │
│   ├── app/
│   │   ├── ...
│   │
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── openapi.json
├── .gitignore
└── README.md
```

---

# ⚙️ Local Development

## 1. Clone the Repository

```bash
git clone https://github.com/sujaltiwari278/CricPulse.git

cd CricPulse
```

---

## 2. Backend Setup

Move into the backend directory:

```bash
cd backend
```

Create a virtual environment:

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

The backend dependencies include FastAPI, Uvicorn, SQLAlchemy, PostgreSQL support, Pydantic, JWT authentication and password hashing libraries.

---

## 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cricpulse

SECRET_KEY=your-secret-key

ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> Never commit real credentials, database passwords, API keys or secret keys to GitHub.

---

## 4. Start the Backend

Run the FastAPI server using Uvicorn:

```bash
uvicorn app.main:app --reload
```

The API will normally be available at:

```text
http://127.0.0.1:8000
```

FastAPI also provides interactive API documentation.

```text
http://127.0.0.1:8000/docs
```

---

# 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Vite development server will provide a local URL, typically:

```text
http://localhost:5173
```

---

# 🔗 Frontend ↔ Backend Communication

The frontend communicates with the FastAPI backend through HTTP requests.

```text
React Component
      │
      ▼
API Client / Axios
      │
      ▼
HTTP Request
      │
      ▼
FastAPI
      │
      ▼
Database
      │
      ▼
JSON Response
      │
      ▼
React State
      │
      ▼
UI
```

Axios is used as the HTTP client on the frontend.

---

# 🗄️ Database

CricPulse uses **PostgreSQL** as its relational database.

SQLAlchemy provides the ORM layer between the Python application and PostgreSQL.

Conceptually:

```text
FastAPI
   │
   ▼
SQLAlchemy ORM
   │
   ▼
PostgreSQL
```

This allows application code to work with Python models instead of manually constructing SQL queries throughout the application.

---

# 📡 API

The backend exposes RESTful API endpoints consumed by the React frontend.

The repository also contains an `openapi.json` specification describing the API.

Typical API responsibilities include:

```text
Authentication
     │
     ├── Register
     ├── Login
     └── User information

Teams
     │
     ├── Create team
     ├── View team
     └── Manage players

Matches
     │
     ├── Create match
     ├── Configure match
     ├── Start match
     └── Manage match state

Scoring
     │
     ├── Record delivery
     ├── Update score
     ├── Update wickets
     └── Update innings
```

---

# ☁️ Deployment

The frontend is deployed using Vercel.

### Live Application

**CricPulse:**
https://cric-pulse-blond.vercel.app/

The production architecture can be represented as:

```text
                    INTERNET
                       │
                       ▼
              ┌─────────────────┐
              │     Vercel      │
              │ React Frontend  │
              └────────┬────────┘
                       │
                       │ HTTPS / REST API
                       ▼
              ┌─────────────────┐
              │ FastAPI Backend │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │    Database     │
              └─────────────────┘
```

---

# 📈 Scalability

CricPulse can be scaled from a project-level application into a production-grade cricket platform.

### 1. Horizontal Backend Scaling

Run multiple FastAPI instances behind a load balancer:

```text
                 Load Balancer
                /      |      \
               ▼       ▼       ▼
           FastAPI  FastAPI  FastAPI
```

This prevents a single backend server from becoming a bottleneck.

### 2. Database Scaling

PostgreSQL can be optimized using:

* Proper indexing
* Connection pooling
* Read replicas
* Query optimization
* Database partitioning where required

### 3. Caching

Redis can be introduced for frequently requested information such as:

* Live scores
* Match details
* Team information
* Frequently accessed player data

### 4. Real-Time Updates

For large-scale live scoring, WebSockets or Server-Sent Events can be introduced.

```text
Scoring Server
      │
      ▼
 WebSocket
      │
 ┌────┼────┐
 ▼    ▼    ▼
User User User
```

This allows multiple viewers to receive score updates without repeatedly polling the backend.

### 5. Event-Driven Architecture

At very large scale, match events can be processed asynchronously using systems such as Kafka or RabbitMQ.

```text
Match Service
      │
      ▼
 Message Queue
      │
 ├───────────────┐
 ▼               ▼
Score Service   Notification Service
 │               │
 ▼               ▼
Database        Users
```

---

# 🔒 Security Considerations

Production deployment should include:

* HTTPS everywhere
* Secure JWT configuration
* Strong secret keys
* Password hashing
* Input validation
* CORS configuration
* Rate limiting
* Secure environment variables
* Database access restrictions
* Authentication and authorization checks
* Protection against SQL injection through ORM/parameterized queries

---

# 🎯 Future Improvements

Potential future improvements include:

* Real-time multiplayer scoring
* WebSocket-based live score updates
* Advanced player statistics
* Player rankings
* Tournament management
* Leaderboards
* Match commentary
* Scorecard sharing
* Push notifications
* Admin dashboard
* Team invitations
* Match history and analytics
* Redis caching
* Automated testing and CI/CD
* Docker-based deployment
* Horizontal backend scaling

---

# 🧪 Development & Quality

Recommended production improvements include:

```text
Unit Tests
     │
     ▼
Integration Tests
     │
     ▼
API Tests
     │
     ▼
Frontend Tests
     │
     ▼
CI/CD Pipeline
     │
     ▼
Production Deployment
```

---

# 👨‍💻 Author

**Sujal Tiwari**

GitHub:
https://github.com/sujaltiwari278

---

# 📄 License

This project is currently intended as a personal/academic project.

If you plan to distribute or modify it publicly, add an appropriate open-source license such as MIT.
