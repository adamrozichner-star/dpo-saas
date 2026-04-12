'use client'

import { useState, useEffect } from 'react'
import { X, HelpCircle, AlertTriangle, CheckCircle2, BookOpen, FileText, Loader2, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Finding {
  id: string
  area: string
  severity: 'ok' | 'warning' | 'critical'
  title: string
  description: string
  recommendation: string
}

// Derive document status from finding id pattern
function deriveDocumentStatus(finding: Finding): string {
  const id = finding.id || ''
  if (id.startsWith('pending-')) return 'pending_approval'
  if (id.startsWith('stale-')) return 'expired'
  if (id.startsWith('no-') || id.startsWith('missing-')) return 'missing'
  if (id.endsWith('-ok')) return 'approved'
  return 'unknown'
}

interface CoachResponse {
  explanation: string
  whyItMatters: string
  actionSteps: string[]
  documentToCreate: string | null
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

interface ComplianceCoachPanelProps {
  finding: Finding
  supabase: any
  onClose: () => void
}

const urgencyLabels: Record<string, { label: string; color: string }> = {
  critical: { label: 'קריטי — יש לטפל מיד', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'גבוה — דורש טיפול בהקדם', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'בינוני — מומלץ לטפל', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: 'נמוך — לשיפור מתמשך', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

const docTypeLabels: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות',
  security_policy: 'נוהל אבטחת מידע',
  dpo_appointment: 'כתב מינוי ממונה',
  database_registration: 'רישום מאגרי מידע',
  ropa: 'מפת עיבוד מידע (ROPA)',
}

export default function ComplianceCoachPanel({ finding, supabase, onClose }: ComplianceCoachPanelProps) {
  const [data, setData] = useState<CoachResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchCoach = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        }

        const res = await fetch('/api/compliance-coach', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            findingId: finding.id,
            findingTitle: finding.title,
            findingDescription: finding.description,
            documentStatus: deriveDocumentStatus(finding),
          }),
        })

        const result = await res.json()
        if (!res.ok) {
          console.error('Coach API error response:', result, 'status:', res.status)
          throw new Error(result.details || result.error || 'Failed to fetch')
        }
        if (result.error) {
          console.error('Coach API returned error:', result)
          throw new Error(result.details || result.error)
        }
        setData(result)
      } catch (e: any) {
        console.error('Coach fetch error:', e)
        setError(`לא הצלחנו לטעון את ההסבר: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchCoach()
  }, [finding.id, finding.title, finding.description, supabase])

  const docStatus = deriveDocumentStatus(finding)
  const isPendingApproval = docStatus === 'pending_approval'

  const handleCreateDoc = () => {
    if (isPendingApproval) {
      router.push('/dashboard?tab=documents')
      onClose()
      return
    }
    if (data?.documentToCreate) {
      router.push(`/dashboard?tab=documents&createDoc=${data.documentToCreate}`)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-r border-stone-200" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-gradient-to-l from-amber-50 to-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <HelpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-800 text-sm">יועץ ציות</h3>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-stone-400" />
                <span className="text-[10px] text-stone-400">Deepo</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {/* Finding header */}
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-sm font-medium text-stone-700">{finding.title}</p>
          <span className="text-xs text-stone-500">{finding.area}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">מנתח את הממצא...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Urgency badge */}
              {data.urgency && urgencyLabels[data.urgency] && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${urgencyLabels[data.urgency].color}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {urgencyLabels[data.urgency].label}
                </div>
              )}

              {/* Explanation */}
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <h4 className="text-sm font-semibold text-stone-700">מה זה אומר?</h4>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">{data.explanation}</p>
              </div>

              {/* Legal basis */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-amber-800">למה זה חשוב?</h4>
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed">{data.whyItMatters}</p>
              </div>

              {/* Action steps */}
              {data.actionSteps && data.actionSteps.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-sm font-semibold text-stone-700">מה לעשות?</h4>
                  </div>
                  <div className="space-y-2">
                    {data.actionSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-stone-600 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action CTA — adapts to document status */}
              {isPendingApproval ? (
                <button
                  onClick={handleCreateDoc}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  צפו במסמך לאישור
                </button>
              ) : data.documentToCreate && (
                <button
                  onClick={handleCreateDoc}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  {docStatus === 'expired' ? `עדכנו ${docTypeLabels[data.documentToCreate] || 'מסמך'}` : `צור ${docTypeLabels[data.documentToCreate] || 'מסמך'} עכשיו`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
