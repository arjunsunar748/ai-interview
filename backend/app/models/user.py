import uuid
from sqlalchemy import Column, String, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import func
import enum

from app.db.database import Base
from app.models.base import TimestampMixin


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    profile_picture = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    location = Column(String(150), nullable=True)
    bio = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="user", cascade="all, delete-orphan")
    skill_progress = relationship("UserSkillProgress", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"
