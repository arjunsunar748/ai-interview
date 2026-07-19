import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.user import UserRegister, UserLogin, TokenResponse
from app.models.user import User
from loguru import logger


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, data: UserRegister) -> TokenResponse:
        # Check duplicate email
        if self.repo.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = self.repo.create(
            full_name=data.full_name,
            email=data.email,
            password=data.password,
        )
        logger.info(f"New user registered: {user.email}")

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    def login(self, data: UserLogin) -> TokenResponse:
        user = self.repo.get_by_email(data.email)

        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        logger.info(f"User logged in: {user.email}")

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    def refresh_token(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user = self.repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        new_access = create_access_token(str(user.id), user.role.value)
        return {"access_token": new_access, "token_type": "bearer"}

    def request_password_reset(self, email: str) -> dict:
        user = self.repo.get_by_email(email)
        if not user:
            # Don't reveal whether email exists
            return {"message": "If that email exists, a reset link has been sent."}

        token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(hours=1)
        self.repo.set_reset_token(user, token, expiry)

        # In a real app, send email here
        logger.info(f"Password reset token generated for {email}: {token}")
        return {"message": "Reset token generated", "token": token}  # Remove token from response in production

    def confirm_password_reset(self, token: str, new_password: str) -> dict:
        from sqlalchemy.orm import Session
        # Find user by token
        from app.models.user import User
        user = self.repo.db.query(User).filter(
            User.reset_token == token,
            User.reset_token_expiry > datetime.utcnow(),
        ).first()

        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

        self.repo.update_password(user, new_password)
        return {"message": "Password reset successfully"}
