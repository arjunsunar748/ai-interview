import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy, Target, TrendingUp, Clock,
  ChevronRight, Play, Star, Zap
} from 'lucide-react'
import { analyticsAPI, interviewAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import ScoreRing from '../../components/common/ScoreRing'
import Layout from '../../components/common/Layout'

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass p-5 rounded-2xl flex items-center gap-4"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </motion.div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard(),
      interviewAPI.getSessions({ limit: 5 }),
    ])
      .then(([dashRes, sessionRes]) => {
        setStats(dashRes.data.stats)
        setSessions(sessionRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const scoreColor = (s) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 60) return 'text-sky-400'
    if (s >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  const statusBadge = (status) => {
    const map = {
      completed: 'bg-green-500/20 text-green-400',
      in_progress: 'bg-sky-500/20 text-sky-400',
      abandoned: 'bg-red-500/20 text-red-400',
      pending: 'bg-slate-500/20 text-slate-400',
    }
    return map[status] || map.pending
  }

  return (
    <Layout>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white">
          Hey, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">Ready to ace your next interview?</p>
      </motion.div>

      {/* Quick Start CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 rounded-2xl mb-8 bg-gradient-to-r from-sky-500/10 to-blue-600/10 border border-sky-500/20"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-sky-400" />
              Start a Mock Interview
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Choose a category and difficulty to begin
            </p>
          </div>
          <button
            onClick={() => navigate('/interview')}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Now
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass p-5 rounded-2xl animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Target} label="Total Sessions" value={stats?.total_sessions ?? 0}
            color="bg-sky-500/20 text-sky-400" delay={0.1} />
          <StatCard icon={Trophy} label="Avg Score" value={`${stats?.average_score ?? 0}%`}
            color="bg-amber-500/20 text-amber-400" delay={0.15} />
          <StatCard icon={Star} label="Best Score" value={`${stats?.best_score ?? 0}%`}
            color="bg-green-500/20 text-green-400" delay={0.2} />
          <StatCard icon={TrendingUp} label="Improvement" value={`${stats?.improvement_percentage ?? 0}%`}
            color="bg-violet-500/20 text-violet-400" delay={0.25} />
        </div>
      )}

      {/* Two column: recent sessions + score breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white">Recent Interviews</h3>
            <button
              onClick={() => navigate('/analytics')}
              className="text-sky-400 text-sm hover:text-sky-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No interviews yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/interview/result/${s.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-[180px]">{s.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(s.status)}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Performance Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass p-6 rounded-2xl"
        >
          <h3 className="font-semibold text-white mb-5">Performance Snapshot</h3>
          {stats ? (
            <div className="grid grid-cols-3 gap-4">
              <ScoreRing score={stats.average_score} label="Overall" />
              <div className="flex flex-col gap-2 col-span-2">
                <p className="text-xs text-slate-400">
                  Strongest: <span className="text-green-400 font-medium">{stats.strongest_category || '—'}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Needs work: <span className="text-amber-400 font-medium">{stats.weakest_category || '—'}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Questions answered: <span className="text-white font-medium">{stats.total_questions_answered}</span>
                </p>
                <button
                  onClick={() => navigate('/analytics')}
                  className="btn-secondary text-sm py-2 mt-2"
                >
                  Full Analytics
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-28 text-slate-500 text-sm">
              Complete interviews to see stats
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}
