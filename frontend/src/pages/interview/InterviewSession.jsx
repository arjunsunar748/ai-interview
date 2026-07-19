import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, SkipForward, CheckCircle, Volume2 } from 'lucide-react'
import { interviewAPI } from '../../services/api'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import ScoreRing from '../../components/common/ScoreRing'
import toast from 'react-hot-toast'

export default function InterviewSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessionData, setSessionData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [textAnswer, setTextAnswer] = useState('')
  const [mode, setMode] = useState('text')   // 'text' | 'voice'
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const { recording, audioBlob, audioUrl, duration, error: micError, start, stop, reset } = useVoiceRecorder()

  // Text-to-speech
  const speakQuestion = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    interviewAPI.getSession(sessionId)
      .then(({ data }) => {
        setSessionData(data.session)
        const mapped = data.questions.map(q => ({
          ...q,
          text: q.text || q.question_text
        }))
        setQuestions(mapped)
      })
      .catch(() => toast.error('Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

  // Automatically speak the question when it changes
  useEffect(() => {
    if (questions.length > 0 && questions[currentIdx]) {
      speakQuestion(questions[currentIdx].text)
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [currentIdx, questions])

  const currentQ = questions[currentIdx]
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0
  const isLast = currentIdx === questions.length - 1

  const submitText = async () => {
    if (!textAnswer.trim()) return toast.error('Please write your answer')
    setSubmitting(true)
    try {
      const { data } = await interviewAPI.submitTextAnswer(sessionId, {
        session_question_id: currentQ.id,
        answer_text: textAnswer,
      })
      setFeedback(data.feedback)
      setAnswered(true)

      // Inject follow-up question if returned
      if (data.follow_up_question) {
        const followUp = {
          id: data.follow_up_question.id,
          text: data.follow_up_question.text,
          order: data.follow_up_question.order
        }
        const updatedQuestions = [...questions]
        updatedQuestions.splice(currentIdx + 1, 0, followUp)
        for (let i = currentIdx + 2; i < updatedQuestions.length; i++) {
          updatedQuestions[i].order = updatedQuestions[i].order + 1
        }
        setQuestions(updatedQuestions)
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const submitAudio = async () => {
    if (!audioBlob) return toast.error('No recording found')
    setSubmitting(true)
    try {
      const { data } = await interviewAPI.submitAudioAnswer(sessionId, currentQ.id, audioBlob)
      setFeedback(data.feedback)
      setAnswered(true)
      if (data.transcription) toast.success(`Transcribed: "${data.transcription.slice(0, 60)}..."`)

      // Inject follow-up question if returned
      if (data.follow_up_question) {
        const followUp = {
          id: data.follow_up_question.id,
          text: data.follow_up_question.text,
          order: data.follow_up_question.order
        }
        const updatedQuestions = [...questions]
        updatedQuestions.splice(currentIdx + 1, 0, followUp)
        for (let i = currentIdx + 2; i < updatedQuestions.length; i++) {
          updatedQuestions[i].order = updatedQuestions[i].order + 1
        }
        setQuestions(updatedQuestions)
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const goNext = () => {
    setFeedback(null)
    setAnswered(false)
    setTextAnswer('')
    reset()
    if (isLast) {
      handleComplete()
    } else {
      setCurrentIdx((i) => i + 1)
    }
  }

  const handleComplete = async () => {
    try {
      await interviewAPI.completeSession(sessionId)
      navigate(`/interview/result/${sessionId}`)
    } catch {
      navigate(`/interview/result/${sessionId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
      {/* Progress bar */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>{sessionData?.title}</span>
          <span>Question {currentIdx + 1} / {questions.length}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 gap-6">
        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="bg-sky-500/20 text-sky-400 text-xs px-2 py-1 rounded-lg font-medium">
                Q{currentIdx + 1}
              </span>
              <button
                onClick={() => speakQuestion(currentQ?.text)}
                className={`p-1.5 rounded-lg transition-all ${
                  isSpeaking ? 'bg-sky-500/30 text-sky-400 animate-pulse' : 'text-slate-400 hover:text-white'
                }`}
                title="Speak question aloud"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white text-lg font-medium leading-relaxed">
              {currentQ?.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Answer Mode Toggle */}
        {!answered && (
          <div className="flex gap-2 glass p-1 rounded-xl w-fit">
            {['text', 'voice'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'text' ? '⌨️ Text' : '🎤 Voice'}
              </button>
            ))}
          </div>
        )}

        {/* Text Answer */}
        {!answered && mode === 'text' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            <textarea
              rows={5}
              placeholder="Type your answer here..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="input-field resize-none"
            />
            <button onClick={submitText} disabled={submitting} className="btn-primary flex items-center gap-2 w-fit">
              {submitting
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Submit Answer
            </button>
          </motion.div>
        )}

        {/* Voice Answer */}
        {!answered && mode === 'voice' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 rounded-2xl flex flex-col items-center gap-4">
            {micError && <p className="text-red-400 text-sm">{micError}</p>}

            {/* Recording indicator */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              recording ? 'bg-red-500/20 ring-4 ring-red-500/40 animate-pulse' : 'bg-sky-500/20'
            }`}>
              {recording ? <MicOff className="w-9 h-9 text-red-400" /> : <Mic className="w-9 h-9 text-sky-400" />}
            </div>

            {recording && (
              <p className="text-red-400 text-sm font-medium">
                Recording... {duration}s
              </p>
            )}

            {audioUrl && !recording && (
              <audio controls src={audioUrl} className="w-full rounded-lg" />
            )}

            <div className="flex gap-3">
              {!recording && !audioBlob && (
                <button onClick={start} className="btn-primary flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Start Recording
                </button>
              )}
              {recording && (
                <button onClick={stop} className="bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2">
                  <MicOff className="w-4 h-4" /> Stop
                </button>
              )}
              {audioBlob && !recording && (
                <>
                  <button onClick={reset} className="btn-secondary">Re-record</button>
                  <button onClick={submitAudio} disabled={submitting} className="btn-primary flex items-center gap-2">
                    {submitting
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                    Submit
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Feedback */}
        {answered && feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-2xl border border-sky-500/20"
          >
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">AI Feedback</h3>
            </div>

            {/* Score rings */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
              <ScoreRing score={feedback.technical_accuracy} label="Technical" size={70} />
              <ScoreRing score={feedback.communication_score} label="Communication" size={70} />
              <ScoreRing score={feedback.confidence_score} label="Confidence" size={70} />
              <ScoreRing score={feedback.completeness_score} label="Completeness" size={70} />
              <ScoreRing score={feedback.problem_solving_score} label="Problem Solving" size={70} />
              <ScoreRing score={feedback.grammar_score} label="Grammar" size={70} />
            </div>

            {feedback.strengths?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-green-400 font-medium mb-1">✓ Strengths</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {feedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {feedback.weaknesses?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠ Areas to improve</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {feedback.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}

            {feedback.suggestions?.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-sky-400 font-medium mb-1">💡 Suggestions</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {feedback.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            <button onClick={goNext} className="btn-primary flex items-center gap-2">
              {isLast ? (
                <><CheckCircle className="w-4 h-4" /> Finish Interview</>
              ) : (
                <><SkipForward className="w-4 h-4" /> Next Question</>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
