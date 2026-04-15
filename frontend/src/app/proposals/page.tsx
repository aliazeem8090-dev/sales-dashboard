'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Plus, ExternalLink, Zap } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  SENT:      'bg-slate-700/50 text-slate-400 border-slate-600/40',
  VIEWED:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  REPLIED:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  INTERVIEW: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  HIRED:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  REJECTED:  'bg-red-500/15 text-red-400 border-red-500/25',
  LOST:      'bg-red-500/15 text-red-400 border-red-500/25',
}

const STATUSES = ['SENT', 'VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED', 'REJECTED', 'LOST']

export default function ProposalsPage() {
  return (
    <Suspense>
      <ProposalsList />
    </Suspense>
  )
}

function ProposalsList() {
  const user = getStoredUser()
  const searchParams = useSearchParams()
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(() => searchParams.get('status') || '')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)

    // Reps must pass their repId — backend enforces it anyway
    if (user?.role === 'REP') {
      api.get<any>(`/reps/by-user/${user.id}`)
        .then(rep => {
          const repParam = rep?.id ? `repId=${rep.id}&${params}` : params.toString()
          return api.get<any[]>(`/proposals?${repParam}`)
        })
        .then(setProposals)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      api.get<any[]>(`/proposals?${params}`)
        .then(setProposals)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [filter])

  return (
    <div className="p-6 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-200">Proposals</h1>
          <p className="text-xs text-slate-500 mt-0.5">{proposals.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/board"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
          >
            Board view
          </Link>
          <Link
            href="/proposals/new"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}
          >
            <Plus size={13} />
            Log Proposal
          </Link>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {['', ...STATUSES].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg border transition-colors ${
              filter === s
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-slate-600 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          Loading…
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-slate-800/60 p-12 text-center" style={{ background: '#0a0b10' }}>
          <p className="text-slate-500 text-sm">No proposals found.</p>
          <Link href="/proposals/new" className="mt-3 inline-block text-xs text-cyan-500/70 hover:text-cyan-400 transition-colors">
            Log your first proposal →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/60 overflow-hidden" style={{ background: '#0a0b10' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(30,37,51,1)', background: '#07080d' }}>
                <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider">Job</th>
                {isManager && <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider">Rep</th>}
                <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 uppercase tracking-wider">AI Score</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 uppercase tracking-wider">Connects</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-slate-800/20"
                  style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-300 truncate max-w-xs">{p.job?.title || 'Untitled Job'}</p>
                    {p.job?.upworkJobUrl && (
                      <a
                        href={p.job.upworkJobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-cyan-400 transition-colors mt-0.5 w-fit"
                      >
                        <ExternalLink size={9} />
                        View job
                      </a>
                    )}
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <span className="text-slate-300 font-medium">{p.rep?.user?.name || '—'}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[p.status] || STATUS_COLORS.SENT}`}>
                      {p.status === 'HIRED' ? 'CLOSED' : p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {p.aiScore != null ? (
                      <span className={`font-bold ${p.aiScore >= 70 ? 'text-emerald-400' : p.aiScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.aiScore}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-slate-500">
                      <Zap size={9} className="text-amber-500" />
                      {p.connectsUsed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`/review?proposalId=${p.id}`}
                        className="text-[10px] text-cyan-500/70 hover:text-cyan-400 transition-colors"
                      >
                        Review
                      </a>
                      <StatusDropdown
                        proposalId={p.id}
                        current={p.status}
                        onUpdate={updated => setProposals(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusDropdown({ proposalId, current, onUpdate }: { proposalId: string; current: string; onUpdate: (p: any) => void }) {
  const [open, setOpen] = useState(false)

  async function updateStatus(status: string) {
    setOpen(false)
    try {
      const updated = await api.patch<any>(`/proposals/${proposalId}/status`, { status })
      onUpdate(updated)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        Move ▾
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-32 rounded-lg z-20 py-1 overflow-hidden"
          style={{ background: '#0f1117', border: '1px solid rgba(100,116,139,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {STATUSES.filter(s => s !== current).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className="block w-full text-left px-3 py-1.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors uppercase tracking-wide"
            >
              {s === 'HIRED' ? 'CLOSED' : s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
