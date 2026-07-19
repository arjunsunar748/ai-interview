import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LogOut, User, BrainCircuit } from 'lucide-react'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <BrainCircuit className="w-7 h-7 text-sky-400" />
          <span className="font-bold text-lg gradient-text">AI Interview</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">{user?.full_name?.split(' ')[0]}</span>
          </div>

          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Logout">
            <LogOut className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </nav>
  )
}
