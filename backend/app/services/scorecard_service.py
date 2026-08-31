from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.match import Delivery, Innings, Match, MatchPlayer


class ScorecardService:
    """Build a complete scorecard from persisted ball-by-ball data."""

    @staticmethod
    def build(db: Session, match_id: int):
        match = db.get(Match, match_id)
        if not match:
            return None

        innings_list = list(db.scalars(
            select(Innings)
            .where(Innings.match_id == match_id)
            .order_by(Innings.number)
        ).all())

        result = []
        for innings in innings_list:
            deliveries = list(db.scalars(
                select(Delivery)
                .where(Delivery.innings_id == innings.id)
                .order_by(Delivery.id)
            ).all())

            batting_ids = list(db.scalars(
                select(MatchPlayer.player_id)
                .where(
                    MatchPlayer.match_id == match_id,
                    MatchPlayer.team_id == innings.batting_team_id,
                )
            ).all())

            bowling_ids = list(db.scalars(
                select(MatchPlayer.player_id)
                .where(
                    MatchPlayer.match_id == match_id,
                    MatchPlayer.team_id == innings.bowling_team_id,
                )
            ).all())

            player_map = {}
            for delivery_index, d in enumerate(deliveries):
                for pl in (d.striker, d.non_striker, d.bowler, d.dismissed_player, d.fielder):
                    if pl:
                        player_map[pl.id] = pl
            # Include players who have not faced/bowled yet.
            for pid in batting_ids + bowling_ids:
                if pid not in player_map:
                    from app.models.player import Player
                    pl = db.get(Player, pid)
                    if pl:
                        player_map[pid] = pl

            batting = {}
            for pid in batting_ids:
                batting[pid] = {
                    "player_id": pid,
                    "name": player_map[pid].display_name if pid in player_map else f"Player {pid}",
                    "runs": 0, "balls": 0, "fours": 0, "sixes": 0,
                    "dismissed": False, "dismissal": None,
                }

            bowling = {}
            for pid in bowling_ids:
                bowling[pid] = {
                    "player_id": pid,
                    "name": player_map[pid].display_name if pid in player_map else f"Player {pid}",
                    "balls": 0, "maidens": 0, "runs": 0, "wickets": 0,
                    "wides": 0, "no_balls": 0,
                }

            extras = {"wides": 0, "no_balls": 0, "byes": 0, "leg_byes": 0, "total": 0}
            fow = []
            over_runs = {}

            for delivery_index, d in enumerate(deliveries):
                b = batting.get(d.striker_id)
                if b:
                    b["runs"] += d.batter_runs
                    if d.batter_runs == 4:
                        b["fours"] += 1
                    if d.batter_runs == 6:
                        b["sixes"] += 1
                    if d.extra_type != "WIDE":
                        b["balls"] += 1

                bw = bowling.get(d.bowler_id)
                if bw:
                    if d.legal:
                        bw["balls"] += 1
                    bw["runs"] += d.total_runs - (d.extra_runs if d.extra_type in {"BYE", "LEG_BYE"} else 0)
                    if d.extra_type == "WIDE":
                        bw["wides"] += d.extra_runs
                    elif d.extra_type == "NO_BALL":
                        bw["no_balls"] += d.extra_runs
                    if d.wicket_type in {"BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"}:
                        bw["wickets"] += 1

                if d.extra_type == "WIDE": extras["wides"] += d.extra_runs
                elif d.extra_type == "NO_BALL": extras["no_balls"] += d.extra_runs
                elif d.extra_type == "BYE": extras["byes"] += d.extra_runs
                elif d.extra_type == "LEG_BYE": extras["leg_byes"] += d.extra_runs
                extras["total"] += d.extra_runs
                over_runs[d.over_number] = over_runs.get(d.over_number, 0) + d.total_runs

                if d.dismissed_player_id:
                    dismissed = batting.get(d.dismissed_player_id)
                    name = dismissed["name"] if dismissed else (d.dismissed_player.display_name if d.dismissed_player else "Unknown")
                    fow.append({
                        "wicket": len(fow) + 1,
                        "score": sum(x.total_runs for x in deliveries[:delivery_index + 1]),
                        "over": f"{d.over_number}.{d.ball_number}",
                        "player_id": d.dismissed_player_id,
                        "player_name": name,
                        "dismissal": d.wicket_type.replace("_", " ").title() if d.wicket_type else "Out",
                        "fielder": d.fielder.display_name if d.fielder else None,
                    })
                    if dismissed:
                        dismissed["dismissed"] = True
                        dismissed["dismissal"] = d.wicket_type.replace("_", " ").title() if d.wicket_type else "Out"

            for bw in bowling.values():
                bw["overs"] = f"{bw['balls'] // 6}.{bw['balls'] % 6}"
                bw["economy"] = round((bw["runs"] * 6 / bw["balls"]) if bw["balls"] else 0, 2)

            # Partnership blocks are derived from wickets. They intentionally use
            # total team runs, so extras belong to the partnership too.
            partnerships = []
            start_score = 0
            wicket_index = 0
            for f in fow:
                partnerships.append({
                    "wicket": f["wicket"],
                    "runs": f["score"] - start_score,
                    "ended_at": f["score"],
                    "dismissed": f["player_name"],
                })
                start_score = f["score"]
                wicket_index += 1
            if innings.runs >= start_score:
                partnerships.append({
                    "wicket": None,
                    "runs": innings.runs - start_score,
                    "ended_at": innings.runs,
                    "dismissed": None,
                })

            result.append({
                "id": innings.id,
                "number": innings.number,
                "batting_team": {"id": innings.batting_team.id, "name": innings.batting_team.name, "short_name": innings.batting_team.short_name},
                "bowling_team": {"id": innings.bowling_team.id, "name": innings.bowling_team.name, "short_name": innings.bowling_team.short_name},
                "status": innings.status,
                "runs": innings.runs, "wickets": innings.wickets, "overs": f"{innings.legal_balls // 6}.{innings.legal_balls % 6}",
                "batting": list(batting.values()),
                "bowling": list(bowling.values()),
                "extras": extras,
                "fall_of_wickets": fow,
                "partnerships": partnerships,
                "over_summary": [{"over": o, "runs": r} for o, r in sorted(over_runs.items())],
            })

        return {"match_id": match_id, "innings": result}
