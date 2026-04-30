'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { UserCheck, Plus, X, BarChart2, FilePlus } from 'lucide-react'

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
  GENERAL:   'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

const NICHE_LABELS: Record<string, string> = {
  MERN:      'MERN',
  Laravel:   'Laravel',
  AI_ML:     'AI/ML',
  WordPress: 'WordPress',
  GENERAL:   'Multi',
}

const NICHES = ['MERN', 'Laravel', 'AI_ML', 'WordPress', 'GENERAL'] as const

function nicheColor(niche: string) {
  return NICHE_COLORS[niche] || 'bg-slate-700/40 text-slate-400 border-slate-600/30'
}

function nicheLabel(niche: string) {
  return NICHE_LABELS[niche] || niche
}

const inputClass = "w-full px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
const inputStyle = { background: 'rgba(15,20,30,0.8)', border: '1px solid rgba(100,116,139,0.2)' }

export default function AssignmentsPage() {
  const currentUser = getStoredUser()
  const [bidders, setBidders] = useState<BidderUser[]>([])
  const [profiles, setProfiles] = useState<UpworkProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UpworkProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New profile form state
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNiche, setNewNiche] = useState<string>('MERN')
  const [newSkills, setNewSkills] = useState('')
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

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

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    if (!newTitle.trim()) { setProfileError('Profile name is required.'); return }
    setCreatingProfile(true)
    try {
      const skills = newSkills.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/upwork-profiles', {
        title: newTitle.trim(),
        niche: newNiche,
        primarySkills: skills,
      })
      setNewTitle(''); setNewSkills(''); setNewNiche('MERN'); setShowNewProfile(false)
      await loadAll()
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to create profile.')
    } finally {
      setCreatingProfile(false)
    }
  }

  const bgDark = { background: 'var(--ink)' }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Loading…</div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', ...bgDark }}>
        <h1 className="text-lg font-semibold text-slate-200">Profile Assignments</h1>
        <p className="text-xs text-slate-500 mt-0.5">Select a profile to assign or remove reps working on it.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — profiles list */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden" style={{ borderRight: '1px solid rgba(30,37,51,0.8)', ...bgDark }}>

          {/* Column headers + New Profile button */}
          <div className="px-4 py-2.5 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(30,37,51,0.8)' }}>
            <div className="grid grid-cols-2 flex-1 gap-2">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Profile Name</p>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Tech Stack</p>
            </div>
            <button
              onClick={() => { setShowNewProfile(v => !v); setProfileError('') }}
              className="ml-2 p-1.5 rounded-lg transition-colors"
              style={{ color: showNewProfile ? '#f87171' : '#a78bfa' }}
              title={showNewProfile ? 'Cancel' : 'New Profile'}
            >
              {showNewProfile ? <X size={13} /> : <FilePlus size={13} />}
            </button>
          </div>

          {/* New Profile inline form */}
          {showNewProfile && (
            <form
              onSubmit={handleCreateProfile}
              className="px-4 py-3 space-y-2 shrink-0"
              style={{ borderBottom: '1px solid rgba(124,111,255,0.15)', background: 'rgba(124,111,255,0.04)' }}
            >
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">New Profile</p>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Profile name (e.g. Ahmed)"
                className={inputClass}
                style={inputStyle}
              />
              <select
                value={newNiche}
                onChange={e => setNewNiche(e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                {NICHES.map(n => (
                  <option key={n} value={n}>{NICHE_LABELS[n] || n}</option>
                ))}
              </select>
              <input
                value={newSkills}
                onChange={e => setNewSkills(e.target.value)}
                placeholder="Skills (comma-separated)"
                className={inputClass}
                style={inputStyle}
              />
              {profileError && <p className="text-[10px] text-red-400">{profileError}</p>}
              <button
                type="submit"
                disabled={creatingProfile}
                className="w-full py-1.5 text-[11px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', color: '#a78bfa' }}
              >
                {creatingProfile ? 'Creating…' : 'Create Profile'}
              </button>
            </form>
          )}

          {/* Profile list — scrollable */}
          <div className="overflow-y-auto flex-1">
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
                    background: isSelected ? 'rgba(124,111,255,0.08)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #7c6fff' : '2px solid transparent',
                  }}
                >
                  <div className="grid grid-cols-2 px-4 py-3 gap-2 items-start">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[8px] px-1 py-0.5 rounded border font-semibold uppercase tracking-wide ${nicheColor(profile.niche)}`}>
                          {nicheLabel(profile.niche)}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${isSelected ? 'text-violet-300' : 'text-slate-200'}`}>{profile.title}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {assigned.length > 0 ? `${assigned.length} rep${assigned.length > 1 ? 's' : ''}` : 'Unassigned'}
                      </p>
                    </div>
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
        </div>

        {/* Right panel */}
        <div className="flex-1 p-6 overflow-y-auto relative z-10">
          {!selectedProfile ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(124,111,255,0.05)', border: '1px solid rgba(124,111,255,0.1)' }}>
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
                  <p className="text-xs text-slate-600">No reps found. Add reps from the Team page first.</p>
                )}
                {bidders.map(bidder => {
                  const assigned = isAssigned(selectedProfile.id, bidder.id)
                  return (
                    <div
                      key={bidder.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: assigned ? 'rgba(124,111,255,0.06)' : 'var(--ink2)',
                        border: assigned ? '1px solid rgba(124,111,255,0.2)' : '1px solid rgba(30,37,51,0.8)',
                      }}
                    >
                      <div>
                        <p className={`text-xs font-medium ${assigned ? 'text-violet-300' : 'text-slate-300'}`}>{bidder.name}</p>
                        <p className="text-[10px] text-slate-600">{bidder.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {bidder.rep?.id && (
                          <a href={`/reports/${bidder.rep.id}`} className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 transition-colors">
                            <BarChart2 size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => toggleAssignment(bidder.id)}
                          disabled={saving}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            assigned ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-violet-400 hover:bg-violet-500/10'
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
  )
}
