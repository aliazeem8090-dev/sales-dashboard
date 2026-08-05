'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAgentDashboard } from '@/lib/data/linkedin-dashboard'
import { getStoredUser } from '@/lib/auth'
import {
  CheckCircle2, AlertTriangle, XCircle, Info,
  TrendingUp, Users, Mail, MessageSquare, Zap, Target,
} from 'lucide-react'

const STATUS_STYLES = {
  pass: { color: '#4ade80', icon: CheckCircle2 },
  warn: { color: '#facc15', icon: AlertTriangle },
  fail: { color: '#f87171', icon: XCircle },
}

const ALERT_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#f87171' },
  warn:     { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.25)', color: '#facc15' },
  info:     { bg: 'rgba(124,111,255,0.08)',  border: 'rgba(124,111,255,0.25)',  color: '#a78bfa' },
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

export default function LinkedInDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'LINKEDIN_AGENT') {
      router.replace('/dashboard')
      return
    }
    if (!user.agentId) {
      setError('Agent profile not found. Please log out and log back in.')
      setLoading(false)
      return
    }
    getAgentDashboard(user.agentId)
      .then((d: any) => setData(d))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading dashboard…</p>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  const { stats, kpis, alerts, trend, today, targets, followUpRequired } = data

  const kpisMet = Object.values(kpis as Record<string, any>).filter((k: any) => k.status === 'pass').length
  const totalKpis = Object.keys(kpis).length
  const overallColor = kpisMet === totalKpis ? '#4ade80' : kpisMet >= totalKpis * 0.75 ? '#facc15' : '#f87171'

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">LinkedIn Dashboard</h1>
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Leads Contacted', value: stats.contacted, icon: Users },
            { label: 'Replies Received', value: stats.replied, icon: MessageSquare },
            { label: 'Converted', value: stats.converted, icon: CheckCircle2 },
            { label: 'Monthly InMails', value: `${stats.monthlyInMails}/50`, icon: Mail },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
              <Icon size={14} className="text-violet-500 mb-2" />
              <p className="text-xl font-bold text-slate-100">{value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Reply Rate</p>
            <p className="text-2xl font-bold" style={{ color: stats.replyRate >= targets.minReplyRate ? '#4ade80' : '#f87171' }}>
              {stats.replyRate}%
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">Target: {targets.minReplyRate}%</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold" style={{ color: stats.conversionRate >= targets.minConversionRate ? '#4ade80' : '#f87171' }}>
              {stats.conversionRate}%
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">Target: {targets.minConversionRate}%</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Avg Daily Connections</p>
            <p className="text-2xl font-bold" style={{ color: stats.avgDailyConns >= targets.dailyConnectionTarget ? '#4ade80' : '#facc15' }}>
              {stats.avgDailyConns}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">Target: {targets.dailyConnectionTarget}/day (max 40)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KPI Performance */}
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: `1px solid ${overallColor}33` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">KPI Performance</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${overallColor}15`, color: overallColor, border: `1px solid ${overallColor}40` }}>
                {kpisMet}/{totalKpis} Met
              </span>
            </div>
            <KpiRow label="Daily Connections" actual={stats.avgDailyConns} target={targets.dailyConnectionTarget} status={kpis.dailyConnections.status} higherIsBetter={true} />
            <KpiRow label="InMail Usage (≤50/mo)" actual={stats.monthlyInMails} target={targets.monthlyInMailLimit} unit="" status={kpis.monthlyInMails.status} higherIsBetter={false} />
            <KpiRow label="Reply Rate" actual={stats.replyRate} target={targets.minReplyRate} unit="%" status={kpis.replyRate.status} higherIsBetter={true} />
            <KpiRow label="Conversion Rate" actual={stats.conversionRate} target={targets.minConversionRate} unit="%" status={kpis.conversionRate.status} higherIsBetter={true} />
            <KpiRow label="Lead Processing Rate" actual={stats.processingRate} target={targets.leadProcessingRate} unit="%" status={kpis.leadProcessingRate.status} higherIsBetter={true} />
          </div>

          {/* Follow-up Required */}
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(250,204,21,0.15)' }}>
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
                {followUpRequired.map((lead: any) => {
                  const days = Math.floor((Date.now() - new Date(lead.contactedAt).getTime()) / 86400000)
                  return (
                    <div key={lead.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.1)' }}>
                      <div>
                        <p className="text-xs text-slate-300 font-medium">{lead.name}</p>
                        <p className="text-[10px] text-slate-500">{lead.company || 'No company'}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                        {days}d ago
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 14-day trend */}
        <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">14-Day Activity Trend</p>
          <div className="flex items-end gap-1 h-20">
            {trend.map((d: any, i: number) => {
              const maxConns = Math.max(...trend.map((t: any) => t.connections), 1)
              const h = Math.round((d.connections / maxConns) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{ height: `${Math.max(h, 2)}%`, minHeight: 2, background: d.connections > 0 ? 'rgba(124,111,255,0.6)' : 'rgba(100,116,139,0.15)' }}
                    title={`${d.date}: ${d.connections} connections, ${d.replies} replies`}
                  />
                  {i % 3 === 0 && (
                    <span className="text-[9px] text-slate-600 truncate" style={{ maxWidth: 28 }}>
                      {d.date.slice(5)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(124,111,255,0.6)' }} />
              Connections
            </span>
          </div>
        </div>

        {/* Today's log summary */}
        {today && (
          <div className="rounded-xl p-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.15)' }}>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">Today's Activity</p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: 'Leads Searched', value: today.leadsSearched },
                { label: 'Connections', value: today.connectionsSent },
                { label: 'InMails', value: today.inMailsSent },
                { label: 'Replies', value: today.repliesReceived },
                { label: 'Follow-ups', value: today.followUpsSent },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold text-slate-100">{value}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {today.notes && <p className="text-xs text-slate-500 mt-3 italic">"{today.notes}"</p>}
          </div>
        )}

      </div>
    </div>
  )
}
