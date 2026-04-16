'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

// Backend returns kpis as an object map
interface KPIEntry {
  actual: number
  target: number
  higherIsBetter: boolean
  status: 'pass' | 'warn' | 'fail'
}

interface Alert {
  message: string
  level: 'critical' | 'warn' | 'info'
}

interface AgentRow {
  agentId: string
  userId: string
  name: string
  targets: Record<string, number>
  totalProposals: number
  totalReplies: number
  totalInterviews: number
  totalDeals: number
  applied: number       // active jobs count
  followUpCount: number // follow-up overdue
  kpis: Record<string, KPIEntry>
  alerts: Alert[]
}

const KPI_KEYS = ['dailyProposals', 'responseRate', 'interviewRate', 'hireRate', 'followUpCompliance'] as const
type KPIKey = typeof KPI_KEYS[number]

const KPI_LABELS: Record<KPIKey, string> = {
  dailyProposals:     'Daily Proposals',
  responseRate:       'Response Rate (%)',
  interviewRate:      'Interview Rate (%)',
  hireRate:           'Hire Rate (%)',
  followUpCompliance: 'Follow-up Compliance (%)',
}

const KPI_TARGET_KEYS: Record<KPIKey, string> = {
  dailyProposals:     'dailyProposalTarget',
  responseRate:       'minResponseRate',
  interviewRate:      'minInterviewRate',
  hireRate:           'minHireRate',
  followUpCompliance: 'followUpCompliance',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  warn:     '#fbbf24',
  info:     '#67e8f9',
}

function StatusBadge({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const cfg = {
    pass: { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  text: '#4ade80', label: 'Pass' },
    warn: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24', label: 'Warn' },
    fail: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', text: '#f87171', label: 'Fail' },
  }[status]
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      {cfg.label}
    </span>
  )
}

function KPIBar({ label, entry }: { label: string; entry: KPIEntry }) {
  const pct = Math.min(100, entry.target > 0 ? (entry.actual / entry.target) * 100 : 100)
  const barColor = entry.status === 'pass' ? '#4ade80' : entry.status === 'warn' ? '#fbbf24' : '#f87171'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-300 font-medium">{entry.actual} / {entry.target}</span>
          <StatusBadge status={entry.status} />
        </div>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  )
}

