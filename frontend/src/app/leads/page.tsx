'use client'

import { useEffect, useState } from 'react'
import * as leadsApi from '@/lib/data/leads'
import { getStoredUser } from '@/lib/auth'
import { UserCircle2, Pencil, Check, X } from 'lucide-react'

interface Lead {
  id: string
  clientName: string
  companyName: string
  clientMessage: string
  persona: string
  rate: string
  clientContactInfo: string
  createdAt: string
}

const FIELDS: { key: keyof Lead; label: string; multiline?: boolean }[] = [
  { key: 'clientName',        label: 'Client Name' },
  { key: 'companyName',       label: 'Company Name' },
  { key: 'rate',              label: 'Rate' },
  { key: 'persona',           label: 'Persona' },
  { key: 'clientContactInfo', label: 'Contact Info' },
  { key: 'clientMessage',     label: 'Client Message', multiline: true },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const BASE_INPUT = "w-full px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
const BASE_STYLE = { background: 'rgba(15,20,30,0.9)', border: '1px solid rgba(100,116,139,0.25)' }

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Lead>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (!user) return
    leadsApi.findByUserId(user.id)
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function startEdit(lead: Lead) {
    setEditingId(lead.id)
    setDraft({
      clientName:        lead.clientName,
      companyName:       lead.companyName,
      clientMessage:     lead.clientMessage,
      persona:           lead.persona,
      rate:              lead.rate,
      clientContactInfo: lead.clientContactInfo,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft({})
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const updated = await leadsApi.update(id, draft)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l))
      setEditingId(null)
      setDraft({})
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)' }}>
            <UserCircle2 size={15} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-200">My Leads</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} logged from replied proposals
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-2xl space-y-3">
        {loading ? (
          <p className="text-xs text-slate-500 py-10 text-center">Loading…</p>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-12 text-center" style={{ background: 'var(--ink2)' }}>
            <UserCircle2 size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No leads yet.</p>
            <p className="text-xs text-slate-600 mt-1">Leads are captured when you move a proposal to Replied.</p>
          </div>
        ) : (
          leads.map(lead => {
            const isEditing = editingId === lead.id
            return (
              <div
                key={lead.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--ink2)',
                  border: isEditing ? '1px solid rgba(124,111,255,0.3)' : '1px solid rgba(100,116,139,0.1)',
                }}
              >
                {/* Card header */}
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {isEditing ? (
                        <input
                          value={draft.clientName ?? ''}
                          onChange={e => setDraft(d => ({ ...d, clientName: e.target.value }))}
                          className={BASE_INPUT + ' text-sm font-semibold'}
                          style={BASE_STYLE}
                        />
                      ) : lead.clientName}
                    </p>
                    {!isEditing && lead.companyName && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{lead.companyName}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-slate-600">{timeAgo(lead.createdAt)}</span>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(lead.id)}
                          disabled={saving}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
                        >
                          <Check size={11} />
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(lead)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-colors"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {FIELDS.filter(f => f.key !== 'clientName').map(({ key, label, multiline }) => (
                    <div key={key} className={multiline ? 'col-span-2' : ''}>
                      <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1">{label}</p>
                      {isEditing ? (
                        multiline ? (
                          <textarea
                            value={(draft[key] as string) ?? ''}
                            onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                            rows={3}
                            className={BASE_INPUT + ' resize-none'}
                            style={BASE_STYLE}
                          />
                        ) : (
                          <input
                            value={(draft[key] as string) ?? ''}
                            onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                            className={BASE_INPUT}
                            style={BASE_STYLE}
                          />
                        )
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {(lead[key] as string) || <span className="text-slate-600">—</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
