'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Eye, Edit, Trash2, Ban, Loader2, Clock, CheckCircle2, 
  AlertTriangle, X, Send, Copy, ExternalLink, User, Mail, FileText
} from 'lucide-react'

const REQUEST_TYPES: Record<string, { label: string, icon: any, color: string }> = {
  access: { label: 'עיון במידע', icon: Eye, color: 'blue' },
  rectification: { label: 'תיקון מידע', icon: Edit, color: 'yellow' },
  erasure: { label: 'מחיקת מידע', icon: Trash2, color: 'red' },
  objection: { label: 'התנגדות לעיבוד', icon: Ban, color: 'purple' },
}

const STATUS_CONFIG: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
  pending: { label: 'ממתין לטיפול', variant: 'default', color: 'blue' },
  in_progress: { label: 'בטיפול', variant: 'secondary', color: 'yellow' },
  completed: { label: 'הושלם', variant: 'outline', color: 'green' },
  rejected: { label: 'נדחה', variant: 'destructive', color: 'red' },
}

interface RightsManagementProps {
  organization: any
  supabase: any
}

export default function RightsManagement({ organization, supabase }: RightsManagementProps) {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [showEmbedCode, setShowEmbedCode] = useState(false)

  useEffect(() => {
    if (organization?.id) {
      loadRequests()
    }
  }, [organization?.id])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/rights?action=get_requests&orgId=${organization.id}`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRespond = async (status: string) => {
    if (!selectedRequest) return
    setIsResponding(true)

    try {
      await fetch('/api/rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_request',
          requestId: selectedRequest.id,
          status,
          response: response || null,
          respondedBy: 'admin'
        })
      })

      setSelectedRequest(null)
      setResponse('')
      loadRequests()
    } catch (error) {
      console.error('Error responding:', error)
    } finally {
      setIsResponding(false)
    }
  }

  const getDaysRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const copyEmbedCode = () => {
    const code = `<iframe src="${window.location.origin}/rights/${organization.id}" width="100%" height="800" frameborder="0"></iframe>`
    navigator.clipboard.writeText(code)
    alert('קוד ההטמעה הועתק!')
  }

  const copyFormLink = () => {
    const link = `${window.location.origin}/rights/${organization.id}`
    navigator.clipboard.writeText(link)
    alert('הקישור הועתק!')
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const urgentCount = requests.filter(r => r.status === 'pending' && getDaysRemaining(r.deadline) <= 7).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">בקשות זכויות נושא מידע</h2>
          <p className="text-gray-600">ניהול בקשות עיון, תיקון, מחיקה והתנגדות</p>
        </div>
        <Button onClick={() => setShowEmbedCode(true)}>
          <ExternalLink className="h-4 w-4 ml-2" />
          קוד הטמעה לאתר
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ בקשות</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ממתינות לטיפול</p>
                <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={urgentCount > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">דחופות (פחות מ-7 ימים)</p>
                <p className={`text-2xl font-bold ${urgentCount > 0 ? 'text-red-600' : ''}`}>{urgentCount}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${urgentCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">הושלמו</p>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">אין בקשות עדיין</h3>
            <p className="text-gray-600 mb-4">הטמיעו את הטופס באתר שלכם כדי לקבל בקשות</p>
            <Button onClick={() => setShowEmbedCode(true)}>
              <ExternalLink className="h-4 w-4 ml-2" />
              קבלת קוד הטמעה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>רשימת בקשות ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => {
                const typeConfig = REQUEST_TYPES[request.request_type]
                const statusConfig = STATUS_CONFIG[request.status]
                const daysRemaining = getDaysRemaining(request.deadline)
                const isUrgent = request.status === 'pending' && daysRemaining <= 7
                const Icon = typeConfig?.icon || FileText

                return (
                  <div
                    key={request.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                      isUrgent ? 'border-red-300 bg-red-50' : ''
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${typeConfig?.color || 'gray'}-100`}>
                          <Icon className={`h-5 w-5 text-${typeConfig?.color || 'gray'}-600`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{request.request_number}</span>
                            <Badge variant={statusConfig?.variant || 'secondary'}>
                              {statusConfig?.label || request.status}
                            </Badge>
                            {isUrgent && (
                              <Badge variant="destructive" className="animate-pulse">
                                דחוף!
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {typeConfig?.label} • {request.requester_name} • {request.requester_email}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                          {daysRemaining > 0 ? `${daysRemaining} ימים לטיפול` : 'פג המועד!'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedRequest.request_number}
                    <Badge variant={STATUS_CONFIG[selectedRequest.status]?.variant}>
                      {STATUS_CONFIG[selectedRequest.status]?.label}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {REQUEST_TYPES[selectedRequest.request_type]?.label}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Requester Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">שם מגיש הבקשה</p>
                    <p className="font-medium">{selectedRequest.requester_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">ת.ז</p>
                    <p className="font-medium">{selectedRequest.requester_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">אימייל</p>
                    <p className="font-medium">{selectedRequest.requester_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">מועד אחרון</p>
                    <p className={`font-medium ${getDaysRemaining(selectedRequest.deadline) <= 7 ? 'text-red-600' : ''}`}>
                      {new Date(selectedRequest.deadline).toLocaleDateString('he-IL')}
                      ({getDaysRemaining(selectedRequest.deadline)} ימים)
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              {selectedRequest.details && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">פרטי הבקשה:</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedRequest.details}</p>
                  </div>
                </div>
              )}

              {/* Previous Response */}
              {selectedRequest.response && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">תשובה שניתנה:</p>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedRequest.response}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      נענה ב-{new Date(selectedRequest.responded_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              )}

              {/* Response Form */}
              {selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress' ? (
                <div>
                  <p className="text-sm font-medium mb-2">תשובה לבקשה:</p>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="הזינו את התשובה לבקשה..."
                    className="min-h-[120px] mb-4"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleRespond('completed')}
                      disabled={isResponding}
                    >
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                      סימון כהושלם
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRespond('in_progress')}
                      disabled={isResponding}
                    >
                      סימון כבטיפול
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRespond('rejected')}
                      disabled={isResponding}
                    >
                      דחייה
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>הטמעת טופס זכויות באתר</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowEmbedCode(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">קישור ישיר לטופס:</p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                    {typeof window !== 'undefined' ? `${window.location.origin}/rights/${organization.id}` : ''}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyFormLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">קוד iframe להטמעה:</p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/rights/${organization.id}" width="100%" height="800" frameborder="0"></iframe>`}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyEmbedCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>טיפ:</strong> הוסיפו קישור לטופס זה בתחתית מדיניות הפרטיות שלכם כדי לעמוד בדרישות החוק.
                </p>
              </div>

              <Button className="w-full" onClick={() => window.open(`/rights/${organization.id}`, '_blank')}>
                <ExternalLink className="h-4 w-4 ml-2" />
                צפייה בטופס
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
