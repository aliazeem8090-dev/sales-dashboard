'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { RefreshCw, ChevronDown, ChevronUp, Briefcase, Link as LinkIcon } from 'lucide-react'

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

interface AgentSummary {
  agentId: string
  name: string
  totalLeads: number
  totalApplied: number
  activeLeads: number
  wonLeads: number
  byStatus: Record<string, number>
}

export default function ManagerFreelancerPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      router.replace('/dashboard'); return
    }
    fetchAgents()
  }, [])

  async function fetchAgents() {
    setLoading(true)
    try {
      const data = await api.get<AgentSummary[]>('/freelancer-dashboard/all')
      setAgents(data)
    } catch { } finally { setLoading(false) }
  }

  const totalLeads   = agents.reduce((s, a) => s + a.totalLeads, 0)
  const totalApplied = agents.reduce((s, a) => s + a.totalApplied, 0)
  const totalWon     = agents.reduce((s, a) => s + a.wonLeads, 0)

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Freelancer Agents</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} · {totalLeads} leads · {totalApplied} applied · {totalWon} hired
            </p>
          </div>
          <button onClick={fetchAgents} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-3">
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading agents…</p>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-10 text-center" style={{ background: 'var(--ink2)' }}>
            <p className="text-slate-500 text-sm">No freelancer agents yet.</p>
            <p className="text-xs text-slate-600 mt-1">Add agents from the Team page.</p>
          </div>
        ) : agents.map(agent => {
          const isExpanded = expandedId === agent.agentId
          const byStatus = agent.byStatus || {}
          const conversionRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0

          return (
            <div key={agent.agentId} className="rounded-xl" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
              {/* Agent header row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-5">
                  {[
                    { label: 'Leads',   value: agent.totalLeads,   color: '#a78bfa' },
                    { label: 'Active',  value: agent.activeLeads,  color: '#a5b4fc' },
                    { label: 'Hired',   value: agent.wonLeads,     color: '#4ade80' },
                    { label: 'Applied', value: agent.totalApplied, color: '#fbbf24' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-slate-600">{s.label}</p>
                    </div>
                  ))}
                  <div className="text-center">
                    <p className={`text-sm font-bold ${conversionRate >= 20 ? 'text-emerald-400' : conversionRate >= 10 ? 'text-amber-400' : 'text-slate-400'}`}>{conversionRate}%</p>
                    <p className="text-[10px] text-slate-600">Conv.</p>
                  </div>
                </div>

                <button onClick={() => setExpandedId(isExpanded ? null : agent.agentId)} className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors ml-2">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Pipeline breakdown */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 space-y-4" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                  <div>
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-3">Lead Pipeline Breakdown</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PIPELINE_ORDER.map(s => {
                        const count = byStatus[s] || 0
                        const color = STATUS_COLORS[s]
                        return (
                          <div key={s} className="rounded-lg px-3 py-2.5 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                            <p className="text-lg font-bold font-mono" style={{ color }}>{count}</p>
                            <p className="text-[9px] text-slate-600 mt-0.5">{STATUS_LABELS[s]}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <div className="flex items-center gap-2">
                      <Briefcase size={12} className="text-slate-500" />
                      <span className="text-[11px] text-slate-400">{agent.totalLeads} total leads logged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon size={12} className="text-slate-500" />
                      <span className="text-[11px] text-slate-400">{agent.totalApplied} job URLs logged</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
