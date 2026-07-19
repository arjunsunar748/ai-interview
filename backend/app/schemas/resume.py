from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class ResumeSkillOut(BaseModel):
    skill_name: str
    confidence: float

    class Config:
        from_attributes = True


class ResumeExperienceOut(BaseModel):
    company: Optional[str]
    position: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True


class ResumeEducationOut(BaseModel):
    institution: Optional[str]
    degree: Optional[str]
    field: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    gpa: Optional[str]

    class Config:
        from_attributes = True


class ResumeOut(BaseModel):
    id: UUID
    user_id: UUID
    file_name: str
    file_size: Optional[int]
    file_type: Optional[str]
    extracted_name: Optional[str]
    extracted_email: Optional[str]
    extracted_phone: Optional[str]
    extracted_summary: Optional[str]
    is_primary: bool
    skills: List[ResumeSkillOut] = []
    experience: List[ResumeExperienceOut] = []
    education: List[ResumeEducationOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeListOut(BaseModel):
    id: UUID
    file_name: str
    file_size: Optional[int]
    file_type: Optional[str]
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True
