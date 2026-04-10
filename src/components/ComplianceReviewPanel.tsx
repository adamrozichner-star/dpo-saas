'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Finding {
  id: string
  area: string
  severity: 'ok' | 'warning' | 'critical'
  title: string
  description: string
  recommendation: string
}

interface ComplianceReviewPanelProps {
  orgId: string
  supabase: any
}

const severityConfig = {
  ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
}

export default function ComplianceReviewPanel({ orgId, supabase }: ComplianceReviewPanelProps) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [summary, setSummary] = useState<{ critical: number; warning: number; ok: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewedAt, setReviewedAt] = useState<string | null>(null)
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {}
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  const applyReviewData = (data: any) => {
    setFindings(data.findings || [])
    setScore(data.score ?? null)
    setSummary(data.summary || null)
    setReviewedAt(data.reviewedAt || null)
  }

  // Load last saved review on mount
  useEffect(() => {
    const loadLastReview = async () => {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch('/api/compliance-review', { headers })
        const data = await res.json()
        if (data.score !== null && data.score !== undefined) {
          applyReviewData(data)
        }
      } catch (e) { console.error('Failed to load last review:', e) }
    }
    loadLastReview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runReview = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/compliance-review', { method: 'POST', headers })
      const data = await res.json()
      applyReviewData(data)
    } catch (e) { console.error('Failed to run review:', e) }
    finally { setLoading(false) }
  }

  const getScoreColor = (s: number) => s >= 70 ? 'text-emerald-600' : s >= 40 ? 'text-amber-600' : 'text-red-600'
  const getScoreBarColor = (s: number) => s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-stone-800">סקירת ציות</h3>
        </div>
        <button onClick={runReview} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'סוקר...' : 'הרץ סקירה'}
        </button>
      </div>

      {score !== null && (
        <>
          <div className="mb-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
              <span className="text-stone-400">/100</span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(score)}`} style={{ width: `${score}%` }} />
            </div>
          </div>

          {summary && (
            <div className="flex gap-3 mb-5 flex-wrap">
              {summary.critical > 0 && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"><AlertTriangle className="h-3 w-3" /> {summary.critical} קריטי</span>}
              {summary.warning > 0 && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"><AlertCircle className="h-3 w-3" /> {summary.warning} אזהרות</span>}
              {summary.ok > 0 && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> {summary.ok} תקין</span>}
            </div>
          )}

          <div className="space-y-2">
            {findings.map(finding => {
              const config = severityConfig[finding.severity]
              const Icon = config.icon
              const isExpanded = expandedFinding === finding.id
              return (
                <div key={finding.id} className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}>
                    <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${config.text}`}>{finding.title}</p>
                      <span className="text-xs text-stone-500">{finding.area}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-stone-200/50 pt-2">
                      <p className="text-sm text-stone-600 mb-2">{finding.description}</p>
                      {finding.recommendation && <p className="text-sm text-indigo-600 font-medium">💡 {finding.recommendation}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {reviewedAt && <p className="text-xs text-stone-400 mt-3">סקירה אחרונה: {new Date(reviewedAt).toLocaleString('he-IL')}</p>}
        </>
      )}

      {score === null && !loading && <p className="text-sm text-stone-400 text-center py-6">לחצו על &quot;הרץ סקירה&quot; כדי לבדוק את מצב הציות</p>}
    </div>
  )
}
