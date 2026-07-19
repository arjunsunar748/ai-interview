from typing import Dict, Optional
from loguru import logger


class ScoringService:
    """
    Hybrid scoring: Sentence Transformers (semantic) + spaCy (grammar) + LLM scores.
    """

    def __init__(self):
        self._sentence_model = None
        self._nlp = None

    def _load_sentence_model(self):
        if self._sentence_model is None:
            try:
                from sentence_transformers import SentenceTransformer, util
                self._sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("Sentence Transformer loaded")
            except ImportError:
                logger.warning("sentence-transformers not installed")
                self._sentence_model = None
        return self._sentence_model

    def _load_nlp(self):
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load("en_core_web_sm")
            except Exception:
                self._nlp = None
        return self._nlp

    def semantic_similarity(self, answer: str, expected: str) -> float:
        """Return cosine similarity score (0-100) between answer and expected."""
        if not answer or not expected:
            return 50.0

        model = self._load_sentence_model()
        if model is None:
            return 50.0

        try:
            from sentence_transformers import util
            import torch
            emb1 = model.encode(answer, convert_to_tensor=True)
            emb2 = model.encode(expected, convert_to_tensor=True)
            score = float(util.cos_sim(emb1, emb2)[0][0])
            # Convert from [-1,1] to [0,100]
            return round(max(0, min(100, (score + 1) * 50)), 2)
        except Exception as e:
            logger.error(f"Semantic similarity error: {e}")
            return 50.0

    def grammar_score(self, text: str) -> float:
        """Score grammar/fluency using spaCy heuristics (0-100)."""
        if not text or len(text.strip()) < 10:
            return 30.0

        nlp = self._load_nlp()
        if nlp is None:
            return 60.0

        try:
            doc = nlp(text)
            total_tokens = len(doc)
            if total_tokens == 0:
                return 30.0

            # Heuristics
            sentences = list(doc.sents)
            avg_sentence_len = total_tokens / max(len(sentences), 1)
            has_proper_sentences = avg_sentence_len >= 5
            unique_words = len(set(t.lemma_.lower() for t in doc if t.is_alpha))
            vocab_diversity = unique_words / max(total_tokens, 1)

            score = 50.0
            if has_proper_sentences:
                score += 20
            if vocab_diversity > 0.5:
                score += 15
            if len(sentences) > 2:
                score += 15

            return min(100.0, round(score, 2))
        except Exception as e:
            logger.error(f"Grammar scoring error: {e}")
            return 60.0

    def confidence_proxy(self, text: str, duration_sec: Optional[int] = None) -> float:
        """
        Estimate confidence from answer characteristics:
        - Word count (too short = low confidence)
        - Speaking pace (if duration provided)
        - Use of filler phrases
        """
        if not text:
            return 20.0

        words = text.split()
        word_count = len(words)

        # Filler word detection
        fillers = {"um", "uh", "like", "basically", "literally", "you know", "i mean"}
        filler_count = sum(1 for w in words if w.lower() in fillers)
        filler_ratio = filler_count / max(word_count, 1)

        score = 50.0

        # Word count scoring
        if word_count >= 50:
            score += 20
        elif word_count >= 20:
            score += 10
        elif word_count < 10:
            score -= 20

        # Filler penalty
        score -= filler_ratio * 30

        # Speaking pace bonus (100-160 wpm is ideal)
        if duration_sec and duration_sec > 0:
            wpm = (word_count / duration_sec) * 60
            if 80 <= wpm <= 180:
                score += 15
            elif wpm < 50 or wpm > 250:
                score -= 10

        return max(0.0, min(100.0, round(score, 2)))

    def merge_scores(self, llm_scores: Dict, semantic_score: float, grammar: float, confidence: float) -> Dict:
        """
        Merge LLM evaluation scores with local computed scores.
        LLM scores carry higher weight for technical/completeness.
        Local scores carry higher weight for grammar/confidence.
        """
        return {
            "technical_accuracy": round(llm_scores.get("technical_accuracy", 50) * 0.8 + semantic_score * 0.2, 2),
            "communication_score": round(llm_scores.get("communication_score", 50) * 0.6 + grammar * 0.4, 2),
            "confidence_score": round(confidence, 2),
            "completeness_score": round(llm_scores.get("completeness_score", 50), 2),
            "problem_solving_score": round(llm_scores.get("problem_solving_score", 50), 2),
            "grammar_score": round(grammar, 2),
        }

    def compute_overall(self, scores: Dict) -> float:
        weights = {
            "technical_accuracy": 0.30,
            "communication_score": 0.20,
            "confidence_score": 0.15,
            "completeness_score": 0.15,
            "problem_solving_score": 0.15,
            "grammar_score": 0.05,
        }
        total = sum(scores.get(k, 0) * w for k, w in weights.items())
        return round(total, 2)


# Singleton
scoring_service = ScoringService()
