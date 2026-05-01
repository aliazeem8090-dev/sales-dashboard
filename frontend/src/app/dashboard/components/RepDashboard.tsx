'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import {
  TrendingUp, MessageSquare, Eye, Briefcase, XCircle,
  Zap, CheckCircle, Activity, AlertTriangle, Bell, Kanban,
  Target, CheckCircle2, XCircle as XCircleIcon
} from 'lucide-react'

function StatCard({
  label, value, sub, color = 'violet', icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'violet' | 'blue' | 'emerald' | 'red' | 'amber' | 'slate'
  icon?: any
}) {
  const colors = {
    violet:  'border-violet-500/20 bg-violet-500/5 text-violet-400',
    blue:    'border-blue-500/20 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    red:     'border-red-500/20 bg-red-500/5 text-red-400',
    amber:   'border-amber-500/20 bg-amber-500/5 text-amber-400',
    slate:   'border-slate-600/30 bg-slate-800/30 text-slate-400',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{label}</p>
        {Icon && <Icon size={14} className="opacity-50" />}
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function FunnelBar({ label, value, max, pct }: { label: string; value: number; max: number; pct: number }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] w-20 text-right shrink-0" style={{ color: 'var(--t3)' }}>{label}</span>
      <div className="flex-1 h-4 rounded overflow-hidden border" style={{ background: 'var(--surface2)', borderColor: 'var(--bord)' }}>
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded flex items-center justify-end pr-1.5 transition-all duration-700"
          style={{ width: `${width}%`, minWidth: value > 0 ? '2rem' : '0' }}
        >
          {value > 0 && <span className="text-white text-[9px] font-semibold">{pct}%</span>}
        </div>
      </div>
      <span className="text-xs font-mono font-semibold w-6 text-right shrink-0" style={{ color: 'var(--t2)' }}>{value}</span>
    </div>
  )
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/20 text-red-400',
  HIGH:     'bg-amber-500/10 border-amber-500/20 text-amber-400',
  MEDIUM:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  LOW:      'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-amber-400',
  MEDIUM:   'bg-yellow-400',
  LOW:      'bg-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  SENT:      'text-slate-400',
  VIEWED:    'text-blue-400',
  REPLIED:   'text-indigo-400',
  INTERVIEW: 'text-violet-400',
  HIRED:     'text-emerald-400',
  LOST:      'text-red-400',
  REJECTED:  'text-red-400',
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

function kpiStatus(actual: number, target: number, higherIsBetter: boolean): 'pass' | 'warn' | 'fail' {
  if (target === 0) return 'pass'
  const ratio = higherIsBetter ? actual / target : target / actual
  if (ratio >= 1) return 'pass'
  if (ratio >= 0.75) return 'warn'
  return 'fail'
}

const KPI_STATUS_STYLES = {
  pass: { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'Met', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  warn: { bar: 'bg-amber-500',   text: 'text-amber-400',   label: 'Close', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  fail: { bar: 'bg-red-500',     text: 'text-red-400',     label: 'Below', badge: 'bg-red-500/10 border-red-500/20 text-red-400' },
}

interface KpiRowProps {
  label: string
  actual: number
  target: number
  higherIsBetter: boolean
  formatActual: (v: number) => string
  formatTarget: (v: number) => string
}
function KpiRow({ label, actual, target, higherIsBetter, formatActual, formatTarget }: KpiRowProps) {
  const status = kpiStatus(actual, target, higherIsBetter)
  const styles = KPI_STATUS_STYLES[status]
  const pct = target === 0 ? 100 : higherIsBetter
    ? Math.min(100, Math.round((actual / target) * 100))
    : Math.min(100, Math.round((target / actual) * 100)) || (actual === 0 ? 100 : 0)

  return (
    <div className="grid grid-cols-12 items-center gap-2 py-2.5 last:border-0" style={{ borderBottom: '1px solid var(--bord)' }}>
      <div className="col-span-4">
        <p className="text-xs" style={{ color: 'var(--t2)' }}>{label}</p>
      </div>
      <div className="col-span-5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className={`h-full rounded-full transition-all duration-700 ${styles.bar}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10px] font-mono font-semibold w-16 text-right ${styles.text}`}>{formatActual(actual)}</span>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>{target > 0 ? formatTarget(target) : '—'}</span>
      </div>
      <div className="col-span-1 flex justify-end">
        {status === 'pass'
          ? <CheckCircle2 size={12} className="text-emerald-400" />
          : status === 'warn'
          ? <AlertTriangle size={12} className="text-amber-400" />
          : <XCircleIcon size={12} className="text-red-400" />
        }
      </div>
    </div>
  )
}

export function RepDashboard() {
  const user = getStoredUser()
  const [data, setData] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [dash, ins] = await Promise.all([
          api.get<any>('/dashboard/rep-self'),
          user?.repId
            ? api.get<any[]>(`/coaching-insights/rep/${user.repId}`).catch(() => [])
            : Promise.resolve([]),
        ])
        setData(dash)
        setInsights((ins as any[]).slice(0, 5))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--v1)' }} />
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--v1)', animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--v1)', animationDelay: '300ms' }} />
          <span className="text-xs ml-2" style={{ color: 'var(--t3)' }}>Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--t3)' }}>No data found. Make sure your account has a rep profile.</p>
      </div>
    )
  }

  const total = data.totalProposals || 0
  const managerNotes = insights.filter((i: any) => i.insightType === 'MANAGER_NOTE' && !i.isRead)
  const aiAlerts = insights.filter((i: any) => i.insightType !== 'MANAGER_NOTE' && !i.isRead)

  return (
    <div className="p-6 space-y-6 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>
            Welcome back, <span style={{ color: 'var(--v2)' }}>{data.name}</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
            {data.proposalsThisWeek} proposal{data.proposalsThisWeek !== 1 ? 's' : ''} this week
            {data.currentConnects !== undefined && (
              <> · <span className={data.currentConnects < 10 ? 'text-red-400' : ''} style={data.currentConnects >= 10 ? { color: 'var(--t2)' } : {}}>
                {data.currentConnects} connects remaining
              </span></>
            )}
          </p>
        </div>
        <Link
          href="/board"
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--v1a)', border: '1px solid rgba(124,111,255,0.3)', color: 'var(--v2)' }}
        >
          <Kanban size={13} />
          My Board
        </Link>
      </div>

      {/* Assigned Profiles */}
      {data.assignedProfiles?.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={13} style={{ color: 'var(--v1)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>Your Assigned Profiles</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.assignedProfiles.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--bord2)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--v1)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{p.title}</p>
                  <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{p.niche}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Proposals" value={total} sub={`${data.proposalsThisWeek} this week`} color="violet" icon={TrendingUp} />
        <StatCard label="Viewed" value={data.viewed || 0} sub={`${data.viewRate || 0}% view rate`} color="blue" icon={Eye} />
        <StatCard label="Replied" value={data.replied || 0} sub={`${data.replyRate || 0}% reply rate`} color="violet" icon={MessageSquare} />
        <StatCard label="Interviews" value={data.interviews || 0} sub={`${data.interviewRate || 0}% of proposals`} color="amber" icon={Briefcase} />
        <StatCard label="Closed" value={data.hires || 0} sub={`${data.hireRate || 0}% hire rate`} color="emerald" icon={CheckCircle} />
        <StatCard label="Lost" value={data.lost || 0} sub="Rejected or lost" color="red" icon={XCircle} />
        <StatCard label="Connects Used" value={data.connectsUsed || 0} sub={`${data.currentConnects || 0} remaining`} color="amber" icon={Zap} />
        <StatCard label="Consistency" value={`${data.consistencyScore || 0}%`} sub={`Last activity: ${formatDate(data.lastActivityDate)}`} color="slate" icon={Activity} />
      </div>

      {/* KPI Performance */}
      {(() => {
        const t = data.targets || {}
        const dailyTarget      = t.dailyProposalTarget ?? t.dailyProposals ?? 5
        const minViewRate      = t.acceptableViewRate      ?? 20
        const minInterviewRate = t.acceptableInterviewRate ?? 5
        const minClosingRate   = t.acceptableClosingRate   ?? 3
        const mrrGoal          = t.mrrGoal                ?? 500
        const connectsLimit    = t.monthlyConnectsLimit    ?? 150

        const dailyActual    = Math.round((data.totalProposals / 30) * 10) / 10
        const earningsActual = data.earningsThisMonth || 0
        const connectsActual = data.connectsUsed || 0

        const kpis = [
          { label: 'Daily Proposals',  actual: dailyActual,        target: dailyTarget,      higherIsBetter: true,  fa: (v: number) => `${v}/day`,     ft: (v: number) => `${v}/day`  },
          { label: 'View Rate',        actual: data.viewRate || 0,  target: minViewRate,      higherIsBetter: true,  fa: (v: number) => `${v.toFixed(1)}%`, ft: (v: number) => `${v}%` },
          { label: 'Interview Rate',   actual: data.interviewRate || 0, target: minInterviewRate, higherIsBetter: true, fa: (v: number) => `${v.toFixed(1)}%`, ft: (v: number) => `${v}%` },
          { label: 'Closing Rate',     actual: data.hireRate || 0,  target: minClosingRate,   higherIsBetter: true,  fa: (v: number) => `${v.toFixed(1)}%`, ft: (v: number) => `${v}%` },
          { label: 'MRR Goal',         actual: earningsActual,      target: mrrGoal,          higherIsBetter: true,  fa: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, ft: (v: number) => `$${v}` },
          { label: 'Connects Budget',  actual: connectsActual,      target: connectsLimit,    higherIsBetter: false, fa: (v: number) => `${v} used`,    ft: (v: number) => `${v} max` },
        ]

        const statuses = kpis.map(k => kpiStatus(k.actual, k.target, k.higherIsBetter))
        const overall = statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass'
        const overallStyle = KPI_STATUS_STYLES[overall]
        const metCount = statuses.filter(s => s === 'pass').length

        return (
          <div className={`rounded-xl border overflow-hidden ${overall === 'fail' ? 'border-red-500/20' : overall === 'warn' ? 'border-amber-500/20' : 'border-emerald-500/20'}`} style={{ background: 'var(--surface)' }}>
            <div className={`flex items-center justify-between px-5 py-3 border-b ${overall === 'fail' ? 'border-red-500/20 bg-red-500/5' : overall === 'warn' ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="flex items-center gap-2">
                <Target size={14} className={overallStyle.text} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t1)' }}>KPI Performance</h2>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${overallStyle.badge}`}>
                {metCount}/{kpis.length} KPIs Met
              </span>
            </div>
            <div className="px-5 py-1">
              <div className="flex items-center gap-1 py-1.5 mb-0.5">
                <span className="col-span-4 text-[9px] uppercase tracking-wider w-1/3" style={{ color: 'var(--t3)' }}>KPI</span>
                <span className="text-[9px] uppercase tracking-wider flex-1 pl-2" style={{ color: 'var(--t3)' }}>Progress</span>
                <span className="text-[9px] uppercase tracking-wider w-16 text-right" style={{ color: 'var(--t3)' }}>Target</span>
                <span className="w-4" />
              </div>
              {kpis.map(k => (
                <KpiRow
                  key={k.label}
                  label={k.label}
                  actual={k.actual}
                  target={k.target}
                  higherIsBetter={k.higherIsBetter}
                  formatActual={k.fa}
                  formatTarget={k.ft}
                />
              ))}
            </div>
          </div>
        )
      })()}

      {/* Middle row: funnel + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--t2)' }}>Proposal Funnel</h2>
          <div className="space-y-2.5">
            <FunnelBar label="Sent" value={total} max={total} pct={100} />
            <FunnelBar label="Viewed" value={data.viewed || 0} max={total} pct={data.viewRate || 0} />
            <FunnelBar label="Replied" value={data.replied || 0} max={total} pct={data.replyRate || 0} />
            <FunnelBar label="Interview" value={data.interviews || 0} max={total} pct={data.interviewRate || 0} />
            <FunnelBar label="Closed" value={data.hires || 0} max={total} pct={data.hireRate || 0} />
          </div>
        </div>

        {/* Alerts + Manager Notes */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>Alerts & Notes</h2>
            <Bell size={13} style={{ color: 'var(--t3)' }} />
          </div>

          {managerNotes.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-medium text-violet-400 uppercase tracking-wider mb-1.5">From Manager</p>
              <div className="space-y-1.5">
                {managerNotes.map((n: any) => (
                  <div key={n.id} className={`p-2.5 rounded-lg border text-[11px] ${SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.LOW}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[n.severity] || 'bg-slate-400'}`} />
                      <span className="font-semibold uppercase text-[9px] tracking-wider opacity-70">{n.severity}</span>
                      <span className="text-[9px] opacity-40 ml-auto">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="leading-relaxed">{n.generatedInsight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiAlerts.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'rgba(124,111,255,0.7)' }}>Coaching Alerts</p>
              <div className="space-y-1.5">
                {aiAlerts.map((a: any) => (
                  <div key={a.id} className={`p-2.5 rounded-lg border text-[11px] ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[a.severity] || 'bg-slate-400'}`} />
                      <span className="font-semibold uppercase text-[9px] tracking-wider opacity-70">{a.severity}</span>
                      <span className="text-[9px] opacity-40 ml-auto">{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="leading-relaxed">{a.generatedInsight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.filter(i => !i.isRead).length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle size={20} className="text-emerald-500/40 mb-2" />
              <p className="text-xs" style={{ color: 'var(--t3)' }}>No unread alerts</p>
            </div>
          )}

          {insights.length > 0 && (
            <Link href="/insights" className="block mt-3 text-center text-[10px] transition-colors" style={{ color: 'rgba(124,111,255,0.6)' }}>
              View all insights →
            </Link>
          )}
        </div>
      </div>

      {/* Recent proposals */}
      {data.recentProposals?.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>Recent Proposals</h2>
            <Link href="/board" className="text-[10px] transition-colors" style={{ color: 'rgba(124,111,255,0.6)' }}>View board →</Link>
          </div>
          <div className="space-y-1">
            {data.recentProposals.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: '1px solid var(--bord)' }}>
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs truncate" style={{ color: 'var(--t1)' }}>{p.job?.title || p.jobId}</p>
                  <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{formatDate(p.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--t3)' }}>
                    <Zap size={9} className="text-amber-500" />
                    {p.connectsUsed || 0}
                  </span>
                  <span className={`text-[10px] font-semibold ${STATUS_COLORS[p.status] || 'text-slate-400'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
