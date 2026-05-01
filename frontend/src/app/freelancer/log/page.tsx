'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
const inputStyle = { background: 'var(--ink2)', border: '1px solid rgba(100,116,139,0.2)' }

const FIELDS = [
  { key: 'jobsFound',       label: 'Jobs Found',         desc: 'Total job posts browsed today' },
  { key: 'jobsFiltered',    label: 'Jobs Filtered',      desc: 'Relevant jobs after filtering' },
  { key: 'proposalsSent',   label: 'Proposals Sent',     desc: 'Proposals submitted today' },
  { key: 'clientReplies',   label: 'Client Replies',     desc: 'Clients who replied to proposals' },
  { key: 'followUpsSent',   label: 'Follow-ups Sent',    desc: 'Follow-up messages sent' },
  { key: 'interviewsBooked',label: 'Interviews Booked',  desc: 'Clients who booked a call / interview' },
  { key: 'dealsClosed',     label: 'Deals Closed',       desc: 'Projects awarded / hired today' },
] as const

type FieldKey = typeof FIELDS[number]['key']
type LogValues = Record<FieldKey, string>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function FreelancerLogPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [values, setValues] = useState<LogValues>({
    jobsFound: '', jobsFiltered: '', proposalsSent: '',
    clientReplies: '', followUpsSent: '', interviewsBooked: '', dealsClosed: '',
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') {
      router.replace('/dashboard')
      return
    }
    if (!user.freelancerAgentId) {
      setError('No freelancer agent profile found. Contact your manager.')
      setLoading(false)
      return
    }
    setAgentId(user.freelancerAgentId)
    fetchTodayLog(user.freelancerAgentId)
  }, [])

  async function fetchTodayLog(id: string) {
    try {
      const data = await api.get<any>(`/freelancer-daily-logs/today/${id}`)
      if (data) {
        setValues({
          jobsFound:        String(data.jobsFound        ?? ''),
          jobsFiltered:     String(data.jobsFiltered     ?? ''),
          proposalsSent:    String(data.proposalsSent    ?? ''),
          clientReplies:    String(data.clientReplies    ?? ''),
          followUpsSent:    String(data.followUpsSent    ?? ''),
          interviewsBooked: String(data.interviewsBooked ?? ''),
          dealsClosed:      String(data.dealsClosed      ?? ''),
        })
        setNotes(data.notes ?? '')
      }
    } catch { /* no log yet for today */ } finally { setLoading(false) }
  }

  function set(key: FieldKey, val: string) {
    if (val !== '' && !/^\d+$/.test(val)) return
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId) return
    setError('')
    setSaving(true)
    try {
      const payload: any = { date: today(), notes }
      for (const f of FIELDS) {
        payload[f.key] = values[f.key] === '' ? 0 : parseInt(values[f.key], 10)
      }
      await api.post(`/freelancer-daily-logs/upsert/${agentId}`, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save log.')
    } finally { setSaving(false) }
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <h1 className="text-lg font-semibold text-slate-200">Daily Activity Log</h1>
        <p className="text-xs text-slate-500 mt-0.5">{dateStr} — updates automatically if you save again</p>
      </div>

      <div className="px-6 py-6 max-w-xl">
        {loading ? (
          <p className="text-slate-500 text-xs">Loading…</p>
        ) : error && !agentId ? (
          <div className="rounded-xl p-5 text-sm text-red-400" style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.1)' }}>
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Activity Numbers</p>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{f.label}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder="0"
                      className={inputClass}
                      style={inputStyle}
                    />
                    <p className="text-[10px] text-slate-600 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.1)' }}>
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any challenges, wins, or observations from today…"
                rows={4}
                className={inputClass + ' resize-none'}
                style={inputStyle}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 px-1">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save Log'}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 size={13} /> Saved successfully
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
