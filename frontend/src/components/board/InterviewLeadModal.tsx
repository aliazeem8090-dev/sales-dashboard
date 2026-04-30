'use client'

import { useState } from 'react'
import { X, UserCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

interface InterviewLeadModalProps {
  proposalId: string
  repId: string
  onSaved: () => void
  onSkip: () => void
  onCancel: () => void
}

const FIELD_CLASS = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
const FIELD_STYLE = { background: 'rgba(15,20,30,0.9)', border: '1px solid rgba(100,116,139,0.2)' }
const LABEL_CLASS = "block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5"

export function InterviewLeadModal({ proposalId, repId, onSaved, onSkip, onCancel }: InterviewLeadModalProps) {
  const [form, setForm] = useState({
    clientName: '',
    companyName: '',
    clientMessage: '',
    persona: '',
    rate: '',
    clientContactInfo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.clientName.trim()) { setError('Client name is required.'); return }
    setSaving(true)
    try {
      await api.post('/leads', {
        repId,
        proposalId,
        ...form,
      })
      onSaved()
    } catch (err: any) {
      setError(err?.message || 'Failed to save lead.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--ink)', border: '1px solid rgba(124,111,255,0.2)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between shrink-0" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)' }}>
              <UserCircle2 size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Log Interview Lead</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Card moved to Interview — capture client details</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-red-400 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Client Name <span className="text-violet-500">*</span></label>
              <input
                value={form.clientName}
                onChange={e => set('clientName', e.target.value)}
                placeholder="e.g. John Smith"
                className={FIELD_CLASS}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Company Name</label>
              <input
                value={form.companyName}
                onChange={e => set('companyName', e.target.value)}
                placeholder="e.g. Acme Corp"
                className={FIELD_CLASS}
                style={FIELD_STYLE}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Rate</label>
              <input
                value={form.rate}
                onChange={e => set('rate', e.target.value)}
                placeholder="e.g. $50/hr or $2,000 fixed"
                className={FIELD_CLASS}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Persona</label>
              <input
                value={form.persona}
                onChange={e => set('persona', e.target.value)}
                placeholder="e.g. Startup founder"
                className={FIELD_CLASS}
                style={FIELD_STYLE}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Client Contact Info</label>
            <input
              value={form.clientContactInfo}
              onChange={e => set('clientContactInfo', e.target.value)}
              placeholder="e.g. email, Skype, WhatsApp"
              className={FIELD_CLASS}
              style={FIELD_STYLE}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Client Message</label>
            <textarea
              value={form.clientMessage}
              onChange={e => set('clientMessage', e.target.value)}
              rows={4}
              placeholder="Paste the client's message or key points from your conversation…"
              className={FIELD_CLASS}
              style={FIELD_STYLE}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 pb-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
            >
              {saving ? 'Saving…' : 'Save Lead & Move to Interview'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-300 rounded-xl transition-colors"
              style={{ border: '1px solid rgba(100,116,139,0.15)' }}
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
