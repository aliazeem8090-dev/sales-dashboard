'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout, getStoredUser, AuthUser } from '@/lib/auth'
import * as jobNotificationsApi from '@/lib/data/job-notifications'
import {
  LayoutDashboard, FileText, MessageSquare, Lightbulb,
  ClipboardList, Star, LogOut, Users, BarChart2, Kanban,
  ClipboardCheck, UserCog, Target, Network, BookOpen,
  UserSearch, Briefcase, UserCircle2, Bell,
} from 'lucide-react'

const NAV_CONFIG = [
  {
    section: 'OVERVIEW',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'REP'] },
    ],
  },
  {
    section: 'MANAGE',
    items: [
      { href: '/manager/reviews',    label: 'Rep Reviews',       icon: ClipboardCheck, roles: ['ADMIN', 'MANAGER'] },
      { href: '/manager/kpis',       label: 'KPI Targets',       icon: Target,         roles: ['ADMIN', 'MANAGER'] },
      { href: '/manager/linkedin',   label: 'LinkedIn Agents',   icon: Network,        roles: ['ADMIN', 'MANAGER'] },
      { href: '/manager/freelancer', label: 'Freelancer Agents', icon: Briefcase,      roles: ['ADMIN', 'MANAGER'] },
      { href: '/manager/leads',      label: 'Leads',             icon: UserCircle2,    roles: ['ADMIN', 'MANAGER'] },
      { href: '/notifications',      label: 'Job Leads',         icon: Bell,           roles: ['ADMIN', 'MANAGER'] },
      { href: '/assignments',        label: 'Assignments',       icon: Users,          roles: ['ADMIN', 'MANAGER'] },
      { href: '/team',               label: 'Team',              icon: UserCog,        roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    section: 'PIPELINE',
    items: [
      { href: '/board',      label: 'Lead Board', icon: Kanban,        roles: ['ADMIN', 'MANAGER', 'REP'] },
      { href: '/leads',      label: 'My Leads',   icon: UserCircle2,   roles: ['REP'] },
      { href: '/proposals',  label: 'Proposals',  icon: FileText,      roles: ['REP'] },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { href: '/chat',     label: 'AI Assistant', icon: MessageSquare, roles: ['ADMIN', 'MANAGER', 'REP'] },
      { href: '/insights', label: 'Insights',     icon: Lightbulb,     roles: ['ADMIN', 'MANAGER', 'REP'] },
    ],
  },
  {
    section: 'LINKEDIN',
    items: [
      { href: '/linkedin/dashboard', label: 'My Dashboard',  icon: LayoutDashboard, roles: ['LINKEDIN_AGENT'] },
      { href: '/linkedin/log',       label: 'Daily Log',     icon: BookOpen,        roles: ['LINKEDIN_AGENT'] },
      { href: '/linkedin/leads',     label: 'Lead Pipeline', icon: UserSearch,      roles: ['LINKEDIN_AGENT'] },
    ],
  },
  {
    section: 'FREELANCER',
    items: [
      { href: '/freelancer/dashboard', label: 'My Dashboard', icon: LayoutDashboard, roles: ['FREELANCER_AGENT'] },
      { href: '/freelancer/leads',     label: 'Leads',        icon: UserSearch,      roles: ['FREELANCER_AGENT'] },
      { href: '/freelancer/applied',   label: 'Applied Jobs', icon: Briefcase,       roles: ['FREELANCER_AGENT'] },
    ],
  },
]

function roleLabel(role: string) {
  if (role === 'LINKEDIN_AGENT') return 'LinkedIn Agent'
  if (role === 'FREELANCER_AGENT') return 'Freelancer Agent'
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [jobLeadCount, setJobLeadCount] = useState(0)

  useEffect(() => {
    const u = getStoredUser()
    setUser(u)
    if (u && (u.role === 'MANAGER' || u.role === 'ADMIN') && u.companyId === 'company-2') {
      jobNotificationsApi.getUnreadCountForUser(u.companyId || 'company-1', u.id)
        .then(setJobLeadCount)
        .catch(() => {})
    }
  }, [])

  const role = user?.role || 'REP'

  const sections = NAV_CONFIG.map(s => ({
    ...s,
    items: s.items.filter(item => item.roles.includes(role)),
  })).filter(s => s.items.length > 0)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside style={{
      width: '240px',
      flexShrink: 0,
      background: 'rgba(11,13,23,0.92)',
      borderRight: '1px solid var(--bord)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px 16px',
      position: 'sticky',
      top: 0,
      height: '100vh',
      backdropFilter: 'blur(24px)',
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '4px 8px 20px',
        borderBottom: '1px solid var(--bord)',
        marginBottom: '12px',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg,#6c47ff,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 500, color: '#fff',
          boxShadow: '0 0 0 1px rgba(124,111,255,0.3),0 4px 16px rgba(100,60,255,0.3)',
        }}>SI</div>
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px', whiteSpace: 'nowrap', color: 'var(--t1)' }}>Sales Intel</p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '1px' }}>PLATFORM v3</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1 }}>
        {sections.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: '4px' }}>
            <p style={{
              fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '2px',
              color: 'var(--t3)', textTransform: 'uppercase', padding: '0 10px',
              margin: '16px 0 4px',
            }}>{section}</p>
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              const isJobLeads = href === '/notifications'
              const badge = isJobLeads && jobLeadCount > 0 ? jobLeadCount : 0
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: 'var(--r3)',
                    cursor: 'pointer', transition: 'all 0.18s',
                    color: active ? 'var(--v2)' : 'var(--t2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '13px',
                    textDecoration: 'none',
                    position: 'relative',
                    background: active ? 'var(--v1a)' : 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon
                    size={15}
                    style={{ flexShrink: 0, color: active ? 'var(--v1)' : 'inherit' }}
                  />
                  {label}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {badge > 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, fontFamily: 'var(--mono)',
                        padding: '1px 5px', borderRadius: '8px',
                        background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                        border: '1px solid rgba(251,191,36,0.3)',
                      }}>{badge}</span>
                    )}
                    {active && !badge && (
                      <div style={{
                        width: '5px', height: '5px',
                        borderRadius: '50%', background: 'var(--v1)',
                        boxShadow: '0 0 6px var(--v1)',
                      }} />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}

        {/* My Report — rep only */}
        {role === 'REP' && user?.repId && (() => {
          const active = pathname.startsWith('/reports')
          return (
            <Link
              href={`/reports/${user.repId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: 'var(--r3)',
                color: active ? 'var(--v2)' : 'var(--t2)',
                fontWeight: active ? 600 : 500,
                fontSize: '13px',
                textDecoration: 'none',
                background: active ? 'var(--v1a)' : 'transparent',
              }}
            >
              <BarChart2 size={15} style={{ color: active ? 'var(--v1)' : 'inherit' }} />
              My Report
            </Link>
          )
        })()}
      </nav>

      {/* User footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '12px',
        borderTop: '1px solid var(--bord)',
      }}>
        {user && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: 'var(--r3)',
              cursor: 'default',
              marginBottom: '4px',
            }}
          >
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg,var(--ink4),#2a3260)',
              border: '1px solid var(--bord2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'var(--v2)',
              flexShrink: 0,
            }}>
              {initials(user.name || 'U')}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--v1)', letterSpacing: '0.5px' }}>{roleLabel(role)}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
