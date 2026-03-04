'use client'

import { useState, useCallback } from 'react'
import { 
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, 
  Loader2, FileText, ExternalLink, Lock, Sparkles,
  Clock, BookOpen, X
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import type { ComplianceTask, SubTask, WizardConfig, WizardQuestion } from '@/lib/compliance-engine'

// ═══════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════

interface UnifiedTaskListProps {
  tasks: ComplianceTask[]
  isPaid: boolean
  mode: 'full' | 'summary'       // full = tasks tab, summary = overview
  summaryLimit?: number            // for summary mode, how many active tasks to show
  orgId?: string
  orgName?: string
  supabase?: any
  onResolve: (taskId: string, note?: string) => void
  onUndo: (taskId: string) => void
  onRefreshDocs?: () => void
}

// ═══════════════════════════════════════════════════════
// WIZARD MODAL
// ═══════════════════════════════════════════════════════

function WizardModal({ 
  config, 
  task,
  onClose, 
  onSubmit, 
  isSubmitting 
}: { 
  config: WizardConfig
  task: ComplianceTask
  onClose: () => void
  onSubmit: (answers: Record<string, any>) => void
  isSubmitting: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [step, setStep] = useState(0)
  const questions = config.questions
  const q = questions[step]
  const isLast = step === questions.length - 1
  const canProceed = !q.required || (answers[q.id] !== undefined && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true))

  const handleNext = () => {
    if (isLast) {
      onSubmit(answers)
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">{task.icon}</span>
            <h3 className="font-semibold text-stone-800">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 mb-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : 'bg-stone-200'}`} />
            ))}
          </div>
          <p className="text-xs text-stone-400">{step + 1} / {questions.length}</p>
        </div>

        {/* Question */}
        <div className="px-6 py-6">
          <label className="block text-sm font-medium text-stone-700 mb-3">{q.label}</label>

          {q.type === 'text' && (
            <input
              type="text"
              value={answers[q.id] || ''}
              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder={q.placeholder}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              autoFocus
            />
          )}

          {q.type === 'number' && (
            <input
              type="number"
              value={answers[q.id] || ''}
              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder={q.placeholder}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              autoFocus
            />
          )}

          {q.type === 'select' && q.options && (
            <div className="space-y-2">
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
                  className={`w-full text-right px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    answers[q.id] === opt.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {q.type === 'multi_select' && q.options && (
            <div className="space-y-2">
              {q.options.map(opt => {
                const selected = (answers[q.id] || []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const current = answers[q.id] || []
                      setAnswers({
                        ...answers,
                        [q.id]: selected
                          ? current.filter((v: string) => v !== opt.value)
                          : [...current, opt.value]
                      })
                    }}
                    className={`w-full text-right px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      selected
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'border-indigo-500 bg-indigo-500' : 'border-stone-300'
                    }`}>
                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50">
          <button 
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
          >
            {step > 0 ? 'הקודם' : 'ביטול'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> מייצר מסמך...</>
            ) : isLast ? (
              <><Sparkles className="h-4 w-4" /> הפק מסמך</>
            ) : (
              'הבא ←'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// TASK CARD
// ═══════════════════════════════════════════════════════

function TaskCard({
  task,
  isPaid,
  isExpanded,
  onToggle,
  onResolve,
  onUndo,
  onGenerateDoc,
  onOpenWizard,
  isGenerating,
}: {
  task: ComplianceTask
  isPaid: boolean
  isExpanded: boolean
  onToggle: () => void
  onResolve: (taskId: string, note?: string) => void
  onUndo: (taskId: string) => void
  onGenerateDoc: (task: ComplianceTask) => void
  onOpenWizard: (task: ComplianceTask) => void
  isGenerating: boolean
}) {
  const [confirmingResolve, setConfirmingResolve] = useState(false)

  const isDone = task.status === 'completed' || task.status === 'auto_resolved'
  const isUserResolved = task.status === 'completed' && task.resolvedNote?.includes('סומן כבוצע')
  
  // Status config
  const statusConfig = (() => {
    switch (task.status) {
      case 'completed':
      case 'auto_resolved':
        return { bg: 'bg-emerald-50/60', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', badgeText: 'הושלם', textColor: 'text-stone-500' }
      case 'doc_approved':
        return { bg: 'bg-blue-50/60', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', badgeText: 'מאושר — נדרש יישום', textColor: 'text-stone-800' }
      case 'doc_pending_review':
        return { bg: 'bg-indigo-50/40', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700', badgeText: 'ממתין לממונה', textColor: 'text-stone-700' }
      case 'needs_generation':
        return { bg: 'bg-amber-50/60', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', badgeText: 'נדרש הפקה', textColor: 'text-stone-800' }
      case 'needs_enrichment':
        return { bg: 'bg-orange-50/60', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700', badgeText: 'נדרש השלמה', textColor: 'text-stone-800' }
      case 'needs_action':
        return { bg: 'bg-amber-50/60', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', badgeText: 'נדרש טיפול', textColor: 'text-stone-800' }
      default:
        return { bg: 'bg-stone-50', border: 'border-stone-100', badge: 'bg-stone-100 text-stone-500', badgeText: 'לא רלוונטי', textColor: 'text-stone-500' }
    }
  })()

  // Action button content
  const actionButton = (() => {
    if (!isPaid && !isDone) {
      return (
        <span className="px-3 py-1.5 bg-stone-200 text-stone-400 rounded-lg text-xs font-medium flex items-center gap-1">
          <Lock className="h-3 w-3" /> נעול
        </span>
      )
    }
    if (isDone) return null

    switch (task.actionType) {
      case 'generate_doc':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateDoc(task) }}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isGenerating ? 'מייצר...' : 'הפק מסמך'}
          </button>
        )
      case 'wizard':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenWizard(task) }}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <Sparkles className="h-3 w-3" /> התחל
          </button>
        )
      case 'doc_review':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <FileText className="h-3 w-3" /> צפייה
          </button>
        )
      case 'external_guide':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            צפה בהנחיות →
          </button>
        )
      default:
        return null
    }
  })()

  return (
    <div className={`rounded-xl border transition-all ${statusConfig.border} ${statusConfig.bg}`}>
      {/* Main row */}
      <div 
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Status icon / checkbox */}
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        ) : isPaid && (task.actionType === 'external_guide' || task.status === 'doc_approved') ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingResolve(!confirmingResolve)
            }}
            className="w-5 h-5 rounded-full border-2 border-stone-300 flex-shrink-0 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center"
            title="סמן כבוצע"
          >
            {confirmingResolve && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
          </button>
        ) : task.status === 'doc_pending_review' ? (
          <Clock className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}

        {/* Icon + Title */}
        <span className="text-base flex-shrink-0">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${statusConfig.textColor}`}>{task.title}</p>
          {!isExpanded && (
            <p className="text-xs text-stone-400 truncate">{task.description}</p>
          )}
        </div>

        {/* Badge */}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block ${statusConfig.badge}`}>
          {statusConfig.badgeText}
        </span>

        {/* Action button */}
        <div className="flex-shrink-0">{actionButton}</div>

        {/* Chevron */}
        {!isDone && (
          <div className="flex-shrink-0 text-stone-400">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>

      {/* Confirmation row */}
      {confirmingResolve && isPaid && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-stone-200/50 pt-2 mr-8">
          <span className="text-xs text-stone-500">ביצעת את הפעולה?</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResolve(task.id, `סומן כבוצע — ${new Date().toLocaleDateString('he-IL')}`)
              setConfirmingResolve(false)
            }}
            className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 cursor-pointer"
          >
            ✓ כן, בוצע
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmingResolve(false) }}
            className="px-3 py-1 bg-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-300 cursor-pointer"
          >
            ביטול
          </button>
        </div>
      )}

      {/* Expanded detail */}
      {isExpanded && !isDone && (
        <div className="px-4 pb-4 pt-0 mr-8 border-t border-stone-100">
          <div className="pt-3 space-y-3">
            {/* Description */}
            <p className="text-sm text-stone-600 leading-relaxed">{task.description}</p>

            {/* Legal basis */}
            <p className="text-xs text-stone-400 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">בסיס חוקי:</span> {task.legalBasis}
            </p>

            {/* Time estimate */}
            {task.estimatedMinutes && (
              <p className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{task.estimatedMinutes} דקות
              </p>
            )}

            {/* External guide steps */}
            {(task.actionType === 'external_guide' || task.status === 'doc_approved') && task.guideSteps && (
              <div className="space-y-2 mt-2">
                <p className="text-xs font-medium text-stone-600">שלבי ביצוע:</p>
                {task.guideSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-700">{step.title}</p>
                      <p className="text-xs text-stone-500">{step.description}</p>
                      {step.linkUrl && (
                        <a href={step.linkUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" /> {step.linkLabel || step.linkUrl}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Post-approval guide */}
            {task.status === 'doc_approved' && task.postApprovalAction && !task.guideSteps && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">{task.postApprovalAction}</p>
              </div>
            )}

            {/* Sub-tasks (DPAs) */}
            {task.subTasks && task.subTasks.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-xs font-medium text-stone-600">ספקים:</p>
                {task.subTasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 py-1.5 px-3 bg-white/60 rounded-lg">
                    {st.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-stone-300 flex-shrink-0" />
                    )}
                    <span className="text-sm text-stone-700 flex-1">{st.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      st.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {st.status === 'completed' ? 'הושלם' : 'ממתין'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Resolved info */}
            {task.resolvedNote && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {task.resolvedNote}
              </p>
            )}

            {/* Undo for user-resolved */}
            {isUserResolved && isPaid && (
              <button
                onClick={(e) => { e.stopPropagation(); onUndo(task.id) }}
                className="text-xs text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                ↩ בטל סימון
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function UnifiedTaskList({
  tasks,
  isPaid,
  mode,
  summaryLimit = 5,
  orgId,
  orgName,
  supabase,
  onResolve,
  onUndo,
  onRefreshDocs,
}: UnifiedTaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [generatingDocFor, setGeneratingDocFor] = useState<string | null>(null)
  const [wizardTask, setWizardTask] = useState<ComplianceTask | null>(null)
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const { toast } = useToast()

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }, [supabase])

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Generate document via existing API
  const handleGenerateDoc = async (task: ComplianceTask) => {
    if (!orgId || !task.documentType) return
    setGeneratingDocFor(task.id)
    try {
      const res = await authFetch('/api/generate-documents', {
        method: 'POST',
        body: JSON.stringify({
          orgId,
          orgName: orgName || '',
          singleDocType: task.documentType,
        })
      })
      if (!res.ok) throw new Error('שגיאה ביצירת המסמך')
      toast('המסמך נוצר בהצלחה!')
      onRefreshDocs?.()
    } catch (err: any) {
      toast(err.message || 'שגיאה', 'error')
    } finally {
      setGeneratingDocFor(null)
    }
  }

  // Wizard submit → generate doc with enriched data
  const handleWizardSubmit = async (answers: Record<string, any>) => {
    if (!wizardTask || !orgId) return
    setWizardSubmitting(true)
    try {
      const res = await authFetch('/api/generate-documents', {
        method: 'POST',
        body: JSON.stringify({
          orgId,
          orgName: orgName || '',
          singleDocType: wizardTask.documentType,
          wizardAnswers: answers,
          wizardId: wizardTask.wizardConfig?.wizardId,
        })
      })
      if (!res.ok) throw new Error('שגיאה ביצירת המסמך')
      toast('המסמך נוצר בהצלחה!')
      setWizardTask(null)
      onRefreshDocs?.()
    } catch (err: any) {
      toast(err.message || 'שגיאה', 'error')
    } finally {
      setWizardSubmitting(false)
    }
  }

  // Split tasks
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'auto_resolved' && t.status !== 'not_applicable')
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'auto_resolved')
  const displayTasks = mode === 'summary' ? activeTasks.slice(0, summaryLimit) : activeTasks
  
  const totalCount = tasks.filter(t => t.status !== 'not_applicable').length
  const doneCount = completedTasks.length
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header (full mode only) */}
      {mode === 'full' && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800">📋 משימות ציות</h1>
              <p className="text-stone-500 mt-1">כל מה שצריך לעשות — במקום אחד</p>
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold text-stone-800">{doneCount}/{totalCount}</span>
              <p className="text-xs text-stone-400">הושלמו</p>
            </div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Summary header */}
      {mode === 'summary' && activeTasks.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            פעולות ממתינות
            <span className="text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{activeTasks.length}</span>
          </h2>
        </div>
      )}

      {/* Active tasks */}
      {displayTasks.length > 0 ? (
        <div className="space-y-2">
          {displayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isPaid={isPaid}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={() => toggleTask(task.id)}
              onResolve={onResolve}
              onUndo={onUndo}
              onGenerateDoc={handleGenerateDoc}
              onOpenWizard={setWizardTask}
              isGenerating={generatingDocFor === task.id}
            />
          ))}
        </div>
      ) : mode === 'full' ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">מצוין! כל המשימות הושלמו</h3>
          <p className="text-stone-500">רמת הציות שלכם מעולה 🎉</p>
        </div>
      ) : null}

      {/* "See all" link in summary mode */}
      {mode === 'summary' && activeTasks.length > summaryLimit && (
        <p className="text-xs text-indigo-600 font-medium">
          + {activeTasks.length - summaryLimit} משימות נוספות בלשונית משימות
        </p>
      )}

      {/* Completed tasks (full mode only, grayed at bottom) */}
      {mode === 'full' && completedTasks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-stone-500 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            הושלם
            <span className="text-xs font-normal bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{completedTasks.length}</span>
          </h2>
          <div className="space-y-1.5 opacity-70">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 px-3 bg-emerald-50/50 rounded-xl group">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-stone-500 flex-shrink-0">{task.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-stone-500">{task.title}</span>
                  {task.resolvedNote && (
                    <span className="text-xs text-emerald-500 mr-2">— {task.resolvedNote}</span>
                  )}
                </div>
                {task.status === 'completed' && task.resolvedNote?.includes('סומן כבוצע') && isPaid && (
                  <button
                    onClick={() => onUndo(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-stone-400 hover:text-rose-500 transition-all cursor-pointer"
                  >
                    ↩ בטל
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked overlay for unpaid */}
      {!isPaid && mode === 'full' && (
        <div className="bg-stone-50 rounded-lg p-4 text-center text-sm text-stone-500 border border-stone-200">
          🔒 הפעילו את המערכת כדי לבצע משימות ולהפיק מסמכים
        </div>
      )}

      {/* Wizard modal */}
      {wizardTask && wizardTask.wizardConfig && (
        <WizardModal
          config={wizardTask.wizardConfig}
          task={wizardTask}
          onClose={() => setWizardTask(null)}
          onSubmit={handleWizardSubmit}
          isSubmitting={wizardSubmitting}
        />
      )}
    </div>
  )
}
