'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/auth'
import * as dashboardApi from '@/lib/data/dashboard'
import * as coachingApi from '@/lib/data/coaching-insights'
import * as linkedinApi from '@/lib/data/linkedin-dashboard'
import * as freelancerApi from '@/lib/data/freelancer-dashboard'
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
  info:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

const TIME_FILTERS = [
  { label: '7D',  days: 7  },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'All', days: 0  },
]

const LI_KPI_KEYS = ['dailyConnections', 'monthlyInMails', 'replyRate', 'conversionRate', 'leadProcessingRate']

/* ─────────────── flag helpers ─────────────── */

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

function getLinkedInFlags(agent: any): { label: string; level: 'critical' | 'warn' | 'info' }[] {
  const flags: { label: string; level: 'critical' | 'warn' | 'info' }[] = []
  const kpis      = agent.kpis || {}
  const critAlerts = (agent.alerts || []).filter((a: any) => a.level === 'critical').length
  const failKpis   = LI_KPI_KEYS.filter(k => kpis[k]?.status === 'fail').length

  if (critAlerts > 0)
    flags.push({ label: `${critAlerts} Critical Alert${critAlerts > 1 ? 's' : ''}`, level: 'critical' })
  if ((agent.replyRate ?? 0) < 8 && (agent.totalConnections ?? 0) >= 20)
    flags.push({ label: 'Low Reply Rate', level: 'warn' })
  if (failKpis >= 3)
    flags.push({ label: `${failKpis} KPIs Failing`, level: 'warn' })
  if ((agent.conversionRate ?? 0) < 3 && (agent.totalConnections ?? 0) >= 30)
    flags.push({ label: 'Low Conversion', level: 'warn' })
  return flags
}

function getFreelancerFlags(agent: any): { label: string; level: 'critical' | 'warn' | 'info' }[] {
  const flags: { label: string; level: 'critical' | 'warn' | 'info' }[] = []
  const convRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0

  if (agent.totalApplied >= 10 && agent.totalLeads === 0)
    flags.push({ label: 'No Leads Created', level: 'critical' })
  if (agent.totalLeads >= 5 && convRate < 5)
    flags.push({ label: 'Low Conversion', level: 'warn' })
  if (agent.totalLeads >= 8 && agent.wonLeads === 0)
    flags.push({ label: 'No Wins Yet', level: 'warn' })
  return flags
}

/* ─────────────── KPI dot ─────────────── */

