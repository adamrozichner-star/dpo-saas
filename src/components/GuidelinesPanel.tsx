'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info, Circle, Lock, BookOpen } from 'lucide-react'
import type { ComplianceGuideline } from '@/lib/compliance-engine'

interface GuidelinesPanelProps {
  guidelines: ComplianceGuideline[]
  isPaid: boolean
  onResolve: (actionId: string, note?: string) => void
  onUndo: (actionId: string) => void
}

export default function GuidelinesPanel({ guidelines, isPaid, onResolve, onUndo }: GuidelinesPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const resolved = guidelines.filter(g => g.status === 'resolved' || g.status === 'not_required')
  const required = guidelines.filter(g => g.status === 'required')
  const info = guidelines.filter(g => g.status === 'info')

  const total = guidelines.length
  const doneCount = resolved.length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCheck = (gl: ComplianceGuideline) => {
    if (!isPaid) return
    // Resolve all linked action IDs
    for (const aid of gl.actionIds) {
      onResolve(aid, `הנחיה "${gl.title}" סומנה כבוצע`)
    }
    // Also resolve with guideline id prefix for guidelines without actions
    if (gl.actionIds.length === 0) {
      onResolve(`gl:${gl.id}`, `הנחיה "${gl.title}" סומנה כבוצע`)
    }
  }

  const handleUncheck = (gl: ComplianceGuideline) => {
    for (const aid of gl.actionIds) {
      onUndo(aid)
    }
    if (gl.actionIds.length === 0) {
      onUndo(`gl:${gl.id}`)
    }
  }

  const getStatusConfig = (status: ComplianceGuideline['status']) => {
    switch (status) {
      case 'resolved':
        return {
          bg: 'bg-emerald-50', border: 'border-emerald-200',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          badge: 'bg-emerald-100 text-emerald-700', badgeText: 'הושלם',
        }
      case 'required':
        return {
          bg: 'bg-amber-50/70', border: 'border-amber-200',
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          badge: 'bg-amber-100 text-amber-700', badgeText: 'נדרש טיפול',
        }
      case 'not_required':
        return {
          bg: 'bg-stone-50', border: 'border-stone-200',
          icon: <Circle className="h-5 w-5 text-stone-300" />,
          badge: 'bg-stone-100 text-stone-500', badgeText: 'לא נדרש',
        }
      case 'info':
        return {
          bg: 'bg-blue-50/50', border: 'border-blue-200',
          icon: <Info className="h-5 w-5 text-blue-400" />,
          badge: 'bg-blue-100 text-blue-600', badgeText: 'לידיעה',
        }
    }
  }

  // Sort: required first (by priority), then info, then resolved, then not_required
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const statusOrder = { required: 0, info: 1, resolved: 2, not_required: 3 }
  const sorted = [...guidelines].sort((a, b) => {
    const sd = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    if (sd !== 0) return sd
    return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-stone-50/50 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 text-right">
          <h2 className="text-base font-semibold text-stone-800 flex items-center gap-2">
            הנחיות רגולטוריות — תיקון 13
            <span className="text-xs font-normal bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {doneCount}/{total}
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden max-w-[200px]">
              <div
                className="h-full rounded-full transition-all duration-700 bg-indigo-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-stone-400">{progress}%</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-5 w-5 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="h-5 w-5 text-stone-400 flex-shrink-0" />
        }
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-4">
          {/* Summary badges */}
          {required.length > 0 && (
            <div className="mb-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 font-medium">
                {required.length} הנחיות דורשות טיפול
                {!isPaid && ' — הפעילו את המערכת כדי לסמן כבוצע'}
              </span>
            </div>
          )}

          {/* Guidelines list */}
          <div className="space-y-2">
            {sorted.map(gl => {
              const config = getStatusConfig(gl.status)
              const isExpanded = expandedItems.has(gl.id)
              const isCheckable = gl.status === 'required' || gl.status === 'info'
              const isUserResolved = gl.status === 'resolved' && gl.resolvedReason?.includes('סומן כבוצע')

              return (
                <div
                  key={gl.id}
                  className={`rounded-xl border transition-all ${config.border} ${config.bg}`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox / status icon */}
                    {isCheckable && isPaid ? (
                      <button
                        onClick={() => handleCheck(gl)}
                        className="w-5 h-5 rounded border-2 border-stone-300 flex-shrink-0 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center"
                        title="סמן כבוצע"
                      />
                    ) : isCheckable && !isPaid ? (
                      <div className="w-5 h-5 rounded border-2 border-stone-200 flex-shrink-0 flex items-center justify-center bg-stone-50">
                        <Lock className="h-2.5 w-2.5 text-stone-300" />
                      </div>
                    ) : gl.status === 'resolved' ? (
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0">
                        <Circle className="h-5 w-5 text-stone-300" />
                      </div>
                    )}

                    {/* Icon + title */}
                    <span className="text-base flex-shrink-0">{gl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${gl.status === 'resolved' || gl.status === 'not_required' ? 'text-stone-500' : 'text-stone-800'}`}>
                        {gl.title}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${config.badge}`}>
                      {config.badgeText}
                    </span>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleItem(gl.id)}
                      className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer flex-shrink-0"
                    >
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-0 mr-8 border-t border-stone-100 mt-0">
                      <div className="pt-3 space-y-2">
                        <p className="text-sm text-stone-600 leading-relaxed">{gl.description}</p>
                        <p className="text-xs text-stone-400">
                          <span className="font-medium">בסיס חוקי:</span> {gl.legalBasis}
                        </p>
                        {gl.resolvedReason && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {gl.resolvedReason}
                          </p>
                        )}
                        {/* Undo for user-resolved */}
                        {isUserResolved && isPaid && (
                          <button
                            onClick={() => handleUncheck(gl)}
                            className="text-xs text-stone-400 hover:text-rose-500 transition-colors cursor-pointer mt-1"
                          >
                            ↩ בטל סימון
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
