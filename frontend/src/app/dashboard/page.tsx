'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/auth'
import { RepDashboard } from './components/RepDashboard'
import { ManagerDashboard } from './components/ManagerDashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [isManager, setIsManager] = useState<boolean | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user?.role === 'LINKEDIN_AGENT') {
      router.replace('/linkedin/dashboard')
      return
    }
    setIsManager(user?.role === 'MANAGER' || user?.role === 'ADMIN')
  }, [])

  if (isManager === null) return null

  return isManager ? <ManagerDashboard /> : <RepDashboard />
}
