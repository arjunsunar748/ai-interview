from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import UUID


class WeeklyProgress(BaseModel):
    week: str
    avg_score: float
    sessions_count: int


class CategoryPerformance(BaseModel):
    category: str
    avg_score: float
    sessions_count: int


class SkillGap(BaseModel):
    skill: str
    current_score: float
    target_score: float = 80.0


class DashboardStats(BaseModel):
    total_sessions: int
    completed_sessions: int
    average_score: float
    best_score: float
    total_questions_answered: int
    improvement_percentage: float
    strongest_category: Optional[str]
    weakest_category: Optional[str]


class AnalyticsOut(BaseModel):
    dashboard: DashboardStats
    weekly_progress: List[WeeklyProgress]
    category_performance: List[CategoryPerformance]
    skill_gaps: List[SkillGap]
    score_breakdown: Dict[str, float]
