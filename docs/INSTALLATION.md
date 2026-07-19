# Installation Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://postgresql.org |
| Ollama | Latest | https://ollama.com |

---

## Step 1: PostgreSQL Setup

```bash
# Start PostgreSQL and create database
psql -U postgres
CREATE DATABASE ai_interview_db;
\q
```

---

## Step 2: Ollama Setup (Local LLM)

```bash
# Install Ollama from https://ollama.com
# Then pull a model (choose one):

ollama pull llama3        # Recommended (4GB)
ollama pull mistral       # Alternative (4GB)
ollama pull gemma:2b      # Lighter option (1.5GB)

# Start the Ollama server (keep this running)
ollama serve
```

---

## Step 3: Backend Setup

```bash
# Navigate to backend folder
cd "AI Interview/backend"

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy NLP model
python -m spacy download en_core_web_sm


# Edit .env — update DATABASE_URL with your PostgreSQL password
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_interview_db

# Start the backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API Docs at: http://localhost:8000/docs

---

## Step 4: Frontend Setup

```bash
# Open a new terminal
cd "AI Interview/frontend"

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## Step 5: Download AI Models (One-time)

The Sentence Transformers model downloads automatically on first use.
Whisper model downloads on first voice answer submission.

To pre-download manually:
```python
# Run from backend directory with venv activated
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
python -c "from faster_whisper import WhisperModel; WhisperModel('base')"
```

---

## Default Admin Login

```
Email:    admin@interview.com
Password: Admin@123456
```

---

## Run Tests

```bash
# From backend directory with venv activated
pytest tests/ -v
```

---

## Folder Reference

```
backend/    → FastAPI application
frontend/   → React application
database/   → SQL schema and migrations
docs/       → Architecture, ER diagram, API docs
```

---

## Troubleshooting

**"Ollama not running"**
→ Run `ollama serve` in a terminal and keep it open

**"spaCy model not found"**
→ Run `python -m spacy download en_core_web_sm`

**"Database connection failed"**
→ Check PostgreSQL is running and DATABASE_URL in `.env` is correct

**"Microphone not working in browser"**
→ Use Chrome/Firefox, allow microphone permissions when prompted

**Port conflicts**
→ Backend: change `--port 8000` in uvicorn command
→ Frontend: change `port: 5173` in `vite.config.js`
