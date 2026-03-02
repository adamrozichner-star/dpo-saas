'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

// =============================================
// CONFIG
// =============================================
const DPO_NAME = 'עו"ד דנה כהן'

// =============================================
// TYPES
// =============================================
interface QueueItem {
  id: string; org_id: string; type: string; priority: string; status: string
  title: string; description: string; ai_summary: string | null
  ai_recommendation: string | null; ai_draft_response: string | null
  ai_confidence: number | null; created_at: string; resolved_at: string | null
  deadline_at: string | null; organizations: { id: string; name: string }
}

interface OrgDoc {
  id: string; title: string; type: string; status: string
  content: string; created_at: string
}

// =============================================
// HELPERS
// =============================================
const TYPE_MAP: Record<string, { label: string; emoji: string; accent: string }> = {
  incident: { label: 'אירוע אבטחה', emoji: '🚨', accent: '#ef4444' },
  escalation: { label: 'שאלה מסולמת', emoji: '💬', accent: '#f59e0b' },
  review: { label: 'סקירת מסמכים', emoji: '📄', accent: '#4f46e5' },
  dsr: { label: 'בקשת מידע', emoji: '📋', accent: '#8b5cf6' },
  onboarding: { label: 'אונבורדינג', emoji: '🏢', accent: '#22c55e' },
  document_expiry: { label: 'פג תוקף', emoji: '⏰', accent: '#f59e0b' },
}

const DOC_LABELS: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות', security_policy: 'נוהל אבטחת מידע',
  dpo_appointment: 'כתב מינוי DPO', database_registration: 'רישום מאגרי מידע',
  ropa: 'מפת עיבוד (ROPA)', consent_form: 'טופס הסכמה',
  procedure: 'נוהל', custom: 'מסמך מותאם'
}

const PROFILE_LABELS: Record<string, string> = {
  business_name: 'שם העסק', business_id: 'ח.פ / עוסק מורשה', business_type: 'תחום פעילות',
  employee_count: 'עובדים', data_types: 'סוגי מידע', data_sources: 'מקורות מידע',
  processing_purposes: 'שימוש במידע', third_party_sharing: 'שיתוף חיצוני',
  international_transfer: 'העברה בינלאומית', cloud_storage: 'שירותי ענן',
  security_measures: 'אמצעי אבטחה', previous_incidents: 'אירועים בעבר',
  existing_policy: 'מדיניות קיימת', database_registered: 'רישום מאגרים',
  has_cameras: 'מצלמות', processes_minors: 'קטינים', website_leads: 'לידים באתר',
  suppliers_count: 'ספקים', cv_retention: 'קורות חיים'
}

const REMINDERS = [
  { id: 'annual-review', emoji: '📅', title: 'סקירה שנתית — עדכון מסמכים', freq: 'פעם בשנה' },
  { id: 'employee-training', emoji: '🎓', title: 'הדרכת עובדים — פרטיות ואבטחה', freq: 'פעם בשנה' },
  { id: 'supplier-review', emoji: '🔗', title: 'בדיקת ספקים ומעבדי מידע', freq: 'פעם ב-6 חודשים' },
  { id: 'database-registration', emoji: '🗄️', title: 'עדכון רישום מאגרי מידע', freq: 'בעת שינוי' },
  { id: 'data-retention', emoji: '🗑️', title: 'מחיקת מידע עודף', freq: 'פעם ברבעון' },
  { id: 'privacy-policy-website', emoji: '🌐', title: 'בדיקת מדיניות פרטיות באתר', freq: 'פעם ברבעון' },
  { id: 'incident-drill', emoji: '🚨', title: 'תרגיל אירוע אבטחה', freq: 'פעם בשנה' },
  { id: 'consent-audit', emoji: '✅', title: 'בדיקת תקינות הסכמות', freq: 'פעם ברבעון' },
]

const GUIDELINES = [
  { emoji: '📋', title: 'פרסום מדיניות פרטיות באתר', desc: 'ודאו שהמדיניות נגישה בפוטר של כל עמוד' },
  { emoji: '✍️', title: 'חתימה על כתב מינוי DPO', desc: 'מסמך רשמי שחייב להיות חתום ע"י מנכ"ל' },
  { emoji: '📢', title: 'הפצת נוהל אבטחה לעובדים', desc: 'כל עובד חייב לקבל ולחתום על הנוהל' },
  { emoji: '🗄️', title: 'רישום מאגרי מידע', desc: 'דיווח לרשם מאגרי המידע על כל מאגר פעיל' },
  { emoji: '📊', title: 'עדכון מפת עיבוד (ROPA)', desc: 'תיעוד של כל פעילות עיבוד נתונים בארגון' },
]

