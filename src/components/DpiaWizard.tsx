'use client'

import { useState, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, Shield, AlertTriangle, CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react'
import {
  DPIA_RISK_CATALOG, DPIA_CONTROLS_CATALOG, DpiaRisk,
  calculateRiskScore, calculateResidualRisk, getRiskLevel, RISK_LEVEL_COLORS, DB_LABELS_DPIA,
} from '@/lib/dpia-templates'

interface SelectedRisk {
  id: string
  name: string
  category: string
  description: string
  likelihood: number
  impact: number
  custom?: boolean
}

interface ActionItem {
  id: string
  text: string
  owner: string
  deadline: string
  completed: boolean
}

interface DpiaWizardProps {
  supabase: any
  v3Answers: any
  prefillActivityId?: string
  onClose: () => void
  onSaved: (dpia: any) => void
}

export default function DpiaWizard({ supabase, v3Answers, prefillActivityId, onClose, onSaved }: DpiaWizardProps) {
  const [step, setStep] = useState(1)
  const [activityId, setActivityId] = useState(prefillActivityId || '')
  const [activityName, setActivityName] = useState('')
  const [customName, setCustomName] = useState('')
  const [description, setDescription] = useState('')
  const [legalBasis, setLegalBasis] = useState('')
  const [accessList, setAccessList] = useState('')
  const [storageList, setStorageList] = useState('')
  const [selectedRisks, setSelectedRisks] = useState<SelectedRisk[]>([])
  const [customRiskName, setCustomRiskName] = useState('')
  const [selectedControls, setSelectedControls] = useState<string[]>([])
  const [actionPlan, setActionPlan] = useState<ActionItem[]>([])
  const [newAction, setNewAction] = useState({ text: '', owner: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  const databases: string[] = [...(v3Answers?.databases || []), ...(v3Answers?.customDatabases || [])]

  const handleActivityChange = (id: string) => {
    setActivityId(id)
    if (id && id !== 'custom') {
      setActivityName(DB_LABELS_DPIA[id] || id)
      const detail = v3Answers?.dbDetails?.[id]
      if (detail?.fields) {
        setDescription(`עיבוד מידע של ${DB_LABELS_DPIA[id] || id}. שדות מידע: ${detail.fields.join(', ')}`)
      }
    }
  }

  const toggleRisk = (risk: typeof DPIA_RISK_CATALOG[number]) => {
    setSelectedRisks(prev => {
      const existing = prev.find(r => r.id === risk.id)
      if (existing) return prev.filter(r => r.id !== risk.id)
      return [...prev, {
        id: risk.id, name: risk.name, category: risk.category, description: risk.description,
        likelihood: risk.defaultLikelihood, impact: risk.defaultImpact,
      }]
    })
  }

  const updateRiskRating = (id: string, field: 'likelihood' | 'impact', value: number) => {
    setSelectedRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addCustomRisk = () => {
    if (!customRiskName.trim()) return
    const id = `custom-${Date.now()}`
    setSelectedRisks(prev => [...prev, {
      id, name: customRiskName.trim(), category: 'מותאם אישית', description: '',
      likelihood: 3, impact: 3, custom: true,
    }])
    setCustomRiskName('')
  }

  // Auto-suggest controls based on selected risks
  const suggestedControls = useMemo(() => {
    const set = new Set<string>()
    selectedRisks.forEach(r => {
      DPIA_CONTROLS_CATALOG.forEach(c => {
        if (c.mitigates.includes(r.id)) set.add(c.id)
      })
    })
    return Array.from(set)
  }, [selectedRisks])

  const toggleControl = (id: string) => {
    setSelectedControls(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const addAction = () => {
    if (!newAction.text.trim()) return
    setActionPlan(prev => [...prev, {
      id: `a-${Date.now()}`, text: newAction.text.trim(),
      owner: newAction.owner.trim(), deadline: newAction.deadline, completed: false,
    }])
    setNewAction({ text: '', owner: '', deadline: '' })
  }

  const removeAction = (id: string) => {
    setActionPlan(prev => prev.filter(a => a.id !== id))
  }

  // Risk matrix data
  const riskMatrix = selectedRisks.map(r => {
    const initial = calculateRiskScore(r.likelihood, r.impact)
    const residual = calculateResidualRisk(
      initial,
      selectedControls.filter(cid => {
        const ctrl = DPIA_CONTROLS_CATALOG.find(c => c.id === cid)
        return ctrl?.mitigates.includes(r.id)
      })
    )
    return { ...r, initial, residual, initialLevel: getRiskLevel(initial), residualLevel: getRiskLevel(residual) }
  })

  const maxResidual = riskMatrix.length > 0 ? Math.max(...riskMatrix.map(r => r.residual)) : 0
  const totalInitial = riskMatrix.reduce((sum, r) => sum + r.initial, 0)
  const totalResidual = riskMatrix.reduce((sum, r) => sum + r.residual, 0)

  const handleSave = async () => {
    if (!supabase) return
    setSaving(true)
    try {
      const name = activityId === 'custom' ? customName : activityName
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/dpia', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          activity_name: name,
          activity_id: activityId === 'custom' ? null : activityId,
          description,
          legal_basis: legalBasis,
          data_categories: v3Answers?.dbDetails?.[activityId]?.fields || [],
          risks: riskMatrix,
          controls: selectedControls,
          residual_score: maxResidual,
          action_plan: actionPlan,
          status: 'active',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.details || err.error || 'שגיאה בשמירה')
      }
      const { dpia } = await res.json()
      onSaved(dpia)
    } catch (e: any) {
      console.error('DPIA save error:', e)
      alert(`שגיאה: ${e.message}`)
    }
    setSaving(false)
  }

  const canProceed = () => {
    if (step === 1) return activityId && (activityId !== 'custom' || customName.trim())
    if (step === 2) return description.trim() && legalBasis.trim()
    if (step === 3) return selectedRisks.length > 0
    return true
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 bg-gradient-to-l from-amber-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800">תסקיר השפעה על הפרטיות</h3>
                <p className="text-xs text-stone-500">שלב {step} מתוך 6</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg">
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>

          {/* Progress */}
          <div className="h-1 bg-stone-100">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${(step / 6) * 100}%` }} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {step === 1 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">בחירת פעילות העיבוד</h4>
                <p className="text-sm text-stone-500">לאיזו פעילות עיבוד מידע מיועד התסקיר?</p>
                <select
                  value={activityId}
                  onChange={e => handleActivityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                >
                  <option value="">בחרו פעילות...</option>
                  {databases.map(db => (
                    <option key={db} value={db}>{DB_LABELS_DPIA[db] || db}</option>
                  ))}
                  <option value="custom">מסמך מותאם אישית</option>
                </select>
                {activityId === 'custom' && (
                  <input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="שם פעילות העיבוד"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">תיאור העיבוד</h4>
                <div>
                  <label className="text-sm text-stone-600 block mb-1">תיאור כללי ומטרת העיבוד *</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    placeholder="מה נעשה עם המידע? לאיזו מטרה?"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 block mb-1">בסיס חוקי לעיבוד *</label>
                  <select
                    value={legalBasis}
                    onChange={e => setLegalBasis(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  >
                    <option value="">בחרו...</option>
                    <option value="consent">הסכמת נושא המידע</option>
                    <option value="contract">ביצוע חוזה</option>
                    <option value="legal_obligation">חובה חוקית</option>
                    <option value="legitimate_interest">אינטרס לגיטימי</option>
                    <option value="vital_interests">אינטרסים חיוניים</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-stone-600 block mb-1">מי ניגש למידע?</label>
                  <input
                    value={accessList}
                    onChange={e => setAccessList(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    placeholder="למשל: צוות שירות לקוחות, מנהלים"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-600 block mb-1">היכן מאוחסן המידע?</label>
                  <input
                    value={storageList}
                    onChange={e => setStorageList(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    placeholder="למשל: שרת ענן AWS, CRM חיצוני"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">זיהוי סיכונים</h4>
                <p className="text-sm text-stone-500">סמנו את הסיכונים הרלוונטיים, וכוונו את ההערכה ליכולות הארגון.</p>

                <div className="space-y-2">
                  {DPIA_RISK_CATALOG.map(risk => {
                    const selected = selectedRisks.find(r => r.id === risk.id)
                    return (
                      <div key={risk.id} className={`rounded-lg border p-3 ${selected ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-200'}`}>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleRisk(risk)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-stone-800">{risk.name}</p>
                            <p className="text-xs text-stone-500">{risk.description}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 flex-shrink-0">{risk.category}</span>
                        </label>
                        {selected && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-stone-500 block mb-1">סבירות: {selected.likelihood}</label>
                              <input type="range" min="1" max="5" value={selected.likelihood}
                                onChange={e => updateRiskRating(risk.id, 'likelihood', parseInt(e.target.value))}
                                className="w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-stone-500 block mb-1">השפעה: {selected.impact}</label>
                              <input type="range" min="1" max="5" value={selected.impact}
                                onChange={e => updateRiskRating(risk.id, 'impact', parseInt(e.target.value))}
                                className="w-full" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-2 pt-3 border-t border-stone-200">
                  <input
                    value={customRiskName}
                    onChange={e => setCustomRiskName(e.target.value)}
                    placeholder="סיכון מותאם אישית..."
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  />
                  <button onClick={addCustomRisk} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm flex items-center gap-1">
                    <Plus className="h-4 w-4" /> הוסף
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">בקרות ואמצעי הגנה</h4>
                <p className="text-sm text-stone-500">סמנו את הבקרות שכבר יושמו בארגון. המערכת המליצה על הבקרות הרלוונטיות לסיכונים שזיהיתם.</p>

                <div className="space-y-2">
                  {DPIA_CONTROLS_CATALOG.map(ctrl => {
                    const selected = selectedControls.includes(ctrl.id)
                    const suggested = suggestedControls.includes(ctrl.id)
                    return (
                      <label key={ctrl.id} className={`flex items-start gap-2 cursor-pointer rounded-lg border p-3 ${selected ? 'bg-emerald-50 border-emerald-300' : suggested ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleControl(ctrl.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-stone-800">{ctrl.name}</p>
                          {suggested && !selected && <p className="text-xs text-amber-700">💡 מומלץ עבור הסיכונים שנבחרו</p>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">מטריצת סיכונים</h4>
                <p className="text-sm text-stone-500">השוואה בין סיכון ראשוני לסיכון שיורי (אחרי בקרות).</p>

                {/* 5x5 Matrix */}
                <div className="bg-stone-50 rounded-lg p-4">
                  <div className="text-xs text-stone-500 mb-2 text-center">השפעה ↑ · סבירות →</div>
                  <div className="grid grid-cols-6 gap-0.5 text-[10px]">
                    <div></div>
                    {[1,2,3,4,5].map(l => <div key={l} className="text-center text-stone-500 py-1">{l}</div>)}
                    {[5,4,3,2,1].map(impact => (
                      <div key={impact} className="contents">
                        <div className="text-left text-stone-500 py-1 pr-1">{impact}</div>
                        {[1,2,3,4,5].map(likelihood => {
                          const score = likelihood * impact
                          const level = getRiskLevel(score)
                          const color = RISK_LEVEL_COLORS[level]
                          const residualsHere = riskMatrix.filter(r => {
                            const matchL = Math.round(r.residual / impact) === likelihood || false
                            return false // simplified — dots render by plot below
                          })
                          return (
                            <div key={likelihood} className="aspect-square rounded border" style={{ background: color.bg, borderColor: color.border }} />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk list comparison */}
                <div className="space-y-2">
                  {riskMatrix.map(r => (
                    <div key={r.id} className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-stone-800 mb-2">{r.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded" style={{ background: RISK_LEVEL_COLORS[r.initialLevel].bg }}>
                          <span className="text-stone-500">לפני בקרות:</span>
                          <span className="font-bold block" style={{ color: RISK_LEVEL_COLORS[r.initialLevel].text }}>{r.initial} ({RISK_LEVEL_COLORS[r.initialLevel].label})</span>
                        </div>
                        <div className="p-2 rounded" style={{ background: RISK_LEVEL_COLORS[r.residualLevel].bg }}>
                          <span className="text-stone-500">אחרי בקרות:</span>
                          <span className="font-bold block" style={{ color: RISK_LEVEL_COLORS[r.residualLevel].text }}>{r.residual} ({RISK_LEVEL_COLORS[r.residualLevel].label})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-stone-600 pt-2 border-t border-stone-200">
                  <p>סה״כ סיכון ראשוני: <span className="font-bold">{totalInitial}</span></p>
                  <p>סה״כ סיכון שיורי: <span className="font-bold text-emerald-600">{totalResidual}</span> <span className="text-xs text-stone-400">(הפחתה של {totalInitial - totalResidual})</span></p>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-stone-800">תוכנית פעולה</h4>
                <p className="text-sm text-stone-500">פעולות לטיפול בסיכונים שנותרו. מומלץ להוסיף פעולה לכל סיכון ברמת &quot;גבוה&quot; או &quot;קריטי&quot;.</p>

                {riskMatrix.filter(r => r.residualLevel === 'high' || r.residualLevel === 'critical').length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 mb-1">⚠️ סיכונים שנותרו גבוהים:</p>
                    <ul className="text-xs text-amber-700 space-y-0.5">
                      {riskMatrix.filter(r => r.residualLevel === 'high' || r.residualLevel === 'critical').map(r => (
                        <li key={r.id}>• {r.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {actionPlan.length > 0 && (
                  <div className="space-y-2">
                    {actionPlan.map(a => (
                      <div key={a.id} className="bg-white border border-stone-200 rounded-lg p-3 flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-stone-800">{a.text}</p>
                          <p className="text-xs text-stone-500">
                            {a.owner && `אחראי: ${a.owner}`}
                            {a.owner && a.deadline && ' · '}
                            {a.deadline && `יעד: ${a.deadline}`}
                          </p>
                        </div>
                        <button onClick={() => removeAction(a.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                  <input
                    value={newAction.text}
                    onChange={e => setNewAction(p => ({ ...p, text: e.target.value }))}
                    placeholder="תיאור הפעולה"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newAction.owner}
                      onChange={e => setNewAction(p => ({ ...p, owner: e.target.value }))}
                      placeholder="אחראי"
                      className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={newAction.deadline}
                      onChange={e => setNewAction(p => ({ ...p, deadline: e.target.value }))}
                      className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <button onClick={addAction} disabled={!newAction.text.trim()} className="w-full px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                    <Plus className="h-4 w-4" /> הוסף פעולה
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-200 flex items-center justify-between">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="flex items-center gap-1 px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
            >
              <ChevronRight className="h-4 w-4" />
              {step > 1 ? 'הקודם' : 'ביטול'}
            </button>
            {step < 6 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                הבא <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'שומר...' : 'אשר ושמור'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
