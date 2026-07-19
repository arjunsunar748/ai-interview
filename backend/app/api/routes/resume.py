from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.api.middleware.auth import get_current_user
from app.models.user import User
from app.services.resume_service import ResumeService
from app.schemas.resume import ResumeOut, ResumeListOut

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/upload", response_model=ResumeOut, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ResumeService(db).upload_resume(current_user.id, file)


@router.get("/", response_model=List[ResumeListOut])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeService(db).get_user_resumes(current_user.id)


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeService(db).get_resume(resume_id, current_user.id)


@router.post("/{resume_id}/set-primary")
def set_primary(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeService(db).set_primary(resume_id, current_user.id)


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeService(db).delete_resume(resume_id, current_user.id)
