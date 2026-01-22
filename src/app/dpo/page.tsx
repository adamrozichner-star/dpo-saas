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
  Calendar,
  Bell
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

interface Incident {
  id: string
  org_id: string
  title: string
  description: string
  incident_type: string
  severity: string
  status: string
  discovered_at: string
  reported_at: string
  authority_deadline: string
  hours_remaining: number
  urgency: string
  data_types_affected: string[]
  records_affected: number
  individuals_affected: number
  requires_authority_notification: boolean
  requires_individual_notification: boolean
  ai_summary: string
  ai_risk_assessment: string
  ai_recommendations: string
  ai_authority_draft: string
  ai_individuals_draft: string
  authority_notified_at: string | null
  individuals_notified_at: string | null
  contained_at: string | null
  resolved_at: string | null
  organizations?: { name: string }
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
  const [activeTab, setActiveTab] = useState<'queue' | 'organizations' | 'incidents'>('queue')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const [orgSort, setOrgSort] = useState<'name' | 'risk' | 'pending'>('pending')
  const [startTime, setStartTime] = useState<number | null>(null)
  
  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [incidentStats, setIncidentStats] = useState({ total: 0, overdue: 0, critical: 0, urgent: 0, notified: 0 })
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [incidentDetails, setIncidentDetails] = useState<any>(null)
  const [incidentTab, setIncidentTab] = useState<'assessment' | 'authority' | 'individuals' | 'timeline'>('assessment')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      
      // Load incidents
      await loadIncidents()
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

  const loadIncidents = async () => {
    try {
      const response = await fetch('/api/incidents?action=dashboard')
      const data = await response.json()
      setIncidents(data.incidents || [])
      setIncidentStats(data.stats || { total: 0, overdue: 0, critical: 0, urgent: 0, notified: 0 })
    } catch (error) {
      console.error('Fetch incidents error:', error)
    }
  }

