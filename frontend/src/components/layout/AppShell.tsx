'use client'

import { usePathname } from 'next/navigation'
import { AuthGuard } from './AuthGuard'
import { Sidebar } from './Sidebar'

const AUTH_ROUTES = ['/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        {/* Sidebar wrapper: hidden on print */}
        <div className="shrink-0 no-print">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
