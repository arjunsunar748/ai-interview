import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, BookOpen, Code, Brain, Users, Save, X } from 'lucide-react'
import { adminAPI, categoryAPI } from '../../services/api'
import Layout from '../../components/common/Layout'
import toast from 'react-hot-toast'

const TYPES = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'situational', label: 'Situational' },
  { value: 'coding', label: 'Coding' },
]

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { value: 'hard', label: 'Hard', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
]

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [form, setForm] = useState({
    category_id: '',
    question_text: '',
    question_type: 'technical',
    difficulty: 'medium',
    expected_answer: '',
    keywords: '',
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      adminAPI.getQuestions({ limit: 100 }),
      categoryAPI.list(),
    ])
      .then(([qRes, cRes]) => {
        setQuestions(qRes.data)
        setCategories(cRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category_id || !form.question_text.trim()) {
      toast.error('Category and question text are required')
      return
    }
    setSaving(true)
    try {
      await adminAPI.createQuestion({
        category_id: form.category_id,
        question_text: form.question_text,
        question_type: form.question_type,
        difficulty: form.difficulty,
        expected_answer: form.expected_answer || null,
        keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : null,
      })
      toast.success('Question added!')
      setForm({
        category_id: form.category_id,
        question_text: '',
        question_type: 'technical',
        difficulty: 'medium',
        expected_answer: '',
        keywords: '',
      })
      load()
    } catch {
      toast.error('Failed to add question')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return
    try {
      await adminAPI.deleteQuestion(id)
      toast.success('Question deleted')
      setQuestions(questions.filter(q => q.id !== id))
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = filterCat
    ? questions.filter(q => q.category_id === filterCat)
    : questions

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat?.name || 'Unknown'
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Questions</h1>
            <p className="text-slate-400 text-sm">Add or remove interview questions</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Question'}
          </button>
        </div>

        {/* Add Question Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass p-6 rounded-2xl mb-6"
          >
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Question
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div className="lg:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Question *</label>
                <textarea
                  rows={3}
                  placeholder="Enter the interview question..."
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  className="input-field resize-none"
                  required
                />
              </div>

              {/* Type & Difficulty */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select
                  value={form.question_type}
                  onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                  className="input-field"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="input-field"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Expected Answer */}
              <div className="lg:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Expected Answer (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key points or brief expected answer..."
                  value={form.expected_answer}
                  onChange={(e) => setForm({ ...form, expected_answer: e.target.value })}
                  className="input-field resize-none"
                />
              </div>

              {/* Keywords */}
              <div className="lg:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Keywords (comma-separated, optional)</label>
                <input
                  type="text"
                  placeholder="react, hooks, state management"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Submit */}
              <div className="lg:col-span-2 flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Save className="w-4 h-4" />}
                  Save Question
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-400">Filter:</span>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="input-field w-auto py-2"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500">{filtered.length} questions</span>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="glass p-12 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No questions found</p>
            <p className="text-slate-500 text-sm">Click "Add Question" to create one</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((q) => {
              const diff = DIFFICULTIES.find(d => d.value === q.difficulty) || DIFFICULTIES[1]
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass p-4 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {getCategoryName(q.category_id)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${diff.color}`}>
                        {diff.label}
                      </span>
                      <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded capitalize">
                        {q.question_type}
                      </span>
                      {q.is_ai_generated && (
                        <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm">{q.question_text}</p>
                    {q.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.keywords.slice(0, 5).map((k, i) => (
                          <span key={i} className="text-xs bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </Layout>
  )
}
