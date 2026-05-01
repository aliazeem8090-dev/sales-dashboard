'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { CheckCircle2, AlertTriangle, XCircle, Edit2, Save, X } from 'lucide-react'

const STATUS_STYLES = {
  pass: { color: '#4ade80', icon: CheckCircle2 },
  warn: { color: '#facc15', icon: AlertTriangle },
  fail: { color: '#f87171', icon: XCircle },
}

function StatusBadge({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const { color, icon: Icon } = STATUS_STYLES[status]
  return <Icon size={13} style={{ color }} />
}

type TargetForm = {
  dailyConnectionTarget: number
  monthlyInMailLimit: number
  minReplyRate: number
  minConversionRate: number
  leadProcessingRate: number
}

const DEFAULT_TARGETS: TargetForm = {
  dailyConnectionTarget: 35,
  monthlyInMailLimit:    50,
  minReplyRate:          10,
  minConversionRate:      5,
  leadProcessingRate:    50,
}

export default function ManagerLinkedInPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTargets, setEditTargets] = useState<TargetForm>(DEFAULT_TARGETS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      router.replace('/dashboard')
      return
    }
    api.get('/linkedin-dashboard/all')
      .then((data: any) => setAgents(data as any[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function startEdit(agent: any) {
    setEditingId(agent.agentId)
    setEditTargets({
      dailyConnectionTarget: agent.targets?.dailyConnectionTarget ?? DEFAULT_TARGETS.dailyConnectionTarget,
      monthlyInMailLimit:    agent.targets?.monthlyInMailLimit    ?? DEFAULT_TARGETS.monthlyInMailLimit,
      minReplyRate:          agent.targets?.minReplyRate          ?? DEFAULT_TARGETS.minReplyRate,
      minConversionRate:     agent.targets?.minConversionRate     ?? DEFAULT_TARGETS.minConversionRate,
      leadProcessingRate:    agent.targets?.leadProcessingRate    ?? DEFAULT_TARGETS.leadProcessingRate,
    })
  }

  async function saveTargets(agentId: string) {
    setSaving(true)
    try {
      await api.post(`/linkedin-dashboard/targets/${agentId}`, editTargets)
      setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, targets: { ...a.targets, ...editTargets } } : a))
      setEditingId(null)
    } catch { } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading LinkedIn agents…</p>
    </div>
  )

  return (
    <div className="flex-1 relative z-10">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">LinkedIn Agents</h1>
        <p className="text-xs text-slate-500 mt-0.5">{agents.length} active agent{agents.length !== 1 ? 's' : ''} — 30-day performance</p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {agents.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-10 text-center" style={{ background: 'var(--ink2)' }}>
            <p className="text-slate-500 text-sm">No LinkedIn agents yet.</p>
            <p className="text-xs text-slate-600 mt-1">Create users with the LinkedIn Agent role in Team Management.</p>
          </div>
        ) : (
          agents.map(agent => {
            const kpiArr = Object.entries(agent.kpis as Record<string, any>)
            const met = kpiArr.filter(([, v]) => v.status === 'pass').length
            const overallColor = met === kpiArr.length ? '#4ade80' : met >= kpiArr.length * 0.75 ? '#facc15' : '#f87171'
            const isEditing = editingId === agent.agentId

            return (
              <div key={agent.agentId} className="rounded-xl" style={{ background: 'var(--ink2)', border: `1px solid ${overallColor}22` }}>
                {/* Agent header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(100,116,139,0.08)' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${overallColor}15`, color: overallColor, border: `1px solid ${overallColor}30` }}>
                        {met}/{kpiArr.length} KPIs
                      </span>
                      {agent.followUpCount > 0 && (
                        <span className="text-[11px] text-yellow-400">{agent.followUpCount} follow-up{agent.followUpCount > 1 ? 's' : ''} overdue</span>
                      )}
                    </div>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(agent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                      style={{ border: '1px solid rgba(100,116,139,0.15)' }}
                    >
                      <Edit2 size={12} /> Set Targets
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"><X size={14} /></button>
                      <button
                        onClick={() => saveTargets(agent.agentId)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg disabled:opacity-50 transition-colors"
                        style={{ background: 'rgba(124,111,255,0.12)', border: '1px solid rgba(124,111,255,0.25)', color: '#a78bfa' }}
                      >
                        <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-0 divide-x divide-slate-800/50">
                  {[
                    { label: 'Avg Conns/Day', value: agent.avgDailyConns },
                    { label: 'InMails/Mo', value: agent.monthlyInMails },
                    { label: 'Reply Rate', value: `${agent.replyRate}%` },
                    { label: 'Conversion', value: `${agent.conversionRate}%` },
                    { label: 'Leads Total', value: agent.totalLeads },
                    { label: 'Converted', value: agent.converted },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3 text-center">
                      <p className="text-sm font-bold text-slate-200">{value}</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* KPI status row */}
                <div className="px-5 py-3 flex flex-wrap gap-3" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                  {kpiArr.map(([key, kpi]: [string, any]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <StatusBadge status={kpi.status} />
                      <span className="text-[10px] text-slate-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Target editor */}
                {isEditing && (
                  <div className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid rgba(124,111,255,0.1)', background: 'rgba(124,111,255,0.03)' }}>
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Edit Targets</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {([
                        { key: 'dailyConnectionTarget', label: 'Daily Connections Target' },
                        { key: 'monthlyInMailLimit',    label: 'Monthly InMail Limit' },
                        { key: 'minReplyRate',          label: 'Min Reply Rate (%)' },
                        { key: 'minConversionRate',     label: 'Min Conversion Rate (%)' },
                        { key: 'leadProcessingRate',    label: 'Lead Processing Rate (%)' },
                      ] as { key: keyof TargetForm; label: string }[]).map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
                          <input
                            type="number"
                            min={0}
                            value={editTargets[key]}
                            onChange={e => setEditTargets(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-1.5 rounded-lg text-sm text-slate-200 focus:outline-none text-center"
                            style={{ background: 'var(--ink)', border: '1px solid rgba(100,116,139,0.2)' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {agent.alerts?.length > 0 && (
                  <div className="px-5 py-3 space-y-1.5" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                    {agent.alerts.map((a: any, i: number) => (
                      <p key={i} className="text-[11px]" style={{ color: a.level === 'critical' ? '#f87171' : a.level === 'warn' ? '#facc15' : '#a78bfa' }}>
                        • {a.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
