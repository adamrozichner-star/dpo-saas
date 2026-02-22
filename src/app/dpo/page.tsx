'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

// =============================================
// CONFIG
// =============================================
const DPO_NAME = 'עו"ד דנה כהן'
const DPO_INITIALS = 'דכ'
const MONTHLY_QUOTA_HOURS = 12

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
  id: string; name: string; title: string; type: string; status: string
  content: string; created_at: string
}

// =============================================
// HELPERS
// =============================================
const TYPE_MAP: Record<string, { label: string; emoji: string }> = {
  incident: { label: 'אירוע אבטחה', emoji: '🚨' },
  escalation: { label: 'שאלה מסולמת', emoji: '💬' },
  review: { label: 'סקירת מסמכים', emoji: '📄' },
  dsr: { label: 'בקשת מידע', emoji: '📋' },
  onboarding: { label: 'אונבורדינג', emoji: '🏢' },
  document_expiry: { label: 'פג תוקף', emoji: '⏰' },
}

function timeAgo(d: string): string {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `לפני ${m} דק׳`
  const h = Math.floor(m / 60)
  if (h < 24) return `לפני ${h} שעות`
  const days = Math.floor(h / 24)
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

function parseChat(text: string): { isChat: boolean; msgs: { role: string; text: string }[] } {
  if (!text || (!text.includes('assistant:') || !text.includes('user:'))) return { isChat: false, msgs: [] }
  const msgs = text.split('\n').filter(l => l.trim()).map(l => {
    if (l.startsWith('user:')) return { role: 'user', text: l.replace('user:', '').trim() }
    if (l.startsWith('assistant:')) return { role: 'assistant', text: l.replace('assistant:', '').trim() }
    return null
  }).filter(Boolean) as { role: string; text: string }[]
  return { isChat: true, msgs: msgs.slice(-4) }
}

const DOC_LABELS: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות', security_policy: 'נוהל אבטחת מידע',
  dpo_appointment: 'כתב מינוי DPO', database_registration: 'רישום מאגרי מידע',
  ropa: 'מפת עיבוד (ROPA)', consent_form: 'טופס הסכמה',
  procedure: 'נוהל', custom: 'מסמך מותאם'
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [orgs, setOrgs] = useState<any[]>([])

  // Detail state
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [itemContext, setItemContext] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(false)

  // Document review state
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState<string | null>(null)
  const [docAction, setDocAction] = useState(false)

  // Resolve state
  const [resolving, setResolving] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [editingResponse, setEditingResponse] = useState(false)

  // View
  const [tab, setTab] = useState<'inbox' | 'orgs'>('inbox')
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<any>(null)

  // =============================================
  // AUTH & DATA
  // =============================================
  const dpoFetch = async (url: string, opts: RequestInit = {}) => {
    const token = sessionStorage.getItem('dpo_session_token')
    const headers = new Headers(opts.headers)
    if (token) headers.set('x-dpo-token', token)
    if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...opts, headers })
  }

  useEffect(() => {
    const token = sessionStorage.getItem('dpo_session_token')
    const expires = sessionStorage.getItem('dpo_session_expires')
    if (!token || !expires || new Date(expires) < new Date()) {
      router.push('/dpo/login')
    } else {
      loadAll()
    }
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sR, pR, rR, oR] = await Promise.all([
        dpoFetch('/api/dpo?action=stats'),
        dpoFetch('/api/dpo?action=queue&status=pending'),
        dpoFetch('/api/dpo?action=queue&status=resolved&limit=25'),
        dpoFetch('/api/dpo?action=organizations'),
      ])
      const [sD, pD, rD, oD] = await Promise.all([sR.json(), pR.json(), rR.json(), oR.json()])
      setStats(sD)
      setQueue([...(pD.items || []), ...(rD.items || [])])
      setOrgs(oD.organizations || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadItemContext = async (id: string) => {
    setLoadingContext(true)
    setItemContext(null)
    try {
      const r = await dpoFetch(`/api/dpo?action=queue_item&id=${id}`)
      const data = await r.json()
      console.log('Queue item context:', { id, docs: data.documents?.length, keys: Object.keys(data) })
      setItemContext(data)
    } catch (e) { console.error('loadItemContext error:', e) }
    setLoadingContext(false)
  }

  const loadOrgDetail = async (orgId: string) => {
    try {
      const r = await dpoFetch(`/api/dpo?action=org_detail&org_id=${orgId}`)
      setSelectedOrg(await r.json())
    } catch {}
  }

  // =============================================
  // ACTIONS
  // =============================================
  const resolveItem = async (item: QueueItem, type: 'approved_ai' | 'edited') => {
    setResolving(true)
    try {
      const r = await dpoFetch('/api/dpo', {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve', itemId: item.id, resolutionType: type, response: editedResponse, timeSpentSeconds: 60, sendEmail: true })
      })
      const d = await r.json()
      if (d.success) {
        toast(d.email_sent ? '✅ טופל ונשלח במייל' : '✅ טופל')
        setExpandedItem(null)
        loadAll()
      }
    } catch { toast('שגיאה', 'error') }
    setResolving(false)
  }

  const approveDoc = async (docId: string) => {
    setDocAction(true)
    try {
      const r = await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: docId }) })
      if ((await r.json()).success) {
        toast('✅ מסמך אושר')
        if (expandedItem) loadItemContext(expandedItem)
      }
    } catch { toast('שגיאה', 'error') }
    setDocAction(false)
  }

  const editDoc = async (docId: string) => {
    setDocAction(true)
    try {
      const r = await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'edit_document', documentId: docId, content: editContent }) })
      if ((await r.json()).success) {
        toast('✅ מסמך עודכן ואושר')
        setEditingDoc(null)
        if (expandedItem) loadItemContext(expandedItem)
      }
    } catch { toast('שגיאה', 'error') }
    setDocAction(false)
  }

  const regenDoc = async (docId: string) => {
    setDocAction(true)
    try {
      const r = await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'regenerate_document', documentId: docId, feedback: regenFeedback }) })
      const d = await r.json()
      if (d.success) {
        toast('✅ מסמך נוצר מחדש — בדוק שוב')
        setShowRegenInput(null)
        setRegenFeedback('')
        if (expandedItem) loadItemContext(expandedItem)
      }
    } catch { toast('שגיאה', 'error') }
    setDocAction(false)
  }

  const approveAllDocs = async (docs: OrgDoc[]) => {
    setDocAction(true)
    const pending = docs.filter(d => d.status === 'pending_review')
    for (const doc of pending) {
      await dpoFetch('/api/dpo', { method: 'POST', body: JSON.stringify({ action: 'approve_document', documentId: doc.id }) })
    }
    toast(`✅ ${pending.length} מסמכים אושרו`)
    if (expandedItem) loadItemContext(expandedItem)
    setDocAction(false)
  }

  // =============================================
  // DERIVED
  // =============================================
  const pending = queue.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const resolved = queue.filter(i => i.status === 'resolved').sort((a, b) => 
    new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime()
  )
  const orgCount = stats?.active_orgs || orgs.length || 0
  const resolvedThisMonth = stats?.resolved_this_month || 0
  const avgTimeSec = stats?.avg_time_seconds || 0
  const estMinutes = resolvedThisMonth > 0 ? Math.round((resolvedThisMonth * avgTimeSec) / 60) : 0
  const monthlyH = (estMinutes / 60).toFixed(1)
  const quotaPct = estMinutes > 0 ? Math.min(100, Math.round((estMinutes / 60 / MONTHLY_QUOTA_HOURS) * 100)) : 0

  // =============================================
  // RENDER
  // =============================================
  if (loading) return (
    <div style={S.loadingScreen}><div style={S.spinner} /><p style={{ color: '#71717a', marginTop: 12 }}>טוען...</p></div>
  )

  return (
    <div style={S.page} dir="rtl">
      {/* TOP BAR */}
      <div style={S.topBar}>
        <div style={S.topLeft}>
          <div style={S.logo}>MyDPO</div>
          <span style={S.topSep}>|</span>
          <span style={S.topName}>{DPO_NAME}</span>
        </div>
        <div style={S.topRight}>
          <button style={tab === 'inbox' ? S.tabActive : S.tabBtn} onClick={() => setTab('inbox')}>
            תיבת דואר {pending.length > 0 && <span style={S.badge}>{pending.length}</span>}
          </button>
          <button style={tab === 'orgs' ? S.tabActive : S.tabBtn} onClick={() => setTab('orgs')}>
            ארגונים ({orgs.length})
          </button>
          <button style={S.tabBtn} onClick={loadAll}>🔄</button>
          <span style={S.timeChip}>⏱ {monthlyH}h / {MONTHLY_QUOTA_HOURS}h</span>
          <button style={S.logoutBtn} onClick={() => {
            sessionStorage.removeItem('dpo_session_token')
            sessionStorage.removeItem('dpo_session_expires')
            router.push('/dpo/login')
          }}>יציאה</button>
        </div>
      </div>

      <div style={S.content}>
        {/* ============= INBOX TAB ============= */}
        {tab === 'inbox' && (
          <>
            {/* KPI strip */}
            <div style={S.kpiStrip}>
              <div style={S.kpi}><span style={{ ...S.kpiNum, color: '#4f46e5' }}>{stats?.active_orgs || orgs.length}</span><span style={S.kpiLabel}>ארגונים</span></div>
              <div style={S.kpiSep} />
              <div style={S.kpi}><span style={{ ...S.kpiNum, color: '#ef4444' }}>{pending.length}</span><span style={S.kpiLabel}>ממתין</span></div>
              <div style={S.kpiSep} />
              <div style={S.kpi}><span style={{ ...S.kpiNum, color: '#22c55e' }}>{stats?.resolved_this_month || 0}</span><span style={S.kpiLabel}>טופלו החודש</span></div>
              <div style={S.kpiSep} />
              <div style={S.kpi}>
                <span style={{ ...S.kpiNum, color: '#4f46e5' }}>{monthlyH}h</span>
                <span style={S.kpiLabel}>שעון DPO</span>
                <div style={S.kpiBar}><div style={{ ...S.kpiFill, width: `${quotaPct}%` }} /></div>
              </div>
            </div>

            {/* Pending items */}
            {pending.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>🔴 דורש טיפול ({pending.length})</div>
                {pending.map(item => {
                  const cfg = TYPE_MAP[item.type] || { label: item.type, emoji: '📌' }
                  const isExpanded = expandedItem === item.id
                  return (
                    <div key={item.id} style={S.card}>
                      {/* Card header — always visible */}
                      <div style={S.cardHeader} onClick={() => {
                        if (isExpanded) { setExpandedItem(null); return }
                        setExpandedItem(item.id)
                        setEditedResponse(item.ai_draft_response || '')
                        setEditingResponse(false)
                        loadItemContext(item.id)
                      }}>
                        <div>
                          <span style={S.cardTag}>{cfg.emoji} {cfg.label}</span>
                          <div style={S.cardTitle}>{item.title}</div>
                          <div style={S.cardMeta}>{item.organizations?.name} · {timeAgo(item.created_at)}</div>
                        </div>
                        <span style={{ fontSize: 18, color: '#a1a1aa' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={S.cardBody}>
                          {loadingContext ? <div style={S.spinner} /> : (
                            <>
                              {/* Org context */}
                              {itemContext && (
                                <div style={S.chipRow}>
                                  <span style={S.chip}>ציון: {itemContext.item?.organizations?.compliance_score || '—'}</span>
                                  <span style={S.chip}>מסמכים: {itemContext.documents?.length || 0}</span>
                                </div>
                              )}

                              {/* Chat messages */}
                              {itemContext?.messages?.length > 0 && (
                                <div style={S.subsection}>
                                  <div style={S.subTitle}>💬 שיחה</div>
                                  {itemContext.messages.slice(-4).map((m: any, i: number) => (
                                    <div key={i} style={m.role === 'user' ? S.bubbleUser : S.bubbleAi}>
                                      <div style={S.bubbleRole}>{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                      {(m.content || '').slice(0, 200)}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* AI summary (handle raw chat dumps) */}
                              {item.ai_summary && !itemContext?.messages?.length && (() => {
                                const p = parseChat(item.ai_summary)
                                if (p.isChat) return (
                                  <div style={S.subsection}>
                                    <div style={S.subTitle}>💬 שיחה</div>
                                    {p.msgs.map((m, i) => (
                                      <div key={i} style={m.role === 'user' ? S.bubbleUser : S.bubbleAi}>
                                        <div style={S.bubbleRole}>{m.role === 'user' ? '👤 לקוח' : '🤖 AI'}</div>
                                        {m.text.slice(0, 200)}
                                      </div>
                                    ))}
                                  </div>
                                )
                                return <div style={S.aiBox}><div style={S.aiLabel}>✦ ניתוח AI</div>{item.ai_summary.slice(0, 300)}</div>
                              })()}

                              {/* ============= DOCUMENT REVIEW ============= */}
                              {item.type === 'review' && (
                                <div style={S.subsection}>
                                  {(() => {
                                    const docs = itemContext?.documents || []
                                    const pendingDocs = docs.filter((d: OrgDoc) => d.status === 'pending_review')
                                    if (docs.length === 0) {
                                      return <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, fontSize: 13 }}>⚠️ לא נמצאו מסמכים. ייתכן שטרם נוצרו או שקרתה שגיאה.</div>
                                    }
                                    return (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={S.subTitle}>📄 מסמכים ({pendingDocs.length} ממתינים לאישור)</div>
                                          {pendingDocs.length > 1 && (
                                            <button style={S.btnSmallGreen} disabled={docAction} onClick={() => approveAllDocs(docs)}>
                                              ✓ אשר הכל
                                            </button>
                                          )}
                                        </div>
                                  {docs.map((doc: OrgDoc) => (
                                    <div key={doc.id} style={S.docCard}>
                                      <div style={S.docHeader}>
                                        <div>
                                          <span style={S.docName}>{doc.title || DOC_LABELS[doc.type] || doc.type}</span>
                                          <span style={{
                                            ...S.docStatus,
                                            color: doc.status === 'active' ? '#22c55e' : '#4f46e5',
                                            background: doc.status === 'active' ? '#f0fdf4' : '#eef2ff'
                                          }}>
                                            {doc.status === 'active' ? '✓ אושר' : '⏳ ממתין'}
                                          </span>
                                        </div>
                                        {doc.status === 'pending_review' && (
                                          <div style={{ display: 'flex', gap: 4 }}>
                                            <button style={S.btnSmallGreen} disabled={docAction} onClick={() => approveDoc(doc.id)}>✓ אשר</button>
                                            <button style={S.btnSmall} onClick={() => {
                                              setEditingDoc(doc.id)
                                              setEditContent(doc.content || '')
                                              setExpandedDoc(doc.id)
                                            }}>✏️ ערוך</button>
                                            <button style={S.btnSmall} onClick={() => {
                                              setShowRegenInput(showRegenInput === doc.id ? null : doc.id)
                                              setRegenFeedback('')
                                            }}>🔄 צור מחדש</button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Regen feedback input */}
                                      {showRegenInput === doc.id && (
                                        <div style={S.regenBox}>
                                          <textarea
                                            style={S.regenInput}
                                            placeholder="הערות ליצירה מחדש... (לדוגמה: להוסיף סעיף על רשומות רפואיות)"
                                            value={regenFeedback}
                                            onChange={e => setRegenFeedback(e.target.value)}
                                            rows={2}
                                          />
                                          <div style={{ display: 'flex', gap: 6 }}>
                                            <button style={S.btnPrimary} disabled={docAction || !regenFeedback.trim()} onClick={() => regenDoc(doc.id)}>
                                              {docAction ? '...' : '🔄 צור מחדש'}
                                            </button>
                                            <button style={S.btnSmall} onClick={() => setShowRegenInput(null)}>ביטול</button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Doc content preview / edit */}
                                      {expandedDoc === doc.id ? (
                                        <div style={S.docContent}>
                                          {editingDoc === doc.id ? (
                                            <>
                                              <textarea
                                                style={S.docEditor}
                                                value={editContent}
                                                onChange={e => setEditContent(e.target.value)}
                                                rows={15}
                                              />
                                              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                <button style={S.btnPrimary} disabled={docAction} onClick={() => editDoc(doc.id)}>
                                                  {docAction ? '...' : '💾 שמור ואשר'}
                                                </button>
                                                <button style={S.btnSmall} onClick={() => { setEditingDoc(null); setExpandedDoc(null) }}>ביטול</button>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <div style={S.docText}>{doc.content}</div>
                                              <button style={{ ...S.btnSmall, marginTop: 6 }} onClick={() => setExpandedDoc(null)}>סגור ▲</button>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div style={S.docPreview} onClick={() => { setExpandedDoc(doc.id); setEditingDoc(null) }}>
                                          {(doc.content || '').slice(0, 150)}... <span style={{ color: '#4f46e5', fontWeight: 600 }}>קרא עוד ▼</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                      </>
                                    )
                                  })()}
                                </div>
                              )}

                              {/* Draft response (for non-review items) */}
                              {item.type !== 'review' && (
                                <div style={S.subsection}>
                                  <div style={S.subTitle}>✏️ תשובה ללקוח</div>
                                  {editingResponse ? (
                                    <textarea style={S.textarea} value={editedResponse} onChange={e => setEditedResponse(e.target.value)} rows={4} autoFocus />
                                  ) : (
                                    <div style={S.draftBox} onClick={() => setEditingResponse(true)}>
                                      <div style={S.draftLabel}>לחץ לערוך</div>
                                      {item.ai_draft_response?.slice(0, 300) || 'אין טיוטה — לחץ לכתוב'}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div style={S.actionBar}>
                                {item.type === 'review' ? (
                                  <button style={S.btnPrimary} disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>
                                    {resolving ? '...' : '✓ סיים סקירה ועדכן לקוח'}
                                  </button>
                                ) : editingResponse ? (
                                  <>
                                    <button style={S.btnPrimary} disabled={resolving} onClick={() => resolveItem(item, 'edited')}>{resolving ? '...' : '✓ שלח ערוכה'}</button>
                                    <button style={S.btnSecondary} onClick={() => setEditingResponse(false)}>ביטול</button>
                                  </>
                                ) : (
                                  <>
                                    <button style={S.btnPrimary} disabled={resolving} onClick={() => resolveItem(item, 'approved_ai')}>{resolving ? '...' : '✓ אשר ושלח'}</button>
                                    <button style={S.btnSecondary} onClick={() => setEditingResponse(true)}>✏️ ערוך</button>
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
            )}

            {/* Empty state */}
            {pending.length === 0 && (
              <div style={S.emptyBox}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>אין פריטים ממתינים</div>
                <div style={{ fontSize: 13, color: '#71717a' }}>הכל מטופל</div>
              </div>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>✅ הושלם לאחרונה ({resolved.length})</div>
                {resolved.slice(0, 8).map(item => (
                  <div key={item.id} style={S.doneRow}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                    <span style={{ flex: 1 }}>{item.title}</span>
                    <span style={{ color: '#a1a1aa', fontSize: 12 }}>{item.organizations?.name} · {timeAgo(item.resolved_at || item.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============= ORGS TAB ============= */}
        {tab === 'orgs' && (
          <div style={S.section}>
            <input style={S.search} placeholder="🔍 חיפוש ארגון..." value={orgSearch} onChange={e => setOrgSearch(e.target.value)} />
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ארגון</th>
                  <th style={S.th}>חבילה</th>
                  <th style={S.th}>ציון</th>
                  <th style={S.th}>סטטוס</th>
                  <th style={S.th}>הצטרף</th>
                </tr>
              </thead>
              <tbody>
                {orgs
                  .filter(o => !orgSearch || o.name.toLowerCase().includes(orgSearch.toLowerCase()))
                  .map(org => {
                    const score = org.compliance_score || 0
                    const sc = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={org.id} style={S.tr} onClick={() => loadOrgDetail(org.id)}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{org.name}</td>
                        <td style={S.td}>{org.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</td>
                        <td style={S.td}><span style={{ ...S.scorePill, color: sc, background: sc + '15' }}>{score}</span></td>
                        <td style={S.td}>{org.pending_count > 0 ? `${org.pending_count} ממתינים` : '✓ תקין'}</td>
                        <td style={{ ...S.td, color: '#a1a1aa' }}>{timeAgo(org.created_at)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {/* Org detail modal */}
            {selectedOrg && (
              <div style={S.modal} onClick={() => setSelectedOrg(null)}>
                <div style={S.modalContent} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedOrg.organization?.name}</h3>
                    <button style={S.btnSmall} onClick={() => setSelectedOrg(null)}>✕</button>
                  </div>
                  <div style={S.chipRow}>
                    <span style={S.chip}>ציון: {selectedOrg.organization?.compliance_score || 0}</span>
                    <span style={S.chip}>מסמכים: {selectedOrg.documents?.length || 0}</span>
                    <span style={S.chip}>שעות: {Math.round(selectedOrg.time_this_month_minutes || 0)} דק׳</span>
                  </div>
                  {selectedOrg.documents?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={S.subTitle}>📄 מסמכים</div>
                      {selectedOrg.documents.map((d: any) => (
                        <div key={d.id} style={S.doneRow}>
                          <span>{d.title || d.name || d.type}</span>
                          <span style={{ color: d.status === 'active' ? '#22c55e' : '#4f46e5', fontSize: 11, fontWeight: 600 }}>
                            {d.status === 'active' ? 'פעיל' : d.status === 'pending_review' ? 'ממתין לאישור' : d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================
// INLINE STYLES (Notion-inspired, clean)
// =============================================
const S: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Heebo', -apple-system, sans-serif", background: '#fff', minHeight: '100vh', color: '#18181b' },
  loadingScreen: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 24, height: 24, border: '3px solid #e4e4e7', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin .7s linear infinite' },

  // Top bar
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 32px', borderBottom: '1px solid #e4e4e7', position: 'sticky' as const, top: 0, background: '#fff', zIndex: 10 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 17, fontWeight: 800, color: '#18181b' },
  topSep: { color: '#d4d4d8' },
  topName: { fontSize: 13, color: '#71717a' },
  topRight: { display: 'flex', alignItems: 'center', gap: 8 },
  tabBtn: { padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: '#71717a', fontFamily: 'inherit' },
  tabActive: { padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#18181b', color: '#fff', fontFamily: 'inherit' },
  badge: { fontSize: 10, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 10, marginRight: 4, fontFamily: 'inherit' },
  timeChip: { fontSize: 12, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: 20, fontWeight: 600 },
  logoutBtn: { padding: '4px 10px', borderRadius: 6, fontSize: 12, border: '1px solid #e4e4e7', background: 'none', cursor: 'pointer', color: '#71717a', fontFamily: 'inherit' },

  // Content
  content: { maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' },

  // KPI
  kpiStrip: { display: 'flex', gap: 20, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e4e4e7' },
  kpi: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 },
  kpiNum: { fontSize: 22, fontWeight: 900 },
  kpiLabel: { fontSize: 11, color: '#71717a' },
  kpiSep: { width: 1, background: '#e4e4e7' },
  kpiBar: { width: 60, height: 4, borderRadius: 2, background: '#e4e4e7', marginTop: 4 },
  kpiFill: { height: '100%', borderRadius: 2, background: '#4f46e5' },

  // Section
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#71717a', marginBottom: 12 },

  // Card
  card: { background: '#fafafa', borderRadius: 12, border: '1px solid #e4e4e7', marginBottom: 8, overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' },
  cardTag: { fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 4, display: 'inline-block' },
  cardTitle: { fontSize: 16, fontWeight: 700 },
  cardMeta: { fontSize: 12, color: '#71717a', marginTop: 2 },
  cardBody: { padding: '0 20px 20px', borderTop: '1px solid #e4e4e7' },

  // Chips
  chipRow: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12, marginTop: 12 },
  chip: { padding: '4px 10px', borderRadius: 6, background: '#f4f4f5', border: '1px solid #e4e4e7', fontSize: 12 },

  // Subsection
  subsection: { marginTop: 14 },
  subTitle: { fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },

  // Bubbles
  bubbleUser: { padding: '8px 12px', borderRadius: 10, background: '#eef2ff', fontSize: 13, marginBottom: 4, maxWidth: '80%', marginLeft: 'auto' },
  bubbleAi: { padding: '8px 12px', borderRadius: 10, background: '#f4f4f5', fontSize: 13, marginBottom: 4, maxWidth: '80%' },
  bubbleRole: { fontSize: 10, fontWeight: 700, color: '#71717a', marginBottom: 2 },

  // AI box
  aiBox: { padding: '10px 14px', borderRadius: 8, background: '#eef2ff', borderRight: '3px solid #4f46e5', fontSize: 13, lineHeight: '1.6', marginTop: 8 },
  aiLabel: { fontSize: 10, fontWeight: 700, color: '#4f46e5', marginBottom: 3 },

  // Draft
  draftBox: { padding: 12, border: '1.5px dashed #e4e4e7', borderRadius: 8, fontSize: 13, cursor: 'pointer', lineHeight: '1.6', background: '#fff' },
  draftLabel: { fontSize: 10, fontWeight: 700, color: '#4f46e5', marginBottom: 4 },
  textarea: { width: '100%', minHeight: 80, padding: 12, border: '1.5px solid #4f46e5', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' as const, direction: 'rtl' as const },

  // Doc review
  docCard: { background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, padding: 12, marginBottom: 6 },
  docHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  docName: { fontSize: 13, fontWeight: 600, marginLeft: 8 },
  docStatus: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, marginRight: 6 },
  docPreview: { fontSize: 12, color: '#71717a', lineHeight: '1.5', cursor: 'pointer', padding: '6px 0' },
  docContent: { marginTop: 8 },
  docText: { fontSize: 12, lineHeight: '1.7', color: '#3f3f46', whiteSpace: 'pre-wrap' as const, maxHeight: 400, overflowY: 'auto' as const, padding: 10, background: '#fafafa', borderRadius: 6, border: '1px solid #e4e4e7' },
  docEditor: { width: '100%', minHeight: 300, padding: 12, border: '1.5px solid #4f46e5', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, lineHeight: '1.7', resize: 'vertical' as const, direction: 'rtl' as const },
  regenBox: { padding: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginTop: 6 },
  regenInput: { width: '100%', padding: 8, border: '1px solid #fde68a', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, resize: 'none' as const, direction: 'rtl' as const, marginBottom: 6 },

  // Buttons
  actionBar: { display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #e4e4e7' },
  btnPrimary: { padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#4f46e5', color: '#fff', fontFamily: 'inherit' },
  btnSecondary: { padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #e4e4e7', background: '#fff', color: '#71717a', fontFamily: 'inherit' },
  btnSmall: { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #e4e4e7', background: '#fff', color: '#71717a', fontFamily: 'inherit' },
  btnSmallGreen: { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#22c55e', color: '#fff', fontFamily: 'inherit' },

  // Done rows
  doneRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f4f4f5', fontSize: 13 },

  // Empty
  emptyBox: { textAlign: 'center' as const, padding: 48, background: '#fafafa', borderRadius: 12, border: '1px solid #e4e4e7', marginBottom: 28 },

  // Search
  search: { width: '100%', padding: '10px 14px', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 12 },

  // Table
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'right' as const, fontSize: 11, fontWeight: 700, color: '#a1a1aa', padding: '8px 12px', borderBottom: '2px solid #e4e4e7' },
  tr: { cursor: 'pointer' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f4f4f5', fontSize: 13 },
  scorePill: { padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 },

  // Modal
  modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' as const },
}
