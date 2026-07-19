from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.middleware.auth import get_current_user
from app.schemas.user import UserOut, UserUpdate, ChangePassword
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, hash_password
from app.models.user import User
from fastapi import HTTPException, status

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = UserRepository(db)
    return repo.update(current_user, **data.model_dump(exclude_none=True))


@router.post("/me/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    repo = UserRepository(db)
    repo.update_password(current_user, data.new_password)
    return {"message": "Password changed successfully"}
