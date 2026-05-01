'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Users, Link as LinkIcon, TrendingUp, ChevronRight, ExternalLink } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  NEW:           'New',
  PROPOSAL_SENT: 'Proposal Sent',
  REPLIED:       'Replied',
  INTERVIEW:     'Interview',
  HIRED:         'Hired',
  LOST:          'Lost',
}
const STATUS_COLORS: Record<string, string> = {
  NEW:           '#64748b',
  PROPOSAL_SENT: '#a78bfa',
  REPLIED:       '#a5b4fc',
  INTERVIEW:     '#fb923c',
  HIRED:         '#4ade80',
  LOST:          '#f87171',
}
const PIPELINE_ORDER = ['NEW', 'PROPOSAL_SENT', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST']

interface DashboardData {
  agentId: string
  totalLeads: number
  totalApplied: number
  activeLeads: number
  wonLeads: number
  byStatus: Record<string, number>
  recentLeads: any[]
  recentApplied: any[]
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: `1px solid ${color}20` }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: `${color}99` }}>{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60 text-slate-400">{sub}</p>}
    </div>
  )
}

export default function FreelancerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') { router.replace('/dashboard'); return }
    if (!user.freelancerAgentId) {
      setError('Agent profile not found. Log out and back in.')
      setLoading(false); return
    }
    api.get<DashboardData>(`/freelancer-dashboard/agent/${user.freelancerAgentId}`)
      .then(d => setData(d))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-500 text-sm">Loading…</p></div>
  if (error)   return <div className="flex-1 flex items-center justify-center"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data)   return null

  const byStatus = data.byStatus || {}
  const activeStatuses = PIPELINE_ORDER.filter(s => s !== 'LOST')
  const maxActive = Math.max(...activeStatuses.map(s => byStatus[s] || 0), 1)

  return (
    <div className="flex-1 relative z-10">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">My Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Lead pipeline & applied jobs overview</p>
      </div>

      <div className="px-6 py-5 space-y-5 max-w-3xl">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Leads"   value={data.totalLeads}   sub="all time"        color="#a78bfa" />
          <StatCard label="Active"        value={data.activeLeads}  sub="in pipeline"     color="#a5b4fc" />
          <StatCard label="Hired"         value={data.wonLeads}     sub="projects won"    color="#4ade80" />
          <StatCard label="Applied Jobs"  value={data.totalApplied} sub="URLs logged"     color="#fbbf24" />
        </div>

        {/* Lead pipeline */}
        <div className="rounded-xl p-5" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Lead Pipeline</p>
            </div>
            <Link href="/freelancer/leads" className="text-[11px] text-violet-500/60 hover:text-violet-400 transition-colors flex items-center gap-1">
              Manage leads <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {PIPELINE_ORDER.map(s => {
              const count = byStatus[s] || 0
              const color = STATUS_COLORS[s]
              const pct = s !== 'LOST' ? Math.round((count / maxActive) * 100) : 0
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 w-28 shrink-0">{STATUS_LABELS[s]}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden relative" style={{ background: 'rgba(100,116,139,0.1)' }}>
                    {count > 0 && (
                      <div
                        className="h-full rounded-md flex items-center px-2 transition-all"
                        style={{ width: s === 'LOST' ? `${Math.max(8, (count / Math.max(data.totalLeads, 1)) * 100)}%` : `${Math.max(8, pct)}%`, background: `${color}22`, border: `1px solid ${color}30` }}
                      >
                        <span className="text-[10px] font-mono font-bold" style={{ color }}>{count}</span>
                      </div>
                    )}
                    {count === 0 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-700">0</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Recent leads */}
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-slate-500" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Recent Leads</p>
              </div>
              <Link href="/freelancer/leads" className="text-[10px] text-violet-500/60 hover:text-violet-400 transition-colors">All →</Link>
            </div>
            <div className="space-y-2">
              {data.recentLeads.length === 0 ? (
                <p className="text-[11px] text-slate-600 py-4 text-center">No leads yet</p>
              ) : data.recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-2.5 py-1.5 border-b border-[var(--bord)] last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[lead.status] || '#64748b' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-300 truncate">{lead.clientName}</p>
                    {lead.jobDescription && <p className="text-[10px] text-slate-600 truncate">{lead.jobDescription}</p>}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: `${STATUS_COLORS[lead.status]}15`, color: STATUS_COLORS[lead.status] }}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent applied jobs */}
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LinkIcon size={13} className="text-slate-500" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Applied Jobs</p>
              </div>
              <Link href="/freelancer/applied" className="text-[10px] text-violet-500/60 hover:text-violet-400 transition-colors">All →</Link>
            </div>
            <div className="space-y-2">
              {data.recentApplied.length === 0 ? (
                <p className="text-[11px] text-slate-600 py-4 text-center">No URLs logged yet</p>
              ) : data.recentApplied.map((job: any) => (
                <div key={job.id} className="flex items-center gap-2.5 py-1.5 border-b border-[var(--bord)] last:border-0">
                  <div className="flex-1 min-w-0">
                    {job.title && <p className="text-[12px] font-medium text-slate-300 truncate">{job.title}</p>}
                    <p className={`truncate ${job.title ? 'text-[10px] text-slate-600' : 'text-[12px] text-slate-400'}`}>{job.url}</p>
                  </div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-violet-400 transition-colors shrink-0">
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
