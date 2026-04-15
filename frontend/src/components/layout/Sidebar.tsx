'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logout, getStoredUser, AuthUser } from '@/lib/auth'
import {
  LayoutDashboard, FileText, MessageSquare, Lightbulb,
  ClipboardList, Star, LogOut, Users, BarChart2, Kanban, ClipboardCheck, UserCog, Target,
} from 'lucide-react'

const allNavItems = [
  { href: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'REP'] },
  { href: '/manager/reviews', label: 'Rep Reviews',  icon: ClipboardCheck,  roles: ['ADMIN', 'MANAGER'] },
  { href: '/manager/kpis',    label: 'KPI Targets',  icon: Target,          roles: ['ADMIN', 'MANAGER'] },
  { href: '/team',            label: 'Team',         icon: UserCog,         roles: ['ADMIN', 'MANAGER'] },
  { href: '/board',           label: 'Lead Board',   icon: Kanban,          roles: ['ADMIN', 'MANAGER', 'REP'] },
  { href: '/proposals',       label: 'Proposals',    icon: FileText,        roles: ['REP'] },
  { href: '/chat',            label: 'AI Assistant', icon: MessageSquare,   roles: ['ADMIN', 'MANAGER', 'REP'] },
  { href: '/insights',        label: 'Insights',     icon: Lightbulb,       roles: ['ADMIN', 'MANAGER', 'REP'] },
  { href: '/assignments',     label: 'Assignments',  icon: Users,           roles: ['ADMIN', 'MANAGER'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => { setUser(getStoredUser()) }, [])

  const role = user?.role || 'REP'
  const visibleItems = allNavItems.filter(item => item.roles.includes(role))

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0" style={{ background: '#07080d', borderRight: '1px solid rgba(6,182,212,0.08)' }}>
      {/* Brand */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-cyan-400" />
          </div>
          <p className="text-white font-semibold text-sm">Sales Intel</p>
        </div>
        <p className="text-[10px] pl-7" style={{ color: 'rgba(6,182,212,0.5)' }}>Platform v2</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon size={14} className={active ? 'text-cyan-400' : ''} />
              {label}
              {active && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </a>
          )
        })}

        {/* My Report — rep only */}
        {role === 'REP' && user?.repId && (
          <a
            href={`/reports/${user.repId}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
              pathname.startsWith('/reports')
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <BarChart2 size={14} />
            My Report
            {pathname.startsWith('/reports') && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
          </a>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
        {user && (
          <div className="mb-3">
            <p className="text-slate-300 text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] capitalize" style={{ color: 'rgba(6,182,212,0.5)' }}>
              {role.toLowerCase()}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-600 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
