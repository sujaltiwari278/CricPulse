from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.match import Delivery, Innings


class AnalyticsService:
    """Calculates match analytics from persisted ball-by-ball deliveries."""

    @staticmethod
    def _get_innings(db: Session, innings_id: int) -> Innings | None:
        return db.scalar(select(Innings).where(Innings.id == innings_id))

    @classmethod
    def over_runs(cls, db: Session, innings_id: int) -> dict:
        innings = cls._get_innings(db, innings_id)
        if not innings:
            return {"innings_id": innings_id, "overs": []}
        totals = defaultdict(int)
        for d in innings.deliveries:
            totals[d.over_number] += d.total_runs
        return {
            "innings_id": innings_id,
            "overs": [{"over": n, "runs": totals[n]} for n in sorted(totals)],
        }

    @classmethod
    def match_analytics(cls, db: Session, match_id: int) -> dict:
        innings_list = list(db.scalars(
            select(Innings).where(Innings.match_id == match_id).order_by(Innings.number)
        ).all())
        result = []
        for innings in innings_list:
            deliveries = list(db.scalars(
                select(Delivery).where(Delivery.innings_id == innings.id).order_by(Delivery.id)
            ).all())
            over_totals = defaultdict(int)
            worm = []
            cumulative = 0
            batter_totals = defaultdict(lambda: {"runs": 0, "balls": 0, "fours": 0, "sixes": 0, "name": ""})
            for d in deliveries:
                over_totals[d.over_number] += d.total_runs
                cumulative += d.total_runs
                worm.append({"ball": d.id, "runs": cumulative, "over": d.over_number, "ball_number": d.ball_number})
                b = batter_totals[d.striker_id]
                b["name"] = d.striker.display_name if d.striker else str(d.striker_id)
                b["runs"] += d.batter_runs
                if d.extra_type != "WIDE": b["balls"] += 1
                if d.batter_runs == 4: b["fours"] += 1
                if d.batter_runs == 6: b["sixes"] += 1
            batters = []
            for pid, b in batter_totals.items():
                batters.append({"player_id": pid, "player_name": b["name"], "runs": b["runs"], "balls": b["balls"], "fours": b["fours"], "sixes": b["sixes"], "strike_rate": round((b["runs"] * 100 / b["balls"]) if b["balls"] else 0, 2)})
            result.append({
                "innings_id": innings.id, "number": innings.number,
                "batting_team": {"id": innings.batting_team.id, "name": innings.batting_team.name, "short_name": innings.batting_team.short_name},
                "runs": innings.runs, "wickets": innings.wickets,
                "overs": f"{innings.legal_balls // 6}.{innings.legal_balls % 6}",
                "over_series": [{"over": n, "runs": over_totals[n]} for n in sorted(over_totals)],
                "worm": worm, "batters": batters,
            })
        return {"match_id": match_id, "innings": result}

    @classmethod
    def worm(cls, db: Session, innings_id: int) -> dict:
        innings = cls._get_innings(db, innings_id)
        if not innings:
            return {"innings_id": innings_id, "points": []}
        cumulative = 0
        points = []
        for d in innings.deliveries:
            cumulative += d.total_runs
            points.append({
                "delivery_id": d.id,
                "over": d.over_number,
                "ball": d.ball_number,
                "score": cumulative,
            })
        return {"innings_id": innings_id, "points": points}
