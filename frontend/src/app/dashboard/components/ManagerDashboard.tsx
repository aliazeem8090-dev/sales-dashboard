'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Users, AlertTriangle, BarChart2,
  Briefcase, ChevronRight, Clock, Network,
} from 'lucide-react'

/* ─────────────── helpers ─────────────── */

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

/* ─────────────── KPI dot ─────────────── */

function KpiDot({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const c = status === 'pass' ? '#4ade80' : status === 'warn' ? '#fbbf24' : '#f87171'
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
}

/* ─────────────── rep flags ─────────────── */

function getRepFlags(rep: any): { label: string; level: 'critical' | 'warn' | 'info' }[] {
  const flags: { label: string; level: 'critical' | 'warn' | 'info' }[] = []
  const t = rep.targets || {}
  const dailyTarget   = t.dailyProposalTarget ?? t.dailyProposals ?? 5
  const monthlyTarget = dailyTarget * 30
  const minViewRate   = t.acceptableViewRate      ?? 5
  const minIntRate    = t.acceptableInterviewRate ?? 0
  const minCloseRate  = t.acceptableClosingRate   ?? 0
  const mrrGoal       = t.mrrGoal                ?? 0
  const connsLimit    = t.monthlyConnectsLimit    ?? 0
  const mostRecent    = Math.min(daysSince(rep.lastActivityDate), daysSince(rep.lastProposalDate))

  if (rep.totalProposals < monthlyTarget)
    flags.push({ label: 'Low Activity', level: rep.totalProposals < monthlyTarget * 0.5 ? 'critical' : 'warn' })
  if (rep.totalProposals >= 10 && rep.viewRate < minViewRate)
    flags.push({ label: 'Low Visibility', level: rep.viewRate < minViewRate * 0.5 ? 'critical' : 'warn' })
  if (minIntRate > 0 && rep.totalProposals >= 10 && rep.interviewRate < minIntRate)
    flags.push({ label: 'Low Engagement', level: 'warn' })
  if (minCloseRate > 0 && rep.totalProposals >= 10 && rep.hireRate < minCloseRate)
    flags.push({ label: 'Low Conversion', level: 'warn' })
  if (mrrGoal > 0 && (rep.earningsThisMonth || 0) < mrrGoal)
    flags.push({ label: 'Below MRR Goal', level: 'warn' })
  if (connsLimit > 0 && rep.connectsUsed > connsLimit)
    flags.push({ label: 'Connects Over Budget', level: 'warn' })
  if (rep.consistencyScore < 30 && rep.consistencyScore > 0 && rep.totalProposals >= 5)
    flags.push({ label: 'Irregular Activity', level: 'warn' })
  if (mostRecent >= 5)
    flags.push({ label: 'No Recent Activity', level: 'critical' })
  return flags
}

/* ─────────────── KPI overview card ─────────────── */

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

/* ─────────────── Sales Rep compact panel ─────────────── */

function RepProgressPanel({ leaderboard, weeklySummary, days }: { leaderboard: any[]; weeklySummary: any; days: number }) {
  const router = useRouter()
  const flaggedCount = leaderboard.filter(r => getRepFlags(r).length > 0).length

  return (
    <div className="flex flex-col bg-[#0a0b10] border border-slate-800/60 rounded-xl overflow-hidden">
      {/* panel header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
        <div className="flex items-center gap-2">
          <BarChart2 size={13} className="text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Sales Reps</span>
          <span className="text-[10px] text-slate-600">{leaderboard.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={9} /> {flaggedCount}
            </span>
          )}
          <Link href="/manager/kpis" className="text-[10px] text-slate-600 hover:text-cyan-400 transition-colors">
            Details →
          </Link>
        </div>
      </div>

      {/* rep rows */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
        {leaderboard.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-8">No reps yet</p>
        ) : leaderboard.map(rep => {
          const flags   = getRepFlags(rep)
          const hasCrit = flags.some(f => f.level === 'critical')
          const hasWarn = flags.length > 0 && !hasCrit
          const dotColor = flags.length === 0 ? '#4ade80' : hasCrit ? '#f87171' : '#fbbf24'

          return (
            <div
              key={rep.userId || rep.repId}
              onClick={() => rep.repId && router.push(`/reports/${rep.repId}`)}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors ${rep.repId ? 'cursor-pointer' : ''}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
              <span className="flex-1 text-xs text-slate-300 font-medium truncate">{rep.name}</span>
              <span className="text-[11px] font-mono text-slate-500 w-12 text-right">{rep.totalProposals}p</span>
              <span className={`text-[11px] font-mono w-12 text-right ${rep.replyRate >= 20 ? 'text-emerald-400' : rep.replyRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                {rep.replyRate}%
              </span>
              <span className={`text-[11px] font-mono w-10 text-right ${rep.hireRate >= 10 ? 'text-emerald-400' : rep.hireRate >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                {rep.hireRate}%h
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-600 w-14 text-right">
                <Clock size={9} />
                {formatDate(
                  [rep.lastActivityDate, rep.lastProposalDate].filter(Boolean)
                    .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                )}
              </span>
              {rep.repId && <ChevronRight size={12} className="text-slate-700 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* footer stat */}
      {weeklySummary && (
        <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: '1px solid rgba(6,182,212,0.06)', background: '#07080d' }}>
          <span className="text-[10px] text-slate-600">This week:</span>
          <span className="text-[10px] font-mono text-slate-400">{weeklySummary.thisWeek} proposals</span>
          <span className={`text-[10px] font-mono ${weeklySummary.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {weeklySummary.change >= 0 ? '↑' : '↓'}{Math.abs(weeklySummary.change)} vs last week
          </span>
        </div>
      )}
    </div>
  )
}

/* ─────────────── LinkedIn Agent panel ─────────────── */

const LI_KPI_KEYS = ['dailyConnections', 'monthlyInMails', 'replyRate', 'conversionRate', 'leadProcessingRate']

function LinkedInProgressPanel({ agents }: { agents: any[] }) {
  return (
    <div className="flex flex-col bg-[#0a0b10] rounded-xl overflow-hidden" style={{ border: '1px solid rgba(129,140,248,0.15)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(129,140,248,0.08)' }}>
        <div className="flex items-center gap-2">
          <Network size={13} style={{ color: '#818cf8' }} />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">LinkedIn Agents</span>
          <span className="text-[10px] text-slate-600">{agents.length}</span>
        </div>
        <Link href="/manager/linkedin" className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">
          Details →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
        {agents.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-8">No LinkedIn agents yet</p>
        ) : agents.map(agent => {
          const kpis    = agent.kpis || {}
          const allPass = LI_KPI_KEYS.every(k => kpis[k]?.status === 'pass')
          const hasFail = LI_KPI_KEYS.some(k => kpis[k]?.status === 'fail')
          const dotColor = allPass ? '#4ade80' : hasFail ? '#f87171' : '#fbbf24'
          const critCount = (agent.alerts || []).filter((a: any) => a.level === 'critical').length

          return (
            <div key={agent.agentId} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
              <span className="flex-1 text-xs text-slate-300 font-medium truncate">{agent.name}</span>

              {/* key metrics */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[11px] font-mono text-slate-400">{agent.totalConnections ?? 0}</p>
                  <p className="text-[9px] text-slate-600">Conn</p>
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-mono ${(agent.replyRate ?? 0) >= 10 ? 'text-emerald-400' : (agent.replyRate ?? 0) >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {agent.replyRate ?? 0}%
                  </p>
                  <p className="text-[9px] text-slate-600">Reply</p>
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-mono ${(agent.conversionRate ?? 0) >= 5 ? 'text-emerald-400' : (agent.conversionRate ?? 0) >= 2 ? 'text-amber-400' : 'text-red-400'}`}>
                    {agent.conversionRate ?? 0}%
                  </p>
                  <p className="text-[9px] text-slate-600">Conv</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-mono text-slate-400">{agent.converted ?? 0}</p>
                  <p className="text-[9px] text-slate-600">Won</p>
                </div>
              </div>

              {/* KPI dots */}
              <div className="flex items-center gap-0.5">
                {LI_KPI_KEYS.map(k => <KpiDot key={k} status={kpis[k]?.status || 'fail'} />)}
              </div>

              {critCount > 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                  {critCount}!
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* footer legend */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: '1px solid rgba(129,140,248,0.06)', background: '#07080d' }}>
        <span className="text-[10px] text-slate-600">KPIs:</span>
        {['Conn/day', 'InMail', 'Reply%', 'Conv%', 'Process%'].map((l, i) => (
          <span key={i} className="text-[10px] text-slate-600">{l}</span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Freelancer Agent panel ─────────────── */

const FL_KPI_KEYS = ['dailyProposals', 'responseRate', 'interviewRate', 'hireRate', 'followUpCompliance']

function FreelancerProgressPanel({ agents }: { agents: any[] }) {
  return (
    <div className="flex flex-col bg-[#0a0b10] rounded-xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,0.15)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(251,191,36,0.08)' }}>
        <div className="flex items-center gap-2">
          <Briefcase size={13} style={{ color: '#fbbf24' }} />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Freelancer Agents</span>
          <span className="text-[10px] text-slate-600">{agents.length}</span>
        </div>
        <Link href="/manager/freelancer" className="text-[10px] text-slate-600 hover:text-amber-400 transition-colors">
          Details →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
        {agents.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-8">No Freelancer agents yet</p>
        ) : agents.map(agent => {
          const convRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0
          const dotColor = convRate >= 20 ? '#4ade80' : convRate >= 5 ? '#fbbf24' : '#64748b'

          return (
            <div key={agent.agentId} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
              <span className="flex-1 text-xs text-slate-300 font-medium truncate">{agent.name}</span>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[11px] font-mono text-slate-400">{agent.totalLeads ?? 0}</p>
                  <p className="text-[9px] text-slate-600">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-mono text-emerald-400">{agent.wonLeads ?? 0}</p>
                  <p className="text-[9px] text-slate-600">Hired</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-mono text-amber-400">{agent.totalApplied ?? 0}</p>
                  <p className="text-[9px] text-slate-600">Applied</p>
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-mono ${convRate >= 20 ? 'text-emerald-400' : convRate >= 10 ? 'text-amber-400' : 'text-slate-400'}`}>{convRate}%</p>
                  <p className="text-[9px] text-slate-600">Conv.</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: '1px solid rgba(251,191,36,0.06)', background: '#07080d' }}>
        <span className="text-[10px] text-slate-600">Dot = conversion rate · green ≥20% · amber ≥10%</span>
      </div>
    </div>
  )
}

/* ─────────────── main component ─────────────── */

export function ManagerDashboard() {
  const router = useRouter()

  const [overview, setOverview]               = useState<any>(null)
  const [leaderboard, setLeaderboard]         = useState<any[]>([])
  const [nicheStats, setNicheStats]           = useState<any[]>([])
  const [insights, setInsights]               = useState<any[]>([])
  const [trends, setTrends]                   = useState<any[]>([])
  const [weeklySummary, setWeeklySummary]     = useState<any>(null)
  const [linkedinAgents, setLinkedinAgents]   = useState<any[]>([])
  const [freelancerAgents, setFreelancerAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  function loadData(selectedDays: number) {
    setLoading(true)
    const q = selectedDays > 0 ? `?days=${selectedDays}` : ''
    Promise.all([
      api.get<any>(`/dashboard/team-overview${q}`).catch(() => null),
      api.get<any[]>(`/dashboard/leaderboard${q}`).catch(() => []),
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

  const flaggedReps = leaderboard.filter(r => getRepFlags(r).length > 0)
  const onTrackReps = leaderboard.filter(r => getRepFlags(r).length === 0)

  return (
    <div className="p-6 space-y-6 relative z-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Team Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {leaderboard.length} sales rep{leaderboard.length !== 1 ? 's' : ''} ·{' '}
            {linkedinAgents.length} LinkedIn agent{linkedinAgents.length !== 1 ? 's' : ''} ·{' '}
            {freelancerAgents.length} freelancer agent{freelancerAgents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => { setDays(f.days); loadData(f.days) }}
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

      {/* ── TOP: Three progress panels side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RepProgressPanel leaderboard={leaderboard} weeklySummary={weeklySummary} days={days} />
        <LinkedInProgressPanel agents={linkedinAgents} />
        <FreelancerProgressPanel agents={freelancerAgents} />
      </div>

      {/* ── Team KPI summary cards (reps) ── */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Proposals"  value={overview.totalProposals}             sub={`${overview.hireRate}% hire rate`}               color="cyan"    href="/proposals?status=SENT" />
          <KPICard label="Deals Closed"     value={overview.totalHires}                 sub={`$${(overview.totalEarnings||0).toLocaleString()} earned`} color="emerald" href="/proposals?status=HIRED" />
          <KPICard label="Reply Rate"        value={`${overview.replyRate}%`}            sub={`${overview.totalReplied} replied`}               color="violet"  href="/proposals?status=REPLIED" />
          <KPICard label="View Rate"         value={`${overview.viewRate}%`}             sub={`${overview.totalViewed} viewed`}                 color="blue"    href="/proposals?status=VIEWED" />
          <KPICard label="Interviews"        value={overview.totalInterviews}            sub={`${overview.interviewRate}% rate`}                color="amber"   href="/proposals?status=INTERVIEW" />
          <KPICard label="Connects Used"     value={overview.totalConnectsUsed}         color="slate"                                                           href="/team" />
          <KPICard label="This Week"         value={weeklySummary?.thisWeek || 0}        sub={`vs ${weeklySummary?.lastWeek || 0} last week`}   color="cyan" />
          <KPICard label="Flagged Reps"      value={flaggedReps.length}                 sub={`${onTrackReps.length} on track`}                 color={flaggedReps.length > 0 ? 'amber' : 'emerald'} href="/manager/kpis" />
        </div>
      )}

      {/* ── Detailed leaderboard + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Rep Leaderboard</h2>
            <span className="text-[10px] text-slate-600">{leaderboard.length} reps</span>
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
                            [rep.lastActivityDate, rep.lastProposalDate].filter(Boolean)
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

        {/* Sidebar */}
        <div className="space-y-4">
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
                      [rep.lastActivityDate, rep.lastProposalDate].filter(Boolean)
                        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                    )}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 14-day trend ── */}
      {trends.length > 0 && (
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">14-Day Proposal Trend (Reps)</h2>
          <div className="flex items-end gap-1 h-16">
            {(() => {
              const maxVal = Math.max(...trends.map((t: any) => t.proposals), 1)
              return trends.map((t: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group">
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
