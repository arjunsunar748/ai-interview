from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)

    @validator("password")
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: UserRole
    profile_picture: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str
