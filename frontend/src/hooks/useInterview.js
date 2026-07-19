import { useState, useCallback } from 'react'
import { interviewAPI } from '../services/api'
import toast from 'react-hot-toast'

export function useInterview() {
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)

  const startSession = useCallback(async (config) => {
    setLoading(true)
    try {
      const { data } = await interviewAPI.start(config)
      setSession({ id: data.session_id, title: data.title })
      setQuestions(data.questions)
      setCurrentIndex(0)
      setAnswers({})
      setFeedbacks({})
      return data
    } catch (err) {
      toast.error('Failed to start interview')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const submitTextAnswer = useCallback(async (answerText) => {
    const sq = questions[currentIndex]
    if (!sq || !session) return null

    setLoading(true)
    try {
      const { data } = await interviewAPI.submitTextAnswer(session.id, {
        session_question_id: sq.id,
        answer_text: answerText,
      })
      setAnswers((prev) => ({ ...prev, [sq.id]: data.answer_id }))
      setFeedbacks((prev) => ({ ...prev, [sq.id]: data.feedback }))
      return data
    } catch (err) {
      toast.error('Failed to submit answer')
      throw err
    } finally {
      setLoading(false)
    }
  }, [session, questions, currentIndex])

  const submitAudioAnswer = useCallback(async (audioBlob) => {
    const sq = questions[currentIndex]
    if (!sq || !session) return null

    setLoading(true)
    try {
      const { data } = await interviewAPI.submitAudioAnswer(session.id, sq.id, audioBlob)
      setAnswers((prev) => ({ ...prev, [sq.id]: data.answer_id }))
      setFeedbacks((prev) => ({ ...prev, [sq.id]: data.feedback }))
      return data
    } catch (err) {
      toast.error('Failed to process audio')
      throw err
    } finally {
      setLoading(false)
    }
  }, [session, questions, currentIndex])

  const nextQuestion = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))
  }, [questions.length])

  const completeSession = useCallback(async () => {
    if (!session) return null
    setCompleting(true)
    try {
      const { data } = await interviewAPI.completeSession(session.id)
      return data
    } catch (err) {
      toast.error('Failed to complete session')
      throw err
    } finally {
      setCompleting(false)
    }
  }, [session])

  const currentQuestion = questions[currentIndex] || null
  const isLastQuestion = currentIndex === questions.length - 1
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  return {
    session,
    questions,
    currentQuestion,
    currentIndex,
    feedbacks,
    loading,
    completing,
    isLastQuestion,
    progress,
    startSession,
    submitTextAnswer,
    submitAudioAnswer,
    nextQuestion,
    completeSession,
  }
}
