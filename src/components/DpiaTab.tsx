'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, AlertTriangle, Plus, Calendar, CheckCircle2, Clock, FileText, Trash2 } from 'lucide-react'
import DpiaWizard from './DpiaWizard'
import { RISK_LEVEL_COLORS, getRiskLevel } from '@/lib/dpia-templates'

interface DpiaTabProps {
  supabase: any
  v3Answers: any
}

interface Dpia {
  id: string
  activity_name: string
  activity_id: string | null
  description: string
  residual_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  next_review_date: string
  status: string
  action_plan: any[]
  risks: any[]
  created_at: string
}

interface RequiredActivity {
  activity_id: string
  activity_name: string
  reason: string
}

export default function DpiaTab({ supabase, v3Answers }: DpiaTabProps) {
  const [dpias, setDpias] = useState<Dpia[]>([])
  const [required, setRequired] = useState<RequiredActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState<{ prefillId?: string } | null>(null)
  const [selectedDpia, setSelectedDpia] = useState<Dpia | null>(null)

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
      const [dpiasRes, requiredRes] = await Promise.all([
        fetch('/api/dpia', { headers }),
        fetch('/api/dpia/required-activities', { headers }),
      ])
      if (dpiasRes.ok) {
        const data = await dpiasRes.json()
        setDpias(data.dpias || [])
      }
      if (requiredRes.ok) {
        const data = await requiredRes.json()
        setRequired(data.required || [])
      }
    } catch (e) { console.error('DPIA load error:', e) }
    setLoading(false)
  }, [getHeaders])

  useEffect(() => { load() }, [load])

  const handleSaved = () => {
    setWizardOpen(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את התסקיר?')) return
    const headers = await getHeaders()
    await fetch(`/api/dpia?id=${id}`, { method: 'DELETE', headers })
    setSelectedDpia(null)
    load()
  }

  const toggleAction = async (dpia: Dpia, actionId: string) => {
    const updated = dpia.action_plan.map((a: any) => a.id === actionId ? { ...a, completed: !a.completed } : a)
    const headers = await getHeaders()
    await fetch('/api/dpia', {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dpia.id, action_plan: updated }),
    })
    const newDpia = { ...dpia, action_plan: updated }
    setSelectedDpia(newDpia)
    setDpias(prev => prev.map(d => d.id === dpia.id ? newDpia : d))
  }

  const reviewDue = (date: string) => {
    const days = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (days < 0) return { text: `באיחור של ${Math.abs(Math.round(days))} ימים`, className: 'text-red-600' }
    if (days < 30) return { text: `בעוד ${Math.round(days)} ימים`, className: 'text-amber-600' }
    return { text: new Date(date).toLocaleDateString('he-IL'), className: 'text-stone-500' }
  }

  if (loading) {
    return <div className="text-sm text-stone-400 py-6 text-center">טוען תסקירים...</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Shield className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">תסקירי השפעה על הפרטיות (DPIA)</h3>
            <p className="text-xs text-stone-500">כלי עבודה יומיומי לניהול סיכוני פרטיות</p>
          </div>
        </div>
        <button onClick={() => setWizardOpen({})} className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
          <Plus className="h-4 w-4" /> צור תסקיר חדש
        </button>
      </div>

      {/* Required activities */}
      {required.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-red-800">פעילויות הדורשות תסקיר ({required.length})</h4>
          </div>
          <div className="space-y-2">
            {required.map(r => (
              <div key={r.activity_id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{r.activity_name}</p>
                  <p className="text-xs text-red-600">{r.reason}</p>
                </div>
                <button
                  onClick={() => setWizardOpen({ prefillId: r.activity_id })}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex-shrink-0"
                >
                  צור תסקיר
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing DPIAs */}
      {dpias.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-stone-700">תסקירים קיימים ({dpias.length})</h4>
          {dpias.map(d => {
            const review = reviewDue(d.next_review_date)
            const colors = RISK_LEVEL_COLORS[d.risk_level] || RISK_LEVEL_COLORS.medium
            const actions = d.action_plan || []
            const completedActions = actions.filter((a: any) => a.completed).length
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDpia(d)}
                className="bg-white border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">{d.activity_name}</p>
                    {d.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{d.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: colors.bg, color: colors.text }}>
                        סיכון {colors.label}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${review.className}`}>
                        <Calendar className="h-3 w-3" />
                        סקירה: {review.text}
                      </span>
                      {actions.length > 0 && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {completedActions}/{actions.length} פעולות
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : !required.length ? (
        <div className="text-center py-8 bg-stone-50 rounded-xl">
          <Shield className="h-8 w-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500">עדיין לא נוצרו תסקירים</p>
          <p className="text-xs text-stone-400">התסקיר הראשון הוא הצעד הראשון לציות מלא</p>
        </div>
      ) : null}

      {/* Wizard */}
      {wizardOpen && (
        <DpiaWizard
          supabase={supabase}
          v3Answers={v3Answers}
          prefillActivityId={wizardOpen.prefillId}
          onClose={() => setWizardOpen(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail view */}
      {selectedDpia && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSelectedDpia(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <h3 className="font-semibold text-stone-800">{selectedDpia.activity_name}</h3>
                <button onClick={() => setSelectedDpia(null)} className="text-stone-400 hover:text-stone-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedDpia.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-700 mb-1">תיאור</h4>
                    <p className="text-sm text-stone-600">{selectedDpia.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-stone-700 mb-2">סיכונים ({(selectedDpia.risks || []).length})</h4>
                  <div className="space-y-1.5">
                    {(selectedDpia.risks || []).map((r: any, i: number) => {
                      const c = RISK_LEVEL_COLORS[r.residualLevel as keyof typeof RISK_LEVEL_COLORS] || RISK_LEVEL_COLORS.medium
                      return (
                        <div key={i} className="flex items-center justify-between text-sm p-2 rounded" style={{ background: c.bg }}>
                          <span style={{ color: c.text }}>{r.name}</span>
                          <span className="text-xs font-bold" style={{ color: c.text }}>{r.residual} ({c.label})</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {(selectedDpia.action_plan || []).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-700 mb-2">תוכנית פעולה</h4>
                    <div className="space-y-1.5">
                      {selectedDpia.action_plan.map((a: any) => (
                        <label key={a.id} className="flex items-start gap-2 p-2 rounded hover:bg-stone-50 cursor-pointer">
                          <input type="checkbox" checked={a.completed} onChange={() => toggleAction(selectedDpia, a.id)} className="mt-1" />
                          <div className="flex-1">
                            <p className={`text-sm ${a.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>{a.text}</p>
                            <p className="text-xs text-stone-400">{a.owner} {a.deadline && `· ${a.deadline}`}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-stone-200 flex items-center justify-between">
                <button onClick={() => handleDelete(selectedDpia.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> מחק תסקיר
                </button>
                <button onClick={() => setSelectedDpia(null)} className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm">סגור</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
