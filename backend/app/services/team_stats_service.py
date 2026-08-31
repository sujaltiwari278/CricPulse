from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.match import Innings, Match
from app.models.team import Team


class TeamStatsService:
    @staticmethod
    def summary(db: Session, team_id: int) -> dict:
        team = db.get(Team, team_id)
        if not team:
            raise ValueError("Team not found.")

        matches = db.scalars(
            select(Match).where(
                (Match.team_a_id == team_id) | (Match.team_b_id == team_id)
            )
        ).all()

        completed = [m for m in matches if m.status == "COMPLETED"]
        wins = losses = ties = 0
        runs_for = runs_against = 0

        for match in completed:
            innings = db.scalars(
                select(Innings).where(Innings.match_id == match.id)
            ).all()

            team_scores = [i.runs for i in innings if i.batting_team_id == team_id]
            opposition_scores = [i.runs for i in innings if i.batting_team_id != team_id]

            runs_for += sum(team_scores)
            runs_against += sum(opposition_scores)

            if team_scores and opposition_scores:
                team_total = sum(team_scores)
                opposition_total = sum(opposition_scores)
                if team_total > opposition_total:
                    wins += 1
                elif team_total < opposition_total:
                    losses += 1
                else:
                    ties += 1

        return {
            "team_id": team_id,
            "matches": len(matches),
            "completed_matches": len(completed),
            "wins": wins,
            "losses": losses,
            "ties": ties,
            "runs_for": runs_for,
            "runs_against": runs_against,
            "win_percentage": round((wins * 100 / len(completed)), 2) if completed else 0.0,
        }
