'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Building2,
  MessageSquare,
  FileText,
  AlertCircle,
  Users,
  BarChart3,
  Send,
  X,
  Check,
  Phone,
  Edit,
  Zap,
  RefreshCw,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react'

// Types
interface QueueItem {
  id: string
  org_id: string
  type: 'escalation' | 'dsr' | 'incident' | 'review' | 'onboarding' | 'document_expiry' | 'regulator'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: string
  title: string
  description: string
  ai_summary: string | null
  ai_recommendation: string | null
  ai_draft_response: string | null
  ai_confidence: number | null
  created_at: string
  deadline_at: string | null
  organizations: {
    id: string
    name: string
    subscription_tier: string
  }
}

interface DashboardStats {
  queue: {
    critical: number
    high: number
    medium: number
    low: number
    total_pending: number
  }
  organizations: {
    active: number
    healthy: number
  }
  monthly: {
    resolved: number
    ai_approved: number
    ai_approval_rate: number
    avg_time_minutes: number
  }
}

// Priority config
const priorityConfig = {
  critical: { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', label: 'קריטי', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', label: 'גבוה', icon: AlertCircle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', label: 'בינוני', icon: Clock },
  low: { color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', label: 'נמוך', icon: CheckCircle2 }
}

const typeConfig = {
  escalation: { label: 'הסלמת Q&A', icon: MessageSquare },
  dsr: { label: 'בקשת נושא מידע', icon: FileText },
  incident: { label: 'אירוע אבטחה', icon: AlertTriangle },
  review: { label: 'סקירה תקופתית', icon: BarChart3 },
  onboarding: { label: 'אונבורדינג', icon: Users },
  document_expiry: { label: 'מסמך לחידוש', icon: FileText },
  regulator: { label: 'פנייה מרגולטור', icon: Building2 }
}

export default function DPODashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'queue' | 'organizations' | 'settings'>('queue')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)

  // Check DPO auth
  useEffect(() => {
    const dpoAuth = localStorage.getItem('dpo_authenticated')
    if (dpoAuth !== 'true') {
      router.push('/dpo/login')
    } else {
      loadDashboard()
    }
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // Load stats
      const statsRes = await fetch('/api/dpo?action=stats')
      const statsData = await statsRes.json()
      setStats(statsData)

      // Load queue
      await loadQueue()
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    }
    setLoading(false)
  }

  const loadQueue = async () => {
    let url = '/api/dpo?action=queue'
    if (filterPriority) url += `&priority=${filterPriority}`
    if (filterType) url += `&type=${filterType}`

    const queueRes = await fetch(url)
    const queueData = await queueRes.json()
    setQueueItems(queueData.items || [])
  }

  useEffect(() => {
    if (!loading) {
      loadQueue()
    }
  }, [filterPriority, filterType])

  const openItem = async (item: QueueItem) => {
    setSelectedItem(item)
    setEditedResponse(item.ai_draft_response || '')
    setResolutionNotes('')
    setStartTime(Date.now())

    // Load full context
    const res = await fetch(`/api/dpo?action=queue_item&id=${item.id}`)
    const data = await res.json()
    setItemContext(data.context)

    // Auto-analyze if not yet analyzed
    if (!item.ai_summary) {
      analyzeItem(item.id)
    }
  }

  const analyzeItem = async (itemId: string) => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/dpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_analyze', itemId })
      })
      const data = await res.json()

      if (data.analysis) {
        setSelectedItem(prev => prev ? {
          ...prev,
          ai_summary: data.analysis.summary,
          ai_recommendation: data.analysis.recommendation,
          ai_draft_response: data.analysis.draft_response,
          ai_confidence: data.analysis.confidence
        } : null)
        setEditedResponse(data.analysis.draft_response || '')
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    }
    setAnalyzing(false)
  }

  const resolveItem = async (resolutionType: 'approved_ai' | 'edited' | 'manual' | 'rejected') => {
    if (!selectedItem) return
    setResolving(true)

    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0

    try {
      const res = await fetch('/api/dpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          itemId: selectedItem.id,
          resolutionType,
          response: editedResponse,
          notes: resolutionNotes,
          timeSpentSeconds: timeSpent,
          sendEmail: true
        })
      })

      const data = await res.json()
      
      // Show success message with email status
      if (data.success) {
        const emailMsg = data.email_sent 
          ? '✅ הפנייה טופלה והתשובה נשלחה במייל'
          : '✅ הפנייה טופלה (לא נשלח מייל)'
        alert(emailMsg)
      }

      // Refresh
      setSelectedItem(null)
      loadDashboard()
    } catch (error) {
      console.error('Failed to resolve:', error)
      alert('שגיאה בטיפול בפנייה')
    }
    setResolving(false)
  }

  const bulkApprove = async () => {
    const highConfidenceItems = queueItems.filter(i => (i.ai_confidence || 0) >= 0.85 && i.ai_draft_response)
    if (highConfidenceItems.length === 0) {
      alert('אין פריטים עם ביטחון AI גבוה מספיק')
      return
    }

    if (!confirm(`לאשר ${highConfidenceItems.length} פריטים עם ביטחון AI > 85%?\nתשובות יישלחו במייל ללקוחות.`)) return

    try {
      const res = await fetch('/api/dpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_approve',
          itemIds: highConfidenceItems.map(i => i.id),
          minConfidence: 0.85,
          sendEmails: true
        })
      })
      const data = await res.json()
      alert(`✅ אושרו ${data.approved} פריטים\n📧 נשלחו ${data.emails_sent || 0} מיילים`)
      loadDashboard()
    } catch (error) {
      console.error('Bulk approve failed:', error)
    }
  }

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `לפני ${days} ימים`
    if (hours > 0) return `לפני ${hours} שעות`
    if (minutes > 0) return `לפני ${minutes} דקות`
    return 'עכשיו'
  }

  const formatDeadline = (date: string | null) => {
    if (!date) return null
    const diff = new Date(date).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days < 0) return { text: 'באיחור!', urgent: true }
    if (days === 0) return { text: 'היום!', urgent: true }
    if (days === 1) return { text: 'מחר', urgent: true }
    if (days <= 7) return { text: `${days} ימים`, urgent: days <= 3 }
    return { text: `${days} ימים`, urgent: false }
  }

  const estimatedTime = (item: QueueItem) => {
    const baseTime = {
      escalation: 2,
      dsr: 5,
      incident: 15,
      review: 10,
      onboarding: 5,
      document_expiry: 3,
      regulator: 20
    }
    const time = baseTime[item.type] || 5
    if (item.ai_confidence && item.ai_confidence > 0.85) return Math.ceil(time * 0.3)
    if (item.ai_confidence && item.ai_confidence > 0.7) return Math.ceil(time * 0.5)
    return time
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">DPO Dashboard</h1>
              <p className="text-xs text-gray-500">ממשק ניהול לממונה</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadDashboard}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              localStorage.removeItem('dpo_authenticated')
              router.push('/dpo/login')
            }}>
              יציאה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className={stats?.queue.critical ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">קריטי</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.queue.critical || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats?.queue.high ? 'border-orange-300 bg-orange-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">גבוה</p>
                  <p className="text-3xl font-bold text-orange-600">{stats?.queue.high || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">בינוני + נמוך</p>
                  <p className="text-3xl font-bold">{(stats?.queue.medium || 0) + (stats?.queue.low || 0)}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">לקוחות פעילים</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.organizations.active || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Stats */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">החודש:</span>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className="text-sm text-gray-500">טופלו: </span>
                  <span className="font-bold">{stats?.monthly.resolved || 0}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">אישור AI: </span>
                  <span className="font-bold text-green-600">{stats?.monthly.ai_approval_rate || 0}%</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">זמן ממוצע: </span>
                  <span className="font-bold">{stats?.monthly.avg_time_minutes || 0} דק׳</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    תור המתנה ({queueItems.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {queueItems.some(i => (i.ai_confidence || 0) >= 0.85) && (
                      <Button size="sm" variant="outline" onClick={bulkApprove}>
                        <Zap className="h-4 w-4 ml-1" />
                        אישור מרוכז
                      </Button>
                    )}
                  </div>
                </div>
                {/* Filters */}
                <div className="flex gap-2 mt-3">
                  <select
                    className="text-sm border rounded px-2 py-1"
                    value={filterPriority || ''}
                    onChange={e => setFilterPriority(e.target.value || null)}
                  >
                    <option value="">כל העדיפויות</option>
                    <option value="critical">קריטי</option>
                    <option value="high">גבוה</option>
                    <option value="medium">בינוני</option>
                    <option value="low">נמוך</option>
                  </select>
                  <select
                    className="text-sm border rounded px-2 py-1"
                    value={filterType || ''}
                    onChange={e => setFilterType(e.target.value || null)}
                  >
                    <option value="">כל הסוגים</option>
                    <option value="escalation">הסלמת Q&A</option>
                    <option value="dsr">בקשת מידע</option>
                    <option value="incident">אירוע אבטחה</option>
                    <option value="review">סקירה</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {queueItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
                    <p className="font-medium">אין פריטים בתור!</p>
                    <p className="text-sm">הכל מטופל ✨</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {queueItems.map(item => {
                      const config = priorityConfig[item.priority]
                      const typeConf = typeConfig[item.type]
                      const deadline = formatDeadline(item.deadline_at)
                      const TypeIcon = typeConf.icon

                      return (
                        <div
                          key={item.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-blue-50' : ''}`}
                          onClick={() => openItem(item)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={`${config.bgLight} ${config.textColor} text-xs`}>
                                  {config.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <TypeIcon className="h-3 w-3 ml-1" />
                                  {typeConf.label}
                                </Badge>
                                {item.ai_confidence && item.ai_confidence > 0.85 && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <Zap className="h-3 w-3 ml-1" />
                                    AI {Math.round(item.ai_confidence * 100)}%
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium truncate">{item.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                <span>{item.organizations?.name}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(item.created_at)}</span>
                                {deadline && (
                                  <>
                                    <span>•</span>
                                    <span className={deadline.urgent ? 'text-red-600 font-medium' : ''}>
                                      דדליין: {deadline.text}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-left text-sm text-gray-400">
                              ~{estimatedTime(item)} דק׳
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Item Detail Panel */}
          <div className="lg:col-span-1">
            {selectedItem ? (
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedItem.organizations?.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>{selectedItem.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {/* AI Analysis */}
                  {analyzing ? (
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="text-sm text-blue-600">AI מנתח...</p>
                    </div>
                  ) : selectedItem.ai_summary ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-700">ניתוח AI</span>
                        {selectedItem.ai_confidence && (
                          <Badge className={`mr-auto ${selectedItem.ai_confidence > 0.85 ? 'bg-green-100 text-green-700' : selectedItem.ai_confidence > 0.7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            ביטחון: {Math.round(selectedItem.ai_confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{selectedItem.ai_summary}</p>
                      <p className="text-sm text-blue-600">
                        <strong>המלצה:</strong> {selectedItem.ai_recommendation}
                      </p>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => analyzeItem(selectedItem.id)}>
                      <Zap className="h-4 w-4 ml-2" />
                      נתח עם AI
                    </Button>
                  )}

                  {/* Context - Messages */}
                  {itemContext?.messages && itemContext.messages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">💬 השיחה:</p>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto text-sm">
                        {itemContext.messages.map((msg: any, i: number) => (
                          <div key={i} className={`p-2 rounded ${msg.sender_type === 'user' ? 'bg-white border' : 'bg-blue-100'}`}>
                            <p className="text-xs text-gray-500 mb-1">
                              {msg.sender_type === 'user' ? '👤 עובד' : '🤖 בוט'}
                            </p>
                            <p>{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context - DSR */}
                  {itemContext?.dsr && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">📋 פרטי הבקשה:</p>
                      <div className="text-sm space-y-1">
                        <p><strong>שם:</strong> {itemContext.dsr.full_name}</p>
                        <p><strong>אימייל:</strong> {itemContext.dsr.email}</p>
                        <p><strong>סוג:</strong> {itemContext.dsr.request_type}</p>
                        {itemContext.dsr.details && (
                          <p><strong>פרטים:</strong> {itemContext.dsr.details}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Draft Response */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">✏️ תשובה:</label>
                    <Textarea
                      value={editedResponse}
                      onChange={e => setEditedResponse(e.target.value)}
                      rows={5}
                      className="text-sm"
                      placeholder="כתוב תשובה או ערוך את הצעת ה-AI..."
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">📝 הערות פנימיות:</label>
                    <Input
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      placeholder="הערות (לא יישלחו ללקוח)"
                      className="text-sm"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => resolveItem(editedResponse === selectedItem.ai_draft_response ? 'approved_ai' : 'edited')}
                      disabled={resolving || !editedResponse}
                    >
                      {resolving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 ml-1" />
                          {editedResponse === selectedItem.ai_draft_response ? 'אשר AI' : 'שלח'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resolveItem('rejected')}
                      disabled={resolving}
                    >
                      <X className="h-4 w-4 ml-1" />
                      דחה
                    </Button>
                  </div>

                  {/* Org Info */}
                  {itemContext?.compliance && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium mb-2">📊 מידע על הארגון:</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span>ציון תאימות:</span>
                        <Badge className={itemContext.compliance.overall_score > 80 ? 'bg-green-100 text-green-700' : itemContext.compliance.overall_score > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                          {Math.round(itemContext.compliance.overall_score)}/100
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {itemContext.documents?.length || 0} מסמכים פעילים
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>בחר פריט מהתור</p>
                  <p className="text-sm">לצפייה בפרטים ולטיפול</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
