'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { ArrowLeft, CheckCircle } from 'lucide-react'

const CHALLENGE_OPTIONS = [
  'Low connects',
  'No suitable jobs found',
  'Profile not competitive',
  'Client budget too low',
  'High competition',
  'Network/internet issues',
  'Personal reasons',
  'Public holiday',
  'Other',
]

export default function LogActivityPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [repId, setRepId] = useState('')
  const [reps, setReps] = useState<any[]>([])
  const [form, setForm] = useState({
    proposalsSent: 0,
    leadsGenerated: 0,
    dealsClosed: 0,
    connectsUsed: 0,
    remainingConnects: 0,
    challengesFaced: '',
    justification: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      api.get<any[]>('/reps').then(setReps).catch(() => {})
    } else {
      api.get<any>(`/reps/by-user/${user?.id}`).then(r => { if (r) setRepId(r.id) }).catch(() => {})
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repId && user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      setError('Rep profile not found. Contact your manager.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/activity-logs', {
        ...form,
        repId: repId || reps[0]?.id,
        date: new Date().toISOString().split('T')[0],
      })
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to save log')
    } finally {
      setLoading(false)
    }
  }

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
  const inputStyle = { background: 'var(--ink)', border: '1px solid rgba(100,116,139,0.2)' }
  const labelClass = "block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider"

  return (
    <div className="p-6 relative z-10">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-slate-600 hover:text-slate-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Log Today's Activity</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-emerald-400 text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle size={14} />
            Activity logged! Redirecting…
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-5" style={{ background: 'var(--ink2)', border: '1px solid rgba(30,37,51,0.8)' }}>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && reps.length > 0 && (
            <div>
              <label className={labelClass}>Rep</label>
              <select value={repId} onChange={e => setRepId(e.target.value)} required className={inputClass} style={inputStyle}>
                <option value="">Select rep…</option>
                {reps.map(r => (
                  <option key={r.id} value={r.id}>{r.user?.name || r.id}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'proposalsSent', label: 'Proposals Sent' },
              { field: 'leadsGenerated', label: 'Leads Generated' },
              { field: 'dealsClosed', label: 'Deals Closed' },
              { field: 'connectsUsed', label: 'Connects Used' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className={labelClass}>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={(form as any)[field] === 0 ? '' : (form as any)[field]}
                  onChange={e => set(field, parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label className={labelClass}>Remaining Connects</label>
              <input
                type="number"
                min={0}
                value={form.remainingConnects === 0 ? '' : form.remainingConnects}
                onChange={e => set('remainingConnects', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Challenges Faced</label>
            <select value={form.challengesFaced} onChange={e => set('challengesFaced', e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">None / Not applicable</option>
              {CHALLENGE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {form.proposalsSent < 3 && (
            <div>
              <label className={labelClass}>
                Justification for fewer proposals
                <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={form.justification}
                onChange={e => set('justification', e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
                style={inputStyle}
                placeholder="Briefly explain why fewer than 3 proposals were sent today…"
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Notes <span className="normal-case text-slate-600">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              placeholder="Anything worth noting today…"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
            style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
          >
            {loading ? 'Saving…' : 'Save Activity Log'}
          </button>
        </form>
      </div>
    </div>
  )
}
