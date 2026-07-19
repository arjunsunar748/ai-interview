# Import all models so SQLAlchemy can discover them for table creation
from app.models.user import User, UserRole
from app.models.category import Category, Skill
from app.models.resume import Resume, ResumeSkill, ResumeExperience, ResumeEducation
from app.models.interview import (
    Question, InterviewSession, SessionQuestion,
    DifficultyLevel, InterviewType, InterviewStatus, QuestionType
)
from app.models.answer import Answer, AIFeedback, SessionPerformance, UserSkillProgress, AuditLog