  const loadIncidentDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/incidents?action=get&id=${id}`)
      const data = await response.json()
      setIncidentDetails(data)
    } catch (error) {
      console.error('Fetch details error:', error)
    }
  }

  useEffect(() => {
    if (!loading) {
      loadQueue()
    }
  }, [filterPriority, filterType])

  useEffect(() => {
    if (selectedIncident) {
      loadIncidentDetails(selectedIncident.id)
    }
  }, [selectedIncident])

  // Auto-refresh incidents every minute
  useEffect(() => {
    if (activeTab === 'incidents') {
      const interval = setInterval(loadIncidents, 60000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

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

  // Incident actions
  const updateIncidentStatus = async (status: string, notes?: string) => {
    if (!selectedIncident) return
    setIsSubmitting(true)

    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          incidentId: selectedIncident.id,
          status,
          notes
        })
      })
      loadIncidents()
      loadIncidentDetails(selectedIncident.id)
    } catch (error) {
      console.error('Update status error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const notifyAuthority = async (content: string, referenceNumber?: string) => {
    if (!selectedIncident) return
    setIsSubmitting(true)

    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify_authority',
          incidentId: selectedIncident.id,
          notificationContent: content,
          referenceNumber
        })
      })
      alert('✅ דיווח לרשות נרשם בהצלחה')
      loadIncidents()
      loadIncidentDetails(selectedIncident.id)
    } catch (error) {
      console.error('Notify authority error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const notifyIndividuals = async (content: string, count: number) => {
    if (!selectedIncident) return
    setIsSubmitting(true)

    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify_individuals',
          incidentId: selectedIncident.id,
          notificationContent: content,
          recipientCount: count
        })
      })
      alert('✅ הודעה לנפגעים נרשמה בהצלחה')
      loadIncidents()
      loadIncidentDetails(selectedIncident.id)
    } catch (error) {
      console.error('Notify individuals error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const analyzeIncident = async (incidentId: string) => {
    setIsSubmitting(true)
    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', incidentId })
      })
      loadIncidents()
      if (selectedIncident?.id === incidentId) {
        loadIncidentDetails(incidentId)
      }
    } catch (error) {
      console.error('Analyze error:', error)
    } finally {
      setIsSubmitting(false)
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

  const formatTimeRemaining = (hours: number) => {
    if (hours < 0) return 'חלף המועד!'
    if (hours < 1) return `${Math.round(hours * 60)} דקות`
    if (hours < 24) return `${Math.round(hours)} שעות`
    return `${Math.round(hours / 24)} ימים`
  }

  const getUrgencyStyle = (urgency: string) => {
    const styles: Record<string, { bg: string; border: string; text: string; label: string }> = {
      overdue: { bg: 'bg-black', border: 'border-black', text: 'text-white', label: '⚫ חלף המועד!' },
      critical: { bg: 'bg-red-600', border: 'border-red-600', text: 'text-white', label: '🔴 קריטי' },
      urgent: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-white', label: '🟠 דחוף' },
      warning: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-black', label: '🟡 אזהרה' },
      ok: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-white', label: '🟢 תקין' },
      notified: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-white', label: '✅ דווח' }
    }
    return styles[urgency] || styles.ok
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

  // Count active incidents
  const activeIncidentsCount = incidents.filter(i => !['resolved', 'closed'].includes(i.status) && (i.urgency === 'critical' || i.urgency === 'urgent' || i.urgency === 'overdue')).length

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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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

          <Card className={incidentStats.overdue + incidentStats.critical > 0 ? 'border-red-300 bg-red-50' : 'bg-orange-50 border-orange-200'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">אירועי אבטחה</p>
                  <p className="text-3xl font-bold text-orange-600">{incidentStats.total || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-orange-400" />
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
            variant={activeTab === 'incidents' ? 'default' : 'outline'}
            onClick={() => setActiveTab('incidents')}
            className={`gap-2 ${activeIncidentsCount > 0 ? 'border-red-300' : ''}`}
          >
            <Bell className="h-4 w-4" />
            אירועי אבטחה ({incidentStats.total || 0})
            {activeIncidentsCount > 0 && (
              <Badge variant="destructive" className="mr-1">{activeIncidentsCount}</Badge>
            )}
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

        {/* INCIDENTS TAB */}
        {activeTab === 'incidents' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Incidents List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      אירועי אבטחה ({incidents.length})
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={loadIncidents}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Stats */}
                  <div className="flex gap-3 mt-3">
                    {incidentStats.overdue > 0 && (
                      <Badge className="bg-black text-white">⚫ {incidentStats.overdue} באיחור</Badge>
                    )}
                    {incidentStats.critical > 0 && (
                      <Badge className="bg-red-600 text-white">🔴 {incidentStats.critical} קריטי</Badge>
                    )}
                    {incidentStats.urgent > 0 && (
                      <Badge className="bg-orange-500 text-white">🟠 {incidentStats.urgent} דחוף</Badge>
                    )}
                    {incidentStats.notified > 0 && (
                      <Badge className="bg-blue-500 text-white">✅ {incidentStats.notified} דווחו</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {incidents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-3 text-green-400" />
                      <p className="font-medium">אין אירועי אבטחה פעילים</p>
                      <p className="text-sm">הכל תקין ✨</p>
                    </div>
                  ) : (
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                      {incidents.map(incident => {
                        const urgencyStyle = getUrgencyStyle(incident.urgency)
                        
                        return (
                          <div
                            key={incident.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedIncident?.id === incident.id ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-3 h-3 rounded-full mt-1.5 ${urgencyStyle.bg}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={`${urgencyStyle.bg} ${urgencyStyle.text} text-xs`}>
                                    {urgencyStyle.label}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {incident.severity}
                                  </Badge>
                                </div>
                                <p className="font-medium truncate">{incident.title}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span>{incident.organizations?.name}</span>
                                  <span>•</span>
                                  <span>נתגלה: {formatDate(incident.discovered_at)}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                {incident.hours_remaining > 0 && !incident.authority_notified_at && (
                                  <div className={`text-sm font-bold ${incident.hours_remaining < 12 ? 'text-red-600' : 'text-gray-700'}`}>
                                    {formatTimeRemaining(incident.hours_remaining)}
                                  </div>
                                )}
                                {incident.authority_notified_at && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">דווח ✓</Badge>
                                )}
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

            {/* Incident Detail */}
            <div>
              {selectedIncident ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selectedIncident.organizations?.name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIncident(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{selectedIncident.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Urgency Banner */}
                    {!selectedIncident.authority_notified_at && (
                      <div className={`p-3 rounded-lg ${selectedIncident.hours_remaining < 12 ? 'bg-red-100' : 'bg-amber-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">⏱️ זמן נותר לדיווח:</span>
                          <span className={`text-xl font-bold ${selectedIncident.hours_remaining < 12 ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatTimeRemaining(selectedIncident.hours_remaining)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 border-b">
                      {['assessment', 'authority', 'individuals', 'timeline'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setIncidentTab(tab as any)}
                          className={`px-3 py-2 text-sm ${incidentTab === tab ? 'border-b-2 border-primary font-medium' : 'text-gray-500'}`}
                        >
                          {tab === 'assessment' && 'הערכה'}
                          {tab === 'authority' && 'דיווח לרשות'}
                          {tab === 'individuals' && 'הודעה לנפגעים'}
                          {tab === 'timeline' && 'ציר זמן'}
                        </button>
                      ))}
                    </div>

                    {/* Assessment Tab */}
                    {incidentTab === 'assessment' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-gray-50 rounded">
                            <p className="text-gray-500">סוג</p>
                            <p className="font-medium">{selectedIncident.incident_type}</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <p className="text-gray-500">חומרה</p>
                            <p className="font-medium">{selectedIncident.severity}</p>
                          </div>
                          {selectedIncident.individuals_affected && (
                            <div className="p-3 bg-gray-50 rounded">
                              <p className="text-gray-500">נפגעים</p>
                              <p className="font-medium">{selectedIncident.individuals_affected.toLocaleString()}</p>
                            </div>
                          )}
                          {selectedIncident.records_affected && (
                            <div className="p-3 bg-gray-50 rounded">
                              <p className="text-gray-500">רשומות</p>
                              <p className="font-medium">{selectedIncident.records_affected.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        {selectedIncident.description && (
                          <div>
                            <p className="text-sm font-medium mb-1">תיאור:</p>
                            <p className="text-sm bg-gray-50 p-3 rounded">{selectedIncident.description}</p>
                          </div>
                        )}

                        {selectedIncident.ai_summary ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-800 mb-1">📊 סיכום AI:</p>
                              <p className="text-sm text-blue-700">{selectedIncident.ai_summary}</p>
                            </div>
                            {selectedIncident.ai_risk_assessment && (
                              <div className="p-3 bg-amber-50 rounded-lg">
                                <p className="text-sm font-medium text-amber-800 mb-1">⚠️ הערכת סיכון:</p>
                                <p className="text-sm text-amber-700 whitespace-pre-line">{selectedIncident.ai_risk_assessment}</p>
                              </div>
                            )}
                            {selectedIncident.ai_recommendations && (
                              <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm font-medium text-green-800 mb-1">💡 המלצות:</p>
                                <p className="text-sm text-green-700 whitespace-pre-line">{selectedIncident.ai_recommendations}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => analyzeIncident(selectedIncident.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Zap className="h-4 w-4 ml-2" />}
                            נתח עם AI
                          </Button>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-3 border-t">
                          {!selectedIncident.contained_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateIncidentStatus('contained', 'הוכל ע"י DPO')}
                              disabled={isSubmitting}
                            >
                              🛡️ סמן כהוכל
                            </Button>
                          )}
                          {selectedIncident.authority_notified_at && !selectedIncident.resolved_at && (
                            <Button
                              size="sm"
                              onClick={() => updateIncidentStatus('resolved', 'נפתר')}
                              disabled={isSubmitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              ✅ סמן כנפתר
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Authority Tab */}
                    {incidentTab === 'authority' && (
                      <div className="space-y-3">
                        {selectedIncident.authority_notified_at ? (
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                            <p className="font-medium text-green-800">דווח לרשות בהצלחה</p>
                            <p className="text-sm text-green-700">
                              {new Date(selectedIncident.authority_notified_at).toLocaleString('he-IL')}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 bg-amber-50 rounded-lg">
                              <p className="text-sm text-amber-800">
                                ⚠️ יש לדווח לרשות להגנת הפרטיות תוך 72 שעות מגילוי האירוע.
                              </p>
                              <a 
                                href="https://www.gov.il/he/service/data_security_breach_report" 
                                target="_blank"
                                className="text-sm text-blue-600 underline"
                              >
                                טופס דיווח אירוע אבטחה →
                              </a>
                            </div>

                            {selectedIncident.ai_authority_draft && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-2">📝 טיוטת דיווח (AI):</p>
                                <div className="bg-white p-3 rounded text-sm border whitespace-pre-line max-h-48 overflow-y-auto">
                                  {selectedIncident.ai_authority_draft}
                                </div>
                                <button
                                  onClick={() => navigator.clipboard.writeText(selectedIncident.ai_authority_draft)}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  📋 העתק לזיכרון
                                </button>
                              </div>
                            )}

                            <Button
                              className="w-full bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                const refNum = prompt('הזן מספר אסמכתא מהרשות (אופציונלי):')
                                notifyAuthority(selectedIncident.ai_authority_draft || 'דיווח בוצע', refNum || undefined)
                              }}
                              disabled={isSubmitting}
                            >
                              ✅ סמן כדווח לרשות
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                              לחץ לאחר שביצעת את הדיווח בפועל באתר הרשות
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Individuals Tab */}
                    {incidentTab === 'individuals' && (
                      <div className="space-y-3">
                        {selectedIncident.individuals_notified_at ? (
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                            <p className="font-medium text-green-800">הודעה לנפגעים נשלחה</p>
                            <p className="text-sm text-green-700">
                              {new Date(selectedIncident.individuals_notified_at).toLocaleString('he-IL')}
                            </p>
                          </div>
                        ) : (
                          <>
                            {!selectedIncident.requires_individual_notification ? (
                              <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-600">
                                לפי הערכת הסיכון, לא נדרשת הודעה לנפגעים.
                              </div>
                            ) : (
                              <div className="p-3 bg-orange-50 rounded-lg">
                                <p className="text-sm text-orange-800">
                                  ⚠️ נדרשת הודעה לנפגעים בשל הסיכון הגבוה לזכויותיהם.
                                </p>
                              </div>
                            )}

                            {selectedIncident.ai_individuals_draft && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-2">📝 טיוטת הודעה (AI):</p>
                                <div className="bg-white p-3 rounded text-sm border whitespace-pre-line max-h-48 overflow-y-auto">
                                  {selectedIncident.ai_individuals_draft}
                                </div>
                                <button
                                  onClick={() => navigator.clipboard.writeText(selectedIncident.ai_individuals_draft)}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  📋 העתק לזיכרון
                                </button>
                              </div>
                            )}

                            <Button
                              className="w-full bg-orange-500 hover:bg-orange-600"
                              onClick={() => {
                                const count = prompt('כמה נפגעים קיבלו הודעה?')
                                if (count) {
                                  notifyIndividuals(selectedIncident.ai_individuals_draft || 'הודעה נשלחה', parseInt(count))
                                }
                              }}
                              disabled={isSubmitting}
                            >
                              ✅ סמן ששלחתי הודעה לנפגעים
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Timeline Tab */}
                    {incidentTab === 'timeline' && (
                      <div className="space-y-3">
                        {[
                          { label: 'נתגלה', time: selectedIncident.discovered_at, icon: '🔍', color: 'bg-gray-500' },
                          { label: 'דווח במערכת', time: selectedIncident.reported_at, icon: '📝', color: 'bg-blue-500' },
                          selectedIncident.contained_at && { label: 'הוכל', time: selectedIncident.contained_at, icon: '🛡️', color: 'bg-green-500' },
                          selectedIncident.authority_notified_at && { label: 'דווח לרשות', time: selectedIncident.authority_notified_at, icon: '📤', color: 'bg-purple-500' },
                          selectedIncident.individuals_notified_at && { label: 'הודעה לנפגעים', time: selectedIncident.individuals_notified_at, icon: '👥', color: 'bg-orange-500' },
                          selectedIncident.resolved_at && { label: 'נפתר', time: selectedIncident.resolved_at, icon: '✅', color: 'bg-green-600' }
                        ].filter(Boolean).map((event: any, index) => (
                          <div key={index} className="flex gap-3">
                            <div className={`w-8 h-8 ${event.color} rounded-full flex items-center justify-center text-white text-sm`}>
                              {event.icon}
                            </div>
                            <div>
                              <div className="font-medium">{event.label}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(event.time).toLocaleString('he-IL')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>בחר אירוע מהרשימה</p>
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

                        {/* Pending Items for this Org */}
                        {selectedOrg.pending_count > 0 && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab('queue')}
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