function timeAgo(d: string): string {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'עכשיו'
  if (m < 60) return `לפני ${m} דק׳`
  const h = Math.floor(m / 60)
  if (h < 24) return `לפני ${h} שע׳`
  const days = Math.floor(h / 24)
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

function parseChat(text: string): { isChat: boolean; msgs: { role: string; text: string }[] } {
  if (!text || !text.includes('assistant:') || !text.includes('user:')) return { isChat: false, msgs: [] }
  const msgs = text.split('\n').filter(l => l.trim()).map(l => {
    if (l.startsWith('user:')) return { role: 'user', text: l.replace('user:', '').trim() }
    if (l.startsWith('assistant:')) return { role: 'assistant', text: l.replace('assistant:', '').trim() }
    return null
  }).filter(Boolean) as { role: string; text: string }[]
  return { isChat: true, msgs: msgs.slice(-4) }
}

// =============================================
// COMPONENT
// =============================================
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [orgs, setOrgs] = useState<any[]>([])

  // Expand / detail
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [loadingCtx, setLoadingCtx] = useState(false)

  // Doc review
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [regenId, setRegenId] = useState<string | null>(null)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [docBusy, setDocBusy] = useState(false)

  // Resolve
  const [resolving, setResolving] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [editingResp, setEditingResp] = useState(false)

  // View
  const [tab, setTab] = useState<'inbox' | 'orgs'>('inbox')
  const [orgSearch, setOrgSearch] = useState('')
  const [showAllPending, setShowAllPending] = useState(false)
  const [showAllResolved, setShowAllResolved] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [orgTab, setOrgTab] = useState<'overview'|'docs'|'rights'|'incidents'|'ropa'|'messages'|'reminders'|'guidelines'|'activity'|'profile'>('overview')
  const [composeMsg, setComposeMsg] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeSent, setComposeSent] = useState(false)

  // NEW: collapsible sections
  const [pendingCollapsed, setPendingCollapsed] = useState(false)
  const [resolvedCollapsed, setResolvedCollapsed] = useState(false)

  // NEW: full-screen org modal
  const [modalFullScreen, setModalFullScreen] = useState(false)

  // NEW: type filter for inbox
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // NEW: org pagination
  const [orgPage, setOrgPage] = useState(0)
  const ORGS_PER_PAGE = 50

  // NEW: org modal doc editing
  const [modalEditDoc, setModalEditDoc] = useState<string | null>(null)
  const [modalEditContent, setModalEditContent] = useState('')
  const [modalDocBusy, setModalDocBusy] = useState(false)
  const [expandedDocType, setExpandedDocType] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // =============================================
  // AUTH & FETCH
  // =============================================
  const dpoFetch = async (url: string, opts: RequestInit = {}) => {
    const token = sessionStorage.getItem('dpo_session_token')
    const h = new Headers(opts.headers)
    if (token) h.set('x-dpo-token', token)
    if (opts.body && !h.has('Content-Type')) h.set('Content-Type', 'application/json')
    return fetch(url, { ...opts, headers: h })
  }

  useEffect(() => {
    const t = sessionStorage.getItem('dpo_session_token')
    const e = sessionStorage.getItem('dpo_session_expires')
    if (!t || !e || new Date(e) < new Date()) { router.push('/dpo/login'); return }
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sR, pR, ipR, rR, oR] = await Promise.all([
        dpoFetch('/api/dpo?action=stats'),
        dpoFetch('/api/dpo?action=queue&status=pending'),
        dpoFetch('/api/dpo?action=queue&status=in_progress'),
        dpoFetch('/api/dpo?action=queue&status=resolved&limit=25'),
        dpoFetch('/api/dpo?action=organizations'),
      ])
      const [sD, pD, ipD, rD, oD] = await Promise.all([sR.json(), pR.json(), ipR.json(), rR.json(), oR.json()])
      setStats(sD)
      setQueue([...(pD.items || []), ...(ipD.items || []), ...(rD.items || [])])
      setOrgs(oD.organizations || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadCtx = async (id: string) => {
    setLoadingCtx(true); setItemContext(null)
    try {
      const r = await dpoFetch(`/api/dpo?action=queue_item&id=${id}`)
      setItemContext(await r.json())
    } catch (e) { console.error(e) }
    setLoadingCtx(false)
  }

  const loadOrgDetail = async (orgId: string) => {
    try {
      const r = await dpoFetch(`/api/dpo?action=org_detail&org_id=${orgId}`)
      setSelectedOrg(await r.json())
      setOrgTab('overview')
      setComposeMsg(''); setComposeSent(false)
      setModalEditDoc(null)
      setModalFullScreen(false)
    } catch {}
  }

  const sendDpoMessage = async (orgId: string, orgName: string) => {
    if (!composeMsg.trim()) return
    setComposeSending(true)
    try {
      await dpoFetch('/api/messages', { 
        method: 'POST', 
        body: JSON.stringify({ 
          action: 'create_thread', orgId, 
          subject: `הודעה מהממונה — ${DPO_NAME}`, 
          content: composeMsg, senderType: 'dpo', senderName: DPO_NAME 
        }) 
      })
      setComposeSent(true)
      setComposeMsg('')
      setTimeout(() => setComposeSent(false), 4000)
    } catch { toast('שגיאה בשליחה', 'error') }
    setComposeSending(false)
  }

  // =============================================
  // ACTIONS
  // =============================================
  const resolveItem = async (item: QueueItem, type: 'approved_ai' | 'edited') => {
    setResolving(true)
    try {
      const r = await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'resolve', itemId: item.id, resolutionType: type, response: editedResponse, timeSpentSeconds: 60, sendEmail: true }) })
      const d = await r.json()
      if (d.success) { toast(d.email_sent ? '✅ טופל ונשלח במייל' : '✅ טופל'); setExpandedItem(null); loadAll() }
      else toast(d.error || 'שגיאה', 'error')
    } catch { toast('שגיאה', 'error') }
    setResolving(false)
  }

  const approveDoc = async (docId: string) => {
    setDocBusy(true)
    try { await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: docId }) }); toast('✅ אושר'); if (expandedItem) loadCtx(expandedItem); loadAll() }
    catch { toast('שגיאה', 'error') }
    setDocBusy(false)
  }

  const editDoc = async (docId: string) => {
    setDocBusy(true)
    try { await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'edit_document', documentId: docId, content: editContent }) }); toast('✅ עודכן ואושר'); setEditingDoc(null); if (expandedItem) loadCtx(expandedItem); loadAll() }
    catch { toast('שגיאה', 'error') }
    setDocBusy(false)
  }

  const regenDoc = async (docId: string) => {
    setDocBusy(true)
    try { const r = await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'regenerate_document', documentId: docId, feedback: regenFeedback }) }); if ((await r.json()).success) { toast('✅ נוצר מחדש'); setRegenId(null); setRegenFeedback(''); if (expandedItem) loadCtx(expandedItem) } }
    catch { toast('שגיאה', 'error') }
    setDocBusy(false)
  }

  const approveAllDocs = async (docs: OrgDoc[]) => {
    setDocBusy(true)
    for (const d of docs.filter(d => d.status !== 'active')) {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: d.id }) })
    }
    toast('✅ כל המסמכים אושרו')
    if (expandedItem) loadCtx(expandedItem)
    // Reload queue — API auto-resolves review items when all docs active
    loadAll()
    setDocBusy(false)
  }

  // Modal doc edit + approve
  const modalEditSave = async (docId: string) => {
    setModalDocBusy(true)
    try { 
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'edit_document', documentId: docId, content: modalEditContent }) })
      toast('✅ עודכן ואושר')
      setModalEditDoc(null)
      loadOrgDetail(selectedOrg?.organization?.id)
    }
    catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalApproveDoc = async (docId: string) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: docId }) })
      toast('✅ אושר')
      loadOrgDetail(selectedOrg?.organization?.id)
    }
    catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalDeleteDoc = async (docId: string) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'delete_document', documentId: docId }) })
      toast('🗑️ נמחק')
      setConfirmDeleteId(null)
      loadOrgDetail(selectedOrg?.organization?.id)
    }
    catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalFinalizeDoc = async (docId: string, version: number) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'finalize_document', documentId: docId, version }) })
      toast('✅ סומן כגרסה סופית')
      loadOrgDetail(selectedOrg?.organization?.id)
    }
    catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  // =============================================
  // DERIVED
  // =============================================
  const allPending = queue.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const pending = typeFilter === 'all' ? allPending : allPending.filter(i => i.type === typeFilter)
  const resolved = queue.filter(i => i.status === 'resolved').sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
  const resolvedCount = stats?.resolved_this_month || stats?.total_resolved_this_month || 0

  // Org pagination
  const filteredOrgs = orgs.filter(o => !orgSearch || o.name?.toLowerCase().includes(orgSearch.toLowerCase()))
  const pagedOrgs = filteredOrgs.slice(0, (orgPage + 1) * ORGS_PER_PAGE)
  const hasMoreOrgs = pagedOrgs.length < filteredOrgs.length

  // =============================================
  // RENDER HELPERS
  // =============================================
  const renderDocReview = (docs: OrgDoc[]) => {
    const pendingDocs = docs.filter(d => d.status === 'pending_review')
    if (docs.length === 0) return <div className="dpo-warn">⚠️ לא נמצאו מסמכים</div>
    return (
      <>
        <div className="dpo-doc-header">
          <span className="dpo-sub">📄 מסמכים ({pendingDocs.length} ממתינים)</span>
          {pendingDocs.length > 1 && <button className="dpo-btn-sm dpo-btn-green" disabled={docBusy} onClick={() => approveAllDocs(docs)}>✓ אשר הכל</button>}
        </div>
        {docs.map(doc => (
          <div key={doc.id} className="dpo-doc">
            <div className="dpo-doc-top">
              <div className="dpo-doc-info">
                <span className="dpo-doc-name">{doc.title || DOC_LABELS[doc.type] || doc.type}</span>
                <span className={`dpo-doc-badge ${doc.status === 'active' ? 'active' : 'pending'}`}>
                  {doc.status === 'active' ? '✓ אושר' : doc.status === 'draft' ? '📝 טיוטה' : '⏳ ממתין'}
                </span>
              </div>
              {doc.status !== 'active' && (
                <div className="dpo-doc-actions">
                  <button className="dpo-btn-sm dpo-btn-green" disabled={docBusy} onClick={() => approveDoc(doc.id)}>✓ אשר</button>
                  <button className="dpo-btn-sm" onClick={() => { setEditingDoc(doc.id); setEditContent(doc.content || ''); setExpandedDoc(doc.id) }}>✏️ ערוך</button>
                  <button className="dpo-btn-sm" onClick={() => { setRegenId(regenId === doc.id ? null : doc.id); setRegenFeedback('') }} title="צור מחדש">🔄</button>
                </div>
              )}
            </div>

            {regenId === doc.id && (
              <div className="dpo-regen">
                <textarea className="dpo-regen-input" placeholder="הערות ליצירה מחדש..." value={regenFeedback} onChange={e => setRegenFeedback(e.target.value)} rows={2} />
                <div className="dpo-regen-btns">
                  <button className="dpo-btn-primary" disabled={docBusy || !regenFeedback.trim()} onClick={() => regenDoc(doc.id)}>{docBusy ? '...' : '🔄 צור מחדש'}</button>
                  <button className="dpo-btn-sm" onClick={() => setRegenId(null)}>ביטול</button>
                </div>
              </div>
            )}

            {expandedDoc === doc.id ? (
              <div className="dpo-doc-expanded">
                {editingDoc === doc.id ? (
                  <>
                    <textarea className="dpo-doc-editor" value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} />
                    <div className="dpo-doc-edit-btns">
                      <button className="dpo-btn-primary" disabled={docBusy} onClick={() => editDoc(doc.id)}>{docBusy ? '...' : '💾 שמור ואשר'}</button>
                      <button className="dpo-btn-sm" onClick={() => { setEditingDoc(null); setExpandedDoc(null) }}>ביטול</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dpo-doc-text">{doc.content}</div>
                    <button className="dpo-btn-sm" style={{ marginTop: 8 }} onClick={() => setExpandedDoc(null)}>סגור ▲</button>
                  </>
                )}
              </div>
            ) : (
              <div className="dpo-doc-preview" onClick={() => { setExpandedDoc(doc.id); setEditingDoc(null) }}>
                {(doc.content || '').slice(0, 120)}... <span className="dpo-link">קרא עוד ▼</span>
              </div>
            )}
          </div>
        ))}
      </>
    )
  }

  // =============================================
  // LOADING
  // =============================================
  if (loading) return (
    <div className="dpo-loading"><div className="dpo-spinner" /><p>טוען...</p></div>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="dpo-page" dir="rtl">
        {/* NAV */}
        <nav className="dpo-nav">
          <div className="dpo-nav-right">
            <span className="dpo-logo">MyDPO</span>
            <span className="dpo-nav-sep">|</span>
            <span className="dpo-nav-name">{DPO_NAME}</span>
          </div>
          <div className="dpo-nav-left">
            <button className={tab === 'inbox' ? 'dpo-tab active' : 'dpo-tab'} onClick={() => setTab('inbox')}>
              תיבת דואר {allPending.length > 0 && <span className="dpo-badge">{allPending.length}</span>}
            </button>
            <button className={tab === 'orgs' ? 'dpo-tab active' : 'dpo-tab'} onClick={() => setTab('orgs')}>
              ארגונים ({orgs.length})
            </button>

            {/* Type filter — only in inbox view */}
            {tab === 'inbox' && (
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)}
                className="dpo-filter-select"
              >
                <option value="all">הכל</option>
                {Object.entries(TYPE_MAP).map(([key, { emoji, label }]) => (
                  <option key={key} value={key}>{emoji} {label}</option>
                ))}
              </select>
            )}

            {/* Refresh button — redesigned */}
            <button 
              className="dpo-refresh-btn" 
              onClick={loadAll}
              title="רענן נתונים"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>

            <button className="dpo-logout" onClick={() => { sessionStorage.removeItem('dpo_session_token'); sessionStorage.removeItem('dpo_session_expires'); router.push('/dpo/login') }}>יציאה</button>
          </div>
        </nav>

        <main className="dpo-main">
          {tab === 'inbox' && (
            <div className="dpo-master">
              {/* LEFT: Compact Item List */}
              <div className="dpo-list-panel">
                {/* KPIs inline */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e4e4e7' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderLeft: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#4f46e5' }}>{orgs.length}</div>
                    <div style={{ fontSize: 10, color: '#a1a1aa' }}>ארגונים</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderLeft: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{allPending.length}</div>
                    <div style={{ fontSize: 10, color: '#a1a1aa' }}>ממתין</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '10px 4px' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{resolvedCount}</div>
                    <div style={{ fontSize: 10, color: '#a1a1aa' }}>טופלו</div>
                  </div>
                </div>

                {/* Pending items */}
                {pending.length > 0 && (
                  <>
                    <div className="dpo-list-header"><h3>🔴 דורש טיפול ({pending.length})</h3></div>
                    {pending.map(item => {
                      const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌', accent: '#71717a' }
                      return (
                        <div key={item.id} className={`dpo-list-item ${expandedItem === item.id ? 'active' : ''}`}
                          onClick={() => { setExpandedItem(item.id); setEditedResponse(item.ai_draft_response || ''); setEditingResp(false); loadCtx(item.id) }}>
                          <div className="dpo-list-dot" style={{ background: cfg.accent }} />
                          <div className="dpo-list-body">
                            <div className="dpo-list-title">{item.title}</div>
                            <div className="dpo-list-meta">
                              <span className="dpo-list-tag" style={{ background: cfg.accent + '18', color: cfg.accent }}>{cfg.emoji} {cfg.label}</span>
                              <span>{item.organizations?.name}</span>
                              <span>{timeAgo(item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Resolved items */}
                {resolved.length > 0 && (
                  <>
                    <div className="dpo-list-header" style={{ marginTop: 4 }}>
                      <h3 style={{ cursor: 'pointer' }} onClick={() => setResolvedCollapsed(!resolvedCollapsed)}>
                        ✅ הושלם ({resolved.length}) {resolvedCollapsed ? '▶' : '▼'}
                      </h3>
                    </div>
                    {!resolvedCollapsed && (showAllResolved ? resolved : resolved.slice(0, 15)).map(item => {
                      const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌', accent: '#71717a' }
                      return (
                        <div key={item.id} className={`dpo-list-item resolved ${expandedItem === `done-${item.id}` ? 'active' : ''}`}
                          onClick={() => { setExpandedItem(`done-${item.id}`); loadCtx(item.id) }}>
                          <div className="dpo-list-dot" style={{ background: '#22c55e' }} />
                          <div className="dpo-list-body">
                            <div className="dpo-list-title" style={{ fontSize: 12 }}>{item.title}</div>
                            <div className="dpo-list-meta">
                              <span style={{ color: '#22c55e', fontSize: 10 }}>✓</span>
                              <span>{item.organizations?.name}</span>
                              <span>{timeAgo(item.resolved_at || item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {!resolvedCollapsed && !showAllResolved && resolved.length > 15 && (
                      <button className="dpo-show-more" onClick={() => setShowAllResolved(true)}>
                        הצג עוד {resolved.length - 15}
                      </button>
                    )}
                  </>
                )}

                {allPending.length === 0 && resolved.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#a1a1aa' }}>
                    <div style={{ fontSize: 32 }}>✅</div>
                    <div style={{ fontWeight: 600, marginTop: 8 }}>אין פריטים</div>
                  </div>
                )}
              </div>

              {/* RIGHT: Detail Panel */}
              <div className="dpo-detail-panel">
                {!expandedItem ? (
                  /* No selection — show overview */
                  <div className="dpo-detail-empty">
                    <div className="dpo-detail-empty-icon">📋</div>
                    <div className="dpo-detail-empty-title">
                      {allPending.length > 0 ? `${allPending.length} פריטים ממתינים לטיפול` : 'הכל מטופל ✅'}
                    </div>
                    <div className="dpo-detail-empty-sub">בחר פריט מהרשימה לצפייה ופעולה</div>
                    {/* New orgs summary */}
                    {orgs.filter(o => {
                      const d = new Date(o.created_at)
                      const week = new Date(); week.setDate(week.getDate() - 7)
                      return d > week
                    }).length > 0 && (
                      <div style={{ marginTop: 24, padding: '16px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e4e4e7', textAlign: 'right', width: '100%', maxWidth: 420 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 8 }}>🆕 ארגונים חדשים השבוע</div>
                        {orgs.filter(o => {
                          const d = new Date(o.created_at)
                          const week = new Date(); week.setDate(week.getDate() - 7)
                          return d > week
                        }).slice(0, 5).map(o => (
                          <div key={o.id} style={{ padding: '6px 0', borderBottom: '1px solid #f4f4f5', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 500 }}>{o.name}</span>
                            <span style={{ color: '#a1a1aa', fontSize: 11 }}>{o.pending_count > 0 ? o.pending_count + ' ממתינים' : '✓ תקין'} · {o.compliance_score || 0}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (() => {
                  /* Find selected item */
                  const isDone = expandedItem.startsWith('done-')
                  const itemId = isDone ? expandedItem.replace('done-', '') : expandedItem
                  const item = [...pending, ...resolved].find(i => i.id === itemId)
                  if (!item) return <div className="dpo-detail-empty"><div className="dpo-detail-empty-icon">❌</div><div className="dpo-detail-empty-title">פריט לא נמצא</div></div>
                  const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌', accent: '#71717a' }

                  return (
                    <>
                      {/* Detail header */}
                      <div className="dpo-detail-header">
                        <div>
                          <div className="dpo-detail-title">{item.title}</div>
                          <div className="dpo-detail-org">
                            <span style={{ color: cfg.accent, fontWeight: 600 }}>{cfg.emoji} {cfg.label}</span>
                            {' · '}
                            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setTab('orgs'); loadOrgDetail(item.org_id) }}>{item.organizations?.name}</span>
                            {' · '}{timeAgo(item.created_at)}
                            {isDone && <span style={{ color: '#22c55e', fontWeight: 600, marginRight: 8 }}>✓ הושלם</span>}
                          </div>
                        </div>
                        <button style={{ padding: '4px 10px', border: '1px solid #e4e4e7', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                          onClick={() => setExpandedItem(null)}>✕ סגור</button>
                      </div>

                      {/* Detail body */}
                      {loadingCtx ? <div className="dpo-spinner" style={{ margin: '40px auto' }} /> : (
                        <div style={{ maxWidth: 700 }}>
                          {itemContext && (
                            <div className="dpo-chips">
                              <span className="dpo-chip">ציון: {itemContext.item?.organizations?.compliance_score || '—'}</span>
                              <span className="dpo-chip">מסמכים: {itemContext.documents?.length || 0}</span>
                              <span className="dpo-chip">🏢 {item.organizations?.name}</span>
                            </div>
                          )}

                          {/* Chat messages */}
                          {itemContext?.messages?.length > 0 && (
                            <div className="dpo-bubbles">
                              <span className="dpo-sub">💬 שיחה</span>
                              {itemContext.messages.slice(-4).map((m: any, i: number) => (
                                <div key={i} className={`dpo-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
                                  <div className="dpo-bubble-role">{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                  {(m.content || '').slice(0, 200)}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* AI summary fallback */}
                          {item.ai_summary && !itemContext?.messages?.length && (() => {
                            const p = parseChat(item.ai_summary)
                            if (p.isChat) return (
                              <div className="dpo-bubbles">
                                <span className="dpo-sub">💬 שיחה</span>
                                {p.msgs.map((m, i) => (
                                  <div key={i} className={`dpo-bubble ${m.role === 'user' ? 'user' : 'ai'}`}><div className="dpo-bubble-role">{m.role === 'user' ? '👤' : '🤖'}</div>{m.text.slice(0, 200)}</div>
                                ))}
                              </div>
                            )
                            return <div className="dpo-ai-box"><span className="dpo-ai-label">✦ ניתוח AI</span>{item.ai_summary.slice(0, 300)}</div>
                          })()}

                          {/* Doc review */}
                          {item.type === 'review' && renderDocReview(itemContext?.documents || [])}

                          {/* Response editor (for non-review, non-resolved) */}
                          {!isDone && item.type !== 'review' && (
                            <div style={{ marginTop: 14 }}>
                              <span className="dpo-sub">✏️ תשובה</span>
                              {editingResp ? (
                                <textarea className="dpo-textarea" value={editedResponse} onChange={e => setEditedResponse(e.target.value)} rows={4} autoFocus />
                              ) : (
                                <div className="dpo-draft" onClick={() => setEditingResp(true)}>
                                  {item.ai_draft_response?.slice(0, 300) || 'לחץ לכתוב תשובה...'}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Resolved item: show sent response */}
                          {isDone && item.ai_draft_response && (
                            <div style={{ marginTop: 12 }}>
                              <span className="dpo-sub">📝 תשובת הממונה</span>
                              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRight: '3px solid #22c55e', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>{item.ai_draft_response}</div>
                            </div>
                          )}

                          {/* Resolved item: doc list */}
                          {isDone && itemContext?.documents?.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <span className="dpo-sub">📄 מסמכים ({itemContext.documents.length})</span>
                              {itemContext.documents.map((doc: OrgDoc) => (
                                <div key={doc.id} className="dpo-doc" style={{ marginBottom: 6 }}>
                                  <div className="dpo-doc-top">
                                    <div className="dpo-doc-info">
                                      <span className="dpo-doc-name">{doc.title || DOC_LABELS[doc.type] || doc.type}</span>
                                      <span className={`dpo-doc-badge ${doc.status === 'active' ? 'active' : 'pending'}`}>
                                        {doc.status === 'active' ? '✓ אושר' : doc.status === 'draft' ? '📝 טיוטה' : '⏳ ממתין'}
                                      </span>
                                    </div>
                                    {doc.status !== 'active' && (
                                      <div className="dpo-doc-actions">
                                        <button className="dpo-btn-sm dpo-btn-green" disabled={docBusy} onClick={() => approveDoc(doc.id)}>✓ אשר</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="dpo-actions" style={{ marginTop: 20 }}>
                            {isDone ? (
                              <>
                                <button className="dpo-btn-secondary" onClick={() => { setTab('orgs'); loadOrgDetail(item.org_id) }}>🏢 פתח ארגון</button>
                                <button className="dpo-btn-secondary" onClick={() => { setTab('orgs'); loadOrgDetail(item.org_id); setTimeout(() => setOrgTab('messages'), 300) }}>💬 שלח הודעה</button>
                                <button className="dpo-btn-secondary" onClick={() => { setTab('orgs'); loadOrgDetail(item.org_id); setTimeout(() => setOrgTab('docs'), 300) }}>📄 ערוך מסמכים</button>
                              </>
                            ) : item.type === 'review' ? (
                              <button className="dpo-btn-primary" disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>{resolving ? '...' : '✓ סיים סקירה ועדכן לקוח'}</button>
                            ) : editingResp ? (
                              <>
                                <button className="dpo-btn-primary" disabled={resolving} onClick={() => resolveItem(item, 'edited')}>{resolving ? '...' : '✓ שלח'}</button>
                                <button className="dpo-btn-secondary" onClick={() => setEditingResp(false)}>ביטול</button>
                              </>
                            ) : (
                              <>
                                <button className="dpo-btn-primary" disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>{resolving ? '...' : '✓ אשר ושלח'}</button>
                                <button className="dpo-btn-secondary" onClick={() => setEditingResp(true)}>✏️ ערוך</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* ORGS TAB */}
          {tab === 'orgs' && (
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 60px' }}>
            <section className="dpo-section">
              <input className="dpo-search" placeholder="🔍 חיפוש ארגון..." value={orgSearch} onChange={e => { setOrgSearch(e.target.value); setOrgPage(0) }} />
              <p className="dpo-org-count">{filteredOrgs.length} ארגונים{orgSearch ? ` (מסננים לפי "${orgSearch}")` : ''}</p>
              <div className="dpo-org-list">
                {pagedOrgs.map(org => {
                  const s = org.compliance_score || 0
                  const sc = s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={org.id} className="dpo-org-row" onClick={() => loadOrgDetail(org.id)}>
                      <div className="dpo-org-name">{org.name}</div>
                      <span className="dpo-org-tier">{org.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</span>
                      <span className="dpo-org-score" style={{ color: sc, background: sc + '15' }}>{s}</span>
                      <span className="dpo-org-status">{org.pending_count > 0 ? `${org.pending_count} ממתינים` : '✓'}</span>
                    </div>
                  )
                })}
              </div>
              {hasMoreOrgs && (
                <button className="dpo-show-more" onClick={() => setOrgPage(p => p + 1)}>
                  הצג עוד {Math.min(ORGS_PER_PAGE, filteredOrgs.length - pagedOrgs.length)} ארגונים
                </button>
              )}

              {/* ORG DETAIL MODAL — 7 TABS */}
              {selectedOrg && (
                <div className="dpo-modal-overlay" onClick={() => { setSelectedOrg(null); setModalFullScreen(false) }}>
                  <div className={`dpo-modal ${modalFullScreen ? 'dpo-modal-fullscreen' : 'dpo-modal-wide'}`} onClick={e => e.stopPropagation()}>
                    <div className="dpo-modal-head">
                      <div>
                        <h3>{selectedOrg.organization?.name}</h3>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                          {selectedOrg.contact_email && <span style={{ fontSize: 12, color: '#71717a' }}>📧 {selectedOrg.contact_email}</span>}
                          {selectedOrg.organization?.phone && <span style={{ fontSize: 12, color: '#71717a' }}>📞 {selectedOrg.organization.phone}</span>}
                          <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                            {selectedOrg.organization?.tier === 'extended' ? '⭐ מורחבת' : 'בסיסית'} · ציון: {selectedOrg.organization?.compliance_score || 0}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="dpo-btn-sm" onClick={() => setModalFullScreen(!modalFullScreen)} title={modalFullScreen ? 'מצב רגיל' : 'מסך מלא'}>
                          {modalFullScreen ? '⊡' : '⬜'}
                        </button>
                        <button className="dpo-btn-sm" onClick={() => { setSelectedOrg(null); setModalFullScreen(false) }}>✕</button>
                      </div>
                    </div>
                    
                    {/* 7 Tabs */}
                    <div className="dpo-org-tabs">
                      {[
                        { key: 'overview', label: '📊 סקירה' },
                        { key: 'docs', label: `📄 מסמכים (${selectedOrg.documents?.length || 0})` },
                        { key: 'rights', label: `👤 זכויות (${selectedOrg.rights_requests?.length || 0})` },
                        { key: 'incidents', label: `🚨 אירועים (${selectedOrg.incidents?.length || 0})` },
                        { key: 'ropa', label: `📊 ROPA (${selectedOrg.ropa_activities?.length || 0})` },
                        { key: 'messages', label: '💬 הודעות' },
                        { key: 'reminders', label: '⏰ תזכורות' },
                        { key: 'guidelines', label: '📋 הנחיות' },
                        { key: 'activity', label: '📜 פעילות' },
                        { key: 'profile', label: '🏢 פרופיל' },
                      ].map(t => (
                        <button key={t.key}
                          className={`dpo-org-tab ${orgTab === t.key ? 'active' : ''}`}
                          onClick={() => setOrgTab(t.key as any)}
                        >{t.label}</button>
                      ))}
                    </div>

                    <div className="dpo-modal-body">
                      {/* OVERVIEW */}
                      {orgTab === 'overview' && (
                        <>
                          {/* Compliance Score Gauge */}
                          {(() => {
                            const score = selectedOrg.organization?.compliance_score || 0
                            const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
                            const scoreLabel = score >= 70 ? 'תקין' : score >= 40 ? 'חלקי' : 'נמוך'
                            const activeDocs = selectedOrg.documents?.filter((d: any) => d.status === 'active').length || 0
                            const pendingDocs = selectedOrg.documents?.filter((d: any) => d.status !== 'active').length || 0
                            const activeIncidents = selectedOrg.incidents?.filter((i: any) => !['resolved', 'closed'].includes(i.status)).length || 0
                            const openRights = selectedOrg.rights_requests?.filter((r: any) => r.status === 'pending' || r.status === 'in_progress').length || 0
                            const ropaCount = selectedOrg.ropa_activities?.length || 0

                            return (
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                                {/* Score card */}
                                <div style={{ flex: '1 1 140px', minWidth: 140, background: `linear-gradient(135deg, ${scoreColor}08, ${scoreColor}15)`, border: `1px solid ${scoreColor}30`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}%</div>
                                  <div style={{ fontSize: 11, color: scoreColor, fontWeight: 600, marginTop: 4 }}>ציון ציות — {scoreLabel}</div>
                                  <div style={{ marginTop: 8, height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 3, transition: 'width .3s' }} />
                                  </div>
                                </div>

                                {/* Quick stats grid */}
                                <div style={{ flex: '2 1 280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                                  {[
                                    { num: activeDocs, label: 'מסמכים פעילים', color: '#22c55e', icon: '📄' },
                                    { num: pendingDocs, label: 'ממתינים', color: pendingDocs > 0 ? '#f59e0b' : '#a1a1aa', icon: '⏳' },
                                    { num: activeIncidents, label: 'אירועים פתוחים', color: activeIncidents > 0 ? '#ef4444' : '#22c55e', icon: '🚨' },
                                    { num: openRights, label: 'בקשות פתוחות', color: openRights > 0 ? '#3b82f6' : '#a1a1aa', icon: '👤' },
                                    { num: ropaCount, label: 'פעילויות ROPA', color: '#8b5cf6', icon: '📊' },
                                    { num: selectedOrg.time_this_month_minutes || 0, label: 'דקות DPO החודש', color: '#71717a', icon: '⏱️' },
                                  ].map((s, i) => (
                                    <div key={i} style={{ padding: '10px 8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, textAlign: 'center' }}>
                                      <div style={{ fontSize: 11 }}>{s.icon}</div>
                                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1.1, marginTop: 2 }}>{s.num}</div>
                                      <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>{s.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Recent activity timeline */}
                          <div style={{ marginTop: 4 }}>
                            <span className="dpo-sub">📜 פעילות אחרונה</span>
                            {(() => {
                              // Merge all activity into single timeline
                              const events: { date: string; icon: string; text: string; color: string }[] = []

                              selectedOrg.queue_history?.slice(0, 5).forEach((q: any) => {
                                const cfg = TYPE_MAP[q.type] || { emoji: '📌', label: q.type }
                                events.push({ date: q.resolved_at || q.created_at, icon: cfg.emoji, text: `${cfg.label}: ${q.title}`, color: q.status === 'resolved' ? '#22c55e' : '#f59e0b' })
                              })

                              selectedOrg.incidents?.slice(0, 3).forEach((i: any) => {
                                events.push({ date: i.created_at, icon: '🚨', text: `אירוע: ${i.title}`, color: '#ef4444' })
                              })

                              selectedOrg.rights_requests?.slice(0, 3).forEach((r: any) => {
                                events.push({ date: r.created_at, icon: '👤', text: `בקשת ${r.request_type}: ${r.requester_name || r.requester_email}`, color: '#3b82f6' })
                              })

                              events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                              if (events.length === 0) return <p style={{ color: '#a1a1aa', fontSize: 13, padding: 10 }}>אין פעילות</p>

                              return events.slice(0, 8).map((ev, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f4f4f5', fontSize: 13 }}>
                                  <span style={{ color: ev.color, fontWeight: 700 }}>{ev.icon}</span>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.text}</span>
                                  <span style={{ fontSize: 11, color: '#a1a1aa', flexShrink: 0 }}>{timeAgo(ev.date)}</span>
                                </div>
                              ))
                            })()}
                          </div>
                        </>
                      )}

                      {/* DOCUMENTS — grouped by type with version history */}
                      {orgTab === 'docs' && (
                        <div>
                          {!selectedOrg.documents?.length ? (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין מסמכים</p>
                          ) : (() => {
                            // Group docs by type, sort each group by date desc
                            const grouped: Record<string, any[]> = {}
                            for (const d of selectedOrg.documents) {
                              const key = d.type || 'other'
                              if (!grouped[key]) grouped[key] = []
                              grouped[key].push(d)
                            }
                            // Sort each group: active first, then by date desc
                            Object.values(grouped).forEach(arr => arr.sort((a: any, b: any) => {
                              if (a.status === 'active' && b.status !== 'active') return -1
                              if (b.status === 'active' && a.status !== 'active') return 1
                              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            }))

                            return Object.entries(grouped).map(([type, docs]) => {
                              const latest = docs[0]
                              const history = docs.slice(1)
                              const isHistoryOpen = expandedDocType === type

                              return (
                                <div key={type} style={{ marginBottom: 16, border: '1px solid #e4e4e7', borderRadius: 10, overflow: 'hidden' }}>
                                  {/* Type header */}
                                  <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{DOC_LABELS[type] || type}</span>
                                      <span style={{ fontSize: 11, color: '#a1a1aa' }}>{docs.length} {docs.length > 1 ? 'גרסאות' : 'גרסה'}</span>
                                    </div>
                                    {latest.status === 'active' && latest.version && (
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>
                                        🔒 גרסה סופית v{latest.version}
                                      </span>
                                    )}
                                  </div>

                                  {/* Latest / current version */}
                                  <div style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className={`dpo-doc-badge ${latest.status === 'active' ? 'active' : 'pending'}`}>
                                          {latest.status === 'active' ? '✓ פעיל' : latest.status === 'draft' ? '📝 טיוטה' : '⏳ ממתין'}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#a1a1aa' }}>{new Date(latest.created_at).toLocaleDateString('he-IL')}</span>
                                        {latest.version && <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>v{latest.version}</span>}
                                      </div>
                                      <div className="dpo-doc-actions">
                                        {latest.status !== 'active' && (
                                          <button className="dpo-btn-sm dpo-btn-green" disabled={modalDocBusy} onClick={() => modalFinalizeDoc(latest.id, (latest.version || 0) + 1)}>
                                            🔒 סמן סופי
                                          </button>
                                        )}
                                        {latest.status !== 'active' && (
                                          <button className="dpo-btn-sm dpo-btn-green" disabled={modalDocBusy} onClick={() => modalApproveDoc(latest.id)}>✓ אשר</button>
                                        )}
                                        <button className="dpo-btn-sm" onClick={() => {
                                          if (modalEditDoc === latest.id) { setModalEditDoc(null) }
                                          else { setModalEditDoc(latest.id); setModalEditContent(latest.content || '') }
                                        }}>
                                          {modalEditDoc === latest.id ? '▲ סגור' : '✏️ ערוך'}
                                        </button>
                                        {confirmDeleteId === latest.id ? (
                                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button className="dpo-btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} disabled={modalDocBusy} onClick={() => modalDeleteDoc(latest.id)}>✓ אישור</button>
                                            <button className="dpo-btn-sm" onClick={() => setConfirmDeleteId(null)}>ביטול</button>
                                          </div>
                                        ) : (
                                          <button className="dpo-btn-sm" style={{ color: '#ef4444' }} onClick={() => setConfirmDeleteId(latest.id)} title="מחיקה">🗑️</button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Edit or view */}
                                    {modalEditDoc === latest.id ? (
                                      <div>
                                        <textarea className="dpo-doc-editor" value={modalEditContent} onChange={e => setModalEditContent(e.target.value)} rows={12} />
                                        <div className="dpo-doc-edit-btns">
                                          <button className="dpo-btn-primary" disabled={modalDocBusy} onClick={() => modalEditSave(latest.id)}>
                                            {modalDocBusy ? '...' : '💾 שמור ואשר'}
                                          </button>
                                          <button className="dpo-btn-sm" onClick={() => setModalEditDoc(null)}>ביטול</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{
                                        padding: '10px 14px', background: '#fafafa', borderRadius: 8,
                                        fontSize: 13, lineHeight: 1.7, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap',
                                        border: '1px solid #f0f0f0'
                                      }}>
                                        {(latest.content || '').slice(0, 800)}{latest.content?.length > 800 ? '...' : ''}
                                      </div>
                                    )}
                                  </div>

                                  {/* Version history toggle */}
                                  {history.length > 0 && (
                                    <div style={{ borderTop: '1px solid #f0f0f0' }}>
                                      <button
                                        onClick={() => setExpandedDocType(isHistoryOpen ? null : type)}
                                        style={{
                                          width: '100%', padding: '8px 14px', border: 'none', background: '#f8fafc',
                                          cursor: 'pointer', fontSize: 12, color: '#4f46e5', fontWeight: 600,
                                          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                      >
                                        <span>{isHistoryOpen ? '▼' : '◀'}</span>
                                        <span>היסטוריה — {history.length} גרסאות קודמות</span>
                                      </button>

                                      {isHistoryOpen && (
                                        <div style={{ padding: '0 14px 12px' }}>
                                          {history.map((d: any, idx: number) => (
                                            <div key={d.id} style={{
                                              padding: '8px 10px', marginTop: 6, background: '#fafafa', borderRadius: 6,
                                              border: '1px solid #f0f0f0', opacity: 0.8
                                            }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                                                    {new Date(d.created_at).toLocaleDateString('he-IL')}
                                                  </span>
                                                  <span style={{ fontSize: 10, color: '#71717a', background: '#f4f4f5', padding: '1px 6px', borderRadius: 3 }}>
                                                    {d.status === 'active' ? 'אושר' : d.status === 'draft' ? 'טיוטה' : d.status}
                                                  </span>
                                                  {d.version && <span style={{ fontSize: 10, color: '#4f46e5' }}>v{d.version}</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                  <button className="dpo-btn-sm" onClick={() => {
                                                    if (modalEditDoc === d.id) { setModalEditDoc(null) }
                                                    else { setModalEditDoc(d.id); setModalEditContent(d.content || '') }
                                                  }} style={{ fontSize: 10, padding: '2px 6px' }}>
                                                    {modalEditDoc === d.id ? '▲' : '👁️'}
                                                  </button>
                                                  {confirmDeleteId === d.id ? (
                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                      <button className="dpo-btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444', fontSize: 10, padding: '2px 6px' }} disabled={modalDocBusy} onClick={() => modalDeleteDoc(d.id)}>✓</button>
                                                      <button className="dpo-btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => setConfirmDeleteId(null)}>✕</button>
                                                    </div>
                                                  ) : (
                                                    <button className="dpo-btn-sm" style={{ color: '#ef4444', fontSize: 10, padding: '2px 6px' }} onClick={() => setConfirmDeleteId(d.id)}>🗑️</button>
                                                  )}
                                                </div>
                                              </div>
                                              {modalEditDoc === d.id && (
                                                <div style={{ marginTop: 6 }}>
                                                  <textarea className="dpo-doc-editor" value={modalEditContent} onChange={e => setModalEditContent(e.target.value)} rows={8} style={{ minHeight: 120 }} />
                                                  <div className="dpo-doc-edit-btns">
                                                    <button className="dpo-btn-primary" disabled={modalDocBusy} onClick={() => modalEditSave(d.id)} style={{ fontSize: 12, padding: '5px 14px' }}>
                                                      {modalDocBusy ? '...' : '💾 שמור'}
                                                    </button>
                                                    <button className="dpo-btn-sm" onClick={() => setModalEditDoc(null)}>ביטול</button>
                                                  </div>
                                                </div>
                                              )}
                                              {modalEditDoc !== d.id && (
                                                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                                                  {(d.content || '').slice(0, 150)}...
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}

                      {/* RIGHTS REQUESTS */}
                      {orgTab === 'rights' && (
                        <div>
                          {!selectedOrg.rights_requests?.length ? (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין בקשות זכויות נושאי מידע</p>
                          ) : (
                            <>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                <span className="dpo-chip" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                                  ⏳ ממתין: {selectedOrg.rights_requests.filter((r: any) => r.status === 'pending').length}
                                </span>
                                <span className="dpo-chip" style={{ background: '#dbeafe', border: '1px solid #bfdbfe' }}>
                                  🔄 בטיפול: {selectedOrg.rights_requests.filter((r: any) => r.status === 'in_progress').length}
                                </span>
                                <span className="dpo-chip" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                                  ✓ הושלם: {selectedOrg.rights_requests.filter((r: any) => r.status === 'completed').length}
                                </span>
                              </div>
                              {selectedOrg.rights_requests.map((req: any) => {
                                const typeLabels: Record<string, string> = { access: 'עיון', rectification: 'תיקון', erasure: 'מחיקה', objection: 'התנגדות' }
                                const statusColors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#22c55e', rejected: '#ef4444' }
                                const statusLabels: Record<string, string> = { pending: 'ממתין', in_progress: 'בטיפול', completed: 'הושלם', rejected: 'נדחה' }
                                const daysLeft = req.deadline ? Math.ceil((new Date(req.deadline).getTime() - Date.now()) / 86400000) : null
                                return (
                                  <div key={req.id} style={{ padding: '12px 14px', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <div>
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>{req.requester_name || 'לא צוין'}</span>
                                        <span style={{ fontSize: 12, color: '#71717a', marginRight: 8 }}>{req.requester_email}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (statusColors[req.status] || '#71717a') + '15', color: statusColors[req.status] || '#71717a' }}>
                                          {statusLabels[req.status] || req.status}
                                        </span>
                                        {daysLeft !== null && req.status !== 'completed' && req.status !== 'rejected' && (
                                          <span style={{ fontSize: 10, fontWeight: 700, color: daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : '#22c55e' }}>
                                            {daysLeft > 0 ? `${daysLeft} ימים` : `חריגה ${Math.abs(daysLeft)} ימים`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 12, color: '#71717a', flexWrap: 'wrap' }}>
                                      <span>סוג: {typeLabels[req.request_type] || req.request_type}</span>
                                      <span>מס׳: {req.request_number}</span>
                                      <span>{new Date(req.created_at).toLocaleDateString('he-IL')}</span>
                                    </div>
                                    {req.details && <p style={{ fontSize: 12, color: '#52525b', marginTop: 4, lineHeight: 1.5 }}>{(req.details || '').slice(0, 200)}</p>}
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </div>
                      )}

                      {/* INCIDENTS */}
                      {orgTab === 'incidents' && (
                        <div>
                          {!selectedOrg.incidents?.length ? (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין אירועי אבטחה</p>
                          ) : (() => {
                            const active = selectedOrg.incidents.filter((i: any) => !['resolved', 'closed'].includes(i.status))
                            const closed = selectedOrg.incidents.filter((i: any) => ['resolved', 'closed'].includes(i.status))
                            const sevColors: Record<string, string> = { critical: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
                            const sevLabels: Record<string, string> = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' }
                            const statLabels: Record<string, string> = { new: 'חדש', investigating: 'בבדיקה', contained: 'נבלם', resolved: 'טופל', closed: 'סגור' }

                            const renderIncident = (inc: any) => {
                              const isActive = !['resolved', 'closed'].includes(inc.status)
                              const deadline = inc.authority_deadline ? new Date(inc.authority_deadline) : null
                              const hoursLeft = deadline ? Math.floor((deadline.getTime() - Date.now()) / 3600000) : null
                              return (
                                <div key={inc.id} style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${isActive ? '#fecaca' : '#e4e4e7'}`, borderRadius: 8, marginBottom: 6, borderRight: `3px solid ${sevColors[inc.severity] || '#71717a'}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{inc.title}</span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: (sevColors[inc.severity] || '#71717a') + '15', color: sevColors[inc.severity] || '#71717a' }}>
                                        {sevLabels[inc.severity] || inc.severity}
                                      </span>
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isActive ? '#fef3c7' : '#f0fdf4', color: isActive ? '#92400e' : '#166534' }}>
                                        {statLabels[inc.status] || inc.status}
                                      </span>
                                    </div>
                                  </div>
                                  {inc.description && <p style={{ fontSize: 12, color: '#52525b', marginTop: 4, lineHeight: 1.5 }}>{(inc.description || '').slice(0, 200)}</p>}
                                  <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: '#a1a1aa', flexWrap: 'wrap' }}>
                                    <span>{new Date(inc.created_at).toLocaleDateString('he-IL')}</span>
                                    {inc.incident_type && <span>{inc.incident_type}</span>}
                                    {hoursLeft !== null && isActive && (
                                      <span style={{ fontWeight: 700, color: hoursLeft < 24 ? '#dc2626' : hoursLeft < 48 ? '#f59e0b' : '#22c55e' }}>
                                        ⏰ {hoursLeft > 0 ? `${hoursLeft} שעות לדיווח` : 'חריגת זמן!'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                  <span className="dpo-chip" style={{ background: active.length > 0 ? '#fee2e2' : '#dcfce7', border: `1px solid ${active.length > 0 ? '#fecaca' : '#bbf7d0'}`, fontWeight: 600 }}>
                                    {active.length > 0 ? `🔴 ${active.length} פעילים` : '✅ אין אירועים פתוחים'}
                                  </span>
                                  <span className="dpo-chip">{closed.length} סגורים</span>
                                </div>
                                {active.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    <span className="dpo-sub">🚨 אירועים פעילים</span>
                                    {active.map(renderIncident)}
                                  </div>
                                )}
                                {closed.length > 0 && (
                                  <div>
                                    <span className="dpo-sub">✅ אירועים שנסגרו</span>
                                    {closed.map(renderIncident)}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* ROPA — Processing Activities */}
                      {orgTab === 'ropa' && (
                        <div>
                          {!selectedOrg.ropa_activities?.length ? (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין פעילויות עיבוד מתועדות</p>
                          ) : (
                            <>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                <span className="dpo-chip" style={{ fontWeight: 600 }}>📊 {selectedOrg.ropa_activities.length} פעילויות</span>
                                {(() => {
                                  const bases = new Set(selectedOrg.ropa_activities.map((a: any) => a.legal_basis).filter(Boolean))
                                  return <span className="dpo-chip">{bases.size} בסיסים משפטיים</span>
                                })()}
                              </div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e4e4e7' }}>
                                      {['פעילות', 'מטרה', 'בסיס משפטי', 'רגישות', 'מעודכן'].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedOrg.ropa_activities.map((act: any) => {
                                      const riskColors: Record<string, string> = { high: '#dc2626', medium: '#f59e0b', low: '#22c55e' }
                                      const riskLabels: Record<string, string> = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }
                                      const basisLabels: Record<string, string> = {
                                        consent: 'הסכמה', contract: 'חוזה', legal_obligation: 'חובה חוקית',
                                        vital_interest: 'אינטרס חיוני', public_interest: 'אינטרס ציבורי', legitimate_interest: 'אינטרס לגיטימי'
                                      }
                                      return (
                                        <tr key={act.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                          <td style={{ padding: '8px 10px', fontWeight: 500, color: '#1e293b' }}>{act.name || act.activity_name || '-'}</td>
                                          <td style={{ padding: '8px 10px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {act.purpose || '-'}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#eef2ff', color: '#4338ca' }}>
                                              {basisLabels[act.legal_basis] || act.legal_basis || '-'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: riskColors[act.sensitivity_level || act.risk_level] || '#71717a' }}>
                                              {riskLabels[act.sensitivity_level || act.risk_level] || '-'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 10px', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                                            {act.updated_at ? new Date(act.updated_at).toLocaleDateString('he-IL') : new Date(act.created_at).toLocaleDateString('he-IL')}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* MESSAGES — compose + send */}
                      {orgTab === 'messages' && (
                        <div>
                          {/* Message history from queue */}
                          {selectedOrg.queue_history?.filter((q: any) => q.type === 'escalation').length > 0 ? (
                            <div style={{ marginBottom: 16 }}>
                              <span className="dpo-sub">💬 היסטוריית שיחות</span>
                              {selectedOrg.queue_history.filter((q: any) => q.type === 'escalation').slice(0, 5).map((q: any) => (
                                <div key={q.id} className="dpo-done-row" style={{ padding: '8px 0' }}>
                                  <span style={{ color: q.status === 'resolved' ? '#22c55e' : '#f59e0b' }}>
                                    {q.status === 'resolved' ? '✓' : '●'}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{q.title}</span>
                                    {q.ai_draft_response && <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{q.ai_draft_response.slice(0, 100)}</p>}
                                  </div>
                                  <span className="dpo-done-meta">{timeAgo(q.resolved_at || q.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>אין שיחות קודמות עם ארגון זה</p>
                          )}

                          {/* Compose */}
                          <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                            <span className="dpo-sub" style={{ marginTop: 0 }}>💬 שלח הודעה חדשה</span>
                            <textarea 
                              value={composeMsg} onChange={e => setComposeMsg(e.target.value)} 
                              placeholder="כתוב הודעה ללקוח..."
                              style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 13, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              {composeSent ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>✓ נשלח בהצלחה</span> : <span />}
                              <button 
                                className="dpo-btn-primary"
                                disabled={!composeMsg.trim() || composeSending}
                                onClick={() => sendDpoMessage(selectedOrg.organization?.id, selectedOrg.organization?.name)}
                                style={{ padding: '8px 20px', fontSize: 13, opacity: composeMsg.trim() ? 1 : 0.5 }}
                              >
                                {composeSending ? '...' : '📤 שלח'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REMINDERS */}
                      {orgTab === 'reminders' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {REMINDERS.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                              <span style={{ fontSize: 18 }}>{r.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#27272a' }}>{r.title}</p>
                                <p style={{ fontSize: 11, color: '#a1a1aa' }}>{r.freq}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* GUIDELINES */}
                      {orgTab === 'guidelines' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {GUIDELINES.map((g, i) => (
                            <div key={i} style={{ padding: '12px', background: '#eef2ff', borderRadius: 8, borderRight: '3px solid #4f46e5' }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{g.emoji} {g.title}</p>
                              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{g.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ACTIVITY */}
                      {orgTab === 'activity' && (
                        <div>
                          {!selectedOrg.queue_history?.length ? (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין פעילות</p>
                          ) : selectedOrg.queue_history.map((q: any) => {
                            const c = TYPE_MAP[q.type] || { emoji: '📌', label: q.type, accent: '#71717a' }
                            return (
                              <div key={q.id} className="dpo-done-row" style={{ padding: '10px 0', borderBottom: '1px solid #f4f4f5' }}>
                                <span style={{ color: q.status === 'resolved' ? '#22c55e' : '#f59e0b' }}>
                                  {q.status === 'resolved' ? '✓' : '●'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span className="dpo-done-title">{c.emoji} {q.title}</span>
                                  {q.ai_summary && <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{(q.ai_summary || '').slice(0, 120)}</p>}
                                </div>
                                <span className="dpo-done-meta">{timeAgo(q.resolved_at || q.created_at)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* PROFILE */}
                      {orgTab === 'profile' && (
                        <div>
                          {selectedOrg.profile?.answers ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {selectedOrg.profile.answers.map((a: any) => (
                                <div key={a.questionId} style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8 }}>
                                  <p style={{ fontSize: 11, color: '#71717a', marginBottom: 2 }}>{PROFILE_LABELS[a.questionId] || a.questionId}</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: '#27272a' }}>
                                    {Array.isArray(a.value) ? a.value.join(', ') : typeof a.value === 'boolean' ? (a.value ? 'כן' : 'לא') : String(a.value || '-')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#71717a', textAlign: 'center', padding: 20 }}>אין נתוני פרופיל</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// =============================================
// CSS
// =============================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}

.dpo-page{font-family:'Heebo',sans-serif;background:#fafafa;min-height:100vh;color:#18181b}

/* NAV */
.dpo-nav{display:flex;align-items:center;justify-content:space-between;padding:8px 24px;border-bottom:1px solid #e4e4e7;background:linear-gradient(180deg,#fff 0%,#fafafa 100%);position:sticky;top:0;z-index:10;gap:8px;flex-wrap:wrap}
.dpo-nav-right{display:flex;align-items:center;gap:10px}
.dpo-logo{font-size:16px;font-weight:900;background:linear-gradient(135deg,#4f46e5,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.dpo-nav-sep{color:#d4d4d8}
.dpo-nav-name{font-size:13px;color:#71717a}
.dpo-nav-left{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dpo-tab{padding:5px 12px;border-radius:6px;font-size:13px;font-weight:500;border:none;background:none;color:#71717a;cursor:pointer;font-family:inherit;transition:all .15s}
.dpo-tab:hover{background:#f4f4f5}
.dpo-tab.active{background:#18181b;color:#fff}
.dpo-badge{font-size:10px;background:#ef4444;color:#fff;padding:1px 6px;border-radius:10px;margin-right:4px}
.dpo-logout{padding:3px 8px;border-radius:4px;font-size:11px;border:1px solid #e4e4e7;background:none;cursor:pointer;color:#71717a;font-family:inherit}

/* Filter select */
.dpo-filter-select{padding:4px 10px;border-radius:6px;font-size:12px;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;font-family:inherit;appearance:auto}
.dpo-filter-select:focus{outline:none;border-color:#4f46e5}

/* Refresh button */
.dpo-refresh-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;transition:all .15s}
.dpo-refresh-btn:hover{background:#eef2ff;border-color:#c7d2fe;color:#4f46e5}
.dpo-refresh-btn:active{transform:rotate(180deg)}

/* MAIN */
.dpo-main{margin:0;padding:0 16px 60px}

/* Master-Detail Layout */
.dpo-master{display:flex;gap:0;height:calc(100vh - 50px);overflow:hidden}
.dpo-list-panel{width:380px;min-width:320px;border-left:1px solid #e4e4e7;overflow-y:auto;background:#fff;flex-shrink:0}
.dpo-list-header{padding:14px 16px 10px;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:2}
.dpo-list-header h3{font-size:13px;font-weight:700;color:#71717a;margin:0}
.dpo-list-item{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #f4f4f5;cursor:pointer;transition:background .1s}
.dpo-list-item:hover{background:#fafafa}
.dpo-list-item.active{background:#eef2ff;border-right:3px solid #4f46e5}
.dpo-list-item.resolved{opacity:0.7}
.dpo-list-item.resolved.active{opacity:1}
.dpo-list-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0}
.dpo-list-body{flex:1;min-width:0}
.dpo-list-title{font-size:13px;font-weight:600;color:#18181b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpo-list-meta{font-size:11px;color:#a1a1aa;margin-top:2px;display:flex;gap:6px;align-items:center}
.dpo-list-tag{font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;white-space:nowrap}

.dpo-detail-panel{flex:1;overflow-y:auto;padding:24px 32px;background:#fafafa}
.dpo-detail-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:#a1a1aa}
.dpo-detail-empty-icon{font-size:48px;margin-bottom:16px;opacity:0.5}
.dpo-detail-empty-title{font-size:16px;font-weight:600;color:#71717a}
.dpo-detail-empty-sub{font-size:13px;margin-top:4px}
.dpo-detail-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e4e4e7}
.dpo-detail-title{font-size:17px;font-weight:700;color:#18181b}
.dpo-detail-org{font-size:13px;color:#71717a;margin-top:2px}

@media(max-width:768px){
  .dpo-master{flex-direction:column;height:auto}
  .dpo-list-panel{width:100%;max-height:40vh;min-width:unset}
  .dpo-detail-panel{min-height:50vh;padding:16px}
}

/* KPIs */
.dpo-kpis{display:flex;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e4e4e7;overflow-x:auto}
.dpo-kpi{text-align:center;flex:1;min-width:70px;background:#fff;border:1px solid #f0f0f0;border-radius:10px;padding:12px 8px}
.dpo-kpi-num{font-size:24px;font-weight:900;line-height:1.1}
.dpo-kpi-label{font-size:11px;color:#71717a;margin-top:3px}

/* Section — collapsible */
.dpo-section{margin-bottom:24px}
.dpo-section-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:4px 0;margin-bottom:10px;user-select:none}
.dpo-section-header:hover .dpo-collapse-icon{color:#4f46e5}
.dpo-section-title{font-size:14px;font-weight:700;color:#71717a;margin:0}
.dpo-collapse-icon{font-size:12px;color:#a1a1aa;transition:color .15s}

/* Card */
.dpo-card{background:#fff;border-radius:10px;border:1px solid #e4e4e7;margin-bottom:8px;overflow:hidden;transition:all .15s}
.dpo-card:hover{border-color:#d4d4d8;box-shadow:0 1px 6px rgba(0,0,0,.04)}
.dpo-card.open{box-shadow:0 2px 12px rgba(0,0,0,.06);border-color:#c7d2fe}
.dpo-card-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer}
.dpo-card-info{flex:1;min-width:0}
.dpo-card-tag{font-size:11px;font-weight:600;display:inline-block;margin-bottom:3px}
.dpo-card-title{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpo-card-meta{font-size:12px;color:#71717a;margin-top:1px}
.dpo-card-chevron{font-size:14px;color:#a1a1aa;flex-shrink:0}
.dpo-card-body{padding:0 18px 18px;border-top:1px solid #f4f4f5}

/* Chips */
.dpo-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.dpo-chip{padding:4px 10px;border-radius:6px;background:#f4f4f5;border:1px solid #e4e4e7;font-size:12px}

/* Bubbles */
.dpo-bubbles{margin-top:10px}
.dpo-bubble{padding:8px 12px;border-radius:10px;font-size:13px;margin-bottom:4px;max-width:85%;line-height:1.5}
.dpo-bubble.user{background:#eef2ff;margin-left:auto}
.dpo-bubble.ai{background:#f4f4f5}
.dpo-bubble-role{font-size:10px;font-weight:700;color:#71717a;margin-bottom:1px}
.dpo-sub{font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:6px;margin-top:14px}

/* AI box */
.dpo-ai-box{padding:10px 14px;border-radius:8px;background:#eef2ff;border-right:3px solid #4f46e5;font-size:13px;line-height:1.6;margin-top:10px}
.dpo-ai-label{font-size:10px;font-weight:700;color:#4f46e5;display:block;margin-bottom:2px}

/* Draft */
.dpo-draft{padding:10px 14px;border:1.5px dashed #e4e4e7;border-radius:8px;font-size:13px;cursor:pointer;line-height:1.6;background:#fff;color:#71717a;margin-top:6px;transition:border-color .15s}
.dpo-draft:hover{border-color:#4f46e5}
.dpo-textarea{width:100%;min-height:80px;padding:10px 14px;border:1.5px solid #4f46e5;border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;direction:rtl;margin-top:6px}
.dpo-textarea:focus{outline:none}

/* Document review */
.dpo-doc-header{display:flex;justify-content:space-between;align-items:center;margin-top:14px;margin-bottom:8px}
.dpo-doc{background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:10px 14px;margin-bottom:6px}
.dpo-doc-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px}
.dpo-doc-info{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dpo-doc-name{font-size:13px;font-weight:600}
.dpo-doc-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px}
.dpo-doc-badge.active{color:#22c55e;background:#f0fdf4}
.dpo-doc-badge.pending{color:#4f46e5;background:#eef2ff}
.dpo-doc-actions{display:flex;gap:4px}
.dpo-doc-preview{font-size:12px;color:#71717a;line-height:1.5;cursor:pointer;padding:6px 0}
.dpo-link{color:#4f46e5;font-weight:600}
.dpo-doc-expanded{margin-top:8px}
.dpo-doc-text{font-size:12px;line-height:1.7;color:#3f3f46;white-space:pre-wrap;max-height:350px;overflow-y:auto;padding:10px;background:#fafafa;border-radius:6px;border:1px solid #e4e4e7}
.dpo-doc-editor{width:100%;min-height:250px;padding:10px;border:1.5px solid #4f46e5;border-radius:8px;font-family:inherit;font-size:12px;line-height:1.7;resize:vertical;direction:rtl}
.dpo-doc-editor:focus{outline:none}
.dpo-doc-edit-btns{display:flex;gap:6px;margin-top:8px}
.dpo-regen{padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-top:6px}
.dpo-regen-input{width:100%;padding:8px;border:1px solid #fde68a;border-radius:6px;font-family:inherit;font-size:12px;resize:none;direction:rtl;margin-bottom:6px}
.dpo-regen-input:focus{outline:none;border-color:#f59e0b}
.dpo-regen-btns{display:flex;gap:6px}
.dpo-warn{padding:12px;background:#fffbeb;border-radius:8px;font-size:13px;text-align:center;margin-top:10px}

/* Buttons */
.dpo-actions{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #f4f4f5}
.dpo-btn-primary{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;border:none;background:#4f46e5;color:#fff;cursor:pointer;font-family:inherit;transition:background .15s}
.dpo-btn-primary:hover{background:#4338ca}
.dpo-btn-primary:disabled{opacity:.5;cursor:not-allowed}
.dpo-btn-secondary{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;font-family:inherit}
.dpo-btn-sm{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;font-family:inherit}
.dpo-btn-sm:hover{background:#f4f4f5}
.dpo-btn-green{border-color:#22c55e;color:#22c55e;background:#f0fdf4}
.dpo-btn-green:hover{background:#dcfce7}
.dpo-btn-sm.dpo-btn-green{border-color:#22c55e;color:#fff;background:#22c55e}
.dpo-btn-sm.dpo-btn-green:hover{background:#16a34a}

/* Done rows */
.dpo-resolved-actions{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap}
.dpo-btn-action{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #e4e4e7;background:#fff;color:#4f46e5;cursor:pointer;font-family:inherit;transition:all .15s}
.dpo-btn-action:hover{background:#eef2ff;border-color:#c7d2fe}
.dpo-done-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:13px}
.dpo-done-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpo-done-meta{color:#a1a1aa;font-size:11px;flex-shrink:0}

/* Empty */
.dpo-empty{text-align:center;padding:40px 20px;background:#fff;border-radius:12px;border:1px solid #e4e4e7;margin-bottom:24px}
.dpo-empty-title{font-size:16px;font-weight:700;color:#22c55e;margin-top:8px}
.dpo-empty-sub{font-size:13px;color:#71717a}
.dpo-show-more{width:100%;padding:10px;margin-top:8px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;color:#4f46e5;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
.dpo-show-more:hover{background:#eef2ff;border-color:#c7d2fe}

/* Search + org count */
.dpo-search{width:100%;padding:10px 14px;border:1px solid #e4e4e7;border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:8px;background:#fff}
.dpo-search:focus{outline:none;border-color:#4f46e5}
.dpo-org-count{font-size:12px;color:#a1a1aa;margin-bottom:10px}

/* Org list */
.dpo-org-list{display:flex;flex-direction:column;gap:4px}
.dpo-org-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border:1px solid #e4e4e7;border-radius:8px;cursor:pointer;transition:border-color .15s}
.dpo-org-row:hover{border-color:#4f46e5}
.dpo-org-name{flex:1;font-size:14px;font-weight:600}
.dpo-org-tier{font-size:11px;color:#71717a;background:#f4f4f5;padding:2px 8px;border-radius:4px}
.dpo-org-score{font-size:12px;font-weight:800;padding:2px 8px;border-radius:4px}
.dpo-org-status{font-size:11px;color:#71717a}

/* Modal */
.dpo-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
.dpo-modal{background:#fff;border-radius:12px;padding:20px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto}
.dpo-modal-wide{max-width:780px}
.dpo-modal-fullscreen{position:fixed;inset:16px;max-width:none;max-height:none;border-radius:14px;z-index:110;box-shadow:0 8px 40px rgba(0,0,0,.15)}
.dpo-org-tabs{display:flex;gap:2px;border-bottom:1px solid #e4e4e7;margin:12px -20px 0;padding:0 20px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.dpo-org-tab{padding:8px 12px;font-size:12px;font-weight:500;color:#71717a;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;font-family:inherit;position:relative}
.dpo-org-tab.active{color:#4f46e5;border-bottom-color:#4f46e5;font-weight:700;background:#eef2ff;border-radius:6px 6px 0 0}
.dpo-org-tab:hover{color:#27272a;background:#f8fafc}
.dpo-modal-body{padding-top:16px;max-height:60vh;overflow-y:auto}
.dpo-modal-fullscreen .dpo-modal-body{max-height:calc(100vh - 180px)}
.dpo-modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;padding-bottom:10px;border-bottom:1px solid #f0f0f0}
.dpo-modal-head h3{font-size:18px;font-weight:800;color:#1e293b}

/* Spinner */
.dpo-loading{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#71717a}
.dpo-spinner{width:24px;height:24px;border:3px solid #e4e4e7;border-top-color:#4f46e5;border-radius:50%;animation:dspin .7s linear infinite}
@keyframes dspin{to{transform:rotate(360deg)}}

/* MOBILE */
@media(max-width:640px){
  .dpo-nav{padding:8px 12px;gap:6px}
  .dpo-nav-name{display:none}
  .dpo-nav-sep{display:none}
  .dpo-nav-left{width:100%;justify-content:space-between}
  .dpo-main{padding:12px 10px 40px}
  .dpo-kpis{gap:8px;flex-wrap:wrap}
  .dpo-kpi-num{font-size:18px}
  .dpo-card-head{padding:12px 14px}
  .dpo-card-body{padding:0 14px 14px}
  .dpo-card-title{font-size:14px}
  .dpo-doc-top{flex-direction:column;align-items:flex-start}
  .dpo-doc-actions{width:100%;justify-content:flex-end}
  .dpo-org-row{flex-wrap:wrap;gap:6px}
  .dpo-done-row{flex-wrap:wrap}
  .dpo-done-meta{width:100%;text-align:left}
  .dpo-modal-wide{max-width:95vw;padding:14px}
  .dpo-modal-fullscreen{inset:4px;padding:12px;border-radius:10px}
  .dpo-org-tabs{gap:0;overflow-x:auto}
  .dpo-org-tab{font-size:11px;padding:6px 8px}
  .dpo-modal-body{max-height:50vh}
  .dpo-filter-select{font-size:11px;padding:3px 6px}
}
`
