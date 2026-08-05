'use client'

import { useEffect, useState } from 'react'
import * as coachingApi from '@/lib/data/coaching-insights'
import * as repsApi from '@/lib/data/reps'
import { getStoredUser } from '@/lib/auth'
import { PenLine, Zap, Info, MessageSquare, Activity, BarChart2, User } from 'lucide-react'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/25 text-red-300',
  HIGH:     'bg-amber-500/10 border-amber-500/25 text-amber-300',
  MEDIUM:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  LOW:      'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-amber-400',
  MEDIUM:   'bg-yellow-400',
  LOW:      'bg-emerald-400',
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH:     'bg-amber-500/20 text-amber-400 border-amber-500/30',
  MEDIUM:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LOW:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const TYPE_ICONS: Record<string, any> = {
  PERFORMANCE:      BarChart2,
  PROPOSAL_QUALITY: Zap,
  ACTIVITY:         Activity,
  PROFILE_FIT:      User,
  MANAGER_NOTE:     MessageSquare,
}

const TYPE_LABELS: Record<string, string> = {
  PERFORMANCE:      'Performance',
  PROPOSAL_QUALITY: 'Proposal Quality',
  ACTIVITY:         'Activity',
  PROFILE_FIT:      'Profile Fit',
  MANAGER_NOTE:     'Manager Note',
}

export default function InsightsPage() {
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null)
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [insights, setInsights] = useState<any[]>([])
  const [reps, setReps] = useState<any[]>([])
  const [selectedRep, setSelectedRep] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showNotePanel, setShowNotePanel] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSeverity, setNoteSeverity] = useState('MEDIUM')
  const [noteRep, setNoteRep] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    if (user === null) return
    if (isManager) {
      Promise.all([
        coachingApi.findTeamInsights(user?.companyId || 'company-1'),
        repsApi.findAll(user?.companyId),
      ]).then(([ins, repList]) => {
        setInsights(ins as any[])
        setReps(repList as any[])
      }).catch(console.error).finally(() => setLoading(false))
    } else {
      repsApi.findByUserId(user!.id)
        .then(rep => rep ? coachingApi.findByRep(rep.id) : [])
        .then(ins => setInsights(ins as any[]))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [user])

  async function generateInsights() {
    if (!selectedRep) return
    setGenerating(true)
    try {
      const newInsights = await coachingApi.generateForRep(selectedRep)
      setInsights(prev => [...(newInsights as any[]), ...prev])
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  async function submitNote() {
    if (!noteRep || !noteText.trim()) return
    setSavingNote(true)
    try {
      const created = await coachingApi.createNote(noteRep, noteText.trim(), noteSeverity)
      setInsights(prev => [created as any, ...prev])
      setNoteText('')
      setShowNotePanel(false)
    } catch (err) { console.error(err) }
    finally { setSavingNote(false) }
  }

  async function markRead(id: string) {
    await coachingApi.markRead(id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i))
  }

  const managerNotes = insights.filter(i => i.insightType === 'MANAGER_NOTE')
  const aiInsights = insights.filter(i => i.insightType !== 'MANAGER_NOTE')

  const filtered = insights.filter(i =>
    (!filter || i.severity === filter) &&
    (!typeFilter || i.insightType === typeFilter)
  )

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
  const inputStyle = { background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.2)' }

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Coaching Insights</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {insights.filter(i => !i.isRead).length} unread
              {!isManager && ' · Only you can see these'}
            </p>
          </div>
          {isManager && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRep}
                onChange={e => setSelectedRep(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
                style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.3)' }}
              >
                <option value="">Select rep…</option>
                {reps.map(r => (
                  <option key={r.id} value={r.id}>{r.user?.name || r.id}</option>
                ))}
              </select>
              <button
                onClick={generateInsights}
                disabled={!selectedRep || generating}
                className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.25)', color: '#a78bfa' }}
              >
                {generating ? 'Generating…' : 'Generate Insights'}
              </button>
              <button
                onClick={() => setShowNotePanel(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  showNotePanel
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
                style={showNotePanel ? { border: '1px solid' } : {}}
              >
                <PenLine size={12} />
                Leave Note
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-4">

        {/* Manager note panel */}
        {showNotePanel && isManager && (
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--ink2)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Send Note to Rep</p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Rep</label>
              <select value={noteRep} onChange={e => setNoteRep(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Select rep…</option>
                {reps.map(r => (
                  <option key={r.id} value={r.id}>{r.user?.name || r.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 uppercase tracking-wide">Severity</label>
              <div className="flex gap-2">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                  <button
                    key={s}
                    onClick={() => setNoteSeverity(s)}
                    className={`px-2.5 py-1 text-[10px] rounded-lg font-semibold border transition-colors ${
                      noteSeverity === s ? SEVERITY_BADGE[s] : 'border-slate-700 text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Message</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                placeholder="Write feedback or coaching notes. The rep will see this when they log in…"
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNotePanel(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button
                onClick={submitNote}
                disabled={!noteRep || !noteText.trim() || savingNote}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
              >
                {savingNote ? 'Sending…' : 'Send Note'}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                filter === s
                  ? (s ? SEVERITY_BADGE[s] : 'bg-violet-500/20 border-violet-500/30 text-violet-400')
                  : 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-800 mx-1" />
          {['', 'MANAGER_NOTE', 'PROPOSAL_QUALITY', 'ACTIVITY', 'PERFORMANCE'].map(t => (
            <button
              key={t || 'all-types'}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-colors ${
                typeFilter === t
                  ? 'bg-slate-700/60 border-slate-600 text-slate-300'
                  : 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {t ? TYPE_LABELS[t] : 'All Types'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading insights…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-10 text-center" style={{ background: 'var(--ink2)' }}>
            <p className="text-slate-500 text-sm">No insights match this filter.</p>
            {isManager && !insights.length && (
              <p className="text-xs text-slate-600 mt-1">Select a rep and click "Generate Insights" to run analysis.</p>
            )}
            {!isManager && !insights.length && (
              <p className="text-xs text-slate-600 mt-1">Your manager will leave coaching notes here.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Manager notes section first for reps */}
            {!isManager && managerNotes.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-2">From Your Manager</p>
              </div>
            )}

            {filtered.map(insight => {
              const Icon = TYPE_ICONS[insight.insightType] || Zap
              const isNote = insight.insightType === 'MANAGER_NOTE'
              return (
                <div
                  key={insight.id}
                  className={`rounded-xl border p-4 transition-opacity ${SEVERITY_STYLES[insight.severity]} ${insight.isRead ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[insight.severity]}`} />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${SEVERITY_BADGE[insight.severity]}`}>
                          {insight.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] opacity-60">
                        <Icon size={10} />
                        <span>{TYPE_LABELS[insight.insightType] || insight.insightType}</span>
                      </div>
                      {isManager && insight.rep?.user?.name && (
                        <span className="text-[10px] opacity-50">· {insight.rep.user.name}</span>
                      )}
                      <span className="text-[10px] opacity-40">
                        · {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {!insight.isRead && (
                      <button
                        onClick={() => markRead(insight.id)}
                        className="text-[10px] opacity-50 hover:opacity-100 shrink-0 transition-opacity"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs mt-2.5 leading-relaxed opacity-90">{insight.generatedInsight}</p>
                  {isNote && (
                    <div className="mt-2 pt-2 border-t border-current/10">
                      <span className="text-[9px] opacity-40 uppercase tracking-wider">Personal note from manager</span>
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
