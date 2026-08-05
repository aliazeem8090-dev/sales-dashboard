'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getBidderReport } from '@/lib/data/dashboard'
import { Printer } from 'lucide-react'

interface ReportData {
  bidder: {
    id: string
    name: string
    email: string
    repId: string
    currentConnects: number
    weeklyGoals: any
    targets: any
  }
  assignedProfiles: { id: string; title: string; niche: string }[]
  stats: {
    totalProposals: number
    viewed: number
    replied: number
    interviews: number
    hires: number
    connectsUsed: number
    viewRate: number
    replyRate: number
    interviewRate: number
    hireRate: number
  }
  activity: {
    totalLogsAllTime: number
    logsLast30Days: number
    avgProposalsPerDay: number
    consistencyScore: number
  }
  profileBreakdown: {
    profileId: string
    profileTitle: string
    niche: string
    proposalCount: number
    hires: number
    hireRate: number
  }[]
  recentProposals: {
    id: string
    status: string
    submittedAt: string
    connectsUsed: number
    aiScore: number
  }[]
}

const NICHE_COLORS: Record<string, string> = {
  MERN:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Laravel:   'bg-red-500/15 text-red-400 border-red-500/25',
  AI_ML:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  WordPress: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

const STATUS_COLORS: Record<string, string> = {
  SENT:      'text-slate-500',
  VIEWED:    'text-blue-400',
  REPLIED:   'text-amber-400',
  INTERVIEW: 'text-violet-400',
  HIRED:     'text-emerald-400',
  REJECTED:  'text-red-400',
  LOST:      'text-red-400',
}

function nicheColor(niche: string) {
  return NICHE_COLORS[niche] || 'bg-slate-700/40 text-slate-400 border-slate-600/30'
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}>
      <p className="text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-200">{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-slate-400">{value} <span className="text-slate-600">({pct}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(30,37,51,1)' }}>
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const cardStyle = { background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }
const bgDark = { background: 'var(--ink)' }

export default function ReportPage() {
  const params = useParams()
  const repId = params.repId as string
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getBidderReport(repId)
      .then(setReport as any)
      .catch(() => setError('Could not load report'))
      .finally(() => setLoading(false))
  }, [repId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Loading report…</div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error || 'Report not found'}</div>
    )
  }

  const { bidder, assignedProfiles, stats, activity, profileBreakdown, recentProposals } = report

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { margin: 0; padding: 24px; }
          body { background: var(--ink); }
        }
      `}</style>

      <div className="flex-1 print-page overflow-auto">
          {/* Header */}
          <div className="px-8 py-5 flex items-center justify-between no-print" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', ...bgDark }}>
            <div>
              <h1 className="text-lg font-semibold text-slate-200">Bidder Report</h1>
              <p className="text-xs text-slate-500 mt-0.5">Individual performance overview</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors text-slate-300 hover:text-slate-100"
              style={{ background: 'rgba(30,37,51,0.6)', border: '1px solid rgba(100,116,139,0.2)' }}
            >
              <Printer size={14} />
              Download PDF
            </button>
          </div>

          <div className="px-8 py-6 max-w-5xl mx-auto space-y-5">
            {/* Bidder header */}
            <div className="rounded-xl px-6 py-5" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-200">{bidder.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{bidder.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {assignedProfiles.map(p => (
                      <span key={p.id} className={`text-[10px] px-2.5 py-1 rounded border font-medium ${nicheColor(p.niche)}`}>
                        {p.title}
                      </span>
                    ))}
                    {assignedProfiles.length === 0 && (
                      <span className="text-xs text-slate-600">No profiles assigned</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">{bidder.currentConnects}</p>
                  <p className="text-xs text-slate-500">connects remaining</p>
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Total Proposals" value={stats.totalProposals} />
              <KPI label="Hire Rate" value={`${stats.hireRate}%`} sub={`${stats.hires} hires`} />
              <KPI label="Reply Rate" value={`${stats.replyRate}%`} sub={`${stats.replied} replies`} />
              <KPI label="Connects Used" value={stats.connectsUsed} />
            </div>

            {/* Funnel + Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl px-6 py-5" style={cardStyle}>
                <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Proposal Funnel</p>
                <div className="space-y-3">
                  <FunnelBar label="Sent" value={stats.totalProposals} max={stats.totalProposals} color="bg-slate-500" />
                  <FunnelBar label="Viewed" value={stats.viewed} max={stats.totalProposals} color="bg-blue-500" />
                  <FunnelBar label="Replied" value={stats.replied} max={stats.totalProposals} color="bg-amber-500" />
                  <FunnelBar label="Interview" value={stats.interviews} max={stats.totalProposals} color="bg-violet-500" />
                  <FunnelBar label="Hired" value={stats.hires} max={stats.totalProposals} color="bg-emerald-500" />
                </div>
              </div>

              <div className="rounded-xl px-6 py-5" style={cardStyle}>
                <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Activity (Last 30 Days)</p>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Days Logged</span>
                    <span className="text-sm font-semibold text-slate-300">{activity.logsLast30Days} / 30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Avg Proposals/Day</span>
                    <span className="text-sm font-semibold text-slate-300">{activity.avgProposalsPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Consistency Score</span>
                    <span className="text-sm font-semibold text-slate-300">{activity.consistencyScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Total Logs (All Time)</span>
                    <span className="text-sm font-semibold text-slate-300">{activity.totalLogsAllTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile breakdown */}
            {profileBreakdown.length > 0 && (
              <div className="rounded-xl px-6 py-5" style={cardStyle}>
                <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Per-Profile Breakdown</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(30,37,51,1)' }}>
                        <th className="text-left py-2 font-medium text-slate-600 uppercase tracking-wider">Profile</th>
                        <th className="text-right py-2 font-medium text-slate-600 uppercase tracking-wider">Proposals</th>
                        <th className="text-right py-2 font-medium text-slate-600 uppercase tracking-wider">Hires</th>
                        <th className="text-right py-2 font-medium text-slate-600 uppercase tracking-wider">Hire Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileBreakdown.map(p => (
                        <tr key={p.profileId} style={{ borderBottom: '1px solid rgba(30,37,51,0.6)' }}>
                          <td className="py-2.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide mr-2 ${nicheColor(p.niche)}`}>{p.niche}</span>
                            <span className="text-slate-400">{p.profileTitle}</span>
                          </td>
                          <td className="text-right py-2.5 text-slate-500">{p.proposalCount}</td>
                          <td className="text-right py-2.5 text-slate-500">{p.hires}</td>
                          <td className="text-right py-2.5 font-medium text-slate-300">{p.hireRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent proposals */}
            <div className="rounded-xl px-6 py-5" style={cardStyle}>
              <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Recent Proposals (Last 10)</p>
              {recentProposals.length === 0 ? (
                <p className="text-xs text-slate-600">No proposals yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(30,37,51,1)' }}>
                        <th className="text-left py-2 font-medium text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="text-left py-2 font-medium text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="text-right py-2 font-medium text-slate-600 uppercase tracking-wider">Connects</th>
                        <th className="text-right py-2 font-medium text-slate-600 uppercase tracking-wider">AI Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProposals.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,37,51,0.6)' }}>
                          <td className="py-2.5 text-slate-500">{new Date(p.submittedAt).toLocaleDateString()}</td>
                          <td className={`py-2.5 font-medium ${STATUS_COLORS[p.status] || 'text-slate-400'}`}>{p.status}</td>
                          <td className="py-2.5 text-right text-slate-500">{p.connectsUsed}</td>
                          <td className={`py-2.5 text-right font-medium font-mono ${p.aiScore >= 70 ? 'text-emerald-400' : p.aiScore >= 50 ? 'text-amber-400' : p.aiScore ? 'text-red-400' : 'text-slate-700'}`}>
                            {p.aiScore ? p.aiScore : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
    </>
  )
}
