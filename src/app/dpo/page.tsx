'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import DatabaseOptimizer from '@/components/DatabaseOptimizer'

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
const DPO_NAME = 'עו"ד דנה כהן'

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
interface QueueItem {
  id: string; org_id: string; type: string; priority: string; status: string
  title: string; description: string; ai_summary: string | null
  ai_recommendation: string | null; ai_draft_response: string | null
  ai_confidence: number | null; created_at: string; resolved_at: string | null
  deadline_at: string | null; organizations: { id: string; name: string }
}

interface OrgDoc {
  id: string; title: string; type: string; status: string
  content: string; created_at: string; version?: number
}

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
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
  security_procedures: 'נוהל אבטחת מידע', database_definition: 'הגדרת מאגרי מידע',
  dpo_appointment: 'כתב מינוי DPO', database_registration: 'רישום מאגרי מידע',
  ropa: 'מפת עיבוד (ROPA)', consent_form: 'טופס הסכמה',
  processor_agreement: 'הסכם עיבוד מידע (DPA)', employee_training: 'הדרכת עובדים',
  camera_appointment: 'מינוי אחראי מצלמות', cv_retention_policy: 'מדיניות מחיקת קו"ח',
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

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
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

const scoreNum = (n: any) => Math.round(Number(n) || 0)
const scoreColor = (s: number) => s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444'
const scoreLabel = (s: number) => s >= 70 ? 'תקין' : s >= 40 ? 'חלקי' : 'נמוך'

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()

  // ── Core data ──
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [orgs, setOrgs] = useState<any[]>([])

  // ── View routing ──
  const [view, setView] = useState<'tabs' | 'org'>('tabs')
  const [tab, setTab] = useState<'inbox' | 'overview' | 'orgs'>('inbox')
  const [previousTab, setPreviousTab] = useState<'inbox' | 'overview' | 'orgs'>('inbox')

  // ── Inbox: expand + context ──
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [loadingCtx, setLoadingCtx] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [resolvedCollapsed, setResolvedCollapsed] = useState(true)

  // ── Inbox: doc review ──
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [regenId, setRegenId] = useState<string | null>(null)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [docBusy, setDocBusy] = useState(false)

  // ── Inbox: resolve ──
  const [resolving, setResolving] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [editingResp, setEditingResp] = useState(false)

  // ── Orgs table ──
  const [orgSearch, setOrgSearch] = useState('')
  const [orgPage, setOrgPage] = useState(0)
  const [sortCol, setSortCol] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const ORGS_PER_PAGE = 25

  // ── Org detail (full page) ──
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [orgTab, setOrgTab] = useState<'overview'|'docs'|'rights'|'incidents'|'ropa'|'messages'|'reminders'|'guidelines'|'activity'|'profile'|'optimizer'>('overview')
  const [composeMsg, setComposeMsg] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeSent, setComposeSent] = useState(false)

  // ── Org detail: doc editing ──
  const [modalEditDoc, setModalEditDoc] = useState<string | null>(null)
  const [modalEditContent, setModalEditContent] = useState('')
  const [modalDocBusy, setModalDocBusy] = useState(false)
  const [expandedDocType, setExpandedDocType] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ═══════════════════════════════════════════════
  // AUTH & FETCH
  // ═══════════════════════════════════════════════
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
    } catch {}
  }

  const goToOrg = (orgId: string) => {
    setPreviousTab(tab)
    loadOrgDetail(orgId)
    setView('org')
  }

  const goBack = () => {
    setView('tabs')
    setSelectedOrg(null)
    setTab(previousTab)
  }

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════
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
    loadAll()
    setDocBusy(false)
  }

  const modalEditSave = async (docId: string) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'edit_document', documentId: docId, content: modalEditContent }) })
      toast('✅ עודכן ואושר'); setModalEditDoc(null)
      loadOrgDetail(selectedOrg?.organization?.id)
    } catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalApproveDoc = async (docId: string) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: docId }) })
      toast('✅ אושר'); loadOrgDetail(selectedOrg?.organization?.id)
    } catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalDeleteDoc = async (docId: string) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'delete_document', documentId: docId }) })
      toast('🗑️ נמחק'); setConfirmDeleteId(null)
      loadOrgDetail(selectedOrg?.organization?.id)
    } catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  const modalFinalizeDoc = async (docId: string, version: number) => {
    setModalDocBusy(true)
    try {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'finalize_document', documentId: docId, version }) })
      toast('✅ סומן כגרסה סופית'); loadOrgDetail(selectedOrg?.organization?.id)
    } catch { toast('שגיאה', 'error') }
    setModalDocBusy(false)
  }

  // ═══════════════════════════════════════════════
  // DERIVED STATE
  // ═══════════════════════════════════════════════
  const allPending = queue.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const pending = typeFilter === 'all' ? allPending : allPending.filter(i => i.type === typeFilter)
  const resolved = queue.filter(i => i.status === 'resolved').sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
  const resolvedCount = stats?.resolved_this_month || 0

  // Org table sorting + pagination
  const sortedOrgs = useMemo(() => {
    const filtered = orgs.filter(o => !orgSearch || o.name?.toLowerCase().includes(orgSearch.toLowerCase()))
    return filtered.sort((a, b) => {
      let av: any, bv: any
      switch (sortCol) {
        case 'name': av = a.name || ''; bv = b.name || ''; break
        case 'score': av = a.compliance_score || 0; bv = b.compliance_score || 0; break
        case 'pending': av = a.pending_count || 0; bv = b.pending_count || 0; break
        case 'risk': av = a.risk_level || 'z'; bv = b.risk_level || 'z'; break
        case 'created': av = a.created_at || ''; bv = b.created_at || ''; break
        default: av = a.name || ''; bv = b.name || ''
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [orgs, orgSearch, sortCol, sortDir])

  const totalOrgPages = Math.ceil(sortedOrgs.length / ORGS_PER_PAGE)
  const pagedOrgs = sortedOrgs.slice(orgPage * ORGS_PER_PAGE, (orgPage + 1) * ORGS_PER_PAGE)

  // Overview chart data
  const complianceDist = useMemo(() => {
    const green = orgs.filter(o => scoreNum(o.compliance_score) >= 70).length
    const yellow = orgs.filter(o => { const s = scoreNum(o.compliance_score); return s >= 40 && s < 70 }).length
    const red = orgs.filter(o => scoreNum(o.compliance_score) < 40).length
    return [
      { name: 'תקין (70+)', value: green, color: '#22c55e' },
      { name: 'חלקי (40-69)', value: yellow, color: '#f59e0b' },
      { name: 'נמוך (0-39)', value: red, color: '#ef4444' },
    ]
  }, [orgs])

  const queueByType = useMemo(() => {
    const counts: Record<string, number> = {}
    allPending.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1 })
    return Object.entries(counts).map(([type, count]) => ({
      name: TYPE_MAP[type]?.label || type,
      count,
      fill: TYPE_MAP[type]?.accent || '#71717a'
    }))
  }, [allPending])

  const avgScore = useMemo(() => {
    if (orgs.length === 0) return 0
    return scoreNum(orgs.reduce((s, o) => s + (o.compliance_score || 0), 0) / orgs.length)
  }, [orgs])

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setOrgPage(0)
  }

  // ═══════════════════════════════════════════════
  // RENDER: Doc Review (shared between inbox + org page)
  // ═══════════════════════════════════════════════
  const renderDocReview = (docs: OrgDoc[]) => {
    const pendingDocs = docs.filter(d => d.status === 'pending_review')
    if (docs.length === 0) return <div className="dp-muted">⚠️ לא נמצאו מסמכים</div>
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="dp-label">📄 מסמכים ({pendingDocs.length} ממתינים)</span>
          {pendingDocs.length > 1 && <button className="dp-btn dp-btn-g" disabled={docBusy} onClick={() => approveAllDocs(docs)}>✓ אשר הכל</button>}
        </div>
        {docs.map(doc => (
          <div key={doc.id} className="dp-doc">
            <div className="dp-doc-row">
              <div style={{ flex: 1 }}>
                <span className="dp-doc-name">{doc.title || DOC_LABELS[doc.type] || doc.type}</span>
                <span className={`dp-badge ${doc.status === 'active' ? 'green' : 'yellow'}`} style={{ marginRight: 8 }}>
                  {doc.status === 'active' ? '✓ אושר' : doc.status === 'draft' ? '📝 טיוטה' : '⏳ ממתין'}
                </span>
                {(doc as any).generated_by === 'system' && <span className="dp-badge" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', marginRight: 4 }}>🤖 נוצר אוטומטית</span>}
              </div>
              {doc.status !== 'active' && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="dp-btn dp-btn-g" disabled={docBusy} onClick={() => approveDoc(doc.id)}>✓ אשר</button>
                  <button className="dp-btn" onClick={() => { setEditingDoc(doc.id); setEditContent(doc.content || ''); setExpandedDoc(doc.id) }}>✏️ ערוך</button>
                  <button className="dp-btn" onClick={() => { setRegenId(regenId === doc.id ? null : doc.id); setRegenFeedback('') }}>🔄</button>
                </div>
              )}
            </div>

            {regenId === doc.id && (
              <div style={{ marginTop: 8, padding: 10, background: '#fefce8', borderRadius: 8 }}>
                <textarea className="dp-textarea" placeholder="הערות ליצירה מחדש..." value={regenFeedback} onChange={e => setRegenFeedback(e.target.value)} rows={2} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="dp-btn dp-btn-p" disabled={docBusy || !regenFeedback.trim()} onClick={() => regenDoc(doc.id)}>{docBusy ? '...' : '🔄 צור מחדש'}</button>
                  <button className="dp-btn" onClick={() => setRegenId(null)}>ביטול</button>
                </div>
              </div>
            )}

            {expandedDoc === doc.id ? (
              <div style={{ marginTop: 8 }}>
                {editingDoc === doc.id ? (
                  <>
                    <textarea className="dp-textarea" value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="dp-btn dp-btn-p" disabled={docBusy} onClick={() => editDoc(doc.id)}>{docBusy ? '...' : '💾 שמור ואשר'}</button>
                      <button className="dp-btn" onClick={() => { setEditingDoc(null); setExpandedDoc(null) }}>ביטול</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dp-doc-text">{doc.content}</div>
                    <button className="dp-btn" style={{ marginTop: 6 }} onClick={() => setExpandedDoc(null)}>סגור ▲</button>
                  </>
                )}
              </div>
            ) : (
              <div className="dp-doc-preview" onClick={() => { setExpandedDoc(doc.id); setEditingDoc(null) }}>
                {(doc.content || '').slice(0, 150)}... <span style={{ color: '#4f46e5', cursor: 'pointer' }}>קרא עוד ▼</span>
              </div>
            )}
          </div>
        ))}
      </>
    )
  }

  // ═══════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════
  if (loading) return (
    <div className="dp-loading"><div className="dp-spinner" /><p>טוען לוח בקרה...</p></div>
  )

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>
      <div className="dp" dir="rtl">

        {/* ═══════════════════════════════════════════
            NAV BAR
        ═══════════════════════════════════════════ */}
        <nav className="dp-nav">
          <div className="dp-nav-r">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={100} height={31} className="dp-logo" />
            <span className="dp-sep">|</span>
            <span className="dp-name">{DPO_NAME}</span>
          </div>
          {view === 'tabs' ? (
            <div className="dp-nav-l">
              {[
                { k: 'inbox' as const, label: 'תיבת דואר', badge: allPending.length },
                { k: 'overview' as const, label: 'סקירה' },
                { k: 'orgs' as const, label: `ארגונים (${orgs.length})` },
              ].map(t => (
                <button key={t.k} className={`dp-tab ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>
                  {t.label}
                  {t.badge ? <span className="dp-tab-badge">{t.badge}</span> : null}
                </button>
              ))}
              {tab === 'inbox' && (
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="dp-select">
                  <option value="all">הכל</option>
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              )}
              <button className="dp-refresh" onClick={loadAll} title="רענן">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              </button>
              <button className="dp-logout" onClick={() => { sessionStorage.removeItem('dpo_session_token'); sessionStorage.removeItem('dpo_session_expires'); router.push('/dpo/login') }}>יציאה</button>
            </div>
          ) : (
            <div className="dp-nav-l">
              <button className="dp-back" onClick={goBack}>→ חזרה</button>
              <button className="dp-refresh" onClick={() => selectedOrg?.organization?.id && loadOrgDetail(selectedOrg.organization.id)} title="רענן">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              </button>
              <button className="dp-logout" onClick={() => { sessionStorage.removeItem('dpo_session_token'); sessionStorage.removeItem('dpo_session_expires'); router.push('/dpo/login') }}>יציאה</button>
            </div>
          )}
        </nav>

        {/* ═══════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════ */}
        <main className="dp-main">

          {/* ═══════════════════════════════════════
              TAB 1: INBOX
          ═══════════════════════════════════════ */}
          {view === 'tabs' && tab === 'inbox' && (
            <div className="dp-inbox">
              {/* KPI strip */}
              <div className="dp-kpi-strip">
                <div className="dp-kpi-chip red">🔴 {allPending.length} ממתינים</div>
                <div className="dp-kpi-chip green">✅ {resolvedCount} טופלו החודש</div>
                <div className="dp-kpi-chip blue">🏢 {orgs.length} ארגונים</div>
                {stats?.ai_approved_count > 0 && <div className="dp-kpi-chip purple">🤖 {stats.ai_approved_count} אושרו ע״י AI</div>}
              </div>

              {/* Pending items */}
              {pending.length > 0 ? (
                <div className="dp-section">
                  <div className="dp-section-head">
                    <h2>דורש טיפול ({pending.length}{typeFilter !== 'all' ? ` מתוך ${allPending.length}` : ''})</h2>
                  </div>
                  {pending.map(item => {
                    const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌', accent: '#71717a' }
                    const isOpen = expandedItem === item.id
                    return (
                      <div key={item.id} className={`dp-row ${isOpen ? 'open' : ''}`}>
                        <div className="dp-row-head" onClick={() => {
                          if (isOpen) { setExpandedItem(null); return }
                          setExpandedItem(item.id); setEditedResponse(item.ai_draft_response || ''); setEditingResp(false); loadCtx(item.id)
                        }}>
                          <div className="dp-row-dot" style={{ background: cfg.accent }} />
                          <span className="dp-row-tag" style={{ color: cfg.accent, background: cfg.accent + '12' }}>{cfg.emoji} {cfg.label}</span>
                          <span className="dp-row-title">{item.title}</span>
                          <span className="dp-row-org" onClick={e => { e.stopPropagation(); goToOrg(item.org_id) }}>{item.organizations?.name}</span>
                          <span className="dp-row-time">{timeAgo(item.created_at)}</span>
                          <span className="dp-row-arrow">{isOpen ? '▲' : '▼'}</span>
                        </div>

                        {isOpen && (
                          <div className="dp-row-body">
                            {loadingCtx ? <div className="dp-spinner" style={{ margin: '24px auto' }} /> : (
                              <>
                                {/* Context chips */}
                                {itemContext && (
                                  <div className="dp-chips">
                                    <span className="dp-chip">ציון: {scoreNum(itemContext.item?.organizations?.compliance_score || 0)}%</span>
                                    <span className="dp-chip">מסמכים: {itemContext.documents?.length || 0}</span>
                                    <span className="dp-chip" style={{ cursor: 'pointer', color: '#4f46e5' }} onClick={() => goToOrg(item.org_id)}>🏢 פתח ארגון →</span>
                                  </div>
                                )}

                                {/* Chat messages */}
                                {itemContext?.messages?.length > 0 && (
                                  <div className="dp-bubbles">
                                    <span className="dp-label">💬 שיחה</span>
                                    {itemContext.messages.slice(-4).map((m: any, i: number) => (
                                      <div key={i} className={`dp-bubble ${m.role === 'user' ? 'u' : 'a'}`}>
                                        <div className="dp-bubble-who">{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                        {(m.content || '').slice(0, 300)}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* AI summary fallback */}
                                {item.ai_summary && !itemContext?.messages?.length && (() => {
                                  const p = parseChat(item.ai_summary)
                                  if (p.isChat) return (
                                    <div className="dp-bubbles">
                                      <span className="dp-label">💬 שיחה</span>
                                      {p.msgs.map((m, i) => (
                                        <div key={i} className={`dp-bubble ${m.role === 'user' ? 'u' : 'a'}`}>
                                          <div className="dp-bubble-who">{m.role === 'user' ? '👤' : '🤖'}</div>{m.text.slice(0, 300)}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                  return <div className="dp-ai-box"><span className="dp-label">✦ ניתוח AI</span>{item.ai_summary.slice(0, 400)}</div>
                                })()}

                                {/* Doc review */}
                                {item.type === 'review' && renderDocReview(itemContext?.documents || [])}

                                {/* Response editor for non-review */}
                                {item.type !== 'review' && (
                                  <div style={{ marginTop: 14 }}>
                                    <span className="dp-label">✏️ תשובה</span>
                                    {editingResp ? (
                                      <textarea className="dp-textarea" value={editedResponse} onChange={e => setEditedResponse(e.target.value)} rows={4} autoFocus />
                                    ) : (
                                      <div className="dp-draft" onClick={() => setEditingResp(true)}>
                                        {item.ai_draft_response?.slice(0, 400) || 'לחץ לכתוב תשובה...'}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="dp-actions">
                                  {item.type === 'review' ? (
                                    <button className="dp-btn dp-btn-p" disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>{resolving ? '...' : '✓ סיים סקירה ועדכן לקוח'}</button>
                                  ) : editingResp ? (
                                    <>
                                      <button className="dp-btn dp-btn-p" disabled={resolving} onClick={() => resolveItem(item, 'edited')}>{resolving ? '...' : '✓ שלח'}</button>
                                      <button className="dp-btn" onClick={() => setEditingResp(false)}>ביטול</button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="dp-btn dp-btn-p" disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>{resolving ? '...' : '✓ אשר ושלח'}</button>
                                      <button className="dp-btn" onClick={() => setEditingResp(true)}>✏️ ערוך</button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="dp-empty">
                  <div style={{ fontSize: 40 }}>✅</div>
                  <h3>אין פריטים ממתינים</h3>
                  <p>הכל מטופל — יופי!</p>
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="dp-btn" onClick={() => setTab('orgs')}>🏢 צפייה בארגונים</button>
                    <button className="dp-btn" onClick={() => setTab('overview')}>📊 סקירה כללית</button>
                  </div>
                </div>
              )}

              {/* Resolved section */}
              {resolved.length > 0 && (
                <div className="dp-section" style={{ marginTop: 24 }}>
                  <div className="dp-section-head" onClick={() => setResolvedCollapsed(!resolvedCollapsed)} style={{ cursor: 'pointer' }}>
                    <h2>✅ הושלם לאחרונה ({resolved.length}) {resolvedCollapsed ? '◀' : '▼'}</h2>
                  </div>
                  {!resolvedCollapsed && resolved.slice(0, 20).map(item => {
                    const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌', accent: '#71717a' }
                    const isOpen = expandedItem === `done-${item.id}`
                    return (
                      <div key={item.id} className={`dp-row resolved ${isOpen ? 'open' : ''}`}>
                        <div className="dp-row-head" onClick={() => {
                          if (isOpen) { setExpandedItem(null); return }
                          setExpandedItem(`done-${item.id}`); loadCtx(item.id)
                        }}>
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                          <span className="dp-row-tag" style={{ color: cfg.accent, background: cfg.accent + '12' }}>{cfg.emoji} {cfg.label}</span>
                          <span className="dp-row-title">{item.title}</span>
                          <span className="dp-row-org" onClick={e => { e.stopPropagation(); goToOrg(item.org_id) }}>{item.organizations?.name}</span>
                          <span className="dp-row-time">{timeAgo(item.resolved_at || item.created_at)}</span>
                          <span className="dp-row-arrow">{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {isOpen && (
                          <div className="dp-row-body">
                            {loadingCtx ? <div className="dp-spinner" style={{ margin: '20px auto' }} /> : (
                              <>
                                <div className="dp-chips">
                                  <span className="dp-chip">🕐 {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString('he-IL') : '—'}</span>
                                  <span className="dp-chip">{cfg.emoji} {cfg.label}</span>
                                  <span className="dp-chip">🏢 {item.organizations?.name}</span>
                                </div>
                                {item.ai_summary && <div className="dp-ai-box"><span className="dp-label">✦ ניתוח AI</span>{item.ai_summary.slice(0, 400)}</div>}
                                {itemContext?.messages?.length > 0 && (
                                  <div className="dp-bubbles">
                                    <span className="dp-label">💬 שיחה</span>
                                    {itemContext.messages.slice(-4).map((m: any, i: number) => (
                                      <div key={i} className={`dp-bubble ${m.role === 'user' ? 'u' : 'a'}`}>
                                        <div className="dp-bubble-who">{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                        {(m.content || '').slice(0, 200)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {item.ai_draft_response && (
                                  <div style={{ marginTop: 12 }}>
                                    <span className="dp-label">📝 תשובת הממונה</span>
                                    <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRight: '3px solid #22c55e', borderRadius: 8, fontSize: 13, lineHeight: 1.7 }}>{item.ai_draft_response}</div>
                                  </div>
                                )}
                                <div className="dp-actions">
                                  <button className="dp-btn" onClick={() => goToOrg(item.org_id)}>🏢 פתח ארגון</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════
              TAB 2: OVERVIEW
          ═══════════════════════════════════════ */}
          {view === 'tabs' && tab === 'overview' && (
            <div className="dp-overview">
              {/* KPI Cards */}
              <div className="dp-kpi-grid">
                {[
                  { num: orgs.length, label: 'ארגונים פעילים', icon: '🏢', color: '#4f46e5' },
                  { num: allPending.length, label: 'ממתינים לטיפול', icon: '⏳', color: allPending.length > 0 ? '#ef4444' : '#22c55e' },
                  { num: resolvedCount, label: 'טופלו החודש', icon: '✅', color: '#22c55e' },
                  { num: stats?.ai_approved_count || 0, label: 'אושרו ע״י AI', icon: '🤖', color: '#8b5cf6' },
                  { num: `${avgScore}%`, label: 'ציון ממוצע', icon: '📊', color: scoreColor(avgScore) },
                  { num: `${stats?.avg_time_seconds ? Math.round(stats.avg_time_seconds / 60) : 0} דק׳`, label: 'זמן טיפול ממוצע', icon: '⏱️', color: '#71717a' },
                ].map((k, i) => (
                  <div key={i} className="dp-kpi-card">
                    <div className="dp-kpi-icon">{k.icon}</div>
                    <div className="dp-kpi-num" style={{ color: k.color }}>{k.num}</div>
                    <div className="dp-kpi-lbl">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="dp-charts">
                {/* Compliance Distribution — shows first (right) in RTL */}
                <div className="dp-chart-card">
                  <h3 className="dp-chart-title">התפלגות ציון ציות</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={complianceDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                          {complianceDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: scoreColor(avgScore) }}>{avgScore}%</span>
                        <div style={{ fontSize: 11, color: '#71717a' }}>ממוצע</div>
                      </div>
                      {complianceDist.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{d.name}</span>
                          <span style={{ fontWeight: 700 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Queue by type */}
                <div className="dp-chart-card">
                  <h3 className="dp-chart-title">פריטים ממתינים לפי סוג</h3>
                  {queueByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={queueByType} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} orientation="right" />
                        <Tooltip formatter={(v: any) => [v, 'פריטים']} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {queueByType.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: 30, textAlign: 'center', color: '#a1a1aa' }}>✅ אין פריטים ממתינים</div>
                  )}
                </div>
              </div>

              {/* Bottom panels */}
              <div className="dp-charts">
                {/* New orgs */}
                <div className="dp-chart-card">
                  <h3 className="dp-chart-title">🆕 ארגונים חדשים (7 ימים)</h3>
                  {(() => {
                    const week = new Date(); week.setDate(week.getDate() - 7)
                    const newOrgs = orgs.filter(o => new Date(o.created_at) > week)
                    if (newOrgs.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#a1a1aa' }}>אין ארגונים חדשים</div>
                    return newOrgs.slice(0, 8).map(o => (
                      <div key={o.id} className="dp-mini-row" onClick={() => goToOrg(o.id)}>
                        <span style={{ fontWeight: 600, flex: 1 }}>{o.name}</span>
                        <span style={{ color: scoreColor(scoreNum(o.compliance_score)), fontWeight: 700, fontSize: 13 }}>{scoreNum(o.compliance_score)}%</span>
                        <span className="dp-row-time">{timeAgo(o.created_at)}</span>
                      </div>
                    ))
                  })()}
                </div>

                {/* Risk alerts */}
                <div className="dp-chart-card">
                  <h3 className="dp-chart-title">⚠️ התראות סיכון</h3>
                  {(() => {
                    const alerts: { org: any; reason: string; severity: string }[] = []
                    orgs.forEach(o => {
                      if (scoreNum(o.compliance_score) < 30 && scoreNum(o.compliance_score) > 0) alerts.push({ org: o, reason: `ציון נמוך: ${scoreNum(o.compliance_score)}%`, severity: 'red' })
                      if ((o.pending_count || 0) >= 3) alerts.push({ org: o, reason: `${o.pending_count} פריטים ממתינים`, severity: 'yellow' })
                    })
                    if (alerts.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#22c55e' }}>✅ אין התראות</div>
                    return alerts.slice(0, 8).map((a, i) => (
                      <div key={i} className="dp-mini-row" onClick={() => goToOrg(a.org.id)}>
                        <span style={{ color: a.severity === 'red' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{a.severity === 'red' ? '🔴' : '🟡'}</span>
                        <span style={{ fontWeight: 600, flex: 1 }}>{a.org.name}</span>
                        <span style={{ fontSize: 12, color: '#71717a' }}>{a.reason}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              TAB 3: ORGANIZATIONS TABLE
          ═══════════════════════════════════════ */}
          {view === 'tabs' && tab === 'orgs' && (
            <div className="dp-orgs">
              <div className="dp-table-top">
                <input className="dp-search" placeholder="🔍 חיפוש ארגון..." value={orgSearch} onChange={e => { setOrgSearch(e.target.value); setOrgPage(0) }} />
                <span className="dp-table-count">{sortedOrgs.length} ארגונים</span>
              </div>

              <div className="dp-table-wrap">
                <table className="dp-table">
                  <thead>
                    <tr>
                      {[
                        { k: 'name', l: 'שם הארגון' },
                        { k: 'score', l: 'ציון ציות' },
                        { k: 'pending', l: 'ממתינים' },
                        { k: 'risk', l: 'סיכון' },
                        { k: 'created', l: 'הצטרפות' },
                      ].map(c => (
                        <th key={c.k} onClick={() => toggleSort(c.k)} className="dp-th">
                          {c.l}
                          {sortCol === c.k && <span className="dp-sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrgs.map(org => {
                      const s = scoreNum(org.compliance_score)
                      const riskMap: Record<string, { label: string; color: string }> = {
                        low: { label: 'נמוך', color: '#22c55e' },
                        medium: { label: 'בינוני', color: '#f59e0b' },
                        high: { label: 'גבוה', color: '#ef4444' },
                      }
                      const risk = riskMap[org.risk_level] || { label: '—', color: '#a1a1aa' }
                      return (
                        <tr key={org.id} className="dp-tr" onClick={() => goToOrg(org.id)}>
                          <td className="dp-td dp-td-name">{org.name}</td>
                          <td className="dp-td">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: scoreColor(s), minWidth: 36 }}>{s}%</span>
                              <div style={{ flex: 1, height: 4, background: '#f0f0f0', borderRadius: 2, maxWidth: 60 }}>
                                <div style={{ width: `${s}%`, height: '100%', background: scoreColor(s), borderRadius: 2 }} />
                              </div>
                            </div>
                          </td>
                          <td className="dp-td">
                            {org.pending_count > 0 ? (
                              <span className="dp-badge red">{org.pending_count}</span>
                            ) : (
                              <span style={{ color: '#22c55e' }}>✓</span>
                            )}
                          </td>
                          <td className="dp-td">
                            <span className="dp-risk-dot" style={{ background: risk.color }} />
                            <span style={{ color: risk.color, fontSize: 12 }}>{risk.label}</span>
                          </td>
                          <td className="dp-td dp-td-date">{new Date(org.created_at).toLocaleDateString('he-IL')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalOrgPages > 1 && (
                <div className="dp-pagination">
                  <button className="dp-page-btn" disabled={orgPage === 0} onClick={() => setOrgPage(p => p - 1)}>→ הקודם</button>
                  <span className="dp-page-info">{orgPage + 1} / {totalOrgPages}</span>
                  <button className="dp-page-btn" disabled={orgPage >= totalOrgPages - 1} onClick={() => setOrgPage(p => p + 1)}>הבא ←</button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════
              ORG FULL PAGE
          ═══════════════════════════════════════ */}
          {view === 'org' && selectedOrg && (() => {
            const org = selectedOrg.organization || {}
            const s = scoreNum(org.compliance_score || selectedOrg.compliance?.overall_score)
            const activeDocs = selectedOrg.documents?.filter((d: any) => d.status === 'active').length || 0
            const pendingDocs = selectedOrg.documents?.filter((d: any) => d.status !== 'active').length || 0
            const activeIncidents = selectedOrg.incidents?.filter((i: any) => !['resolved', 'closed'].includes(i.status)).length || 0
            const openRights = selectedOrg.rights_requests?.filter((r: any) => r.status === 'pending' || r.status === 'in_progress').length || 0

            return (
              <div className="dp-org-page">
                {/* Org header */}
                <div className="dp-org-header">
                  <div>
                    <h1 className="dp-org-name">{org.name}</h1>
                    <div className="dp-org-meta">
                      {org.business_id && <span>🏢 {org.business_id}</span>}
                      {selectedOrg.contact_email && <span>📧 {selectedOrg.contact_email}</span>}
                      {org.phone && <span>📞 {org.phone}</span>}
                      <span className="dp-badge" style={{ background: org.tier === 'recommended' ? '#eef2ff' : '#f4f4f5', color: org.tier === 'recommended' ? '#4f46e5' : '#71717a', border: org.tier === 'recommended' ? '1px solid #c7d2fe' : '1px solid #e4e4e7' }}>
                        {org.tier === 'recommended' ? '⭐ חבילה מומלצת' : '📋 חבילה בסיסית'}
                      </span>
                      {org.status && <span style={{ fontSize: 11, color: org.status === 'active' ? '#16a34a' : '#f59e0b' }}>{org.status === 'active' ? '● פעיל' : '● ' + org.status}</span>}
                    </div>
                  </div>
                  <div className="dp-org-score-badge" style={{ borderColor: scoreColor(s) + '40', background: scoreColor(s) + '08' }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: scoreColor(s) }}>{s}%</span>
                    <span style={{ fontSize: 11, color: scoreColor(s) }}>{scoreLabel(s)}</span>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="dp-org-tabs">
                  {[
                    { key: 'overview', label: '📊 סקירה' },
                    { key: 'docs', label: `📄 מסמכים (${selectedOrg.documents?.length || 0})` },
                    { key: 'rights', label: `👤 זכויות (${selectedOrg.rights_requests?.length || 0})` },
                    { key: 'incidents', label: `🚨 אירועים (${selectedOrg.incidents?.length || 0})` },
                    { key: 'ropa', label: `📊 ROPA (${selectedOrg.ropa_activities?.length || 0})` },
                    { key: 'optimizer', label: '🧪 אופטימייזר' },
                    { key: 'messages', label: '💬 הודעות' },
                    { key: 'reminders', label: '⏰ תזכורות' },
                    { key: 'guidelines', label: '📋 הנחיות' },
                    { key: 'activity', label: '📜 פעילות' },
                    { key: 'profile', label: '🏢 פרופיל' },
                  ].map(t => (
                    <button key={t.key} className={`dp-org-tab ${orgTab === t.key ? 'on' : ''}`}
                      onClick={() => setOrgTab(t.key as any)}>{t.label}</button>
                  ))}
                </div>

                {/* Sub-tab content */}
                <div className="dp-org-content">

                  {/* OVERVIEW */}
                  {orgTab === 'overview' && (
                    <>
                      <div className="dp-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                        {[
                          { num: activeDocs, label: 'מסמכים פעילים', color: '#22c55e', icon: '📄' },
                          { num: pendingDocs, label: 'ממתינים', color: pendingDocs > 0 ? '#f59e0b' : '#a1a1aa', icon: '⏳' },
                          { num: activeIncidents, label: 'אירועים פתוחים', color: activeIncidents > 0 ? '#ef4444' : '#22c55e', icon: '🚨' },
                          { num: openRights, label: 'בקשות פתוחות', color: openRights > 0 ? '#3b82f6' : '#a1a1aa', icon: '👤' },
                          { num: selectedOrg.ropa_activities?.length || 0, label: 'פעילויות ROPA', color: '#8b5cf6', icon: '📊' },
                          { num: selectedOrg.time_this_month_minutes || 0, label: 'דקות DPO החודש', color: '#71717a', icon: '⏱️' },
                        ].map((k, i) => (
                          <div key={i} className="dp-kpi-card">
                            <div className="dp-kpi-icon">{k.icon}</div>
                            <div className="dp-kpi-num" style={{ color: k.color }}>{k.num}</div>
                            <div className="dp-kpi-lbl">{k.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Activity timeline */}
                      <div style={{ marginTop: 16 }}>
                        <span className="dp-label">📜 פעילות אחרונה</span>
                        {(() => {
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
                          if (events.length === 0) return <p className="dp-muted">אין פעילות</p>
                          return events.slice(0, 10).map((ev, i) => (
                            <div key={i} className="dp-mini-row">
                              <span style={{ color: ev.color, fontWeight: 700 }}>{ev.icon}</span>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.text}</span>
                              <span className="dp-row-time">{timeAgo(ev.date)}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </>
                  )}

                  {/* DOCS - Full version management */}
                  {orgTab === 'docs' && (
                    <div>
                      {selectedOrg.documents?.filter((d: any) => d.status !== 'active').length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, marginBottom: 14 }}>
                          <span style={{ fontSize: 13, color: '#854d0e', fontWeight: 600 }}>
                            ⏳ {selectedOrg.documents.filter((d: any) => d.status !== 'active').length} מסמכים ממתינים לאישור
                          </span>
                          <button className="dp-btn dp-btn-g" disabled={modalDocBusy} onClick={async () => {
                            setModalDocBusy(true)
                            for (const d of selectedOrg.documents.filter((doc: any) => doc.status !== 'active')) {
                              await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: d.id }) })
                            }
                            toast('✅ כל המסמכים אושרו')
                            loadOrgDetail(selectedOrg.organization.id)
                            setModalDocBusy(false)
                          }}>{modalDocBusy ? '...' : '✓ אשר הכל'}</button>
                        </div>
                      )}
                      {!selectedOrg.documents?.length ? (
                        <p className="dp-muted">אין מסמכים</p>
                      ) : (() => {
                        const grouped: Record<string, any[]> = {}
                        for (const d of selectedOrg.documents) {
                          const key = d.type || 'other'
                          if (!grouped[key]) grouped[key] = []
                          grouped[key].push(d)
                        }
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
                            <div key={type} className="dp-doc-group">
                              <div className="dp-doc-group-head">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14 }}>{DOC_LABELS[type] || type}</span>
                                  <span style={{ fontSize: 11, color: '#a1a1aa' }}>{docs.length} {docs.length > 1 ? 'גרסאות' : 'גרסה'}</span>
                                  {latest.generated_by === 'system' && <span style={{ fontSize: 10, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>🤖 AI</span>}
                                </div>
                                {latest.status === 'active' && latest.version && (
                                  <span className="dp-badge green">🔒 v{latest.version}</span>
                                )}
                              </div>
                              <div style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className={`dp-badge ${latest.status === 'active' ? 'green' : 'yellow'}`}>
                                      {latest.status === 'active' ? '✓ פעיל' : latest.status === 'draft' ? '📝 טיוטה' : '⏳ ממתין'}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#a1a1aa' }}>{new Date(latest.created_at).toLocaleDateString('he-IL')}</span>
                                    {latest.version && <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>v{latest.version}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {latest.status !== 'active' && (
                                      <>
                                        <button className="dp-btn dp-btn-g" disabled={modalDocBusy} onClick={() => modalFinalizeDoc(latest.id, (latest.version || 0) + 1)}>🔒 סמן סופי</button>
                                        <button className="dp-btn dp-btn-g" disabled={modalDocBusy} onClick={() => modalApproveDoc(latest.id)}>✓ אשר</button>
                                      </>
                                    )}
                                    <button className="dp-btn" onClick={() => {
                                      if (modalEditDoc === latest.id) { setModalEditDoc(null) }
                                      else { setModalEditDoc(latest.id); setModalEditContent(latest.content || '') }
                                    }}>{modalEditDoc === latest.id ? '▲ סגור' : '✏️ ערוך'}</button>
                                    {confirmDeleteId === latest.id ? (
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="dp-btn" style={{ color: '#ef4444' }} disabled={modalDocBusy} onClick={() => modalDeleteDoc(latest.id)}>✓ מחק</button>
                                        <button className="dp-btn" onClick={() => setConfirmDeleteId(null)}>ביטול</button>
                                      </div>
                                    ) : (
                                      <button className="dp-btn" style={{ color: '#ef4444' }} onClick={() => setConfirmDeleteId(latest.id)}>🗑️</button>
                                    )}
                                  </div>
                                </div>
                                {modalEditDoc === latest.id ? (
                                  <div>
                                    <textarea className="dp-textarea" value={modalEditContent} onChange={e => setModalEditContent(e.target.value)} rows={12} />
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                      <button className="dp-btn dp-btn-p" disabled={modalDocBusy} onClick={() => modalEditSave(latest.id)}>{modalDocBusy ? '...' : '💾 שמור ואשר'}</button>
                                      <button className="dp-btn" onClick={() => setModalEditDoc(null)}>ביטול</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="dp-doc-content">{(latest.content || '').slice(0, 800)}{latest.content?.length > 800 ? '...' : ''}</div>
                                )}
                              </div>
                              {history.length > 0 && (
                                <div style={{ borderTop: '1px solid #f0f0f0' }}>
                                  <button className="dp-version-toggle" onClick={() => setExpandedDocType(isHistoryOpen ? null : type)}>
                                    <span>{isHistoryOpen ? '▼' : '◀'}</span>
                                    <span>היסטוריה — {history.length} גרסאות קודמות</span>
                                  </button>
                                  {isHistoryOpen && (
                                    <div style={{ padding: '0 14px 12px' }}>
                                      {history.map((d: any) => (
                                        <div key={d.id} className="dp-version-item">
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <span style={{ fontSize: 11, color: '#a1a1aa' }}>{new Date(d.created_at).toLocaleDateString('he-IL')}</span>
                                              <span className="dp-badge">{d.status === 'active' ? 'אושר' : d.status === 'draft' ? 'טיוטה' : d.status}</span>
                                              {d.version && <span style={{ fontSize: 10, color: '#4f46e5' }}>v{d.version}</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                              <button className="dp-btn dp-btn-xs" onClick={() => {
                                                if (modalEditDoc === d.id) { setModalEditDoc(null) }
                                                else { setModalEditDoc(d.id); setModalEditContent(d.content || '') }
                                              }}>{modalEditDoc === d.id ? '▲' : '👁️'}</button>
                                              {confirmDeleteId === d.id ? (
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                  <button className="dp-btn dp-btn-xs" style={{ color: '#ef4444' }} disabled={modalDocBusy} onClick={() => modalDeleteDoc(d.id)}>✓</button>
                                                  <button className="dp-btn dp-btn-xs" onClick={() => setConfirmDeleteId(null)}>✕</button>
                                                </div>
                                              ) : (
                                                <button className="dp-btn dp-btn-xs" style={{ color: '#ef4444' }} onClick={() => setConfirmDeleteId(d.id)}>🗑️</button>
                                              )}
                                            </div>
                                          </div>
                                          {modalEditDoc === d.id && (
                                            <div style={{ marginTop: 6 }}>
                                              <textarea className="dp-textarea" value={modalEditContent} onChange={e => setModalEditContent(e.target.value)} rows={8} />
                                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                <button className="dp-btn dp-btn-p" disabled={modalDocBusy} onClick={() => modalEditSave(d.id)}>{modalDocBusy ? '...' : '💾 שמור'}</button>
                                                <button className="dp-btn" onClick={() => setModalEditDoc(null)}>ביטול</button>
                                              </div>
                                            </div>
                                          )}
                                          {modalEditDoc !== d.id && (
                                            <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>{(d.content || '').slice(0, 150)}...</div>
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
                        <p className="dp-muted">אין בקשות זכויות נושאי מידע</p>
                      ) : (
                        <>
                          <div className="dp-chips" style={{ marginBottom: 12 }}>
                            <span className="dp-chip" style={{ background: '#fef3c7' }}>⏳ ממתין: {selectedOrg.rights_requests.filter((r: any) => r.status === 'pending').length}</span>
                            <span className="dp-chip" style={{ background: '#dbeafe' }}>🔄 בטיפול: {selectedOrg.rights_requests.filter((r: any) => r.status === 'in_progress').length}</span>
                            <span className="dp-chip" style={{ background: '#dcfce7' }}>✓ הושלם: {selectedOrg.rights_requests.filter((r: any) => r.status === 'completed').length}</span>
                          </div>
                          {selectedOrg.rights_requests.map((req: any) => {
                            const typeLabels: Record<string, string> = { access: 'עיון', rectification: 'תיקון', erasure: 'מחיקה', objection: 'התנגדות' }
                            const statusColors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#22c55e', rejected: '#ef4444' }
                            const statusLabels: Record<string, string> = { pending: 'ממתין', in_progress: 'בטיפול', completed: 'הושלם', rejected: 'נדחה' }
                            const daysLeft = req.deadline ? Math.ceil((new Date(req.deadline).getTime() - Date.now()) / 86400000) : null
                            return (
                              <div key={req.id} className="dp-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                  <div>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{req.requester_name || 'לא צוין'}</span>
                                    <span style={{ fontSize: 12, color: '#71717a', marginRight: 8 }}>{req.requester_email}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span className="dp-badge" style={{ background: (statusColors[req.status] || '#71717a') + '15', color: statusColors[req.status] }}>{statusLabels[req.status] || req.status}</span>
                                    {daysLeft !== null && req.status !== 'completed' && req.status !== 'rejected' && (
                                      <span style={{ fontSize: 10, fontWeight: 700, color: daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : '#22c55e' }}>
                                        {daysLeft > 0 ? `${daysLeft} ימים` : `חריגה ${Math.abs(daysLeft)} ימים`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 12, color: '#71717a' }}>
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
                        <p className="dp-muted">אין אירועי אבטחה</p>
                      ) : (() => {
                        const active = selectedOrg.incidents.filter((i: any) => !['resolved', 'closed'].includes(i.status))
                        const closed = selectedOrg.incidents.filter((i: any) => ['resolved', 'closed'].includes(i.status))
                        const sevColors: Record<string, string> = { critical: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
                        const sevLabels: Record<string, string> = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' }
                        const statLabels: Record<string, string> = { new: 'חדש', investigating: 'בבדיקה', contained: 'נבלם', resolved: 'טופל', closed: 'סגור' }
                        const renderInc = (inc: any) => {
                          const isAct = !['resolved', 'closed'].includes(inc.status)
                          const deadline = inc.authority_deadline ? new Date(inc.authority_deadline) : null
                          const hoursLeft = deadline ? Math.floor((deadline.getTime() - Date.now()) / 3600000) : null
                          return (
                            <div key={inc.id} className="dp-card" style={{ borderRight: `3px solid ${sevColors[inc.severity] || '#71717a'}`, borderColor: isAct ? undefined : '#e4e4e7' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{inc.title}</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span className="dp-badge" style={{ background: (sevColors[inc.severity] || '#71717a') + '15', color: sevColors[inc.severity] }}>{sevLabels[inc.severity] || inc.severity}</span>
                                  <span className="dp-badge" style={{ background: isAct ? '#fef3c7' : '#f0fdf4', color: isAct ? '#92400e' : '#166534' }}>{statLabels[inc.status] || inc.status}</span>
                                </div>
                              </div>
                              {inc.description && <p style={{ fontSize: 12, color: '#52525b', marginTop: 4, lineHeight: 1.5 }}>{(inc.description || '').slice(0, 200)}</p>}
                              <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: '#a1a1aa', flexWrap: 'wrap' }}>
                                <span>{new Date(inc.created_at).toLocaleDateString('he-IL')}</span>
                                {inc.incident_type && <span>{inc.incident_type}</span>}
                                {hoursLeft !== null && isAct && (
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
                            <div className="dp-chips" style={{ marginBottom: 12 }}>
                              <span className="dp-chip" style={{ background: active.length > 0 ? '#fee2e2' : '#dcfce7', fontWeight: 600 }}>
                                {active.length > 0 ? `🔴 ${active.length} פעילים` : '✅ אין אירועים פתוחים'}
                              </span>
                              <span className="dp-chip">{closed.length} סגורים</span>
                            </div>
                            {active.length > 0 && <><span className="dp-label">🚨 פעילים</span>{active.map(renderInc)}</>}
                            {closed.length > 0 && <><span className="dp-label" style={{ marginTop: 16 }}>✅ סגורים</span>{closed.map(renderInc)}</>}
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* ROPA */}
                  {orgTab === 'ropa' && (
                    <div>
                      {!selectedOrg.ropa_activities?.length ? (
                        <p className="dp-muted">אין פעילויות עיבוד מתועדות</p>
                      ) : (
                        <>
                          <div className="dp-chips" style={{ marginBottom: 12 }}>
                            <span className="dp-chip" style={{ fontWeight: 600 }}>📊 {selectedOrg.ropa_activities.length} פעילויות</span>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="dp-table">
                              <thead>
                                <tr>
                                  {['פעילות', 'מטרה', 'בסיס משפטי', 'רגישות', 'מעודכן'].map(h => <th key={h} className="dp-th">{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedOrg.ropa_activities.map((act: any) => {
                                  const riskColors: Record<string, string> = { high: '#dc2626', medium: '#f59e0b', low: '#22c55e' }
                                  const riskLabels: Record<string, string> = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }
                                  const basisLabels: Record<string, string> = { consent: 'הסכמה', contract: 'חוזה', legal_obligation: 'חובה חוקית', vital_interest: 'אינטרס חיוני', public_interest: 'אינטרס ציבורי', legitimate_interest: 'אינטרס לגיטימי' }
                                  return (
                                    <tr key={act.id} className="dp-tr">
                                      <td className="dp-td" style={{ fontWeight: 500 }}>{act.name || act.activity_name || '-'}</td>
                                      <td className="dp-td" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.purpose || '-'}</td>
                                      <td className="dp-td"><span className="dp-badge">{basisLabels[act.legal_basis] || act.legal_basis || '-'}</span></td>
                                      <td className="dp-td"><span style={{ fontWeight: 600, color: riskColors[act.sensitivity_level || act.risk_level] || '#71717a' }}>{riskLabels[act.sensitivity_level || act.risk_level] || '-'}</span></td>
                                      <td className="dp-td dp-td-date">{act.updated_at ? new Date(act.updated_at).toLocaleDateString('he-IL') : new Date(act.created_at).toLocaleDateString('he-IL')}</td>
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

                  {/* MESSAGES */}
                  {orgTab === 'messages' && (
                    <div>
                      {selectedOrg.queue_history?.filter((q: any) => q.type === 'escalation').length > 0 ? (
                        <div style={{ marginBottom: 16 }}>
                          <span className="dp-label">💬 היסטוריית שיחות</span>
                          {selectedOrg.queue_history.filter((q: any) => q.type === 'escalation').slice(0, 5).map((q: any) => (
                            <div key={q.id} className="dp-mini-row">
                              <span style={{ color: q.status === 'resolved' ? '#22c55e' : '#f59e0b' }}>{q.status === 'resolved' ? '✓' : '●'}</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{q.title}</span>
                                {q.ai_draft_response && <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{q.ai_draft_response.slice(0, 100)}</p>}
                              </div>
                              <span className="dp-row-time">{timeAgo(q.resolved_at || q.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="dp-muted" style={{ marginBottom: 16 }}>אין שיחות קודמות עם ארגון זה</p>
                      )}
                      <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <span className="dp-label" style={{ marginTop: 0 }}>💬 שלח הודעה חדשה</span>
                        <textarea value={composeMsg} onChange={e => setComposeMsg(e.target.value)} placeholder="כתוב הודעה ללקוח..."
                          className="dp-textarea" style={{ marginTop: 8 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          {composeSent ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>✓ נשלח בהצלחה</span> : <span />}
                          <button className="dp-btn dp-btn-p" disabled={!composeMsg.trim() || composeSending}
                            onClick={() => sendDpoMessage(org.id, org.name)}>{composeSending ? '...' : '📤 שלח'}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REMINDERS */}
                  {orgTab === 'reminders' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {REMINDERS.map(r => (
                        <div key={r.id} className="dp-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                          <span style={{ fontSize: 18 }}>{r.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</p>
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
                        <div key={i} style={{ padding: 12, background: '#eef2ff', borderRadius: 8, borderRight: '3px solid #4f46e5' }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{g.emoji} {g.title}</p>
                          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{g.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIVITY LOG */}
                  {orgTab === 'activity' && (
                    <div>
                      {!selectedOrg.queue_history?.length ? (
                        <p className="dp-muted">אין פעילות</p>
                      ) : selectedOrg.queue_history.map((q: any) => {
                        const c = TYPE_MAP[q.type] || { emoji: '📌', label: q.type, accent: '#71717a' }
                        return (
                          <div key={q.id} className="dp-mini-row" style={{ borderBottom: '1px solid #f4f4f5' }}>
                            <span style={{ color: q.status === 'resolved' ? '#22c55e' : '#f59e0b' }}>{q.status === 'resolved' ? '✓' : '●'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.emoji} {q.title}</span>
                              {q.ai_summary && <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{(q.ai_summary || '').slice(0, 120)}</p>}
                            </div>
                            <span className="dp-row-time">{timeAgo(q.resolved_at || q.created_at)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* OPTIMIZER */}
                  {orgTab === 'optimizer' && (
                    <DatabaseOptimizer
                      orgId={selectedOrg.id}
                      orgName={selectedOrg.name}
                      dpoFetch={dpoFetch}
                      onBack={() => setOrgTab('overview')}
                    />
                  )}

                  {/* PROFILE */}
                  {orgTab === 'profile' && (
                    <div>
                      {/* v3 Answers (detailed onboarding) */}
                      {selectedOrg.profile?.v3Answers && Object.keys(selectedOrg.profile.v3Answers).length > 0 ? (() => {
                        const v3 = selectedOrg.profile.v3Answers
                        const V3_LABELS: Record<string, string> = {
                          bizName: 'שם העסק', companyId: 'ח.פ / עוסק מורשה', industry: 'תחום פעילות',
                          databases: 'מאגרי מידע', processors: 'ספקי עיבוד', customProcessors: 'ספקים נוספים',
                          storage: 'אחסון מידע', accessControl: 'בקרת גישה', hasConsent: 'מנגנון הסכמה',
                          securityOwner: 'אחראי אבטחה', securityOwnerName: 'שם אחראי אבטחה',
                          hasCameras: 'מצלמות אבטחה', hasCvs: 'קורות חיים', hasEmployees: 'עובדים',
                          customDatabases: 'מאגרים נוספים', customStorage: 'אחסון נוסף',
                        }
                        const DB_LABELS: Record<string, string> = {
                          customers: 'לקוחות', employees: 'עובדים', suppliers: 'ספקים', leads: 'לידים',
                          patients: 'מטופלים', students: 'סטודנטים', members: 'חברי מועדון',
                          website: 'משתמשי אתר', cameras: 'מצלמות', cvs: 'קורות חיים'
                        }
                        const entries = Object.entries(v3).filter(([k]) => k !== 'dbDetails')
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {entries.map(([key, val]) => (
                              <div key={key} style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8 }}>
                                <p style={{ fontSize: 11, color: '#71717a', marginBottom: 2 }}>{V3_LABELS[key] || key}</p>
                                <p style={{ fontSize: 13, fontWeight: 500 }}>
                                  {Array.isArray(val)
                                    ? (val as string[]).map(v => key === 'databases' ? (DB_LABELS[v] || v) : v).join(', ')
                                    : typeof val === 'boolean' ? (val ? 'כן' : 'לא')
                                    : String(val || '-')}
                                </p>
                              </div>
                            ))}
                            {/* DB Details */}
                            {v3.dbDetails && Object.keys(v3.dbDetails).length > 0 && (
                              <div style={{ gridColumn: '1 / -1', padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                <p style={{ fontSize: 11, color: '#0369a1', marginBottom: 6, fontWeight: 700 }}>פרטי מאגרים</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                                  {Object.entries(v3.dbDetails).map(([db, detail]: [string, any]) => (
                                    <div key={db} style={{ padding: '6px 10px', background: '#fff', borderRadius: 6, fontSize: 12 }}>
                                      <span style={{ fontWeight: 600 }}>{DB_LABELS[db] || db}</span>
                                      {detail.size && <span style={{ color: '#71717a', marginRight: 6 }}>({detail.size})</span>}
                                      {detail.fields?.length > 0 && <p style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>שדות: {detail.fields.join(', ')}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })() : selectedOrg.profile?.answers ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {selectedOrg.profile.answers.map((a: any) => (
                            <div key={a.questionId} style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8 }}>
                              <p style={{ fontSize: 11, color: '#71717a', marginBottom: 2 }}>{PROFILE_LABELS[a.questionId] || a.questionId}</p>
                              <p style={{ fontSize: 13, fontWeight: 500 }}>
                                {Array.isArray(a.value) ? a.value.join(', ') : typeof a.value === 'boolean' ? (a.value ? 'כן' : 'לא') : String(a.value || '-')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="dp-muted">אין נתוני פרופיל</p>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )
          })()}

        </main>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}

/* ── Base ── */
.dp{font-family:'Heebo',sans-serif;background:#f8f9fb;min-height:100vh;color:#18181b}

/* ── Nav ── */
.dp-nav{display:flex;align-items:center;justify-content:space-between;padding:8px 20px;border-bottom:1px solid #e4e4e7;background:#fff;position:sticky;top:0;z-index:20;gap:8px;flex-wrap:wrap}
.dp-nav-r{display:flex;align-items:center;gap:10px}
.dp-nav-l{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dp-logo{font-size:16px;font-weight:900;background:linear-gradient(135deg,#312e81,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.dp-sep{color:#d4d4d8}
.dp-name{font-size:13px;color:#71717a}
.dp-tab{padding:6px 14px;border-radius:8px;font-size:13px;font-weight:500;border:none;background:none;color:#71717a;cursor:pointer;font-family:inherit;transition:all .15s}
.dp-tab:hover{background:#f4f4f5}
.dp-tab.on{background:#18181b;color:#fff}
.dp-tab-badge{font-size:10px;background:#ef4444;color:#fff;padding:1px 6px;border-radius:10px;margin-right:4px}
.dp-select{padding:5px 10px;border-radius:6px;font-size:12px;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;font-family:inherit}
.dp-refresh{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid #e4e4e7;background:#fff;color:#71717a;cursor:pointer;transition:all .15s}
.dp-refresh:hover{background:#eef2ff;border-color:#c7d2fe;color:#4f46e5}
.dp-refresh:active{transform:rotate(180deg)}
.dp-back{padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e4e4e7;background:#fff;color:#4f46e5;cursor:pointer;font-family:inherit}
.dp-back:hover{background:#eef2ff}
.dp-logout{padding:4px 10px;border-radius:6px;font-size:11px;border:1px solid #e4e4e7;background:none;cursor:pointer;color:#71717a;font-family:inherit}

/* ── Main ── */
.dp-main{max-width:1100px;margin:0 auto;padding:20px 16px 60px}

/* ── Loading ── */
.dp-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;gap:12px;color:#71717a}
.dp-spinner{width:24px;height:24px;border:3px solid #e4e4e7;border-top:3px solid #4f46e5;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── KPI Strip (inbox) ── */
.dp-kpi-strip{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.dp-kpi-chip{padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;background:#fff;border:1px solid #f0f0f0}
.dp-kpi-chip.red{border-color:#fecaca;color:#dc2626;background:#fef2f2}
.dp-kpi-chip.green{border-color:#bbf7d0;color:#166534;background:#f0fdf4}
.dp-kpi-chip.blue{border-color:#bfdbfe;color:#1e40af;background:#eff6ff}
.dp-kpi-chip.purple{border-color:#ddd6fe;color:#6d28d9;background:#f5f3ff}

/* ── KPI Grid (overview + org) ── */
.dp-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.dp-kpi-card{text-align:center;padding:16px 12px;background:#fff;border:1px solid #f0f0f0;border-radius:12px;transition:box-shadow .15s}
.dp-kpi-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.dp-kpi-icon{font-size:16px;margin-bottom:4px}
.dp-kpi-num{font-size:24px;font-weight:900;line-height:1.1}
.dp-kpi-lbl{font-size:11px;color:#71717a;margin-top:3px}

/* ── Charts ── */
.dp-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:20px}
.dp-chart-card{background:#fff;border:1px solid #f0f0f0;border-radius:12px;padding:20px}
.dp-chart-title{font-size:14px;font-weight:700;color:#27272a;margin-bottom:14px}

/* ── Section ── */
.dp-section{margin-bottom:8px}
.dp-section-head{padding:6px 0;margin-bottom:8px}
.dp-section-head h2{font-size:14px;font-weight:700;color:#52525b;margin:0}

/* ── Queue Row (inbox) ── */
.dp-row{background:#fff;border:1px solid #f0f0f0;border-radius:10px;margin-bottom:6px;overflow:hidden;transition:border-color .15s,box-shadow .15s}
.dp-row:hover{border-color:#d4d4d8}
.dp-row.open{border-color:#c7d2fe;box-shadow:0 2px 12px rgba(79,70,229,0.06)}
.dp-row.resolved{opacity:0.8}.dp-row.resolved.open{opacity:1}
.dp-row-head{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;flex-wrap:wrap}
.dp-row-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dp-row-tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;white-space:nowrap}
.dp-row-title{flex:1;font-size:14px;font-weight:600;color:#18181b;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dp-row-org{font-size:12px;color:#4f46e5;cursor:pointer;white-space:nowrap;text-decoration:underline}
.dp-row-org:hover{color:#312e81}
.dp-row-time{font-size:11px;color:#a1a1aa;white-space:nowrap}
.dp-row-arrow{font-size:11px;color:#a1a1aa}
.dp-row-body{padding:0 16px 16px;border-top:1px solid #f4f4f5}

/* ── Shared: bubbles, chips, buttons ── */
.dp-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.dp-chip{font-size:12px;padding:3px 10px;border-radius:6px;background:#f4f4f5;border:1px solid #e4e4e7;white-space:nowrap}
.dp-label{display:block;font-size:12px;font-weight:700;color:#71717a;margin:12px 0 6px}
.dp-muted{color:#a1a1aa;text-align:center;padding:20px;font-size:13px}

.dp-bubbles{margin:10px 0}
.dp-bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;margin:4px 0;max-width:85%}
.dp-bubble.u{background:#eef2ff;margin-left:auto;border-bottom-left-radius:4px}
.dp-bubble.a{background:#f4f4f5;margin-right:auto;border-bottom-right-radius:4px}
.dp-bubble-who{font-size:10px;font-weight:700;color:#71717a;margin-bottom:3px}

.dp-ai-box{margin:10px 0;padding:12px 14px;background:#fefce8;border-radius:10px;border:1px solid #fef08a;font-size:13px;line-height:1.6}

.dp-draft{padding:12px 14px;background:#fafafa;border:1px dashed #d4d4d8;border-radius:8px;cursor:pointer;font-size:13px;line-height:1.6;color:#52525b}
.dp-draft:hover{background:#f4f4f5}

.dp-textarea{width:100%;padding:10px 12px;border:1px solid #d4d4d8;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:60px;line-height:1.6}
.dp-textarea:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 2px rgba(79,70,229,0.1)}

.dp-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}

/* Buttons */
.dp-btn{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #e4e4e7;background:#fff;color:#52525b;cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap}
.dp-btn:hover{background:#f4f4f5}
.dp-btn:disabled{opacity:0.5;cursor:not-allowed}
.dp-btn-p{background:#4f46e5;color:#fff;border-color:#4f46e5}
.dp-btn-p:hover{background:#4338ca}
.dp-btn-g{background:#f0fdf4;color:#166534;border-color:#bbf7d0}
.dp-btn-g:hover{background:#dcfce7}
.dp-btn-xs{padding:2px 6px;font-size:10px;border-radius:4px}

/* Badge */
.dp-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;background:#f4f4f5;color:#71717a;white-space:nowrap}
.dp-badge.green{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.dp-badge.yellow{background:#fefce8;color:#854d0e;border:1px solid #fef08a}
.dp-badge.red{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}

/* ── Empty state ── */
.dp-empty{text-align:center;padding:60px 20px;color:#71717a}
.dp-empty h3{font-size:18px;margin-top:8px;color:#27272a}
.dp-empty p{font-size:13px;margin-top:4px}

/* ── Table (orgs + ropa) ── */
.dp-table-top{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.dp-search{flex:1;min-width:200px;padding:10px 14px;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;font-family:inherit;background:#fff}
.dp-search:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 2px rgba(79,70,229,0.1)}
.dp-table-count{font-size:13px;color:#71717a}
.dp-table-wrap{overflow-x:auto;background:#fff;border:1px solid #f0f0f0;border-radius:12px}
.dp-table{width:100%;border-collapse:collapse;font-size:13px}
.dp-th{padding:12px 14px;text-align:right;font-weight:700;color:#64748b;background:#f8f9fb;border-bottom:2px solid #e4e4e7;cursor:pointer;user-select:none;white-space:nowrap;font-size:12px}
.dp-th:hover{color:#4f46e5}
.dp-sort-arrow{font-size:10px;color:#4f46e5}
.dp-tr{border-bottom:1px solid #f4f4f5;cursor:pointer;transition:background .1s}
.dp-tr:hover{background:#fafafa}
.dp-td{padding:10px 14px;color:#27272a}
.dp-td-name{font-weight:600}
.dp-td-date{color:#a1a1aa;white-space:nowrap;font-size:12px}
.dp-risk-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px;vertical-align:middle}

.dp-pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;padding:12px}
.dp-page-btn{padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #e4e4e7;background:#fff;cursor:pointer;font-family:inherit}
.dp-page-btn:disabled{opacity:0.4;cursor:not-allowed}
.dp-page-btn:not(:disabled):hover{background:#eef2ff;border-color:#c7d2fe}
.dp-page-info{font-size:13px;color:#71717a}

/* ── Org Full Page ── */
.dp-org-page{animation:fadeUp .2s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.dp-org-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e4e4e7;flex-wrap:wrap}
.dp-org-name{font-size:22px;font-weight:800;color:#18181b}
.dp-org-meta{display:flex;gap:12px;font-size:12px;color:#71717a;margin-top:4px;flex-wrap:wrap}
.dp-org-score-badge{padding:10px 20px;border:2px solid;border-radius:14px;text-align:center;display:flex;flex-direction:column;align-items:center}
.dp-org-tabs{display:flex;gap:2px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;border-bottom:1px solid #e4e4e7}
.dp-org-tab{padding:8px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:500;border:none;background:none;color:#71717a;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .12s;border-bottom:2px solid transparent}
.dp-org-tab:hover{color:#27272a;background:#f4f4f5}
.dp-org-tab.on{color:#4f46e5;font-weight:700;border-bottom-color:#4f46e5;background:#eef2ff}
.dp-org-content{min-height:300px}

/* ── Docs (org page) ── */
.dp-doc-group{margin-bottom:16px;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden}
.dp-doc-group-head{padding:10px 14px;background:#f8f9fb;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.dp-doc-content{padding:10px 14px;background:#fafafa;border-radius:8px;font-size:13px;line-height:1.7;max-height:250px;overflow-y:auto;white-space:pre-wrap;border:1px solid #f0f0f0}
.dp-version-toggle{width:100%;padding:8px 14px;border:none;background:#f8f9fb;cursor:pointer;font-size:12px;color:#4f46e5;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:6px;text-align:right}
.dp-version-toggle:hover{background:#eef2ff}
.dp-version-item{padding:8px 10px;margin-top:6px;background:#fafafa;border-radius:6px;border:1px solid #f0f0f0;opacity:0.85}

/* ── Inbox doc review ── */
.dp-doc{padding:10px 12px;background:#fff;border:1px solid #f0f0f0;border-radius:8px;margin-bottom:6px}
.dp-doc-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.dp-doc-name{font-size:13px;font-weight:600}
.dp-doc-preview{padding:8px 12px;margin-top:6px;background:#fafafa;border-radius:6px;font-size:12px;color:#71717a;cursor:pointer;line-height:1.5}
.dp-doc-preview:hover{background:#f0f0f0}
.dp-doc-text{padding:10px 14px;background:#fafafa;border-radius:8px;font-size:13px;line-height:1.7;max-height:300px;overflow-y:auto;white-space:pre-wrap}

/* ── Card (shared) ── */
.dp-card{padding:12px 14px;background:#fff;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:6px}

/* ── Mini row (overview + activity) ── */
.dp-mini-row{display:flex;align-items:center;gap:8px;padding:8px 6px;font-size:13px;cursor:pointer;border-radius:6px;transition:background .1s}
.dp-mini-row:hover{background:#f4f4f5}

/* ── Overview ── */
.dp-overview{animation:fadeUp .2s ease}
.dp-orgs{animation:fadeUp .2s ease}
.dp-inbox{animation:fadeUp .2s ease}

/* ── Mobile ── */
@media(max-width:768px){
  .dp-main{padding:12px 8px 40px}
  .dp-kpi-grid{grid-template-columns:repeat(3,1fr);gap:6px}
  .dp-kpi-num{font-size:18px}
  .dp-charts{grid-template-columns:1fr}
  .dp-row-head{gap:6px;padding:10px 12px}
  .dp-row-title{font-size:13px}
  .dp-row-org{display:none}
  .dp-org-header{flex-direction:column;text-align:center}
  .dp-org-tabs{gap:0}
  .dp-org-tab{padding:6px 10px;font-size:11px}
}
`
