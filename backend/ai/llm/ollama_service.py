import httpx
import json
from typing import List, Dict
from loguru import logger
from app.core.config import settings


class OllamaService:
    """Handles all LLM interactions via local Ollama server."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = 120.0

    def _chat(self, prompt: str, system: str = "") -> str:
        """Send a prompt to Ollama and return the response text."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": self.model, "messages": messages, "stream": False},
                )
                response.raise_for_status()
                data = response.json()
                return data["message"]["content"].strip()
        except httpx.ConnectError:
            logger.error("Ollama not running. Start with: ollama serve")
            raise RuntimeError("Ollama server is not running. Please run: ollama serve")
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise

    def generate_questions(
        self,
        category: str,
        difficulty: str,
        interview_type: str,
        num_questions: int = 5,
        resume_skills: List[str] = None,
    ) -> List[Dict]:
        """Generate interview questions as a JSON list."""
        skills_context = ""
        if resume_skills:
            skills_context = f"\nCandidate skills from resume: {', '.join(resume_skills[:15])}"

        system = (
            "You are a senior technical interviewer. "
            "Always respond with valid JSON only. No explanation, no markdown."
        )

        prompt = f"""Generate exactly {num_questions} interview questions for:
- Category: {category}
- Difficulty: {difficulty}
- Type: {interview_type}
{skills_context}

Return a JSON array with this exact structure:
[
  {{
    "question_text": "...",
    "expected_answer": "Brief key points expected in a good answer",
    "keywords": ["keyword1", "keyword2"],
    "difficulty": "{difficulty}",
    "type": "{interview_type}"
  }}
]"""

        raw = self._chat(prompt, system)

        # Clean up response (sometimes LLMs add ```json blocks)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        try:
            questions = json.loads(raw)
            if not isinstance(questions, list):
                raise ValueError("Expected a list")
            return questions
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse LLM questions response: {e}\nRaw: {raw[:500]}")
            # Return fallback questions
            return self._fallback_questions(category, difficulty, num_questions)

    def evaluate_answer(
        self,
        question: str,
        answer: str,
        expected_answer: str = "",
        category: str = "",
    ) -> Dict:
        """Evaluate a candidate's answer and return structured scores."""
        system = (
            "You are an expert technical interviewer and evaluator. "
            "Always respond with valid JSON only."
        )

        prompt = f"""Evaluate this interview answer:

Question: {question}
Expected Answer Hints: {expected_answer or 'Use your knowledge'}
Candidate Answer: {answer}
Category: {category}

Score each dimension from 0 to 100 and provide feedback.

Return JSON:
{{
  "technical_accuracy": <0-100>,
  "communication_score": <0-100>,
  "confidence_score": <0-100>,
  "completeness_score": <0-100>,
  "problem_solving_score": <0-100>,
  "overall_score": <0-100>,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": ["...", "..."],
  "reasoning": "Brief explanation of scores"
}}"""

        raw = self._chat(prompt, system)

        # Clean markdown fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        try:
            result = json.loads(raw)
            # Ensure all expected keys exist
            defaults = {
                "technical_accuracy": 50, "communication_score": 50,
                "confidence_score": 50, "completeness_score": 50,
                "problem_solving_score": 50, "overall_score": 50,
                "strengths": [], "weaknesses": [], "suggestions": [], "reasoning": "",
            }
            return {**defaults, **result}
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse evaluation response: {e}")
            return {
                "technical_accuracy": 50, "communication_score": 50,
                "confidence_score": 50, "completeness_score": 50,
                "problem_solving_score": 50, "overall_score": 50,
                "strengths": ["Answer provided"],
                "weaknesses": ["Could not fully evaluate"],
                "suggestions": ["Try to be more specific"],
                "reasoning": "Evaluation parsing failed",
            }

    def generate_session_summary(self, feedbacks: List[Dict], category: str) -> Dict:
        """Generate an overall session summary with resources."""
        system = "You are a career coach. Return valid JSON only."

        prompt = f"""Based on these interview feedback scores for {category}:
{json.dumps(feedbacks, indent=2)}

Generate a comprehensive summary. Return JSON:
{{
  "overall_assessment": "...",
  "top_strengths": ["...", "..."],
  "improvement_areas": ["...", "..."],
  "skill_gaps": ["...", "..."],
  "recommended_resources": [
    {{"title": "...", "type": "course/book/article", "description": "..."}}
  ],
  "next_steps": ["...", "..."]
}}"""

        raw = self._chat(prompt, system)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        try:
            return json.loads(raw.strip())
        except Exception:
            return {
                "overall_assessment": "Session completed",
                "top_strengths": [],
                "improvement_areas": [],
                "skill_gaps": [],
                "recommended_resources": [],
                "next_steps": ["Practice more", "Review weak areas"],
            }

    def generate_follow_up_question(
        self,
        question: str,
        answer: str,
        category: str = "",
    ) -> str:
        """Generate a follow-up/further question based on candidate's answer."""
        system = (
            "You are a professional, senior technical interviewer. "
            "Keep the response brief, direct, and concise. Return ONLY the follow-up question text."
        )

        prompt = f"""Based on the following interview interaction, generate a follow-up question:

Category: {category}
Initial Question: {question}
Candidate's Answer: {answer}

Generate a relevant follow-up question that digs deeper into what the candidate answered, clarifies their understanding, or asks them to explain a specific concept or technology they mentioned.

Keep it to 1-2 natural sentences, acting directly as the interviewer asking the candidate. Do not include any prefix or framing like 'Here is your follow-up:'."""

        try:
            raw = self._chat(prompt, system)
            return raw.strip()
        except Exception as e:
            logger.error(f"Failed to generate follow-up question: {e}")
            return f"Could you elaborate more on the details or tools you would use for this?"

    def _fallback_questions(self, category: str, difficulty: str, n: int) -> List[Dict]:
        """Fallback questions if LLM fails."""
        base = [
            {"question_text": f"Explain the core concepts of {category}.",
             "expected_answer": "Core concepts explanation", "keywords": [category], "difficulty": difficulty, "type": "technical"},
            {"question_text": "Describe a challenging project you worked on.",
             "expected_answer": "STAR method answer", "keywords": ["project", "challenge"], "difficulty": difficulty, "type": "behavioral"},
            {"question_text": "How do you approach debugging a complex problem?",
             "expected_answer": "Systematic debugging process", "keywords": ["debug", "problem-solving"], "difficulty": difficulty, "type": "technical"},
            {"question_text": "What are your greatest strengths as a developer?",
             "expected_answer": "Honest strengths with examples", "keywords": ["strengths"], "difficulty": difficulty, "type": "behavioral"},
            {"question_text": "Where do you see yourself in 5 years?",
             "expected_answer": "Career goals aligned with role", "keywords": ["career", "goals"], "difficulty": difficulty, "type": "hr"},
        ]
        return base[:n]

    def is_available(self) -> bool:
        """Check if Ollama server is running."""
        try:
            with httpx.Client(timeout=3.0) as client:
                r = client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False


# Singleton instance
ollama_service = OllamaService()
