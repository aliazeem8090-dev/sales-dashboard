'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as freelancerLeadsApi from '@/lib/data/freelancer-leads'
import { getStoredUser } from '@/lib/auth'
import { Plus, X, ChevronDown, ChevronUp, Phone, Mail, Trash2, FileText } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
const inputStyle = { background: '#0d0e14', border: '1px solid rgba(100,116,139,0.2)' }

const STATUSES = ['NEW', 'PROPOSAL_SENT', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST'] as const
type LeadStatus = typeof STATUSES[number]

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW:           'New',
  PROPOSAL_SENT: 'Proposal Sent',
  REPLIED:       'Replied',
  INTERVIEW:     'Interview',
  HIRED:         'Hired',
  LOST:          'Lost',
}
const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW:           '#64748b',
  PROPOSAL_SENT: '#a78bfa',
  REPLIED:       '#a5b4fc',
  INTERVIEW:     '#fb923c',
  HIRED:         '#4ade80',
  LOST:          '#f87171',
}

interface Lead {
  id: string
  clientName: string
  jobDescription: string
  proposal: string
  contactMobile: string
  contactEmail: string
  status: LeadStatus
  notes: string
  createdAt: string
}

export default function FreelancerLeadsPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // form state
  const [clientName, setClientName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [proposal, setProposal] = useState('')
  const [contactMobile, setContactMobile] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'FREELANCER_AGENT') { router.replace('/dashboard'); return }
    if (!user.freelancerAgentId) { setLoading(false); return }
    setAgentId(user.freelancerAgentId)
    fetchLeads(user.freelancerAgentId)
  }, [])

  async function fetchLeads(id: string) {
    try {
      const data = await freelancerLeadsApi.findByAgent(id)
      setLeads(data as any)
    } catch { } finally { setLoading(false) }
  }

  function resetForm() {
    setClientName(''); setJobDescription(''); setProposal('')
    setContactMobile(''); setContactEmail(''); setNotes('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId || !clientName.trim()) return
    setSubmitting(true)
    try {
      const lead = await freelancerLeadsApi.create(agentId, {
        clientName: clientName.trim(),
        jobDescription: jobDescription.trim() || undefined,
        proposal: proposal.trim() || undefined,
        contactMobile: contactMobile.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setLeads(prev => [lead as any, ...prev])
      resetForm()
      setShowForm(false)
    } catch { } finally { setSubmitting(false) }
  }

  async function handleStatusChange(lead: Lead, newStatus: LeadStatus) {
    try {
      const updated = await freelancerLeadsApi.update(lead.id, { status: newStatus })
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...updated } : l))
    } catch { }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await freelancerLeadsApi.remove(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch { } finally { setDeletingId(null) }
  }

  const filtered = filterStatus === 'ALL' ? leads : leads.filter(l => l.status === filterStatus)

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Leads</h1>
            <p className="text-xs text-slate-500 mt-0.5">{leads.length} total · {leads.filter(l => l.status === 'HIRED').length} hired</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.25)', color: '#a78bfa' }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Add Lead'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-4">

        {/* Add lead form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-xl p-5 space-y-4" style={{ background: 'var(--ink2)', border: '1px solid rgba(124,111,255,0.15)' }}>
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">New Lead</p>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Client Name *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Ahmed Raza" className={inputClass} style={inputStyle} required />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Job Description</label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="What is the client looking for?" rows={3} className={inputClass + ' resize-none'} style={inputStyle} />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Proposal / Cover Letter</label>
              <textarea value={proposal} onChange={e => setProposal(e.target.value)} placeholder="What did you send the client?" rows={4} className={inputClass + ' resize-none'} style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Contact Mobile</label>
                <input value={contactMobile} onChange={e => setContactMobile(e.target.value)} placeholder="+92 300 0000000" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Contact Email</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="client@example.com" className={inputClass} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context…" className={inputClass} style={inputStyle} />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" disabled={submitting || !clientName.trim()} className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors" style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}>
                {submitting ? 'Adding…' : 'Add Lead'}
              </button>
            </div>
          </form>
        )}

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['ALL', ...STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors"
              style={{
                background:  filterStatus === s ? (s === 'ALL' ? 'rgba(124,111,255,0.15)' : `${STATUS_COLORS[s as LeadStatus]}18`) : 'transparent',
                border:      `1px solid ${filterStatus === s ? (s === 'ALL' ? 'rgba(124,111,255,0.3)' : `${STATUS_COLORS[s as LeadStatus]}40`) : 'rgba(100,116,139,0.15)'}`,
                color:       filterStatus === s ? (s === 'ALL' ? '#a78bfa' : STATUS_COLORS[s as LeadStatus]) : '#64748b',
              }}
            >
              {s === 'ALL' ? 'All' : STATUS_LABELS[s as LeadStatus]}
              {s !== 'ALL' && <span className="ml-1 opacity-60">{leads.filter(l => l.status === s).length}</span>}
            </button>
          ))}
        </div>

        {/* Lead list */}
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading leads…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-10 text-center" style={{ background: 'var(--ink2)' }}>
            <p className="text-slate-500 text-sm">{filterStatus === 'ALL' ? 'No leads yet.' : `No leads with status "${STATUS_LABELS[filterStatus as LeadStatus]}".`}</p>
            {filterStatus === 'ALL' && <p className="text-xs text-slate-600 mt-1">Click "Add Lead" to log your first client.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => {
              const color = STATUS_COLORS[lead.status]
              const isExpanded = expandedId === lead.id
              return (
                <div key={lead.id} className="rounded-xl" style={{ background: 'var(--ink2)', border: `1px solid rgba(100,116,139,0.1)` }}>
                  {/* Summary row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-200">{lead.clientName}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </div>
                      {lead.jobDescription && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{lead.jobDescription}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {lead.contactEmail && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-600">
                            <Mail size={9} /> {lead.contactEmail}
                          </span>
                        )}
                        {lead.contactMobile && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-600">
                            <Phone size={9} /> {lead.contactMobile}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : lead.id)} className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                      <div className="pt-3 space-y-3">

                        {/* Job description */}
                        {lead.jobDescription && (
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Job Description</p>
                            <p className="text-[12px] text-slate-400 leading-relaxed">{lead.jobDescription}</p>
                          </div>
                        )}

                        {/* Proposal */}
                        {lead.proposal && (
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <FileText size={9} /> Proposal Sent
                            </p>
                            <p className="text-[12px] text-slate-400 leading-relaxed italic">&ldquo;{lead.proposal}&rdquo;</p>
                          </div>
                        )}

                        {/* Contact info */}
                        {(lead.contactEmail || lead.contactMobile) && (
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Contact Info</p>
                            <div className="flex gap-4">
                              {lead.contactEmail && (
                                <a href={`mailto:${lead.contactEmail}`} className="flex items-center gap-1.5 text-[12px] text-violet-400 hover:text-violet-300">
                                  <Mail size={11} /> {lead.contactEmail}
                                </a>
                              )}
                              {lead.contactMobile && (
                                <a href={`tel:${lead.contactMobile}`} className="flex items-center gap-1.5 text-[12px] text-violet-400 hover:text-violet-300">
                                  <Phone size={11} /> {lead.contactMobile}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {lead.notes && (
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-[12px] text-slate-400">{lead.notes}</p>
                          </div>
                        )}

                        {/* Status change */}
                        <div>
                          <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">Update Status</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUSES.map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(lead, s)}
                                disabled={s === lead.status}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-40"
                                style={{
                                  background: s === lead.status ? `${STATUS_COLORS[s]}18` : 'transparent',
                                  border: `1px solid ${s === lead.status ? `${STATUS_COLORS[s]}40` : 'rgba(100,116,139,0.15)'}`,
                                  color: s === lead.status ? STATUS_COLORS[s] : '#64748b',
                                }}
                              >
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDelete(lead.id)}
                            disabled={deletingId === lead.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={11} />
                            {deletingId === lead.id ? 'Deleting…' : 'Delete Lead'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
