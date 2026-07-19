from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from uuid import UUID
from typing import List
from datetime import datetime, timedelta

from app.models.answer import SessionPerformance
from app.models.interview import InterviewSession, InterviewStatus
from app.models.category import Category


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self, user_id: UUID) -> dict:
        total = self.db.query(InterviewSession).filter(InterviewSession.user_id == user_id).count()
        completed = self.db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id,
            InterviewSession.status == InterviewStatus.completed,
        ).count()

        scores = self.db.query(SessionPerformance.overall_score).filter(
            SessionPerformance.user_id == user_id
        ).all()
        score_vals = [s[0] for s in scores if s[0] is not None]

        avg_score = round(sum(score_vals) / len(score_vals), 2) if score_vals else 0.0
        best_score = round(max(score_vals), 2) if score_vals else 0.0

        # Improvement: compare first half vs second half scores
        improvement = 0.0
        if len(score_vals) >= 2:
            mid = len(score_vals) // 2
            first_half = sum(score_vals[:mid]) / mid
            second_half = sum(score_vals[mid:]) / len(score_vals[mid:])
            improvement = round(((second_half - first_half) / max(first_half, 1)) * 100, 2)

        return {
            "total_sessions": total,
            "completed_sessions": completed,
            "average_score": avg_score,
            "best_score": best_score,
            "total_questions_answered": self._count_questions(user_id),
            "improvement_percentage": improvement,
            "strongest_category": self._strongest_category(user_id),
            "weakest_category": self._weakest_category(user_id),
        }

    def get_weekly_progress(self, user_id: UUID, weeks: int = 8) -> List[dict]:
        result = []
        for i in range(weeks - 1, -1, -1):
            week_start = datetime.utcnow() - timedelta(weeks=i + 1)
            week_end = datetime.utcnow() - timedelta(weeks=i)

            sessions = self.db.query(InterviewSession).filter(
                InterviewSession.user_id == user_id,
                InterviewSession.status == InterviewStatus.completed,
                InterviewSession.created_at >= week_start,
                InterviewSession.created_at < week_end,
            ).all()

            if sessions:
                session_ids = [s.id for s in sessions]
                perfs = self.db.query(SessionPerformance).filter(
                    SessionPerformance.session_id.in_(session_ids)
                ).all()
                scores = [p.overall_score for p in perfs if p.overall_score]
                avg = round(sum(scores) / len(scores), 2) if scores else 0.0
            else:
                avg = 0.0

            result.append({
                "week": week_start.strftime("Week of %b %d"),
                "avg_score": avg,
                "sessions_count": len(sessions),
            })
        return result

    def get_category_performance(self, user_id: UUID) -> List[dict]:
        rows = (
            self.db.query(
                Category.name,
                func.avg(SessionPerformance.overall_score).label("avg_score"),
                func.count(SessionPerformance.id).label("count"),
            )
            .join(InterviewSession, InterviewSession.id == SessionPerformance.session_id)
            .join(Category, Category.id == InterviewSession.category_id)
            .filter(SessionPerformance.user_id == user_id)
            .group_by(Category.name)
            .all()
        )
        return [
            {"category": r.name, "avg_score": round(float(r.avg_score or 0), 2), "sessions_count": r.count}
            for r in rows
        ]

    def get_skill_gaps(self, user_id: UUID) -> List[dict]:
        """Identify skills with consistently low scores."""
        # Get latest performance records and their skill_gaps
        perfs = (
            self.db.query(SessionPerformance)
            .filter(SessionPerformance.user_id == user_id)
            .order_by(desc(SessionPerformance.created_at))
            .limit(5)
            .all()
        )

        skill_counts = {}
        for p in perfs:
            if p.skill_gaps:
                for skill in p.skill_gaps:
                    skill_counts[skill] = skill_counts.get(skill, 0) + 1

        # Skills appearing in multiple sessions = persistent gap
        gaps = [
            {"skill": k, "current_score": 40.0, "target_score": 80.0}
            for k, v in sorted(skill_counts.items(), key=lambda x: -x[1])
        ]
        return gaps[:8]

    def get_score_breakdown(self, user_id: UUID) -> dict:
        perfs = self.db.query(SessionPerformance).filter(SessionPerformance.user_id == user_id).all()
        if not perfs:
            return {}

        def avg(field):
            vals = [getattr(p, field) for p in perfs if getattr(p, field)]
            return round(sum(vals) / len(vals), 2) if vals else 0.0

        return {
            "Technical Accuracy": avg("avg_technical"),
            "Communication": avg("avg_communication"),
            "Confidence": avg("avg_confidence"),
            "Completeness": avg("avg_completeness"),
            "Problem Solving": avg("avg_problem_solving"),
            "Grammar": avg("avg_grammar"),
        }

    def _count_questions(self, user_id: UUID) -> int:
        from app.models.answer import Answer
        return self.db.query(Answer).filter(Answer.user_id == user_id).count()

    def _strongest_category(self, user_id: UUID) -> str:
        cats = self.get_category_performance(user_id)
        if not cats:
            return None
        return max(cats, key=lambda x: x["avg_score"])["category"]

    def _weakest_category(self, user_id: UUID) -> str:
        cats = self.get_category_performance(user_id)
        filtered = [c for c in cats if c["sessions_count"] > 0]
        if not filtered:
            return None
        return min(filtered, key=lambda x: x["avg_score"])["category"]
