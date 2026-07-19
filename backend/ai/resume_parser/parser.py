import re
import os
from typing import Dict, List, Optional
from loguru import logger

# Common tech skills list for matching
TECH_SKILLS = [
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "php", "ruby",
    "react", "angular", "vue", "nextjs", "nodejs", "express", "django", "fastapi", "flask",
    "spring", "spring boot", "laravel", "rails",
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "jenkins", "github actions",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas",
    "numpy", "matplotlib", "opencv", "nlp", "transformers", "langchain",
    "git", "linux", "rest api", "graphql", "microservices", "agile", "scrum",
    "html", "css", "tailwind", "bootstrap", "sass", "webpack", "vite",
    "sql", "nosql", "data analysis", "data science", "power bi", "tableau",
]


class ResumeParser:
    """Offline resume parser using pdfminer + python-docx + spaCy NLP."""

    def __init__(self):
        self._nlp = None

    def _load_nlp(self):
        if self._nlp is None:
            try:
                import spacy
                try:
                    self._nlp = spacy.load("en_core_web_sm")
                except OSError:
                    logger.warning("spaCy model not found. Run: python -m spacy download en_core_web_sm")
                    self._nlp = None
            except ImportError:
                logger.warning("spaCy not installed")
                self._nlp = None
        return self._nlp

    def extract_text_from_pdf(self, file_path: str) -> str:
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(file_path)
            return text.strip() if text else ""
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def extract_text_from_docx(self, file_path: str) -> str:
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return ""

    def extract_text(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return self.extract_text_from_docx(file_path)
        return ""

    def extract_email(self, text: str) -> Optional[str]:
        pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        match = re.search(pattern, text)
        return match.group(0).lower() if match else None

    def extract_phone(self, text: str) -> Optional[str]:
        pattern = r"(\+?[\d\s\-().]{7,15})"
        matches = re.findall(pattern, text)
        for m in matches:
            cleaned = re.sub(r"[^\d+]", "", m)
            if 7 <= len(cleaned) <= 15:
                return m.strip()
        return None

    def extract_name(self, text: str) -> Optional[str]:
        """Extract name using spaCy NER or first non-empty line heuristic."""
        nlp = self._load_nlp()
        if nlp:
            doc = nlp(text[:500])
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    return ent.text.strip()

        # Fallback: first line of resume is usually the name
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        if lines:
            first = lines[0]
            if len(first.split()) <= 5 and not any(c in first for c in ["@", "http", "+"]):
                return first
        return None

    def extract_skills(self, text: str) -> List[Dict]:
        text_lower = text.lower()
        found = []
        for skill in TECH_SKILLS:
            if skill.lower() in text_lower:
                found.append({"name": skill.title(), "confidence": 0.9})
        return found

    def extract_sections(self, text: str) -> Dict:
        """Simple section extraction based on common resume headers."""
        sections = {
            "experience": [],
            "education": [],
            "summary": "",
        }

        # Extract summary (first paragraph or summary section)
        summary_match = re.search(
            r"(?:summary|objective|profile)[:\n](.*?)(?:\n[A-Z]{4,}|\Z)",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if summary_match:
            sections["summary"] = summary_match.group(1).strip()[:500]

        return sections

    def parse(self, file_path: str) -> Dict:
        """Main parse method — returns full structured data."""
        logger.info(f"Parsing resume: {file_path}")

        raw_text = self.extract_text(file_path)
        if not raw_text:
            return {"raw_text": "", "skills": [], "experience": [], "education": []}

        skills = self.extract_skills(raw_text)
        sections = self.extract_sections(raw_text)

        result = {
            "raw_text": raw_text,
            "name": self.extract_name(raw_text),
            "email": self.extract_email(raw_text),
            "phone": self.extract_phone(raw_text),
            "summary": sections.get("summary", ""),
            "skills": skills,
            "experience": sections.get("experience", []),
            "education": sections.get("education", []),
        }

        logger.info(f"Parsed resume: {len(skills)} skills found")
        return result


# Singleton
resume_parser = ResumeParser()
