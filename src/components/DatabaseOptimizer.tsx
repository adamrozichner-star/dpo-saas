'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Database, Zap, ArrowLeftRight, Scissors, Merge, Trash2, Plus,
  ChevronRight, ChevronDown, Loader2, Save, RotateCcw, Lightbulb,
  AlertTriangle, CheckCircle, Shield, TrendingDown, TrendingUp,
  MinusCircle, ArrowLeft, GripVertical, X, Sparkles, Info, FileText
} from 'lucide-react'
import {
  type VirtualDatabase,
  type RegulatoryImpact,
  type OptimizationSuggestion,
  calculateImpact,
  classifySecurityLevel,
  calculateObligations,
  compareImpacts,
  CATEGORY_LABELS,
  SECURITY_LEVEL_LABELS,
} from '@/lib/regulatory-engine'

// =============================================
// Types
// =============================================
interface DatabaseOptimizerProps {
  orgId: string
  orgName: string
  dpoFetch: (url: string, options?: RequestInit) => Promise<Response>
  onBack?: () => void
}

type SandboxAction = {
  type: 'split' | 'merge' | 'edit' | 'delete' | 'add'
  description: string
  timestamp: number
}

// =============================================
// Helpers
// =============================================
const levelBadge = (level: string) => {
  const info = SECURITY_LEVEL_LABELS[level] || SECURITY_LEVEL_LABELS.basic
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: info.bgColor, color: info.color }}
    >
      {info.label}
    </span>
  )
}

