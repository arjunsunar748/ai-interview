import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, userAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      userAPI.getMe()
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)
    toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)
    return data.user
  }

  const register = async (fullName, email, password) => {
    const { data } = await authAPI.register({ full_name: fullName, email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)
    toast.success('Account created successfully!')
    return data.user
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    toast.success('Logged out')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
