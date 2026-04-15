'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('REP')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password, role)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
  const inputStyle = { background: '#07080d', border: '1px solid rgba(100,116,139,0.2)' }
  const labelClass = "block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider"

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: '#0a0b10', border: '1px solid rgba(30,37,51,0.8)' }}>
        <h1 className="text-xl font-semibold text-slate-200 mb-1">Create account</h1>
        <p className="text-xs text-slate-500 mb-6">Join your sales team</p>

        {error && (
          <div className="mb-4 px-3 py-2.5 text-sm text-red-400 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="Waqas Ahmed"
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="REP">Sales Rep</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="LEAD">Team Lead</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
            style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
