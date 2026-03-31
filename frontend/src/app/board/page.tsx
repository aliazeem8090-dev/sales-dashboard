'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import {
  Plus, Kanban, Users, ChevronDown, Search, Calendar,
  X, ArrowLeft, ArrowRight, Zap, ChevronLeft, ExternalLink,
} from 'lucide-react'

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  proposals,
  selectedDate,
  onSelect,
  onClose,
}: {
  proposals: any[]
  selectedDate: Date | null
  onSelect: (d: Date | null) => void
  onClose: () => void
}) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  // Build a map of date-string → count
  const countMap: Record<string, number> = {}
  for (const p of proposals) {
    if (!p.submittedAt) continue
    const key = new Date(p.submittedAt).toDateString()
    countMap[key] = (countMap[key] || 0) + 1
  }

  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="absolute top-full mt-2 right-0 z-50 rounded-xl p-4 w-72 shadow-2xl" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><ChevronLeft size={14} /></button>
        <span className="text-xs font-semibold text-slate-300">{MONTHS[month]} {year}</span>
        <div className="flex items-center gap-1">
          <button onClick={nextMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><ArrowRight size={14} /></button>
          <button onClick={onClose} className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors ml-1"><X size={13} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[9px] text-slate-600 font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const date = new Date(year, month, day)
          const key = date.toDateString()
          const count = countMap[key] || 0
          const isToday = date.toDateString() === today.toDateString()
          const isSelected = selectedDate?.toDateString() === key
          return (
            <button
              key={i}
              onClick={() => onSelect(isSelected ? null : date)}
              className={`relative flex flex-col items-center py-1 rounded-lg text-xs transition-all ${
                isSelected ? 'bg-cyan-500/30 text-cyan-300' :
                isToday ? 'bg-slate-800/80 text-slate-200' :
                'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              {day}
              {count > 0 && (
                <span className={`text-[8px] font-bold leading-none mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-cyan-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(30,37,51,0.8)' }}>
          <span className="text-[10px] text-slate-500">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => onSelect(null)} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
        </div>
      )}
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ proposals, date }: { proposals: any[]; date: Date }) {
  const STATUS_COLORS: Record<string, string> = {
    SENT:      'bg-slate-700/40 text-slate-400 border-slate-600/30',
    VIEWED:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
    REPLIED:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    INTERVIEW: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    HIRED:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    REJECTED:  'bg-red-500/15 text-red-400 border-red-500/25',
    LOST:      'bg-red-500/15 text-red-400 border-red-500/25',
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Calendar size={28} className="text-slate-700 mb-3" />
        <p className="text-sm text-slate-500">No proposals on {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map(p => (
        <div key={p.id} className="rounded-xl p-4 flex items-start gap-4" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${STATUS_COLORS[p.status] || STATUS_COLORS.SENT}`}>
                {p.status === 'HIRED' ? 'CLOSED' : p.status}
              </span>
              {p.aiScore != null && (
                <span className={`text-[9px] font-mono font-bold ${p.aiScore >= 70 ? 'text-emerald-400' : p.aiScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  AI {p.aiScore}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-300">{p.job?.title || 'Untitled Job'}</p>
            {p.job?.upworkJobUrl && (
              <a href={p.job.upworkJobUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-cyan-400 transition-colors mt-0.5">
                <ExternalLink size={9} />
                View job
              </a>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end text-xs text-slate-500">
              <Zap size={10} className="text-amber-500" />
              {p.connectsUsed} connects
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── New Proposal Panel ───────────────────────────────────────────────────────

function NewProposalPanel({
  repId,
  profiles,
  onSuccess,
  onClose,
}: {
  repId: string
  profiles: any[]
  onSuccess: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    jobUrl: '',
    jobTitle: '',
    jobDescription: '',
    fullProposalText: '',
    connectsUsed: 6,
    boost: 0,
    profileUsedId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const totalConnects = form.connectsUsed + form.boost

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!repId) { setError('Rep profile not found. Contact your manager.'); return }
    setLoading(true)
    try {
      const job = await api.post<any>('/jobs', {
        upworkJobUrl: form.jobUrl,
        title: form.jobTitle,
        description: form.jobDescription || undefined,
      })
      await api.post('/proposals', {
        repId,
        jobId: job.id,
        fullProposalText: form.fullProposalText,
        connectsUsed: totalConnects,
        profileUsedId: form.profileUsedId || undefined,
        submittedAt: new Date().toISOString(),
      })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to save proposal')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
  const inputStyle = { background: '#07080d', border: '1px solid rgba(100,116,139,0.2)' }
  const labelClass = "block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider"

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-y-auto flex flex-col" style={{ background: '#07080d', borderLeft: '1px solid rgba(6,182,212,0.12)' }}>
        {/* Panel header */}
        <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Log New Proposal</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Record a proposal you've submitted on Upwork</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-lg text-red-400 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Upwork Job URL</label>
            <input
              type="url"
              value={form.jobUrl}
              onChange={e => set('jobUrl', e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="https://www.upwork.com/jobs/~..."
            />
          </div>

          <div>
            <label className={labelClass}>Job Title</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={e => set('jobTitle', e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. Laravel API Developer"
            />
          </div>

          <div>
            <label className={labelClass}>Job Description <span className="normal-case text-slate-600">(paste from Upwork)</span></label>
            <textarea
              value={form.jobDescription}
              onChange={e => set('jobDescription', e.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              placeholder="Paste the full job description here…"
            />
          </div>

          <div>
            <label className={labelClass}>Profile Used</label>
            <select
              value={form.profileUsedId}
              onChange={e => set('profileUsedId', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select profile…</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.niche})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Your Proposal <span className="normal-case text-slate-600">(full text submitted)</span></label>
            <textarea
              value={form.fullProposalText}
              onChange={e => set('fullProposalText', e.target.value)}
              required
              rows={8}
              className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
              style={inputStyle}
              placeholder="Paste your full proposal here…"
            />
          </div>

          {/* Connects row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Connects Used</label>
              <input
                type="number"
                value={form.connectsUsed}
                onChange={e => set('connectsUsed', parseInt(e.target.value) || 0)}
                min={0}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass}>Boost</label>
              <input
                type="number"
                value={form.boost}
                onChange={e => set('boost', parseInt(e.target.value) || 0)}
                min={0}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass}>Total Connects</label>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg" style={{ background: '#0d0e15', border: '1px solid rgba(6,182,212,0.15)' }}>
                <Zap size={12} className="text-amber-500" />
                <span className="text-sm font-bold font-mono text-amber-400">{totalConnects}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 mt-2"
            style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
          >
            {loading ? 'Saving…' : 'Save Proposal'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── Board Page ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const [isManager, setIsManager] = useState(false)
  const [repId, setRepId] = useState('')
  const [profiles, setProfiles] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [allReps, setAllReps] = useState<any[]>([])
  const [selectedRepId, setSelectedRepId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Hydration-safe: set role after mount
  useEffect(() => {
    const u = getStoredUser()
    if (!u) return
    const mgr = u.role === 'MANAGER' || u.role === 'ADMIN'
    setIsManager(mgr)

    if (mgr) {
      setIsManager(true)
      api.get<any[]>('/reps').then(setAllReps).catch(() => {})
      loadProposals({ mgr: true })
    } else {
      // Load rep + assigned profiles
      api.get<any>(`/reps/by-user/${u.id}`)
        .then(async rep => {
          if (rep?.id) {
            setRepId(rep.id)
            const assignments = await api.get<any[]>(`/bidder-assignments/bidder/${u.id}`).catch(() => [])
            const allProfiles = await api.get<any[]>('/upwork-profiles').catch(() => [])
            if (assignments.length > 0) {
              const ids = new Set(assignments.map((a: any) => a.profileId))
              const filtered = allProfiles.filter((p: any) => ids.has(p.id))
              setProfiles(filtered.length > 0 ? filtered : allProfiles)
            } else {
              setProfiles(allProfiles)
            }
            loadProposals({ mgr: false, rid: rep.id })
          }
        })
        .catch(() => {})
    }
  }, [])

  async function loadProposals(opts?: { mgr?: boolean; rid?: string; repFilter?: string }) {
    setLoading(true)
    setError('')
    try {
      const mgr = opts?.mgr ?? isManager
      const rid = opts?.rid ?? repId
      const repFilter = opts?.repFilter ?? selectedRepId
      let url = '/proposals'
      if (mgr) {
        if (repFilter) url = `/proposals?repId=${repFilter}`
      } else {
        if (rid) url = `/proposals?repId=${rid}`
      }
      const data = await api.get<any[]>(url)
      setProposals(data)
    } catch {
      setError('Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }


  // Search filter (by job title or description)
  const searchFiltered = searchQuery.trim()
    ? proposals.filter(p => {
        const q = searchQuery.toLowerCase()
        return (
          p.job?.title?.toLowerCase().includes(q) ||
          p.job?.description?.toLowerCase().includes(q)
        )
      })
    : proposals

  // Day view proposals
  const dayProposals = selectedDate
    ? proposals.filter(p => p.submittedAt && new Date(p.submittedAt).toDateString() === selectedDate.toDateString())
    : []

  function handleNewProposalSuccess() {
    setShowForm(false)
    loadProposals({ mgr: isManager, rid: repId })
    setRefreshKey(k => k + 1)
  }

  const selectedRepName = selectedRepId
    ? allReps.find(r => r.id === selectedRepId)?.user?.name || 'Selected Rep'
    : 'All Reps'

  return (
    <div className="flex flex-col h-full p-6 relative z-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <Kanban size={15} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Lead Board</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDate
                ? `Proposals on ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                : isManager ? 'Team-wide proposal pipeline' : 'Your active proposal pipeline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manager rep filter */}
          {isManager && (
            <div className="relative">
              <select
                value={selectedRepId}
                onChange={e => { setSelectedRepId(e.target.value); loadProposals({ mgr: true, repFilter: e.target.value }) }}
                className="appearance-none text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none cursor-pointer text-slate-300"
                style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}
              >
                <option value="">All Reps</option>
                {allReps.map(rep => (
                  <option key={rep.id} value={rep.id}>{rep.user?.name || rep.id}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search job title or keyword…"
              className="pl-9 pr-3 py-2 text-xs text-slate-300 rounded-lg focus:outline-none w-52"
              style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Calendar toggle */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setShowCalendar(c => !c)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                showCalendar || selectedDate
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              style={{ border: showCalendar || selectedDate ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(30,37,51,0.8)' }}
            >
              <Calendar size={13} />
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Calendar'}
            </button>
            {showCalendar && (
              <MiniCalendar
                proposals={proposals}
                selectedDate={selectedDate}
                onSelect={d => { setSelectedDate(d); setShowCalendar(false) }}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </div>

          {/* New Proposal — reps only */}
          {!isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}
            >
              <Plus size={13} />
              New Proposal
            </button>
          )}
        </div>
      </div>

      {/* Active filters bar */}
      {(selectedDate || searchQuery) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {selectedDate && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <Calendar size={11} className="text-cyan-500" />
              <span className="text-cyan-400">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{dayProposals.length} proposal{dayProposals.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setSelectedDate(null)} className="text-slate-600 hover:text-slate-400 ml-1"><X size={11} /></button>
            </div>
          )}
          {searchQuery && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(30,37,51,0.8)', border: '1px solid rgba(30,37,51,0.8)' }}>
              <Search size={11} className="text-slate-500" />
              <span className="text-slate-400">"{searchQuery}"</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{searchFiltered.length} result{searchFiltered.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setSearchQuery('')} className="text-slate-600 hover:text-slate-400 ml-1"><X size={11} /></button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '300ms' }} />
            <span className="text-xs text-slate-500 ml-1">Loading pipeline…</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      ) : selectedDate ? (
        // Day view
        <div className="max-w-2xl">
          <DayView proposals={dayProposals} date={selectedDate} />
        </div>
      ) : (
        // Kanban board
        <KanbanBoard key={refreshKey} initialProposals={searchFiltered} />
      )}

      {/* New Proposal slide-in panel */}
      {showForm && (
        <NewProposalPanel
          repId={repId}
          profiles={profiles}
          onSuccess={handleNewProposalSuccess}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
