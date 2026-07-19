import uuid
from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import func

from app.db.database import Base
from app.models.base import TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    skills = relationship("Skill", back_populates="category")
    questions = relationship("Question", back_populates="category")
    interview_sessions = relationship("InterviewSession", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name}>"


class Skill(Base):
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    category_id = Column(UUID(as_uuid=True), nullable=True)

    from sqlalchemy import ForeignKey
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    category = relationship("Category", back_populates="skills")
