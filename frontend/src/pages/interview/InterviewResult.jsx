import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, RefreshCw, BarChart2, ChevronRight } from 'lucide-react'
import { interviewAPI } from '../../services/api'
import ScoreRing from '../../components/common/ScoreRing'
import Layout from '../../components/common/Layout'

export default function InterviewResult() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interviewAPI.getPerformance(sessionId)
      .then(({ data }) => setPerformance(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const scoreColor = (s) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 60) return 'text-sky-400'
    if (s >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Interview Complete!</h1>
            <p className="text-slate-400">Here's how you performed</p>
          </div>
        </div>

        {performance ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall score */}
            <div className="glass p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
              <ScoreRing score={performance.overall_score} size={120} label="Overall Score" />
              <p className={`text-3xl font-bold ${scoreColor(performance.overall_score)}`}>
                {Math.round(performance.overall_score)}%
              </p>
            </div>

            {/* Score breakdown */}
            <div className="glass p-6 rounded-2xl">
              <h3 className="font-semibold text-white mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-3 gap-3">
                <ScoreRing score={performance.avg_technical} label="Technical" size={65} />
                <ScoreRing score={performance.avg_communication} label="Communication" size={65} />
                <ScoreRing score={performance.avg_confidence} label="Confidence" size={65} />
                <ScoreRing score={performance.avg_completeness} label="Completeness" size={65} />
                <ScoreRing score={performance.avg_problem_solving} label="Problem Solving" size={65} />
                <ScoreRing score={performance.avg_grammar} label="Grammar" size={65} />
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="glass p-6 rounded-2xl flex flex-col gap-4">
              {performance.total_strengths?.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 font-semibold uppercase mb-2">✓ Strengths</p>
                  <ul className="space-y-1">
                    {performance.total_strengths.slice(0, 4).map((s, i) => (
                      <li key={i} className="text-sm text-slate-300">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {performance.total_weaknesses?.length > 0 && (
                <div>
                  <p className="text-xs text-amber-400 font-semibold uppercase mb-2">⚠ Weaknesses</p>
                  <ul className="space-y-1">
                    {performance.total_weaknesses.slice(0, 4).map((w, i) => (
                      <li key={i} className="text-sm text-slate-300">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommended Resources */}
            {performance.recommended_resources?.resources?.length > 0 && (
              <div className="glass p-6 rounded-2xl lg:col-span-2">
                <h3 className="font-semibold text-white mb-4">📚 Recommended Resources</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {performance.recommended_resources.resources.slice(0, 4).map((r, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3">
                      <p className="text-sm font-medium text-white">{r.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                      <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full mt-2 inline-block">
                        {r.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Gaps */}
            {performance.skill_gaps?.length > 0 && (
              <div className="glass p-6 rounded-2xl">
                <h3 className="font-semibold text-white mb-4">🔍 Skill Gaps</h3>
                <div className="flex flex-wrap gap-2">
                  {performance.skill_gaps.map((s, i) => (
                    <span key={i} className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="lg:col-span-3 flex flex-wrap gap-3">
              <button onClick={() => navigate('/interview')} className="btn-primary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Practice Again
              </button>
              <button onClick={() => navigate('/analytics')} className="btn-secondary flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> View Analytics
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn-secondary flex items-center gap-2">
                Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass p-12 rounded-2xl text-center">
            <p className="text-slate-400">Performance report not available yet.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
              Back to Dashboard
            </button>
          </div>
        )}
      </motion.div>
    </Layout>
  )
}
