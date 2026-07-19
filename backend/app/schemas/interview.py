from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.interview import DifficultyLevel, InterviewType, InterviewStatus, QuestionType


class SessionCreate(BaseModel):
    category_id: UUID
    interview_type: InterviewType = InterviewType.technical
    difficulty: DifficultyLevel = DifficultyLevel.medium
    num_questions: int = Field(default=5, ge=3, le=15)
    resume_id: Optional[UUID] = None


class SessionOut(BaseModel):
    id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    title: Optional[str]
    interview_type: InterviewType
    difficulty: DifficultyLevel
    status: InterviewStatus
    total_questions: int
    completed_questions: int
    duration_seconds: Optional[int]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SessionQuestionOut(BaseModel):
    id: UUID
    session_id: UUID
    question_text: str
    order_index: int
    is_answered: bool

    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    session_question_id: UUID
    answer_text: str = Field(..., min_length=1)


class AnswerOut(BaseModel):
    id: UUID
    session_id: UUID
    session_question_id: UUID
    answer_text: Optional[str]
    transcription: Optional[str]
    word_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackOut(BaseModel):
    id: UUID
    answer_id: UUID
    technical_accuracy: float
    communication_score: float
    confidence_score: float
    completeness_score: float
    problem_solving_score: float
    grammar_score: float
    overall_score: float
    strengths: Optional[List[str]]
    weaknesses: Optional[List[str]]
    suggestions: Optional[List[str]]

    class Config:
        from_attributes = True


class PerformanceOut(BaseModel):
    id: UUID
    session_id: UUID
    avg_technical: float
    avg_communication: float
    avg_confidence: float
    avg_completeness: float
    avg_problem_solving: float
    avg_grammar: float
    overall_score: float
    total_strengths: Optional[List[str]]
    total_weaknesses: Optional[List[str]]
    improvement_areas: Optional[List[str]]
    skill_gaps: Optional[List[str]]
    recommended_resources: Optional[dict]

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    category_id: UUID
    question_text: str = Field(..., min_length=10)
    question_type: QuestionType = QuestionType.technical
    difficulty: DifficultyLevel = DifficultyLevel.medium
    expected_answer: Optional[str] = None
    keywords: Optional[List[str]] = None


class QuestionOut(BaseModel):
    id: UUID
    category_id: Optional[UUID]
    question_text: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    expected_answer: Optional[str]
    keywords: Optional[List[str]]
    is_ai_generated: bool

    class Config:
        from_attributes = True
