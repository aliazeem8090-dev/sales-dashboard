'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Save, CheckCircle2, AlertTriangle } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors text-center"
const inputStyle = { background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.2)' }

const FIELDS = [
  { key: 'leadsSearched',   label: 'Leads Searched',   hint: 'Total profiles browsed' },
  { key: 'leadsFiltered',   label: 'Leads Filtered',   hint: 'Profiles that matched ICP' },
  { key: 'leadsAnalyzed',   label: 'Leads Analyzed',   hint: 'Profiles deeply reviewed' },
  { key: 'connectionsSent', label: 'Connections Sent',  hint: 'Max 40/day safe zone' },
  { key: 'inMailsSent',     label: 'InMails Sent',      hint: '50/month LinkedIn limit' },
  { key: 'repliesReceived', label: 'Replies Received',  hint: 'Any positive response' },
  { key: 'followUpsSent',   label: 'Follow-ups Sent',   hint: 'Re-engaged stale leads' },
  { key: 'jobsApplied',     label: 'Jobs Applied',      hint: 'If applicable' },
  { key: 'emailsChecked',   label: 'Emails Checked',    hint: 'Inbox review count' },
]

type LogForm = {
  leadsSearched: number; leadsFiltered: number; leadsAnalyzed: number;
  connectionsSent: number; inMailsSent: number; repliesReceived: number;
  followUpsSent: number; jobsApplied: number; emailsChecked: number;
  notes: string;
}

const EMPTY_FORM: LogForm = {
  leadsSearched: 0, leadsFiltered: 0, leadsAnalyzed: 0,
  connectionsSent: 0, inMailsSent: 0, repliesReceived: 0,
  followUpsSent: 0, jobsApplied: 0, emailsChecked: 0,
  notes: '',
}

export default function LinkedInLogPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [form, setForm] = useState<LogForm>(EMPTY_FORM)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [monthlyInMails, setMonthlyInMails] = useState(0)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'LINKEDIN_AGENT') { router.replace('/dashboard'); return }
    if (!user.agentId) return
    setAgentId(user.agentId)

    // Load today's log
    api.get(`/linkedin-daily-logs/today/${user.agentId}`)
      .then((log: any) => {
        if (log) {
          setExistingId(log.id)
          setForm({
            leadsSearched:   log.leadsSearched   || 0,
            leadsFiltered:   log.leadsFiltered   || 0,
            leadsAnalyzed:   log.leadsAnalyzed   || 0,
            connectionsSent: log.connectionsSent || 0,
            inMailsSent:     log.inMailsSent      || 0,
            repliesReceived: log.repliesReceived || 0,
            followUpsSent:   log.followUpsSent   || 0,
            jobsApplied:     log.jobsApplied      || 0,
            emailsChecked:   log.emailsChecked   || 0,
            notes:           log.notes            || '',
          })
        }
      })
      .catch(() => {})

    // Monthly InMail count
    api.get(`/linkedin-daily-logs/monthly-inmails/${user.agentId}`)
      .then((res: any) => setMonthlyInMails(res?.total || 0))
      .catch(() => {})
  }, [])

  function set(key: keyof LogForm, value: string) {
    setForm(prev => ({ ...prev, [key]: key === 'notes' ? value : Math.max(0, parseInt(value) || 0) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.post(`/linkedin-daily-logs/upsert/${agentId}`, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save log')
    } finally {
      setSaving(false)
    }
  }

  const connWarn = form.connectionsSent > 40
  const inMailWarn = monthlyInMails >= 45

  return (
    <div className="flex-1 relative z-10">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">Daily Activity Log</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {existingId && <span className="ml-2 text-violet-500">• Log exists — updating</span>}
        </p>
      </div>

      <div className="px-6 py-5 max-w-2xl">
        {/* Warnings */}
        {connWarn && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <span className="text-red-400">Connections ({form.connectionsSent}) exceed the safe daily limit of 40 — LinkedIn may restrict your account</span>
          </div>
        )}
        {inMailWarn && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)' }}>
            <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-400">InMail quota: {monthlyInMails}/50 used this month — approaching limit</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.15)' }}>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-4">Activity Numbers</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {FIELDS.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={form[key as keyof LogForm] as number}
                    onChange={e => set(key as keyof LogForm, e.target.value)}
                    className={inputClass}
                    style={{
                      ...inputStyle,
                      borderColor: key === 'connectionsSent' && connWarn
                        ? 'rgba(239,68,68,0.5)'
                        : key === 'inMailsSent' && inMailWarn
                          ? 'rgba(250,204,21,0.5)'
                          : undefined,
                    }}
                  />
                  <p className="text-[9px] text-slate-600 mt-0.5 text-center">{hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.1)' }}>
            <label className="block text-[10px] text-slate-500 mb-2 uppercase tracking-wide">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any observations, blockers, or wins today…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
              style={{ background: 'var(--ink)', border: '1px solid rgba(100,116,139,0.2)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
            >
              <Save size={14} />
              {saving ? 'Saving…' : existingId ? 'Update Log' : 'Save Log'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 size={13} />
                Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
