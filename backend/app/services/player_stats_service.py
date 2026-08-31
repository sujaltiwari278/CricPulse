from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.match import Delivery, Innings, MatchPlayer
from app.models.player import Player


class PlayerStatsService:
    @staticmethod
    def career(db: Session, player_id: int) -> dict:
        player = db.get(Player, player_id)
        if not player:
            raise ValueError("Player profile not found.")

        deliveries = db.scalars(
            select(Delivery)
            .join(Innings, Delivery.innings_id == Innings.id)
            .where(
                (Delivery.striker_id == player_id)
                | (Delivery.bowler_id == player_id)
                | (Delivery.fielder_id == player_id)
                | (Delivery.dismissed_player_id == player_id)
            )
            .order_by(Delivery.created_at, Delivery.id)
        ).all()

        match_ids = set()
        innings_batted = set()
        innings_bowled = set()

        runs = balls = fours = sixes = highest = not_outs = 0
        wickets = catches = run_outs = 0
        runs_conceded = legal_bowling_balls = 0

        dismissed_in_innings = set()
        for d in deliveries:
            innings = d.innings
            match_ids.add(innings.match_id)

            if d.striker_id == player_id:
                innings_batted.add(innings.id)
                runs += d.batter_runs
                if d.legal:
                    balls += 1
                if d.batter_runs == 4:
                    fours += 1
                elif d.batter_runs == 6:
                    sixes += 1
                highest = max(highest, 0)

            if d.bowler_id == player_id:
                innings_bowled.add(innings.id)
                if d.legal:
                    legal_bowling_balls += 1
                if d.extra_type not in ("BYE", "LEG_BYE"):
                    runs_conceded += d.total_runs

            if d.dismissed_player_id == player_id:
                dismissed_in_innings.add(innings.id)
                wickets += 1

            if d.fielder_id == player_id and d.wicket_type == "CAUGHT":
                catches += 1
            if d.fielder_id == player_id and d.wicket_type == "RUN_OUT":
                run_outs += 1

        # Calculate innings scores from all deliveries so highest score and not-outs
        # remain correct even when the player appears in several matches.
        batted_innings = db.scalars(
            select(Innings)
            .join(Delivery, Delivery.innings_id == Innings.id)
            .where(Delivery.striker_id == player_id)
            .distinct()
        ).all()

        innings_scores = {}
        for inn in batted_innings:
            score = sum(d.batter_runs for d in inn.deliveries if d.striker_id == player_id)
            innings_scores[inn.id] = score

        highest = max(innings_scores.values(), default=0)
        not_outs = sum(1 for iid in innings_scores if iid not in dismissed_in_innings)
        fifties = sum(1 for score in innings_scores.values() if 50 <= score < 100)
        hundreds = sum(1 for score in innings_scores.values() if score >= 100)

        credited_wicket_types = {"BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"}
        bowling_figures = []
        bowled_innings_rows = db.scalars(
            select(Innings)
            .join(Delivery, Delivery.innings_id == Innings.id)
            .where(Delivery.bowler_id == player_id)
            .distinct()
        ).all()
        for inn in bowled_innings_rows:
            balls_in_innings = 0
            conceded_in_innings = 0
            wickets_in_innings = 0
            for d in inn.deliveries:
                if d.bowler_id != player_id:
                    continue
                if d.legal:
                    balls_in_innings += 1
                if d.extra_type not in ("BYE", "LEG_BYE"):
                    conceded_in_innings += d.total_runs
                if d.dismissed_player_id and d.wicket_type in credited_wicket_types:
                    wickets_in_innings += 1
            if balls_in_innings or wickets_in_innings:
                bowling_figures.append((wickets_in_innings, conceded_in_innings))

        best_bowling = max(bowling_figures, key=lambda pair: (pair[0], -pair[1]), default=(0, 0))
        best_bowling_figures = f"{best_bowling[0]}/{best_bowling[1]}" if bowling_figures else "—"
        three_wicket_hauls = sum(1 for wickets_in, _ in bowling_figures if 3 <= wickets_in < 5)
        five_wicket_hauls = sum(1 for wickets_in, _ in bowling_figures if wickets_in >= 5)

        overs = f"{legal_bowling_balls // 6}.{legal_bowling_balls % 6}"
        average = (runs / (len(innings_scores) - not_outs)) if (len(innings_scores) - not_outs) > 0 else 0.0
        strike_rate = (runs * 100 / balls) if balls else 0.0
        economy = (runs_conceded * 6 / legal_bowling_balls) if legal_bowling_balls else 0.0

        match_player_rows = db.scalars(
            select(MatchPlayer).where(MatchPlayer.player_id == player_id)
        ).all()

        return {
            "player_id": player_id,
            "matches": len({row.match_id for row in match_player_rows} | match_ids),
            "batting_innings": len(innings_scores),
            "runs": runs,
            "balls": balls,
            "highest_score": highest,
            "not_outs": not_outs,
            "batting_average": round(average, 2),
            "strike_rate": round(strike_rate, 2),
            "fours": fours,
            "sixes": sixes,
            "wickets": wickets,
            "overs_bowled": overs,
            "runs_conceded": runs_conceded,
            "economy": round(economy, 2),
            "fifties": fifties,
            "hundreds": hundreds,
            "best_bowling_figures": best_bowling_figures,
            "three_wicket_hauls": three_wicket_hauls,
            "five_wicket_hauls": five_wicket_hauls,
            "catches": catches,
            "run_outs": run_outs,
        }
