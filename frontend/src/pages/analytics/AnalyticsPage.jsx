import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, RadialLinearScale, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Radar } from 'react-chartjs-2'
import { analyticsAPI } from '../../services/api'
import Layout from '../../components/common/Layout'
import ScoreRing from '../../components/common/ScoreRing'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler
)

const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: '#94a3b8' } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 },
  },
}

const radarOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    r: {
      min: 0, max: 100,
      ticks: { color: '#64748b', backdropColor: 'transparent' },
      grid: { color: 'rgba(255,255,255,0.1)' },
      pointLabels: { color: '#94a3b8', font: { size: 11 } },
    },
  },
}

export default function AnalyticsPage() {
  const [weekly, setWeekly] = useState([])
  const [categories, setCategories] = useState([])
  const [skillGaps, setSkillGaps] = useState([])
  const [breakdown, setBreakdown] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.getWeeklyProgress(),
      analyticsAPI.getCategoryPerformance(),
      analyticsAPI.getSkillGaps(),
      analyticsAPI.getDashboard(),
    ])
      .then(([w, c, s, d]) => {
        setWeekly(w.data)
        setCategories(c.data)
        setSkillGaps(s.data)
        setBreakdown(d.data.score_breakdown || {})
      })
      .finally(() => setLoading(false))
  }, [])

  // Weekly line chart data
  const lineData = {
    labels: weekly.map((w) => w.week),
    datasets: [{
      label: 'Average Score',
      data: weekly.map((w) => w.avg_score),
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14,165,233,0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#0ea5e9',
    }],
  }

  // Category bar chart data
  const barData = {
    labels: categories.map((c) => c.category),
    datasets: [{
      label: 'Avg Score',
      data: categories.map((c) => c.avg_score),
      backgroundColor: categories.map((_, i) =>
        ['#0ea5e9','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316'][i % 9]
      ),
      borderRadius: 8,
    }],
  }

  // Radar chart data
  const radarLabels = Object.keys(breakdown)
  const radarData = {
    labels: radarLabels,
    datasets: [{
      label: 'Your Scores',
      data: radarLabels.map((k) => breakdown[k]),
      backgroundColor: 'rgba(14,165,233,0.15)',
      borderColor: '#0ea5e9',
      pointBackgroundColor: '#0ea5e9',
      borderWidth: 2,
    }],
  }

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-slate-400 mb-8">Track your interview performance over time</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress */}
          <div className="glass p-6 rounded-2xl lg:col-span-2">
            <h3 className="font-semibold text-white mb-4">Weekly Progress</h3>
            {weekly.length > 0 ? (
              <Line data={lineData} options={chartOptions} />
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Complete interviews to see weekly progress</p>
            )}
          </div>

          {/* Category Performance */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Category Performance</h3>
            {categories.length > 0 ? (
              <Bar data={barData} options={{ ...chartOptions, indexAxis: 'y' }} />
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No category data yet</p>
            )}
          </div>

          {/* Radar — score breakdown */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Score Breakdown</h3>
            {radarLabels.length > 0 ? (
              <Radar data={radarData} options={radarOptions} />
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No score data yet</p>
            )}
          </div>

          {/* Skill Gaps */}
          <div className="glass p-6 rounded-2xl lg:col-span-2">
            <h3 className="font-semibold text-white mb-4">Skill Gap Analysis</h3>
            {skillGaps.length > 0 ? (
              <div className="flex flex-col gap-3">
                {skillGaps.map((gap, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-300">{gap.skill}</span>
                      <span className="text-slate-400">{gap.current_score}% / {gap.target_score}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${gap.current_score}%` }}
                        transition={{ delay: i * 0.1, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No skill gap data yet. Complete more interviews.</p>
            )}
          </div>
        </div>
      </motion.div>
    </Layout>
  )
}
