'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  TrendingUp, Users, CheckCircle, MessageSquare, Eye,
  Briefcase, Zap, DollarSign, AlertTriangle, BarChart2,
  Activity, ChevronRight, Clock
} from 'lucide-react'

function KPICard({
  label, value, sub, color = 'cyan', onClick, href,
}: {
  label: string; value: string | number; sub?: string
  color?: 'cyan' | 'blue' | 'violet' | 'emerald' | 'amber' | 'slate'
  onClick?: () => void
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
  const isClickable = !!onClick || !!href
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </>
  )
  const cls = `rounded-xl border p-4 ${colors[color]} ${isClickable ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <div className={cls} onClick={onClick}>{inner}</div>
}

// Returns how many days ago a date was, or Infinity if null
function daysSince(date: string | Date | null): number {
  if (!date) return Infinity
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

// Underperformance flag logic — uses per-rep KPI targets when set
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

  // Most recent activity: use either proposals or activity logs, whichever is more recent
  const daysLog      = daysSince(rep.lastActivityDate)
  const daysProposal = daysSince(rep.lastProposalDate)
  const mostRecentActivity = Math.min(daysLog, daysProposal)

  // Low activity — below monthly proposal target
  if (rep.totalProposals < monthlyTarget)
    flags.push({ label: 'Low Activity', level: rep.totalProposals < monthlyTarget * 0.5 ? 'critical' : 'warn' })

  // Low visibility — view rate below target (need enough proposals for it to be meaningful)
  if (rep.totalProposals >= 10 && rep.viewRate < minViewRate)
    flags.push({ label: 'Low Visibility', level: rep.viewRate < minViewRate * 0.5 ? 'critical' : 'warn' })

  // Low engagement — interview rate below target
  if (minInterviewRate > 0 && rep.totalProposals >= 10 && rep.interviewRate < minInterviewRate)
    flags.push({ label: 'Low Engagement', level: 'warn' })

  // Low conversion — closing rate below target
  if (minClosingRate > 0 && rep.totalProposals >= 10 && rep.hireRate < minClosingRate)
    flags.push({ label: 'Low Conversion', level: 'warn' })

  // Below MRR goal
  if (mrrGoal > 0 && (rep.earningsThisMonth || 0) < mrrGoal)
    flags.push({ label: 'Below MRR Goal', level: 'warn' })

  // Connects over budget
  if (connectsLimit > 0 && rep.connectsUsed > connectsLimit)
    flags.push({ label: 'Connects Over Budget', level: 'warn' })

  // Irregular activity — only flag if there are enough activity logs to measure (≥5),
  // meaning the rep uses the activity log feature and their score is still low
  if (rep.consistencyScore < 30 && rep.consistencyScore > 0 && rep.totalProposals >= 5)
    flags.push({ label: 'Irregular Activity', level: 'warn' })

  // No recent activity — only if both proposals AND activity logs are stale/absent
  if (mostRecentActivity >= 5)
    flags.push({ label: 'No Recent Activity', level: 'critical' })

  return flags
}

const FLAG_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warn:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

function formatDate(d: string | Date | null) {
  if (!d) return 'Never'
  const date = new Date(d)
  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

const TIME_FILTERS = [
  { label: '7D',      days: 7 },
  { label: '14D',     days: 14 },
  { label: '30D',     days: 30 },
  { label: 'All',     days: 0 },
]

export function ManagerDashboard() {
  const router = useRouter()
  const [overview, setOverview] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [nicheStats, setNicheStats] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [weeklySummary, setWeeklySummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

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
    ]).then(([ov, lb, ns, ins, tr, ws]) => {
      setOverview(ov)
      setLeaderboard(lb as any[])
      setNicheStats(ns as any[])
      setInsights((ins as any[]).filter((i: any) => !i.isRead).slice(0, 8))
      setTrends(tr as any[])
      setWeeklySummary(ws)
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

  const flaggedReps = leaderboard.filter(r => getRepFlags(r).length > 0)
  const onTrackReps = leaderboard.filter(r => getRepFlags(r).length === 0)

  return (
    <div className="p-6 space-y-6 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Team Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Performance across all reps
            {weeklySummary && (
              <> · <span className={weeklySummary.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {weeklySummary.change >= 0 ? '↑' : '↓'} {Math.abs(weeklySummary.change)} proposals vs last week
              </span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time filter */}
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
          <Link
            href="/assignments"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
          >
            <Users size={13} />
            Assignments
          </Link>
        </div>
      </div>

      {/* Team KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Proposals" value={overview.totalProposals} sub={`${overview.hireRate}% hire rate`} color="cyan" href="/proposals?status=SENT" />
          <KPICard label="Deals Closed" value={overview.totalHires} sub={`$${(overview.totalEarnings || 0).toLocaleString()} earned`} color="emerald" href="/proposals?status=HIRED" />
          <KPICard label="Reply Rate" value={`${overview.replyRate}%`} sub={`${overview.totalReplied} replied`} color="violet" href="/proposals?status=REPLIED" />
          <KPICard label="View Rate" value={`${overview.viewRate}%`} sub={`${overview.totalViewed} viewed`} color="blue" href="/proposals?status=VIEWED" />
          <KPICard label="Interviews" value={overview.totalInterviews} sub={`${overview.interviewRate}% rate`} color="amber" href="/proposals?status=INTERVIEW" />
          <KPICard label="Connects Used" value={overview.totalConnectsUsed} color="slate" href="/team" />
          <KPICard label="This Week" value={weeklySummary?.thisWeek || 0} sub={`vs ${weeklySummary?.lastWeek || 0} last week`} color="cyan" href="/activity/new" />
          <KPICard
            label="Flagged Reps"
            value={flaggedReps.length}
            sub={`${onTrackReps.length} on track`}
            color={flaggedReps.length > 0 ? 'amber' : 'emerald'}
            href="/manager/kpis"
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard — takes 2 cols */}
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
                  <th className="pb-2 w-6"></th>
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
                            <div
                              className="h-full bg-cyan-500 rounded-full"
                              style={{ width: `${rep.consistencyScore || 0}%` }}
                            />
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
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-600 text-xs">No rep data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: alerts + niche */}
        <div className="space-y-4">
          {/* Unread alerts */}
          <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Coaching Alerts</h2>
              <Link href="/insights" className="text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">View all →</Link>
            </div>
            <div className="space-y-1.5">
              {insights.slice(0, 5).map((ins: any) => (
                <Link key={ins.id} href="/insights" className="flex items-start gap-2 py-1.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 rounded px-1 -mx-1 transition-colors cursor-pointer">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                    ins.severity === 'CRITICAL' ? 'bg-red-500' :
                    ins.severity === 'HIGH' ? 'bg-amber-400' :
                    ins.severity === 'MEDIUM' ? 'bg-yellow-400' : 'bg-emerald-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{ins.generatedInsight}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{ins.rep?.user?.name || 'Unknown rep'}</p>
                  </div>
                </Link>
              ))}
              {insights.length === 0 && (
                <p className="text-[11px] text-slate-600 text-center py-3">No unread alerts</p>
              )}
            </div>
          </div>

          {/* Niche performance */}
          <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Win Rate by Niche</h2>
            <div className="space-y-2">
              {nicheStats.map((n: any) => (
                <div key={n.niche} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-20 truncate">{n.niche}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full"
                      style={{ width: `${n.winRate || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{n.winRate || 0}%</span>
                </div>
              ))}
              {nicheStats.length === 0 && (
                <p className="text-[11px] text-slate-600 text-center py-2">No niche data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Underperformance flags section */}
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

      {/* 14-day trend (text-based sparkline) */}
      {trends.length > 0 && (
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">14-Day Proposal Trend</h2>
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
