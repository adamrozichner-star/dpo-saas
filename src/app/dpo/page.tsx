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
  id: string; org_id: string; title: string; description: string; incident_type: string
  severity: string; status: string; discovered_at: string; reported_at: string
  authority_deadline: string; hours_remaining: number; urgency: string
  data_types_affected: string[]; records_affected: number; individuals_affected: number
  requires_authority_notification: boolean; requires_individual_notification: boolean
  ai_summary: string; ai_risk_assessment: string; ai_recommendations: string
  ai_authority_draft: string; ai_individuals_draft: string
  authority_notified_at: string | null; individuals_notified_at: string | null
  contained_at: string | null; resolved_at: string | null
  organizations?: { name: string }
}

interface DashboardStats {
  critical_count: number; high_count: number; medium_count: number; low_count: number
  total_pending: number; total_resolved_this_month: number; avg_resolution_minutes: number
  organizations_count: number; monthly_time_minutes: number
}

interface OrgDetail {
  organization: any; compliance: any; documents: any[]; queue_history: any[]
  time_this_month_minutes: number; onboarding_context: any
}

// =============================================
// HELPERS
// =============================================
const TYPE_CFG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  incident:        { label: 'אירוע אבטחה',  emoji: '🚨', color: 'var(--red)',    bg: 'var(--red-s)' },
  escalation:      { label: 'שאלה מסולמת',   emoji: '💬', color: 'var(--amber)',  bg: 'var(--amber-s)' },
  review:          { label: 'סקירת מסמך',    emoji: '📄', color: 'var(--blue)',   bg: 'var(--blue-s)' },
  dsr:             { label: 'בקשת מידע',     emoji: '📋', color: 'var(--purple)', bg: 'var(--purple-s)' },
  onboarding:      { label: 'אונבורדינג',    emoji: '🏢', color: 'var(--green)',  bg: 'var(--green-s)' },
  document_expiry: { label: 'פג תוקף',       emoji: '⏰', color: 'var(--amber)',  bg: 'var(--amber-s)' },
  regulator:       { label: 'רגולטור',        emoji: '⚖️', color: 'var(--red)',    bg: 'var(--red-s)' },
}

const SEVERITY: Record<string, { label: string; color: string }> = {
  critical: { label: 'קריטי', color: 'var(--red)' },
  high: { label: 'גבוה', color: '#ea580c' },
  medium: { label: 'בינוני', color: 'var(--amber)' },
  low: { label: 'נמוך', color: 'var(--green)' },
}

function timeAgo(d: string): string {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m} דק׳`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} שעות`
  const days = Math.floor(h / 24)
  if (days === 1) return 'אתמול'
  return `${days} ימים`
}

function deadlineHours(d: string | null): number | null {
  if (!d) return null
  return Math.max(0, Math.floor((new Date(d).getTime() - Date.now()) / 3600000))
}

function parseChat(text: string): { isChat: boolean; msgs: { role: string; text: string }[]; summary: string } {
  if (!text) return { isChat: false, msgs: [], summary: '' }
  if (text.includes('assistant:') && text.includes('user:')) {
    const msgs = text.split('\n').filter(l => l.trim()).map(l => {
      if (l.startsWith('user:')) return { role: 'user', text: l.replace('user:', '').trim() }
      if (l.startsWith('assistant:')) return { role: 'assistant', text: l.replace('assistant:', '').trim() }
      return null
    }).filter(Boolean) as { role: string; text: string }[]
    const lastUser = msgs.filter(m => m.role === 'user').pop()
    return { isChat: true, msgs: msgs.slice(-4), summary: lastUser?.text.substring(0, 150) || text.substring(0, 150) }
  }
  return { isChat: false, msgs: [], summary: text.substring(0, 200) }
}

