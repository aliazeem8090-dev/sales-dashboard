'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(90,60,200,0.18) 0%, transparent 60%), var(--ink)',
      fontFamily: 'var(--sans)',
    }}>
      <div style={{ width: '100%', maxWidth: '360px', margin: '0 16px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px',
            background: 'linear-gradient(135deg,#6c47ff,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 500, color: '#fff',
            boxShadow: '0 0 0 1px rgba(124,111,255,0.3), 0 4px 16px rgba(100,60,255,0.3)',
          }}>SI</div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.2px' }}>Sales Intelligence</p>
            <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '1px' }}>PLATFORM v3</p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(17,20,37,0.9)',
          border: '1px solid var(--bord2)',
          borderRadius: 'var(--r)',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow)',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', marginBottom: '4px', letterSpacing: '-0.3px' }}>Sign in</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)', marginBottom: '24px', letterSpacing: '0.3px' }}>Enter your credentials to continue</p>

          {error && (
            <div style={{
              marginBottom: '16px', padding: '10px 12px', borderRadius: 'var(--r3)',
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
              fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--r3)',
                  background: 'var(--ink)', border: '1px solid var(--bord2)',
                  color: 'var(--t1)', fontSize: '13px', outline: 'none',
                  fontFamily: 'var(--sans)', transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--v1)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--bord2)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--r3)',
                  background: 'var(--ink)', border: '1px solid var(--bord2)',
                  color: 'var(--t1)', fontSize: '13px', outline: 'none',
                  fontFamily: 'var(--sans)', transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--v1)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--bord2)')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: 'var(--r3)',
                background: loading ? 'rgba(124,111,255,0.4)' : 'linear-gradient(135deg,#6c47ff,#8b6fff)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                fontFamily: 'var(--sans)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(108,71,255,0.35)',
                marginTop: '4px',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
            No account?{' '}
            <Link href="/register" style={{ color: 'var(--v2)', textDecoration: 'none' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
