from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Role = Literal[
    "Batter",
    "Bowler",
    "All-rounder",
    "Wicket-keeper",
]

BattingStyle = Literal[
    "Right Handed",
    "Left Handed",
]

BowlingStyle = Literal[
    "Does not bowl",
    "Right-arm fast",
    "Right-arm fast-medium",
    "Right-arm medium-fast",
    "Right-arm medium",
    "Right-arm off-break",
    "Right-arm leg-break",
    "Right-arm leg-break / googly",
    "Left-arm fast",
    "Left-arm fast-medium",
    "Left-arm medium-fast",
    "Left-arm medium",
    "Left-arm orthodox",
    "Left-arm wrist spin",
]


class PlayerCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    role: Role | None = None
    batting_style: BattingStyle | None = None
    bowling_style: BowlingStyle | None = "Does not bowl"
    location: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=1000)
    photo_url: str | None = Field(None, max_length=2_000_000)
    country: str | None = Field(None, max_length=100)


class PlayerUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=2, max_length=100)
    role: Role | None = None
    batting_style: BattingStyle | None = None
    bowling_style: BowlingStyle | None = None
    location: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=1000)
    photo_url: str | None = Field(None, max_length=2_000_000)
    country: str | None = Field(None, max_length=100)


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str
    display_name: str
    role: Role | None
    batting_style: BattingStyle | None
    bowling_style: BowlingStyle | None
    location: str | None
    bio: str | None
    photo_url: str | None
    country: str | None
