from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.match import Delivery, Innings, Match, MatchPlayer
from app.models.player import Player
from app.schemas.match import DeliveryCreate, InningsStartRequest


class ScoringService:

    @staticmethod
    def _innings(
        db: Session,
        innings_id: int,
    ) -> Innings | None:
        return db.scalar(
            select(Innings).where(
                Innings.id == innings_id
            )
        )

    @staticmethod
    def _xi_ids(
        db: Session,
        match_id: int,
        team_id: int,
    ) -> set[int]:
        return set(
            db.scalars(
                select(MatchPlayer.player_id).where(
                    MatchPlayer.match_id == match_id,
                    MatchPlayer.team_id == team_id,
                )
            ).all()
        )

    @staticmethod
    def _brief(player: Player | None):
        if not player:
            return None

        return {
            "id": player.id,
            "username": player.user.username,
            "display_name": player.display_name,
            "role": player.role,
        }

    @classmethod
    def _delivery_response(
        cls,
        delivery: Delivery,
    ):
        return {
            "id": delivery.id,
            "innings_id": delivery.innings_id,
            "over_number": delivery.over_number,
            "ball_number": delivery.ball_number,

            "striker_id": delivery.striker_id,
            "striker_name": delivery.striker.display_name,

            "non_striker_id": delivery.non_striker_id,
            "non_striker_name": delivery.non_striker.display_name,

            "bowler_id": delivery.bowler_id,
            "bowler_name": delivery.bowler.display_name,

            "batter_runs": delivery.batter_runs,

            "extra_type": delivery.extra_type,
            "extra_runs": delivery.extra_runs,
            "total_runs": delivery.total_runs,

            "legal": delivery.legal,

            "wicket_type": delivery.wicket_type,

            "dismissed_player_id":
                delivery.dismissed_player_id,

            "dismissed_player_name":
                delivery.dismissed_player.display_name
                if delivery.dismissed_player
                else None,

            "fielder_id":
                delivery.fielder_id,

            "fielder_name":
                delivery.fielder.display_name
                if delivery.fielder
                else None,

            "commentary":
                delivery.commentary,

        }

    @classmethod
    def innings_response(
        cls,
        innings: Innings,
    ):
        return {
            "id": innings.id,
            "number": innings.number,

            "batting_team": {
                "id": innings.batting_team.id,
                "name": innings.batting_team.name,
                "short_name":
                    innings.batting_team.short_name,
                "city":
                    innings.batting_team.city,
            },

            "bowling_team": {
                "id": innings.bowling_team.id,
                "name": innings.bowling_team.name,
                "short_name":
                    innings.bowling_team.short_name,
                "city":
                    innings.bowling_team.city,
            },

            "status": innings.status,

            "runs": innings.runs,
            "wickets": innings.wickets,
            "legal_balls": innings.legal_balls,

            "overs":
                f"{innings.legal_balls // 6}."
                f"{innings.legal_balls % 6}",

            "striker":
                cls._brief(innings.striker),

            "non_striker":
                cls._brief(innings.non_striker),

            "bowler":
                cls._brief(innings.bowler),

            "deliveries": [
                cls._delivery_response(delivery)
                for delivery in innings.deliveries
            ],
        }

    # ---------------------------------------------------------
    # START INNINGS
    # ---------------------------------------------------------

    @classmethod
    def start_innings(
        cls,
        db: Session,
        match: Match,
        data: InningsStartRequest,
    ):

        # Match must already have been started.
        if match.status not in {
            "LIVE",
            "INNINGS_BREAK",
        }:
            raise ValueError(
                "The match is not ready for an innings. "
                "Complete the toss, select the playing XI "
                "and start the match first."
            )

        # Batting order is determined by the toss for innings 1 and by the
        # previous innings' bowling team thereafter. The client may send the
        # derived value, but the server remains the source of truth.
        existing_innings = db.scalars(
            select(Innings).where(Innings.match_id == match.id).order_by(Innings.number)
        ).all()
        number = len(existing_innings) + 1

        if number == 1:
            if not match.toss_winner_id or not match.toss_decision:
                raise ValueError("Complete the toss and choose bat or bowl before starting innings 1.")
            expected_batting_team_id = (
                match.toss_winner_id
                if match.toss_decision == "BAT"
                else (match.team_b_id if match.toss_winner_id == match.team_a_id else match.team_a_id)
            )
        else:
            previous = existing_innings[-1]
            if previous.status != "COMPLETED":
                raise ValueError("Complete the previous innings first.")
            expected_batting_team_id = previous.bowling_team_id

        batting_team_id = data.batting_team_id or expected_batting_team_id
        if batting_team_id != expected_batting_team_id:
            raise ValueError("The batting team is fixed by the toss/innings order and cannot be changed.")

        if batting_team_id == match.team_a_id:
            bowling_team_id = match.team_b_id
        elif batting_team_id == match.team_b_id:
            bowling_team_id = match.team_a_id
        else:
            raise ValueError("Invalid batting team.")

        # Get playing XIs.
        batting_ids = cls._xi_ids(
            db,
            match.id,
            batting_team_id,
        )

        bowling_ids = cls._xi_ids(
            db,
            match.id,
            bowling_team_id,
        )

        # Minimum five players.
        if len(batting_ids) < 5:
            raise ValueError(
                "The batting team must have at least "
                "5 players in the playing XI."
            )

        if len(bowling_ids) < 5:
            raise ValueError(
                "The bowling team must have at least "
                "5 players in the playing XI."
            )

        # Maximum eleven players.
        if len(batting_ids) > 11:
            raise ValueError(
                "The batting team cannot have more than "
                "11 players."
            )

        if len(bowling_ids) > 11:
            raise ValueError(
                "The bowling team cannot have more than "
                "11 players."
            )

        # Two different openers.
        if data.striker_id == data.non_striker_id:
            raise ValueError(
                "Striker and non-striker must be different."
            )

        # Both openers must be batting XI.
        if data.striker_id not in batting_ids:
            raise ValueError(
                "The striker must belong to the batting "
                "playing XI."
            )

        if data.non_striker_id not in batting_ids:
            raise ValueError(
                "The non-striker must belong to the batting "
                "playing XI."
            )

        # Bowler must be opposition player.
        if data.bowler_id not in bowling_ids:
            raise ValueError(
                "The bowler must belong to the bowling "
                "playing XI."
            )

        # Check for existing live innings.
        active = db.scalar(
            select(Innings).where(
                Innings.match_id == match.id,
                Innings.status == "LIVE",
            )
        )

        if active:
            raise ValueError(
                "An innings is already live."
            )

        max_innings = 4 if match.format == "TEST" else 2
        if number > max_innings:
            raise ValueError("This match does not support another innings.")

        # Create innings.
        innings = Innings(
            match_id=match.id,
            number=number,

            batting_team_id=
                batting_team_id,

            bowling_team_id=
                bowling_team_id,

            status="LIVE",

            current_striker_id=
                data.striker_id,

            current_non_striker_id=
                data.non_striker_id,

            current_bowler_id=
                data.bowler_id,
        )

        db.add(innings)

        # Match is live.
        match.status = "LIVE"

        db.commit()
        db.refresh(innings)

        return cls.innings_response(
            innings
        )

    @staticmethod
    def _previous_over_bowler(
        db: Session,
        innings_id: int,
    ) -> int | None:
        """Return the bowler who delivered the most recently completed over."""
        # Do not infer this from the current bowler because the scorer clears
        # current_bowler_id at the end of an over. Instead, find the last
        # completed over in the delivery table. This is the authoritative
        # server-side source and also works after refresh/reload.
        last_over = db.scalar(
            select(func.max(Delivery.over_number)).where(
                Delivery.innings_id == innings_id
            )
        )

        if last_over is None:
            return None

        return db.scalar(
            select(Delivery.bowler_id)
            .where(
                Delivery.innings_id == innings_id,
                Delivery.over_number == last_over,
            )
            .order_by(Delivery.id.desc())
            .limit(1)
        )

    # ---------------------------------------------------------
    # UPDATE CURRENT PLAYER STATE
    # ---------------------------------------------------------

    @classmethod
    def update_state(
        cls,
        db: Session,
        match: Match,
        innings_id: int,
        data,
    ):

        innings = cls._innings(
            db,
            innings_id,
        )

        if not innings:
            raise ValueError(
                "Innings not found."
            )

        if innings.match_id != match.id:
            raise ValueError(
                "Innings does not belong to this match."
            )

        if innings.status != "LIVE":
            raise ValueError(
                "This innings is not live."
            )

        batting_ids = cls._xi_ids(
            db,
            match.id,
            innings.batting_team_id,
        )

        bowling_ids = cls._xi_ids(
            db,
            match.id,
            innings.bowling_team_id,
        )

        if data.striker_id == data.non_striker_id:
            raise ValueError(
                "Striker and non-striker must be different."
            )

        if data.striker_id not in batting_ids:
            raise ValueError(
                "Striker must belong to the batting XI."
            )

        if data.non_striker_id not in batting_ids:
            raise ValueError(
                "Non-striker must belong to the batting XI."
            )

        if data.bowler_id not in bowling_ids:
            raise ValueError(
                "Bowler must belong to the bowling XI."
            )

        # A bowler cannot deliver two consecutive overs. This check is
        # intentionally server-side so it cannot be bypassed by the UI.
        # At the start of a new over current_bowler_id is None and the
        # previous over's bowler is recovered from the deliveries table.
        if innings.legal_balls > 0 and innings.legal_balls % 6 == 0:
            previous_bowler = cls._previous_over_bowler(
                db, innings.id
            )
            if previous_bowler is not None and previous_bowler == data.bowler_id:
                raise ValueError(
                    "The same bowler cannot bowl consecutive overs. Select a different bowler."
                )

        innings.current_striker_id = (
            data.striker_id
        )

        innings.current_non_striker_id = (
            data.non_striker_id
        )

        innings.current_bowler_id = (
            data.bowler_id
        )

        db.commit()
        db.refresh(innings)

        return cls.innings_response(
            innings
        )

    # ---------------------------------------------------------
    # ADD DELIVERY
    # ---------------------------------------------------------

    @classmethod
    def add_delivery(
        cls,
        db: Session,
        match: Match,
        innings_id: int,
        data: DeliveryCreate,
    ):

        if match.status != "LIVE":
            raise ValueError(
                "The match is not live."
            )

        innings = cls._innings(
            db,
            innings_id,
        )

        if not innings:
            raise ValueError(
                "Innings not found."
            )

        if innings.match_id != match.id:
            raise ValueError(
                "Innings does not belong to this match."
            )

        if innings.status != "LIVE":
            raise ValueError(
                "This innings is not live."
            )

        if (
            not innings.current_striker_id
            or not innings.current_non_striker_id
            or not innings.current_bowler_id
        ):
            raise ValueError(
                "Set the striker, non-striker and bowler "
                "before scoring."
            )

        # -----------------------------------------------------
        # NORMAL BALL
        # -----------------------------------------------------

        if data.extra_type == "NONE":

            if data.extra_runs != 0:
                raise ValueError(
                    "Normal deliveries cannot contain "
                    "extra runs."
                )

            if data.batter_runs > 6:
                raise ValueError(
                    "Batter runs cannot exceed 6."
                )

            legal = True
            total = data.batter_runs

        # -----------------------------------------------------
        # WIDE
        # -----------------------------------------------------

        elif data.extra_type == "WIDE":

            if data.batter_runs != 0:
                raise ValueError(
                    "A wide cannot have batter runs."
                )

            if not (1 <= data.extra_runs <= 6):
                raise ValueError("Wide total runs must be between 1 and 6.")

            legal = False

            total = data.extra_runs

        # -----------------------------------------------------
        # NO BALL
        # -----------------------------------------------------

        elif data.extra_type == "NO_BALL":

            # One run is always the no-ball extra.
            # One run is always the no-ball penalty. The scorer chooses
            # additional bat runs, with the total capped at 6 for this app.
            if data.extra_runs != 1:
                raise ValueError("A no-ball must contain exactly 1 no-ball extra run.")
            if not (0 <= data.batter_runs <= 6):
                raise ValueError("No-ball bat runs must be between 0 and 6 (1 penalty + up to 6 bat runs).")
            legal = False
            total = 1 + data.batter_runs

        # -----------------------------------------------------
        # BYE / LEG-BYE
        # -----------------------------------------------------

        else:

            if data.batter_runs != 0:
                raise ValueError(
                    "Bye and leg-bye cannot contain "
                    "batter runs."
                )

            if not (
                1 <= data.extra_runs <= 6
            ):
                raise ValueError(
                    "Bye/leg-bye runs must be "
                    "between 1 and 6."
                )

            legal = True

            total = data.extra_runs

        # -----------------------------------------------------
        # WICKET
        # -----------------------------------------------------

        wicket = (
            data.wicket_type != "NONE"
        )

        if wicket and not data.dismissed_player_id:
            raise ValueError(
                "Select the dismissed batter."
            )

        batting_ids = cls._xi_ids(
            db,
            match.id,
            innings.batting_team_id,
        )

        bowling_ids = cls._xi_ids(
            db,
            match.id,
            innings.bowling_team_id,
        )

        if (
            data.dismissed_player_id
            and data.dismissed_player_id
            not in batting_ids
        ):
            raise ValueError(
                "Dismissed player must belong "
                "to the batting playing XI."
            )

        if data.wicket_type in {
            "CAUGHT",
            "RUN_OUT",
        }:

            if not data.fielder_id:
                raise ValueError(
                    "Select the fielder."
                )

        if (
            data.fielder_id
            and data.fielder_id not in bowling_ids
        ):
            raise ValueError(
                "Fielder must belong to the "
                "bowling playing XI."
            )

        # -----------------------------------------------------
        # BALL NUMBER
        # -----------------------------------------------------

        over_number = (
            innings.legal_balls // 6
        ) + 1

        ball_number = (
            innings.legal_balls % 6
        ) + 1

        # -----------------------------------------------------
        # COMMENTARY
        # -----------------------------------------------------

        commentary = (
            data.commentary.strip()
            if data.commentary
            else cls.default_commentary(
                data,
                innings,
            )
        )

        # -----------------------------------------------------
        # DELIVERY
        # -----------------------------------------------------

        delivery = Delivery(
            innings_id=innings.id,

            over_number=over_number,
            ball_number=ball_number,

            striker_id=
                innings.current_striker_id,

            non_striker_id=
                innings.current_non_striker_id,

            bowler_id=
                innings.current_bowler_id,

            batter_runs=
                data.batter_runs,

            extra_type=(
                None
                if data.extra_type == "NONE"
                else data.extra_type
            ),

            extra_runs=
                data.extra_runs,

            total_runs=
                total,

            legal=
                legal,

            wicket_type=(
                None
                if data.wicket_type == "NONE"
                else data.wicket_type
            ),

            dismissed_player_id=
                data.dismissed_player_id,

            fielder_id=
                data.fielder_id,

            commentary=
                commentary,

        )

        db.add(delivery)

        # -----------------------------------------------------
        # UPDATE SCORE
        # -----------------------------------------------------

        innings.runs += total

        if legal:
            innings.legal_balls += 1

        # In a limited-overs chase, reaching the first innings score + 1
        # immediately wins the match. Do this before the normal over/wicket
        # completion checks so the scorer stops as soon as the target is passed.
        chase_won = False
        if match.format != "TEST" and innings.number == 2:
            first_innings = db.scalar(
                select(Innings).where(
                    Innings.match_id == match.id,
                    Innings.number == 1,
                )
            )
            if first_innings and innings.runs > first_innings.runs:
                chase_won = True

        counts_as_wicket = wicket and data.wicket_type != "RETIRED_HURT"

        if counts_as_wicket:
            innings.wickets += 1

        # -----------------------------------------------------
        # STRIKE ROTATION
        # -----------------------------------------------------

        original_striker = (
            delivery.striker_id
        )

        original_non_striker = (
            delivery.non_striker_id
        )

        dismissed = (
            data.dismissed_player_id
        )

        # Runs can cause a change of strike.
        if total % 2 == 1:

            (
                innings.current_striker_id,
                innings.current_non_striker_id,
            ) = (
                innings.current_non_striker_id,
                innings.current_striker_id,
            )

        # End of over = automatic strike change.
        over_finished_now = (
            legal
            and innings.legal_balls % 6 == 0
        )

        if over_finished_now:
            (
                innings.current_striker_id,
                innings.current_non_striker_id,
            ) = (
                innings.current_non_striker_id,
                innings.current_striker_id,
            )

            # A new over must be assigned to a different bowler.
            # Clearing the bowler makes this a hard server-side guard,
            # not just a frontend hint.
            innings.current_bowler_id = None

        # -----------------------------------------------------
        # WICKET STATE
        # -----------------------------------------------------

        if wicket:

            if dismissed == original_striker:
                innings.current_striker_id = None

            elif dismissed == original_non_striker:
                innings.current_non_striker_id = None

        # -----------------------------------------------------
        # INNINGS LIMIT
        # -----------------------------------------------------

        max_balls = None

        if (
            match.format != "TEST"
            and match.overs
        ):
            max_balls = (
                match.overs * 6
            )

        all_out = (
            innings.wickets
            >= max(
                1,
                len(batting_ids) - 1,
            )
        )

        overs_finished = (
            max_balls is not None
            and innings.legal_balls
            >= max_balls
        )

        if chase_won or all_out or overs_finished:

            innings.status = "COMPLETED"

            if innings.number == 1:
                match.status = "INNINGS_BREAK"
            else:
                match.status = "COMPLETED"

        db.commit()

        db.refresh(innings)
        db.refresh(delivery)

        return cls.innings_response(
            innings
        )

    # ---------------------------------------------------------
    # COMMENTARY
    # ---------------------------------------------------------

    @staticmethod
    def default_commentary(
        data: DeliveryCreate,
        innings: Innings,
    ):

        if data.wicket_type == "CAUGHT":
            return "OUT! Caught."

        if data.wicket_type == "RUN_OUT":
            return "OUT! Run out."

        if data.wicket_type != "NONE":
            return (
                "OUT! "
                + data.wicket_type
                .replace("_", " ")
                .title()
                + "."
            )

        if data.extra_type == "WIDE":
            return (
                f"Wide. {data.extra_runs} "
                f"run"
                f"{'s' if data.extra_runs != 1 else ''}."
            )

        if data.extra_type == "NO_BALL":
            total = 1 + data.batter_runs
            return f"No ball. {data.batter_runs} off the bat, {total} run{'s' if total != 1 else ''} total."

        if data.extra_type == "BYE":
            return (
                f"{data.extra_runs} bye"
                f"{'s' if data.extra_runs != 1 else ''}."
            )

        if data.extra_type == "LEG_BYE":
            return (
                f"{data.extra_runs} leg-bye"
                f"{'s' if data.extra_runs != 1 else ''}."
            )

        if data.batter_runs == 0:
            return "Dot ball."

        if data.batter_runs == 4:
            return "FOUR! Beautiful boundary."

        if data.batter_runs == 6:
            return "SIX! Maximum."

        return (
            f"{data.batter_runs} run"
            f"{'s' if data.batter_runs != 1 else ''}."
        )