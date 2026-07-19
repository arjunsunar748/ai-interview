import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, FileText, Mic, BarChart2,
  Shield, BookOpen
} from 'lucide-react'

const userNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interview', icon: Mic, label: 'Interview' },
  { to: '/resume', icon: FileText, label: 'Resume' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
]

const adminNavItems = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
  { to: '/admin/questions', icon: BookOpen, label: 'Questions' },
]

export default function Sidebar() {
  const { isAdmin } = useAuth()
  const navItems = isAdmin ? adminNavItems : userNavItems

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 glass border-r border-white/10 flex flex-col p-4 z-40">
      {isAdmin && (
        <p className="text-xs text-violet-400 uppercase tracking-wide mb-3 px-4 font-semibold">
          Administration
        </p>
      )}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