// =============================================
// COMPONENT
// =============================================
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()

  // Data
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])

  // View state
  type ViewMode = 'inbox' | 'orgs' | 'stats'
  const [view, setView] = useState<ViewMode>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [orgSearch, setOrgSearch] = useState('')
  const [listSearch, setListSearch] = useState('')

  // Detail state
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [incidentDetails, setIncidentDetails] = useState<any>(null)
  const [incidentTab, setIncidentTab] = useState<'assessment' | 'authority' | 'individuals'>('assessment')

  // Action state
  const [resolving, setResolving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [startTime, setStartTime] = useState(0)

  // =============================================
  // AUTH & DATA
  // =============================================
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

  const dpoFetch = async (url: string, opts: RequestInit = {}) => {
    const token = sessionStorage.getItem('dpo_session_token')
    const headers = new Headers(opts.headers)
    if (token) headers.set('x-dpo-token', token)
    if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...opts, headers })
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [sR, qR, oR] = await Promise.all([
        dpoFetch('/api/dpo?action=stats'),
        dpoFetch('/api/dpo?action=queue'),
        dpoFetch('/api/dpo?action=organizations'),
      ])
      const [sD, qD, oD] = await Promise.all([sR.json(), qR.json(), oR.json()])
      setStats(sD)
      setQueueItems(qD.items || [])
      setOrganizations(oD.organizations || [])
      try {
        const iR = await dpoFetch('/api/incidents?action=dashboard')
        const iD = await iR.json()
        setIncidents(iD.incidents || [])
      } catch {}
    } catch (e) { console.error('Load failed:', e) }
    setLoading(false)
  }

  const loadOrgDetail = async (orgId: string) => {
    setOrgDetail(null)
    try {
      const r = await dpoFetch(`/api/dpo?action=org_detail&org_id=${orgId}`)
      setOrgDetail(await r.json())
    } catch {}
  }

  const loadItemContext = async (itemId: string) => {
    setItemContext(null)
    try {
      const r = await dpoFetch(`/api/dpo?action=queue_item&id=${itemId}`)
      setItemContext(await r.json())
    } catch {}
  }

  const loadIncidentDetails = async (id: string) => {
    setIncidentDetails(null)
    try {
      const r = await dpoFetch(`/api/incidents?action=get&id=${id}`)
      setIncidentDetails(await r.json())
    } catch {}
  }

  // =============================================
  // ACTIONS
  // =============================================
  const resolveItem = async (item: QueueItem, type: 'approved_ai' | 'edited') => {
    setResolving(true)
    const t = startTime ? Math.round((Date.now() - startTime) / 1000) : 30
    try {
      const r = await dpoFetch('/api/dpo', {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve', itemId: item.id, resolutionType: type, response: editedResponse, notes: '', timeSpentSeconds: t, sendEmail: true })
      })
      const d = await r.json()
      if (d.success) {
        toast(d.email_sent ? '✅ טופל ונשלח במייל' : '✅ טופל')
        setSelectedId(null)
        setIsEditing(false)
        loadDashboard()
      }
    } catch { toast('שגיאה', 'error') }
    setResolving(false)
  }

  const updateIncidentStatus = async (incident: Incident, status: string) => {
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', { method: 'POST', body: JSON.stringify({ action: 'update_status', incidentId: incident.id, status }) })
      toast('סטטוס עודכן')
      loadIncidentDetails(incident.id)
      loadDashboard()
    } catch { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  const notifyAuthority = async (incident: Incident) => {
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', { method: 'POST', body: JSON.stringify({ action: 'notify_authority', incidentId: incident.id, notificationContent: incidentDetails?.incident?.ai_authority_draft || incident.ai_authority_draft }) })
      toast('דיווח לרשות נרשם')
      loadIncidentDetails(incident.id)
    } catch { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  const notifyIndividuals = async (incident: Incident) => {
    setIsSubmitting(true)
    try {
      await dpoFetch('/api/incidents', { method: 'POST', body: JSON.stringify({ action: 'notify_individuals', incidentId: incident.id, notificationContent: incidentDetails?.incident?.ai_individuals_draft || incident.ai_individuals_draft, recipientCount: incident.individuals_affected }) })
      toast('הודעה לנפגעים נרשמה')
      loadIncidentDetails(incident.id)
    } catch { toast('שגיאה', 'error') }
    setIsSubmitting(false)
  }

  // =============================================
  // DERIVED
  // =============================================
  const pending = queueItems.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const resolved = queueItems.filter(i => i.status === 'resolved').slice(0, 20)
  const selectedItem = queueItems.find(i => i.id === selectedId)
  const selectedOrg = organizations.find(o => o.id === selectedOrgId)
  const monthlyH = stats ? (stats.monthly_time_minutes / 60).toFixed(1) : '0'
  const quotaPct = stats ? Math.min(100, Math.round((stats.monthly_time_minutes / 60 / 12) * 100)) : 0

  const filteredList = (() => {
    let items = listFilter === 'pending' ? pending : listFilter === 'resolved' ? resolved : [...pending, ...resolved]
    if (listSearch) {
      const s = listSearch.toLowerCase()
      items = items.filter(i => i.title.toLowerCase().includes(s) || i.organizations?.name?.toLowerCase().includes(s))
    }
    return items
  })()

  const filteredOrgs = orgSearch
    ? organizations.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase()))
    : organizations.sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0))

  // Select item handler
  const selectItem = (item: QueueItem) => {
    setSelectedId(item.id)
    setSelectedOrgId(null)
    setEditedResponse(item.ai_draft_response || '')
    setIsEditing(false)
    setStartTime(Date.now())
    setIncidentTab('assessment')
    loadItemContext(item.id)
    if (item.org_id) loadOrgDetail(item.org_id)
    // If incident, load incident details
    if (item.type === 'incident') {
      const inc = incidents.find(i => i.org_id === item.org_id && i.status !== 'resolved')
      if (inc) loadIncidentDetails(inc.id)
    }
  }

  const selectOrg = (org: Organization) => {
    setSelectedOrgId(org.id)
    setSelectedId(null)
    loadOrgDetail(org.id)
  }

  // =============================================
  // LOADING
  // =============================================
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5' }}>
      <div style={{ textAlign: 'center' }}><div className="dpo-spinner" /><p style={{ color: '#71717a', marginTop: 12, fontFamily: 'Heebo' }}>טוען...</p></div>
    </div>
  )

  // =============================================
  // RENDER
  // =============================================
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sb-logo">D</div>
          <button className={`sb-btn ${view === 'inbox' ? 'active' : ''}`} onClick={() => setView('inbox')} title="תיבת דואר">
            📥{pending.length > 0 && <span className="sb-badge">{pending.length}</span>}
          </button>
          <button className={`sb-btn ${view === 'orgs' ? 'active' : ''}`} onClick={() => setView('orgs')} title="ארגונים">🏢</button>
          <button className={`sb-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')} title="סטטיסטיקות">📊</button>
          <button className="sb-btn" onClick={loadDashboard} title="רענן">🔄</button>
          <div className="sb-spacer" />
          <div className="sb-time">
            <div className="sb-time-val">{monthlyH}h</div>
            <div className="sb-time-bar"><div className="sb-time-fill" style={{ width: `${quotaPct}%` }} /></div>
          </div>
          <button className="sb-btn" onClick={() => {
            sessionStorage.removeItem('dpo_session_token')
            sessionStorage.removeItem('dpo_session_expires')
            router.push('/dpo/login')
          }} title="יציאה">🚪</button>
        </div>

        {/* LIST PANE */}
        <div className="list-pane">
          {view === 'inbox' && (
            <>
              <div className="lp-top">
                <div className="lp-title">תיבת דואר</div>
                <input className="lp-search" placeholder="🔍 חיפוש..." value={listSearch} onChange={e => setListSearch(e.target.value)} />
              </div>
              <div className="lp-tabs">
                {(['all', 'pending', 'resolved'] as const).map(f => (
                  <button key={f} className={`lp-tab ${listFilter === f ? 'active' : ''}`} onClick={() => setListFilter(f)}>
                    {f === 'all' ? 'הכל' : f === 'pending' ? `ממתין (${pending.length})` : `הושלם (${resolved.length})`}
                  </button>
                ))}
              </div>
              <div className="lp-body">
                {filteredList.length === 0 && (
                  <div className="lp-empty">
                    <div style={{ fontSize: 32 }}>✅</div>
                    <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>אין פריטים</div>
                  </div>
                )}
                {filteredList.map(item => {
                  const cfg = TYPE_CFG[item.type] || TYPE_CFG.review
                  const isDone = item.status === 'resolved'
                  const parsed = item.ai_summary ? parseChat(item.ai_summary) : null
                  return (
                    <div key={item.id}
                      className={`li ${selectedId === item.id ? 'li-active' : ''} ${isDone ? 'li-done' : ''}`}
                      onClick={() => !isDone && selectItem(item)}>
                      <div className="li-dot" style={{ background: isDone ? 'var(--green)' : cfg.color }} />
                      <div className="li-body">
                        <div className="li-row">
                          <div className="li-title">{item.title}</div>
                          <div className="li-time">{timeAgo(item.created_at)}</div>
                        </div>
                        <div className="li-sub">
                          <span className="li-tag" style={{ background: isDone ? 'var(--green-s)' : cfg.bg, color: isDone ? 'var(--green)' : cfg.color }}>
                            {isDone ? '✓' : cfg.emoji}
                          </span>
                          {item.organizations?.name}
                          {parsed?.summary && ` · ${parsed.summary.substring(0, 40)}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {view === 'orgs' && (
            <>
              <div className="lp-top">
                <div className="lp-title">ארגונים ({organizations.length})</div>
                <input className="lp-search" placeholder="🔍 חיפוש ארגון..." value={orgSearch} onChange={e => setOrgSearch(e.target.value)} />
              </div>
              <div className="lp-body">
                {filteredOrgs.map(org => {
                  const score = org.compliance_score || 0
                  const sc = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'
                  const dc = org.pending_count > 0 ? 'var(--amber)' : 'var(--green)'
                  return (
                    <div key={org.id} className={`li ${selectedOrgId === org.id ? 'li-active' : ''}`} onClick={() => selectOrg(org)}>
                      <div className="li-dot" style={{ background: dc }} />
                      <div className="li-body">
                        <div className="li-row">
                          <div className="li-title">{org.name}</div>
                          <div className="li-score" style={{ color: sc }}>{score}</div>
                        </div>
                        <div className="li-sub">
                          {org.tier === 'extended' ? 'מורחבת' : 'בסיסית'}
                          {org.pending_count > 0 && ` · ${org.pending_count} ממתינים`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {view === 'stats' && (
            <>
              <div className="lp-top"><div className="lp-title">סטטיסטיקות</div></div>
              <div className="lp-body" style={{ padding: 16 }}>
                <div className="stat-card"><div className="stat-num" style={{ color: 'var(--blue)' }}>{stats?.organizations_count || 0}</div><div className="stat-lbl">ארגונים</div></div>
                <div className="stat-card"><div className="stat-num" style={{ color: 'var(--red)' }}>{pending.length}</div><div className="stat-lbl">ממתין לטיפול</div></div>
                <div className="stat-card"><div className="stat-num" style={{ color: 'var(--green)' }}>{stats?.total_resolved_this_month || 0}</div><div className="stat-lbl">טופלו החודש</div></div>
                <div className="stat-card"><div className="stat-num" style={{ color: 'var(--amber)' }}>{organizations.filter(o => (o.compliance_score || 0) < 70).length}</div><div className="stat-lbl">ציות נמוך</div></div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--blue)' }}>{monthlyH}h</div>
                  <div className="stat-lbl">שעון DPO ({quotaPct}% מהמכסה)</div>
                  <div className="stat-bar"><div className="stat-fill" style={{ width: `${quotaPct}%` }} /></div>
                </div>
                {stats?.avg_resolution_minutes ? (
                  <div className="stat-card"><div className="stat-num">{Math.round(stats.avg_resolution_minutes)}</div><div className="stat-lbl">דק׳ ממוצע לטיפול</div></div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* DETAIL PANE */}
        <div className="detail-pane">
          {/* No selection */}
          {!selectedItem && !selectedOrg && (
            <div className="dp-empty">
              <div style={{ fontSize: 48, marginBottom: 8 }}>{view === 'inbox' ? '📥' : '🏢'}</div>
              <div style={{ fontSize: 14, color: 'var(--sub)' }}>
                {view === 'inbox' ? 'בחר פריט מהרשימה' : 'בחר ארגון מהרשימה'}
              </div>
            </div>
          )}

          {/* QUEUE ITEM DETAIL */}
          {selectedItem && (
            <>
              <div className="dp-header">
                <div className="dp-tag" style={{ background: TYPE_CFG[selectedItem.type]?.bg, color: TYPE_CFG[selectedItem.type]?.color }}>
                  {TYPE_CFG[selectedItem.type]?.emoji} {TYPE_CFG[selectedItem.type]?.label}
                </div>
                <div className="dp-title">{selectedItem.title}</div>
                <div className="dp-meta">
                  {selectedItem.organizations?.name} · {timeAgo(selectedItem.created_at)}
                  {selectedItem.deadline_at && (() => {
                    const h = deadlineHours(selectedItem.deadline_at)
                    return h !== null ? <strong style={{ color: h < 24 ? 'var(--red)' : 'var(--amber)', marginRight: 8 }}> · דד-ליין: {h}h</strong> : null
                  })()}
                </div>
              </div>

              <div className="dp-body">
                {/* Org context chips */}
                {orgDetail && (
                  <div className="d-section">
                    <div className="d-title">פרטי ארגון</div>
                    <div className="ctx-chips">
                      <div className="ctx-chip">ציון: <strong>{orgDetail.organization?.compliance_score || 0}</strong></div>
                      <div className="ctx-chip">מסמכים: <strong>{orgDetail.documents?.length || 0}</strong></div>
                      <div className="ctx-chip">חבילה: <strong>{orgDetail.organization?.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</strong></div>
                      {orgDetail.onboarding_context?.industry && <div className="ctx-chip">תחום: <strong>{orgDetail.onboarding_context.industry}</strong></div>}
                      {orgDetail.onboarding_context?.employee_count && <div className="ctx-chip">עובדים: <strong>{orgDetail.onboarding_context.employee_count}</strong></div>}
                    </div>
                  </div>
                )}

                {/* Chat thread */}
                {itemContext?.messages?.length > 0 && (
                  <div className="d-section">
                    <div className="d-title">💬 שיחה</div>
                    <div className="bubbles">
                      {itemContext.messages.slice(-6).map((m: any, i: number) => (
                        <div key={i} className={`bubble ${m.role === 'user' ? 'b-user' : 'b-ai'}`}>
                          <div className="b-role">{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                          {(typeof m.content === 'string' ? m.content : '').slice(0, 250)}{m.content?.length > 250 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI summary — handle raw chat dumps */}
                {selectedItem.ai_summary && !itemContext?.messages?.length && (() => {
                  const p = parseChat(selectedItem.ai_summary)
                  if (p.isChat) return (
                    <div className="d-section">
                      <div className="d-title">💬 שיחה</div>
                      <div className="bubbles">
                        {p.msgs.map((m, i) => (
                          <div key={i} className={`bubble ${m.role === 'user' ? 'b-user' : 'b-ai'}`}>
                            <div className="b-role">{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                            {m.text.slice(0, 200)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                  return (
                    <div className="d-section">
                      <div className="ai-box">
                        <div className="ai-lbl">✦ ניתוח AI {selectedItem.ai_confidence ? `(${Math.round(selectedItem.ai_confidence * 100)}%)` : ''}</div>
                        <div className="ai-text">{p.summary}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* AI recommendation */}
                {selectedItem.ai_recommendation && (
                  <div className="d-section">
                    <div className="ai-box" style={{ borderRightColor: 'var(--green)' }}>
                      <div className="ai-lbl" style={{ color: 'var(--green)' }}>✦ המלצה</div>
                      <div className="ai-text">{selectedItem.ai_recommendation.slice(0, 300)}</div>
                    </div>
                  </div>
                )}

                {/* Incident detail — if type is incident */}
                {selectedItem.type === 'incident' && (() => {
                  const inc = incidents.find(i => i.org_id === selectedItem.org_id && i.status !== 'resolved')
                  if (!inc) return null
                  return (
                    <div className="d-section">
                      <div className="d-title">🚨 פרטי אירוע</div>
                      <div className="inc-banner" style={{
                        background: inc.hours_remaining <= 12 ? 'var(--red-s)' : inc.hours_remaining <= 36 ? 'var(--amber-s)' : 'var(--blue-s)',
                        borderColor: inc.hours_remaining <= 12 ? 'var(--red)' : inc.hours_remaining <= 36 ? 'var(--amber)' : 'var(--blue)'
                      }}>
                        <span className="inc-hours">{Math.max(0, inc.hours_remaining)}h</span>
                        <span>נותרו לדיווח</span>
                      </div>
                      <div className="inc-tabs">
                        {(['assessment', 'authority', 'individuals'] as const).map(t => (
                          <button key={t} className={`inc-tab ${incidentTab === t ? 'active' : ''}`} onClick={() => setIncidentTab(t)}>
                            {t === 'assessment' && '🔍 הערכה'}
                            {t === 'authority' && `🏛 רשות${inc.authority_notified_at ? ' ✓' : ''}`}
                            {t === 'individuals' && `👤 נפגעים${inc.individuals_notified_at ? ' ✓' : ''}`}
                          </button>
                        ))}
                      </div>
                      {incidentTab === 'assessment' && (
                        <>
                          <div className="ctx-chips" style={{ marginBottom: 8 }}>
                            <div className="ctx-chip">חומרה: <strong style={{ color: SEVERITY[inc.severity]?.color }}>{SEVERITY[inc.severity]?.label}</strong></div>
                            <div className="ctx-chip">רשומות: <strong>{inc.records_affected}</strong></div>
                            <div className="ctx-chip">נפגעים: <strong>{inc.individuals_affected}</strong></div>
                          </div>
                          {inc.ai_risk_assessment && <div className="ai-box"><div className="ai-lbl">✦ הערכת סיכון</div><div className="ai-text">{inc.ai_risk_assessment.slice(0, 300)}</div></div>}
                          {inc.ai_recommendations && <div className="ai-box" style={{ borderRightColor: 'var(--green)', marginTop: 6 }}><div className="ai-lbl" style={{ color: 'var(--green)' }}>✦ המלצות</div><div className="ai-text">{inc.ai_recommendations.slice(0, 300)}</div></div>}
                          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                            {inc.status === 'new' && <button className="btn btn-p" disabled={isSubmitting} onClick={() => updateIncidentStatus(inc, 'investigating')}>🔍 התחל חקירה</button>}
                            {inc.status === 'investigating' && <button className="btn btn-p" disabled={isSubmitting} onClick={() => updateIncidentStatus(inc, 'contained')}>🛡 נבלם</button>}
                            {['contained', 'investigating'].includes(inc.status) && <button className="btn btn-o" disabled={isSubmitting} onClick={() => updateIncidentStatus(inc, 'resolved')}>✓ סגור</button>}
                          </div>
                        </>
                      )}
                      {incidentTab === 'authority' && (
                        inc.authority_notified_at
                          ? <div className="success-box">✅ דווח לרשות ב-{new Date(inc.authority_notified_at).toLocaleDateString('he-IL')}</div>
                          : <>
                              <div className="draft-box"><div className="draft-lbl">טיוטת דיווח</div>{inc.ai_authority_draft || 'אין טיוטה'}</div>
                              <button className="btn btn-p" style={{ marginTop: 8 }} disabled={isSubmitting} onClick={() => notifyAuthority(inc)}>🏛 אשר ודווח</button>
                            </>
                      )}
                      {incidentTab === 'individuals' && (
                        inc.individuals_notified_at
                          ? <div className="success-box">✅ נשלחה הודעה ל-{inc.individuals_affected} נפגעים</div>
                          : inc.requires_individual_notification
                            ? <>
                                <div className="draft-box"><div className="draft-lbl">טיוטת הודעה ({inc.individuals_affected} נפגעים)</div>{inc.ai_individuals_draft || 'אין טיוטה'}</div>
                                <button className="btn btn-p" style={{ marginTop: 8 }} disabled={isSubmitting} onClick={() => notifyIndividuals(inc)}>👤 שלח הודעה</button>
                              </>
                            : <div className="success-box">לא נדרשת הודעה</div>
                      )}
                    </div>
                  )
                })()}

                {/* Draft response */}
                {selectedItem.status !== 'resolved' && selectedItem.type !== 'incident' && (
                  <div className="d-section">
                    <div className="d-title">✏️ תשובה ללקוח</div>
                    {isEditing ? (
                      <textarea className="edit-area" value={editedResponse} onChange={e => setEditedResponse(e.target.value)} rows={5} autoFocus />
                    ) : (
                      <div className="draft-box" onClick={() => { setIsEditing(true); setEditedResponse(selectedItem.ai_draft_response || '') }}>
                        <div className="draft-lbl">לחץ לערוך</div>
                        {selectedItem.ai_draft_response?.slice(0, 400) || 'אין טיוטה — לחץ לכתוב'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action bar */}
              {selectedItem.status !== 'resolved' && (
                <div className="dp-actions">
                  {isEditing ? (
                    <>
                      <button className="btn btn-p" disabled={resolving} onClick={() => resolveItem(selectedItem, 'edited')}>{resolving ? '...' : '✓ שלח ערוכה'}</button>
                      <button className="btn btn-o" onClick={() => setIsEditing(false)}>ביטול</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-p" disabled={resolving} onClick={() => resolveItem(selectedItem, 'approved_ai')}>
                        {resolving ? '...' : selectedItem.type === 'incident' ? '✓ אשר' : '✓ אשר ושלח'}
                      </button>
                      <button className="btn btn-o" onClick={() => setIsEditing(true)}>✏️ ערוך</button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ORG DETAIL */}
          {selectedOrg && orgDetail && (
            <>
              <div className="dp-header">
                <div className="dp-tag" style={{ background: 'var(--blue-s)', color: 'var(--blue)' }}>🏢 ארגון</div>
                <div className="dp-title">{selectedOrg.name}</div>
                <div className="dp-meta">{selectedOrg.tier === 'extended' ? 'מורחבת' : 'בסיסית'} · הצטרף {timeAgo(selectedOrg.created_at)}</div>
              </div>
              <div className="dp-body">
                <div className="d-section">
                  <div className="d-title">סקירה</div>
                  <div className="ctx-chips">
                    <div className="ctx-chip">ציון: <strong>{orgDetail.organization?.compliance_score || 0}</strong></div>
                    <div className="ctx-chip">מסמכים: <strong>{orgDetail.documents?.length || 0}</strong></div>
                    <div className="ctx-chip">שעות החודש: <strong>{Math.round(orgDetail.time_this_month_minutes || 0)} דק׳</strong></div>
                  </div>
                </div>
                {orgDetail.onboarding_context && Object.keys(orgDetail.onboarding_context).length > 0 && (
                  <div className="d-section">
                    <div className="d-title">פרופיל עסקי</div>
                    <div className="ctx-chips">
                      {orgDetail.onboarding_context.industry && <div className="ctx-chip">תחום: <strong>{orgDetail.onboarding_context.industry}</strong></div>}
                      {orgDetail.onboarding_context.employee_count && <div className="ctx-chip">עובדים: <strong>{orgDetail.onboarding_context.employee_count}</strong></div>}
                      {orgDetail.onboarding_context.customer_type && <div className="ctx-chip">לקוחות: <strong>{Array.isArray(orgDetail.onboarding_context.customer_type) ? orgDetail.onboarding_context.customer_type.join(', ') : ''}</strong></div>}
                      {orgDetail.onboarding_context.has_health_data !== undefined && <div className="ctx-chip">מידע רפואי: <strong>{orgDetail.onboarding_context.has_health_data ? 'כן' : 'לא'}</strong></div>}
                      {orgDetail.onboarding_context.works_with_minors !== undefined && <div className="ctx-chip">קטינים: <strong>{orgDetail.onboarding_context.works_with_minors ? 'כן' : 'לא'}</strong></div>}
                    </div>
                    {orgDetail.onboarding_context.software && (
                      <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 8 }}>תוכנות: {Array.isArray(orgDetail.onboarding_context.software) ? orgDetail.onboarding_context.software.join(', ') : ''}</div>
                    )}
                  </div>
                )}
                {orgDetail.documents?.length > 0 && (
                  <div className="d-section">
                    <div className="d-title">📄 מסמכים</div>
                    {orgDetail.documents.map((d: any) => (
                      <div key={d.id} className="doc-row"><span>{d.name || d.type}</span><span style={{ color: d.status === 'active' ? 'var(--green)' : 'var(--amber)', fontSize: 11, fontWeight: 600 }}>{d.status === 'active' ? 'פעיל' : d.status}</span></div>
                    ))}
                  </div>
                )}
                {orgDetail.queue_history?.length > 0 && (
                  <div className="d-section">
                    <div className="d-title">📋 היסטוריה</div>
                    {orgDetail.queue_history.slice(0, 8).map((q: any) => (
                      <div key={q.id} className="hist-row"><span>{q.title}</span><span>{q.status} · {timeAgo(q.created_at)}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {selectedOrg && !orgDetail && (
            <div className="dp-empty"><div className="dpo-spinner" /><p style={{ marginTop: 12, color: 'var(--sub)' }}>טוען...</p></div>
          )}
        </div>
      </div>
    </>
  )
}

// =============================================
// STYLES
// =============================================
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#f4f4f5;--white:#fff;--text:#18181b;--sub:#71717a;--muted:#a1a1aa;--border:#e4e4e7;--blue:#4f46e5;--blue-s:#eef2ff;--red:#ef4444;--red-s:#fef2f2;--amber:#f59e0b;--amber-s:#fffbeb;--green:#22c55e;--green-s:#f0fdf4;--purple:#8b5cf6;--purple-s:#f5f3ff;--surface:#fafafa}
body{font-family:'Heebo',-apple-system,sans-serif;background:var(--bg);color:var(--text);overflow:hidden}

.app{display:flex;height:100vh}

/* Sidebar */
.sidebar{width:56px;background:var(--text);display:flex;flex-direction:column;align-items:center;padding:10px 0;gap:4px;flex-shrink:0}
.sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#818cf8,var(--blue));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;margin-bottom:14px}
.sb-btn{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;transition:all .15s;position:relative;color:#a1a1aa;border:none;background:none}
.sb-btn:hover{background:rgba(255,255,255,.1);color:#fff}
.sb-btn.active{background:rgba(255,255,255,.15);color:#fff}
.sb-badge{position:absolute;top:3px;left:3px;min-width:16px;height:16px;background:var(--red);color:#fff;font-size:9px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Heebo'}
.sb-spacer{flex:1}
.sb-time{text-align:center;margin:8px 0;padding:0 4px}
.sb-time-val{font-size:11px;color:#a1a1aa;font-weight:700;font-family:'Heebo'}
.sb-time-bar{width:32px;height:3px;border-radius:2px;background:rgba(255,255,255,.15);margin-top:3px}
.sb-time-fill{height:100%;border-radius:2px;background:#818cf8}

/* List Pane */
.list-pane{width:340px;background:var(--white);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.lp-top{padding:14px 16px;border-bottom:1px solid var(--border)}
.lp-title{font-size:15px;font-weight:700;margin-bottom:8px}
.lp-search{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-family:inherit;background:var(--surface);transition:border-color .15s}
.lp-search:focus{outline:none;border-color:var(--blue)}
.lp-tabs{display:flex;gap:2px;padding:6px 16px;border-bottom:1px solid var(--border)}
.lp-tab{padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--sub);font-family:inherit;transition:all .15s}
.lp-tab:hover{background:var(--surface)}
.lp-tab.active{background:var(--blue);color:#fff}
.lp-body{flex:1;overflow-y:auto}
.lp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:4px}

/* List items */
.li{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s}
.li:hover{background:var(--surface)}
.li-active{background:var(--blue-s)!important;border-right:3px solid var(--blue)}
.li-done{opacity:.5}
.li-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:7px}
.li-body{flex:1;min-width:0}
.li-row{display:flex;justify-content:space-between;align-items:center}
.li-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.li-time{font-size:10px;color:var(--muted);flex-shrink:0;margin-right:8px}
.li-score{font-size:13px;font-weight:800;flex-shrink:0;margin-right:4px}
.li-sub{font-size:11px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-tag{font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;margin-left:4px}

/* Detail Pane */
.detail-pane{flex:1;display:flex;flex-direction:column;overflow:hidden}
.dp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--sub)}
.dp-header{padding:20px 32px;border-bottom:1px solid var(--border);background:var(--white)}
.dp-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 12px;border-radius:6px;margin-bottom:8px}
.dp-title{font-size:20px;font-weight:800;margin-bottom:3px}
.dp-meta{font-size:13px;color:var(--sub)}
.dp-body{flex:1;overflow-y:auto;padding:20px 32px;background:var(--surface)}
.dp-actions{padding:14px 32px;background:var(--white);border-top:1px solid var(--border);display:flex;gap:8px}

/* Sections */
.d-section{margin-bottom:18px}
.d-title{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}

/* Context chips */
.ctx-chips{display:flex;flex-wrap:wrap;gap:6px}
.ctx-chip{display:flex;align-items:center;gap:4px;padding:5px 12px;border-radius:8px;background:var(--white);border:1px solid var(--border);font-size:12px}

/* Chat bubbles */
.bubbles{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto}
.bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;max-width:80%}
.b-user{background:var(--blue-s);align-self:flex-end;border-bottom-left-radius:4px}
.b-ai{background:var(--white);border:1px solid var(--border);align-self:flex-start;border-bottom-right-radius:4px}
.b-role{font-size:10px;font-weight:700;color:var(--sub);margin-bottom:2px}

/* AI box */
.ai-box{padding:12px 16px;border-radius:10px;background:var(--blue-s);border-right:3px solid var(--blue)}
.ai-lbl{font-size:9px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.ai-text{font-size:13px;line-height:1.6}

/* Draft */
.draft-box{padding:14px;border:1.5px dashed var(--border);border-radius:10px;font-size:13px;line-height:1.6;cursor:pointer;transition:border-color .2s;background:var(--white)}
.draft-box:hover{border-color:var(--blue)}
.draft-lbl{font-size:10px;font-weight:700;color:var(--blue);margin-bottom:4px}
.edit-area{width:100%;min-height:100px;padding:12px;border:1.5px solid var(--blue);border-radius:10px;font-family:inherit;font-size:13px;line-height:1.6;resize:vertical;direction:rtl;background:var(--white)}
.edit-area:focus{outline:none}

/* Buttons */
.btn{padding:9px 22px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;transition:all .15s}
.btn-p{background:var(--blue);color:#fff}.btn-p:hover{background:#4338ca}
.btn-p:disabled{opacity:.6;cursor:not-allowed}
.btn-o{background:var(--surface);color:var(--text);border:1px solid var(--border)}.btn-o:hover{background:var(--bg)}

/* Incident */
.inc-banner{padding:12px 16px;border-radius:10px;border:2px solid;display:flex;align-items:center;gap:10px;margin-bottom:10px}
.inc-hours{font-size:24px;font-weight:900}
.inc-tabs{display:flex;gap:4px;margin-bottom:12px}
.inc-tab{padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--white);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
.inc-tab:hover{border-color:var(--blue)}
.inc-tab.active{background:var(--blue);color:#fff;border-color:var(--blue)}

/* Success box */
.success-box{padding:14px;border-radius:10px;background:var(--green-s);color:var(--green);font-size:13px;font-weight:600;text-align:center}

/* Doc/History rows */
.doc-row{display:flex;justify-content:space-between;padding:8px 12px;border-radius:6px;font-size:12px;background:var(--white);margin-bottom:3px;border:1px solid var(--border)}
.hist-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px}
.hist-row:last-child{border-bottom:none}
.hist-row span:last-child{color:var(--sub);font-size:11px}

/* Stats */
.stat-card{padding:16px;border-radius:10px;background:var(--white);border:1px solid var(--border);margin-bottom:8px;text-align:center}
.stat-num{font-size:28px;font-weight:900;line-height:1}
.stat-lbl{font-size:11px;color:var(--sub);margin-top:3px}
.stat-bar{height:6px;border-radius:3px;background:var(--border);margin-top:8px}
.stat-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--blue),#818cf8)}

/* Spinner */
.dpo-spinner{width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}

/* Mobile */
@media(max-width:768px){
  .sidebar{width:48px}
  .list-pane{width:100%;position:absolute;z-index:5;left:48px;right:0}
  .detail-pane{display:none}
}
`
