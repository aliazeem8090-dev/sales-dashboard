'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  TrendingUp, Users, CheckCircle, MessageSquare, Eye,
  Briefcase, Zap, DollarSign, AlertTriangle, BarChart2,
  Activity, ChevronRight, Clock, Network, UserSearch,
} from 'lucide-react'

/* ─────────────────── shared helpers ─────────────────── */

function daysSince(date: string | Date | null): number {
  if (!date) return Infinity
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: string | Date | null) {
  if (!d) return 'Never'
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

const FLAG_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warn:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const TIME_FILTERS = [
  { label: '7D',  days: 7  },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'All', days: 0  },
]

/* ─────────────────── KPI status dot ─────────────────── */

function KpiDot({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const c = status === 'pass' ? '#4ade80' : status === 'warn' ? '#fbbf24' : '#f87171'
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />
}

/* ─────────────────── rep flag logic ─────────────────── */

function getRepFlags(rep: any): { label: string; level: 'critical' | 'warn' | 'info' }[] {
  const flags: { label: string; level: 'critical' | 'warn' | 'info' }[] = []
  const t = rep.targets || {}
  const dailyTarget      = t.dailyProposalTarget ?? t.dailyProposals ?? 5
  const monthlyTarget    = dailyTarget * 30
  const minViewRate      = t.acceptableViewRate      ?? 5
  const minInterviewRate = t.acceptableInterviewRate ?? 0
  const minClosingRate   = t.acceptableClosingRate   ?? 0
  const mrrGoal          = t.mrrGoal                ?? 0
  const connectsLimit    = t.monthlyConnectsLimit    ?? 0
  const daysLog          = daysSince(rep.lastActivityDate)
  const daysProposal     = daysSince(rep.lastProposalDate)
  const mostRecentActivity = Math.min(daysLog, daysProposal)
  if (rep.totalProposals < monthlyTarget)
    flags.push({ label: 'Low Activity', level: rep.totalProposals < monthlyTarget * 0.5 ? 'critical' : 'warn' })
  if (rep.totalProposals >= 10 && rep.viewRate < minViewRate)
    flags.push({ label: 'Low Visibility', level: rep.viewRate < minViewRate * 0.5 ? 'critical' : 'warn' })
  if (minInterviewRate > 0 && rep.totalProposals >= 10 && rep.interviewRate < minInterviewRate)
    flags.push({ label: 'Low Engagement', level: 'warn' })
  if (minClosingRate > 0 && rep.totalProposals >= 10 && rep.hireRate < minClosingRate)
    flags.push({ label: 'Low Conversion', level: 'warn' })
  if (mrrGoal > 0 && (rep.earningsThisMonth || 0) < mrrGoal)
    flags.push({ label: 'Below MRR Goal', level: 'warn' })
  if (connectsLimit > 0 && rep.connectsUsed > connectsLimit)
    flags.push({ label: 'Connects Over Budget', level: 'warn' })
  if (rep.consistencyScore < 30 && rep.consistencyScore > 0 && rep.totalProposals >= 5)
    flags.push({ label: 'Irregular Activity', level: 'warn' })
  if (mostRecentActivity >= 5)
    flags.push({ label: 'No Recent Activity', level: 'critical' })
  return flags
}

/* ─────────────────── KPI card ─────────────────── */

function KPICard({ label, value, sub, color = 'cyan', href }: {
  label: string; value: string | number; sub?: string
  color?: 'cyan' | 'blue' | 'violet' | 'emerald' | 'amber' | 'slate'
  href?: string
}) {
  const colors = {
    cyan:    'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    blue:    'border-blue-500/20 bg-blue-500/5 text-blue-400',
    violet:  'border-violet-500/20 bg-violet-500/5 text-violet-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    amber:   'border-amber-500/20 bg-amber-500/5 text-amber-400',
    slate:   'border-slate-600/30 bg-slate-800/30 text-slate-400',
  }
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </>
  )
  const cls = `rounded-xl border p-4 ${colors[color]} ${href ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <div className={cls}>{inner}</div>
}

/* ─────────────────── agent row (LinkedIn / Freelancer) ─────────────────── */

interface AgentRowProps {
  agent: any
  kpiKeys: string[]
  cols: { label: string; value: (a: any) => string | number; color?: (v: number) => string }[]
  detailHref: string
}

function AgentRow({ agent, kpiKeys, cols, detailHref }: AgentRowProps) {
  const critCount = (agent.alerts || []).filter((al: any) => al.level === 'critical').length
  const warnCount = (agent.alerts || []).filter((al: any) => al.level === 'warn').length
  const kpis = agent.kpis || {}
  const allPass = kpiKeys.every(k => kpis[k]?.status === 'pass')
  const hasFail = kpiKeys.some(k => kpis[k]?.status === 'fail')
  const dotColor = allPass ? '#4ade80' : hasFail ? '#f87171' : '#fbbf24'

  return (
    <tr className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
          <span className="text-xs font-medium text-slate-300">{agent.name}</span>
        </div>
      </td>
      {cols.map((c, i) => {
        const val = c.value(agent)
        const numVal = typeof val === 'number' ? val : parseFloat(val as string) || 0
        const textColor = c.color ? c.color(numVal) : 'text-slate-400'
        return (
          <td key={i} className={`py-2.5 text-right font-mono text-xs ${textColor}`}>{val}</td>
        )
      })}
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-0.5">
          {kpiKeys.map(k => <KpiDot key={k} status={kpis[k]?.status || 'fail'} />)}
        </div>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {critCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              {critCount} crit
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {warnCount} warn
            </span>
          )}
          {critCount === 0 && warnCount === 0 && (
            <span className="text-[10px] text-slate-600">—</span>
          )}
        </div>
      </td>
      <td className="py-2.5 text-right">
        <Link href={detailHref} className="text-slate-600 hover:text-cyan-400 transition-colors">
          <ChevronRight size={13} />
        </Link>
      </td>
    </tr>
  )
}

/* ─────────────────── section wrapper ─────────────────── */

function AgentSection({ title, icon: Icon, iconColor, agents, kpiKeys, cols, detailBase, emptyMsg }: {
  title: string
  icon: any
  iconColor: string
  agents: any[]
  kpiKeys: string[]
  cols: AgentRowProps['cols']
  detailBase: string
  emptyMsg: string
}) {
  if (agents.length === 0) return (
    <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color: iconColor }} />
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h2>
      </div>
      <p className="text-[11px] text-slate-600 py-2">{emptyMsg}</p>
    </div>
  )

  const criticalAgents = agents.filter(a =>
    (a.alerts || []).some((al: any) => al.level === 'critical') ||
    Object.values(a.kpis || {}).some((k: any) => k.status === 'fail')
  ).length

  return (
    <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: iconColor }} />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h2>
          <span className="text-[10px] text-slate-600">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
        </div>
        {criticalAgents > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle size={9} /> {criticalAgents} need attention
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-2 text-left text-[10px] text-slate-600 font-medium">Agent</th>
              {cols.map((c, i) => (
                <th key={i} className="pb-2 text-right text-[10px] text-slate-600 font-medium">{c.label}</th>
              ))}
              <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">KPIs</th>
              <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Alerts</th>
              <th className="pb-2 w-6" />
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <AgentRow
                key={agent.agentId}
                agent={agent}
                kpiKeys={kpiKeys}
                cols={cols}
                detailHref={detailBase}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────── main component ─────────────────── */

export function ManagerDashboard() {
  const router = useRouter()

  // Sales rep data
  const [overview, setOverview]         = useState<any>(null)
  const [leaderboard, setLeaderboard]   = useState<any[]>([])
  const [nicheStats, setNicheStats]     = useState<any[]>([])
  const [insights, setInsights]         = useState<any[]>([])
  const [trends, setTrends]             = useState<any[]>([])
  const [weeklySummary, setWeeklySummary] = useState<any>(null)

  // Agent data
  const [linkedinAgents, setLinkedinAgents]     = useState<any[]>([])
  const [freelancerAgents, setFreelancerAgents] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)

  function loadData(selectedDays: number) {
    setLoading(true)
    const daysParam = selectedDays > 0 ? `?days=${selectedDays}` : ''
    Promise.all([
      api.get<any>(`/dashboard/team-overview${daysParam}`).catch(() => null),
      api.get<any[]>(`/dashboard/leaderboard${daysParam}`).catch(() => []),
      api.get<any[]>('/dashboard/niche-stats').catch(() => []),
      api.get<any[]>('/coaching-insights/team').catch(() => []),
      api.get<any[]>(`/dashboard/team-trends?days=${selectedDays || 30}`).catch(() => []),
      api.get<any>('/dashboard/weekly-summary').catch(() => null),
      api.get<any[]>('/linkedin-dashboard/all').catch(() => []),
      api.get<any[]>('/freelancer-dashboard/all').catch(() => []),
    ]).then(([ov, lb, ns, ins, tr, ws, li, fl]) => {
      setOverview(ov)
      setLeaderboard(lb as any[])
      setNicheStats(ns as any[])
      setInsights((ins as any[]).filter((i: any) => !i.isRead).slice(0, 8))
      setTrends(tr as any[])
      setWeeklySummary(ws)
      setLinkedinAgents(li as any[])
      setFreelancerAgents(fl as any[])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData(days) }, [])

  function handleFilterChange(selectedDays: number) {
    setDays(selectedDays)
    loadData(selectedDays)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-slate-500 ml-2">Loading team dashboard…</span>
        </div>
      </div>
    )
  }

  const flaggedReps  = leaderboard.filter(r => getRepFlags(r).length > 0)
  const onTrackReps  = leaderboard.filter(r => getRepFlags(r).length === 0)

  const liKpiKeys = ['dailyConnections', 'monthlyInMails', 'replyRate', 'conversionRate', 'leadProcessingRate']
  const flKpiKeys = ['dailyProposals', 'responseRate', 'interviewRate', 'hireRate', 'followUpCompliance']

  const liCols: AgentRowProps['cols'] = [
    { label: 'Connections', value: a => a.totalConnections ?? 0 },
    { label: 'Leads',       value: a => a.totalLeads ?? 0 },
    { label: 'Replied',     value: a => a.replied ?? 0 },
    { label: 'Converted',   value: a => a.converted ?? 0 },
    {
      label: 'Reply%',
      value: a => `${a.replyRate ?? 0}%`,
      color: v => v >= 10 ? 'text-emerald-400' : v >= 5 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Conv%',
      value: a => `${a.conversionRate ?? 0}%`,
      color: v => v >= 5 ? 'text-emerald-400' : v >= 2 ? 'text-amber-400' : 'text-red-400',
    },
  ]

  const flCols: AgentRowProps['cols'] = [
    { label: 'Proposals', value: a => a.totalProposals ?? 0 },
    { label: 'Replies',   value: a => a.totalReplies ?? 0 },
    { label: 'Interviews',value: a => a.totalInterviews ?? 0 },
    { label: 'Hired',     value: a => a.totalDeals ?? 0 },
    {
      label: 'Reply%',
      value: a => `${a.responseRate ?? 0}%`,
      color: v => v >= 20 ? 'text-emerald-400' : v >= 10 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Hire%',
      value: a => `${a.hireRate ?? 0}%`,
      color: v => v >= 25 ? 'text-emerald-400' : v >= 12 ? 'text-amber-400' : 'text-red-400',
    },
  ]

  // Summary counts for header
  const liCritical = linkedinAgents.filter(a =>
    (a.alerts || []).some((al: any) => al.level === 'critical') ||
    liKpiKeys.some(k => a.kpis?.[k]?.status === 'fail')
  ).length
  const flCritical = freelancerAgents.filter(a =>
    (a.alerts || []).some((al: any) => al.level === 'critical') ||
    flKpiKeys.some(k => a.kpis?.[k]?.status === 'fail')
  ).length

  return (
    <div className="p-6 space-y-6 relative z-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Team Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {leaderboard.length} reps · {linkedinAgents.length} LinkedIn · {freelancerAgents.length} Freelancer
            {weeklySummary && (
              <> · <span className={weeklySummary.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {weeklySummary.change >= 0 ? '↑' : '↓'} {Math.abs(weeklySummary.change)} proposals vs last week
              </span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => handleFilterChange(f.days)}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${
                  days === f.days
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-600 hover:text-slate-400 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link href="/assignments" className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:border-cyan-500/40 hover:text-cyan-400 transition-colors">
            <Users size={13} />
            Assignments
          </Link>
        </div>
      </div>

      {/* ── Team KPI cards ── */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Proposals"  value={overview.totalProposals}                            sub={`${overview.hireRate}% hire rate`}        color="cyan"    href="/proposals?status=SENT" />
          <KPICard label="Deals Closed"     value={overview.totalHires}                                sub={`$${(overview.totalEarnings||0).toLocaleString()} earned`} color="emerald" href="/proposals?status=HIRED" />
          <KPICard label="Reply Rate"        value={`${overview.replyRate}%`}                          sub={`${overview.totalReplied} replied`}        color="violet"  href="/proposals?status=REPLIED" />
          <KPICard label="View Rate"         value={`${overview.viewRate}%`}                           sub={`${overview.totalViewed} viewed`}          color="blue"    href="/proposals?status=VIEWED" />
          <KPICard label="Interviews"        value={overview.totalInterviews}                          sub={`${overview.interviewRate}% rate`}         color="amber"   href="/proposals?status=INTERVIEW" />
          <KPICard label="Connects Used"     value={overview.totalConnectsUsed}                        color="slate"                                                    href="/team" />
          <KPICard label="This Week"         value={weeklySummary?.thisWeek || 0}                      sub={`vs ${weeklySummary?.lastWeek || 0} last week`} color="cyan" href="/activity/new" />
          <KPICard label="Flagged Reps"      value={flaggedReps.length}                               sub={`${onTrackReps.length} on track`}          color={flaggedReps.length > 0 ? 'amber' : 'emerald'} href="/manager/kpis" />
        </div>
      )}

      {/* ── Main grid: leaderboard + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Rep leaderboard */}
        <div className="lg:col-span-2 bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={13} className="text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Sales Rep Leaderboard</h2>
              <span className="text-[10px] text-slate-600">{leaderboard.length} reps</span>
            </div>
            <Link href="/manager/kpis" className="text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">KPI targets →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-2 text-left text-[10px] text-slate-600 font-medium w-6">#</th>
                  <th className="pb-2 text-left text-[10px] text-slate-600 font-medium">Rep</th>
                  <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Props</th>
                  <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Reply%</th>
                  <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Hire%</th>
                  <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Consistency</th>
                  <th className="pb-2 text-right text-[10px] text-slate-600 font-medium">Last Active</th>
                  <th className="pb-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(rep => {
                  const flags = getRepFlags(rep)
                  return (
                    <tr
                      key={rep.userId || rep.repId}
                      className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${rep.repId ? 'cursor-pointer' : ''}`}
                      onClick={() => rep.repId && router.push(`/reports/${rep.repId}`)}
                    >
                      <td className="py-2.5 text-slate-600 font-mono text-[10px]">{rep.rank}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-300">{rep.name}</span>
                          {flags.length > 0 && (
                            <span title={flags.map(f => f.label).join(', ')}>
                              <AlertTriangle size={10} className={flags.some(f => f.level === 'critical') ? 'text-red-400' : 'text-amber-400'} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-400">{rep.totalProposals}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold font-mono ${rep.replyRate >= 20 ? 'text-emerald-400' : rep.replyRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                          {rep.replyRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold font-mono ${rep.hireRate >= 10 ? 'text-emerald-400' : rep.hireRate >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                          {rep.hireRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${rep.consistencyScore || 0}%` }} />
                          </div>
                          <span className="text-slate-500 font-mono text-[10px]">{rep.consistencyScore || 0}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
                          <Clock size={9} />
                          {formatDate(
                            [rep.lastActivityDate, rep.lastProposalDate]
                              .filter(Boolean)
                              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {rep.repId && (
                          <Link href={`/reports/${rep.repId}`} className="text-slate-600 hover:text-cyan-400 transition-colors">
                            <ChevronRight size={13} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-600 text-xs">No rep data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Coaching alerts */}
          <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Coaching Alerts</h2>
              <Link href="/insights" className="text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">View all →</Link>
            </div>
            <div className="space-y-1.5">
              {insights.slice(0, 5).map((ins: any) => (
                <Link key={ins.id} href="/insights" className="flex items-start gap-2 py-1.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 rounded px-1 -mx-1 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                    ins.severity === 'CRITICAL' ? 'bg-red-500' :
                    ins.severity === 'HIGH'     ? 'bg-amber-400' :
                    ins.severity === 'MEDIUM'   ? 'bg-yellow-400' : 'bg-emerald-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{ins.generatedInsight}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{ins.rep?.user?.name || 'Unknown rep'}</p>
                  </div>
                </Link>
              ))}
              {insights.length === 0 && <p className="text-[11px] text-slate-600 text-center py-3">No unread alerts</p>}
            </div>
          </div>

          {/* Win rate by niche */}
          <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Win Rate by Niche</h2>
            <div className="space-y-2">
              {nicheStats.map((n: any) => (
                <div key={n.niche} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-20 truncate">{n.niche}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full" style={{ width: `${n.winRate || 0}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{n.winRate || 0}%</span>
                </div>
              ))}
              {nicheStats.length === 0 && <p className="text-[11px] text-slate-600 text-center py-2">No niche data yet</p>}
            </div>
          </div>

          {/* Quick agent health summary */}
          {(linkedinAgents.length > 0 || freelancerAgents.length > 0) && (
            <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Agent Health</h2>
              <div className="space-y-2">
                {linkedinAgents.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Network size={11} className="text-indigo-400" />
                      <span className="text-[11px] text-slate-400">LinkedIn</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {linkedinAgents.map(a => (
                        <span
                          key={a.agentId}
                          title={a.name}
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: liKpiKeys.every(k => a.kpis?.[k]?.status === 'pass') ? '#4ade80'
                              : liKpiKeys.some(k => a.kpis?.[k]?.status === 'fail') ? '#f87171' : '#fbbf24'
                          }}
                        />
                      ))}
                      {liCritical > 0 && (
                        <span className="text-[10px] text-red-400 ml-1">{liCritical} issue{liCritical > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                )}
                {freelancerAgents.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={11} className="text-amber-400" />
                      <span className="text-[11px] text-slate-400">Freelancer</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {freelancerAgents.map(a => (
                        <span
                          key={a.agentId}
                          title={a.name}
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: flKpiKeys.every(k => a.kpis?.[k]?.status === 'pass') ? '#4ade80'
                              : flKpiKeys.some(k => a.kpis?.[k]?.status === 'fail') ? '#f87171' : '#fbbf24'
                          }}
                        />
                      ))}
                      {flCritical > 0 && (
                        <span className="text-[10px] text-red-400 ml-1">{flCritical} issue{flCritical > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Flagged reps ── */}
      {flaggedReps.length > 0 && (
        <div className="bg-[#0a0b10] border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-amber-400" />
            <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
              Reps Needing Attention ({flaggedReps.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flaggedReps.map(rep => {
              const flags = getRepFlags(rep)
              return (
                <Link
                  key={rep.userId}
                  href={rep.repId ? `/reports/${rep.repId}` : '/dashboard'}
                  className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3 block hover:border-slate-600 hover:bg-slate-900/70 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">{rep.name}</span>
                    <BarChart2 size={12} className="text-slate-600" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {flags.map((f, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${FLAG_COLORS[f.level]}`}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-600">{rep.totalProposals} proposals</span>
                    <span className="text-[10px] text-slate-600">{rep.hireRate}% hire</span>
                    <span className="text-[10px] text-slate-600">{formatDate(
                      [rep.lastActivityDate, rep.lastProposalDate]
                        .filter(Boolean)
                        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                    )}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LinkedIn Agent progress ── */}
      <AgentSection
        title="LinkedIn Agent Progress"
        icon={Network}
        iconColor="#818cf8"
        agents={linkedinAgents}
        kpiKeys={liKpiKeys}
        cols={liCols}
        detailBase="/manager/linkedin"
        emptyMsg="No LinkedIn agents yet — add one from the Team page."
      />

      {/* ── Freelancer Agent progress ── */}
      <AgentSection
        title="Freelancer Agent Progress"
        icon={Briefcase}
        iconColor="#fbbf24"
        agents={freelancerAgents}
        kpiKeys={flKpiKeys}
        cols={flCols}
        detailBase="/manager/freelancer"
        emptyMsg="No Freelancer agents yet — add one from the Team page."
      />

      {/* ── 14-day proposal trend ── */}
      {trends.length > 0 && (
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">14-Day Proposal Trend (Reps)</h2>
          <div className="flex items-end gap-1 h-16">
            {(() => {
              const maxVal = Math.max(...trends.map((t: any) => t.proposals), 1)
              return trends.map((t: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group">
                  <div
                    className="w-full bg-cyan-500/40 rounded-sm group-hover:bg-cyan-400/70 transition-colors"
                    style={{ height: `${Math.max(4, Math.round((t.proposals / maxVal) * 64))}px` }}
                    title={`${t.date}: ${t.proposals}`}
                  />
                </div>
              ))
            })()}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-600">{trends[0]?.date}</span>
            <span className="text-[9px] text-slate-600">{trends[trends.length - 1]?.date}</span>
          </div>
        </div>
      )}

    </div>
  )
}
