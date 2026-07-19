from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from uuid import UUID
from app.models.interview import InterviewSession, SessionQuestion, Question, InterviewStatus
from app.models.answer import Answer, AIFeedback, SessionPerformance


class InterviewRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Sessions ──────────────────────────────────────────────

    def create_session(self, **kwargs) -> InterviewSession:
        session = InterviewSession(**kwargs)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session(self, session_id: UUID) -> Optional[InterviewSession]:
        return self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()

    def get_user_sessions(self, user_id: UUID, skip: int = 0, limit: int = 20) -> List[InterviewSession]:
        return (
            self.db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(desc(InterviewSession.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_session(self, session: InterviewSession, **kwargs) -> InterviewSession:
        for key, value in kwargs.items():
            setattr(session, key, value)
        self.db.commit()
        self.db.refresh(session)
        return session

    # ── Session Questions ─────────────────────────────────────

    def add_session_questions(self, session_id: UUID, questions: List[dict]) -> List[SessionQuestion]:
        sq_list = []
        for i, q in enumerate(questions):
            sq = SessionQuestion(
                session_id=session_id,
                question_id=q.get("question_id"),
                question_text=q["question_text"],
                order_index=i,
            )
            self.db.add(sq)
            sq_list.append(sq)
        self.db.commit()
        return sq_list

    def get_session_questions(self, session_id: UUID) -> List[SessionQuestion]:
        return (
            self.db.query(SessionQuestion)
            .filter(SessionQuestion.session_id == session_id)
            .order_by(SessionQuestion.order_index)
            .all()
        )

    def get_session_question(self, sq_id: UUID) -> Optional[SessionQuestion]:
        return self.db.query(SessionQuestion).filter(SessionQuestion.id == sq_id).first()

    def mark_question_answered(self, sq: SessionQuestion) -> SessionQuestion:
        sq.is_answered = True
        self.db.commit()
        return sq

    # ── Answers ───────────────────────────────────────────────

    def save_answer(self, **kwargs) -> Answer:
        answer = Answer(**kwargs)
        self.db.add(answer)
        self.db.commit()
        self.db.refresh(answer)
        return answer

    def get_answer(self, answer_id: UUID) -> Optional[Answer]:
        return self.db.query(Answer).filter(Answer.id == answer_id).first()

    def get_session_answers(self, session_id: UUID) -> List[Answer]:
        return self.db.query(Answer).filter(Answer.session_id == session_id).all()

    # ── Feedback ──────────────────────────────────────────────

    def save_feedback(self, **kwargs) -> AIFeedback:
        feedback = AIFeedback(**kwargs)
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def save_performance(self, **kwargs) -> SessionPerformance:
        perf = SessionPerformance(**kwargs)
        self.db.add(perf)
        self.db.commit()
        self.db.refresh(perf)
        return perf

    def get_performance(self, session_id: UUID) -> Optional[SessionPerformance]:
        return self.db.query(SessionPerformance).filter(SessionPerformance.session_id == session_id).first()

    # ── Analytics ─────────────────────────────────────────────

    def get_user_performance_history(self, user_id: UUID) -> List[SessionPerformance]:
        return (
            self.db.query(SessionPerformance)
            .filter(SessionPerformance.user_id == user_id)
            .order_by(desc(SessionPerformance.created_at))
            .all()
        )

    def get_avg_score_by_user(self, user_id: UUID) -> float:
        result = (
            self.db.query(func.avg(SessionPerformance.overall_score))
            .filter(SessionPerformance.user_id == user_id)
            .scalar()
        )
        return round(float(result or 0), 2)

    def count_user_sessions(self, user_id: UUID) -> int:
        return (
            self.db.query(InterviewSession)
            .filter(
                InterviewSession.user_id == user_id,
                InterviewSession.status == InterviewStatus.completed,
            )
            .count()
        )
