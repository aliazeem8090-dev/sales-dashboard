'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { AlertTriangle, Clock, ChevronRight, Users } from 'lucide-react'

const TIME_FILTERS = [
  { label: '7D',  days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'All', days: 0 },
]

const FLAG_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warn:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function getRepFlags(rep: any) {
  const flags: { label: string; level: 'critical' | 'warn' }[] = []
  if (rep.totalProposals < 5) flags.push({ label: 'Low volume', level: 'warn' })
  if (rep.totalProposals >= 10 && rep.replyRate < 10) flags.push({ label: 'Low reply rate', level: 'critical' })
  if (!rep.lastActivityDate) flags.push({ label: 'No activity', level: 'critical' })
  else {
    const d = Math.floor((Date.now() - new Date(rep.lastActivityDate).getTime()) / 86400000)
    if (d >= 5) flags.push({ label: `Inactive ${d}d`, level: 'critical' })
  }
  return flags
}

function formatDate(d: string | null) {
  if (!d) return 'Never'
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

const NICHE_COLORS: Record<string, string> = {
  MERN:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Laravel:   'bg-red-500/15 text-red-400 border-red-500/25',
  AI_ML:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  WordPress: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}
function nicheColor(n: string) { return NICHE_COLORS[n] || 'bg-slate-700/40 text-slate-400 border-slate-600/30' }

export default function RepReviewsPage() {
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  function load(d: number) {
    setLoading(true)
    const q = d > 0 ? `?days=${d}` : ''
    api.get<any[]>(`/dashboard/leaderboard${q}`)
      .then(setReps)
      .catch(() => setReps([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(days) }, [])

  function handleFilter(d: number) {
    setDays(d)
    load(d)
  }

  const cardStyle = { background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Rep Reviews</h1>
            <p className="text-xs text-slate-500 mt-0.5">Click a rep to review their proposals against job descriptions</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => handleFilter(f.days)}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${
                  days === f.days
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'text-slate-600 hover:text-slate-400 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : reps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Users size={28} className="text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No reps found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reps.map(rep => {
                const flags = getRepFlags(rep)
                const hasCritical = flags.some(f => f.level === 'critical')
                return (
                  <a
                    key={rep.userId || rep.repId}
                    href={`/manager/reviews/${rep.repId}`}
                    className="block rounded-xl p-5 transition-all hover:border-violet-500/30 group"
                    style={cardStyle}
                  >
                    {/* Rep name + flag indicator */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">{rep.name}</p>
                          {flags.length > 0 && (
                            <AlertTriangle size={12} className={hasCritical ? 'text-red-400' : 'text-amber-400'} />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={9} className="text-slate-600" />
                          <span className="text-[10px] text-slate-600">{formatDate(rep.lastActivityDate)}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-violet-500 transition-colors mt-0.5" />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <p className="text-lg font-bold font-mono text-slate-200">{rep.totalProposals}</p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wide">Proposals</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${rep.replyRate >= 20 ? 'text-emerald-400' : rep.replyRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                          {rep.replyRate}%
                        </p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wide">Reply</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${rep.hireRate >= 10 ? 'text-emerald-400' : rep.hireRate >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                          {rep.hireRate}%
                        </p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wide">Hire</p>
                      </div>
                    </div>

                    {/* Consistency bar */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] text-slate-600 uppercase tracking-wide">Consistency</span>
                        <span className="text-[9px] text-slate-500">{rep.consistencyScore || 0}%</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'rgba(30,37,51,1)' }}>
                        <div className="h-1 bg-violet-500 rounded-full" style={{ width: `${rep.consistencyScore || 0}%` }} />
                      </div>
                    </div>

                    {/* Flags */}
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-3" style={{ borderTop: '1px solid rgba(30,37,51,0.8)' }}>
                        {flags.map((f, i) => (
                          <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${FLAG_COLORS[f.level]}`}>
                            {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
  )
}
