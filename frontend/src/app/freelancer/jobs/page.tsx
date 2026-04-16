'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Plus, X, ExternalLink, AlertTriangle, Clock, RefreshCw, ChevronDown } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
const inputStyle = { background: '#0d0e14', border: '1px solid rgba(100,116,139,0.2)' }

const STATUS_ORDER = ['FOUND', 'APPLIED', 'VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST'] as const
type JobStatus = typeof STATUS_ORDER[number]

const STATUS_COLORS: Record<JobStatus, string> = {
  FOUND:     '#64748b',
  APPLIED:   '#67e8f9',
  VIEWED:    '#a5b4fc',
  REPLIED:   '#fbbf24',
  INTERVIEW: '#fb923c',
  HIRED:     '#4ade80',
  LOST:      '#f87171',
}

const STATUS_LABELS: Record<JobStatus, string> = {
  FOUND:     'Found',
  APPLIED:   'Applied',
  VIEWED:    'Viewed',
  REPLIED:   'Replied',
  INTERVIEW: 'Interview',
  HIRED:     'Hired',
  LOST:      'Lost',
}

interface Job {
  id: string
  jobTitle: string
  clientName: string
  jobUrl: string
  proposalText: string
  status: JobStatus
  notes: string
  lastFollowUpAt: string | null
  followUpCount: number
  appliedAt: string | null
  createdAt: string
  needsFollowUp?: boolean
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

export default function FreelancerJobsPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [followingUpId, setFollowingUpId] = useState<string | null>(null)

