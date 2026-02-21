'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

// =============================================
// TYPES
// =============================================
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
  resolved_at: string | null
  resolution_type: string | null
  deadline_at: string | null
  organizations: { id: string; name: string }
}

interface Organization {
  id: string
  name: string
  status: string
  created_at: string
  pending_count: number
  compliance_score: number | null
  risk_level: string
  tier?: string
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

interface DashboardStats {
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_pending: number
  total_resolved_this_month: number
  avg_resolution_minutes: number
  organizations_count: number
  monthly_time_minutes: number
}

interface OrgDetail {
  organization: any
  compliance: any
  documents: any[]
  queue_history: any[]
  time_this_month_minutes: number
  onboarding_context: any
}

// =============================================
// CONFIG
// =============================================
const TYPE_CONFIG: Record<string, { label: string; emoji: string; tagClass: string; stripeClass: string }> = {
  incident:        { label: 'אירוע אבטחה',  emoji: '🚨', tagClass: 'tag-red',    stripeClass: 'stripe-red' },
  escalation:      { label: 'שאלה מסולמת',   emoji: '💬', tagClass: 'tag-amber',  stripeClass: 'stripe-amber' },
  review:          { label: 'סקירת מסמך',    emoji: '📄', tagClass: 'tag-blue',   stripeClass: 'stripe-blue' },
  dsr:             { label: 'בקשת מידע',     emoji: '📋', tagClass: 'tag-purple', stripeClass: 'stripe-purple' },
  onboarding:      { label: 'אונבורדינג',    emoji: '🏢', tagClass: 'tag-green',  stripeClass: 'stripe-green' },
  document_expiry: { label: 'פג תוקף',       emoji: '⏰', tagClass: 'tag-amber',  stripeClass: 'stripe-amber' },
  regulator:       { label: 'רגולטור',        emoji: '⚖️', tagClass: 'tag-red',    stripeClass: 'stripe-red' },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'קריטי', color: 'var(--red)' },
  high: { label: 'גבוה', color: '#ea580c' },
  medium: { label: 'בינוני', color: 'var(--amber)' },
  low: { label: 'נמוך', color: 'var(--green)' },
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `לפני ${mins} דקות`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

function deadlineText(deadlineStr: string | null): string | null {
  if (!deadlineStr) return null
  const remaining = new Date(deadlineStr).getTime() - Date.now()
  if (remaining < 0) return '⚠️ חריגה!'
  const hours = Math.floor(remaining / 3600000)
  return `דד-ליין: ${hours}h`
}

// Detect if text is a raw chat dump and parse it
function parseRawChat(text: string): { isChatDump: boolean; messages: { role: string; content: string }[]; summary: string } {
  if (!text) return { isChatDump: false, messages: [], summary: '' }
  
  // Detect "assistant: ... user: ..." pattern
  if (text.includes('assistant:') && text.includes('user:')) {
    const lines = text.split('\n').filter(l => l.trim())
    const messages = lines.map(line => {
      if (line.startsWith('user:')) return { role: 'user', content: line.replace('user:', '').trim() }
      if (line.startsWith('assistant:')) return { role: 'assistant', content: line.replace('assistant:', '').trim() }
      return null
    }).filter(Boolean) as { role: string; content: string }[]
    
    // Extract last user message as summary
    const lastUser = messages.filter(m => m.role === 'user').pop()
    const summary = lastUser ? lastUser.content.substring(0, 200) : text.substring(0, 200)
    
    return { isChatDump: true, messages: messages.slice(-4), summary }
  }
  
  return { isChatDump: false, messages: [], summary: text.substring(0, 300) }
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()

  // Core state
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  
  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelType, setPanelType] = useState<'item' | 'incident' | 'org'>('item')
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  
  // Incident state
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [incidentDetails, setIncidentDetails] = useState<any>(null)
  const [incidentTab, setIncidentTab] = useState<'assessment' | 'authority' | 'individuals'>('assessment')
  
  // Action state
  const [resolving, setResolving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)

  // Auth check
  useEffect(() => {
    const token = sessionStorage.getItem('dpo_session_token')
    const expires = sessionStorage.getItem('dpo_session_expires')
    if (!token || !expires || new Date(expires) < new Date()) {
      sessionStorage.removeItem('dpo_session_token')
      sessionStorage.removeItem('dpo_session_expires')
      router.push('/dpo/login')
    } else {
      loadDashboard()
    }
  }, [])

