from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from typing import List
from loguru import logger

from app.repositories.interview_repository import InterviewRepository
from app.repositories.resume_repository import ResumeRepository
from app.models.interview import InterviewStatus, Question, SessionQuestion
from app.models.category import Category
from app.schemas.interview import SessionCreate
from ai.llm.ollama_service import ollama_service
from ai.evaluator.scoring import scoring_service


class InterviewService:
    def __init__(self, db: Session):
        self.repo = InterviewRepository(db)
        self.resume_repo = ResumeRepository(db)
        self.db = db

    def _get_category(self, category_id: UUID) -> Category:
        cat = self.db.query(Category).filter(Category.id == category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        return cat

    def create_session(self, user_id: UUID, data: SessionCreate) -> dict:
        """Create a new interview session, prioritize admin-created questions, and fallback to LLM."""
        category = self._get_category(data.category_id)

        # Get resume skills if resume provided
        resume_skills = []
        if data.resume_id:
            resume = self.resume_repo.get_by_id(data.resume_id)
            if resume and resume.skills:
                resume_skills = [s.skill_name for s in resume.skills]

        # Create session record
        session = self.repo.create_session(
            user_id=user_id,
            resume_id=data.resume_id,
            category_id=data.category_id,
            title=f"{category.name} - {data.difficulty.value.title()} - {data.interview_type.value.title()}",
            interview_type=data.interview_type,
            difficulty=data.difficulty,
            status=InterviewStatus.pending,
            total_questions=data.num_questions,
            started_at=datetime.utcnow().isoformat(),
        )

        # Query admin-created questions for the category
        import random
        db_questions = (
            self.db.query(Question)
            .filter(
                Question.category_id == data.category_id,
                Question.is_active == True,
                Question.is_ai_generated == False,
            )
            .all()
        )

        chosen_questions = []
        ai_questions = []
        if db_questions:
            logger.info(f"Found {len(db_questions)} admin-created questions for category {category.name}")
            # Try to filter by difficulty
            matching_diff = [q for q in db_questions if q.difficulty == data.difficulty]
            if len(matching_diff) >= data.num_questions:
                chosen_questions = random.sample(matching_diff, data.num_questions)
            else:
                # Mix in other difficulties of admin questions
                remaining_needed = data.num_questions - len(matching_diff)
                other_diff = [q for q in db_questions if q.difficulty != data.difficulty]
                chosen_questions = matching_diff + random.sample(other_diff, min(remaining_needed, len(other_diff)))
                
                # If still not enough, generate the rest with AI
                if len(chosen_questions) < data.num_questions:
                    needed = data.num_questions - len(chosen_questions)
                    logger.info(f"Need {needed} more questions, generating via AI")
                    try:
                        ai_questions = ollama_service.generate_questions(
                            category=category.name,
                            difficulty=data.difficulty.value,
                            interview_type=data.interview_type.value,
                            num_questions=needed,
                            resume_skills=resume_skills,
                        )
                    except Exception as e:
                        logger.error(f"LLM question generation failed: {e}, using fallback")
                        ai_questions = ollama_service._fallback_questions(
                            category.name, data.difficulty.value, needed
                        )
        else:
            # No admin questions found, generate all via AI
            logger.info(f"No admin questions found. Generating all {data.num_questions} questions via AI")
            try:
                ai_questions = ollama_service.generate_questions(
                    category=category.name,
                    difficulty=data.difficulty.value,
                    interview_type=data.interview_type.value,
                    num_questions=data.num_questions,
                    resume_skills=resume_skills,
                )
            except Exception as e:
                logger.error(f"LLM question generation failed: {e}, using fallback")
                ai_questions = ollama_service._fallback_questions(
                    category.name, data.difficulty.value, data.num_questions
                )

        # Standardize questions list
        question_dicts = []
        for q in chosen_questions:
            question_dicts.append({
                "question_text": q.question_text,
                "question_id": q.id
            })
        for q in ai_questions:
            question_dicts.append({
                "question_text": q["question_text"],
                "question_id": None
            })

        # Save questions to session
        sq_list = self.repo.add_session_questions(session.id, question_dicts)

        # Update session status
        self.repo.update_session(session, status=InterviewStatus.in_progress)

        return {
            "session": session,
            "questions": sq_list,
        }

    def submit_answer(self, session_id: UUID, sq_id: UUID, user_id: UUID, answer_text: str) -> dict:
        """Save a text answer and evaluate it with AI."""
        session = self.repo.get_session(session_id)
        if not session or session.user_id != user_id:
            raise HTTPException(status_code=404, detail="Session not found")

        sq = self.repo.get_session_question(sq_id)
        if not sq or str(sq.session_id) != str(session_id):
            raise HTTPException(status_code=404, detail="Question not found")

        # Save answer
        word_count = len(answer_text.split())
        answer = self.repo.save_answer(
            session_id=session_id,
            session_question_id=sq_id,
            user_id=user_id,
            answer_text=answer_text,
            word_count=word_count,
        )

        # Mark question as answered
        self.repo.mark_question_answered(sq)

        # Update session progress
        completed = (session.completed_questions or 0) + 1
        self.repo.update_session(session, completed_questions=completed)

        # AI Evaluation
        feedback = self._evaluate_answer(answer, sq, session)

        # Follow-up generation
        follow_up_sq = self._handle_follow_up(session, sq, answer_text)

        return {"answer": answer, "feedback": feedback, "follow_up_question": follow_up_sq}

    def submit_audio_answer(
        self, session_id: UUID, sq_id: UUID, user_id: UUID,
        audio_bytes: bytes, audio_suffix: str = ".webm"
    ) -> dict:
        """Transcribe audio then evaluate."""
        from ai.speech.stt_service import stt_service
        import os

        # Save audio file
        audio_filename = f"{session_id}_{sq_id}{audio_suffix}"
        audio_path = os.path.join("uploads", "audio", audio_filename)
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)

        # Transcribe
        try:
            transcription = stt_service.transcribe_file(audio_path)
            text = transcription["text"]
            duration = transcription.get("duration", 0)
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            text = ""
            duration = 0

        # Save answer with transcription
        sq = self.repo.get_session_question(sq_id)
        word_count = len(text.split()) if text else 0
        answer = self.repo.save_answer(
            session_id=session_id,
            session_question_id=sq_id,
            user_id=user_id,
            answer_text=text,
            audio_file_path=audio_path,
            transcription=text,
            answer_duration_sec=int(duration),
            word_count=word_count,
        )
        self.repo.mark_question_answered(sq)

        session = self.repo.get_session(session_id)
        completed = (session.completed_questions or 0) + 1
        self.repo.update_session(session, completed_questions=completed)

        feedback = self._evaluate_answer(answer, sq, session, duration_sec=int(duration))

        # Follow-up generation
        follow_up_sq = self._handle_follow_up(session, sq, text)

        return {
            "answer": answer,
            "feedback": feedback,
            "transcription": text,
            "follow_up_question": follow_up_sq
        }

    def _handle_follow_up(self, session, sq, answer_text: str) -> object:
        """Generate and insert a follow-up question if applicable."""
        # Only ask follow-up if the current question is NOT already a follow-up
        if getattr(sq, "is_follow_up", False):
            return None

        # Don't ask follow-up if candidate didn't answer anything
        if not answer_text or not answer_text.strip():
            return None

        try:
            category = self.db.query(Category).filter(Category.id == session.category_id).first()
            category_name = category.name if category else "General"
            
            logger.info(f"Generating follow-up question for session {session.id}, question {sq.id}")
            follow_up_text = ollama_service.generate_follow_up_question(
                question=sq.question_text,
                answer=answer_text,
                category=category_name
            )
            
            # Shift order_index of all questions that have order_index > sq.order_index
            self.db.query(SessionQuestion).filter(
                SessionQuestion.session_id == session.id,
                SessionQuestion.order_index > sq.order_index
            ).update({SessionQuestion.order_index: SessionQuestion.order_index + 1})
            
            # Insert the follow-up question
            follow_up_sq = SessionQuestion(
                session_id=session.id,
                question_id=None,
                question_text=follow_up_text,
                order_index=sq.order_index + 1,
                is_answered=False,
                is_follow_up=True
            )
            self.db.add(follow_up_sq)
            
            # Increment total questions in session
            session.total_questions = (session.total_questions or 0) + 1
            self.db.commit()
            self.db.refresh(follow_up_sq)
            self.db.refresh(session)
            return follow_up_sq
        except Exception as e:
            logger.error(f"Failed to generate follow-up question: {e}")
            return None

    def _evaluate_answer(self, answer, sq, session, duration_sec: int = None) -> object:
        """Run full AI evaluation pipeline."""
        category = self.db.query(Category).filter(Category.id == session.category_id).first()
        category_name = category.name if category else "General"

        answer_text = answer.answer_text or ""

        # 1. LLM evaluation
        try:
            llm_scores = ollama_service.evaluate_answer(
                question=sq.question_text,
                answer=answer_text,
                category=category_name,
            )
        except Exception as e:
            logger.error(f"LLM evaluation failed: {e}")
            llm_scores = {}

        # 2. Semantic similarity (against expected if available)
        semantic = scoring_service.semantic_similarity(answer_text, "")  # expected not stored per sq
        grammar = scoring_service.grammar_score(answer_text)
        confidence = scoring_service.confidence_proxy(answer_text, duration_sec)

        # 3. Merge scores
        merged = scoring_service.merge_scores(llm_scores, semantic, grammar, confidence)
        overall = scoring_service.compute_overall(merged)

        feedback = self.repo.save_feedback(
            answer_id=answer.id,
            session_id=session.id,
            technical_accuracy=merged["technical_accuracy"],
            communication_score=merged["communication_score"],
            confidence_score=merged["confidence_score"],
            completeness_score=merged["completeness_score"],
            problem_solving_score=merged["problem_solving_score"],
            grammar_score=merged["grammar_score"],
            overall_score=overall,
            strengths=llm_scores.get("strengths", []),
            weaknesses=llm_scores.get("weaknesses", []),
            suggestions=llm_scores.get("suggestions", []),
            model_reasoning=llm_scores.get("reasoning", ""),
        )
        return feedback

    def complete_session(self, session_id: UUID, user_id: UUID) -> dict:
        """Finalize session, generate aggregate performance report."""
        session = self.repo.get_session(session_id)
        if not session or session.user_id != user_id:
            raise HTTPException(status_code=404, detail="Session not found")

        # Aggregate all feedbacks
        answers = self.repo.get_session_answers(session_id)
        feedbacks = [a.feedback for a in answers if a.feedback]

        if not feedbacks:
            raise HTTPException(status_code=400, detail="No answers found for this session")

        def avg(field):
            vals = [getattr(f, field) for f in feedbacks if getattr(f, field) is not None]
            return round(sum(vals) / len(vals), 2) if vals else 0.0

        all_strengths = list({s for f in feedbacks if f.strengths for s in f.strengths})
        all_weaknesses = list({w for f in feedbacks if f.weaknesses for w in f.weaknesses})
        all_suggestions = list({s for f in feedbacks if f.suggestions for s in f.suggestions})

        # LLM session summary
        category = self.db.query(Category).filter(Category.id == session.category_id).first()
        try:
            summary = ollama_service.generate_session_summary(
                feedbacks=[{
                    "technical_accuracy": f.technical_accuracy,
                    "communication_score": f.communication_score,
                    "overall_score": f.overall_score,
                } for f in feedbacks],
                category=category.name if category else "General",
            )
        except Exception:
            summary = {}

        performance = self.repo.save_performance(
            session_id=session_id,
            user_id=user_id,
            avg_technical=avg("technical_accuracy"),
            avg_communication=avg("communication_score"),
            avg_confidence=avg("confidence_score"),
            avg_completeness=avg("completeness_score"),
            avg_problem_solving=avg("problem_solving_score"),
            avg_grammar=avg("grammar_score"),
            overall_score=avg("overall_score"),
            total_strengths=all_strengths[:10],
            total_weaknesses=all_weaknesses[:10],
            improvement_areas=summary.get("improvement_areas", all_suggestions[:5]),
            skill_gaps=summary.get("skill_gaps", []),
            recommended_resources={"resources": summary.get("recommended_resources", [])},
        )

        # Mark session complete
        self.repo.update_session(
            session,
            status=InterviewStatus.completed,
            completed_at=datetime.utcnow().isoformat(),
        )

        return {"performance": performance, "summary": summary}

    def get_session_with_questions(self, session_id: UUID, user_id: UUID) -> dict:
        session = self.repo.get_session(session_id)
        if not session or session.user_id != user_id:
            raise HTTPException(status_code=404, detail="Session not found")

        questions = self.repo.get_session_questions(session_id)
        return {"session": session, "questions": questions}
