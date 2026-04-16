'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { UserPlus, Trash2, Mail, Shield, X, RefreshCw } from 'lucide-react'

const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
const inputStyle = { background: '#0a0b10', border: '1px solid rgba(100,116,139,0.2)' }

const ROLE_LABELS: Record<string, string> = {
  REP: 'Sales Rep',
  LINKEDIN_AGENT: 'LinkedIn Agent',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
}
const ROLE_COLORS: Record<string, string> = {
  REP: '#67e8f9',
  LINKEDIN_AGENT: '#a5b4fc',
  MANAGER: '#4ade80',
  ADMIN: '#f87171',
}

export default function TeamPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'REP' | 'LINKEDIN_AGENT'>('REP')

  useEffect(() => {
    const u = getStoredUser()
    if (!u || (u.role !== 'MANAGER' && u.role !== 'ADMIN')) {
      router.replace('/dashboard')
      return
    }
    setCurrentUser(u)
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const data = await api.get<any[]>('/users')
      // Show only non-admin/manager users
      setUsers((data as any[]).filter(u => u.role === 'REP' || u.role === 'LINKEDIN_AGENT'))
    } catch { } finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password.trim()) { setError('All fields are required.'); return }
    setSubmitting(true)
    try {
      await api.post('/auth/register', { name: name.trim(), email: email.trim(), password, role: newUserRole })
      setName(''); setEmail(''); setPassword(''); setShowForm(false)
      await fetchUsers()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user.')
    } finally { setSubmitting(false) }
  }

  async function handleDelete(user: any) {
    setDeletingId(user.id)
    try {
      await api.delete(`/users/${user.id}`)
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch { } finally { setDeletingId(null); setConfirmDelete(null) }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRoleId(userId)
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch { } finally { setChangingRoleId(null) }
  }

  const repCount = users.filter(u => u.role === 'REP').length
  const agentCount = users.filter(u => u.role === 'LINKEDIN_AGENT').length

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', background: '#07080d' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-200">Team Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {repCount} sales rep{repCount !== 1 ? 's' : ''} · {agentCount} LinkedIn agent{agentCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError('') }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}
          >
            {showForm ? <X size={13} /> : <UserPlus size={13} />}
            {showForm ? 'Cancel' : 'Add Member'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-2xl space-y-4">

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-xl p-5 space-y-3" style={{ background: '#0a0b10', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">New Team Member</p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Role</label>
              <div className="flex gap-2">
                {(['REP', 'LINKEDIN_AGENT'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewUserRole(r)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      background: newUserRole === r ? `${ROLE_COLORS[r]}18` : 'transparent',
                      border: `1px solid ${newUserRole === r ? ROLE_COLORS[r] + '50' : 'rgba(100,116,139,0.2)'}`,
                      color: newUserRole === r ? ROLE_COLORS[r] : '#64748b',
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fatima Khan" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. fatima@company.com" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set initial password" className={inputClass} style={inputStyle} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
              >
                {submitting ? 'Creating…' : `Create ${ROLE_LABELS[newUserRole]}`}
              </button>
            </div>
          </form>
        )}

        {/* User list */}
        {loading ? (
          <p className="text-slate-500 text-xs py-8">Loading team…</p>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 p-10 text-center" style={{ background: '#0a0b10' }}>
            <p className="text-slate-500 text-sm">No team members yet.</p>
            <p className="text-xs text-slate-600 mt-1">Click "Add Member" to create the first profile.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => {
              const roleColor = ROLE_COLORS[user.role] || '#64748b'
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                  style={{ background: '#0a0b10', border: '1px solid rgba(100,116,139,0.1)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Mail size={10} />
                        {user.email}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Role toggle */}
                    <button
                      onClick={() => handleRoleChange(user.id, user.role === 'REP' ? 'LINKEDIN_AGENT' : 'REP')}
                      disabled={changingRoleId === user.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors disabled:opacity-40"
                      title={`Switch to ${user.role === 'REP' ? 'LinkedIn Agent' : 'Sales Rep'}`}
                    >
                      <RefreshCw size={11} />
                      {changingRoleId === user.id ? '…' : user.role === 'REP' ? '→ LinkedIn' : '→ Sales Rep'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(user)}
                      disabled={deletingId === user.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                      {deletingId === user.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-xl p-6 w-80 space-y-4" style={{ background: '#0f1117', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm font-semibold text-slate-200">Delete member?</p>
            <p className="text-xs text-slate-400">
              This will permanently remove <span className="text-slate-200 font-medium">{confirmDelete.name}</span> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
