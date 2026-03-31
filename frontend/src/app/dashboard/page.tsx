'use client'

import { useState, useEffect } from 'react'
import { getStoredUser } from '@/lib/auth'
import { RepDashboard } from './components/RepDashboard'
import { ManagerDashboard } from './components/ManagerDashboard'

export default function DashboardPage() {
  const [isManager, setIsManager] = useState<boolean | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    setIsManager(user?.role === 'MANAGER' || user?.role === 'ADMIN')
  }, [])

  if (isManager === null) return null

  return isManager ? <ManagerDashboard /> : <RepDashboard />
}
