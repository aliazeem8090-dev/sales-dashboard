'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import {
  TrendingUp, MessageSquare, Eye, Briefcase, XCircle,
  Zap, CheckCircle, Activity, AlertTriangle, Bell, Kanban
} from 'lucide-react'

function StatCard({
  label, value, sub, color = 'cyan', icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'cyan' | 'blue' | 'violet' | 'emerald' | 'red' | 'amber' | 'slate'
  icon?: any
}) {
  const colors = {
    cyan:    'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    blue:    'border-blue-500/20 bg-blue-500/5 text-blue-400',
    violet:  'border-violet-500/20 bg-violet-500/5 text-violet-400',
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
      <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-slate-800/60 rounded overflow-hidden border border-slate-700/30">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded flex items-center justify-end pr-1.5 transition-all duration-700"
          style={{ width: `${width}%`, minWidth: value > 0 ? '2rem' : '0' }}
        >
          {value > 0 && <span className="text-white text-[9px] font-semibold">{pct}%</span>}
        </div>
      </div>
      <span className="text-xs font-mono font-semibold text-slate-400 w-6 text-right shrink-0">{value}</span>
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
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-slate-500 ml-2">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-slate-500">No data found. Make sure your account has a rep profile.</p>
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
          <h1 className="text-lg font-semibold text-slate-200 tracking-tight">
            Welcome back, <span className="text-cyan-400">{data.name}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.proposalsThisWeek} proposal{data.proposalsThisWeek !== 1 ? 's' : ''} this week
            {data.currentConnects !== undefined && (
              <> · <span className={data.currentConnects < 10 ? 'text-red-400' : 'text-slate-400'}>
                {data.currentConnects} connects remaining
              </span></>
            )}
          </p>
        </div>
        <a
          href="/board"
          className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium rounded-lg hover:bg-cyan-500/20 transition-colors"
        >
          <Kanban size={13} />
          My Board
        </a>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Proposals" value={total} sub={`${data.proposalsThisWeek} this week`} color="cyan" icon={TrendingUp} />
        <StatCard label="Viewed" value={data.viewed || 0} sub={`${data.viewRate || 0}% view rate`} color="blue" icon={Eye} />
        <StatCard label="Replied" value={data.replied || 0} sub={`${data.replyRate || 0}% reply rate`} color="violet" icon={MessageSquare} />
        <StatCard label="Interviews" value={data.interviews || 0} sub={`${data.interviewRate || 0}% of proposals`} color="amber" icon={Briefcase} />
        <StatCard label="Closed" value={data.hires || 0} sub={`${data.hireRate || 0}% hire rate`} color="emerald" icon={CheckCircle} />
        <StatCard label="Lost" value={data.lost || 0} sub="Rejected or lost" color="red" icon={XCircle} />
        <StatCard label="Connects Used" value={data.connectsUsed || 0} sub={`${data.currentConnects || 0} remaining`} color="amber" icon={Zap} />
        <StatCard label="Consistency" value={`${data.consistencyScore || 0}%`} sub={`Last activity: ${formatDate(data.lastActivityDate)}`} color="slate" icon={Activity} />
      </div>

      {/* Middle row: funnel + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Proposal Funnel</h2>
          <div className="space-y-2.5">
            <FunnelBar label="Sent" value={total} max={total} pct={100} />
            <FunnelBar label="Viewed" value={data.viewed || 0} max={total} pct={data.viewRate || 0} />
            <FunnelBar label="Replied" value={data.replied || 0} max={total} pct={data.replyRate || 0} />
            <FunnelBar label="Interview" value={data.interviews || 0} max={total} pct={data.interviewRate || 0} />
            <FunnelBar label="Closed" value={data.hires || 0} max={total} pct={data.hireRate || 0} />
          </div>
        </div>

        {/* Alerts + Manager Notes */}
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alerts & Notes</h2>
            <Bell size={13} className="text-slate-600" />
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
              <p className="text-[10px] font-medium text-cyan-500/70 uppercase tracking-wider mb-1.5">Coaching Alerts</p>
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
              <p className="text-xs text-slate-600">No unread alerts</p>
            </div>
          )}

          {insights.length > 0 && (
            <Link href="/insights" className="block mt-3 text-center text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">
              View all insights →
            </Link>
          )}
        </div>
      </div>

      {/* Recent proposals */}
      {data.recentProposals?.length > 0 && (
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Recent Proposals</h2>
            <Link href="/board" className="text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">View board →</Link>
          </div>
          <div className="space-y-1">
            {data.recentProposals.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs text-slate-300 truncate">{p.job?.title || p.jobId}</p>
                  <p className="text-[10px] text-slate-600">{formatDate(p.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
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

      {/* Assigned profiles */}
      {data.assignedProfiles?.length > 0 && (
        <div className="bg-[#0a0b10] border border-slate-800/60 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Your Profiles</h2>
          <div className="flex flex-wrap gap-2">
            {data.assignedProfiles.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 border border-slate-700/40 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-xs text-slate-300">{p.title}</span>
                <span className="text-[10px] text-slate-500">{p.niche}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
