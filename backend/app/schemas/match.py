from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MatchFormat = Literal["T20", "ODI", "CUSTOM", "TEST"]
MatchStatus = Literal["CREATED", "TOSS_PENDING", "TOSS_COMPLETED", "READY", "LIVE", "INNINGS_BREAK", "COMPLETED"]
TossDecision = Literal["BAT", "BOWL"]

class MatchCreate(BaseModel):
    team_a_id: int
    team_b_id: int
    format: MatchFormat
    overs: int | None = Field(default=None, ge=4, le=1000)
    test_days: int | None = Field(default=None, ge=1, le=5)
    overs_per_day: int | None = Field(default=None, ge=1, le=300)
    venue: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    description: str | None = Field(default=None, max_length=2000)
    @model_validator(mode="after")
    def validate_format(self):
        if self.team_a_id == self.team_b_id: raise ValueError("A match must have two different teams.")
        if self.format == "TEST":
            if self.test_days is None or self.overs_per_day is None: raise ValueError("Test matches require number of days and overs per day.")
            if self.overs is not None: raise ValueError("Limited-overs count is not used for Test matches.")
        else:
            if self.overs is None: raise ValueError("Overs are required for limited-overs matches.")
            if self.test_days is not None or self.overs_per_day is not None: raise ValueError("Test settings are only valid for Test matches.")
        return self

class MatchUpdate(BaseModel):
    format: MatchFormat | None = None
    overs: int | None = Field(default=None, ge=4, le=1000)
    test_days: int | None = Field(default=None, ge=1, le=5)
    overs_per_day: int | None = Field(default=None, ge=1, le=300)
    venue: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    description: str | None = Field(default=None, max_length=2000)

class TeamBrief(BaseModel):
    id: int; name: str; short_name: str; city: str | None

class PlayerBrief(BaseModel):
    id: int; username: str; display_name: str; role: str | None

class PlayingXI(BaseModel):
    team_id: int
    team_name: str
    players: list[PlayerBrief]

class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; creator_id: int; team_a: TeamBrief; team_b: TeamBrief; format: MatchFormat
    overs: int | None; test_days: int | None; overs_per_day: int | None; venue: str | None; location: str | None
    latitude: float | None; longitude: float | None; description: str | None; status: MatchStatus
    toss_winner_id: int | None; toss_result: Literal["HEADS", "TAILS"] | None = None; toss_decision: TossDecision | None; started_at: datetime | None; completed_at: datetime | None; created_at: datetime

class MatchPlayerIds(BaseModel):
    team_a_player_ids: list[int] = Field(min_length=5, max_length=11)
    team_b_player_ids: list[int] = Field(min_length=5, max_length=11)
    @field_validator("team_a_player_ids", "team_b_player_ids")
    @classmethod
    def unique_players(cls, value):
        if len(value) != len(set(value)): raise ValueError("Playing XI cannot contain duplicate players.")
        return value

class MatchSetupResponse(BaseModel):
    match: MatchResponse
    playing_xi: list[PlayingXI]

class TossRequest(BaseModel):
    team_id: int
    call: Literal["HEADS", "TAILS"]
class TossResponse(BaseModel):
    match: MatchResponse
    result: Literal["HEADS", "TAILS"]
    winner_team_id: int
    winner_team_name: str

class InningsStartRequest(BaseModel):
    batting_team_id: int | None = None
    striker_id: int
    non_striker_id: int
    bowler_id: int

class DeliveryCreate(BaseModel):
    batter_runs: int = Field(default=0, ge=0, le=6)
    extra_type: Literal["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE"] = "NONE"
    extra_runs: int = Field(default=0, ge=0, le=6)
    wicket_type: Literal["NONE", "BOWLED", "CAUGHT", "RUN_OUT", "LBW", "STUMPED", "HIT_WICKET", "RETIRED_HURT", "TIMED_OUT"] = "NONE"
    dismissed_player_id: int | None = None
    fielder_id: int | None = None
    commentary: str | None = Field(default=None, max_length=500)

class DeliveryResponse(BaseModel):
    id: int; innings_id: int; over_number: int; ball_number: int; striker_id: int; striker_name: str
    non_striker_id: int; non_striker_name: str; bowler_id: int; bowler_name: str; batter_runs: int
    extra_type: str | None; extra_runs: int; total_runs: int; legal: bool; wicket_type: str | None
    dismissed_player_id: int | None; dismissed_player_name: str | None; fielder_id: int | None; fielder_name: str | None
    commentary: str

class InningsResponse(BaseModel):
    id: int; number: int; batting_team: TeamBrief; bowling_team: TeamBrief; status: str
    runs: int; wickets: int; legal_balls: int; overs: str; striker: PlayerBrief | None; non_striker: PlayerBrief | None; bowler: PlayerBrief | None
    deliveries: list[DeliveryResponse]

class InningsStateUpdate(BaseModel):
    striker_id: int
    non_striker_id: int
    bowler_id: int
