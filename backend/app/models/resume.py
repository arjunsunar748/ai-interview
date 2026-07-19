import uuid
from sqlalchemy import Column, String, Boolean, Text, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class Resume(Base, TimestampMixin):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(10), nullable=True)  # pdf / docx
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(JSONB, nullable=True)
    extracted_name = Column(String(150), nullable=True)
    extracted_email = Column(String(255), nullable=True)
    extracted_phone = Column(String(30), nullable=True)
    extracted_summary = Column(Text, nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="resumes")
    skills = relationship("ResumeSkill", back_populates="resume", cascade="all, delete-orphan")
    experience = relationship("ResumeExperience", back_populates="resume", cascade="all, delete-orphan")
    education = relationship("ResumeEducation", back_populates="resume", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Resume {self.file_name}>"


class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)
    confidence = Column(Float, default=1.0)

    resume = relationship("Resume", back_populates="skills")


class ResumeExperience(Base):
    __tablename__ = "resume_experience"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    company = Column(String(200), nullable=True)
    position = Column(String(200), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    resume = relationship("Resume", back_populates="experience")


class ResumeEducation(Base):
    __tablename__ = "resume_education"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    institution = Column(String(200), nullable=True)
    degree = Column(String(200), nullable=True)
    field = Column(String(200), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    gpa = Column(String(20), nullable=True)

    resume = relationship("Resume", back_populates="education")