const catChip = (catId: string, sensitive: boolean) => {
  const info = CATEGORY_LABELS[catId]
  const label = info?.label || catId
  return (
    <span
      key={catId}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1 ${
        sensitive ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  )
}

const deltaArrow = (val: number, inverted = false) => {
  const isGood = inverted ? val > 0 : val < 0
  if (val === 0) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={`text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {val > 0 ? '+' : ''}{val.toLocaleString()}
      {isGood ? <TrendingDown className="inline w-3 h-3 mr-0.5" /> : <TrendingUp className="inline w-3 h-3 mr-0.5" />}
    </span>
  )
}

const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// =============================================
// COMPONENT
// =============================================
export default function DatabaseOptimizer({ orgId, orgName, dpoFetch, onBack }: DatabaseOptimizerProps) {
  // ── State ──
  const [loading, setLoading] = useState(true)
  const [baselineDatabases, setBaselineDatabases] = useState<VirtualDatabase[]>([])
  const [databases, setDatabases] = useState<VirtualDatabase[]>([])
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [history, setHistory] = useState<SandboxAction[]>([])
  const [selectedDb, setSelectedDb] = useState<string | null>(null)
  const [splitMode, setSplitMode] = useState<string | null>(null)
  const [mergeMode, setMergeMode] = useState<string | null>(null)
  const [splitSelectedFields, setSplitSelectedFields] = useState<string[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [scenarioName, setScenarioName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [editingDb, setEditingDb] = useState<string | null>(null)
  const [editRecords, setEditRecords] = useState('')
  const [editUsers, setEditUsers] = useState('')

  // ── Computed ──
  const baselineImpact = useMemo(() => calculateImpact(baselineDatabases), [baselineDatabases])
  const currentImpact = useMemo(() => calculateImpact(databases), [databases])
  const delta = useMemo(
    () => compareImpacts(baselineImpact, currentImpact, baselineDatabases, databases),
    [baselineImpact, currentImpact, baselineDatabases, databases]
  )
  const hasChanges = useMemo(() => history.length > 0, [history])

  // ── Load data ──
  useEffect(() => {
    loadData()
  }, [orgId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await dpoFetch(`/api/ropa/optimizer?orgId=${orgId}`)
      const data = await res.json()
      if (data.databases) {
        const classified = data.databases.map((db: VirtualDatabase) => ({
          ...db,
          securityLevel: classifySecurityLevel(db),
        }))
        setBaselineDatabases(JSON.parse(JSON.stringify(classified)))
        setDatabases(classified)
      }
    } catch (err) {
      console.error('Failed to load optimizer data:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── AI Suggestions ──
  const loadSuggestions = async () => {
    setAiLoading(true)
    try {
      const res = await dpoFetch('/api/ropa/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_suggest', databases, orgName }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('AI suggestions failed:', err)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && databases.length > 0) {
      loadSuggestions()
    }
  }, [loading])

  // ── Actions ──
  const addAction = (action: SandboxAction) => {
    setHistory(prev => [...prev, action])
  }

  const resetToBaseline = () => {
    setDatabases(JSON.parse(JSON.stringify(baselineDatabases)))
    setHistory([])
    setSplitMode(null)
    setMergeMode(null)
    setSelectedDb(null)
    setEditingDb(null)
  }

  // SPLIT: take selected fields out of a database into a new one
  const executeSplit = (dbId: string, fieldIds: string[]) => {
    setDatabases(prev => {
      const source = prev.find(d => d.id === dbId)
      if (!source || fieldIds.length === 0) return prev

      const newDb: VirtualDatabase = {
        id: uuid(),
        name: `${source.name} — מפוצל`,
        description: `מפוצל מ-"${source.name}"`,
        dataCategories: fieldIds.filter(f => source.dataCategories.includes(f)),
        specialCategories: fieldIds.filter(f => source.specialCategories.includes(f)),
        estimatedRecords: source.estimatedRecords,
        authorizedUsers: Math.min(source.authorizedUsers, 10),
        purposes: [...source.purposes],
        legalBasis: source.legalBasis,
        internationalTransfers: source.internationalTransfers,
        transferCountries: [...source.transferCountries],
        retentionPeriod: source.retentionPeriod,
        securityMeasures: [...source.securityMeasures],
        isPublicBody: source.isPublicBody,
        isDataBroker: false,
        systemsUsed: [...source.systemsUsed],
        department: source.department,
      }
      newDb.securityLevel = classifySecurityLevel(newDb)

      const updatedSource = {
        ...source,
        dataCategories: source.dataCategories.filter(c => !fieldIds.includes(c)),
        specialCategories: source.specialCategories.filter(c => !fieldIds.includes(c)),
      }
      updatedSource.securityLevel = classifySecurityLevel(updatedSource)

      return prev.map(d => d.id === dbId ? updatedSource : d).concat(newDb)
    })

    addAction({ type: 'split', description: `פוצל מאגר "${databases.find(d => d.id === dbId)?.name}"`, timestamp: Date.now() })
    setSplitMode(null)
    setSplitSelectedFields([])
  }

  // MERGE: combine two databases
  const executeMerge = (dbId1: string, dbId2: string) => {
    setDatabases(prev => {
      const db1 = prev.find(d => d.id === dbId1)
      const db2 = prev.find(d => d.id === dbId2)
      if (!db1 || !db2) return prev

      const merged: VirtualDatabase = {
        id: db1.id,
        name: `${db1.name} + ${db2.name}`,
        description: `מיזוג: ${db1.name}, ${db2.name}`,
        dataCategories: Array.from(new Set(db1.dataCategories.concat(db2.dataCategories))),
        specialCategories: Array.from(new Set(db1.specialCategories.concat(db2.specialCategories))),
        estimatedRecords: db1.estimatedRecords + db2.estimatedRecords,
        authorizedUsers: Math.max(db1.authorizedUsers, db2.authorizedUsers),
        purposes: Array.from(new Set(db1.purposes.concat(db2.purposes))),
        legalBasis: db1.legalBasis || db2.legalBasis,
        internationalTransfers: db1.internationalTransfers || db2.internationalTransfers,
        transferCountries: Array.from(new Set(db1.transferCountries.concat(db2.transferCountries))),
        retentionPeriod: db1.retentionPeriod || db2.retentionPeriod,
        securityMeasures: Array.from(new Set(db1.securityMeasures.concat(db2.securityMeasures))),
        isPublicBody: db1.isPublicBody || db2.isPublicBody,
        isDataBroker: db1.isDataBroker || db2.isDataBroker,
        systemsUsed: Array.from(new Set(db1.systemsUsed.concat(db2.systemsUsed))),
        department: db1.department || db2.department,
      }
      merged.securityLevel = classifySecurityLevel(merged)

      return prev.filter(d => d.id !== dbId2).map(d => d.id === dbId1 ? merged : d)
    })

    addAction({ type: 'merge', description: `מוזג מאגרים`, timestamp: Date.now() })
    setMergeMode(null)
    setSelectedDb(null)
  }

  // UPDATE records/users count
  const updateDbNumbers = (dbId: string, records: number, users: number) => {
    setDatabases(prev => prev.map(db => {
      if (db.id !== dbId) return db
      const updated = { ...db, estimatedRecords: records, authorizedUsers: users }
      updated.securityLevel = classifySecurityLevel(updated)
      return updated
    }))
    addAction({ type: 'edit', description: `עודכנו נתוני מאגר`, timestamp: Date.now() })
    setEditingDb(null)
  }

  // REMOVE a field from a database
  const removeField = (dbId: string, fieldId: string) => {
    setDatabases(prev => prev.map(db => {
      if (db.id !== dbId) return db
      const updated = {
        ...db,
        dataCategories: db.dataCategories.filter(c => c !== fieldId),
        specialCategories: db.specialCategories.filter(c => c !== fieldId),
      }
      updated.securityLevel = classifySecurityLevel(updated)
      return updated
    }))
    addAction({ type: 'edit', description: `הוסר שדה מ-"${databases.find(d => d.id === dbId)?.name}"`, timestamp: Date.now() })
  }

  // DELETE a database
  const deleteDatabase = (dbId: string) => {
    const name = databases.find(d => d.id === dbId)?.name
    setDatabases(prev => prev.filter(d => d.id !== dbId))
    addAction({ type: 'delete', description: `נמחק מאגר "${name}"`, timestamp: Date.now() })
    if (selectedDb === dbId) setSelectedDb(null)
  }

  // SAVE scenario
  const saveScenario = async () => {
    if (!scenarioName.trim()) return
    setSaving(true)
    try {
      await dpoFetch('/api/ropa/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_scenario',
          orgId,
          name: scenarioName,
          databases,
          baselineDatabases,
        }),
      })
      setSaveModalOpen(false)
      setScenarioName('')
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mr-3 text-gray-500">טוען נתוני מאגרים...</span>
      </div>
    )
  }

  if (databases.length === 0) {
    return (
      <div className="text-center py-16">
        <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">אין מאגרי מידע מוגדרים</h3>
        <p className="text-sm text-gray-400 mb-4">יש להוסיף פעילויות עיבוד ב-ROPA לפני שימוש באופטימייזר</p>
        {onBack && (
          <button onClick={onBack} className="text-blue-600 hover:underline text-sm">
            חזרה לפרופיל הארגון
          </button>
        )}
      </div>
    )
  }

  // ── Main Render ──
  return (
    <div className="space-y-4" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              אופטימייזר מאגרים — {orgName}
            </h2>
            <p className="text-xs text-gray-500">
              סימולציית שינויים במבנה המאגרים לצמצום נטל רגולטורי
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <button
                onClick={resetToBaseline}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                איפוס
              </button>
              <button
                onClick={() => setSaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-3.5 h-3.5" />
                שמירת תרחיש
              </button>
            </>
          )}
          <button
            onClick={loadSuggestions}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiLoading ? 'מנתח...' : 'הצעות AI'}
          </button>
        </div>
      </div>

      {/* ═══ Impact Summary Bar ═══ */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'ציון סיכון', value: currentImpact.riskScore, delta: delta.riskScoreDelta, unit: '/100', inverted: false },
          { label: 'עלות שנתית', value: `₪${(currentImpact.estimatedAnnualCost / 1000).toFixed(0)}K`, delta: delta.costDelta, unit: '', inverted: false, rawDelta: true },
          { label: 'חובות רגולטוריות', value: currentImpact.totalObligations, delta: delta.obligationsDelta, unit: '', inverted: false },
          { label: 'דיווח לרשות', value: currentImpact.requiresPpaRegistration, delta: delta.ppaRegistrationDelta, unit: ' מאגרים', inverted: false },
          { label: 'חשיפת קנסות', value: `₪${(currentImpact.maxFineExposure / 1000).toFixed(0)}K`, delta: 0, unit: '', inverted: false },
        ].map((metric, i) => (
          <div key={i} className="bg-white rounded-lg border p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">{metric.label}</div>
            <div className="text-lg font-bold text-gray-900">{metric.value}{metric.unit}</div>
            {hasChanges && metric.delta !== 0 && (
              <div className="mt-0.5">
                {metric.rawDelta
                  ? deltaArrow(metric.delta, metric.inverted)
                  : deltaArrow(metric.delta, metric.inverted)
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ Level Changes Alert ═══ */}
      {delta.levelChanges.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-800 font-medium text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            שינויי רמת אבטחה
          </div>
          {delta.levelChanges.map((change, i) => (
            <div key={i} className="text-xs text-green-700 mr-6">
              "{change.database}": {SECURITY_LEVEL_LABELS[change.from]?.label} → {SECURITY_LEVEL_LABELS[change.to]?.label}
            </div>
          ))}
        </div>
      )}

      {/* ═══ AI Suggestions Panel ═══ */}
      {suggestions.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="w-full flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-2 text-purple-800 font-medium text-sm">
              <Lightbulb className="w-4 h-4" />
              הצעות אופטימיזציה ({suggestions.length})
            </div>
            {showSuggestions ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-purple-600" />}
          </button>
          {showSuggestions && (
            <div className="px-3 pb-3 space-y-2">
              {suggestions.map((s, i) => (
                <div key={s.id || i} className="bg-white rounded-lg p-3 border border-purple-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{s.description}</div>
                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {s.impact}
                      </div>
                    </div>
                    <div className="text-left mr-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        s.priority === 'high' ? 'bg-red-100 text-red-700' :
                        s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {s.priority === 'high' ? 'עדיפות גבוהה' : s.priority === 'medium' ? 'עדיפות בינונית' : 'עדיפות נמוכה'}
                      </span>
                      {s.estimatedSaving > 0 && (
                        <div className="text-xs text-green-600 mt-1">חיסכון: ₪{s.estimatedSaving.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Database Canvas ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {databases.map(db => {
          const level = db.securityLevel || classifySecurityLevel(db)
          const obligations = calculateObligations(db)
          const allFields = [...db.dataCategories, ...db.specialCategories]
          const uniqueFields = Array.from(new Set(allFields))
          const isSelected = selectedDb === db.id
          const isSplitting = splitMode === db.id
          const isMergeTarget = mergeMode !== null && mergeMode !== db.id

          return (
            <div
              key={db.id}
              onClick={() => {
                if (mergeMode && mergeMode !== db.id) {
                  executeMerge(mergeMode, db.id)
                  return
                }
                setSelectedDb(isSelected ? null : db.id)
              }}
              className={`bg-white rounded-xl border-2 transition-all cursor-pointer ${
                isMergeTarget ? 'border-blue-400 bg-blue-50 shadow-lg ring-2 ring-blue-200' :
                isSplitting ? 'border-purple-400 shadow-lg' :
                isSelected ? 'border-blue-500 shadow-md' :
                level === 'high' ? 'border-red-200 hover:border-red-400' :
                level === 'medium' ? 'border-yellow-200 hover:border-yellow-400' :
                'border-gray-200 hover:border-gray-400'
              }`}
            >
              {/* DB Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{db.name}</span>
                </div>
                {levelBadge(level)}
              </div>

              {/* DB Stats */}
              <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">רשומות: </span>
                  <span className="font-medium">{db.estimatedRecords?.toLocaleString() || '?'}</span>
                </div>
                <div>
                  <span className="text-gray-500">מורשי גישה: </span>
                  <span className="font-medium">{db.authorizedUsers}</span>
                </div>
              </div>

              {/* Fields */}
              <div className="px-3 pb-2">
                <div className="flex flex-wrap">
                  {uniqueFields.map(f => {
                    const isSensitive = CATEGORY_LABELS[f]?.sensitive || false
                    const isInSplit = splitSelectedFields.includes(f)
                    
                    if (isSplitting) {
                      return (
                        <button
                          key={f}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSplitSelectedFields(prev =>
                              prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                            )
                          }}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1 border transition-colors ${
                            isInSplit
                              ? 'bg-purple-200 text-purple-800 border-purple-400'
                              : isSensitive
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {CATEGORY_LABELS[f]?.label || f}
                        </button>
                      )
                    }

                    return (
                      <div key={f} className="group relative inline-flex mr-1 mb-1">
                        {catChip(f, isSensitive)}
                        {isSelected && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeField(db.id, f) }}
                            className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                            title="הסרת שדה"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Key obligations */}
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {obligations.ppaRegistration && (
                  <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">דיווח לרשות</span>
                )}
                {obligations.penTesting && (
                  <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">מבדק חדירה</span>
                )}
                {obligations.riskAssessment && (
                  <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">סקר סיכונים</span>
                )}
                {obligations.breachNotification && (
                  <span className="text-[9px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">חובת דיווח פריצה</span>
                )}
              </div>

              {/* Split mode: confirm bar */}
              {isSplitting && (
                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); executeSplit(db.id, splitSelectedFields) }}
                    disabled={splitSelectedFields.length === 0}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-purple-600 text-white rounded-lg disabled:opacity-40"
                  >
                    <Scissors className="w-3 h-3" />
                    פצל ({splitSelectedFields.length} שדות)
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSplitMode(null); setSplitSelectedFields([]) }}
                    className="px-2 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                  >
                    ביטול
                  </button>
                </div>
              )}

              {/* Editing records/users */}
              {editingDb === db.id && (
                <div className="px-3 pb-3 space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">רשומות</label>
                      <input
                        type="number"
                        value={editRecords}
                        onChange={e => setEditRecords(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">מורשי גישה</label>
                      <input
                        type="number"
                        value={editUsers}
                        onChange={e => setEditUsers(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateDbNumbers(db.id, Number(editRecords) || 0, Number(editUsers) || 0)}
                      className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1"
                    >
                      עדכון
                    </button>
                    <button
                      onClick={() => setEditingDb(null)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {/* Merge target indicator */}
              {isMergeTarget && (
                <div className="px-3 pb-3">
                  <div className="text-xs text-blue-600 text-center py-1 bg-blue-50 rounded">
                    לחצו כאן למיזוג ←
                  </div>
                </div>
              )}

              {/* Action bar (when selected) */}
              {isSelected && !isSplitting && editingDb !== db.id && (
                <div className="px-3 pb-3 flex gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSplitMode(db.id); setSplitSelectedFields([]) }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                    title="פיצול מאגר"
                  >
                    <Scissors className="w-3 h-3" />
                    פיצול
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMergeMode(db.id) }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    title="מיזוג עם מאגר אחר"
                  >
                    <Merge className="w-3 h-3" />
                    מיזוג
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingDb(db.id)
                      setEditRecords(String(db.estimatedRecords || 0))
                      setEditUsers(String(db.authorizedUsers || 10))
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                    title="עריכת נתונים"
                  >
                    <FileText className="w-3 h-3" />
                    עריכה
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDatabase(db.id) }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-50 text-red-700 rounded hover:bg-red-100 mr-auto"
                    title="מחיקת מאגר"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══ Merge cancel bar ═══ */}
      {mergeMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
          <Merge className="w-5 h-5" />
          <span className="text-sm">בחרו מאגר יעד למיזוג</span>
          <button
            onClick={() => setMergeMode(null)}
            className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30"
          >
            ביטול
          </button>
        </div>
      )}

      {/* ═══ Action History ═══ */}
      {history.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">היסטוריית שינויים ({history.length})</div>
          <div className="space-y-1">
            {history.slice(-5).reverse().map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                {action.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Save Modal ═══ */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-4">שמירת תרחיש</h3>
            <input
              type="text"
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              placeholder="שם התרחיש..."
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              autoFocus
            />
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-4">
              <div>מאגרים: {databases.length}</div>
              <div>ציון סיכון: {currentImpact.riskScore}/100</div>
              {delta.costDelta !== 0 && (
                <div>שינוי עלות: {deltaArrow(delta.costDelta)}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveScenario}
                disabled={!scenarioName.trim() || saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'שמירה'}
              </button>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
