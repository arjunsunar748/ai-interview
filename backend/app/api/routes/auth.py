from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import UserRegister, UserLogin, PasswordReset, PasswordResetConfirm, RefreshTokenRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    return AuthService(db).register(data)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    return AuthService(db).login(data)


@router.post("/refresh")
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh_token(data.refresh_token)


@router.post("/forgot-password")
def forgot_password(data: PasswordReset, db: Session = Depends(get_db)):
    return AuthService(db).request_password_reset(data.email)


@router.post("/reset-password")
def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    return AuthService(db).confirm_password_reset(data.token, data.new_password)
