from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from app.models.user import User
from app.core.security import hash_password


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def get_all(self, skip: int = 0, limit: int = 50) -> List[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def create(self, full_name: str, email: str, password: str, role: str = "user") -> User:
        user = User(
            full_name=full_name,
            email=email.lower(),
            hashed_password=hash_password(password),
            role=role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def deactivate(self, user: User) -> User:
        user.is_active = False
        self.db.commit()
        return user

    def set_reset_token(self, user: User, token: str, expiry) -> User:
        user.reset_token = token
        user.reset_token_expiry = expiry
        self.db.commit()
        return user

    def update_password(self, user: User, new_password: str) -> User:
        user.hashed_password = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        self.db.commit()
        return user

    def count(self) -> int:
        return self.db.query(User).count()