function KpiDot({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const c = status === 'pass' ? '#4ade80' : status === 'warn' ? '#fbbf24' : '#f87171'
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
}

/* ─────────────── KPI overview card ─────────────── */

function KPICard({ label, value, sub, color = 'purple', href }: {
  label: string; value: string | number; sub?: string
  color?: 'purple' | 'teal' | 'violet' | 'emerald' | 'amber' | 'slate'
  href?: string
}) {
  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    purple:  { border: 'rgba(124,111,255,0.2)', bg: 'rgba(124,111,255,0.06)',  text: '#a78bfa', glow: 'rgba(124,111,255,0.35)' },
    teal:    { border: 'rgba(45,212,191,0.2)',  bg: 'rgba(45,212,191,0.06)',   text: '#2dd4bf', glow: 'rgba(45,212,191,0.2)'   },
    violet:  { border: 'rgba(167,139,250,0.2)', bg: 'rgba(167,139,250,0.06)', text: '#c4b5fd', glow: 'rgba(167,139,250,0.3)'  },
    emerald: { border: 'rgba(74,222,128,0.2)',  bg: 'rgba(74,222,128,0.06)',   text: '#4ade80', glow: 'rgba(74,222,128,0.2)'   },
    amber:   { border: 'rgba(251,191,36,0.2)',  bg: 'rgba(251,191,36,0.06)',   text: '#fbbf24', glow: 'rgba(251,191,36,0.25)'  },
    slate:   { border: 'var(--bord)',            bg: 'var(--surface)',           text: 'var(--t3)', glow: 'transparent'          },
  }
  const c = colorMap[color] || colorMap.purple
  const inner = (
    <div style={{
      borderRadius: 'var(--r2)',
      border: `1px solid ${c.border}`,
      background: c.bg,
      padding: '16px 14px',
      position: 'relative',
      overflow: 'hidden',
      cursor: href ? 'pointer' : 'default',
      transition: 'all 0.2s',
    }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: c.text, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', marginTop: '8px' }}>{sub}</p>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: c.border, opacity: 0.6 }} />
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  return inner
}

/* ─────────────── Sales Rep compact panel ─────────────── */

function RepProgressPanel({ leaderboard, weeklySummary }: { leaderboard: any[]; weeklySummary: any; days: number }) {
  const router = useRouter()
  const flaggedCount = leaderboard.filter(r => getRepFlags(r).length > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--bord)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={13} style={{ color: 'var(--v2)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase' }}>Sales Reps</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>{leaderboard.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {flaggedCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: 'var(--mono)', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'var(--ambera)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <AlertTriangle size={9} /> {flaggedCount}
            </span>
          )}
          <Link href="/manager/kpis" style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--v2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
            Details →
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
        {leaderboard.length === 0 ? (
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '32px 16px' }}>No reps yet</p>
        ) : leaderboard.map(rep => {
          const flags   = getRepFlags(rep)
          const hasCrit = flags.some(f => f.level === 'critical')
          const dotColor = flags.length === 0 ? '#4ade80' : hasCrit ? '#f87171' : '#fbbf24'
          const lastActive = [rep.lastActivityDate, rep.lastProposalDate].filter(Boolean)
            .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null

          return (
            <div
              key={rep.userId || rep.repId}
              onClick={() => rep.repId && router.push(`/reports/${rep.repId}`)}
              style={{
                padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                cursor: rep.repId ? 'pointer' : 'default', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: `0 0 0 3px ${dotColor}26` }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{rep.name}</span>
                {flags.length > 0 && (
                  <AlertTriangle size={10} style={{ color: hasCrit ? '#f87171' : '#fbbf24', flexShrink: 0 }} />
                )}
                {rep.repId && <ChevronRight size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '15px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{rep.totalProposals} props</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: rep.replyRate >= 20 ? '#4ade80' : rep.replyRate >= 10 ? '#fbbf24' : '#f87171' }}>
                  {rep.replyRate}% reply
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: rep.hireRate >= 10 ? '#4ade80' : rep.hireRate >= 5 ? '#fbbf24' : '#f87171' }}>
                  {rep.hireRate}% hire
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)', marginLeft: 'auto' }}>
                  <Clock size={9} />{formatDate(lastActive)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {weeklySummary && (
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--bord)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>This week:</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t2)' }}>{weeklySummary.thisWeek} proposals</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: weeklySummary.change >= 0 ? '#4ade80' : '#f87171' }}>
            {weeklySummary.change >= 0 ? '↑' : '↓'}{Math.abs(weeklySummary.change)} vs last week
          </span>
        </div>
      )}
    </div>
  )
}

/* ─────────────── LinkedIn Agent panel ─────────────── */

function LinkedInProgressPanel({ agents }: { agents: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid rgba(45,212,191,0.18)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(45,212,191,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={13} style={{ color: 'var(--teal)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase' }}>LinkedIn Agents</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>{agents.length}</span>
        </div>
        <Link href="/manager/linkedin" style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
          Details →
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
        {agents.length === 0 ? (
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '32px 16px' }}>No LinkedIn agents yet</p>
        ) : agents.map(agent => {
          const kpis    = agent.kpis || {}
          const allPass = LI_KPI_KEYS.every(k => kpis[k]?.status === 'pass')
          const hasFail = LI_KPI_KEYS.some(k => kpis[k]?.status === 'fail')
          const dotColor = allPass ? '#4ade80' : hasFail ? '#f87171' : '#fbbf24'
          const critCount = (agent.alerts || []).filter((a: any) => a.level === 'critical').length

          return (
            <div key={agent.agentId}
              style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: dotColor }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</span>
                {critCount > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', flexShrink: 0 }}>
                    {critCount}!
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  {LI_KPI_KEYS.map(k => <KpiDot key={k} status={kpis[k]?.status || 'fail'} />)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '15px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{agent.totalConnections ?? 0} conn</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: (agent.replyRate ?? 0) >= 10 ? '#4ade80' : (agent.replyRate ?? 0) >= 5 ? '#fbbf24' : '#f87171' }}>
                  {agent.replyRate ?? 0}% reply
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: (agent.conversionRate ?? 0) >= 5 ? '#4ade80' : (agent.conversionRate ?? 0) >= 2 ? '#fbbf24' : '#f87171' }}>
                  {agent.conversionRate ?? 0}% conv
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#4ade80', marginLeft: 'auto' }}>{agent.converted ?? 0} won</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(45,212,191,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>KPIs:</span>
        {['Conn/day', 'InMail', 'Reply%', 'Conv%', 'Process%'].map((l, i) => (
          <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Freelancer Agent panel ─────────────── */

function FreelancerProgressPanel({ agents }: { agents: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={13} style={{ color: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase' }}>Freelancer Agents</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>{agents.length}</span>
        </div>
        <Link href="/manager/freelancer" style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
          Details →
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
        {agents.length === 0 ? (
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '32px 16px' }}>No Freelancer agents yet</p>
        ) : agents.map(agent => {
          const convRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0
          const flags    = getFreelancerFlags(agent)
          const hasCrit  = flags.some(f => f.level === 'critical')
          const dotColor = convRate >= 20 ? '#4ade80' : convRate >= 5 ? '#fbbf24' : '#64748b'

          return (
            <div key={agent.agentId}
              style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: dotColor }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</span>
                {flags.length > 0 && (
                  <AlertTriangle size={10} style={{ color: hasCrit ? '#f87171' : '#fbbf24', flexShrink: 0 }} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '15px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{agent.totalLeads ?? 0} leads</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#4ade80' }}>{agent.wonLeads ?? 0} hired</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#fbbf24' }}>{agent.totalApplied ?? 0} applied</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', marginLeft: 'auto', color: convRate >= 20 ? '#4ade80' : convRate >= 10 ? '#fbbf24' : 'var(--t3)' }}>
                  {convRate}% conv
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(251,191,36,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>Dot = conv rate · green ≥20% · amber ≥5%</span>
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
  const [leaderTab, setLeaderTab] = useState<'reps' | 'linkedin' | 'freelancer'>('reps')

  function loadData(selectedDays: number) {
    setLoading(true)
    const companyId = getStoredUser()?.companyId ?? null
    const days = selectedDays > 0 ? selectedDays : undefined
    Promise.all([
      dashboardApi.getTeamOverview(companyId, days).catch(() => null),
      dashboardApi.getLeaderboard(companyId, days).catch(() => []),
      dashboardApi.getNicheStats(companyId).catch(() => []),
      coachingApi.findTeamInsights(companyId).catch(() => []),
      dashboardApi.getTeamTrends(companyId, selectedDays || 30).catch(() => []),
      dashboardApi.getWeeklySummary(companyId).catch(() => null),
      linkedinApi.getAllAgentsPerformance(companyId).catch(() => []),
      freelancerApi.getAllAgentsPerformance(companyId).catch(() => []),
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[0, 150, 300].map(d => (
            <div key={d} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--v1)',
              animation: 'ring-out 1s ease-in-out infinite',
              animationDelay: `${d}ms`,
            }} />
          ))}
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', marginLeft: '8px' }}>Loading team dashboard…</span>
        </div>
      </div>
    )
  }

  const flaggedReps       = leaderboard.filter(r => getRepFlags(r).length > 0)
  const onTrackReps       = leaderboard.filter(r => getRepFlags(r).length === 0)
  const flaggedLinkedIn   = linkedinAgents.filter(a => getLinkedInFlags(a).length > 0)
  const flaggedFreelancer = freelancerAgents.filter(a => getFreelancerFlags(a).length > 0)
  const totalFlagged      = flaggedReps.length + flaggedLinkedIn.length + flaggedFreelancer.length

  const sortedLinkedIn   = [...linkedinAgents].sort((a, b) => (b.totalConnections ?? 0) - (a.totalConnections ?? 0))
  const sortedFreelancer = [...freelancerAgents].sort((a, b) => (b.wonLeads ?? 0) - (a.wonLeads ?? 0))

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative', zIndex: 10 }}>

      {/* ── Topbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
        padding: '0 0 18px', borderBottom: '1px solid var(--bord)',
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--t1)' }}>Team Dashboard</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)', marginTop: '2px', letterSpacing: '0.3px' }}>
            {leaderboard.length} sales rep{leaderboard.length !== 1 ? 's' : ''} ·{' '}
            {linkedinAgents.length} linkedin agent{linkedinAgents.length !== 1 ? 's' : ''} ·{' '}
            {freelancerAgents.length} freelancer agent{freelancerAgents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '20px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', border: '2px solid var(--green)', animation: 'ring-out 1.5s ease-out infinite' }} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'rgba(74,222,128,0.8)', letterSpacing: '1.5px', fontWeight: 500 }}>LIVE</span>
          </div>

          {/* Time filter */}
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => { setDays(f.days); loadData(f.days) }}
                style={{
                  padding: '5px 13px', borderRadius: '7px',
                  fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: days === f.days ? 600 : 500,
                  cursor: 'pointer', border: 'none', letterSpacing: '0.3px', transition: 'all 0.2s',
                  background: days === f.days ? 'var(--v1)' : 'transparent',
                  color: days === f.days ? '#fff' : 'var(--t3)',
                  boxShadow: days === f.days ? '0 2px 10px rgba(124,111,255,0.4)' : 'none',
                }}
              >{f.label}</button>
            ))}
          </div>

          <Link href="/assignments" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '9px',
            background: 'var(--surface)', border: '1px solid var(--bord)',
            color: 'var(--t2)', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bord2)'; e.currentTarget.style.color = 'var(--t1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bord)'; e.currentTarget.style.color = 'var(--t2)' }}
          >
            <Users size={13} />
            Assignments
          </Link>
        </div>
      </div>

      {/* ── Three progress panels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <RepProgressPanel leaderboard={leaderboard} weeklySummary={weeklySummary} days={days} />
        <LinkedInProgressPanel agents={linkedinAgents} />
        <FreelancerProgressPanel agents={freelancerAgents} />
      </div>

      {/* ── KPI metric strip ── */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <KPICard label="Total Proposals" value={overview.totalProposals}          sub={`${overview.hireRate}% hire rate`}                  color="purple"  href="/proposals?status=SENT" />
          <KPICard label="Deals Closed"    value={overview.totalHires}              sub={`$${(overview.totalEarnings||0).toLocaleString()} earned`} color="emerald" href="/proposals?status=HIRED" />
          <KPICard label="Reply Rate"      value={`${overview.replyRate}%`}         sub={`${overview.totalReplied} replied`}                 color="violet"  href="/proposals?status=REPLIED" />
          <KPICard label="View Rate"       value={`${overview.viewRate}%`}          sub={`${overview.totalViewed} viewed`}                   color="teal"    href="/proposals?status=VIEWED" />
          <KPICard label="Interviews"      value={overview.totalInterviews}         sub={`${overview.interviewRate}% rate`}                  color="amber"   href="/proposals?status=INTERVIEW" />
          <KPICard label="Connects Used"   value={overview.totalConnectsUsed}       color="slate"                                                           href="/team" />
          <KPICard label="This Week"       value={weeklySummary?.thisWeek || 0}     sub={`vs ${weeklySummary?.lastWeek || 0} last week`}     color="purple" />
          <KPICard label="Flagged"         value={totalFlagged}                     sub={`${onTrackReps.length} reps on track`}              color={totalFlagged > 0 ? 'amber' : 'emerald'} href="/manager/kpis" />
        </div>
      )}

      {/* ── Leaderboard (tabbed) + sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)', padding: '16px 18px', overflow: 'hidden' }}>

          {/* tab row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
              {[
                { key: 'reps',       label: 'Sales Reps',  count: leaderboard.length },
                { key: 'linkedin',   label: 'LinkedIn',    count: linkedinAgents.length },
                { key: 'freelancer', label: 'Freelancer',  count: freelancerAgents.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setLeaderTab(tab.key as any)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 13px', borderRadius: '7px', border: 'none',
                    fontFamily: 'var(--mono)', fontSize: '10px',
                    fontWeight: leaderTab === tab.key ? 600 : 500,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: leaderTab === tab.key ? 'var(--v1)' : 'transparent',
                    color: leaderTab === tab.key ? '#fff' : 'var(--t3)',
                    boxShadow: leaderTab === tab.key ? '0 2px 10px rgba(124,111,255,0.4)' : 'none',
                  }}
                >
                  {tab.label}
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>{tab.count}</span>
                </button>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>
              {leaderTab === 'reps' ? 'Ranked by proposals' : leaderTab === 'linkedin' ? 'Ranked by connections' : 'Ranked by hires'}
            </span>
          </div>

          {/* Sales Reps table */}
          {leaderTab === 'reps' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bord)' }}>
                    {['#', 'Rep', 'Props', 'View%', 'Reply%', 'Int%', 'Hire%', 'Consistency', 'Last Active', ''].map((h, i) => (
                      <th key={i} style={{ paddingBottom: '8px', textAlign: i === 0 || i === 1 ? 'left' : 'right', fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1px', color: 'var(--t3)', fontWeight: 500, width: i === 0 ? '24px' : i === 9 ? '24px' : 'auto' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(rep => {
                    const flags = getRepFlags(rep)
                    return (
                      <tr
                        key={rep.userId || rep.repId}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: rep.repId ? 'pointer' : 'default', transition: 'background 0.15s' }}
                        onClick={() => rep.repId && router.push(`/reports/${rep.repId}`)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 0', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{rep.rank}</td>
                        <td style={{ padding: '10px 8px 10px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{rep.name}</span>
                            {flags.length > 0 && (
                              <span title={flags.map(f => f.label).join(', ')}>
                                <AlertTriangle size={10} style={{ color: flags.some(f => f.level === 'critical') ? '#f87171' : '#fbbf24' }} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{rep.totalProposals}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: rep.viewRate >= 50 ? '#4ade80' : rep.viewRate >= 25 ? '#fbbf24' : '#f87171' }}>{rep.viewRate ?? 0}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: rep.replyRate >= 20 ? '#4ade80' : rep.replyRate >= 10 ? '#fbbf24' : '#f87171' }}>{rep.replyRate}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: rep.interviewRate >= 10 ? '#4ade80' : rep.interviewRate >= 5 ? '#fbbf24' : 'var(--t3)' }}>{rep.interviewRate ?? 0}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: rep.hireRate >= 10 ? '#4ade80' : rep.hireRate >= 5 ? '#fbbf24' : '#f87171' }}>{rep.hireRate}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'var(--v1)', borderRadius: '2px', width: `${rep.consistencyScore || 0}%` }} />
                            </div>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{rep.consistencyScore || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
                            <Clock size={9} />
                            {formatDate([rep.lastActivityDate, rep.lastProposalDate].filter(Boolean).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          {rep.repId && (
                            <Link href={`/reports/${rep.repId}`} style={{ color: 'var(--t3)', textDecoration: 'none' }}
                              onClick={e => e.stopPropagation()}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--v2)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                              <ChevronRight size={13} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)' }}>No rep data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* LinkedIn Agents table */}
          {leaderTab === 'linkedin' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bord)' }}>
                    {['#', 'Agent', 'Connections', 'InMails', 'Reply%', 'Conv%', 'Won', 'KPIs', 'Alerts'].map((h, i) => (
                      <th key={i} style={{ paddingBottom: '8px', textAlign: i <= 1 ? 'left' : 'right', fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1px', color: 'var(--t3)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedLinkedIn.map((agent, i) => {
                    const kpis      = agent.kpis || {}
                    const critCount = (agent.alerts || []).filter((a: any) => a.level === 'critical').length
                    const warnCount = (agent.alerts || []).filter((a: any) => a.level === 'warn').length
                    const inMailVal = kpis.monthlyInMails?.value ?? 0
                    return (
                      <tr key={agent.agentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 0', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px 10px 0', fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{agent.totalConnections ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', color: inMailVal >= 50 ? '#f87171' : inMailVal >= 40 ? '#fbbf24' : '#4ade80' }}>{inMailVal}</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: (agent.replyRate ?? 0) >= 12 ? '#4ade80' : (agent.replyRate ?? 0) >= 8 ? '#fbbf24' : '#f87171' }}>{agent.replyRate ?? 0}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: (agent.conversionRate ?? 0) >= 5 ? '#4ade80' : (agent.conversionRate ?? 0) >= 2 ? '#fbbf24' : '#f87171' }}>{agent.conversionRate ?? 0}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: '#4ade80' }}>{agent.converted ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3px' }}>
                            {LI_KPI_KEYS.map(k => <KpiDot key={k} status={kpis[k]?.status || 'fail'} />)}
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          {critCount > 0 ? (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>{critCount} crit</span>
                          ) : warnCount > 0 ? (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{warnCount} warn</span>
                          ) : <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {sortedLinkedIn.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)' }}>No LinkedIn agents yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Freelancer Agents table */}
          {leaderTab === 'freelancer' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bord)' }}>
                    {['#', 'Agent', 'Leads', 'Active', 'Applied', 'Hired', 'Conv%', 'Pipeline'].map((h, i) => (
                      <th key={i} style={{ paddingBottom: '8px', textAlign: i <= 1 ? 'left' : 'right', fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1px', color: 'var(--t3)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedFreelancer.map((agent, i) => {
                    const convRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0
                    const byStatus = agent.byStatus || {}
                    const flags    = getFreelancerFlags(agent)
                    return (
                      <tr key={agent.agentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 0', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px 10px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</span>
                            {flags.length > 0 && (
                              <span title={flags.map(f => f.label).join(', ')}>
                                <AlertTriangle size={10} style={{ color: flags.some(f => f.level === 'critical') ? '#f87171' : '#fbbf24' }} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{agent.totalLeads ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{agent.activeLeads ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: '#fbbf24' }}>{agent.totalApplied ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: '#4ade80' }}>{agent.wonLeads ?? 0}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: convRate >= 20 ? '#4ade80' : convRate >= 10 ? '#fbbf24' : convRate > 0 ? 'var(--t2)' : '#f87171' }}>{convRate}%</span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)' }}>
                            <span style={{ color: 'var(--teal)' }}>{byStatus.PROPOSAL_SENT ?? 0}s</span>
                            <span>/</span>
                            <span style={{ color: 'var(--v2)' }}>{byStatus.REPLIED ?? 0}r</span>
                            <span>/</span>
                            <span style={{ color: 'var(--amber)' }}>{byStatus.INTERVIEW ?? 0}i</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {sortedFreelancer.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)' }}>No freelancer agents yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Coaching Alerts */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase' }}>Coaching Alerts</h2>
              <Link href="/insights" style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--v2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>View all →</Link>
            </div>
            <div>
              {insights.slice(0, 5).map((ins: any) => (
                <Link key={ins.id} href="/insights" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', transition: 'background 0.15s' }}>
                  <div style={{
                    width: '3px', height: '100%', borderRadius: '2px', alignSelf: 'stretch', flexShrink: 0, minHeight: '32px',
                    background: ins.severity === 'CRITICAL' ? '#f87171' : ins.severity === 'HIGH' ? '#fbbf24' : ins.severity === 'MEDIUM' ? '#2dd4bf' : 'var(--v1)',
                  }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.45 }} className="line-clamp-2">{ins.generatedInsight}</p>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', marginTop: '4px' }}>{ins.rep?.user?.name || 'Unknown rep'}</p>
                  </div>
                </Link>
              ))}
              {insights.length === 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '12px 0' }}>No unread alerts</p>}
            </div>
          </div>

          {/* Win Rate by Niche */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)', padding: '14px 18px' }}>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '12px' }}>Win Rate by Niche</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {nicheStats.map((n: any, i) => {
                const colors = ['var(--v1)', 'var(--teal)', 'var(--rose)', 'var(--amber)', 'var(--green)']
                const col = colors[i % colors.length]
                return (
                  <div key={n.niche} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '3px', flexShrink: 0, background: col }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)', width: '58px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.niche}</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: col, width: `${n.winRate || 0}%`, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: col, width: '38px', textAlign: 'right' }}>{n.winRate || 0}%</span>
                  </div>
                )
              })}
              {nicheStats.length === 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '8px 0' }}>No niche data yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Team Needing Attention ── */}
      {totalFlagged > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--amber)', textTransform: 'uppercase' }}>
              Team Needing Attention ({totalFlagged})
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

            {flaggedReps.map(rep => {
              const flags = getRepFlags(rep)
              return (
                <Link key={`rep-${rep.userId}`} href={rep.repId ? `/reports/${rep.repId}` : '/dashboard'}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bord)', borderRadius: 'var(--r2)', padding: '12px', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bord2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bord)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{rep.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'var(--v1a)', color: 'var(--v2)', border: '1px solid rgba(124,111,255,0.2)' }}>REP</span>
                    </div>
                    <BarChart2 size={12} style={{ color: 'var(--t3)' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {flags.map((f, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${FLAG_COLORS[f.level]}`}>{f.label}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--bord)', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
                    <span>{rep.totalProposals} proposals</span>
                    <span>{rep.hireRate}% hire</span>
                    <span>{formatDate([rep.lastActivityDate, rep.lastProposalDate].filter(Boolean).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] || null)}</span>
                  </div>
                </Link>
              )
            })}

            {flaggedLinkedIn.map(agent => {
              const flags = getLinkedInFlags(agent)
              return (
                <Link key={`li-${agent.agentId}`} href="/manager/linkedin"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bord)', borderRadius: 'var(--r2)', padding: '12px', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bord)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'var(--teala)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,0.2)' }}>LI</span>
                    </div>
                    <Network size={12} style={{ color: 'var(--t3)' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {flags.map((f, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${FLAG_COLORS[f.level]}`}>{f.label}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--bord)', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
                    <span>{agent.totalConnections ?? 0} connections</span>
                    <span>{agent.replyRate ?? 0}% reply</span>
                    <span>{agent.converted ?? 0} won</span>
                  </div>
                </Link>
              )
            })}

            {flaggedFreelancer.map(agent => {
              const flags    = getFreelancerFlags(agent)
              const convRate = agent.totalLeads > 0 ? Math.round((agent.wonLeads / agent.totalLeads) * 100) : 0
              return (
                <Link key={`fl-${agent.agentId}`} href="/manager/freelancer"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bord)', borderRadius: 'var(--r2)', padding: '12px', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bord)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{agent.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'var(--ambera)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,0.2)' }}>FL</span>
                    </div>
                    <Briefcase size={12} style={{ color: 'var(--t3)' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {flags.map((f, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${FLAG_COLORS[f.level]}`}>{f.label}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--bord)', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
                    <span>{agent.totalLeads ?? 0} leads</span>
                    <span>{agent.wonLeads ?? 0} hired</span>
                    <span>{convRate}% conv</span>
                  </div>
                </Link>
              )
            })}

          </div>
        </div>
      )}

      {/* ── 14-day trend ── */}
      {trends.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 'var(--r)', padding: '14px 18px' }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '12px' }}>14-Day Proposal Trend (Reps)</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '80px' }}>
            {(() => {
              const maxVal = Math.max(...trends.map((t: any) => t.proposals), 1)
              return trends.map((t: any, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', cursor: 'pointer' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(4, Math.round((t.proposals / maxVal) * 76))}px`,
                      background: i === trends.length - 1
                        ? 'linear-gradient(180deg,#a78bfa,rgba(124,111,255,0.3))'
                        : 'linear-gradient(180deg,var(--v2),rgba(124,111,255,0.2))',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: i === trends.length - 1 ? '0 0 12px rgba(167,139,250,0.35)' : 'none',
                      transition: 'filter 0.15s',
                    }}
                    title={`${t.date}: ${t.proposals}`}
                  />
                </div>
              ))
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--t3)' }}>{trends[0]?.date}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--t3)' }}>{trends[trends.length - 1]?.date}</span>
          </div>
        </div>
      )}

    </div>
  )
}
