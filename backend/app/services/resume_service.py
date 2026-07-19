import os
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from uuid import UUID
from loguru import logger

from app.repositories.resume_repository import ResumeRepository
from app.core.config import settings
from ai.resume_parser.parser import resume_parser


class ResumeService:
    def __init__(self, db: Session):
        self.repo = ResumeRepository(db)

    async def upload_resume(self, user_id: UUID, file: UploadFile) -> dict:
        """Save uploaded resume file and parse it."""
        # Validate file type
        allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        allowed_exts = {".pdf", ".docx"}
        ext = os.path.splitext(file.filename)[1].lower()

        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

        # Read file
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

        # Save file to disk
        safe_filename = f"{uuid.uuid4()}{ext}"
        save_dir = os.path.join(settings.UPLOAD_DIR, "resumes", str(user_id))
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, safe_filename)

        with open(file_path, "wb") as f:
            f.write(content)

        # Create DB record
        resume = self.repo.create(
            user_id=user_id,
            file_name=file.filename,
            file_path=file_path,
            file_size=len(content),
            file_type=ext.lstrip("."),
        )

        # Parse in background (could also use BackgroundTasks)
        try:
            parsed = resume_parser.parse(file_path)
            resume = self.repo.update_parsed(resume, parsed)

            if parsed.get("skills"):
                self.repo.add_skills(resume.id, parsed["skills"])
            if parsed.get("experience"):
                self.repo.add_experience(resume.id, parsed["experience"])
            if parsed.get("education"):
                self.repo.add_education(resume.id, parsed["education"])

        except Exception as e:
            logger.error(f"Resume parsing failed: {e}")
            # Resume saved, just not parsed

        # Make primary if first resume
        existing = self.repo.get_by_user(user_id)
        if len(existing) == 1:
            self.repo.set_primary(user_id, resume.id)

        logger.info(f"Resume uploaded for user {user_id}: {file.filename}")
        return self.repo.get_by_id(resume.id)

    def get_user_resumes(self, user_id: UUID) -> list:
        return self.repo.get_by_user(user_id)

    def get_resume(self, resume_id: UUID, user_id: UUID):
        resume = self.repo.get_by_id(resume_id)
        if not resume or resume.user_id != user_id:
            raise HTTPException(status_code=404, detail="Resume not found")
        return resume

    def set_primary(self, resume_id: UUID, user_id: UUID) -> dict:
        resume = self.get_resume(resume_id, user_id)
        self.repo.set_primary(user_id, resume.id)
        return {"message": "Primary resume updated"}

    def delete_resume(self, resume_id: UUID, user_id: UUID) -> dict:
        resume = self.get_resume(resume_id, user_id)
        # Delete physical file
        try:
            if os.path.exists(resume.file_path):
                os.remove(resume.file_path)
        except Exception as e:
            logger.warning(f"Could not delete file: {e}")
        self.repo.delete(resume)
        return {"message": "Resume deleted"}
