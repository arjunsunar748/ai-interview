import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Trash2, Star, CheckCircle, Briefcase, GraduationCap, Code } from 'lucide-react'
import { resumeAPI } from '../../services/api'
import Layout from '../../components/common/Layout'
import toast from 'react-hot-toast'

export default function ResumePage() {
  const [resumes, setResumes] = useState([])
  const [selected, setSelected] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  const load = () => {
    resumeAPI.list()
      .then(({ data }) => {
        setResumes(data)
        if (data.length > 0 && !selected) setSelected(data[0].id)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await resumeAPI.upload(file)
      toast.success('Resume uploaded and parsed!')
      load()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSetPrimary = async (id) => {
    await resumeAPI.setPrimary(id)
    toast.success('Primary resume updated')
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this resume?')) return
    await resumeAPI.delete(id)
    toast.success('Resume deleted')
    setSelected(null)
    load()
  }

  const selectedResume = resumes.find(r => r.id === selected)

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Resume</h1>
            <p className="text-slate-400 mt-1">Upload and manage your resumes</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="glass p-12 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="glass p-16 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
            <FileText className="w-16 h-16 text-slate-600" />
            <h3 className="text-xl font-semibold text-white">No resumes yet</h3>
            <p className="text-slate-400 max-w-sm">
              Upload your resume (PDF or DOCX) to get personalized interview questions
            </p>
            <button onClick={() => fileRef.current?.click()} className="btn-primary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resume list */}
            <div className="flex flex-col gap-3">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`glass-hover p-4 rounded-xl text-left transition-all ${
                    selected === r.id ? 'border-sky-500/50 bg-sky-500/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-sky-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-[140px]">{r.file_name}</p>
                        <p className="text-xs text-slate-500">{r.file_type?.toUpperCase()} · {(r.file_size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    {r.is_primary && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full shrink-0">
                        Primary
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Resume detail */}
            {selectedResume && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2 glass p-6 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-semibold text-white">{selectedResume.file_name}</h2>
                    {selectedResume.extracted_name && (
                      <p className="text-slate-400 text-sm mt-0.5">{selectedResume.extracted_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!selectedResume.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(selectedResume.id)}
                        className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3"
                      >
                        <Star className="w-3.5 h-3.5" /> Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedResume.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Parsed info */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {selectedResume.extracted_email && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm text-white">{selectedResume.extracted_email}</p>
                    </div>
                  )}
                  {selectedResume.extracted_phone && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm text-white">{selectedResume.extracted_phone}</p>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {selectedResume.skills?.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4 text-sky-400" />
                      <h3 className="font-medium text-white">Extracted Skills</h3>
                      <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">
                        {selectedResume.skills.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedResume.skills.map((s, i) => (
                        <span key={i} className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full">
                          {s.skill_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {selectedResume.experience?.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-violet-400" />
                      <h3 className="font-medium text-white">Experience</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedResume.experience.map((e, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3">
                          <p className="text-sm font-medium text-white">{e.position}</p>
                          <p className="text-xs text-slate-400">{e.company} · {e.start_date} – {e.end_date || 'Present'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedResume.education?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-4 h-4 text-green-400" />
                      <h3 className="font-medium text-white">Education</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedResume.education.map((e, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3">
                          <p className="text-sm font-medium text-white">{e.degree} in {e.field}</p>
                          <p className="text-xs text-slate-400">{e.institution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </Layout>
  )
}
