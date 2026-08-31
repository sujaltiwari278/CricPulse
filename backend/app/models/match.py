from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("team_a_id <> team_b_id", name="ck_match_different_teams"),
        CheckConstraint("overs IS NULL OR overs >= 4", name="ck_match_min_overs"),
        CheckConstraint("overs_per_day IS NULL OR overs_per_day >= 1", name="ck_match_overs_per_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_a_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    team_b_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    format: Mapped[str] = mapped_column(String(20), nullable=False)
    overs: Mapped[int | None] = mapped_column(Integer)
    test_days: Mapped[int | None] = mapped_column(Integer)
    overs_per_day: Mapped[int | None] = mapped_column(Integer)
    venue: Mapped[str | None] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[float | None] = mapped_column()
    longitude: Mapped[float | None] = mapped_column()
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="CREATED", index=True)
    toss_winner_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    toss_result: Mapped[str | None] = mapped_column(String(10))
    toss_decision: Mapped[str | None] = mapped_column(String(10))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[creator_id])
    team_a = relationship("Team", foreign_keys=[team_a_id])
    team_b = relationship("Team", foreign_keys=[team_b_id])
    toss_winner = relationship("Team", foreign_keys=[toss_winner_id])
    playing_xi = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    innings = relationship("Innings", back_populates="match", cascade="all, delete-orphan", order_by="Innings.number")


class MatchPlayer(Base):
    __tablename__ = "match_players"
    __table_args__ = (UniqueConstraint("match_id", "player_id", name="uq_match_player"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player_profiles.id", ondelete="CASCADE"), nullable=False, index=True)

    match = relationship("Match", back_populates="playing_xi")
    team = relationship("Team")
    player = relationship("Player")


class Innings(Base):
    __tablename__ = "innings"
    __table_args__ = (UniqueConstraint("match_id", "number", name="uq_match_innings_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    batting_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    bowling_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SETUP")
    runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    legal_balls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_striker_id: Mapped[int | None] = mapped_column(ForeignKey("player_profiles.id"))
    current_non_striker_id: Mapped[int | None] = mapped_column(ForeignKey("player_profiles.id"))
    current_bowler_id: Mapped[int | None] = mapped_column(ForeignKey("player_profiles.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    match = relationship("Match", back_populates="innings")
    batting_team = relationship("Team", foreign_keys=[batting_team_id])
    bowling_team = relationship("Team", foreign_keys=[bowling_team_id])
    striker = relationship("Player", foreign_keys=[current_striker_id])
    non_striker = relationship("Player", foreign_keys=[current_non_striker_id])
    bowler = relationship("Player", foreign_keys=[current_bowler_id])
    deliveries = relationship("Delivery", back_populates="innings", cascade="all, delete-orphan", order_by="Delivery.id")


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    innings_id: Mapped[int] = mapped_column(ForeignKey("innings.id", ondelete="CASCADE"), nullable=False, index=True)
    over_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ball_number: Mapped[int] = mapped_column(Integer, nullable=False)
    striker_id: Mapped[int] = mapped_column(ForeignKey("player_profiles.id"), nullable=False)
    non_striker_id: Mapped[int] = mapped_column(ForeignKey("player_profiles.id"), nullable=False)
    bowler_id: Mapped[int] = mapped_column(ForeignKey("player_profiles.id"), nullable=False)
    batter_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    extra_type: Mapped[str | None] = mapped_column(String(20))
    extra_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    legal: Mapped[bool] = mapped_column(nullable=False, default=True)
    wicket_type: Mapped[str | None] = mapped_column(String(30))
    dismissed_player_id: Mapped[int | None] = mapped_column(ForeignKey("player_profiles.id"))
    fielder_id: Mapped[int | None] = mapped_column(ForeignKey("player_profiles.id"))
    commentary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    innings = relationship("Innings", back_populates="deliveries")
    striker = relationship("Player", foreign_keys=[striker_id])
    non_striker = relationship("Player", foreign_keys=[non_striker_id])
    bowler = relationship("Player", foreign_keys=[bowler_id])
    dismissed_player = relationship("Player", foreign_keys=[dismissed_player_id])
    fielder = relationship("Player", foreign_keys=[fielder_id])
