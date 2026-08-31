from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    short_name: str = Field(min_length=2, max_length=10)
    city: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=1000)
    logo_url: str | None = Field(None, max_length=2_000_000)
    country: str | None = Field(None, max_length=100)
    player_ids: list[int] = Field(min_length=5, max_length=11)

    @field_validator("player_ids")
    @classmethod
    def unique_players(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("A team cannot contain the same player twice.")
        return value


class TeamUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    short_name: str | None = Field(None, min_length=2, max_length=10)
    city: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=1000)
    logo_url: str | None = Field(None, max_length=2_000_000)
    country: str | None = Field(None, max_length=100)


class TeamMemberAdd(BaseModel):
    player_id: int


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    player_id: int
    username: str
    display_name: str
    role: str | None
    photo_url: str | None


class TeamResponse(BaseModel):
    id: int
    name: str
    short_name: str
    city: str | None
    description: str | None
    logo_url: str | None
    country: str | None
    owner_id: int
    members: list[TeamMemberResponse]

    model_config = ConfigDict(from_attributes=True)
