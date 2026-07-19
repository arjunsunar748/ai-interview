from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.api.middleware.auth import get_current_admin
from app.models.user import User
from app.models.interview import InterviewSession
from app.models.category import Category
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserOut
from app.schemas.interview import QuestionCreate, QuestionOut, SessionOut

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Users ──────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return UserRepository(db).get_all(skip, limit)


@router.get("/users/count")
def count_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return {"count": UserRepository(db).count()}


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    repo.deactivate(user)
    return {"message": f"User {user.email} deactivated"}


# ── Categories ────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Category).all()


@router.post("/categories", status_code=201)
def create_category(
    name: str, slug: str, description: str = "",
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    cat = Category(name=name, slug=slug, description=description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ── Questions ────────────────────────────────────────────────────────

@router.post("/questions", response_model=QuestionOut, status_code=201)
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from app.models.interview import Question
    q = Question(**data.model_dump(), created_by=admin.id, is_ai_generated=False)
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.get("/questions", response_model=List[QuestionOut])
def list_questions(
    category_id: UUID = None,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from app.models.interview import Question
    q = db.query(Question)
    if category_id:
        q = q.filter(Question.category_id == category_id)
    return q.offset(skip).limit(limit).all()


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from app.models.interview import Question
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Question deleted"}


# ── Reports ───────────────────────────────────────────────────────────

@router.get("/sessions")
def list_all_sessions(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from sqlalchemy import desc
    return (
        db.query(InterviewSession)
        .order_by(desc(InterviewSession.created_at))
        .offset(skip).limit(limit).all()
    )


@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    from app.models.answer import SessionPerformance
    from sqlalchemy import func

    total_users = UserRepository(db).count()
    total_sessions = db.query(InterviewSession).count()
    avg_score = db.query(func.avg(SessionPerformance.overall_score)).scalar() or 0

    return {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "platform_avg_score": round(float(avg_score), 2),
    }
