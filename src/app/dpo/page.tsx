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
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  Mail,
  Calendar
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
  }
}

interface Organization {
  id: string
  name: string
  status: string
  created_at: string
  pending_count: number
  compliance_score: number | null
  risk_level: string
}

interface DashboardStats {
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_pending: number
  resolved_this_month: number
  ai_approved_count: number
  avg_time_seconds: number
  active_orgs: number
}

// Priority config
const priorityConfig = {
  critical: { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', label: 'קריטי', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', label: 'גבוה', icon: AlertCircle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', label: 'בינוני', icon: Clock },
  low: { color: 'bg-gray-400', textColor: 'text-gray-700', bgLight: 'bg-gray-50', label: 'נמוך', icon: CheckCircle2 }
}

const typeConfig = {
  escalation: { label: 'הסלמת Q&A', icon: MessageSquare, color: 'text-blue-600' },
  dsr: { label: 'בקשת מידע', icon: FileText, color: 'text-purple-600' },
  incident: { label: 'אירוע אבטחה', icon: AlertTriangle, color: 'text-red-600' },
  review: { label: 'סקירה', icon: Search, color: 'text-gray-600' },
  onboarding: { label: 'אונבורדינג', icon: Users, color: 'text-green-600' },
  document_expiry: { label: 'פג תוקף', icon: FileText, color: 'text-orange-600' },
  regulator: { label: 'רגולטור', icon: Building2, color: 'text-red-700' }
}

const riskConfig = {
  low: { color: 'bg-green-100 text-green-700', label: 'סיכון נמוך' },
  medium: { color: 'bg-yellow-100 text-yellow-700', label: 'סיכון בינוני' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'סיכון גבוה' },
  critical: { color: 'bg-red-100 text-red-700', label: 'סיכון קריטי' },
  unknown: { color: 'bg-gray-100 text-gray-700', label: 'לא נבדק' }
}

export default function DPODashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgDetail, setOrgDetail] = useState<any>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'queue' | 'organizations'>('queue')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const [orgSort, setOrgSort] = useState<'name' | 'risk' | 'pending'>('pending')
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
      
      // Load organizations
      await loadOrganizations()
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

  const loadOrganizations = async () => {
    const res = await fetch('/api/dpo?action=organizations')
    const data = await res.json()
    setOrganizations(data.organizations || [])
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
    setItemContext(data)

    // Auto-analyze if not yet analyzed
    if (!item.ai_summary) {
      analyzeItem(item.id)
    }
  }

  const openOrg = async (org: Organization) => {
    setSelectedOrg(org)
    setOrgDetail(null)
    
    const res = await fetch(`/api/dpo?action=org_detail&org_id=${org.id}`)
    const data = await res.json()
    setOrgDetail(data)
  }

  const analyzeItem = async (itemId: string) => {
    setAnalyzing(true)
    try {
      await fetch('/api/dpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_analyze', itemId })
      })

      // Reload item
      const res = await fetch(`/api/dpo?action=queue_item&id=${itemId}`)
      const data = await res.json()
      if (data.item) {
        setSelectedItem(data.item)
        setEditedResponse(data.item.ai_draft_response || '')
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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

  // Filter and sort organizations
  const filteredOrgs = organizations
    .filter(org => org.name.toLowerCase().includes(orgSearch.toLowerCase()))
    .sort((a, b) => {
      if (orgSort === 'name') return a.name.localeCompare(b.name, 'he')
      if (orgSort === 'pending') return (b.pending_count || 0) - (a.pending_count || 0)
      if (orgSort === 'risk') {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 }
        return (riskOrder[a.risk_level as keyof typeof riskOrder] || 4) - (riskOrder[b.risk_level as keyof typeof riskOrder] || 4)
      }
      return 0
    })

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className={stats?.critical_count ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">קריטי</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.critical_count || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats?.high_count ? 'border-orange-300 bg-orange-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">גבוה</p>
                  <p className="text-3xl font-bold text-orange-600">{stats?.high_count || 0}</p>
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
                  <p className="text-3xl font-bold">{(stats?.medium_count || 0) + (stats?.low_count || 0)}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">לקוחות</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.active_orgs || 0}</p>
                </div>
                <Building2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">טופלו החודש</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.resolved_this_month || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'queue' ? 'default' : 'outline'}
            onClick={() => setActiveTab('queue')}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            תור המתנה ({stats?.total_pending || 0})
          </Button>
          <Button
            variant={activeTab === 'organizations' ? 'default' : 'outline'}
            onClick={() => setActiveTab('organizations')}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            ארגונים ({stats?.active_orgs || 0})
          </Button>
        </div>

        {/* QUEUE TAB */}
        {activeTab === 'queue' && (
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
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
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
                              <div className="text-xs text-gray-400">
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

            {/* Item Detail */}
            <div>
              {selectedItem ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selectedItem.organizations?.name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{selectedItem.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* AI Analysis */}
                    {analyzing ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        מנתח את הפנייה...
                      </div>
                    ) : selectedItem.ai_summary ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">📊 סיכום AI:</p>
                          <p className="text-sm text-blue-700">{selectedItem.ai_summary}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-1">💡 המלצה:</p>
                          <p className="text-sm text-green-700">{selectedItem.ai_recommendation}</p>
                        </div>
                        {selectedItem.ai_confidence && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">ביטחון:</span>
                            <Badge className={selectedItem.ai_confidence > 0.85 ? 'bg-green-100 text-green-700' : selectedItem.ai_confidence > 0.7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                              {Math.round(selectedItem.ai_confidence * 100)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => analyzeItem(selectedItem.id)}>
                        <Zap className="h-4 w-4 ml-1" />
                        נתח עם AI
                      </Button>
                    )}

                    {/* Conversation Context */}
                    {itemContext?.messages && itemContext.messages.length > 0 && (
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p className="text-sm font-medium mb-2">💬 שיחה:</p>
                        <div className="space-y-2">
                          {itemContext.messages.map((msg: any, i: number) => (
                            <div key={i} className={`text-sm p-2 rounded ${msg.sender_type === 'user' ? 'bg-gray-100' : 'bg-blue-50'}`}>
                              <span className="font-medium">{msg.sender_type === 'user' ? '👤 עובד' : '🤖 בוט'}:</span>
                              <p className="mt-1">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DSR Context */}
                    {itemContext?.dsr && (
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">📋 פרטי בקשה:</p>
                        <div className="text-sm space-y-1">
                          <p><strong>שם:</strong> {itemContext.dsr.full_name}</p>
                          <p><strong>אימייל:</strong> {itemContext.dsr.email}</p>
                          <p><strong>סוג:</strong> {itemContext.dsr.request_type}</p>
                          {itemContext.dsr.details && <p><strong>פרטים:</strong> {itemContext.dsr.details}</p>}
                        </div>
                      </div>
                    )}

                    {/* Response Editor */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">תשובה:</label>
                      <Textarea
                        value={editedResponse}
                        onChange={e => setEditedResponse(e.target.value)}
                        rows={5}
                        placeholder="הקלד תשובה..."
                      />
                    </div>

                    {/* Resolution Notes */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">הערות פנימיות:</label>
                      <Input
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="הערות (אופציונלי)"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.ai_confidence && selectedItem.ai_confidence > 0.85 && (
                        <Button
                          size="sm"
                          onClick={() => resolveItem('approved_ai')}
                          disabled={resolving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 ml-1" />}
                          אשר AI
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => resolveItem('edited')}
                        disabled={resolving || !editedResponse}
                      >
                        {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-1" />}
                        שלח תשובה
                      </Button>
                      <Button
                        size="sm"
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
        )}

        {/* ORGANIZATIONS TAB */}
        {activeTab === 'organizations' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Organizations List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      ארגונים ({filteredOrgs.length})
                    </CardTitle>
                  </div>
                  {/* Search and Sort */}
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="חיפוש ארגון..."
                        value={orgSearch}
                        onChange={e => setOrgSearch(e.target.value)}
                        className="pr-9"
                      />
                    </div>
                    <select
                      className="text-sm border rounded px-2 py-1"
                      value={orgSort}
                      onChange={e => setOrgSort(e.target.value as any)}
                    >
                      <option value="pending">לפי פניות ממתינות</option>
                      <option value="risk">לפי רמת סיכון</option>
                      <option value="name">לפי שם</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {filteredOrgs.map(org => {
                      const risk = riskConfig[org.risk_level as keyof typeof riskConfig] || riskConfig.unknown
                      
                      return (
                        <div
                          key={org.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedOrg?.id === org.id ? 'bg-blue-50' : ''}`}
                          onClick={() => openOrg(org)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{org.name}</p>
                                {org.pending_count > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {org.pending_count} ממתינים
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <Badge variant="outline" className={`${risk.color} text-xs`}>
                                  {risk.label}
                                </Badge>
                                {org.compliance_score !== null && (
                                  <span>ציון: {Math.round(org.compliance_score)}/100</span>
                                )}
                                <span>•</span>
                                <span>מאז {formatDate(org.created_at)}</span>
                              </div>
                            </div>
                            <ChevronLeft className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organization Detail */}
            <div>
              {selectedOrg ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selectedOrg.name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrg(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {orgDetail?.organization && (
                      <CardDescription>
                        לקוח מאז {formatDate(orgDetail.organization.created_at)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!orgDetail ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>
                        {/* Compliance Score */}
                        {orgDetail.compliance && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium">ציון תאימות</span>
                              <Badge className={
                                orgDetail.compliance.overall_score > 80 ? 'bg-green-100 text-green-700' : 
                                orgDetail.compliance.overall_score > 60 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'
                              }>
                                {Math.round(orgDetail.compliance.overall_score)}/100
                              </Badge>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  orgDetail.compliance.overall_score > 80 ? 'bg-green-500' : 
                                  orgDetail.compliance.overall_score > 60 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`}
                                style={{ width: `${orgDetail.compliance.overall_score}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                              <div className="text-center">
                                <p className="text-gray-500">מסמכים</p>
                                <p className="font-medium">{Math.round(orgDetail.compliance.documents_score || 0)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500">אירועים</p>
                                <p className="font-medium">{Math.round(orgDetail.compliance.incidents_score || 100)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500">תגובות</p>
                                <p className="font-medium">{Math.round(orgDetail.compliance.response_time_score || 100)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <FileText className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                            <p className="text-2xl font-bold text-blue-700">{orgDetail.documents?.length || 0}</p>
                            <p className="text-xs text-blue-600">מסמכים</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg text-center">
                            <Clock className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                            <p className="text-2xl font-bold text-purple-700">{orgDetail.time_this_month_minutes || 0}</p>
                            <p className="text-xs text-purple-600">דקות DPO החודש</p>
                          </div>
                        </div>

                        {/* Documents */}
                        {orgDetail.documents && orgDetail.documents.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">📄 מסמכים:</p>
                            <div className="space-y-1">
                              {orgDetail.documents.slice(0, 5).map((doc: any) => (
                                <div key={doc.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="truncate">{doc.name}</span>
                                  <Badge variant="outline" className="text-xs mr-auto">{doc.type}</Badge>
                                </div>
                              ))}
                              {orgDetail.documents.length > 5 && (
                                <p className="text-xs text-gray-500 text-center">
                                  ועוד {orgDetail.documents.length - 5} מסמכים...
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Recent Queue History */}
                        {orgDetail.queue_history && orgDetail.queue_history.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">📋 היסטוריה אחרונה:</p>
                            <div className="space-y-2">
                              {orgDetail.queue_history.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className={`text-xs ${item.status === 'resolved' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                    {item.status === 'resolved' ? '✓' : '⏳'}
                                  </Badge>
                                  <span className="truncate flex-1">{item.title}</span>
                                  {item.resolved_at && (
                                    <span className="text-xs text-gray-400">{formatDate(item.resolved_at)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Items for this Org */}
                        {selectedOrg.pending_count > 0 && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setActiveTab('queue')
                              // Could add org filter here
                            }}
                          >
                            <MessageSquare className="h-4 w-4 ml-2" />
                            צפה ב-{selectedOrg.pending_count} פניות ממתינות
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>בחר ארגון מהרשימה</p>
                    <p className="text-sm">לצפייה בפרטים מלאים</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
