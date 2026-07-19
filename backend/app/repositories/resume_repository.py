from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from app.models.resume import Resume, ResumeSkill, ResumeExperience, ResumeEducation


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> Resume:
        resume = Resume(**kwargs)
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def get_by_id(self, resume_id: UUID) -> Optional[Resume]:
        return self.db.query(Resume).filter(Resume.id == resume_id).first()

    def get_by_user(self, user_id: UUID) -> List[Resume]:
        return self.db.query(Resume).filter(Resume.user_id == user_id).all()

    def get_primary(self, user_id: UUID) -> Optional[Resume]:
        return (
            self.db.query(Resume)
            .filter(Resume.user_id == user_id, Resume.is_primary == True)
            .first()
        )

    def set_primary(self, user_id: UUID, resume_id: UUID) -> None:
        # Unset all
        self.db.query(Resume).filter(Resume.user_id == user_id).update({"is_primary": False})
        # Set target
        self.db.query(Resume).filter(Resume.id == resume_id).update({"is_primary": True})
        self.db.commit()

    def update_parsed(self, resume: Resume, parsed: dict) -> Resume:
        resume.raw_text = parsed.get("raw_text")
        resume.parsed_data = parsed
        resume.extracted_name = parsed.get("name")
        resume.extracted_email = parsed.get("email")
        resume.extracted_phone = parsed.get("phone")
        resume.extracted_summary = parsed.get("summary")
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def add_skills(self, resume_id: UUID, skills: List[dict]) -> None:
        for s in skills:
            skill = ResumeSkill(
                resume_id=resume_id,
                skill_name=s["name"],
                confidence=s.get("confidence", 1.0),
            )
            self.db.add(skill)
        self.db.commit()

    def add_experience(self, resume_id: UUID, experiences: List[dict]) -> None:
        for e in experiences:
            exp = ResumeExperience(resume_id=resume_id, **e)
            self.db.add(exp)
        self.db.commit()

    def add_education(self, resume_id: UUID, education_list: List[dict]) -> None:
        for e in education_list:
            edu = ResumeEducation(resume_id=resume_id, **e)
            self.db.add(edu)
        self.db.commit()

    def delete(self, resume: Resume) -> None:
        self.db.delete(resume)
        self.db.commit()
