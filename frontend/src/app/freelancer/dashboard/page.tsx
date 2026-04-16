'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import {
  CheckCircle2, AlertTriangle, XCircle, Info,
  FileText, MessageSquare, Users, Trophy,
} from 'lucide-react'

const STATUS_STYLES = {
  pass: { color: '#4ade80', icon: CheckCircle2 },
  warn: { color: '#facc15', icon: AlertTriangle },
  fail: { color: '#f87171', icon: XCircle },
}
const ALERT_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#f87171' },
  warn:     { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.25)', color: '#facc15' },
  info:     { bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.25)',  color: '#67e8f9' },
}
const FUNNEL_COLORS: Record<string, string> = {
  FOUND: '#64748b', APPLIED: '#67e8f9', VIEWED: '#a5b4fc',
  REPLIED: '#818cf8', INTERVIEW: '#fb923c', HIRED: '#4ade80', LOST: '#f87171',
}

function KpiRow({ label, actual, target, unit = '', status, higherIsBetter }: {
  label: string; actual: number; target: number; unit?: string;
  status: 'pass' | 'warn' | 'fail'; higherIsBetter: boolean;
}) {
  const { color, icon: Icon } = STATUS_STYLES[status]
  const pct = target > 0 ? Math.min(100, Math.round((higherIsBetter ? actual / target : target / actual) * 100)) : 100
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={13} style={{ color, flexShrink: 0 }} />
      <span className="text-xs text-slate-400 w-44 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-20 text-right" style={{ color }}>
        {actual}{unit} / {target}{unit}
      </span>
    </div>
  )
}

