'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getLeaderboard } from '@/lib/data/dashboard'
import * as proposalsApi from '@/lib/data/proposals'
import { getStoredUser } from '@/lib/auth'
import { ArrowLeft, ExternalLink, Zap, ChevronDown, ChevronUp } from 'lucide-react'

const TIME_FILTERS = [
  { label: '7D',  days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'All', days: 0 },
]

const STATUS_COLORS: Record<string, string> = {
  SENT:      'bg-slate-700/40 text-slate-400 border-slate-600/30',
  VIEWED:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  REPLIED:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  INTERVIEW: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  HIRED:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  REJECTED:  'bg-red-500/15 text-red-400 border-red-500/25',
  LOST:      'bg-red-500/15 text-red-400 border-red-500/25',
}

const NICHE_COLORS: Record<string, string> = {
  MERN:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Laravel:   'bg-red-500/15 text-red-400 border-red-500/25',
  AI_ML:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  WordPress: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}
function nicheColor(n: string) { return NICHE_COLORS[n] || 'bg-slate-700/40 text-slate-400 border-slate-600/30' }

function ProposalCard({ proposal }: { proposal: any }) {
  const [expanded, setExpanded] = useState(false)
  const job = proposal.job || {}
  const profile = proposal.profileUsed || {}
  const statusColor = STATUS_COLORS[proposal.status] || STATUS_COLORS.SENT

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}>
      {/* Card header — always visible */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${statusColor}`}>
                {proposal.status === 'HIRED' ? 'CLOSED' : proposal.status}
              </span>
              {profile.niche && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${nicheColor(profile.niche)}`}>
                  {profile.niche}
                </span>
              )}
              {proposal.aiScore != null && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  proposal.aiScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  proposal.aiScore >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  AI {proposal.aiScore}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-200 truncate">{job.title || 'Untitled Job'}</h3>
            <div className="flex items-center gap-3 mt-1">
              {job.upworkJobUrl && (
                <a href={job.upworkJobUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-violet-400 transition-colors">
                  <ExternalLink size={9} />
                  View job
                </a>
              )}
              {job.clientBudget && <span className="text-[10px] text-slate-600">{job.clientBudget}</span>}
              <span className="flex items-center gap-1 text-[10px] text-slate-600">
                <Zap size={9} className="text-amber-500" />
                {proposal.connectsUsed} connects
              </span>
              <span className="text-[10px] text-slate-600">
                {proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors"
            style={{ background: 'rgba(30,37,51,0.4)' }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded: job description + proposal side by side */}
      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0" style={{ borderTop: '1px solid rgba(30,37,51,0.8)' }}>
          {/* Job description */}
          <div className="p-5" style={{ borderRight: '1px solid rgba(30,37,51,0.8)' }}>
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Job Description</p>
            {job.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {job.skills.map((s: string, i: number) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(30,37,51,0.8)', color: '#64748b' }}>{s}</span>
                ))}
              </div>
            )}
            {job.description ? (
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            ) : (
              <p className="text-xs text-slate-700 italic">No job description available</p>
            )}
          </div>

          {/* Proposal text */}
          <div className="p-5">
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Proposal Submitted</p>
            {profile.title && (
              <p className="text-[10px] text-slate-600 mb-2">Profile: <span className="text-slate-400">{profile.title}</span></p>
            )}
            {proposal.fullProposalText ? (
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-mono">{proposal.fullProposalText}</p>
            ) : (
              <p className="text-xs text-slate-700 italic">No proposal text saved</p>
            )}
            {proposal.improvementNotes && (
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <p className="text-[9px] font-semibold text-cyan-600 uppercase tracking-widest mb-1">Manager Notes</p>
                <p className="text-xs text-slate-500">{proposal.improvementNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RepReviewDetailPage() {
  const params = useParams()
  const repId = params.repId as string

  const [repName, setRepName] = useState('')
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [statusFilter, setStatusFilter] = useState('')

  function load(selectedDays: number) {
    setLoading(true)
    const user = getStoredUser()
    // Get rep info from leaderboard + proposals
    Promise.all([
      getLeaderboard(user?.companyId || null).catch(() => []),
      fetchProposals(selectedDays),
    ]).then(([lb]) => {
      const rep = (lb as any[]).find(r => r.repId === repId)
      if (rep) setRepName(rep.name)
    }).finally(() => setLoading(false))
  }

  function fetchProposals(selectedDays: number) {
    const startDate = selectedDays > 0
      ? new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined
    return proposalsApi.findByRepWithFilters(repId, { startDate })
      .then(setProposals)
      .catch(() => setProposals([]))
  }

  useEffect(() => { load(days) }, [])

  function handleFilter(d: number) {
    setDays(d)
    setLoading(true)
    fetchProposals(d).finally(() => setLoading(false))
  }

  const STATUSES = ['SENT', 'VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST']
  const filtered = statusFilter ? proposals.filter(p => p.status === statusFilter) : proposals

  const cardStyle = { background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }
  const bgDark = { background: 'var(--ink)' }

  // Summary stats
  const total = proposals.length
  const replied = proposals.filter(p => ['REPLIED', 'INTERVIEW', 'HIRED'].includes(p.status)).length
  const hires = proposals.filter(p => p.status === 'HIRED').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', ...bgDark }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/manager/reviews" className="text-slate-600 hover:text-slate-300 transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-200">{repName || 'Rep'} — Proposals</h1>
                <p className="text-xs text-slate-500 mt-0.5">{total} proposals · {replied} replies · {hires} hires</p>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={cardStyle}>
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

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {['', ...STATUSES].map(s => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg border transition-colors ${
                  statusFilter === s
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={cardStyle}>
              <p className="text-slate-500 text-sm">No proposals found for this period.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-6xl">
              {filtered.map(p => (
                <ProposalCard key={p.id} proposal={p} />
              ))}
            </div>
          )}
        </div>
      </div>
  )
}
