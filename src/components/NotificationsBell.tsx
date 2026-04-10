'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, X, ExternalLink, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string | null
  action_url: string | null
  read: boolean
  created_at: string
}

interface NotificationsBellProps {
  supabase: any
}

const severityIcon = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  warning: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
}

export default function NotificationsBell({ supabase }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {}
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }, [supabase])

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/notifications', { headers })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }, [getHeaders])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleAction = async (n: Notification) => {
    // Mark as read (fire-and-forget)
    getHeaders().then(headers => {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id, action: 'read' }),
      }).catch(() => {})
    })
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))

    if (n.action_url) {
      setOpen(false)
      // Use window.location for reliable navigation (router.push can race with dropdown close)
      window.location.href = n.action_url
    }
  }

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const headers = await getHeaders()
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'dismiss' }),
    }).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'עכשיו'
    if (hours < 24) return `לפני ${hours} שעות`
    const days = Math.floor(hours / 24)
    return `לפני ${days} ימים`
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const headers = await getHeaders()
      await fetch('/api/notifications', { method: 'POST', headers })
      await fetchNotifications()
    } catch (e) { console.error('Refresh error:', e) }
    setRefreshing(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-stone-100 transition-colors"
        aria-label="התראות"
      >
        <Bell className="h-5 w-5 text-stone-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: full-screen overlay */}
          <div className="sm:hidden fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-800">התראות</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 hover:bg-stone-100 rounded-lg">
                  <RefreshCw className={`h-4 w-4 text-stone-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-12">אין התראות חדשות</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {notifications.map(n => {
                    const sev = severityIcon[n.severity] || severityIcon.info
                    const Icon = sev.icon
                    return (
                      <div
                        key={n.id}
                        className={`p-4 ${n.read ? 'bg-white' : 'bg-indigo-50/30'} active:bg-stone-50`}
                        onClick={() => handleAction(n)}
                      >
                        <div className="flex gap-3">
                          <div className={`p-1.5 rounded-lg ${sev.bg} flex-shrink-0 h-fit`}>
                            <Icon className={`h-4 w-4 ${sev.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${n.read ? 'text-stone-600' : 'text-stone-800 font-medium'}`}>{n.title}</p>
                            {n.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.description}</p>}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-stone-400">{formatTime(n.created_at)}</span>
                              {n.action_url && (
                                <span className="text-xs text-indigo-500 font-medium flex items-center gap-0.5">
                                  פעל <ExternalLink className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => handleDismiss(e, n.id)} className="p-1 hover:bg-stone-100 rounded flex-shrink-0 h-fit">
                            <X className="h-3.5 w-3.5 text-stone-400" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop: dropdown */}
          <div className="hidden sm:block absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-stone-200 shadow-lg z-50 overflow-hidden" dir="rtl">
            <div className="p-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800 text-sm">התראות</h3>
              <button onClick={handleRefresh} disabled={refreshing} className="p-1 hover:bg-stone-100 rounded-md transition-colors" title="רענן התראות">
                <RefreshCw className={`h-3.5 w-3.5 text-stone-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-8">אין התראות חדשות</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {notifications.map(n => {
                    const sev = severityIcon[n.severity] || severityIcon.info
                    const Icon = sev.icon
                    return (
                      <div
                        key={n.id}
                        className={`p-3 cursor-pointer hover:bg-stone-50 transition-colors ${n.read ? '' : 'bg-indigo-50/30'}`}
                        onClick={() => handleAction(n)}
                      >
                        <div className="flex gap-2.5">
                          <div className={`p-1 rounded-md ${sev.bg} flex-shrink-0 h-fit mt-0.5`}>
                            <Icon className={`h-3.5 w-3.5 ${sev.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${n.read ? 'text-stone-600' : 'text-stone-800 font-medium'}`}>{n.title}</p>
                            {n.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.description}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-stone-400">{formatTime(n.created_at)}</span>
                              {n.action_url && (
                                <span className="text-xs text-indigo-500 font-medium">פעל</span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => handleDismiss(e, n.id)} className="p-0.5 hover:bg-stone-200 rounded flex-shrink-0 h-fit">
                            <X className="h-3 w-3 text-stone-400" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
