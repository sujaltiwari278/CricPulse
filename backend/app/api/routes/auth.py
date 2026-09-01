from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        return AuthService.register(
            db,
            data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        return AuthService.login(
            db,
            data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_current_user(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    AuthService.delete_account(db, user)
    return None


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user(
    user: User = Depends(current_user),
):
    return user