  const dpoFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = sessionStorage.getItem('dpo_session_token')
    const headers = new Headers(options.headers)
    if (token) headers.set('x-dpo-token', token)
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }

  // =============================================
  // DATA LOADING
  // =============================================
  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [statsRes, queueRes, orgsRes] = await Promise.all([
        dpoFetch('/api/dpo?action=stats'),
        dpoFetch('/api/dpo?action=queue'),
        dpoFetch('/api/dpo?action=organizations'),
      ])
      const [statsData, queueData, orgsData] = await Promise.all([
        statsRes.json(), queueRes.json(), orgsRes.json()
      ])
      setStats(statsData)
      setQueueItems(queueData.items || [])
      setOrganizations(orgsData.organizations || [])
      
      // Also load incidents
      try {
        const incRes = await dpoFetch('/api/incidents?action=dashboard')
        const incData = await incRes.json()
        setIncidents(incData.incidents || [])
      } catch (e) { /* incidents table may not exist yet */ }
    } catch (e) {
      console.error('Failed to load dashboard:', e)
    }
    setLoading(false)
  }

  const loadOrgDetail = async (orgId: string) => {
    setOrgDetail(null)
    try {
      const res = await dpoFetch(`/api/dpo?action=org_detail&org_id=${orgId}`)
      const data = await res.json()
      setOrgDetail(data)
    } catch (e) { console.error('Failed to load org detail:', e) }
  }

  const loadItemContext = async (itemId: string) => {
    setItemContext(null)
    try {
      const res = await dpoFetch(`/api/dpo?action=queue_item&id=${itemId}`)
      const data = await res.json()
      setItemContext(data)
    } catch (e) { console.error('Failed to load item context:', e) }
  }

  const loadIncidentDetails = async (id: string) => {
    setIncidentDetails(null)
    try {
      const res = await dpoFetch(`/api/incidents?action=get&id=${id}`)
      const data = await res.json()
      setIncidentDetails(data)
    } catch (e) { console.error('Failed to load incident:', e) }
  }

  // =============================================
  // PANEL OPENERS
  // =============================================
  const openItemPanel = (item: QueueItem) => {
    // If incident type, find matching incident and open incident panel
    if (item.type === 'incident') {
      const incident = incidents.find(i => i.org_id === item.org_id && 
        (i.status !== 'resolved' && i.status !== 'closed'))
      if (incident) {
        openIncidentPanel(incident)
        return
      }
    }
    
    setSelectedItem(item)
    setEditedResponse(item.ai_draft_response || '')
    setIsEditing(false)
    setStartTime(Date.now())
    setPanelType('item')
    setPanelOpen(true)
    loadItemContext(item.id)
    // Also load org context
    if (item.org_id) loadOrgDetail(item.org_id)
  }

  const openIncidentPanel = (incident: Incident) => {
    setSelectedIncident(incident)
    setIncidentTab('assessment')
    setPanelType('incident')
    setPanelOpen(true)
    loadIncidentDetails(incident.id)
    if (incident.org_id) loadOrgDetail(incident.org_id)
  }

  const openOrgPanel = (org: Organization) => {
    setSelectedOrg(org)
    setPanelType('org')
    setPanelOpen(true)
    loadOrgDetail(org.id)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelectedItem(null)
    setSelectedOrg(null)
    setSelectedIncident(null)
    setOrgDetail(null)
    setItemContext(null)
    setIncidentDetails(null)
    setIsEditing(false)
  }

  // =============================================
  // ACTIONS
  // =============================================
  const resolveItem = async (resolutionType: 'approved_ai' | 'edited') => {
    if (!selectedItem) return
    setResolving(true)
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 30
    try {
      const res = await dpoFetch('/api/dpo', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resolve',
          itemId: selectedItem.id,
          resolutionType,
          response: editedResponse,
          notes: '',
          timeSpentSeconds: timeSpent,
          sendEmail: true
        })
      })
      const data = await res.json()
      if (data.success) {
        toast(data.email_sent ? '✅ טופל ונשלח במייל' : '✅ טופל בהצלחה')
        closePanel()
        loadDashboard()
      }
    } catch (e) {
      toast('שגיאה בטיפול', 'error')
    }
    setResolving(false)
  }

  const updateIncidentStatus = async (status: string) => {
    if (!selectedIncident) return
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', incidentId: selectedIncident.id, status })
      })
      toast('סטטוס עודכן')
      loadIncidentDetails(selectedIncident.id)
      loadDashboard()
    } catch (e) { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  const notifyAuthority = async () => {
    if (!selectedIncident || !incidentDetails) return
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notify_authority',
          incidentId: selectedIncident.id,
          notificationContent: incidentDetails.incident?.ai_authority_draft || selectedIncident.ai_authority_draft
        })
      })
      toast('דיווח לרשות נרשם')
      loadIncidentDetails(selectedIncident.id)
    } catch (e) { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  const notifyIndividuals = async () => {
    if (!selectedIncident || !incidentDetails) return
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notify_individuals',
          incidentId: selectedIncident.id,
          notificationContent: incidentDetails.incident?.ai_individuals_draft || selectedIncident.ai_individuals_draft,
          recipientCount: selectedIncident.individuals_affected
        })
      })
      toast('הודעה לנפגעים נרשמה')
      loadIncidentDetails(selectedIncident.id)
    } catch (e) { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  const bulkApprove = async () => {
    const highConf = pendingItems.filter(i => (i.ai_confidence || 0) >= 0.85 && i.ai_draft_response)
    if (highConf.length === 0) { toast('אין פריטים מתאימים', 'info'); return }
    if (!confirm(`לאשר ${highConf.length} פריטים עם ביטחון AI > 85%?`)) return
    try {
      const res = await dpoFetch('/api/dpo', {
        method: 'POST',
        body: JSON.stringify({ action: 'bulk_approve', itemIds: highConf.map(i => i.id), minConfidence: 0.85, sendEmails: true })
      })
      const data = await res.json()
      toast(`אושרו ${data.approved} פריטים`)
      loadDashboard()
    } catch (e) { toast('שגיאה', 'error') }
  }

  // =============================================
  // DERIVED DATA
  // =============================================
  const pendingItems = queueItems.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const recentlyResolved = queueItems.filter(i => i.status === 'resolved' && i.resolved_at).slice(0, 5)
  const sortedOrgs = [...organizations].sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0))
  const monthlyHours = stats ? (stats.monthly_time_minutes / 60).toFixed(1) : '0'
  const monthlyQuota = 12
  const quotaPercent = stats ? Math.min(100, Math.round((stats.monthly_time_minutes / 60 / monthlyQuota) * 100)) : 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: '#6b7280', marginTop: 12 }}>טוען ממשק ממונה...</p>
        </div>
      </div>
    )
  }

  // =============================================
  // RENDER
  // =============================================
  return (
    <>
      <style>{styles}</style>

      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <div className="logo-mark">D</div>
          <div>
            <div className="greeting-text">{greeting}, ממונה</div>
            <div className="greeting-sub">{today}</div>
          </div>
        </div>
        <div className="header-right">
          {pendingItems.length > 0 && <span className="pill pill-red">{pendingItems.length} דורש טיפול</span>}
          <span className="pill pill-green">✓ {stats?.total_resolved_this_month || 0} החודש</span>
          <span className="pill pill-blue">⏱ {monthlyHours}h</span>
          <button className="logout-btn" onClick={() => {
            sessionStorage.removeItem('dpo_session_token')
            sessionStorage.removeItem('dpo_session_expires')
            router.push('/dpo/login')
          }}>יציאה</button>
        </div>
      </div>

      <div className="main-layout">
        {/* LEFT: Inbox */}
        <div className="left-col">
          <div>
            <div className="section-label">
              {pendingItems.length > 0 ? (
                <>דורש את תשומת הלב שלך <span className="section-count">{pendingItems.length}</span></>
              ) : 'תור המתנה'}
            </div>

            {pendingItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">אין פריטים ממתינים</div>
                <div className="empty-sub">המערכת תתריע כשיגיע משהו חדש.</div>
              </div>
            ) : (
              <div className="inbox">
                {pendingItems.map(item => {
                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.review
                  const deadline = deadlineText(item.deadline_at)
                  return (
                    <div key={item.id} className="inbox-card" onClick={() => openItemPanel(item)}>
                      <div className={`card-stripe ${cfg.stripeClass}`} />
                      <div className="card-body">
                        <div className={`card-tag ${cfg.tagClass}`}>{cfg.emoji} {cfg.label}</div>
                        <div className="card-title">{item.title}</div>
                        <div className="card-meta">
                          {item.organizations?.name} · {timeAgo(item.created_at)}
                          {deadline && <> · <strong style={{ color: 'var(--red)' }}>{deadline}</strong></>}
                        </div>
                        {item.ai_summary && (() => {
                          const parsed = parseRawChat(item.ai_summary)
                          return (
                            <div className="ai-block">
                              <div className="ai-label">✦ {parsed.isChatDump ? 'שיחה מהצ׳אט' : item.ai_draft_response ? 'טיוטה מוכנה' : 'ניתוח AI'}</div>
                              <div className="ai-text">{parsed.summary}</div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recently Completed */}
          {recentlyResolved.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div className="section-label">הושלם לאחרונה</div>
              <div className="done-list">
                {recentlyResolved.map(item => (
                  <div key={item.id} className="done-item">
                    <div className="done-check">✓</div>
                    <span className="done-text">{item.title}</span>
                    <span className="done-org">{item.organizations?.name} · {item.resolved_at ? timeAgo(item.resolved_at) : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="right-col">
          {/* Organizations */}
          <div className="sidebar-section">
            <div className="sidebar-header">
              🏢 הארגונים שלך
              <span className="total">{organizations.length} ארגונים</span>
            </div>
            {sortedOrgs.map(org => {
              const score = org.compliance_score || 0
              const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'
              const dotColor = org.pending_count > 0
                ? (org.risk_level === 'critical' || org.risk_level === 'high' ? 'var(--red)' : 'var(--amber)')
                : 'var(--green)'
              return (
                <div key={org.id} className="org-row" onClick={() => openOrgPanel(org)}>
                  <div className="org-dot" style={{ background: dotColor }} />
                  <div className="org-info">
                    <div className="org-name">{org.name}</div>
                    <div className="org-tier">{org.tier === 'extended' ? 'מורחבת' : 'בסיסית'} · {org.pending_count > 0 ? `${org.pending_count} ממתינים` : 'תקין'}</div>
                  </div>
                  <div>
                    <div className="org-score" style={{ color: scoreColor }}>{score}</div>
                    <div className="org-score-bar"><div className="org-score-fill" style={{ width: `${score}%`, background: scoreColor }} /></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Tracker */}
          <div className="time-card">
            <div className="time-header">
              <div className="time-label">⏱ שעון DPO</div>
              <div className="time-value">{monthlyHours}h</div>
            </div>
            <div className="time-bar"><div className="time-fill" style={{ width: `${quotaPercent}%` }} /></div>
            <div className="time-percent">{quotaPercent}% מתוך {monthlyQuota}h מכסה</div>
          </div>

          {/* Quick Actions */}
          <div className="time-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={loadDashboard}>🔄 רענן</button>
            {pendingItems.filter(i => (i.ai_confidence || 0) >= 0.85).length > 0 && (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={bulkApprove}>
                ⚡ אשר הכל (AI &gt; 85%)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =============================================
          SLIDE-OUT PANEL
          ============================================= */}
      {panelOpen && (
        <>
          <div className="panel-overlay" onClick={closePanel} />
          <div className="panel">
            <div className="panel-header">
              <button className="panel-close" onClick={closePanel}>✕</button>
              <div className="panel-title">
                {panelType === 'item' && selectedItem && (
                  <><span className={`card-tag ${TYPE_CONFIG[selectedItem.type]?.tagClass || 'tag-blue'}`}>
                    {TYPE_CONFIG[selectedItem.type]?.emoji} {TYPE_CONFIG[selectedItem.type]?.label}
                  </span> {selectedItem.title}</>
                )}
                {panelType === 'incident' && selectedIncident && (
                  <><span className="card-tag tag-red">🚨 אירוע אבטחה</span> {selectedIncident.title}</>
                )}
                {panelType === 'org' && selectedOrg && (
                  <><span className="card-tag tag-blue">🏢</span> {selectedOrg.name}</>
                )}
              </div>
            </div>

            <div className="panel-body">
              {/* ---- ITEM PANEL (escalations, reviews, dsr, etc) ---- */}
              {panelType === 'item' && selectedItem && (
                <div className="panel-content">
                  {/* Meta strip */}
                  <div className="meta-strip">
                    <div className="meta-chip">{selectedItem.organizations?.name}</div>
                    <div className="meta-chip">{timeAgo(selectedItem.created_at)}</div>
                    {selectedItem.priority && <div className="meta-chip" style={{ color: selectedItem.priority === 'critical' ? 'var(--red)' : selectedItem.priority === 'high' ? 'var(--amber)' : 'var(--secondary)' }}>
                      {selectedItem.priority === 'critical' ? '🔴' : selectedItem.priority === 'high' ? '🟠' : '🟡'} {selectedItem.priority}
                    </div>}
                    {selectedItem.deadline_at && <div className="meta-chip" style={{ color: 'var(--red)', fontWeight: 700 }}>{deadlineText(selectedItem.deadline_at)}</div>}
                  </div>

                  {/* Org context — compact */}
                  {orgDetail && (
                    <details className="details-box">
                      <summary className="details-summary">📊 פרטי ארגון — {orgDetail.organization?.name}</summary>
                      <div className="details-content">
                        <div className="context-grid">
                          <div className="context-cell"><span>תחום</span>{orgDetail.onboarding_context?.industry || '—'}</div>
                          <div className="context-cell"><span>עובדים</span>{orgDetail.onboarding_context?.employee_count || '—'}</div>
                          <div className="context-cell"><span>ציון</span><strong>{orgDetail.organization?.compliance_score || 0}</strong></div>
                          <div className="context-cell"><span>מסמכים</span>{orgDetail.documents?.length || 0}</div>
                        </div>
                        {orgDetail.onboarding_context?.software && (
                          <div style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 6 }}>
                            תוכנות: {Array.isArray(orgDetail.onboarding_context.software) ? orgDetail.onboarding_context.software.join(', ') : '—'}
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Chat thread — if escalation from chat */}
                  {itemContext?.messages && itemContext.messages.length > 0 && (
                    <div className="panel-section">
                      <div className="panel-section-title">💬 שיחה מהצ׳אט</div>
                      <div className="chat-thread">
                        {itemContext.messages.slice(-6).map((msg: any, i: number) => (
                          <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                            <div className="bubble-role">{msg.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                            <div className="bubble-text">{typeof msg.content === 'string' ? msg.content.slice(0, 300) : ''}{msg.content?.length > 300 ? '...' : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description — only if no chat thread */}
                  {selectedItem.description && !(itemContext?.messages?.length > 0) && (
                    <div className="panel-section">
                      <div className="panel-section-title">תיאור</div>
                      <p className="panel-text">{selectedItem.description.slice(0, 400)}{selectedItem.description.length > 400 ? '...' : ''}</p>
                    </div>
                  )}

                  {/* AI Analysis — handles raw chat dumps gracefully */}
                  {selectedItem.ai_summary && (() => {
                    const parsed = parseRawChat(selectedItem.ai_summary)
                    if (parsed.isChatDump) {
                      return (
                        <div className="panel-section">
                          <div className="panel-section-title">💬 שיחה מהצ׳אט</div>
                          <div className="chat-thread">
                            {parsed.messages.map((msg, i) => (
                              <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                                <div className="bubble-role">{msg.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                <div className="bubble-text">{msg.content.slice(0, 250)}{msg.content.length > 250 ? '...' : ''}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="ai-block" style={{ marginBottom: 0 }}>
                        <div className="ai-label">✦ ניתוח AI {selectedItem.ai_confidence ? `(${Math.round(selectedItem.ai_confidence * 100)}% ביטחון)` : ''}</div>
                        <div className="ai-text">{parsed.summary}{selectedItem.ai_summary.length > 300 ? '...' : ''}</div>
                      </div>
                    )
                  })()}

                  {selectedItem.ai_recommendation && (
                    <div className="ai-block" style={{ borderRightColor: 'var(--green)' }}>
                      <div className="ai-label" style={{ color: 'var(--green)' }}>✦ המלצה</div>
                      <div className="ai-text">{selectedItem.ai_recommendation.slice(0, 300)}{selectedItem.ai_recommendation.length > 300 ? '...' : ''}</div>
                    </div>
                  )}

                  {/* Editable response */}
                  <div className="panel-section" style={{ marginTop: 8 }}>
                    <div className="panel-section-title">✏️ תשובה ללקוח</div>
                    {isEditing ? (
                      <textarea
                        className="edit-area"
                        value={editedResponse}
                        onChange={e => setEditedResponse(e.target.value)}
                        rows={6}
                        autoFocus
                      />
                    ) : (
                      <div className="draft-box" onClick={() => { setIsEditing(true); setEditedResponse(selectedItem.ai_draft_response || '') }}>
                        {selectedItem.ai_draft_response 
                          ? selectedItem.ai_draft_response.slice(0, 400) + (selectedItem.ai_draft_response.length > 400 ? '...' : '')
                          : 'אין טיוטה — לחץ לכתוב תשובה'}
                      </div>
                    )}
                  </div>

                  {/* Actions — sticky feel */}
                  <div className="panel-actions">
                    {isEditing ? (
                      <>
                        <button className="btn btn-primary" disabled={resolving} onClick={() => resolveItem('edited')}>
                          {resolving ? '...' : '✓ שלח תשובה ערוכה'}
                        </button>
                        <button className="btn btn-outline" onClick={() => setIsEditing(false)}>ביטול</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-primary" disabled={resolving} onClick={() => resolveItem('approved_ai')}>
                          {resolving ? '...' : '✓ אשר ושלח'}
                        </button>
                        <button className="btn btn-outline" onClick={() => setIsEditing(true)}>✏️ ערוך טיוטה</button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ---- INCIDENT PANEL ---- */}
              {panelType === 'incident' && selectedIncident && (
                <div className="panel-content">
                  {/* Urgency banner */}
                  <div className="urgency-banner" style={{
                    background: selectedIncident.hours_remaining <= 12 ? 'var(--red-soft)' : 
                                selectedIncident.hours_remaining <= 36 ? 'var(--amber-soft)' : 'var(--blue-soft)',
                    borderColor: selectedIncident.hours_remaining <= 12 ? 'var(--red)' : 
                                 selectedIncident.hours_remaining <= 36 ? 'var(--amber)' : 'var(--blue)'
                  }}>
                    <div className="urgency-time">{Math.max(0, selectedIncident.hours_remaining)}h</div>
                    <div className="urgency-label">נותרו לדיווח לרשות</div>
                  </div>

                  {/* Incident tabs */}
                  <div className="tab-bar">
                    {(['assessment', 'authority', 'individuals'] as const).map(tab => (
                      <button key={tab} className={`tab-btn ${incidentTab === tab ? 'tab-active' : ''}`}
                        onClick={() => setIncidentTab(tab)}>
                        {tab === 'assessment' && '🔍 הערכה'}
                        {tab === 'authority' && '🏛 רשות'}
                        {tab === 'individuals' && '👤 נפגעים'}
                        {tab === 'authority' && selectedIncident.authority_notified_at && ' ✓'}
                        {tab === 'individuals' && selectedIncident.individuals_notified_at && ' ✓'}
                      </button>
                    ))}
                  </div>

                  {/* Assessment tab */}
                  {incidentTab === 'assessment' && (
                    <>
                      <div className="context-box">
                        <div className="context-title">פרטי האירוע</div>
                        <div className="context-row"><span>סוג:</span> {selectedIncident.incident_type}</div>
                        <div className="context-row"><span>חומרה:</span> 
                          <strong style={{ color: SEVERITY_CONFIG[selectedIncident.severity]?.color }}>
                            {SEVERITY_CONFIG[selectedIncident.severity]?.label || selectedIncident.severity}
                          </strong>
                        </div>
                        <div className="context-row"><span>רשומות:</span> {selectedIncident.records_affected}</div>
                        <div className="context-row"><span>נפגעים:</span> {selectedIncident.individuals_affected}</div>
                        <div className="context-row"><span>סוגי מידע:</span> {selectedIncident.data_types_affected?.join(', ') || '—'}</div>
                        <div className="context-row"><span>סטטוס:</span> {selectedIncident.status}</div>
                        <div className="context-row"><span>ארגון:</span> {selectedIncident.organizations?.name}</div>
                      </div>

                      {selectedIncident.ai_risk_assessment && (
                        <div className="ai-block" style={{ marginTop: 12 }}>
                          <div className="ai-label">✦ הערכת סיכון AI</div>
                          <div className="ai-text">{selectedIncident.ai_risk_assessment}</div>
                        </div>
                      )}

                      {selectedIncident.ai_recommendations && (
                        <div className="ai-block" style={{ marginTop: 8, borderRightColor: 'var(--green)' }}>
                          <div className="ai-label" style={{ color: 'var(--green)' }}>✦ המלצות</div>
                          <div className="ai-text">{selectedIncident.ai_recommendations}</div>
                        </div>
                      )}

                      <div className="panel-actions" style={{ marginTop: 16 }}>
                        {selectedIncident.status === 'new' && (
                          <button className="btn btn-primary" disabled={isSubmitting} onClick={() => updateIncidentStatus('investigating')}>
                            🔍 התחל חקירה
                          </button>
                        )}
                        {selectedIncident.status === 'investigating' && (
                          <button className="btn btn-primary" disabled={isSubmitting} onClick={() => updateIncidentStatus('contained')}>
                            🛡 אירוע נבלם
                          </button>
                        )}
                        {(selectedIncident.status === 'contained' || selectedIncident.status === 'investigating') && (
                          <button className="btn btn-outline" disabled={isSubmitting} onClick={() => updateIncidentStatus('resolved')}>
                            ✓ סגור אירוע
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Authority notification tab */}
                  {incidentTab === 'authority' && (
                    <>
                      {selectedIncident.authority_notified_at ? (
                        <div className="success-box">✅ דווח לרשות ב-{new Date(selectedIncident.authority_notified_at).toLocaleDateString('he-IL')}</div>
                      ) : (
                        <>
                          <div className="panel-section">
                            <div className="panel-section-title">טיוטת דיווח לרשות</div>
                            <div className="draft-box">
                              {selectedIncident.ai_authority_draft || incidentDetails?.incident?.ai_authority_draft || 'אין טיוטה — נדרש ניתוח AI'}
                            </div>
                          </div>
                          <div className="panel-actions">
                            <button className="btn btn-primary" disabled={isSubmitting} onClick={notifyAuthority}>
                              {isSubmitting ? '...' : '🏛 אשר ודווח לרשות'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Individuals notification tab */}
                  {incidentTab === 'individuals' && (
                    <>
                      {selectedIncident.individuals_notified_at ? (
                        <div className="success-box">✅ נשלחה הודעה ל-{selectedIncident.individuals_affected} נפגעים</div>
                      ) : selectedIncident.requires_individual_notification ? (
                        <>
                          <div className="panel-section">
                            <div className="panel-section-title">טיוטת הודעה לנפגעים ({selectedIncident.individuals_affected})</div>
                            <div className="draft-box">
                              {selectedIncident.ai_individuals_draft || incidentDetails?.incident?.ai_individuals_draft || 'אין טיוטה'}
                            </div>
                          </div>
                          <div className="panel-actions">
                            <button className="btn btn-primary" disabled={isSubmitting} onClick={notifyIndividuals}>
                              {isSubmitting ? '...' : `👤 שלח הודעה ל-${selectedIncident.individuals_affected} נפגעים`}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="success-box">לא נדרשת הודעה לנפגעים</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ---- ORG DETAIL PANEL ---- */}
              {panelType === 'org' && selectedOrg && (
                <div className="panel-content">
                  {orgDetail ? (
                    <>
                      {/* Overview */}
                      <div className="context-box">
                        <div className="context-title">📊 סקירה</div>
                        <div className="context-row"><span>חבילה:</span> {orgDetail.organization?.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</div>
                        <div className="context-row"><span>ציון ציות:</span> <strong>{orgDetail.organization?.compliance_score || 0}</strong></div>
                        <div className="context-row"><span>שעות החודש:</span> {Math.round(orgDetail.time_this_month_minutes || 0)} דקות</div>
                        <div className="context-row"><span>הצטרף:</span> {new Date(orgDetail.organization?.created_at).toLocaleDateString('he-IL')}</div>
                      </div>

                      {/* Onboarding context */}
                      {orgDetail.onboarding_context && Object.keys(orgDetail.onboarding_context).length > 0 && (
                        <div className="context-box" style={{ marginTop: 12 }}>
                          <div className="context-title">🏢 פרופיל עסקי</div>
                          {orgDetail.onboarding_context.industry && <div className="context-row"><span>תחום:</span> {orgDetail.onboarding_context.industry}</div>}
                          {orgDetail.onboarding_context.employee_count && <div className="context-row"><span>עובדים:</span> {orgDetail.onboarding_context.employee_count}</div>}
                          {orgDetail.onboarding_context.software && <div className="context-row"><span>תוכנות:</span> {Array.isArray(orgDetail.onboarding_context.software) ? orgDetail.onboarding_context.software.join(', ') : '—'}</div>}
                          {orgDetail.onboarding_context.customer_type && <div className="context-row"><span>לקוחות:</span> {Array.isArray(orgDetail.onboarding_context.customer_type) ? orgDetail.onboarding_context.customer_type.join(', ') : '—'}</div>}
                          {orgDetail.onboarding_context.has_health_data !== undefined && <div className="context-row"><span>מידע רפואי:</span> {orgDetail.onboarding_context.has_health_data ? 'כן' : 'לא'}</div>}
                          {orgDetail.onboarding_context.works_with_minors !== undefined && <div className="context-row"><span>קטינים:</span> {orgDetail.onboarding_context.works_with_minors ? 'כן' : 'לא'}</div>}
                        </div>
                      )}

                      {/* Documents */}
                      {orgDetail.documents && orgDetail.documents.length > 0 && (
                        <div className="panel-section" style={{ marginTop: 12 }}>
                          <div className="panel-section-title">📄 מסמכים ({orgDetail.documents.length})</div>
                          {orgDetail.documents.map((doc: any) => (
                            <div key={doc.id} className="doc-row">
                              <span>{doc.name || doc.type}</span>
                              <span className="doc-status" style={{ color: doc.status === 'active' ? 'var(--green)' : 'var(--amber)' }}>
                                {doc.status === 'active' ? 'פעיל' : doc.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recent queue history */}
                      {orgDetail.queue_history && orgDetail.queue_history.length > 0 && (
                        <div className="panel-section" style={{ marginTop: 12 }}>
                          <div className="panel-section-title">📋 היסטוריית פניות</div>
                          {orgDetail.queue_history.slice(0, 8).map((q: any) => (
                            <div key={q.id} className="history-row">
                              <span className="history-title">{q.title}</span>
                              <span className="history-meta">{q.status} · {timeAgo(q.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--secondary)' }}>
                      <div className="spinner" />
                      <p style={{ marginTop: 12 }}>טוען פרטי ארגון...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// =============================================
// STYLES
// =============================================
const styles = `
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg: #f8f9fb; --white: #ffffff; --text: #1a1a2e; --secondary: #6b7280;
    --border: #eceef2; --blue: #4f6ef7; --blue-soft: #eef2ff;
    --red: #e5484d; --red-soft: #fff0f0; --amber: #e5930b; --amber-soft: #fef8ec;
    --green: #30a46c; --green-soft: #e9f9f0; --purple: #8b5cf6; --purple-soft: #f3f0ff;
  }
  body { font-family: 'Heebo', -apple-system, sans-serif; background: var(--bg); color: var(--text); }

  /* Header */
  .header { display:flex; align-items:center; justify-content:space-between; padding:18px 36px; background:var(--white); border-bottom:1px solid var(--border); }
  .header-left { display:flex; align-items:center; gap:20px; }
  .logo-mark { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, var(--blue), #818cf8); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:16px; box-shadow:0 2px 8px rgba(79,110,247,0.3); }
  .greeting-text { font-size:18px; font-weight:700; }
  .greeting-sub { font-size:12px; color:var(--secondary); }
  .header-right { display:flex; align-items:center; gap:12px; }
  .pill { display:inline-flex; align-items:center; gap:6px; padding:6px 16px; border-radius:100px; font-size:13px; font-weight:600; }
  .pill-red { background:var(--red-soft); color:var(--red); }
  .pill-green { background:var(--green-soft); color:var(--green); }
  .pill-blue { background:var(--blue-soft); color:var(--blue); }
  .logout-btn { padding:6px 14px; border-radius:8px; border:1px solid var(--border); background:var(--white); color:var(--secondary); font-size:12px; cursor:pointer; font-family:inherit; }

  /* Layout */
  .main-layout { display:grid; grid-template-columns:1fr 340px; gap:24px; padding:28px 36px; min-height:calc(100vh - 76px); }
  .left-col { display:flex; flex-direction:column; }
  .right-col { display:flex; flex-direction:column; gap:20px; }

  /* Section labels */
  .section-label { font-size:12px; font-weight:600; color:var(--secondary); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .section-count { background:var(--red); color:white; font-size:11px; font-weight:700; padding:1px 8px; border-radius:100px; }

  /* Inbox cards */
  .inbox { display:flex; flex-direction:column; gap:10px; }
  .inbox-card { display:flex; gap:16px; padding:20px; background:var(--white); border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border:1px solid var(--border); transition:all 0.25s; cursor:pointer; }
  .inbox-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); border-color:var(--blue); }
  .card-stripe { width:4px; min-height:100%; border-radius:4px; flex-shrink:0; }
  .stripe-red { background:var(--red); } .stripe-amber { background:var(--amber); } .stripe-blue { background:var(--blue); } .stripe-purple { background:var(--purple); } .stripe-green { background:var(--green); }
  .card-body { flex:1; }
  .card-tag { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 10px; border-radius:6px; margin-bottom:8px; }
  .tag-red { background:var(--red-soft); color:var(--red); } .tag-amber { background:var(--amber-soft); color:var(--amber); } .tag-blue { background:var(--blue-soft); color:var(--blue); } .tag-purple { background:var(--purple-soft); color:var(--purple); } .tag-green { background:var(--green-soft); color:var(--green); }
  .card-title { font-size:15px; font-weight:700; margin-bottom:2px; }
  .card-meta { font-size:12px; color:var(--secondary); margin-bottom:12px; }

  /* AI blocks */
  .ai-block { padding:10px 14px; border-radius:10px; background:var(--blue-soft); margin-bottom:14px; border-right:3px solid var(--blue); }
  .ai-label { font-size:10px; font-weight:700; color:var(--blue); margin-bottom:3px; }
  .ai-text { font-size:13px; color:var(--text); line-height:1.6; }

  /* Buttons */
  .btn { padding:8px 18px; border-radius:10px; border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .btn-primary { background:var(--blue); color:white; }
  .btn-primary:hover { background:#3d5bd9; }
  .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
  .btn-outline { background:transparent; border:1px solid var(--border); color:var(--secondary); }
  .btn-outline:hover { border-color:var(--blue); color:var(--blue); }
  .btn-danger { background:var(--red); color:white; }

  /* Edit area */
  .edit-area { width:100%; min-height:80px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:inherit; font-size:13px; line-height:1.6; resize:vertical; direction:rtl; }
  .edit-area:focus { outline:none; border-color:var(--blue); }

  /* Done items */
  .done-list { display:flex; flex-direction:column; gap:6px; }
  .done-item { display:flex; align-items:center; gap:10px; padding:12px 16px; background:var(--white); border-radius:10px; border:1px solid var(--border); font-size:13px; }
  .done-check { width:22px; height:22px; border-radius:6px; background:var(--green-soft); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
  .done-text { flex:1; }
  .done-org { font-size:11px; color:var(--secondary); }

  /* Sidebar */
  .sidebar-section { background:var(--white); border-radius:14px; border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }
  .sidebar-header { padding:14px 18px; font-size:13px; font-weight:600; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .sidebar-header .total { font-size:12px; color:var(--secondary); font-weight:400; }
  .org-row { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid var(--border); transition:background 0.15s; cursor:pointer; }
  .org-row:last-child { border-bottom:none; }
  .org-row:hover { background:var(--bg); }
  .org-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .org-info { flex:1; }
  .org-name { font-size:13px; font-weight:600; }
  .org-tier { font-size:10px; color:var(--secondary); }
  .org-score { font-size:14px; font-weight:800; min-width:32px; text-align:center; }
  .org-score-bar { width:48px; height:4px; border-radius:2px; background:var(--border); overflow:hidden; }
  .org-score-fill { height:100%; border-radius:2px; }

  /* Time card */
  .time-card { background:var(--white); border-radius:14px; border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:18px; }
  .time-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .time-label { font-size:12px; color:var(--secondary); }
  .time-value { font-size:24px; font-weight:800; color:var(--blue); }
  .time-bar { height:8px; border-radius:4px; background:var(--border); margin-bottom:8px; }
  .time-fill { height:100%; border-radius:4px; background:linear-gradient(90deg, var(--blue), var(--purple)); transition:width 0.6s; }
  .time-percent { font-size:11px; color:var(--secondary); text-align:left; }

  /* Empty state */
  .empty-state { text-align:center; padding:48px 20px; background:var(--white); border-radius:14px; border:1px solid var(--border); }
  .empty-icon { font-size:48px; margin-bottom:8px; }
  .empty-title { font-size:16px; font-weight:700; color:var(--green); margin-bottom:4px; }
  .empty-sub { font-size:13px; color:var(--secondary); }

  /* ============ SLIDE-OUT PANEL ============ */
  .panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:100; animation:fadeIn 0.2s; }
  .panel { position:fixed; top:0; right:0; bottom:0; width:560px; max-width:90vw; background:var(--white); z-index:101; box-shadow:-8px 0 32px rgba(0,0,0,0.1); display:flex; flex-direction:column; animation:slideIn 0.25s ease; }
  .panel-header { padding:18px 24px; border-bottom:1px solid var(--border); display:flex; align-items:start; gap:12px; }
  .panel-close { width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:var(--white); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
  .panel-close:hover { background:var(--bg); }
  .panel-title { font-size:15px; font-weight:600; line-height:1.5; }
  .panel-body { flex:1; overflow-y:auto; padding:20px 24px; }
  .panel-content { display:flex; flex-direction:column; gap:12px; }
  .panel-section { }
  .panel-section-title { font-size:12px; font-weight:600; color:var(--secondary); margin-bottom:8px; }
  .panel-text { font-size:13px; line-height:1.7; color:var(--text); }
  .panel-actions { display:flex; gap:8px; margin-top:8px; padding-top:12px; border-top:1px solid var(--border); }

  /* Context box */
  .context-box { padding:14px; border-radius:10px; background:var(--bg); border:1px solid var(--border); }
  .context-title { font-size:12px; font-weight:700; color:var(--secondary); margin-bottom:8px; }
  .context-row { font-size:13px; padding:3px 0; display:flex; gap:6px; }
  .context-row span:first-child { color:var(--secondary); min-width:70px; }

  /* Draft box */
  .draft-box { padding:12px; border-radius:8px; background:var(--bg); border:1px solid var(--border); font-size:13px; line-height:1.6; cursor:pointer; min-height:60px; transition:border-color 0.15s; white-space:pre-wrap; }
  .draft-box:hover { border-color:var(--blue); }

  /* Incident urgency banner */
  .urgency-banner { padding:14px 18px; border-radius:10px; border:2px solid; display:flex; align-items:center; gap:12px; }
  .urgency-time { font-size:28px; font-weight:900; }
  .urgency-label { font-size:13px; }

  /* Tabs */
  .tab-bar { display:flex; gap:4px; margin:8px 0 16px; }
  .tab-btn { padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:var(--white); font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .tab-btn:hover { border-color:var(--blue); }
  .tab-active { background:var(--blue); color:white; border-color:var(--blue); }

  /* Success box */
  .success-box { padding:16px; border-radius:10px; background:var(--green-soft); color:var(--green); font-size:14px; font-weight:600; text-align:center; }

  /* Doc rows */
  .doc-row { display:flex; justify-content:space-between; padding:8px 12px; border-radius:6px; font-size:13px; background:var(--bg); margin-bottom:4px; }
  .doc-status { font-size:11px; font-weight:600; }

  /* Meta strip */
  .meta-strip { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px; }
  .meta-chip { font-size:11px; padding:3px 10px; border-radius:6px; background:var(--bg); color:var(--secondary); font-weight:500; }

  /* Details/accordion */
  .details-box { border:1px solid var(--border); border-radius:10px; overflow:hidden; }
  .details-summary { padding:10px 14px; font-size:12px; font-weight:600; color:var(--secondary); cursor:pointer; background:var(--bg); list-style:none; }
  .details-summary::-webkit-details-marker { display:none; }
  .details-summary::before { content:'◂ '; }
  details[open] .details-summary::before { content:'▾ '; }
  .details-content { padding:10px 14px; border-top:1px solid var(--border); }
  .context-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .context-cell { font-size:12px; padding:4px 0; }
  .context-cell span { display:block; font-size:10px; color:var(--secondary); text-transform:uppercase; letter-spacing:0.5px; }

  /* Chat thread */
  .chat-thread { display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto; padding:4px; }
  .chat-bubble { padding:10px 12px; border-radius:10px; font-size:13px; line-height:1.5; }
  .bubble-user { background:var(--blue-soft); border-right:3px solid var(--blue); }
  .bubble-assistant { background:var(--bg); border-right:3px solid var(--border); }
  .bubble-role { font-size:10px; font-weight:700; color:var(--secondary); margin-bottom:3px; }
  .bubble-text { color:var(--text); word-break:break-word; }

  /* History rows */
  .history-row { padding:6px 0; border-bottom:1px solid var(--border); }
  .history-row:last-child { border-bottom:none; }
  .history-title { font-size:13px; display:block; }
  .history-meta { font-size:11px; color:var(--secondary); }

  /* Spinner */
  .spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--blue); border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }

  @media (max-width: 900px) {
    .main-layout { grid-template-columns:1fr; }
    .header { padding:14px 18px; flex-wrap:wrap; gap:12px; }
    .main-layout { padding:16px; }
    .panel { width:100vw; max-width:100vw; }
  }
`
