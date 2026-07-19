import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminRoute, UserRoute } from './components/common/ProtectedRoute'

// Lazy-loaded pages
const Login            = lazy(() => import('./pages/auth/Login'))
const Register         = lazy(() => import('./pages/auth/Register'))
const Dashboard        = lazy(() => import('./pages/dashboard/Dashboard'))
const InterviewSetup   = lazy(() => import('./pages/interview/InterviewSetup'))
const InterviewSession = lazy(() => import('./pages/interview/InterviewSession'))
const InterviewResult  = lazy(() => import('./pages/interview/InterviewResult'))
const LiveInterview    = lazy(() => import('./pages/interview/LiveInterview'))
const ResumePage       = lazy(() => import('./pages/resume/ResumePage'))
const AnalyticsPage    = lazy(() => import('./pages/analytics/AnalyticsPage'))
const AdminDashboard   = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminQuestions   = lazy(() => import('./pages/admin/AdminQuestions'))

const Loader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
  </div>
)

function RootRedirect() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<RootRedirect />} />

            {/* User only */}
            <Route path="/dashboard" element={<UserRoute><Dashboard /></UserRoute>} />
            <Route path="/interview" element={<UserRoute><InterviewSetup /></UserRoute>} />
            <Route path="/interview/session/:sessionId" element={<UserRoute><InterviewSession /></UserRoute>} />
            <Route path="/interview/live/:sessionId" element={<UserRoute><LiveInterview /></UserRoute>} />
            <Route path="/interview/result/:sessionId"  element={<UserRoute><InterviewResult /></UserRoute>} />
            <Route path="/resume"    element={<UserRoute><ResumePage /></UserRoute>} />
            <Route path="/analytics" element={<UserRoute><AnalyticsPage /></UserRoute>} />

            {/* Admin only */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/questions" element={<AdminRoute><AdminQuestions /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
