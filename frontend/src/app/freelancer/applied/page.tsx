'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Plus, ExternalLink, Trash2, Link as LinkIcon } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
const inputStyle = { background: '#0d0e14', border: '1px solid rgba(100,116,139,0.2)' }

interface AppliedJob {
  id: string
  url: string
  title: string
  appliedAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function extractDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

export default function FreelancerAppliedPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<AppliedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') { router.replace('/dashboard'); return }
    if (!user.freelancerAgentId) { setLoading(false); return }
    setAgentId(user.freelancerAgentId)
    fetchJobs(user.freelancerAgentId)
  }, [])

  async function fetchJobs(id: string) {
    try {
      const data = await api.get<AppliedJob[]>(`/freelancer-applied-jobs/agent/${id}`)
      setJobs(data)
    } catch { } finally { setLoading(false) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId || !url.trim()) return
    setSubmitting(true)
    try {
      const job = await api.post<AppliedJob>(`/freelancer-applied-jobs/agent/${agentId}`, {
        url: url.trim(),
        title: title.trim() || undefined,
      })
      setJobs(prev => [job, ...prev])
      setUrl('')
      setTitle('')
    } catch { } finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/freelancer-applied-jobs/${id}`)
      setJobs(prev => prev.filter(j => j.id !== id))
    } catch { } finally { setDeletingId(null) }
  }

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">Applied Jobs</h1>
        <p className="text-xs text-slate-500 mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} logged</p>
      </div>

      <div className="px-6 py-5 max-w-2xl space-y-4">

        {/* Add URL form */}
        <form onSubmit={handleAdd} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.12)' }}>
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Log Applied Job</p>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Job URL *</label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.freelancer.com/projects/..."
                className={inputClass}
                style={inputStyle}
                required
              />
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
              >
                <Plus size={13} />
                {submitting ? '…' : 'Add'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Label (optional)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. React Dashboard Project"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </form>

        {/* Jobs list */}
        {loading ? (
          <p className="text-slate-500 text-xs py-6">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-10 text-center" style={{ background: 'var(--ink2)' }}>
            <LinkIcon size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No applied jobs yet.</p>
            <p className="text-xs text-slate-600 mt-1">Paste a freelancer.com job URL above to log it.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {jobs.map(job => (
              <div
                key={job.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.08)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-violet-500/40" />
                <div className="flex-1 min-w-0">
                  {job.title && (
                    <p className="text-[12px] font-medium text-slate-200 truncate">{job.title}</p>
                  )}
                  <p className={`text-[11px] text-slate-500 truncate ${!job.title ? 'text-slate-300' : ''}`}>
                    {extractDomain(job.url)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(job.appliedAt)}</span>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-600 hover:text-violet-400 transition-colors shrink-0"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => handleDelete(job.id)}
                  disabled={deletingId === job.id}
                  className="p-1.5 text-slate-700 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
