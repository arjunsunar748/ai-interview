import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token


def test_password_hashing():
    password = "TestPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_access_token_creation_and_decode():
    user_id = "test-user-123"
    token = create_access_token(subject=user_id, role="user")
    assert token is not None

    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "user"
    assert payload["type"] == "access"


def test_invalid_token_returns_none():
    result = decode_token("invalid.token.here")
    assert result is None


def test_expired_token():
    from datetime import datetime, timedelta
    from jose import jwt
    from app.core.config import settings

    payload = {
        "sub": "user-123",
        "exp": datetime.utcnow() - timedelta(minutes=1),
        "type": "access",
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    result = decode_token(token)
    assert result is None
