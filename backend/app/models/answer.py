import uuid
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class Answer(Base, TimestampMixin):
    __tablename__ = "answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    session_question_id = Column(UUID(as_uuid=True), ForeignKey("session_questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    answer_text = Column(Text, nullable=True)
    audio_file_path = Column(String(500), nullable=True)
    transcription = Column(Text, nullable=True)
    answer_duration_sec = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)

    # Relationships
    session = relationship("InterviewSession", back_populates="answers")
    session_question = relationship("SessionQuestion", back_populates="answer")
    user = relationship("User", back_populates="answers")
    feedback = relationship("AIFeedback", back_populates="answer", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Answer {str(self.id)[:8]}>"


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey("answers.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)

    # Scores (0–100)
    technical_accuracy = Column(Float, default=0)
    communication_score = Column(Float, default=0)
    confidence_score = Column(Float, default=0)
    completeness_score = Column(Float, default=0)
    problem_solving_score = Column(Float, default=0)
    grammar_score = Column(Float, default=0)
    overall_score = Column(Float, default=0)

    # Qualitative
    strengths = Column(ARRAY(Text), nullable=True)
    weaknesses = Column(ARRAY(Text), nullable=True)
    suggestions = Column(ARRAY(Text), nullable=True)
    model_reasoning = Column(Text, nullable=True)

    from sqlalchemy import func
    created_at = Column(String, server_default="NOW()")

    # Relationships
    answer = relationship("Answer", back_populates="feedback")

    def __repr__(self):
        return f"<AIFeedback answer={str(self.answer_id)[:8]}>"


class SessionPerformance(Base, TimestampMixin):
    __tablename__ = "session_performance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    avg_technical = Column(Float, default=0)
    avg_communication = Column(Float, default=0)
    avg_confidence = Column(Float, default=0)
    avg_completeness = Column(Float, default=0)
    avg_problem_solving = Column(Float, default=0)
    avg_grammar = Column(Float, default=0)
    overall_score = Column(Float, default=0)

    total_strengths = Column(ARRAY(Text), nullable=True)
    total_weaknesses = Column(ARRAY(Text), nullable=True)
    improvement_areas = Column(ARRAY(Text), nullable=True)
    recommended_resources = Column(JSONB, nullable=True)
    skill_gaps = Column(ARRAY(Text), nullable=True)

    # Relationships
    session = relationship("InterviewSession", back_populates="performance")

    def __repr__(self):
        return f"<SessionPerformance session={str(self.session_id)[:8]}>"


class UserSkillProgress(Base):
    __tablename__ = "user_skill_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)
    score = Column(Float, default=0)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="SET NULL"), nullable=True)

    from sqlalchemy import func
    recorded_at = Column(String, server_default="NOW()")

    user = relationship("User", back_populates="skill_progress")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)

    from sqlalchemy import func
    created_at = Column(String, server_default="NOW()")

    user = relationship("User", back_populates="audit_logs")
