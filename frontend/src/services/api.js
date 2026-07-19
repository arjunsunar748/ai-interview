import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor: attach JWT ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response Interceptor: handle 401, refresh token ──────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          localStorage.setItem('access_token', data.access_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    const message = error.response?.data?.detail || 'Something went wrong'
    if (error.response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

// ── Users ─────────────────────────────────────────────────────────────
export const userAPI = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.post('/users/me/change-password', data),
}

// ── Resume ────────────────────────────────────────────────────────────
export const resumeAPI = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get('/resume/'),
  get: (id) => api.get(`/resume/${id}`),
  setPrimary: (id) => api.post(`/resume/${id}/set-primary`),
  delete: (id) => api.delete(`/resume/${id}`),
}

// ── Categories ────────────────────────────────────────────────────────
export const categoryAPI = {
  list: () => api.get('/categories/'),
}

// ── Interview ─────────────────────────────────────────────────────────
export const interviewAPI = {
  start: (data) => api.post('/interview/start', data),
  getSessions: (params) => api.get('/interview/sessions', { params }),
  getSession: (id) => api.get(`/interview/sessions/${id}`),
  submitTextAnswer: (sessionId, data) =>
    api.post(`/interview/answer/text?session_id=${sessionId}`, data),
  submitAudioAnswer: (sessionId, sqId, audioBlob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'answer.webm')
    return api.post(
      `/interview/answer/audio?session_id=${sessionId}&session_question_id=${sqId}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  completeSession: (id) => api.post(`/interview/sessions/${id}/complete`),
  getPerformance: (id) => api.get(`/interview/sessions/${id}/performance`),
}

// ── Analytics ─────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getWeeklyProgress: (weeks = 8) => api.get('/analytics/weekly-progress', { params: { weeks } }),
  getCategoryPerformance: () => api.get('/analytics/category-performance'),
  getSkillGaps: () => api.get('/analytics/skill-gaps'),
}

// ── Admin ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  getSessions: (params) => api.get('/admin/sessions', { params }),
  getQuestions: (params) => api.get('/admin/questions', { params }),
  createQuestion: (data) => api.post('/admin/questions', data),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`),
}

export default api
