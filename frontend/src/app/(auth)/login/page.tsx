'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'var(--background)' }}>
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#06b6d4' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Sales Intelligence</p>
            <p className="text-[10px]" style={{ color: 'rgba(6,182,212,0.6)' }}>Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#0a0b10', border: '1px solid rgba(6,182,212,0.12)' }}>
          <h1 className="text-xl font-semibold text-slate-200 mb-1">Sign in</h1>
          <p className="text-xs text-slate-500 mb-6">Enter your credentials to access the platform</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
                style={{ background: '#07080d', border: '1px solid rgba(100,116,139,0.25)' }}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors"
                style={{ background: '#07080d', border: '1px solid rgba(100,116,139,0.25)' }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 mt-2"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            No account?{' '}
            <a href="/register" className="text-cyan-500/70 hover:text-cyan-400 transition-colors">Register</a>
          </p>
        </div>
      </div>
    </div>
  )
}