  const [jobTitle, setJobTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [proposalText, setProposalText] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') { router.replace('/dashboard'); return }
    if (!user.freelancerAgentId) { setLoading(false); return }
    setAgentId(user.freelancerAgentId)
    fetchJobs(user.freelancerAgentId)
  }, [])

  function enrichJobs(raw: Job[]): Job[] {
    const staleAt      = Date.now() - 4 * 86400000
    const followUpStale = Date.now() - 3 * 86400000
    return raw.map(j => ({
      ...j,
      needsFollowUp:
        (j.status === 'APPLIED' || j.status === 'VIEWED') &&
        !!j.appliedAt &&
        new Date(j.appliedAt).getTime() < staleAt &&
        (!j.lastFollowUpAt || new Date(j.lastFollowUpAt).getTime() < followUpStale),
    }))
  }

  async function fetchJobs(id: string) {
    try {
      const data = await api.get<Job[]>(`/freelancer-jobs/agent/${id}`)
      setJobs(enrichJobs(data))
    } catch { } finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId || !jobTitle.trim()) return
    setSubmitting(true)
    try {
      const job = await api.post<Job>(`/freelancer-jobs/agent/${agentId}`, {
        jobTitle: jobTitle.trim(),
        clientName: clientName.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        proposalText: proposalText.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setJobs(prev => enrichJobs([job, ...prev]))
      setJobTitle(''); setClientName(''); setJobUrl(''); setProposalText(''); setNotes('')
      setShowForm(false)
    } catch { } finally { setSubmitting(false) }
  }

  async function handleStatusChange(job: Job, newStatus: JobStatus) {
    try {
      const updated = await api.patch<Job>(`/freelancer-jobs/${job.id}`, { status: newStatus })
      setJobs(prev => enrichJobs(prev.map(j => j.id === job.id ? { ...j, ...updated } : j)))
    } catch { }
  }

  async function handleFollowUp(job: Job) {
    setFollowingUpId(job.id)
    try {
      const updated = await api.patch<Job>(`/freelancer-jobs/${job.id}/followup`, {})
      setJobs(prev => enrichJobs(prev.map(j => j.id === job.id ? { ...j, ...updated } : j)))
    } catch { } finally { setFollowingUpId(null) }
  }

  async function handleDelete(jobId: string) {
    try {
      await api.delete(`/freelancer-jobs/${jobId}`)
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch { }
  }

  const filtered = filterStatus === 'ALL' ? jobs : jobs.filter(j => j.status === filterStatus)
  const followUpNeeded = jobs.filter(j => j.needsFollowUp)

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', background: '#07080d' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Job Pipeline</h1>
            <p className="text-xs text-slate-500 mt-0.5">{jobs.length} total · {followUpNeeded.length} need follow-up</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Add Job'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-w-3xl">

        {/* Follow-up alert banner */}
        {followUpNeeded.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-300">{followUpNeeded.length} job{followUpNeeded.length > 1 ? 's' : ''} need follow-up</p>
              <p className="text-[11px] text-amber-500/70 mt-0.5">
                {followUpNeeded.map(j => j.jobTitle).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-xl p-5 space-y-3" style={{ background: '#0a0b10', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">New Job</p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Job Title *</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. React Developer for E-commerce App" className={inputClass} style={inputStyle} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Client Name</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. TechCorp Ltd" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Job URL</label>
                <input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="freelancer.com/projects/..." className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Proposal / Cover Letter</label>
              <textarea value={proposalText} onChange={e => setProposalText(e.target.value)} placeholder="Paste your proposal text here…" rows={4} className={inputClass + ' resize-none'} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Budget, skills needed, etc." className={inputClass} style={inputStyle} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" disabled={submitting || !jobTitle.trim()} className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}>
                {submitting ? 'Adding…' : 'Add Job'}
              </button>
            </div>
          </form>
        )}

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['ALL', ...STATUS_ORDER] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors"
              style={{
                background: filterStatus === s ? (s === 'ALL' ? 'rgba(6,182,212,0.15)' : `${STATUS_COLORS[s as JobStatus]}18`) : 'transparent',
                border: `1px solid ${filterStatus === s ? (s === 'ALL' ? 'rgba(6,182,212,0.3)' : `${STATUS_COLORS[s as JobStatus]}40`) : 'rgba(100,116,139,0.15)'}`,
                color: filterStatus === s ? (s === 'ALL' ? '#67e8f9' : STATUS_COLORS[s as JobStatus]) : '#64748b',
              }}
            >
              {s === 'ALL' ? 'All' : STATUS_LABELS[s as JobStatus]}
              {s !== 'ALL' && (
                <span className="ml-1 opacity-60">{jobs.filter(j => j.status === s).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading jobs…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 p-10 text-center" style={{ background: '#0a0b10' }}>
            <p className="text-slate-500 text-sm">{filterStatus === 'ALL' ? 'No jobs yet.' : `No jobs with status "${STATUS_LABELS[filterStatus as JobStatus]}".`}</p>
            {filterStatus === 'ALL' && <p className="text-xs text-slate-600 mt-1">Click "Add Job" to track your first opportunity.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => {
              const color = STATUS_COLORS[job.status]
              const appliedDays = daysAgo(job.appliedAt)
              const followDays = daysAgo(job.lastFollowUpAt)
              const isExpanded = expandedId === job.id

              return (
                <div
                  key={job.id}
                  className="rounded-xl"
                  style={{ background: '#0a0b10', border: job.needsFollowUp ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(100,116,139,0.1)' }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Status dot */}
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-200 truncate">{job.jobTitle}</p>
                        {job.needsFollowUp && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <Clock size={9} /> Follow-up due
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {job.clientName && <span className="text-[11px] text-slate-500">{job.clientName}</span>}
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                          {STATUS_LABELS[job.status]}
                        </span>
                        {appliedDays !== null && <span className="text-[10px] text-slate-600">Applied {appliedDays}d ago</span>}
                        {job.followUpCount > 0 && <span className="text-[10px] text-slate-600">{job.followUpCount} follow-up{job.followUpCount > 1 ? 's' : ''}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.jobUrl && (
                        <a href={job.jobUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-600 hover:text-cyan-400 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {job.needsFollowUp && (
                        <button
                          onClick={() => handleFollowUp(job)}
                          disabled={followingUpId === job.id}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg transition-colors"
                          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                        >
                          {followingUpId === job.id ? <RefreshCw size={10} className="animate-spin" /> : null}
                          {followingUpId === job.id ? '…' : 'Mark Followed Up'}
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                        className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                      <div className="pt-3">
                        {/* Status progression */}
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">Move to status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_ORDER.map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(job, s)}
                              disabled={s === job.status}
                              className="px-2 py-1 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-40"
                              style={{
                                background: s === job.status ? `${STATUS_COLORS[s]}18` : 'transparent',
                                border: `1px solid ${s === job.status ? `${STATUS_COLORS[s]}40` : 'rgba(100,116,139,0.15)'}`,
                                color: s === job.status ? STATUS_COLORS[s] : '#64748b',
                              }}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {job.proposalText && (
                        <div>
                          <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Proposal</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4 italic">&ldquo;{job.proposalText}&rdquo;</p>
                        </div>
                      )}

                      {job.notes && (
                        <div>
                          <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-[11px] text-slate-400">{job.notes}</p>
                        </div>
                      )}

                      {followDays !== null && (
                        <p className="text-[10px] text-slate-600">Last follow-up: {followDays}d ago</p>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="px-3 py-1 text-[11px] rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
