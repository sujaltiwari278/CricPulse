import secrets
from datetime import datetime, timezone

from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.models.match import Delivery, Innings, Match, MatchPlayer
from app.models.team import Team
from app.models.user import User
from app.schemas.match import MatchCreate, MatchUpdate, MatchPlayerIds


class MatchService:
    @staticmethod
    def _brief(team: Team) -> dict:
        return {"id": team.id, "name": team.name, "short_name": team.short_name, "city": team.city}

    @classmethod
    def response(cls, match: Match) -> dict:
        return {
            "id": match.id,
            "creator_id": match.creator_id,
            "team_a": cls._brief(match.team_a),
            "team_b": cls._brief(match.team_b),
            "format": match.format,
            "overs": match.overs,
            "test_days": match.test_days,
            "overs_per_day": match.overs_per_day,
            "venue": match.venue,
            "location": match.location,
            "latitude": match.latitude,
            "longitude": match.longitude,
            "description": match.description,
            "status": match.status,
            "toss_winner_id": match.toss_winner_id,
            "toss_result": match.toss_result,
            "toss_decision": match.toss_decision,
            "started_at": match.started_at,
            "completed_at": match.completed_at,
            "created_at": match.created_at,
        }

    @staticmethod
    def _get(db: Session, match_id: int) -> Match | None:
        return db.scalar(select(Match).where(Match.id == match_id))

    @classmethod
    def _ensure_match_roster(cls, db: Session, match: Match) -> None:
        """Create a match Playing XI automatically for 5–11 player squads.

        This method is deliberately defensive because a player may belong to
        more than one club globally, but can represent only one side in a
        particular match. Validate the complete two-team roster before flushing
        anything, so bad team composition becomes a normal validation error
        instead of a database 500.
        """
        from app.models.team import TeamMember

        team_ids = (match.team_a_id, match.team_b_id)
        existing_by_team: dict[int, list[int]] = {}
        members_by_team: dict[int, list[int]] = {}

        for team_id in team_ids:
            existing_by_team[team_id] = db.scalars(
                select(MatchPlayer.player_id).where(
                    MatchPlayer.match_id == match.id,
                    MatchPlayer.team_id == team_id,
                )
            ).all()
            members_by_team[team_id] = db.scalars(
                select(TeamMember.player_id)
                .where(TeamMember.team_id == team_id)
                .order_by(TeamMember.id)
            ).all()

        # If either side already has an explicit XI, do not overwrite it.
        # For small squads, however, complete the missing side automatically.
        a_members = set(members_by_team[match.team_a_id])
        b_members = set(members_by_team[match.team_b_id])
        overlap = a_members & b_members
        if overlap:
            raise ValueError(
                "At least one player belongs to both selected teams. "
                "A player cannot represent both teams in the same match."
            )

        for team_id in team_ids:
            existing = existing_by_team[team_id]
            members = members_by_team[team_id]

            # Small squads are their own Playing XI. If an older/failed match
            # contains a partial roster, repair it before starting instead of
            # forcing the user to select an impossible XI.
            if 5 <= len(members) <= 11:
                if len(existing) != len(members) or set(existing) != set(members):
                    db.query(MatchPlayer).filter(
                        MatchPlayer.match_id == match.id,
                        MatchPlayer.team_id == team_id,
                    ).delete(synchronize_session=False)
                    for player_id in members:
                        db.add(
                            MatchPlayer(
                                match_id=match.id,
                                team_id=team_id,
                                player_id=player_id,
                            )
                        )
            elif not existing:
                # A larger squad requires an explicit 5–11 player XI. Leave the
                # empty side alone so the caller receives the correct validation.
                continue

        db.flush()

    @classmethod
    def create(cls, db: Session, creator_id: int, data: MatchCreate) -> dict:
        teams = list(db.scalars(select(Team).where(Team.id.in_([data.team_a_id, data.team_b_id]))).all())
        team_ids = {t.id for t in teams}
        if data.team_a_id not in team_ids or data.team_b_id not in team_ids:
            raise ValueError("Both selected teams must exist.")

        match = Match(
            creator_id=creator_id,
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            format=data.format,
            overs=data.overs,
            test_days=data.test_days,
            overs_per_day=data.overs_per_day,
            venue=data.venue.strip() if data.venue else None,
            location=data.location.strip() if data.location else None,
            latitude=data.latitude,
            longitude=data.longitude,
            description=data.description.strip() if data.description else None,
            status="CREATED",
        )
        db.add(match)
        db.commit()
        db.refresh(match)
        return cls.response(match)

    @classmethod
    def list(cls, db: Session, live_only: bool = False):
        stmt = select(Match).order_by(Match.created_at.desc())
        if live_only:
            stmt = stmt.where(Match.status.in_(["LIVE", "INNINGS_BREAK", "TOSS_COMPLETED", "READY"]))
        return [cls.response(m) for m in db.scalars(stmt).all()]

    @classmethod
    def get(cls, db: Session, match_id: int) -> dict | None:
        match = cls._get(db, match_id)
        return None if not match else cls.response(match)

    @classmethod
    def delete(cls, db: Session, match_id: int, owner_id: int) -> None:
        """Delete a match and all match-owned scoring rows explicitly."""
        match = cls._get(db, match_id)
        if not match:
            raise ValueError("Match not found.")
        if int(match.creator_id) != int(owner_id):
            raise PermissionError("Only the match creator can delete this match.")
        try:
            innings_ids = db.scalars(select(Innings.id).where(Innings.match_id == match.id)).all()
            if innings_ids:
                db.query(Delivery).filter(Delivery.innings_id.in_(innings_ids)).delete(synchronize_session=False)
            db.query(Innings).filter(Innings.match_id == match.id).delete(synchronize_session=False)
            db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).delete(synchronize_session=False)
            db.query(Match).filter(Match.id == match.id).delete(synchronize_session=False)
            db.commit()
        except Exception as exc:
            db.rollback()
            raise ValueError(f"Unable to delete match: {exc}") from exc

    @classmethod
    def update(cls, db: Session, match_id: int, owner_id: int, data: MatchUpdate) -> dict:
        match = cls._get(db, match_id)
        if not match:
            raise ValueError("Match not found.")
        if match.creator_id != owner_id:
            raise PermissionError("Only the match creator can edit this match.")
        if match.status not in {"CREATED", "TOSS_PENDING"}:
            raise ValueError("Match settings are locked after the match has started.")

        changes = data.model_dump(exclude_unset=True)
        fmt = changes.get("format", match.format)

        if fmt == "TEST":
            days = changes.get("test_days", match.test_days)
            per_day = changes.get("overs_per_day", match.overs_per_day)
            if days is None or per_day is None:
                raise ValueError("Test matches require number of days and overs per day.")
            changes["overs"] = None
            changes["test_days"] = days
            changes["overs_per_day"] = per_day
        else:
            limited_overs = changes.get("overs", match.overs)
            if limited_overs is None or limited_overs < 4:
                raise ValueError("Limited-overs matches require at least 4 overs.")
            changes["overs"] = limited_overs
            changes["test_days"] = None
            changes["overs_per_day"] = None

        for key, value in changes.items():
            setattr(match, key, value.strip() if isinstance(value, str) and key in {"venue", "location", "description"} else value)
        db.commit()
        db.refresh(match)
        return cls.response(match)


    @classmethod
    def playing_xi_response(cls, db: Session, match: Match):
        cls._ensure_match_roster(db, match)
        rows = db.scalars(select(MatchPlayer).where(MatchPlayer.match_id == match.id).order_by(MatchPlayer.team_id, MatchPlayer.id)).all()
        grouped = {match.team_a_id: [], match.team_b_id: []}
        for row in rows:
            grouped[row.team_id].append({
                "id": row.player.id,
                "username": row.player.user.username,
                "display_name": row.player.display_name,
                "role": row.player.role,
            })
        return [
            {"team_id": match.team_a.id, "team_name": match.team_a.name, "players": grouped[match.team_a_id]},
            {"team_id": match.team_b.id, "team_name": match.team_b.name, "players": grouped[match.team_b_id]},
        ]

    @classmethod
    def set_playing_xi(cls, db: Session, match_id: int, owner_id: int, data: MatchPlayerIds):
        match = cls._get(db, match_id)
        if not match: raise ValueError("Match not found.")
        if match.creator_id != owner_id: raise PermissionError("Only the match creator can set the playing XI.")
        if match.status not in {"CREATED", "TOSS_PENDING", "TOSS_COMPLETED", "READY"}:
            raise ValueError("Playing XI is locked after the match starts.")
        all_ids = set(data.team_a_player_ids) | set(data.team_b_player_ids)
        if len(all_ids) != len(data.team_a_player_ids) + len(data.team_b_player_ids):
            raise ValueError("A player cannot appear for both teams.")
        from app.models.team import TeamMember
        rows = db.scalars(select(TeamMember).where(TeamMember.team_id.in_([match.team_a_id, match.team_b_id]), TeamMember.player_id.in_(all_ids))).all()
        valid = {(r.team_id, r.player_id) for r in rows}
        if any((match.team_a_id, pid) not in valid for pid in data.team_a_player_ids):
            raise ValueError("Every Team A player must belong to Team A.")
        if any((match.team_b_id, pid) not in valid for pid in data.team_b_player_ids):
            raise ValueError("Every Team B player must belong to Team B.")
        db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).delete(synchronize_session=False)
        for pid in data.team_a_player_ids: db.add(MatchPlayer(match_id=match.id, team_id=match.team_a_id, player_id=pid))
        for pid in data.team_b_player_ids: db.add(MatchPlayer(match_id=match.id, team_id=match.team_b_id, player_id=pid))
        db.commit(); db.refresh(match)
        return match

    @classmethod
    def toss(cls, db: Session, match_id: int, owner_id: int, team_id: int, call: str) -> dict:
        match = cls._get(db, match_id)
        if not match:
            raise ValueError("Match not found.")
        if match.creator_id != owner_id:
            raise PermissionError("Only the match creator can conduct the toss.")
        if match.status not in {"CREATED", "TOSS_PENDING"}:
            raise ValueError("The toss has already been completed or the match has started.")
        if team_id not in {match.team_a_id, match.team_b_id}:
            raise ValueError("The toss caller must belong to one of the two teams.")
        if call not in {"HEADS", "TAILS"}:
            raise ValueError("Toss call must be HEADS or TAILS.")

        result = secrets.choice(["HEADS", "TAILS"])
        winner = match.team_a if result == call and team_id == match.team_a_id else match.team_b
        if result != call:
            winner = match.team_b if team_id == match.team_a_id else match.team_a

        match.toss_winner_id = winner.id
        match.toss_result = result
        match.status = "TOSS_COMPLETED"
        db.commit()
        db.refresh(match)
        return {
            "match": cls.response(match),
            "result": result,
            "winner_team_id": winner.id,
            "winner_team_name": winner.name,
        }

    @classmethod
    def set_toss_decision(cls, db: Session, match_id: int, owner_id: int, decision: str) -> dict:
        match = cls._get(db, match_id)
        if not match:
            raise ValueError("Match not found.")
        if match.creator_id != owner_id:
            raise PermissionError("Only the match creator can set the toss decision.")
        if match.status != "TOSS_COMPLETED" or not match.toss_winner_id:
            raise ValueError("Complete the toss before selecting bat or bowl.")
        if decision not in {"BAT", "BOWL"}:
            raise ValueError("Toss decision must be BAT or BOWL.")
        match.toss_decision = decision
        match.status = "READY"
        db.commit()
        db.refresh(match)
        return cls.response(match)

    @classmethod
    def start(cls, db: Session, match_id: int, owner_id: int) -> dict:
        match = cls._get(db, match_id)
        if not match:
            raise ValueError("Match not found.")
        if match.creator_id != owner_id:
            raise PermissionError("Only the match creator can start this match.")
        if match.status != "READY":
            raise ValueError("Complete the toss and decision before starting the match.")
        # Older matches may have been created before match_players was populated.
        # Always backfill the match roster before validating the Playing XI.
        cls._ensure_match_roster(db, match)

        # A player can belong to multiple clubs globally, but the same player
        # cannot represent both sides of one match. Detect that before commit so
        # the database never turns a normal validation problem into a raw 500.
        overlap = db.scalar(
            select(MatchPlayer.player_id)
            .where(MatchPlayer.match_id == match.id)
            .group_by(MatchPlayer.player_id)
            .having(func.count(MatchPlayer.team_id) > 1)
        )
        if overlap is not None:
            db.rollback()
            raise ValueError("A player cannot be in the Playing XI for both teams.")

        counts = db.execute(
            select(MatchPlayer.team_id, func.count(MatchPlayer.id))
            .where(MatchPlayer.match_id == match.id)
            .group_by(MatchPlayer.team_id)
        ).all()
        team_counts = {match.team_a_id: 0, match.team_b_id: 0}
        for team_id, count in counts:
            team_counts[team_id] = count

        # If a team has 5–11 registered players, those players are automatically
        # its Playing XI. Manual XI selection is only needed for a larger squad.
        for team_id, label in ((match.team_a_id, "Team A"), (match.team_b_id, "Team B")):
            count = team_counts[team_id]
            if count < 5:
                raise ValueError(f"{label} needs at least 5 players to start the match.")
            if count > 11:
                raise ValueError(f"{label} has more than 11 players. Select a Playing XI of 5 to 11 players.")

        match.status = "LIVE"
        match.started_at = datetime.now(timezone.utc)
        try:
            db.commit()
            db.refresh(match)
        except Exception:
            db.rollback()
            raise
        return cls.response(match)
