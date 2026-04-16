'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { UserPlus, ChevronRight, X } from 'lucide-react'

const STATUSES = ['SEARCHED', 'CONTACTED', 'REPLIED', 'FOLLOWED_UP', 'CONVERTED', 'REJECTED'] as const
type Status = typeof STATUSES[number]

const STATUS_STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  SEARCHED:    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Searched' },
  CONTACTED:   { bg: 'rgba(6,182,212,0.12)',   color: '#67e8f9', label: 'Contacted' },
  REPLIED:     { bg: 'rgba(99,102,241,0.12)',   color: '#a5b4fc', label: 'Replied' },
  FOLLOWED_UP: { bg: 'rgba(250,204,21,0.12)',   color: '#facc15', label: 'Followed Up' },
  CONVERTED:   { bg: 'rgba(74,222,128,0.12)',   color: '#4ade80', label: 'Converted' },
  REJECTED:    { bg: 'rgba(239,68,68,0.10)',    color: '#f87171', label: 'Rejected' },
}

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
const inputStyle = { background: '#07080d', border: '1px solid rgba(100,116,139,0.2)' }

export default function LinkedInLeadsPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'LINKEDIN_AGENT') { router.replace('/dashboard'); return }
    if (!user.agentId) return
    setAgentId(user.agentId)
    fetchLeads(user.agentId)
  }, [])

  async function fetchLeads(aid: string) {
    try {
      const data = await api.get<any[]>(`/linkedin-leads/agent/${aid}`)
      setLeads(data as any[])
    } catch { } finally { setLoading(false) }
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId || !name.trim()) return
    setSubmitting(true)
    try {
      const lead = await api.post(`/linkedin-leads`, { agentId, name: name.trim(), company: company.trim(), source: source.trim(), message: message.trim() || undefined })
      setLeads(prev => [lead as any, ...prev])
      setName(''); setCompany(''); setSource(''); setMessage('')
      setShowForm(false)
    } catch { } finally { setSubmitting(false) }
  }

  async function updateStatus(lead: any, status: Status) {
    setUpdatingId(lead.id)
    try {
      const updated = await api.patch(`/linkedin-leads/${lead.id}`, { status })
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
    } catch { } finally { setUpdatingId(null) }
  }

  async function deleteLead(id: string) {
    try {
      await api.delete(`/linkedin-leads/${id}`)
      setLeads(prev => prev.filter(l => l.id !== id))
    } catch { }
  }

  const filtered = filter === 'ALL' ? leads : leads.filter(l => l.status === filter)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {} as Record<Status, number>)

  return (
    <div className="flex-1 relative z-10">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', background: '#07080d' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Lead Pipeline</h1>
            <p className="text-xs text-slate-500 mt-0.5">{leads.length} total leads</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}
          >
            {showForm ? <X size={13} /> : <UserPlus size={13} />}
            {showForm ? 'Cancel' : 'Add Lead'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-4">

        {/* Add lead form */}
        {showForm && (
          <form onSubmit={addLead} className="rounded-xl p-5 space-y-3" style={{ background: '#0a0b10', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">New Lead</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" className={inputClass} style={inputStyle} required />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Source</label>
                <input value={source} onChange={e => setSource(e.target.value)} placeholder="LinkedIn Search" className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Outreach Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Paste the connection request or InMail message you sent…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 resize-none focus:outline-none focus:border-cyan-500/50 transition-colors"
                style={{ background: '#07080d', border: '1px solid rgba(100,116,139,0.2)' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
              >
                {submitting ? 'Adding…' : 'Add Lead'}
              </button>
            </div>
          </form>
        )}

        {/* Funnel summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {STATUSES.map(s => {
            const st = STATUS_STYLES[s]
            return (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? 'ALL' : s)}
                className="rounded-lg p-2 text-center transition-all"
                style={{ background: filter === s ? st.bg : 'rgba(10,11,16,0.8)', border: `1px solid ${filter === s ? st.color + '40' : 'rgba(100,116,139,0.1)'}` }}
              >
                <p className="text-sm font-bold" style={{ color: st.color }}>{counts[s]}</p>
                <p className="text-[9px] text-slate-500">{st.label}</p>
              </button>
            )
          })}
        </div>

        {/* Lead list */}
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading leads…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 p-10 text-center" style={{ background: '#0a0b10' }}>
            <p className="text-slate-500 text-sm">{filter === 'ALL' ? 'No leads yet.' : `No ${STATUS_STYLES[filter as Status]?.label} leads.`}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => {
              const st = STATUS_STYLES[lead.status as Status] || STATUS_STYLES.SEARCHED
              const nextStatuses = STATUSES.filter(s => s !== lead.status && s !== 'SEARCHED')
              return (
                <div
                  key={lead.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-200">{lead.name}</p>
                        {lead.company && <span className="text-xs text-slate-500">{lead.company}</span>}
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      {lead.source && <p className="text-[10px] text-slate-600 mt-0.5">Source: {lead.source}</p>}
                      {lead.contactedAt && (
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Contacted: {new Date(lead.contactedAt).toLocaleDateString()}
                        </p>
                      )}
                      {lead.message && (
                        <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2" title={lead.message}>
                          "{lead.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={lead.status}
                        onChange={e => updateStatus(lead, e.target.value as Status)}
                        disabled={updatingId === lead.id}
                        className="text-[10px] px-2 py-1 rounded-lg cursor-pointer focus:outline-none disabled:opacity-50"
                        style={{ background: '#07080d', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
