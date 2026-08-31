from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.match import Innings, Match, MatchPlayer


class ResultService:
    """Build live chase state and final match result from persisted match data."""

    @staticmethod
    def summary(db: Session, match_id: int) -> dict:
        match = db.get(Match, match_id)
        if not match:
            raise ValueError("Match not found.")

        innings = list(
            db.scalars(
                select(Innings)
                .where(Innings.match_id == match_id)
                .order_by(Innings.number)
            ).all()
        )

        def team(team_id: int):
            t = match.team_a if team_id == match.team_a_id else match.team_b
            return {"id": t.id, "name": t.name, "short_name": t.short_name}

        scores = [
            {
                "innings": i.number,
                "team": team(i.batting_team_id),
                "runs": i.runs,
                "wickets": i.wickets,
                "overs": f"{i.legal_balls // 6}.{i.legal_balls % 6}",
                "status": i.status,
            }
            for i in innings
        ]

        winner = None
        result_type = "IN_PROGRESS"
        margin = None
        result_text = "Match in progress"
        target = None
        runs_required = None
        balls_remaining = None
        required_run_rate = None
        target_team = None

        # Limited-overs chase: while innings 2 is live, NEVER declare a winner.
        # The previous implementation compared scores as soon as innings 2 existed,
        # which incorrectly displayed e.g. "Team A won by 98 runs" at 13/0.
        if match.format != "TEST" and len(innings) >= 2:
            first, second = innings[0], innings[1]
            target = first.runs + 1
            target_team = team(second.batting_team_id)

            # Only a completed match may produce a final winner/result.
            if match.status == "COMPLETED":
                if second.runs >= target:
                    winner = team(second.batting_team_id)
                    result_type = "WIN_BY_WICKETS"
                    xi_size = db.scalar(
                        select(func.count(MatchPlayer.id)).where(
                            MatchPlayer.match_id == match.id,
                            MatchPlayer.team_id == second.batting_team_id,
                        )
                    ) or 11
                    margin = max(0, xi_size - second.wickets)
                    result_text = f"{winner['name']} won by {margin} wicket{'s' if margin != 1 else ''}"
                elif second.runs == first.runs:
                    result_type = "TIE"
                    result_text = "Match tied"
                else:
                    winner = team(first.batting_team_id)
                    result_type = "WIN_BY_RUNS"
                    margin = first.runs - second.runs
                    result_text = f"{winner['name']} won by {margin} run{'s' if margin != 1 else ''}"
            else:
                runs_required = max(0, target - second.runs)
                if match.overs is not None:
                    balls_remaining = max(0, (match.overs * 6) - second.legal_balls)
                    if balls_remaining > 0:
                        required_run_rate = round(runs_required / (balls_remaining / 6), 2)
                    else:
                        required_run_rate = None

                if runs_required == 0:
                    result_type = "CHASE_WON_PENDING"
                    result_text = f"{target_team['name']} have reached the target"
                elif balls_remaining is not None:
                    result_type = "CHASE"
                    result_text = (
                        f"{target_team['name']} need {runs_required} run"
                        f"{'s' if runs_required != 1 else ''} from {balls_remaining} ball"
                        f"{'s' if balls_remaining != 1 else ''}"
                    )
                else:
                    result_type = "CHASE"
                    result_text = f"{target_team['name']} need {runs_required} more runs"

        elif match.format == "TEST" and match.status == "COMPLETED" and len(innings) >= 4:
            team_a_runs = sum(i.runs for i in innings if i.batting_team_id == match.team_a_id)
            team_b_runs = sum(i.runs for i in innings if i.batting_team_id == match.team_b_id)
            if team_a_runs > team_b_runs:
                winner = team(match.team_a_id)
                result_type = "WIN_BY_RUNS"
                margin = team_a_runs - team_b_runs
                result_text = f"{winner['name']} won by {margin} runs"
            elif team_b_runs > team_a_runs:
                winner = team(match.team_b_id)
                result_type = "WIN_BY_RUNS"
                margin = team_b_runs - team_a_runs
                result_text = f"{winner['name']} won by {margin} runs"
            else:
                result_type = "TIE"
                result_text = "Match tied"
        elif match.status == "COMPLETED":
            result_type = "NO_RESULT"
            result_text = "Match completed"

        return {
            "match_id": match.id,
            "status": match.status,
            "completed_at": match.completed_at,
            "result_type": result_type,
            "result_text": result_text,
            "winner": winner,
            "margin": margin,
            "target": target,
            "runs_required": runs_required,
            "balls_remaining": balls_remaining,
            "required_run_rate": required_run_rate,
            "target_team": target_team,
            "innings": scores,
        }
