'use client'

import { useState, useEffect } from 'react'
import { X, Zap } from 'lucide-react'
import { api } from '@/lib/api'

interface EditProposalPanelProps {
  proposal: any
  onSaved: (updated: any) => void
  onClose: () => void
}

const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
const inputStyle = { background: 'var(--ink)', border: '1px solid rgba(100,116,139,0.2)' }
const labelClass = "block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider"

export function EditProposalPanel({ proposal, onSaved, onClose }: EditProposalPanelProps) {
  const [jobTitle, setJobTitle] = useState(proposal.job?.title || '')
  const [proposalText, setProposalText] = useState(proposal.fullProposalText || '')
  const [connectsUsed, setConnectsUsed] = useState<number>(proposal.connectsUsed || 6)
  const [profileUsedId, setProfileUsedId] = useState(proposal.profileUsedId || '')
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<any[]>('/upwork-profiles').then(setProfiles).catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Update job title if changed
      if (proposal.job?.id && jobTitle !== proposal.job.title) {
        await api.patch(`/jobs/${proposal.job.id}`, { title: jobTitle })
      }
      // Update proposal fields
      const updated = await api.put<any>(`/proposals/${proposal.id}`, {
        fullProposalText: proposalText,
        connectsUsed,
        profileUsedId: profileUsedId || null,
      })
      onSaved({ ...updated, job: { ...proposal.job, title: jobTitle } })
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-y-auto flex flex-col"
        style={{ background: 'var(--ink)', borderLeft: '1px solid rgba(124,111,255,0.12)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Edit Proposal</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Update the details of this proposal</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-lg text-red-400 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Job Title</label>
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass}>Profile Used</label>
            <select
              value={profileUsedId}
              onChange={e => setProfileUsedId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">No profile selected</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.niche})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Your Proposal</label>
            <textarea
              value={proposalText}
              onChange={e => setProposalText(e.target.value)}
              rows={10}
              className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
              style={inputStyle}
            />
          </div>

          <div className="w-40">
            <label className={labelClass}>Connects Used</label>
            <div className="relative flex items-center">
              <Zap size={12} className="absolute left-3 text-amber-500 pointer-events-none" />
              <input
                type="number"
                value={connectsUsed}
                onChange={e => setConnectsUsed(parseInt(e.target.value) || 0)}
                min={0}
                className={`${inputClass} pl-8`}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
              style={{ border: '1px solid rgba(100,116,139,0.15)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
