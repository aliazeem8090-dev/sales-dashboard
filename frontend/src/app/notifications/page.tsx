'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { ExternalLink, CheckCheck, Bell, Clock } from 'lucide-react'

interface JobNotification {
  id: string
  jobUrl: string
  jobTitle: string
  repName: string
  sourceCompanyId: string
  isRead: boolean
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<JobNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      router.replace('/dashboard')
      return
    }
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const data = await api.get<JobNotification[]>('/job-notifications')
      setNotifications(data)
    } catch { } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await api.patch(`/job-notifications/${id}/read`, {})
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch { }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await api.patch('/job-notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch { } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="flex-1 relative z-10">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(124,111,255,0.08)', background: 'var(--ink)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-200">Job Leads</h1>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Upwork job links shared by the Company 1 sales team</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.2)', color: '#a78bfa' }}
          >
            <CheckCheck size={13} />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className="px-6 py-5 max-w-3xl">
        {loading ? (
          <p className="text-slate-500 text-xs py-12 text-center">Loading…</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-[var(--bord)] p-16 text-center" style={{ background: 'var(--ink2)' }}>
            <Bell size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No job leads yet</p>
            <p className="text-xs text-slate-600 mt-1">Links will appear here when Company 1 reps log proposals</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className="rounded-xl transition-all"
                style={{
                  background: n.isRead ? 'var(--ink2)' : 'rgba(124,111,255,0.04)',
                  border: n.isRead ? '1px solid rgba(100,116,139,0.1)' : '1px solid rgba(124,111,255,0.18)',
                }}
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.isRead
                      ? <span className="block w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 6px rgba(251,191,36,0.5)' }} />
                      : <span className="block w-2 h-2 rounded-full bg-slate-700" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${n.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                          {n.jobTitle || 'Upwork Job'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <a
                            href={n.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => !n.isRead && handleMarkRead(n.id)}
                            className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <ExternalLink size={11} />
                            View on Upwork
                          </a>
                          <span className="text-[10px] text-slate-600 font-mono truncate max-w-[280px]">{n.jobUrl}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-600">From: <span className="text-slate-500">{n.repName}</span></span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-600">
                            <Clock size={9} /> {timeAgo(n.createdAt)}
                          </span>
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
