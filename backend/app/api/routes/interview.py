from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.api.middleware.auth import get_current_candidate
from app.models.user import User
from app.services.interview_service import InterviewService
from app.schemas.interview import SessionCreate, SessionOut, AnswerSubmit, AnswerOut, FeedbackOut, PerformanceOut

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.post("/start", status_code=201)
def start_interview(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    """Create session + generate questions."""
    result = InterviewService(db).create_session(current_user.id, data)
    return {
        "session_id": str(result["session"].id),
        "title": result["session"].title,
        "questions": [
            {"id": str(sq.id), "text": sq.question_text, "order": sq.order_index}
            for sq in result["questions"]
        ],
    }


@router.get("/sessions", response_model=List[SessionOut])
def get_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    from app.repositories.interview_repository import InterviewRepository
    return InterviewRepository(db).get_user_sessions(current_user.id, skip, limit)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    return InterviewService(db).get_session_with_questions(session_id, current_user.id)


@router.post("/answer/text")
def submit_text_answer(
    data: AnswerSubmit,
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    result = InterviewService(db).submit_answer(
        session_id, data.session_question_id, current_user.id, data.answer_text
    )
    return {
        "answer_id": str(result["answer"].id),
        "overall_score": result["feedback"].overall_score,
        "feedback": {
            "technical_accuracy": result["feedback"].technical_accuracy,
            "communication_score": result["feedback"].communication_score,
            "confidence_score": result["feedback"].confidence_score,
            "grammar_score": result["feedback"].grammar_score,
            "strengths": result["feedback"].strengths,
            "weaknesses": result["feedback"].weaknesses,
            "suggestions": result["feedback"].suggestions,
        },
        "follow_up_question": {
            "id": str(result["follow_up_question"].id),
            "text": result["follow_up_question"].question_text,
            "order": result["follow_up_question"].order_index,
        } if result.get("follow_up_question") else None
    }


@router.post("/answer/audio")
async def submit_audio_answer(
    session_id: UUID,
    session_question_id: UUID,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    audio_bytes = await audio.read()
    suffix = "." + audio.filename.split(".")[-1] if "." in audio.filename else ".webm"
    result = InterviewService(db).submit_audio_answer(
        session_id, session_question_id, current_user.id, audio_bytes, suffix
    )
    return {
        "answer_id": str(result["answer"].id),
        "transcription": result["transcription"],
        "overall_score": result["feedback"].overall_score,
        "feedback": {
            "technical_accuracy": result["feedback"].technical_accuracy,
            "communication_score": result["feedback"].communication_score,
            "confidence_score": result["feedback"].confidence_score,
            "grammar_score": result["feedback"].grammar_score,
            "strengths": result["feedback"].strengths,
            "weaknesses": result["feedback"].weaknesses,
            "suggestions": result["feedback"].suggestions,
        },
        "follow_up_question": {
            "id": str(result["follow_up_question"].id),
            "text": result["follow_up_question"].question_text,
            "order": result["follow_up_question"].order_index,
        } if result.get("follow_up_question") else None
    }


@router.post("/sessions/{session_id}/complete")
def complete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    return InterviewService(db).complete_session(session_id, current_user.id)


@router.get("/sessions/{session_id}/performance", response_model=PerformanceOut)
def get_performance(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate),
):
    from app.repositories.interview_repository import InterviewRepository
    perf = InterviewRepository(db).get_performance(session_id)
    if not perf:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Performance report not found")
    return perf
