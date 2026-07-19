import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import engine, SessionLocal
from app.models import *  # noqa — import all models so SQLAlchemy creates tables

from app.api.routes import auth, users, resume, interview, analytics, admin, categories
from app.api.middleware.error_handler import (
    validation_exception_handler,
    sqlalchemy_exception_handler,
    generic_exception_handler,
)
from app.utils.seed import seed_database

# Setup logger
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting AI Interview Platform...")

    # Create all tables
    from app.db.database import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

    # Ensure is_follow_up column exists in session_questions (PostgreSQL migration helper)
    from sqlalchemy import text
    migration_db = SessionLocal()
    try:
        migration_db.execute(text("ALTER TABLE session_questions ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE"))
        migration_db.commit()
        logger.info("Database migration: is_follow_up column ensured in session_questions")
    except Exception as e:
        logger.error(f"Migration error (is_follow_up): {e}")
        migration_db.rollback()
    finally:
        migration_db.close()

    # Seed initial data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Ensure upload dirs exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "audio"), exist_ok=True)
    os.makedirs("logs", exist_ok=True)

    logger.info(f"Server ready — http://localhost:8000")
    logger.info(f"API Docs — http://localhost:8000/docs")

    yield

    logger.info("Shutting down...")


# ── FastAPI App ────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Mock Interview & Career Preparation System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception Handlers ─────────────────────────────────────────────────

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ── Static Files ───────────────────────────────────────────────────────

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────

PREFIX = settings.API_PREFIX

app.include_router(auth.router,        prefix=PREFIX)
app.include_router(users.router,       prefix=PREFIX)
app.include_router(resume.router,      prefix=PREFIX)
app.include_router(interview.router,   prefix=PREFIX)
app.include_router(analytics.router,   prefix=PREFIX)
app.include_router(admin.router,       prefix=PREFIX)
app.include_router(categories.router,  prefix=PREFIX)


# ── Health Check ───────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    from ai.llm.ollama_service import ollama_service
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "ollama_available": ollama_service.is_available(),
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "AI Interview Platform API",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
