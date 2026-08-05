'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as leadsApi from '@/lib/data/leads'
import { getStoredUser } from '@/lib/auth'
import { UserCircle2, Building2, MessageSquare, Phone, DollarSign, User } from 'lucide-react'

interface Lead {
  id: string
  clientName: string
  companyName: string
  clientMessage: string
  persona: string
  rate: string
  clientContactInfo: string
  createdAt: string
  rep?: { user?: { name?: string } }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ManagerLeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (!u || (u.role !== 'MANAGER' && u.role !== 'ADMIN')) {
      router.replace('/dashboard')
      return
    }
    leadsApi.findByCompany(u.companyId || 'company-1')
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)' }}>
            <UserCircle2 size={15} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Interview Leads</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} captured from interview-stage proposals
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <p className="text-xs text-slate-500 py-10 text-center">Loading leads…</p>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-12 text-center" style={{ background: 'var(--ink2)' }}>
            <UserCircle2 size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No leads yet.</p>
            <p className="text-xs text-slate-600 mt-1">Leads appear when reps move proposals to the Interview column.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => {
              const isOpen = expanded === lead.id
              return (
                <div
                  key={lead.id}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{ background: 'var(--ink2)', border: isOpen ? '1px solid rgba(124,111,255,0.25)' : '1px solid rgba(100,116,139,0.1)' }}
                >
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : lead.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                      {/* Client */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{lead.clientName}</p>
                        {lead.companyName && (
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Building2 size={9} />
                            {lead.companyName}
                          </p>
                        )}
                      </div>

                      {/* Rep */}
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Rep</p>
                        <p className="text-xs text-slate-400 truncate">{lead.rep?.user?.name || '—'}</p>
                      </div>

                      {/* Rate */}
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Rate</p>
                        <p className="text-xs text-slate-400">{lead.rate || '—'}</p>
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-600">{timeAgo(lead.createdAt)}</span>
                      </div>
                    </div>

                    <div className="w-4 shrink-0 text-slate-600 text-xs">{isOpen ? '▲' : '▼'}</div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="px-5 pb-5 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid rgba(30,37,51,0.8)' }}>
                      <div className="pt-4">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User size={10} /> Persona
                        </p>
                        <p className="text-xs text-slate-300">{lead.persona || '—'}</p>
                      </div>

                      <div className="pt-4">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Phone size={10} /> Contact Info
                        </p>
                        <p className="text-xs text-slate-300">{lead.clientContactInfo || '—'}</p>
                      </div>

                      {lead.clientMessage && (
                        <div className="col-span-2 pt-2">
                          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <MessageSquare size={10} /> Client Message
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{lead.clientMessage}</p>
                        </div>
                      )}
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
