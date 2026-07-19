import pytest
from ai.evaluator.scoring import ScoringService


@pytest.fixture
def svc():
    return ScoringService()


def test_grammar_score_empty(svc):
    score = svc.grammar_score("")
    assert score == 30.0


def test_grammar_score_short(svc):
    score = svc.grammar_score("Yes")
    assert score == 30.0


def test_grammar_score_normal(svc):
    text = "I have five years of experience building REST APIs with FastAPI and PostgreSQL."
    score = svc.grammar_score(text)
    assert 40 <= score <= 100


def test_confidence_proxy_empty(svc):
    score = svc.confidence_proxy("")
    assert score == 20.0


def test_confidence_proxy_good_answer(svc):
    text = " ".join(["word"] * 60)  # 60 words
    score = svc.confidence_proxy(text, duration_sec=40)
    assert score > 50


def test_compute_overall(svc):
    scores = {
        "technical_accuracy": 80,
        "communication_score": 70,
        "confidence_score": 60,
        "completeness_score": 75,
        "problem_solving_score": 65,
        "grammar_score": 80,
    }
    overall = svc.compute_overall(scores)
    assert 60 <= overall <= 90


def test_merge_scores(svc):
    llm_scores = {
        "technical_accuracy": 70,
        "communication_score": 65,
        "completeness_score": 60,
        "problem_solving_score": 55,
    }
    merged = svc.merge_scores(llm_scores, semantic_score=60, grammar=70, confidence=65)
    assert "technical_accuracy" in merged
    assert "grammar_score" in merged
    assert all(0 <= v <= 100 for v in merged.values())
