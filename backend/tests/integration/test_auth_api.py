import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from app.db.database import get_db, Base

# Use in-memory SQLite for tests
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_register_success():
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "TestPass123",
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


def test_register_duplicate_email():
    payload = {"full_name": "User", "email": "dup@example.com", "password": "TestPass123"}
    client.post("/api/v1/auth/register", json=payload)
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 409


def test_login_success():
    client.post("/api/v1/auth/register", json={
        "full_name": "Test", "email": "login@example.com", "password": "TestPass123"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "login@example.com", "password": "TestPass123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    client.post("/api/v1/auth/register", json={
        "full_name": "Test", "email": "wp@example.com", "password": "TestPass123"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "wp@example.com", "password": "WrongPass123"
    })
    assert res.status_code == 401


def test_get_me_authenticated():
    reg = client.post("/api/v1/auth/register", json={
        "full_name": "Me User", "email": "me@example.com", "password": "TestPass123"
    })
    token = reg.json()["access_token"]
    res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_get_me_unauthenticated():
    res = client.get("/api/v1/users/me")
    assert res.status_code == 403
