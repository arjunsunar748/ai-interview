from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.middleware.auth import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import AnalyticsOut

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = AnalyticsService(db)
    return {
        "stats": svc.get_dashboard_stats(current_user.id),
        "score_breakdown": svc.get_score_breakdown(current_user.id),
    }


@router.get("/weekly-progress")
def get_weekly_progress(
    weeks: int = 8,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService(db).get_weekly_progress(current_user.id, weeks)


@router.get("/category-performance")
def get_category_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService(db).get_category_performance(current_user.id)


@router.get("/skill-gaps")
def get_skill_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService(db).get_skill_gaps(current_user.id)
