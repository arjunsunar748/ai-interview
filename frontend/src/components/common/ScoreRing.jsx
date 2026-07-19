import { motion } from 'framer-motion'

export default function ScoreRing({ score = 0, size = 80, label = '', color = '#0ea5e9' }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = (score / 100) * circumference

  const getColor = (s) => {
    if (s >= 80) return '#22c55e'
    if (s >= 60) return '#0ea5e9'
    if (s >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const ringColor = getColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={6}
          />
          {/* Score ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - strokeDash }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color: ringColor }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-400 text-center">{label}</span>}
    </div>
  )
}
