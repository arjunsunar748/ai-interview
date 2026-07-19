import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, AlertTriangle,
  Clock, CheckCircle, SkipForward, Eye
} from 'lucide-react'
import { interviewAPI } from '../../services/api'
import { useWebcam } from '../../hooks/useWebcam'
import { useCheatingDetection } from '../../hooks/useCheatingDetection'
import { useVideoRecorder } from '../../hooks/useVideoRecorder'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import ScoreRing from '../../components/common/ScoreRing'
import aiAvatar from '../../assets/ai-avatar.svg'
import toast from 'react-hot-toast'

export default function LiveInterview() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // State
  const [sessionData, setSessionData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [cheatLog, setCheatLog] = useState([])
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraPreview, setCameraPreview] = useState(false)

  const recordingStarted = useRef(false)

  // Hooks
  const { 
    stream, error: webcamError, permission, 
    startWebcam, stopWebcam, videoRef 
  } = useWebcam()

  const {
    recording: isVoiceRecording, audioBlob, duration: voiceDuration,
    error: voiceError, start: startVoice, stop: stopVoice, reset: resetVoice
  } = useVoiceRecorder()

  const { 
    warnings, violationCount, faceDetected, multipleFaces, 
    isLookingAway, faceApiLoaded, isMouthMoving, cocoLoaded, addWarning 
  } = useCheatingDetection(videoRef, interviewStarted, isVoiceRecording)

  const {
    isRecording, startRecording, stopRecording, recordedBlob,
    duration: recordDuration, downloadRecording
  } = useVideoRecorder(videoRef, interviewStarted)

  // Load session
  useEffect(() => {
    interviewAPI.getSession(sessionId)
      .then(({ data }) => {
        setSessionData(data.session)
        const mapped = data.questions.map(q => ({
          ...q,
          text: q.text || q.question_text
        }))
        setQuestions(mapped)
        // Set time limit: 3 minutes per question
        setTimeLeft(mapped.length * 180)
      })
      .catch(() => toast.error('Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

  // Timer
  useEffect(() => {
    if (!interviewStarted) return
    const timer = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [interviewStarted])

  // Track cheating warnings
  useEffect(() => {
    if (warnings.length > 0 && interviewStarted) {
      setCheatLog(warnings)
      if (warnings.length > 3) {
        setShowCheatWarning(true)
      }
    }
  }, [warnings, interviewStarted])

  // Start recording once video element is mounted with stream
  useEffect(() => {
    if (!interviewStarted || !stream || recordingStarted.current) return

    const tryStartRecording = () => {
      if (!videoRef.current || recordingStarted.current) return
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      if (videoRef.current.srcObject) {
        recordingStarted.current = true
        startRecording()
      }
    }

    tryStartRecording()
    const timer = setTimeout(tryStartRecording, 150)
    return () => clearTimeout(timer)
  }, [interviewStarted, stream, startRecording])

  const currentQ = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0

  const handleStart = async () => {
    if (!stream) {
      const mediaStream = await startWebcam()
      if (!mediaStream) return
    }
    setInterviewStarted(true)
    speakQuestion(currentQ?.text)
  }

  const handleEnableCamera = async () => {
    const mediaStream = await startWebcam()
    if (mediaStream) {
      setCameraPreview(true)
    }
  }

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

  // Submit answer
  const submitAnswer = async () => {
    if (!audioBlob) {
      toast.error('Please record your answer first')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await interviewAPI.submitAudioAnswer(sessionId, currentQ.id, audioBlob)
      setFeedback(data.feedback)
      setAnswered(true)
      stopVoice()

      // Inject follow-up question if returned
      if (data.follow_up_question) {
        const followUp = {
          id: data.follow_up_question.id,
          text: data.follow_up_question.text,
          order: data.follow_up_question.order,
          difficulty: currentQ.difficulty
        }
        const updatedQuestions = [...questions]
        updatedQuestions.splice(currentIdx + 1, 0, followUp)
        for (let i = currentIdx + 2; i < updatedQuestions.length; i++) {
          updatedQuestions[i].order = updatedQuestions[i].order + 1
        }
        setQuestions(updatedQuestions)
      }
    } catch {
      toast.error('Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  // Next question
  const goNext = () => {
    if (isLast) {
      handleComplete()
    } else {
      setFeedback(null)
      setAnswered(false)
      resetVoice()
      setCurrentIdx((i) => i + 1)
      // Speak next question
      speakQuestion(questions[currentIdx + 1]?.text)
    }
  }

  // Complete interview
  const handleComplete = async () => {
    stopRecording()
    stopWebcam()
    try {
      await interviewAPI.completeSession(sessionId)
      navigate(`/interview/result/${sessionId}`, { 
        state: { cheatLog, recordedBlob } 
      })
    } catch {
      navigate(`/interview/result/${sessionId}`)
    }
  }

  // Format time
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Warning badge
  const WarningBadge = () => {
    if (violationCount === 0) return null
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
      >
        <AlertTriangle className="w-4 h-4" />
        {violationCount} Warning{violationCount > 1 ? 's' : ''}
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Pre-interview screen
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">AI Video Interview</h1>
          <p className="text-slate-400 mb-6">
            {sessionData?.title || 'Your interview is about to begin'}
          </p>

          <div className="glass p-4 rounded-xl text-left mb-6">
            <h3 className="text-white font-medium mb-3">Before you start:</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Ensure your camera and microphone are working
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Find a quiet, well-lit environment
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Stay in frame and look at the camera
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                Tab switching and looking away will be detected
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-400 mb-6">
            <div className="flex justify-between">
              <span>Questions:</span>
              <span className="text-white">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated time:</span>
              <span className="text-white">{Math.ceil(questions.length * 3)} minutes</span>
            </div>
          </div>

          {webcamError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">
              {webcamError}
            </div>
          )}

          {/* Camera preview before starting */}
          <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 mb-4 border border-white/10">
            {cameraPreview && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <VideoOff className="w-10 h-10 text-slate-600" />
                <p className="text-slate-500 text-sm">Camera preview will appear here</p>
              </div>
            )}
            {cameraPreview && stream && (
              <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Camera On
              </div>
            )}
          </div>

          {!cameraPreview && (
            <button
              onClick={handleEnableCamera}
              className="btn-secondary w-full flex items-center justify-center gap-2 mb-3"
            >
              <Video className="w-5 h-5" />
              Enable Camera
            </button>
          )}

          <button
            onClick={handleStart}
            disabled={!cameraPreview}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-5 h-5" />
            Start Interview
          </button>
        </motion.div>
      </div>
    )
  }

  // Interview in progress
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-4">
            <span>{sessionData?.title}</span>
            <span className={`flex items-center gap-1 ${isRecording ? 'text-red-400' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
              {isRecording ? 'Recording' : 'Not Recording'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(elapsed)}
            </span>
            <span>Q{currentIdx + 1}/{questions.length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main video area - AI Avatar + Question */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Video container - AI Avatar main, user webcam PiP */}
          <div className="relative glass rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
            {/* AI Interviewer - main view */}
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900">
              <motion.div
                animate={isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: isSpeaking ? Infinity : 0 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-2xl scale-125" />
                <img
                  src={aiAvatar}
                  alt="AI Interviewer"
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain relative z-10 drop-shadow-2xl"
                />
              </motion.div>
              <p className="text-white font-semibold mt-4 text-lg">Jarvis AI</p>
              <p className="text-sky-400 text-sm">Your AI Interviewer</p>
              {isSpeaking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 mt-3"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 bg-sky-400 rounded-full"
                      animate={{ height: [8, 20, 8] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                  <span className="text-sky-400 text-xs ml-2">Speaking...</span>
                </motion.div>
              )}
            </div>

            {/* User webcam - picture-in-picture */}
            <div className="absolute bottom-4 right-4 w-44 h-32 sm:w-52 sm:h-36 rounded-xl overflow-hidden border-2 border-sky-500/60 shadow-2xl bg-slate-900">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-slate-600" />
                </div>
              )}
              {stream && (
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  You
                </div>
              )}
            </div>

            {/* Face detection warning on user PiP */}
            {!faceDetected && interviewStarted && stream && (
              <div className="absolute bottom-4 right-4 w-44 h-32 sm:w-52 sm:h-36 rounded-xl border-2 border-red-500 pointer-events-none flex items-center justify-center bg-red-500/20">
                <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  No Face
                </div>
              </div>
            )}

            <WarningBadge />
          </div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass p-6 rounded-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-sky-500/20 text-sky-400 text-xs px-2 py-1 rounded font-medium">
                  Question {currentIdx + 1}
                </span>
                {currentQ?.difficulty && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    currentQ.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    currentQ.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {currentQ.difficulty}
                  </span>
                )}
              </div>
              <p className="text-white text-lg font-medium leading-relaxed">
                {currentQ?.text}
              </p>
              <button
                onClick={() => speakQuestion(currentQ?.text)}
                className="mt-3 text-sky-400 text-sm hover:text-sky-300 flex items-center gap-1"
              >
                <Mic className="w-4 h-4" /> Read question aloud
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Answer controls */}
          {!answered ? (
            <div className="glass p-6 rounded-2xl">
              <div className="flex flex-col items-center gap-4">
                {/* Recording indicator */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => isVoiceRecording ? stopVoice() : startVoice()}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isVoiceRecording
                      ? 'bg-red-500 ring-4 ring-red-500/40'
                      : 'bg-sky-500/20 hover:bg-sky-500/30'
                  }`}
                >
                  {isVoiceRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-sky-400" />
                  )}
                </motion.button>

                {isVoiceRecording && (
                  <p className="text-red-400 font-medium">
                    Recording... {voiceDuration}s
                  </p>
                )}

                {audioBlob && !isVoiceRecording && (
                  <div className="flex items-center gap-3">
                    <audio controls src={URL.createObjectURL(audioBlob)} className="h-10" />
                    <button onClick={resetVoice} className="text-slate-400 hover:text-white text-sm">
                      Re-record
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  {audioBlob && (
                    <button
                      onClick={submitAnswer}
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2"
                    >
                      {submitting ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Submit Answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Feedback */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 rounded-2xl border border-sky-500/20"
            >
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">AI Feedback</h3>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
                <ScoreRing score={feedback?.technical_accuracy || 0} label="Technical" size={60} />
                <ScoreRing score={feedback?.communication_score || 0} label="Comm" size={60} />
                <ScoreRing score={feedback?.confidence_score || 0} label="Confidence" size={60} />
                <ScoreRing score={feedback?.completeness_score || 0} label="Complete" size={60} />
                <ScoreRing score={feedback?.problem_solving_score || 0} label="Problem" size={60} />
                <ScoreRing score={feedback?.grammar_score || 0} label="Grammar" size={60} />
              </div>

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

        {/* Sidebar - Status */}
        <div className="flex flex-col gap-4">
          {/* Proctoring Status */}
          <div className="glass p-4 rounded-2xl">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              Proctoring Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Face Detected</span>
                <span className={faceDetected ? 'text-green-400' : 'text-red-400'}>
                  {faceDetected ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Looking at Screen</span>
                <span className={!isLookingAway ? 'text-green-400' : 'text-amber-400'}>
                  {!isLookingAway ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Single Person</span>
                <span className={!multipleFaces ? 'text-green-400' : 'text-red-400'}>
                  {!multipleFaces ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Tab Switches</span>
                <span className={violationCount === 0 ? 'text-green-400' : 'text-red-400'}>
                  {violationCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Lip Movement</span>
                <span className={isMouthMoving ? 'text-green-400' : 'text-slate-500'}>
                  {isMouthMoving ? 'Speaking' : 'Silent'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Mobile Detector</span>
                <span className={cocoLoaded ? 'text-green-400' : 'text-amber-400'}>
                  {cocoLoaded ? 'Active' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {cheatLog.length > 0 && (
            <div className="glass p-4 rounded-2xl border border-amber-500/20">
              <h3 className="font-medium text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({cheatLog.length})
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {cheatLog.slice(-5).map((w, i) => (
                  <p key={i} className="text-xs text-slate-400">
                    • {w.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Interview info */}
          <div className="glass p-4 rounded-2xl">
            <h3 className="font-medium text-white mb-3">Session Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Time Elapsed</span>
                <span className="text-white">{formatTime(elapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Progress</span>
                <span className="text-white">{currentIdx + 1}/{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recording</span>
                <span className={isRecording ? 'text-red-400' : 'text-slate-500'}>
                  {isRecording ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Emergency stop */}
          <button
            onClick={handleComplete}
            className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium"
          >
            End Interview Early
          </button>
        </div>
      </div>
    </div>
  )
}
