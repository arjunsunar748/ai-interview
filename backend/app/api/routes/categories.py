from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.category import Category

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/")
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True).all()
