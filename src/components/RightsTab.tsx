'use client'

import { useState, useEffect } from 'react'
import {
  Eye, Edit, Trash2, Ban, Clock, CheckCircle2, AlertTriangle,
  Copy, ExternalLink, ChevronDown, ChevronUp, X, Send,
  User as UserIcon, Mail, Phone, FileText, Loader2, Link2, Search, Lock
} from 'lucide-react'
import { useToast } from '@/components/Toast'

interface RightsRequest {
  id: string
  org_id: string
  request_number: string
  request_type: 'access' | 'rectification' | 'erasure' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  requester_name: string
  requester_id?: string
  requester_email: string
  requester_phone?: string
  details?: string
  response?: string
  responded_at?: string
  responded_by?: string
  deadline: string
  created_at: string
  updated_at?: string
}

interface RightsTabProps {
  orgId: string
  orgName: string
  isPaid: boolean
  supabase: any
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string; bg: string }> = {
  access:        { label: 'עיון במידע',      icon: Eye,    color: 'text-blue-700',   bg: 'bg-blue-50' },
  rectification: { label: 'תיקון מידע',      icon: Edit,   color: 'text-amber-700',  bg: 'bg-amber-50' },
  erasure:       { label: 'מחיקת מידע',      icon: Trash2, color: 'text-red-700',    bg: 'bg-red-50' },
  objection:     { label: 'התנגדות לעיבוד',  icon: Ban,    color: 'text-purple-700', bg: 'bg-purple-50' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'ממתין',    color: 'text-amber-700',   bg: 'bg-amber-100' },
  in_progress: { label: 'בטיפול',   color: 'text-blue-700',    bg: 'bg-blue-100' },
  completed:   { label: 'הושלם',    color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected:    { label: 'נדחה',     color: 'text-red-700',     bg: 'bg-red-100' },
}

function getDaysRemaining(deadline: string): number {
  const now = new Date()
  const dl = new Date(deadline)
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ deadline, status }: { deadline: string; status: string }) {
  if (status === 'completed' || status === 'rejected') return null
  const days = getDaysRemaining(deadline)
  const color = days <= 0 ? 'bg-red-100 text-red-800 border-red-200'
    : days <= 7 ? 'bg-red-50 text-red-700 border-red-200'
    : days <= 14 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color} whitespace-nowrap`}>
      {days <= 0 ? `⚠️ חריגה ב-${Math.abs(days)} ימים` : `⏰ ${days} ימים נותרו`}
    </span>
  )
}

export default function RightsTab({ orgId, orgName, isPaid, supabase }: RightsTabProps) {
  const { toast } = useToast()
  const [requests, setRequests] = useState<RightsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<RightsRequest | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responding, setResponding] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://deepo.co.il'}/rights/${orgId}`

  // Load requests
  useEffect(() => {
    loadRequests()
  }, [orgId])

  const loadRequests = async () => {
    try {
      const res = await fetch(`/api/rights?action=get_requests&orgId=${orgId}`)
      const data = await res.json()
      if (data.requests) setRequests(data.requests)
    } catch (e) {
      console.error('Failed to load rights requests:', e)
    } finally {
      setLoading(false)
    }
  }

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }

  const updateRequest = async (requestId: string, status: string, response?: string) => {
    setResponding(true)
    try {
      const res = await authFetch('/api/rights', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_request',
          requestId,
          status,
          response: response || undefined,
          respondedBy: orgName,
        }),
      })
      if (res.ok) {
        toast(status === 'completed' ? 'הבקשה טופלה בהצלחה' : status === 'rejected' ? 'הבקשה נדחתה' : 'הסטטוס עודכן')
        await loadRequests()
        setSelectedRequest(null)
        setResponseText('')
      } else {
        toast('שגיאה בעדכון', 'error')
      }
    } catch {
      toast('שגיאה בעדכון', 'error')
    } finally {
      setResponding(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setLinkCopied(true)
    toast('הקישור הועתק!')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // Filter & search
  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return r.requester_name.toLowerCase().includes(q) ||
        r.requester_email.toLowerCase().includes(q) ||
        r.request_number.toLowerCase().includes(q)
    }
    return true
  })

  const openCount = requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length
  const urgentCount = requests.filter(r => {
    if (r.status === 'completed' || r.status === 'rejected') return false
    return getDaysRemaining(r.deadline) <= 7
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">👤 בקשות פרטיות</h1>
          <p className="text-stone-500 mt-1">
            ניהול בקשות מימוש זכויות מנושאי מידע
            {openCount > 0 && <span className="text-amber-600 font-medium"> · {openCount} פתוחות</span>}
            {urgentCount > 0 && <span className="text-red-600 font-medium"> · {urgentCount} דחופות</span>}
          </p>
        </div>

        {/* Public link */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
          <Link2 className="h-4 w-4 text-stone-400 flex-shrink-0" />
          <span className="text-xs text-stone-500 truncate max-w-[180px]" dir="ltr">{publicUrl}</span>
          <button
            onClick={copyLink}
            className="px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          >
            {linkCopied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {linkCopied ? 'הועתק' : 'העתק'}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-indigo-500 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Urgent warning */}
      {urgentCount > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 font-medium">
            {urgentCount} בקשות עם פחות מ-7 ימים למועד האחרון לתגובה!
          </span>
        </div>
      )}

      {/* Stats row */}
      {requests.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="text-2xl font-bold text-stone-800">{requests.length}</div>
            <div className="text-xs text-stone-500">סה״כ בקשות</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{requests.filter(r => r.status === 'pending').length}</div>
            <div className="text-xs text-amber-600">ממתינות לטיפול</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{requests.filter(r => r.status === 'in_progress').length}</div>
            <div className="text-xs text-blue-600">בטיפול</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-700">{requests.filter(r => r.status === 'completed').length}</div>
            <div className="text-xs text-emerald-600">הושלמו</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-stone-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'הכל', count: requests.length },
            { key: 'pending', label: 'ממתין', count: requests.filter(r => r.status === 'pending').length },
            { key: 'in_progress', label: 'בטיפול', count: requests.filter(r => r.status === 'in_progress').length },
            { key: 'completed', label: 'הושלם', count: requests.filter(r => r.status === 'completed').length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                filter === f.key ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {f.label}
              {f.count > 0 && <span className="mr-1 text-[10px] text-stone-400">({f.count})</span>}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, אימייל או מספר..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-indigo-300"
          />
        </div>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-lg font-semibold text-stone-700 mb-1">אין בקשות עדיין</h3>
          <p className="text-sm text-stone-500 mb-4">שתפו את הקישור הציבורי כדי לאפשר לנושאי מידע להגיש בקשות</p>
          <button
            onClick={copyLink}
            className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            העתקת קישור ציבורי
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400">אין תוצאות לסינון הנבחר</p>
        </div>
      ) : (
        /* Requests list */
        <div className="space-y-2">
          {filtered.map(req => {
            const typeConf = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.access
            const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const TypeIcon = typeConf.icon
            const isOpen = selectedRequest?.id === req.id
            const days = getDaysRemaining(req.deadline)

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border transition-all ${
                  isOpen ? 'border-indigo-300 shadow-md' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => setSelectedRequest(isOpen ? null : req)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 cursor-pointer text-right"
                >
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConf.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-stone-800">{req.requester_name}</span>
                      <span className="text-[11px] text-stone-400" dir="ltr">{req.request_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${typeConf.color}`}>{typeConf.label}</span>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-400">
                        {new Date(req.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>

                  {/* Status + deadline */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DeadlineBadge deadline={req.deadline} status={req.status} />
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                    {isOpen
                      ? <ChevronUp className="h-4 w-4 text-stone-400" />
                      : <ChevronDown className="h-4 w-4 text-stone-400" />
                    }
                  </div>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-stone-100">
                    <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: requester info */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">פרטי המבקש</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-stone-700">
                            <UserIcon className="h-3.5 w-3.5 text-stone-400" />
                            {req.requester_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-stone-700">
                            <Mail className="h-3.5 w-3.5 text-stone-400" />
                            <a href={`mailto:${req.requester_email}`} className="text-indigo-600 hover:underline" dir="ltr">
                              {req.requester_email}
                            </a>
                          </div>
                          {req.requester_phone && (
                            <div className="flex items-center gap-2 text-sm text-stone-700">
                              <Phone className="h-3.5 w-3.5 text-stone-400" />
                              <span dir="ltr">{req.requester_phone}</span>
                            </div>
                          )}
                          {req.requester_id && (
                            <div className="flex items-center gap-2 text-sm text-stone-700">
                              <FileText className="h-3.5 w-3.5 text-stone-400" />
                              ת.ז: {req.requester_id}
                            </div>
                          )}
                        </div>

                        {req.details && (
                          <div className="mt-3">
                            <h4 className="text-xs font-semibold text-stone-500 mb-1">פרטי הבקשה</h4>
                            <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3 whitespace-pre-wrap">
                              {req.details}
                            </p>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-stone-500 mb-2">ציר זמן</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              התקבלה — {new Date(req.created_at).toLocaleDateString('he-IL')}
                            </div>
                            {req.status !== 'pending' && (
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                הועבר לטיפול
                              </div>
                            )}
                            {req.responded_at && (
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <div className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                {req.status === 'completed' ? 'הושלם' : 'נדחה'} — {new Date(req.responded_at).toLocaleDateString('he-IL')}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <div className={`w-2 h-2 rounded-full ${days <= 0 ? 'bg-red-500' : 'bg-stone-300'}`} />
                              מועד אחרון — {new Date(req.deadline).toLocaleDateString('he-IL')}
                              {days > 0 && ` (${days} ימים)`}
                              {days <= 0 && ' (חריגה!)'}
                            </div>
                          </div>

                          {/* 30-day progress bar */}
                          {(req.status === 'pending' || req.status === 'in_progress') && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-stone-400">30 ימי טיפול</span>
                                <span className={`font-semibold ${days <= 0 ? 'text-red-600' : days <= 7 ? 'text-red-500' : days <= 14 ? 'text-amber-600' : 'text-stone-500'}`}>
                                  {days <= 0 ? `חריגה ב-${Math.abs(days)} ימים` : `${days} ימים נותרו`}
                                </span>
                              </div>
                              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    days <= 7 ? 'bg-red-500' : days <= 14 ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${Math.max(0, Math.min(100, ((30 - Math.max(0, days)) / 30) * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: response + actions */}
                      <div className="space-y-3">
                        {req.response ? (
                          <div>
                            <h4 className="text-xs font-semibold text-stone-500 mb-1">תשובה שנשלחה</h4>
                            <p className="text-sm text-stone-700 bg-emerald-50 rounded-lg p-3 border border-emerald-200 whitespace-pre-wrap">
                              {req.response}
                            </p>
                            {req.responded_at && (
                              <p className="text-[11px] text-stone-400 mt-1">
                                נשלח {new Date(req.responded_at).toLocaleDateString('he-IL')}
                              </p>
                            )}
                          </div>
                        ) : isPaid && (req.status === 'pending' || req.status === 'in_progress') ? (
                          <div>
                            <h4 className="text-xs font-semibold text-stone-500 mb-2">מענה לבקשה</h4>
                            <textarea
                              value={responseText}
                              onChange={e => setResponseText(e.target.value)}
                              placeholder="כתבו את התשובה שתישלח למבקש..."
                              className="w-full h-32 p-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-indigo-300 resize-none"
                              dir="rtl"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => updateRequest(req.id, 'completed', responseText)}
                                disabled={!responseText.trim() || responding}
                                className="flex-1 px-3 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                אשר ושלח תשובה
                              </button>
                              <button
                                onClick={() => updateRequest(req.id, 'rejected', responseText || 'הבקשה נדחתה')}
                                disabled={responding}
                                className="px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors cursor-pointer"
                              >
                                דחה
                              </button>
                            </div>

                            {/* Quick status change */}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => updateRequest(req.id, 'in_progress')}
                                disabled={responding}
                                className="mt-2 w-full px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer font-medium"
                              >
                                סמן כ"בטיפול"
                              </button>
                            )}
                          </div>
                        ) : !isPaid ? (
                          <div className="bg-stone-50 rounded-xl p-4 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
                              <Lock className="h-5 w-5 text-stone-400" />
                            </div>
                            <p className="text-sm text-stone-500">הפעילו את המערכת כדי לטפל בבקשות</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Embed instructions */}
      {requests.length > 0 && (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
          <h4 className="text-sm font-semibold text-stone-700 mb-1">🔗 שיתוף טופס בקשות פרטיות</h4>
          <p className="text-xs text-stone-500 mb-3">
            הטמיעו את הקישור הבא באתר או בדף הפרטיות שלכם כדי לאפשר לנושאי מידע להגיש בקשות:
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 px-3 py-2">
            <code className="flex-1 text-xs text-stone-600 truncate" dir="ltr">{publicUrl}</code>
            <button
              onClick={copyLink}
              className="px-2.5 py-1 text-xs font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              {linkCopied ? '✓' : 'העתק'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