export default function ManagerFreelancerPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [targetMap, setTargetMap] = useState<Record<string, Record<string, string>>>({})
  const [savingTargets, setSavingTargets] = useState<string | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      router.replace('/dashboard')
      return
    }
    fetchAgents()
  }, [])

  async function fetchAgents() {
    setLoading(true)
    try {
      const data = await api.get<AgentRow[]>('/freelancer-dashboard/all')
      setAgents(data)
      const tm: Record<string, Record<string, string>> = {}
      data.forEach(a => {
        tm[a.agentId] = {}
        KPI_KEYS.forEach(k => {
          const targetKey = KPI_TARGET_KEYS[k]
          tm[a.agentId][targetKey] = String(a.targets?.[targetKey] ?? a.kpis?.[k]?.target ?? 0)
        })
      })
      setTargetMap(tm)
    } catch { } finally { setLoading(false) }
  }

  async function saveTargets(agentId: string) {
    setSavingTargets(agentId)
    try {
      const payload: any = {}
      Object.entries(targetMap[agentId] || {}).forEach(([k, v]) => {
        payload[k] = parseFloat(v) || 0
      })
      await api.post(`/freelancer-dashboard/targets/${agentId}`, payload)
      await fetchAgents()
    } catch { } finally { setSavingTargets(null) }
  }

  const totalCritical = agents.reduce((sum, a) => sum + a.alerts.filter(al => al.level === 'critical').length, 0)
  const allPassCount  = agents.filter(a => KPI_KEYS.every(k => a.kpis?.[k]?.status === 'pass')).length

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', background: '#07080d' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Freelancer Agents</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} · {allPassCount} all-pass · {totalCritical} critical alert{totalCritical !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={fetchAgents}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-4xl space-y-3">
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading agents…</p>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 p-10 text-center" style={{ background: '#0a0b10' }}>
            <p className="text-slate-500 text-sm">No freelancer agents yet.</p>
            <p className="text-xs text-slate-600 mt-1">Add agents from the Team page.</p>
          </div>
        ) : agents.map(agent => {
          const isExpanded = expandedId === agent.agentId
          const criticalAlerts = agent.alerts.filter(a => a.level === 'critical')
          const otherAlerts    = agent.alerts.filter(a => a.level !== 'critical')
          const allPass = KPI_KEYS.every(k => agent.kpis?.[k]?.status === 'pass')
          const hasFail = KPI_KEYS.some(k => agent.kpis?.[k]?.status === 'fail')
          const overallColor = allPass ? '#4ade80' : hasFail ? '#f87171' : '#fbbf24'

          return (
            <div key={agent.agentId} className="rounded-xl" style={{ background: '#0a0b10', border: `1px solid ${overallColor}20` }}>
              {/* Agent header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: overallColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
                    {criticalAlerts.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                        <AlertTriangle size={9} /> {criticalAlerts.length} alert{criticalAlerts.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {agent.followUpCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                        {agent.followUpCount} follow-up due
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-5">
                  {[
                    { label: 'Proposals', value: agent.totalProposals },
                    { label: 'Replies',   value: agent.totalReplies },
                    { label: 'Interviews',value: agent.totalInterviews },
                    { label: 'Hired',     value: agent.totalDeals },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-sm font-bold text-slate-200">{s.value}</p>
                      <p className="text-[10px] text-slate-600">{s.label}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => setExpandedId(isExpanded ? null : agent.agentId)} className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors ml-2">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                  <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* KPIs */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">KPI Performance (30 days)</p>
                      {KPI_KEYS.map(k => agent.kpis?.[k] ? (
                        <KPIBar key={k} label={KPI_LABELS[k]} entry={agent.kpis[k]} />
                      ) : null)}
                    </div>

                    {/* Targets editor */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">Adjust Targets</p>
                      {KPI_KEYS.map(k => {
                        const tKey = KPI_TARGET_KEYS[k]
                        return (
                          <div key={k} className="flex items-center gap-3">
                            <label className="text-[11px] text-slate-400 flex-1">{KPI_LABELS[k]}</label>
                            <input
                              type="text"
                              value={targetMap[agent.agentId]?.[tKey] ?? ''}
                              onChange={e => setTargetMap(prev => ({
                                ...prev,
                                [agent.agentId]: { ...prev[agent.agentId], [tKey]: e.target.value }
                              }))}
                              className="w-20 px-2 py-1 text-xs text-slate-200 rounded-lg text-center focus:outline-none"
                              style={{ background: '#0d0e14', border: '1px solid rgba(100,116,139,0.2)' }}
                            />
                          </div>
                        )
                      })}
                      <div className="flex justify-end">
                        <button
                          onClick={() => saveTargets(agent.agentId)}
                          disabled={savingTargets === agent.agentId}
                          className="px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}
                        >
                          {savingTargets === agent.agentId ? 'Saving…' : 'Save Targets'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {agent.alerts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">Alerts</p>
                      {[...criticalAlerts, ...otherAlerts].map((alert, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: `${SEVERITY_COLORS[alert.level]}08`, border: `1px solid ${SEVERITY_COLORS[alert.level]}25` }}>
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: SEVERITY_COLORS[alert.level] }} />
                          <p className="text-[11px]" style={{ color: SEVERITY_COLORS[alert.level] }}>{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Active Jobs',    value: agent.applied },
                      { label: 'Follow-up Due',  value: agent.followUpCount, warn: agent.followUpCount > 0 },
                      { label: 'Proposals (30d)',value: agent.totalProposals },
                      { label: 'Deals Closed',   value: agent.totalDeals },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: '#0d0e14', border: `1px solid ${s.warn ? 'rgba(251,191,36,0.2)' : 'rgba(100,116,139,0.1)'}` }}>
                        <p className="text-lg font-bold" style={{ color: s.warn ? '#fbbf24' : '#e2e8f0' }}>{s.value}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{s.label}</p>
                      </div>
                    ))}
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
