import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Activity, BarChart2, Trash2, Shield } from 'lucide-react'
import { adminAPI } from '../../services/api'
import Layout from '../../components/common/Layout'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getUsers({ limit: 50 }),
      adminAPI.getSessions({ limit: 20 }),
    ])
      .then(([s, u, sess]) => {
        setStats(s.data)
        setUsers(u.data)
        setSessions(sess.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleDeactivate = async (userId, email) => {
    if (!confirm(`Deactivate user ${email}?`)) return
    await adminAPI.deactivateUser(userId)
    toast.success('User deactivated')
    loadData()
  }

  const TABS = ['overview', 'users', 'sessions']

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Admin Header */}
          <div className="flex items-center gap-4 mb-8 p-6 glass rounded-2xl border-2 border-violet-500/30">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
              <p className="text-slate-400">System Overview & Management</p>
            </div>
          </div>

        {/* Tabs */}
        <div className="flex gap-2 glass p-1.5 rounded-xl w-fit mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                tab === t 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass p-12 flex items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {tab === 'overview' && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-sky-400 bg-sky-500/20' },
                  { label: 'Total Sessions', value: stats.total_sessions, icon: Activity, color: 'text-green-400 bg-green-500/20' },
                  { label: 'Platform Avg Score', value: `${stats.platform_avg_score}%`, icon: BarChart2, color: 'text-amber-400 bg-amber-500/20' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass p-5 rounded-2xl flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">{s.label}</p>
                      <p className="text-2xl font-bold text-white">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Users Tab */}
            {tab === 'users' && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Users ({users.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Email</th>
                        <th className="text-left p-4">Role</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm text-white">{u.full_name}</td>
                          <td className="p-4 text-sm text-slate-400">{u.email}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              u.role === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4">
                            {u.role !== 'admin' && u.is_active && (
                              <button
                                onClick={() => handleDeactivate(u.id, u.email)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {tab === 'sessions' && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Recent Sessions ({sessions.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                        <th className="text-left p-4">Title</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">Difficulty</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Questions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm text-white max-w-[200px] truncate">{s.title || '—'}</td>
                          <td className="p-4 text-sm text-slate-400 capitalize">{s.interview_type}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              s.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                              s.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {s.difficulty}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              s.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              s.status === 'in_progress' ? 'bg-sky-500/20 text-sky-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {s.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-400">
                            {s.completed_questions}/{s.total_questions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
      </div>
    </Layout>
  )
}
