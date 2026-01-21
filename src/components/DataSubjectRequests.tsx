'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Eye, Edit, Trash2, Ban, 
  Clock, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Send, Loader2,
  Calendar, User, Mail, FileText, X, Copy, ExternalLink,
  LayoutGrid, List
} from 'lucide-react'

interface DataSubjectRequest {
  id: string
  request_number: string
  request_type: 'access' | 'rectification' | 'erasure' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  requester_name: string
  requester_email: string
  requester_phone?: string
  requester_id: string
  details?: string
  response?: string
  deadline: string
  created_at: string
  responded_at?: string
  responded_by?: string
}

interface DataSubjectRequestsProps {
  orgId: string
}

const REQUEST_TYPE_CONFIG = {
  access: { label: 'עיון במידע', icon: Eye, color: 'blue' },
  rectification: { label: 'תיקון מידע', icon: Edit, color: 'yellow' },
  erasure: { label: 'מחיקת מידע', icon: Trash2, color: 'red' },
  objection: { label: 'התנגדות לעיבוד', icon: Ban, color: 'purple' }
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין לטיפול', icon: Clock, color: 'yellow', bg: 'bg-yellow-50' },
  in_progress: { label: 'בטיפול', icon: AlertTriangle, color: 'blue', bg: 'bg-blue-50' },
  completed: { label: 'הושלם', icon: CheckCircle2, color: 'green', bg: 'bg-green-50' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'red', bg: 'bg-red-50' }
}

const RESPONSE_TEMPLATES = {
  access: `שלום {name},

בהמשך לבקשתך לעיון במידע האישי השמור אודותיך, להלן המידע המבוקש:

[פרט את המידע כאן]

אם יש לך שאלות נוספות, אנו עומדים לרשותך.

בברכה,
הממונה על הגנת הפרטיות`,

  rectification: `שלום {name},

בהמשך לבקשתך לתיקון מידע, ברצוננו לעדכן שהמידע תוקן בהתאם לבקשתך.

פרטים שתוקנו:
[פרט את השינויים כאן]

בברכה,
הממונה על הגנת הפרטיות`,

  erasure: `שלום {name},

בהמשך לבקשתך למחיקת מידע, ברצוננו לאשר שהמידע המבוקש נמחק ממערכותינו.

סוג המידע שנמחק:
[פרט כאן]

בברכה,
הממונה על הגנת הפרטיות`,

  objection: `שלום {name},

בהמשך לבקשתך להתנגדות לעיבוד מידע, ברצוננו לעדכן שבקשתך טופלה.

[פרט את הפעולה שננקטה]

בברכה,
הממונה על הגנת הפרטיות`,

  rejection: `שלום {name},

בהמשך לבקשתך, לצערנו איננו יכולים להיענות לה מהסיבה הבאה:

[פרט את הסיבה כאן]

אם יש לך שאלות, אנו עומדים לרשותך.

בברכה,
הממונה על הגנת הפרטיות`
}

