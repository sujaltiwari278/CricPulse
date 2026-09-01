from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

TournamentStatus = Literal["UPCOMING", "ONGOING", "COMPLETED"]
TournamentFormat = Literal["T20", "ODI", "CUSTOM", "TEST"]

class TournamentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=200)
    start_date: date | None = None
    end_date: date | None = None
    format: TournamentFormat
    overs: int | None = Field(default=None, ge=4, le=1000)
    description: str | None = Field(default=None, max_length=2000)
    team_ids: list[int] = Field(min_length=2, max_length=64)

    @model_validator(mode="after")
    def validate_format(self):
        if len(set(self.team_ids)) != len(self.team_ids):
            raise ValueError("Tournament teams cannot be duplicated.")
        if self.format == "TEST":
            if self.overs is not None:
                raise ValueError("Test tournaments do not use a limited-overs setting.")
        elif self.overs is None:
            raise ValueError("Overs are required for limited-overs tournaments.")
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date.")
        return self

class TournamentTeamBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    short_name: str
    logo_url: str | None
    city: str | None

class TournamentResponse(BaseModel):
    id: int
    creator_id: int
    name: str
    location: str | None
    start_date: date | None
    end_date: date | None
    format: TournamentFormat
    overs: int | None
    description: str | None
    status: TournamentStatus
    teams: list[TournamentTeamBrief]
    created_at: datetime
