'use client'

import { useState, useEffect, useCallback } from 'react'
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

function timeAgo(dateStr: string): string {
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
  return `דד-ליין: ${hours} שעות`
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function DPODashboard() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [resolving, setResolving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editedResponse, setEditedResponse] = useState('')
  const [startTimes, setStartTimes] = useState<Record<string, number>>({})

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
    } catch (e) {
      console.error('Failed to load dashboard:', e)
    }
    setLoading(false)
  }

  // Actions
  const resolveItem = async (item: QueueItem, resolutionType: 'approved_ai' | 'edited') => {
    setResolving(item.id)
    const timeSpent = startTimes[item.id] ? Math.round((Date.now() - startTimes[item.id]) / 1000) : 30

    try {
      const response = editingItem === item.id ? editedResponse : (item.ai_draft_response || '')
      const res = await dpoFetch('/api/dpo', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resolve',
          itemId: item.id,
          resolutionType,
          response,
          notes: '',
          timeSpentSeconds: timeSpent,
          sendEmail: true
        })
      })
      const data = await res.json()
      if (data.success) {
        toast(data.email_sent ? '✅ טופל ונשלח במייל' : '✅ טופל בהצלחה')
        setEditingItem(null)
        loadDashboard()
      }
    } catch (e) {
      toast('שגיאה בטיפול', 'error')
    }
    setResolving(null)
  }

  const startEditing = (item: QueueItem) => {
    setEditingItem(item.id)
    setEditedResponse(item.ai_draft_response || '')
    setStartTimes(prev => ({ ...prev, [item.id]: Date.now() }))
  }

  // Derived data
  const pendingItems = queueItems.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const recentlyResolved = queueItems.filter(i => i.status === 'resolved' && i.resolved_at).slice(0, 5)
  const sortedOrgs = [...organizations].sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0))
  const monthlyHours = stats ? (stats.monthly_time_minutes / 60).toFixed(1) : '0'
  const monthlyQuota = 12 // hours
  const quotaPercent = stats ? Math.min(100, Math.round((stats.monthly_time_minutes / 60 / monthlyQuota) * 100)) : 0

  // Get greeting
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

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        :root {
          --bg: #f8f9fb; --white: #ffffff; --text: #1a1a2e; --secondary: #6b7280;
          --border: #eceef2; --blue: #4f6ef7; --blue-soft: #eef2ff;
          --red: #e5484d; --red-soft: #fff0f0; --amber: #e5930b; --amber-soft: #fef8ec;
          --green: #30a46c; --green-soft: #e9f9f0; --purple: #8b5cf6; --purple-soft: #f3f0ff;
        }
        body { font-family: 'Heebo', -apple-system, sans-serif; background: var(--bg); color: var(--text); }
        
        .header { display:flex; align-items:center; justify-content:space-between; padding:18px 36px; background:var(--white); border-bottom:1px solid var(--border); }
        .header-left { display:flex; align-items:center; gap:20px; }
        .logo-mark { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, var(--blue), #818cf8); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:16px; box-shadow:0 2px 8px rgba(79,110,247,0.3); }
        .greeting { font-size:18px; font-weight:700; }
        .greeting-sub { font-size:12px; color:var(--secondary); }
        .header-right { display:flex; align-items:center; gap:12px; }
        .pill { display:inline-flex; align-items:center; gap:6px; padding:6px 16px; border-radius:100px; font-size:13px; font-weight:600; }
        .pill-red { background:var(--red-soft); color:var(--red); }
        .pill-green { background:var(--green-soft); color:var(--green); }
        .pill-blue { background:var(--blue-soft); color:var(--blue); }
        .logout-btn { padding:6px 14px; border-radius:8px; border:1px solid var(--border); background:var(--white); color:var(--secondary); font-size:12px; cursor:pointer; font-family:inherit; }
        .logout-btn:hover { background:var(--bg); }
        
        .main { display:grid; grid-template-columns:1fr 340px; gap:24px; padding:28px 36px; min-height:calc(100vh - 76px); }
        .left-col { display:flex; flex-direction:column; gap:28px; }
        .right-col { display:flex; flex-direction:column; gap:20px; }
        
        .section-label { font-size:12px; font-weight:600; color:var(--secondary); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
        .section-count { background:var(--red); color:white; font-size:11px; font-weight:700; padding:1px 8px; border-radius:100px; }
        .section-count-green { background:var(--green); color:white; font-size:11px; font-weight:700; padding:1px 8px; border-radius:100px; }
        
        .inbox { display:flex; flex-direction:column; gap:10px; }
        .inbox-card { display:flex; gap:16px; padding:20px; background:var(--white); border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border:1px solid var(--border); transition:all 0.25s; }
        .inbox-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); border-color:var(--blue); }
        .card-stripe { width:4px; min-height:100%; border-radius:4px; flex-shrink:0; }
        .stripe-red { background:var(--red); }
        .stripe-amber { background:var(--amber); }
        .stripe-blue { background:var(--blue); }
        .stripe-purple { background:var(--purple); }
        .stripe-green { background:var(--green); }
        .card-body { flex:1; }
        .card-tag { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 10px; border-radius:6px; margin-bottom:8px; }
        .tag-red { background:var(--red-soft); color:var(--red); }
        .tag-amber { background:var(--amber-soft); color:var(--amber); }
        .tag-blue { background:var(--blue-soft); color:var(--blue); }
        .tag-purple { background:var(--purple-soft); color:var(--purple); }
        .tag-green { background:var(--green-soft); color:var(--green); }
        .card-title { font-size:15px; font-weight:700; margin-bottom:2px; }
        .card-meta { font-size:12px; color:var(--secondary); margin-bottom:12px; }
        
        .ai-block { padding:10px 14px; border-radius:10px; background:var(--blue-soft); margin-bottom:14px; border-right:3px solid var(--blue); }
        .ai-label { font-size:10px; font-weight:700; color:var(--blue); margin-bottom:3px; letter-spacing:0.3px; }
        .ai-text { font-size:13px; color:var(--text); line-height:1.6; }
        
        .card-actions { display:flex; gap:8px; }
        .btn { padding:8px 18px; border-radius:10px; border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .btn-primary { background:var(--blue); color:white; }
        .btn-primary:hover { background:#3d5bd9; }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-outline { background:transparent; border:1px solid var(--border); color:var(--secondary); }
        .btn-outline:hover { border-color:var(--blue); color:var(--blue); }
        
        .edit-area { width:100%; min-height:80px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:inherit; font-size:13px; line-height:1.6; resize:vertical; margin-bottom:10px; direction:rtl; }
        .edit-area:focus { outline:none; border-color:var(--blue); }
        
        .done-list { display:flex; flex-direction:column; gap:6px; }
        .done-item { display:flex; align-items:center; gap:10px; padding:12px 16px; background:var(--white); border-radius:10px; border:1px solid var(--border); font-size:13px; }
        .done-check { width:22px; height:22px; border-radius:6px; background:var(--green-soft); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .done-text { flex:1; }
        .done-org { font-size:11px; color:var(--secondary); }
        
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
        
        .time-card { background:var(--white); border-radius:14px; border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:18px; }
        .time-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .time-label { font-size:12px; color:var(--secondary); }
        .time-value { font-size:24px; font-weight:800; color:var(--blue); }
        .time-bar { height:8px; border-radius:4px; background:var(--border); margin-bottom:8px; }
        .time-fill { height:100%; border-radius:4px; background:linear-gradient(90deg, var(--blue), var(--purple)); transition:width 0.6s; }
        .time-percent { font-size:11px; color:var(--secondary); text-align:left; }
        
        .empty-state { text-align:center; padding:48px 20px; background:var(--white); border-radius:14px; border:1px solid var(--border); }
        .empty-icon { font-size:48px; margin-bottom:8px; }
        .empty-title { font-size:16px; font-weight:700; color:var(--green); margin-bottom:4px; }
        .empty-sub { font-size:13px; color:var(--secondary); }
        
        .spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--blue); border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .inbox-card { animation: fadeIn 0.35s ease forwards; }
        
        @media (max-width: 900px) {
          .main { grid-template-columns:1fr; }
          .header { padding:14px 18px; flex-wrap:wrap; gap:12px; }
          .main { padding:16px; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <div className="logo-mark">D</div>
          <div>
            <div className="greeting">{greeting}, ממונה</div>
            <div className="greeting-sub">{today}</div>
          </div>
        </div>
        <div className="header-right">
          {pendingItems.length > 0 && (
            <span className="pill pill-red">{pendingItems.length} דורש טיפול</span>
          )}
          {recentlyResolved.length > 0 && (
            <span className="pill pill-green">✓ {stats?.total_resolved_this_month || 0} הושלמו החודש</span>
          )}
          <span className="pill pill-blue">⏱ {monthlyHours}h</span>
          <button className="logout-btn" onClick={() => {
            sessionStorage.removeItem('dpo_session_token')
            sessionStorage.removeItem('dpo_session_expires')
            router.push('/dpo/login')
          }}>יציאה</button>
        </div>
      </div>

      <div className="main">
        {/* LEFT COLUMN: Inbox + Done */}
        <div className="left-col">
          {/* Action Required */}
          <div>
            <div className="section-label">
              {pendingItems.length > 0 ? (
                <>דורש את תשומת הלב שלך <span className="section-count">{pendingItems.length}</span></>
              ) : (
                <>תור המתנה</>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">אין פריטים ממתינים</div>
                <div className="empty-sub">כל הפניות טופלו. המערכת תתריע כשיגיע משהו חדש.</div>
              </div>
            ) : (
              <div className="inbox">
                {pendingItems.map(item => {
                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.review
                  const deadline = deadlineText(item.deadline_at)
                  const isEditing = editingItem === item.id
                  const isResolving = resolving === item.id

                  return (
                    <div key={item.id} className="inbox-card">
                      <div className={`card-stripe ${cfg.stripeClass}`} />
                      <div className="card-body">
                        <div className={`card-tag ${cfg.tagClass}`}>{cfg.emoji} {cfg.label}</div>
                        <div className="card-title">{item.title}</div>
                        <div className="card-meta">
                          {item.organizations?.name} · {timeAgo(item.created_at)}
                          {deadline && <> · <strong>{deadline}</strong></>}
                        </div>

                        {item.ai_summary && (
                          <div className="ai-block">
                            <div className="ai-label">
                              ✦ {item.ai_draft_response ? 'טיוטת תשובה מוכנה' : 'ניתוח AI'}
                              {item.ai_confidence && (
                                <span style={{ marginRight: 8, opacity: 0.7 }}>
                                  ({Math.round(item.ai_confidence * 100)}% ביטחון)
                                </span>
                              )}
                            </div>
                            <div className="ai-text">{item.ai_summary}</div>
                          </div>
                        )}

                        {isEditing && (
                          <textarea
                            className="edit-area"
                            value={editedResponse}
                            onChange={e => setEditedResponse(e.target.value)}
                            placeholder="ערוך את התשובה..."
                          />
                        )}

                        <div className="card-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-primary"
                                disabled={isResolving}
                                onClick={() => resolveItem(item, 'edited')}
                              >
                                {isResolving ? '...' : '✓ שלח תשובה ערוכה'}
                              </button>
                              <button className="btn btn-outline" onClick={() => setEditingItem(null)}>
                                ביטול
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-primary"
                                disabled={isResolving}
                                onClick={() => resolveItem(item, 'approved_ai')}
                              >
                                {isResolving ? '...' : item.type === 'incident' ? '✓ אשר ודווח' : '✓ אשר ושלח'}
                              </button>
                              <button className="btn btn-outline" onClick={() => startEditing(item)}>
                                ערוך
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recently Completed */}
          {recentlyResolved.length > 0 && (
            <div>
              <div className="section-label">
                הושלם לאחרונה <span className="section-count-green">{recentlyResolved.length}</span>
              </div>
              <div className="done-list">
                {recentlyResolved.map(item => (
                  <div key={item.id} className="done-item">
                    <div className="done-check">✓</div>
                    <span className="done-text">{item.title}</span>
                    <span className="done-org">
                      {item.organizations?.name} · {item.resolved_at ? timeAgo(item.resolved_at) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Organizations + Time */}
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
              const tierLabel = org.tier === 'extended' ? 'מורחבת' : 'בסיסית'
              const statusText = org.pending_count > 0 ? `${org.pending_count} ממתינים` : 'תקין'

              return (
                <div key={org.id} className="org-row">
                  <div className="org-dot" style={{ background: dotColor }} />
                  <div className="org-info">
                    <div className="org-name">{org.name}</div>
                    <div className="org-tier">{tierLabel} · {statusText}</div>
                  </div>
                  <div>
                    <div className="org-score" style={{ color: scoreColor }}>{score}</div>
                    <div className="org-score-bar">
                      <div className="org-score-fill" style={{ width: `${score}%`, background: scoreColor }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Tracker */}
          <div className="time-card">
            <div className="time-header">
              <div className="time-label">⏱ שעון DPO — {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</div>
              <div className="time-value">{monthlyHours}h</div>
            </div>
            <div className="time-bar">
              <div className="time-fill" style={{ width: `${quotaPercent}%` }} />
            </div>
            <div className="time-percent">{quotaPercent}% מתוך {monthlyQuota}h מכסה</div>
          </div>

          {/* Quick Actions */}
          <div className="time-card" style={{ padding: 14 }}>
            <button
              className="btn btn-outline"
              style={{ width: '100%', marginBottom: 6 }}
              onClick={() => loadDashboard()}
            >
              🔄 רענן נתונים
            </button>
            {pendingItems.filter(i => (i.ai_confidence || 0) >= 0.85).length > 0 && (
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={async () => {
                  const highConf = pendingItems.filter(i => (i.ai_confidence || 0) >= 0.85 && i.ai_draft_response)
                  if (!confirm(`לאשר ${highConf.length} פריטים עם ביטחון AI > 85%?`)) return
                  try {
                    const res = await dpoFetch('/api/dpo', {
                      method: 'POST',
                      body: JSON.stringify({
                        action: 'bulk_approve',
                        itemIds: highConf.map(i => i.id),
                        minConfidence: 0.85,
                        sendEmails: true
                      })
                    })
                    const data = await res.json()
                    toast(`אושרו ${data.approved} פריטים`)
                    loadDashboard()
                  } catch (e) {
                    toast('שגיאה', 'error')
                  }
                }}
              >
                ⚡ אשר הכל (AI &gt; 85%)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