export default function DataSubjectRequests({ orgId }: DataSubjectRequestsProps) {
  const [requests, setRequests] = useState<DataSubjectRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<DataSubjectRequest | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [publicUrl, setPublicUrl] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    loadRequests()
    // Set public URL for sharing
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/rights/${orgId}`)
    }
  }, [orgId])

  const loadRequests = async () => {
    try {
      const response = await fetch(`/api/rights?action=get_requests&orgId=${orgId}`)
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error('Error loading requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, status: string, response?: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_request',
          requestId,
          status,
          response,
          respondedBy: 'DPO'
        })
      })

      if (res.ok) {
        await loadRequests()
        setSelectedRequest(null)
        setResponseText('')
      }
    } catch (err) {
      console.error('Error updating request:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getDeadlineColor = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline)
    if (days <= 0) return 'text-red-600 bg-red-100'
    if (days <= 7) return 'text-orange-600 bg-orange-100'
    if (days <= 14) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const applyTemplate = (type: keyof typeof RESPONSE_TEMPLATES) => {
    if (!selectedRequest) return
    const template = RESPONSE_TEMPLATES[type]
    setResponseText(template.replace('{name}', selectedRequest.requester_name))
  }

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Filter requests
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter)

  // Group by status for Kanban
  const groupedRequests = {
    pending: filteredRequests.filter(r => r.status === 'pending'),
    in_progress: filteredRequests.filter(r => r.status === 'in_progress'),
    completed: filteredRequests.filter(r => r.status === 'completed'),
    rejected: filteredRequests.filter(r => r.status === 'rejected')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">בקשות נושאי מידע</h2>
          <p className="text-gray-600 text-sm">ניהול בקשות לעיון, תיקון ומחיקת מידע</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4 ml-1" />
            לוח משימות
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 ml-1" />
            רשימה
          </Button>
        </div>
      </div>

      {/* Public Form Link */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">קישור לטופס ציבורי</span>
              </div>
              <p className="text-sm text-blue-700">שתפו קישור זה עם לקוחות להגשת בקשות</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input 
                value={publicUrl} 
                readOnly 
                className="bg-white text-sm font-mono"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyPublicUrl}
                className="shrink-0"
              >
                <Copy className={`h-4 w-4 ${copySuccess ? 'text-green-600' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = requests.filter(r => r.status === status).length
          const Icon = config.icon
          return (
            <Card 
              key={status} 
              className={`${config.bg} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setFilter(filter === status ? 'all' : status)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-gray-600">{config.label}</p>
                </div>
                <Icon className={`h-8 w-8 text-${config.color}-500 opacity-50`} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(groupedRequests).map(([status, statusRequests]) => {
            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
            const Icon = config.icon
            return (
              <div key={status} className={`${config.bg} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-5 w-5 text-${config.color}-600`} />
                  <h3 className="font-semibold">{config.label}</h3>
                  <Badge variant="secondary" className="mr-auto">{statusRequests.length}</Badge>
                </div>
                <div className="space-y-3">
                  {statusRequests.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">אין בקשות</p>
                  ) : (
                    statusRequests.map(request => (
                      <RequestCard 
                        key={request.id} 
                        request={request}
                        onClick={() => {
                          setSelectedRequest(request)
                          setResponseText(request.response || '')
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-4 font-medium">מספר</th>
                    <th className="text-right p-4 font-medium">סוג</th>
                    <th className="text-right p-4 font-medium">מגיש</th>
                    <th className="text-right p-4 font-medium">סטטוס</th>
                    <th className="text-right p-4 font-medium">מועד אחרון</th>
                    <th className="text-right p-4 font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(request => {
                    const typeConfig = REQUEST_TYPE_CONFIG[request.request_type]
                    const statusConfig = STATUS_CONFIG[request.status]
                    const daysLeft = getDaysUntilDeadline(request.deadline)
                    return (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono text-sm">{request.request_number}</td>
                        <td className="p-4">{typeConfig.label}</td>
                        <td className="p-4">{request.requester_name}</td>
                        <td className="p-4">
                          <Badge className={statusConfig.bg}>{statusConfig.label}</Badge>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-sm ${getDeadlineColor(request.deadline)}`}>
                            {daysLeft > 0 ? `${daysLeft} ימים` : 'עבר!'}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request)
                              setResponseText(request.response || '')
                            }}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            צפייה
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredRequests.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  אין בקשות להצגה
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {REQUEST_TYPE_CONFIG[selectedRequest.request_type].label}
                    <Badge variant="outline">{selectedRequest.request_number}</Badge>
                  </CardTitle>
                  <CardDescription>
                    הוגש בתאריך {new Date(selectedRequest.created_at).toLocaleDateString('he-IL')}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-6 space-y-6">
              {/* Requester Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">שם מגיש</p>
                    <p className="font-medium">{selectedRequest.requester_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">ת.ז.</p>
                    <p className="font-medium">{selectedRequest.requester_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">אימייל</p>
                    <p className="font-medium">{selectedRequest.requester_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">מועד אחרון</p>
                    <p className={`font-medium ${getDaysUntilDeadline(selectedRequest.deadline) <= 7 ? 'text-red-600' : ''}`}>
                      {new Date(selectedRequest.deadline).toLocaleDateString('he-IL')}
                      {' '}({getDaysUntilDeadline(selectedRequest.deadline)} ימים)
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              {selectedRequest.details && (
                <div>
                  <h4 className="font-semibold mb-2">פרטי הבקשה</h4>
                  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.details}
                  </div>
                </div>
              )}

              {/* Previous Response */}
              {selectedRequest.response && (
                <div>
                  <h4 className="font-semibold mb-2">תשובה שניתנה</h4>
                  <div className="p-4 bg-green-50 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.response}
                  </div>
                </div>
              )}

              {/* Response Section (for pending/in_progress) */}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">תשובה</h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate(selectedRequest.request_type)}
                      >
                        תבנית תשובה
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate('rejection')}
                      >
                        תבנית דחייה
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="כתוב את התשובה לבקשה..."
                    className="min-h-[150px]"
                  />
                </div>
              )}
            </CardContent>

            {/* Actions */}
            <div className="flex-shrink-0 border-t p-4 bg-gray-50">
              <div className="flex justify-between">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                      התחל טיפול
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', responseText)}
                        disabled={isSubmitting || !responseText}
                      >
                        דחה בקשה
                      </Button>
                      <Button
                        onClick={() => updateRequestStatus(selectedRequest.id, 'completed', responseText)}
                        disabled={isSubmitting || !responseText}
                      >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                        <Send className="h-4 w-4 ml-2" />
                        שלח תשובה
                      </Button>
                    </div>
                  </>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <div className="flex gap-2 mr-auto">
                    <Button
                      variant="destructive"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', responseText)}
                      disabled={isSubmitting || !responseText}
                    >
                      דחה בקשה
                    </Button>
                    <Button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'completed', responseText)}
                      disabled={isSubmitting || !responseText}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                      <Send className="h-4 w-4 ml-2" />
                      שלח תשובה
                    </Button>
                  </div>
                )}
                {(selectedRequest.status === 'completed' || selectedRequest.status === 'rejected') && (
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    סגור
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// Request Card Component for Kanban
function RequestCard({ request, onClick }: { request: DataSubjectRequest, onClick: () => void }) {
  const typeConfig = REQUEST_TYPE_CONFIG[request.request_type]
  const Icon = typeConfig.icon
  const daysLeft = Math.ceil((new Date(request.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  return (
    <div 
      className="bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{typeConfig.label}</span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{request.request_number}</span>
      </div>
      <p className="text-sm truncate mb-2">{request.requester_name}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {new Date(request.created_at).toLocaleDateString('he-IL')}
        </span>
        <span className={`px-2 py-0.5 rounded ${
          daysLeft <= 0 ? 'bg-red-100 text-red-700' :
          daysLeft <= 7 ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {daysLeft > 0 ? `${daysLeft} ימים` : 'עבר!'}
        </span>
      </div>
    </div>
  )
}
