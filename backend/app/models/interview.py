import uuid
import enum
from sqlalchemy import Column, String, Boolean, Text, Integer, Float, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class DifficultyLevel(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class InterviewType(str, enum.Enum):
    technical = "technical"
    hr = "hr"
    mixed = "mixed"


class InterviewStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class QuestionType(str, enum.Enum):
    technical = "technical"
    behavioral = "behavioral"
    situational = "situational"
    coding = "coding"


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), default=QuestionType.technical)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.medium, index=True)
    expected_answer = Column(Text, nullable=True)
    keywords = Column(ARRAY(Text), nullable=True)
    follow_ups = Column(ARRAY(Text), nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    category = relationship("Category", back_populates="questions")
    session_questions = relationship("SessionQuestion", back_populates="question")

    def __repr__(self):
        return f"<Question {str(self.id)[:8]}>"


class InterviewSession(Base, TimestampMixin):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    interview_type = Column(Enum(InterviewType), default=InterviewType.technical)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.medium)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.pending, index=True)
    total_questions = Column(Integer, default=0)
    completed_questions = Column(Integer, default=0)
    duration_seconds = Column(Integer, nullable=True)
    started_at = Column(String, nullable=True)   # stored as ISO string
    completed_at = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    category = relationship("Category", back_populates="interview_sessions")
    session_questions = relationship("SessionQuestion", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    performance = relationship("SessionPerformance", back_populates="session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InterviewSession {str(self.id)[:8]}>"


class SessionQuestion(Base):
    __tablename__ = "session_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    question_text = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)
    is_answered = Column(Boolean, default=False)
    is_follow_up = Column(Boolean, default=False)

    from sqlalchemy import func
    created_at = Column(String, server_default="NOW()")

    # Relationships
    session = relationship("InterviewSession", back_populates="session_questions")
    question = relationship("Question", back_populates="session_questions")
    answer = relationship("Answer", back_populates="session_question", uselist=False)
