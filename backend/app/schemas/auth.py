from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
    )

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )


class LoginRequest(BaseModel):
    identifier: str = Field(
        min_length=3,
        max_length=255,
    )

    # No minimum here: the rule belongs to registration. A min_length on
    # login turns a wrong password into a confusing 422 validation error.
    password: str = Field(
        min_length=1,
        max_length=128,
    )


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: EmailStr

    model_config = ConfigDict(
        from_attributes=True,
    )


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse