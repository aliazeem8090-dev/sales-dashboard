'use client'

import { useEffect, useState } from 'react'
import { getLeaderboard } from '@/lib/data/dashboard'
import * as repsApi from '@/lib/data/reps'
import { getStoredUser } from '@/lib/auth'
import { Target, CheckCircle2, XCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react'

interface KpiTargets {
  dailyProposalTarget: number
  acceptableViewRate: number
  acceptableInterviewRate: number
  acceptableClosingRate: number
  mrrGoal: number
  monthlyConnectsLimit: number
}

interface RepData {
  repId: string
  userId: string
  name: string
  totalProposals: number
  viewRate: number
  interviewRate: number
  hireRate: number
  earningsThisMonth: number
  connectsUsed: number
  targets: Record<string, any>
}

const DEFAULT_TARGETS: KpiTargets = {
  dailyProposalTarget: 5,
  acceptableViewRate: 20,
  acceptableInterviewRate: 5,
  acceptableClosingRate: 3,
  mrrGoal: 500,
  monthlyConnectsLimit: 150,
}

const KPI_FIELDS: {
  key: keyof KpiTargets
  label: string
  unit: string
  actualKey: keyof RepData
  higherIsBetter: boolean
  description: string
  getActual?: (rep: RepData) => number
  getTarget?: (target: number) => number
}[] = [
  { key: 'dailyProposalTarget',   label: 'Daily Proposal Target',  unit: '/day', actualKey: 'totalProposals', higherIsBetter: true,  description: 'Proposals per day target (×30 = monthly)', getActual: (r) => Math.round((r.totalProposals / 30) * 10) / 10 },
  { key: 'acceptableViewRate',    label: 'Min View Rate',          unit: '%',  actualKey: 'viewRate',         higherIsBetter: true,  description: 'Minimum % of proposals that get viewed' },
  { key: 'acceptableInterviewRate', label: 'Min Interview Rate',   unit: '%',  actualKey: 'interviewRate',    higherIsBetter: true,  description: 'Minimum % of proposals reaching interview' },
  { key: 'acceptableClosingRate', label: 'Min Closing Rate',       unit: '%',  actualKey: 'hireRate',         higherIsBetter: true,  description: 'Minimum % of proposals that close' },
  { key: 'mrrGoal',               label: 'MRR Goal',               unit: '$',  actualKey: 'earningsThisMonth',higherIsBetter: true,  description: 'Monthly recurring revenue target ($)' },
  { key: 'monthlyConnectsLimit',  label: 'Connects Budget',        unit: '',   actualKey: 'connectsUsed',     higherIsBetter: false, description: 'Max connects allowed per month' },
]

function getStatus(actual: number, target: number, higherIsBetter: boolean): 'pass' | 'warn' | 'fail' {
  if (target === 0) return 'pass'
  const ratio = higherIsBetter ? actual / target : target / actual
  if (ratio >= 1) return 'pass'
  if (ratio >= 0.75) return 'warn'
  return 'fail'
}

function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
  if (status === 'warn') return <AlertTriangle size={14} className="text-amber-400 shrink-0" />
  return <XCircle size={14} className="text-red-400 shrink-0" />
}

function overallStatus(rep: RepData, targets: KpiTargets): 'pass' | 'warn' | 'fail' {
  const statuses = KPI_FIELDS.map(f => {
    const actual = Number(rep[f.actualKey]) || 0
    const target = targets[f.key] || 0
    return getStatus(actual, target, f.higherIsBetter)
  })
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('warn')) return 'warn'
  return 'pass'
}

function buildInitialTargets(data: any[]): Record<string, KpiTargets> {
  const initial: Record<string, KpiTargets> = {}
  for (const rep of data) {
    if (!rep.repId) continue
    initial[rep.repId] = {
      dailyProposalTarget:     rep.targets?.dailyProposalTarget     ?? rep.targets?.dailyProposals ?? DEFAULT_TARGETS.dailyProposalTarget,
      acceptableViewRate:      rep.targets?.acceptableViewRate      ?? DEFAULT_TARGETS.acceptableViewRate,
      acceptableInterviewRate: rep.targets?.acceptableInterviewRate ?? DEFAULT_TARGETS.acceptableInterviewRate,
      acceptableClosingRate:   rep.targets?.acceptableClosingRate   ?? DEFAULT_TARGETS.acceptableClosingRate,
      mrrGoal:                 rep.targets?.mrrGoal                 ?? DEFAULT_TARGETS.mrrGoal,
      monthlyConnectsLimit:    rep.targets?.monthlyConnectsLimit    ?? DEFAULT_TARGETS.monthlyConnectsLimit,
    }
  }
  return initial
}

export default function KpiTargetsPage() {
  const [reps, setReps] = useState<RepData[]>([])
  const [targets, setTargets] = useState<Record<string, KpiTargets>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  function loadData() {
    const user = getStoredUser()
    return getLeaderboard(user?.companyId || null, 30)
      .then(data => {
        const filtered = data.filter(r => r.repId) as unknown as RepData[]
        setReps(filtered)
        setTargets(buildInitialTargets(filtered))
      })
      .catch(console.error)
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  function updateTarget(repId: string, key: keyof KpiTargets, value: string) {
    const num = parseFloat(value)
    if (isNaN(num) && value !== '') return
    setTargets(prev => ({
      ...prev,
      [repId]: { ...prev[repId], [key]: isNaN(num) ? 0 : num },
    }))
    setSaved(prev => ({ ...prev, [repId]: false }))
  }

  async function saveTargets(rep: RepData) {
    setSaving(prev => ({ ...prev, [rep.repId]: true }))
    try {
      const merged = { ...rep.targets, ...targets[rep.repId] }
      await repsApi.update(rep.repId, { targets: merged })
      // Reload so actuals + saved targets both reflect reality
      await loadData()
      setSaved(prev => ({ ...prev, [rep.repId]: true }))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(prev => ({ ...prev, [rep.repId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-slate-500 ml-2">Loading reps…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 relative z-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target size={16} className="text-violet-400" />
          <h1 className="text-lg font-semibold text-slate-200 tracking-tight">KPI Targets</h1>
        </div>
        <p className="text-xs text-slate-500">
          Set performance expectations per rep. Reps are flagged on the dashboard when they fall below these targets.
          <span className="ml-2 text-slate-600">· Based on last 30 days of activity</span>
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={11} /> On target</div>
        <div className="flex items-center gap-1.5 text-amber-400"><AlertTriangle size={11} /> Within 25% of target</div>
        <div className="flex items-center gap-1.5 text-red-400"><XCircle size={11} /> Below target</div>
      </div>

      {/* Rep Cards */}
      <div className="space-y-4">
        {reps.map(rep => {
          const repTargets = targets[rep.repId] || DEFAULT_TARGETS
          const status = overallStatus(rep, repTargets)
          const isSaving = saving[rep.repId]
          const justSaved = saved[rep.repId]

          return (
            <div
              key={rep.repId}
              className={`rounded-xl border overflow-hidden ${
                status === 'fail' ? 'border-red-500/20' :
                status === 'warn' ? 'border-amber-500/20' :
                'border-[var(--bord)]'
              }`}
              style={{ background: 'var(--ink2)' }}
            >
              {/* Card header */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${
                status === 'fail' ? 'border-red-500/20 bg-red-500/5' :
                status === 'warn' ? 'border-amber-500/20 bg-amber-500/5' :
                'border-[var(--bord)] bg-slate-900/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    status === 'fail' ? 'bg-red-500/15 text-red-400' :
                    status === 'warn' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-violet-500/15 text-violet-400'
                  }`}>
                    {rep.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{rep.name}</p>
                    <p className={`text-[10px] font-medium ${
                      status === 'fail' ? 'text-red-400' :
                      status === 'warn' ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {status === 'fail' ? 'Below Expectations' :
                       status === 'warn' ? 'Needs Attention' :
                       'On Track'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => saveTargets(rep)}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    justSaved
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-500/20'
                  } disabled:opacity-50`}
                >
                  {isSaving ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : justSaved ? (
                    <CheckCircle2 size={11} />
                  ) : (
                    <Save size={11} />
                  )}
                  {isSaving ? 'Saving…' : justSaved ? 'Saved' : 'Save KPIs'}
                </button>
              </div>

              {/* KPI rows */}
              <div className="divide-y divide-slate-800/40">
                {KPI_FIELDS.map(field => {
                  const actual = field.getActual ? field.getActual(rep) : (Number(rep[field.actualKey]) || 0)
                  const target = repTargets[field.key] || 0
                  const status = getStatus(actual, target, field.higherIsBetter)

                  return (
                    <div key={field.key} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-800/10 transition-colors">
                      {/* Label */}
                      <div className="col-span-4">
                        <p className="text-xs font-medium text-slate-300">{field.label}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{field.description}</p>
                      </div>

                      {/* Target input */}
                      <div className="col-span-3 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider w-10">Target</span>
                        <div className="flex items-center gap-1">
                          {field.unit === '$' && <span className="text-[10px] text-slate-500">$</span>}
                          <input
                            type="number"
                            min="0"
                            value={repTargets[field.key] || ''}
                            onChange={e => updateTarget(rep.repId, field.key, e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-mono text-slate-200 rounded-md border border-slate-700 bg-slate-800/60 focus:outline-none focus:border-violet-500/50 focus:bg-slate-800 transition-colors"
                            placeholder="0"
                          />
                          {field.unit && field.unit !== '$' && <span className="text-[10px] text-slate-500">{field.unit}</span>}
                        </div>
                      </div>

                      {/* Actual */}
                      <div className="col-span-3 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider w-10">Actual</span>
                        <span className={`text-xs font-mono font-semibold ${
                          status === 'pass' ? 'text-emerald-400' :
                          status === 'warn' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {field.unit === '$' ? `$${actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}` :
                           field.unit === '%' ? `${actual.toFixed(1)}%` :
                           field.unit === '/day' ? `${actual}/day` :
                           actual.toString()}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <StatusIcon status={status} />
                        <span className={`text-[10px] font-medium ${
                          status === 'pass' ? 'text-emerald-400' :
                          status === 'warn' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {status === 'pass' ? 'Met' :
                           status === 'warn' ? 'Close' :
                           field.higherIsBetter ? 'Below' : 'Over'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {reps.length === 0 && (
          <div className="rounded-xl border border-[var(--bord)] p-12 text-center" style={{ background: 'var(--ink2)' }}>
            <Target size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No reps found.</p>
            <p className="text-[11px] text-slate-600 mt-1">Add sales reps to the team first.</p>
          </div>
        )}
      </div>
    </div>
  )
}
