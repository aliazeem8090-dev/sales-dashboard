'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { UserCheck, Plus, X, BarChart2 } from 'lucide-react'

interface BidderUser {
  id: string; name: string; email: string; role: string; rep?: { id: string }
}
interface UpworkProfile {
  id: string; title: string; niche: string; primarySkills: string
}
interface Assignment {
  id: string; bidderId: string; profileId: string; bidder: BidderUser; profile: UpworkProfile
}

const NICHE_COLORS: Record<string, string> = {
  MERN:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Laravel:   'bg-red-500/15 text-red-400 border-red-500/25',
  AI_ML:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  WordPress: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  GENERAL:   'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
}

const NICHE_LABELS: Record<string, string> = {
  MERN:    'MERN',
  Laravel: 'Laravel',
  AI_ML:   'AI/ML',
  GENERAL: 'Multi',
}

function nicheColor(niche: string) {
  return NICHE_COLORS[niche] || 'bg-slate-700/40 text-slate-400 border-slate-600/30'
}

function nicheLabel(niche: string) {
  return NICHE_LABELS[niche] || niche
}

export default function AssignmentsPage() {
  const currentUser = getStoredUser()
  const [bidders, setBidders] = useState<BidderUser[]>([])
  const [profiles, setProfiles] = useState<UpworkProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UpworkProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [usersData, profilesData, assignmentsData] = await Promise.all([
        api.get<BidderUser[]>('/users').catch(() => [] as BidderUser[]),
        api.get<UpworkProfile[]>('/upwork-profiles').catch(() => [] as UpworkProfile[]),
        api.get<Assignment[]>('/bidder-assignments').catch(() => [] as Assignment[]),
      ])
      setBidders(usersData.filter(u => u.role === 'REP'))
      setProfiles(profilesData)
      setAssignments(assignmentsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedProfile) {
      const updated = profiles.find(p => p.id === selectedProfile.id)
      if (updated) setSelectedProfile(updated)
    }
  }, [profiles])

  function getAssignedBidders(profileId: string): BidderUser[] {
    return assignments.filter(a => a.profileId === profileId).map(a => a.bidder).filter(Boolean)
  }

  function isAssigned(profileId: string, bidderId: string) {
    return assignments.some(a => a.profileId === profileId && a.bidderId === bidderId)
  }

  async function toggleAssignment(bidderId: string) {
    if (!selectedProfile || !currentUser) return
    setSaving(true)
    try {
      if (isAssigned(selectedProfile.id, bidderId)) {
        await api.delete(`/bidder-assignments/${bidderId}/${selectedProfile.id}`)
      } else {
        await api.post('/bidder-assignments', { bidderId, profileId: selectedProfile.id })
      }
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  const bgDark = { background: '#07080d' }
  const cardStyle = { background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', ...bgDark }}>
          <h1 className="text-lg font-semibold text-slate-200">Profile Assignments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Select a profile to assign or remove reps working on it.</p>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — profiles list */}
          <div className="w-80 shrink-0 overflow-y-auto" style={{ borderRight: '1px solid rgba(30,37,51,0.8)', ...bgDark }}>
            {/* Column headers */}
            <div className="grid grid-cols-2 px-4 py-2.5 gap-2" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Profile Name</p>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Tech Stack</p>
            </div>
            {profiles.map(profile => {
              const assigned = getAssignedBidders(profile.id)
              const isSelected = selectedProfile?.id === profile.id
              const skills: string[] = Array.isArray(profile.primarySkills)
                ? profile.primarySkills
                : (profile.primarySkills as any as string)?.split(',').map((s: string) => s.trim()) ?? []
              return (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className="w-full text-left transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(30,37,51,0.6)',
                    background: isSelected ? 'rgba(6,182,212,0.08)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #06b6d4' : '2px solid transparent',
                  }}
                >
                  <div className="grid grid-cols-2 px-4 py-3 gap-2 items-start">
                    {/* Profile Name column */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[8px] px-1 py-0.5 rounded border font-semibold uppercase tracking-wide ${nicheColor(profile.niche)}`}>
                          {nicheLabel(profile.niche)}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>{profile.title}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {assigned.length > 0 ? `${assigned.length} rep${assigned.length > 1 ? 's' : ''}` : 'Unassigned'}
                      </p>
                    </div>
                    {/* Tech Stack column */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {skills.slice(0, 4).map((skill: string) => (
                        <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right panel */}
          <div className="flex-1 p-6 overflow-y-auto relative z-10">
            {!selectedProfile ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' }}>
                  <UserCheck size={20} className="text-slate-700" />
                </div>
                <p className="text-sm text-slate-600">Select a profile from the left to manage assignments</p>
              </div>
            ) : (
              <div className="max-w-lg">
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${nicheColor(selectedProfile.niche)}`}>
                      {nicheLabel(selectedProfile.niche)}
                    </span>
                    <h2 className="text-sm font-semibold text-slate-200">{selectedProfile.title}</h2>
                  </div>
                  {selectedProfile.primarySkills && (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(selectedProfile.primarySkills)
                        ? selectedProfile.primarySkills
                        : (selectedProfile.primarySkills as any as string).split(',').map((s: string) => s.trim())
                      ).map((skill: string) => (
                        <span key={skill} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">
                  Reps ({getAssignedBidders(selectedProfile.id).length} assigned)
                </p>

                <div className="space-y-2">
                  {bidders.length === 0 && (
                    <p className="text-xs text-slate-600">No reps found. Reps must register first.</p>
                  )}
                  {bidders.map(bidder => {
                    const assigned = isAssigned(selectedProfile.id, bidder.id)
                    return (
                      <div
                        key={bidder.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={{
                          background: assigned ? 'rgba(6,182,212,0.06)' : '#0a0b10',
                          border: assigned ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(30,37,51,0.8)',
                        }}
                      >
                        <div>
                          <p className={`text-xs font-medium ${assigned ? 'text-cyan-300' : 'text-slate-300'}`}>{bidder.name}</p>
                          <p className="text-[10px] text-slate-600">{bidder.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {bidder.rep?.id && (
                            <a href={`/reports/${bidder.rep.id}`} className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 transition-colors">
                              <BarChart2 size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => toggleAssignment(bidder.id)}
                            disabled={saving}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              assigned ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                            }`}
                            title={assigned ? 'Remove' : 'Assign'}
                          >
                            {assigned ? <X size={14} /> : <Plus size={14} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
