from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt

# Monkeypatch bcrypt.hashpw to prevent ValueError with passlib + bcrypt >= 4.1.0
original_hashpw = bcrypt.hashpw
def patched_hashpw(password, salt):
    if len(password) > 72:
        password = password[:72]
    return original_hashpw(password, salt)
bcrypt.hashpw = patched_hashpw

from passlib.context import CryptContext
from app.core.config import settings
import warnings

# Suppress passlib bcrypt version warning (cosmetic only)
warnings.filterwarnings("ignore", ".*trapped error reading bcrypt version.*")
warnings.filterwarnings("ignore", ".*error reading bcrypt version.*")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: Union[str, int], role: str = "user") -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, int]) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
