"""
Seed initial data: admin user + default categories.
Run once after database creation.
"""
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.category import Category
from app.core.security import hash_password
from app.core.config import settings
from loguru import logger


DEFAULT_CATEGORIES = [
    {"name": "Software Engineering", "slug": "software-engineering", "description": "DSA, system design, OOP", "icon": "code"},
    {"name": "Data Science", "slug": "data-science", "description": "Statistics, ML, data analysis", "icon": "chart-bar"},
    {"name": "Machine Learning", "slug": "machine-learning", "description": "ML algorithms, model building", "icon": "brain"},
    {"name": "AI Engineer", "slug": "ai-engineer", "description": "LLMs, RAG, AI pipelines", "icon": "cpu"},
    {"name": "MERN Stack", "slug": "mern-stack", "description": "MongoDB, Express, React, Node.js", "icon": "layers"},
    {"name": "Python Developer", "slug": "python", "description": "Python, Django, Flask, FastAPI", "icon": "terminal"},
    {"name": "Java Developer", "slug": "java", "description": "Java, Spring Boot, OOP", "icon": "coffee"},
    {"name": "HR Interview", "slug": "hr", "description": "HR questions, culture fit", "icon": "users"},
    {"name": "Behavioral", "slug": "behavioral", "description": "STAR method, soft skills", "icon": "heart"},
]

DEFAULT_QUESTIONS = [
    {
        "category_slug": "software-engineering",
        "question_text": "What are the SOLID principles of object-oriented design, and how do they help write maintainable code?",
        "question_type": "technical",
        "difficulty": "medium",
        "expected_answer": "SOLID stands for Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. They reduce coupling and make code easier to extend.",
        "keywords": ["SOLID", "design principles", "OOP", "coupling", "cohesion"]
    },
    {
        "category_slug": "software-engineering",
        "question_text": "Explain the difference between horizontal and vertical scaling. When should you use each?",
        "question_type": "technical",
        "difficulty": "medium",
        "expected_answer": "Vertical scaling (scaling up) means adding more power (CPU, RAM) to an existing machine. Horizontal scaling (scaling out) means adding more machines. Use vertical for simple apps, horizontal for high availability and huge traffic.",
        "keywords": ["scaling", "horizontal", "vertical", "load balancer", "availability"]
    },
    {
        "category_slug": "python",
        "question_text": "What is the difference between list and tuple in Python, and in what scenarios is a tuple preferred?",
        "question_type": "technical",
        "difficulty": "easy",
        "expected_answer": "Lists are mutable, dynamic, and slower. Tuples are immutable, fixed-size, faster, and can be used as dictionary keys. Use tuples for read-only structured data.",
        "keywords": ["list", "tuple", "mutable", "immutable", "performance"]
    },
    {
        "category_slug": "python",
        "question_text": "Explain Python's GIL (Global Interpreter Lock). How does it affect multi-threading?",
        "question_type": "technical",
        "difficulty": "hard",
        "expected_answer": "GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. It makes multi-threading slow for CPU-bound tasks, but I/O-bound tasks still benefit. Use multiprocessing for CPU-bound tasks.",
        "keywords": ["GIL", "multi-threading", "CPU-bound", "concurrency", "multiprocessing"]
    },
    {
        "category_slug": "mern-stack",
        "question_text": "Explain how React's Virtual DOM works and how it improves performance.",
        "question_type": "technical",
        "difficulty": "medium",
        "expected_answer": "React keeps a virtual representation of the UI in memory. When state changes, a new Virtual DOM tree is created. React diffs it with the previous tree (reconciliation) and updates only the changed parts in the real DOM.",
        "keywords": ["virtual DOM", "reconciliation", "diffing", "performance", "real DOM"]
    },
    {
        "category_slug": "behavioral",
        "question_text": "Describe a time when you had a conflict with a team member. How did you resolve it?",
        "question_type": "behavioral",
        "difficulty": "medium",
        "expected_answer": "Describe a situation using the STAR method (Situation, Task, Action, Result). Emphasize professional communication, active listening, and finding a win-win compromise.",
        "keywords": ["conflict", "resolution", "communication", "STAR method", "collaboration"]
    }
]


def seed_database(db: Session):
    # Seed admin user
    existing_admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    admin_user = existing_admin
    if not existing_admin:
        admin_user = User(
            full_name="Admin",
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        db.flush()  # get ID
        logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")

    # Seed categories
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not existing:
            cat = Category(**cat_data)
            db.add(cat)

    db.flush()

    # Seed default questions
    from app.models.interview import Question, QuestionType, DifficultyLevel
    for q_data in DEFAULT_QUESTIONS:
        category = db.query(Category).filter(Category.slug == q_data["category_slug"]).first()
        if category:
            existing = (
                db.query(Question)
                .filter(Question.question_text == q_data["question_text"])
                .first()
            )
            if not existing:
                q = Question(
                    category_id=category.id,
                    question_text=q_data["question_text"],
                    question_type=QuestionType[q_data["question_type"]],
                    difficulty=DifficultyLevel[q_data["difficulty"]],
                    expected_answer=q_data["expected_answer"],
                    keywords=q_data["keywords"],
                    is_ai_generated=False,
                    created_by=admin_user.id
                )
                db.add(q)

    db.commit()
    logger.info("Database seeded successfully")
