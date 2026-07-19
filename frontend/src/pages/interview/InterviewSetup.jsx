import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Code, Brain, Users, BookOpen, ChevronRight } from 'lucide-react'
import { categoryAPI, resumeAPI } from '../../services/api'
import { useInterview } from '../../hooks/useInterview'
import Layout from '../../components/common/Layout'
import toast from 'react-hot-toast'

const ICONS = {
  code: Code, brain: Brain, users: Users,
  'chart-bar': Brain, cpu: Brain, layers: Code,
  terminal: Code, coffee: Code, heart: Users,
}

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'border-green-500/40 text-green-400', bg: 'bg-green-500/10' },
  { value: 'medium', label: 'Medium', color: 'border-amber-500/40 text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'hard', label: 'Hard', color: 'border-red-500/40 text-red-400', bg: 'bg-red-500/10' },
]

const TYPES = [
  { value: 'technical', label: 'Technical', desc: 'Coding, CS fundamentals' },
  { value: 'hr', label: 'HR', desc: 'Culture fit, experience' },
  { value: 'mixed', label: 'Mixed', desc: 'Both technical & HR' },
]

export default function InterviewSetup() {
  const navigate = useNavigate()
  const { startSession, loading } = useInterview()
  const [categories, setCategories] = useState([])
  const [resumes, setResumes] = useState([])
  const [config, setConfig] = useState({
    category_id: '',
    difficulty: 'medium',
    interview_type: 'technical',
    num_questions: 5,
    resume_id: null,
  })

  useEffect(() => {
    categoryAPI.list().then(({ data }) => setCategories(data))
    resumeAPI.list().then(({ data }) => setResumes(data)).catch(() => {})
  }, [])

  const handleStart = async (liveMode = false) => {
    if (!config.category_id) {
      toast.error('Please select a category')
      return
    }
    try {
      const result = await startSession({
        ...config,
        resume_id: config.resume_id || undefined,
      })
      if (liveMode) {
        navigate(`/interview/live/${result.session_id}`)
      } else {
        navigate(`/interview/session/${result.session_id}`)
      }
    } catch {}
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">New Interview</h1>
        <p className="text-slate-400 mb-8">Configure your mock interview session</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main config */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Category */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="font-semibold text-white mb-4">Select Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = ICONS[cat.icon] || Code
                  const active = config.category_id === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setConfig({ ...config, category_id: cat.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2" />
                      <p className="text-xs font-medium leading-tight">{cat.name}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="font-semibold text-white mb-4">Difficulty</h2>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setConfig({ ...config, difficulty: d.value })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      config.difficulty === d.value
                        ? `${d.bg} ${d.color} border-current`
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <p className="font-medium text-sm">{d.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="font-semibold text-white mb-4">Interview Type</h2>
              <div className="grid grid-cols-3 gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setConfig({ ...config, interview_type: t.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.interview_type === t.value
                        ? 'border-sky-500/60 bg-sky-500/15'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{t.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar options */}
          <div className="flex flex-col gap-6">
            {/* Questions count */}
            <div className="glass p-6 rounded-2xl">
              <h2 className="font-semibold text-white mb-4">Questions</h2>
              <input
                type="range"
                min={3}
                max={15}
                value={config.num_questions}
                onChange={(e) => setConfig({ ...config, num_questions: +e.target.value })}
                className="w-full accent-sky-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>3</span>
                <span className="text-sky-400 font-bold text-sm">{config.num_questions}</span>
                <span>15</span>
              </div>
            </div>

            {/* Resume */}
            {resumes.length > 0 && (
              <div className="glass p-6 rounded-2xl">
                <h2 className="font-semibold text-white mb-4">Resume (optional)</h2>
                <select
                  value={config.resume_id || ''}
                  onChange={(e) => setConfig({ ...config, resume_id: e.target.value || null })}
                  className="input-field"
                >
                  <option value="">No resume</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.file_name} {r.is_primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Questions will be tailored to your skills
                </p>
              </div>
            )}

            {/* Interview Mode Selection */}
            <div className="glass p-5 rounded-2xl">
              <h2 className="font-semibold text-white mb-3 text-sm">Interview Mode</h2>
              <div className="flex flex-col gap-3">
                {/* Live AI Interview */}
                <button
                  onClick={() => handleStart(true)}
                  disabled={loading || !config.category_id}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base group relative overflow-hidden"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                      <span className="relative z-10">Live AI Interview</span>
                      <span className="text-xs bg-violet-500/30 px-2 py-0.5 rounded-full relative z-10">Recommended</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 -mt-2 px-1">
                  ✓ Video monitoring • Face detection • Cheating prevention
                </p>

                {/* Text-based Interview */}
                <button
                  onClick={() => handleStart(false)}
                  disabled={loading || !config.category_id}
                  className="btn-secondary w-full flex items-center justify-center gap-2 py-3 text-sm"
                >
                  <Mic className="w-4 h-4" />
                  Text/Audio Only
                </button>
                <p className="text-xs text-slate-500 -mt-2 px-1">
                  Basic interview without video monitoring
                </p>
              </div>
            </div>
            {loading && (
              <p className="text-center text-xs text-slate-500">
                AI is generating your questions...
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Layout>
  )
}