export default function FreelancerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') { router.replace('/dashboard'); return }
    if (!user.freelancerAgentId) {
      setError('Agent profile not found. Please log out and log back in.')
      setLoading(false); return
    }
    api.get(`/freelancer-dashboard/agent/${user.freelancerAgentId}`)
      .then((d: any) => setData(d))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-500 text-sm">Loading dashboard…</p></div>
  if (error)   return <div className="flex-1 flex items-center justify-center"><p className="text-red-400 text-sm">{error}</p></div>

  const { stats, kpis, alerts, trend, today, targets, followUpRequired } = data
  const kpiArr    = Object.values(kpis as Record<string, any>)
  const kpisMet   = kpiArr.filter((k: any) => k.status === 'pass').length
  const overallColor = kpisMet === kpiArr.length ? '#4ade80' : kpisMet >= kpiArr.length * 0.75 ? '#facc15' : '#f87171'

  const funnelStages = [
    { label: 'Applied',   value: stats.applied,     key: 'APPLIED' },
    { label: 'Viewed',    value: stats.viewed,      key: 'VIEWED' },
    { label: 'Replied',   value: stats.replied,     key: 'REPLIED' },
    { label: 'Interview', value: stats.interviewed, key: 'INTERVIEW' },
    { label: 'Hired',     value: stats.hired,       key: 'HIRED' },
  ]
  const maxFunnel = Math.max(...funnelStages.map(f => f.value), 1)

  return (
    <div className="flex-1 relative z-10">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', background: '#07080d' }}>
        <h1 className="text-lg font-semibold text-slate-200">Freelancer Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">30-day rolling performance</p>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a: any, i: number) => {
              const s = ALERT_STYLES[a.level as keyof typeof ALERT_STYLES]
              return (
                <div key={i} className="flex items-start gap-2 px-4 py-2.5 rounded-lg text-xs" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <Info size={12} style={{ color: s.color, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: s.color }}>{a.message}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Proposals Sent',    value: stats.totalProposals,  icon: FileText },
            { label: 'Client Replies',    value: stats.totalReplies,    icon: MessageSquare },
            { label: 'Interviews',        value: stats.totalInterviews, icon: Users },
            { label: 'Deals Closed',      value: stats.totalDeals,      icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}>
              <Icon size={14} className="text-cyan-500 mb-2" />
              <p className="text-xl font-bold text-slate-100">{value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Rate cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Response Rate',  value: stats.responseRate,  target: targets.minResponseRate,  unit: '%' },
            { label: 'Interview Rate', value: stats.interviewRate, target: targets.minInterviewRate, unit: '%' },
            { label: 'Hire Rate',      value: stats.hireRate,      target: targets.minHireRate,      unit: '%' },
          ].map(({ label, value, target, unit }) => {
            const color = value >= target ? '#4ade80' : value >= target * 0.75 ? '#facc15' : '#f87171'
            return (
              <div key={label} className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}{unit}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Target: {target}{unit}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KPI panel */}
          <div className="rounded-xl p-4" style={{ background: '#0a0b10', border: `1px solid ${overallColor}33` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">KPI Performance</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${overallColor}15`, color: overallColor, border: `1px solid ${overallColor}40` }}>
                {kpisMet}/{kpiArr.length} Met
              </span>
            </div>
            <KpiRow label="Avg Daily Proposals"   actual={stats.avgDailyProposals}        target={targets.dailyProposalTarget} status={kpis.dailyProposals.status}     higherIsBetter={true} />
            <KpiRow label="Response Rate"          actual={stats.responseRate}             target={targets.minResponseRate}     status={kpis.responseRate.status}       higherIsBetter={true} unit="%" />
            <KpiRow label="Interview Rate"         actual={stats.interviewRate}            target={targets.minInterviewRate}    status={kpis.interviewRate.status}      higherIsBetter={true} unit="%" />
            <KpiRow label="Hire Rate"              actual={stats.hireRate}                 target={targets.minHireRate}         status={kpis.hireRate.status}           higherIsBetter={true} unit="%" />
            <KpiRow label="Follow-up Compliance"   actual={stats.followUpComplianceActual} target={targets.followUpCompliance}  status={kpis.followUpCompliance.status} higherIsBetter={true} unit="%" />
          </div>

          {/* Follow-up required */}
          <div className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(250,204,21,0.15)' }}>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
              Follow-up Required
              {followUpRequired.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                  {followUpRequired.length}
                </span>
              )}
            </p>
            {followUpRequired.length === 0 ? (
              <p className="text-slate-600 text-xs py-4 text-center">No overdue follow-ups</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {followUpRequired.map((job: any) => {
                  const days = Math.floor((Date.now() - new Date(job.appliedAt).getTime()) / 86400000)
                  return (
                    <div key={job.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.1)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-300 font-medium truncate">{job.jobTitle || 'Untitled'}</p>
                        <p className="text-[10px] text-slate-500">{job.clientName || 'No client'}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 flex-shrink-0" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                        {days}d ago
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Proposal funnel */}
        <div className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}>
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Proposal Funnel</p>
          <div className="space-y-2">
            {funnelStages.map(({ label, value, key }) => {
              const pct = Math.round((value / maxFunnel) * 100)
              const color = FUNNEL_COLORS[key]
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-16 text-right">{label}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'rgba(100,116,139,0.08)' }}>
                    <div className="h-full rounded-md flex items-center px-2 transition-all" style={{ width: `${Math.max(pct, 4)}%`, background: `${color}30`, border: `1px solid ${color}50` }}>
                      <span className="text-[10px] font-semibold" style={{ color }}>{value}</span>
                    </div>
                  </div>
                  {maxFunnel > 0 && value > 0 && (
                    <span className="text-[10px] text-slate-600 w-10 text-right">
                      {Math.round((value / (funnelStages[0]?.value || 1)) * 100)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
            <span className="text-[11px] text-slate-500">{stats.lost} lost</span>
            <span className="text-[11px] text-slate-500">·</span>
            <span className="text-[11px] text-slate-500">{stats.totalJobs} total tracked</span>
          </div>
        </div>

        {/* 14-day trend */}
        <div className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}>
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">14-Day Activity Trend</p>
          <div className="flex items-end gap-1 h-20">
            {trend.map((d: any, i: number) => {
              const maxP = Math.max(...trend.map((t: any) => t.proposals), 1)
              const h = Math.round((d.proposals / maxP) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm transition-all" title={`${d.date}: ${d.proposals} proposals, ${d.replies} replies`}
                    style={{ height: `${Math.max(h, 2)}%`, minHeight: 2, background: d.proposals > 0 ? 'rgba(6,182,212,0.6)' : 'rgba(100,116,139,0.15)' }} />
                  {i % 3 === 0 && <span className="text-[9px] text-slate-600 truncate" style={{ maxWidth: 28 }}>{d.date.slice(5)}</span>}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(6,182,212,0.6)' }} /> Proposals sent
            </span>
          </div>
        </div>

        {/* Today's activity */}
        {today && (
          <div className="rounded-xl p-4" style={{ background: '#0a0b10', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-3">Today's Activity</p>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {[
                { label: 'Jobs Found',   value: today.jobsFound },
                { label: 'Filtered',     value: today.jobsFiltered },
                { label: 'Proposals',    value: today.proposalsSent },
                { label: 'Replies',      value: today.clientReplies },
                { label: 'Follow-ups',   value: today.followUpsSent },
                { label: 'Interviews',   value: today.interviewsBooked },
                { label: 'Deals',        value: today.dealsClosed },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold text-slate-100">{value}</p>
                  <p className="text-[9px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {today.notes && <p className="text-xs text-slate-500 mt-3 italic">"{today.notes}"</p>}
            {today.managerComment && (
              <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                <span className="text-green-400 font-medium">Manager:</span>
                <span className="text-slate-400 ml-1">{today.managerComment}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
