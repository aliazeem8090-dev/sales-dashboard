'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register } from '@/lib/auth'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--r3)',
  background: 'var(--ink)', border: '1px solid var(--bord2)',
  color: 'var(--t1)', fontSize: '13px', outline: 'none',
  fontFamily: 'var(--sans)', transition: 'border-color 0.2s',
  boxSizing: 'border-box',
}

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

  const focusStyle = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = 'var(--v1)')
  const blurStyle  = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = 'var(--bord2)')

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
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', marginBottom: '4px', letterSpacing: '-0.3px' }}>Create account</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)', marginBottom: '24px', letterSpacing: '0.3px' }}>Join your sales team</p>

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
            {[
              { label: 'Full Name',   type: 'text',     val: name,     setter: setName,     placeholder: 'Waqas Ahmed' },
              { label: 'Email',       type: 'email',    val: email,    setter: setEmail,    placeholder: 'you@example.com' },
              { label: 'Password',    type: 'password', val: password, setter: setPassword, placeholder: '••••••••' },
            ].map(({ label, type, val, setter, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</label>
                <input
                  type={type}
                  value={val}
                  onChange={e => setter(e.target.value)}
                  required
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="REP">Sales Rep</option>
                <option value="LINKEDIN_AGENT">LinkedIn Agent</option>
                <option value="FREELANCER_AGENT">Freelancer Agent</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
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
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--t3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--v2)', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
