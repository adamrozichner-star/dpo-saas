'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Send, CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, X, Loader2, Trash2 } from 'lucide-react'

interface DpoReport {
  id: string
  report_period: string
  period_start: string
  period_end: string
  status: 'draft' | 'approved' | 'submitted'
  executive_summary: string
  compliance_score_start: number | null
  compliance_score_end: number | null
  incidents_count: number
  incidents_summary: any[]
  findings_open: number
  findings_resolved: number
  dpia_count: number
  dpia_high_risk: number
  rights_requests_count: number
  documents_updated: number
  recommendations: string[]
  approved_by: string | null
  approved_at: string | null
  submitted_to_name: string | null
  submitted_to_role: string | null
  submitted_to_email: string | null
  submitted_at: string | null
}

interface DpoReportsTabProps {
  supabase: any
}

const statusBadge: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'טיוטה', bg: 'bg-stone-100', text: 'text-stone-600' },
  approved: { label: 'מאושר', bg: 'bg-amber-100', text: 'text-amber-700' },
  submitted: { label: 'הוגש', bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

export default function DpoReportsTab({ supabase }: DpoReportsTabProps) {
  const [reports, setReports] = useState<DpoReport[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DpoReport | null>(null)

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {}
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/dpo-reports', { headers })
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (e) { console.error('DPO reports load:', e) }
    setLoading(false)
  }, [getHeaders])

  useEffect(() => { load() }, [load])

  const createDraft = async () => {
    setCreating(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/dpo-reports', { method: 'POST', headers })
      if (res.ok) {
        const data = await res.json()
        await load()
        if (data.report) setEditing(data.report)
      }
    } catch (e) { console.error('Create draft:', e) }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הדוח?')) return
    const headers = await getHeaders()
    await fetch(`/api/dpo-reports?id=${id}`, { method: 'DELETE', headers })
    load()
  }

  const handleSaved = (r: DpoReport) => {
    setReports(prev => prev.map(x => x.id === r.id ? r : x))
    setEditing(r)
  }

  const handleSubmitted = () => {
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            דיווחים להנהלה
          </h2>
          <p className="text-xs text-stone-500">דוחות רבעוניים לבעלי העסק / הדירקטוריון</p>
        </div>
        <button
          onClick={createDraft}
          disabled={creating}
          className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {creating ? 'יוצר...' : 'צור דוח רבעוני חדש'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-stone-400 py-6 text-center">טוען...</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 bg-stone-50 rounded-xl">
          <FileText className="h-8 w-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500">עדיין לא נוצרו דוחות רבעוניים</p>
          <p className="text-xs text-stone-400">צרו דוח ראשון להצגה להנהלה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const sb = statusBadge[r.status]
            const scoreDiff = (r.compliance_score_end ?? 0) - (r.compliance_score_start ?? 0)
            return (
              <div
                key={r.id}
                onClick={() => setEditing(r)}
                className="bg-white border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">{r.report_period}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sb.bg} ${sb.text}`}>{sb.label}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {new Date(r.period_start).toLocaleDateString('he-IL')} – {new Date(r.period_end).toLocaleDateString('he-IL')}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 flex-wrap">
                      {r.compliance_score_end != null && (
                        <span className="flex items-center gap-1">
                          {scoreDiff > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : scoreDiff < 0 ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                          ציון: {r.compliance_score_end}/100
                        </span>
                      )}
                      {r.incidents_count > 0 && <span>{r.incidents_count} אירועים</span>}
                      {r.dpia_count > 0 && <span>{r.dpia_count} DPIA</span>}
                      {r.submitted_to_name && <span>→ {r.submitted_to_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <DpoReportEditor
          report={editing}
          supabase={supabase}
          onSaved={handleSaved}
          onSubmitted={handleSubmitted}
          onClose={() => setEditing(null)}
          onDelete={() => handleDelete(editing.id)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════════
interface EditorProps {
  report: DpoReport
  supabase: any
  onSaved: (r: DpoReport) => void
  onSubmitted: () => void
  onClose: () => void
  onDelete: () => void
}

function DpoReportEditor({ report, supabase, onSaved, onSubmitted, onClose, onDelete }: EditorProps) {
  const [summary, setSummary] = useState(report.executive_summary || '')
  const [recommendations, setRecommendations] = useState<string[]>(report.recommendations || [])
  const [newRec, setNewRec] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientRole, setRecipientRole] = useState('ceo')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSubmitted = report.status === 'submitted'
  const isReadOnly = isSubmitted

  const getHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  const save = async (newStatus?: string) => {
    setSaving(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/dpo-reports', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: report.id,
          executive_summary: summary,
          recommendations,
          ...(newStatus ? { status: newStatus } : {}),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved(data.report)
        setSaveMsg('נשמר ✓')
        setTimeout(() => setSaveMsg(''), 2500)
      }
    } catch (e) { console.error('Save:', e) }
    setSaving(false)
  }

  const submitReport = async () => {
    if (!recipientName || !recipientEmail) { alert('חובה למלא שם ודוא״ל נמען'); return }
    setSubmitting(true)
    try {
      const headers = await getHeaders()
      // Save first
      await save('approved')
      // Submit
      const res = await fetch(`/api/dpo-reports/${report.id}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_role: recipientRole,
          recipient_email: recipientEmail,
          approved_by: approvedBy || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.emailStatus === 'failed') {
          alert(`הדוח נשמר אך שליחת האימייל נכשלה: ${data.emailError || 'שגיאה לא ידועה'}`)
        } else if (data.emailStatus === 'skipped') {
          alert('הדוח נשמר. שירות המייל לא מוגדר בשרת — ניתן להוריד PDF ולשלוח ידנית.')
        }
        onSubmitted()
      } else {
        const err = await res.json()
        alert(`שליחה נכשלה — נסו שוב. ${err.details || err.error || ''}`)
      }
    } catch (e: any) {
      alert(`שליחה נכשלה — נסו שוב. ${e.message}`)
    }
    setSubmitting(false)
  }

  const updateRec = (idx: number, value: string) => {
    setRecommendations(prev => prev.map((r, i) => i === idx ? value : r))
  }
  const removeRec = (idx: number) => setRecommendations(prev => prev.filter((_, i) => i !== idx))
  const addRec = () => {
    if (!newRec.trim()) return
    setRecommendations(prev => [...prev, newRec.trim()])
    setNewRec('')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 bg-gradient-to-l from-amber-50 to-white flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-800">דוח רבעוני — {report.report_period}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[report.status].bg} ${statusBadge[report.status].text}`}>
                  {statusBadge[report.status].label}
                </span>
                {saveMsg && <span className="text-xs text-emerald-600">{saveMsg}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg">
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Executive Summary */}
            <section>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">תקציר מנהלים</h4>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                readOnly={isReadOnly}
                rows={10}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm leading-relaxed focus:outline-none focus:border-amber-400 disabled:bg-stone-50"
                placeholder="תקציר מנהלים — נמשוך נתונים אוטומטית, אתם יכולים לערוך..."
              />
            </section>

            {/* Metrics — read-only */}
            <section>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">מדדים מרכזיים</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <MetricCard label="ציון פתיחה" value={report.compliance_score_start ?? '-'} suffix="/100" />
                <MetricCard label="ציון סיום" value={report.compliance_score_end ?? '-'} suffix="/100" />
                <MetricCard label="אירועי אבטחה" value={report.incidents_count} />
                <MetricCard label="תסקירי השפעה" value={report.dpia_count} sub={report.dpia_high_risk > 0 ? `${report.dpia_high_risk} סיכון גבוה` : undefined} />
                <MetricCard label="בקשות נושאי מידע" value={report.rights_requests_count} />
                <MetricCard label="מסמכים שעודכנו" value={report.documents_updated} />
              </div>
            </section>

            {/* Recommendations */}
            <section>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">המלצות</h4>
              <div className="space-y-2">
                {recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                    <input
                      value={r}
                      onChange={e => updateRec(i, e.target.value)}
                      readOnly={isReadOnly}
                      className="flex-1 px-2 py-1 border border-stone-300 rounded text-sm"
                    />
                    {!isReadOnly && (
                      <button onClick={() => removeRec(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {!isReadOnly && (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={newRec}
                      onChange={e => setNewRec(e.target.value)}
                      placeholder="הוסף המלצה..."
                      className="flex-1 px-2 py-1 border border-stone-300 rounded text-sm"
                    />
                    <button onClick={addRec} className="px-3 py-1 bg-stone-100 rounded text-sm">הוסף</button>
                  </div>
                )}
              </div>
            </section>

            {/* Submit */}
            {isSubmitted ? (
              <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-semibold text-emerald-800">דוח הוגש</h4>
                </div>
                <p className="text-sm text-emerald-700">
                  נשלח אל {report.submitted_to_name} ({report.submitted_to_email})
                  {report.submitted_at && ` בתאריך ${new Date(report.submitted_at).toLocaleDateString('he-IL')}`}
                </p>
                {report.approved_by && <p className="text-xs text-emerald-600 mt-1">אושר על ידי {report.approved_by}</p>}
              </section>
            ) : (
              <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                  <Send className="h-4 w-4 text-amber-600" />
                  הגשה להנהלה
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">שם הנמען</label>
                    <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="דוגמה: יוסי לוי"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">תפקיד</label>
                    <select value={recipientRole} onChange={e => setRecipientRole(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm">
                      <option value="ceo">מנכ״ל (CEO)</option>
                      <option value="vp">סמנכ״ל (VP)</option>
                      <option value="cfo">סמנכ״ל כספים (CFO)</option>
                      <option value="board">דירקטוריון</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-500 block mb-1">דוא״ל הנמען</label>
                    <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="email@company.com" dir="ltr"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-500 block mb-1">אושר על ידי (שם הממונה)</label>
                    <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="שם הממונה המאשר"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2">
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" /> מחק דוח
            </button>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <button
                    onClick={() => save()}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    שמור טיוטה
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={submitting || !recipientName || !recipientEmail}
                    className="flex items-center gap-1 px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'שולח...' : 'אשר ושלח'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MetricCard({ label, value, suffix, sub }: { label: string; value: any; suffix?: string; sub?: string }) {
  return (
    <div className="bg-stone-50 rounded-lg p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-lg font-bold text-stone-800">{value}{suffix || ''}</p>
      {sub && <p className="text-[10px] text-amber-600">{sub}</p>}
    </div>
  )
}
