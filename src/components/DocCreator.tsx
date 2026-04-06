'use client'

import { useState, useCallback } from 'react'
import { FileText, Loader2, CheckCircle2, Shield, Lock as LockIcon, BookOpen, Users, FileCheck, ClipboardList, Database } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface DocCreatorProps {
  orgId: string
  orgName: string
  businessId?: string
  v3Answers: any
  supabase: any
  isPaid: boolean
  existingDocTypes: string[]
  onDocumentCreated: () => void
}

interface DocTypeOption {
  type: string
  label: string
  description: string
  icon: typeof FileText
  iconColor: string
  iconBg: string
}

const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { type: 'privacy_policy', label: 'מדיניות פרטיות', description: 'מדיניות הגנת פרטיות מלאה בהתאם לתיקון 13', icon: Shield, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
  { type: 'security_procedures', label: 'מדיניות אבטחת מידע', description: 'נהלי אבטחה בהתאם לתקנות אבטחת מידע 2017', icon: LockIcon, iconColor: 'text-red-600', iconBg: 'bg-red-50' },
  { type: 'dpo_appointment', label: 'כתב מינוי DPO', description: 'כתב מינוי ממונה הגנת פרטיות', icon: FileCheck, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
  { type: 'database_definition', label: 'הגדרת מאגרי מידע', description: 'תיעוד מפורט של מאגרי המידע בארגון', icon: ClipboardList, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  { type: 'consent_form', label: 'טופס הסכמה', description: 'טופס הסכמה מדעת לאיסוף מידע', icon: Users, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
  { type: 'ropa', label: 'מפת עיבוד נתונים (ROPA)', description: 'תיעוד פעילויות עיבוד מידע', icon: BookOpen, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
  { type: 'processor_agreement', label: 'הסכם עיבוד מידע (DPA)', description: 'הסכם עם ספקים חיצוניים המעבדים מידע', icon: FileText, iconColor: 'text-stone-600', iconBg: 'bg-stone-100' },
  { type: 'database_structure', label: 'מסמך מבנה מאגר', description: 'תיעוד מבנה מאגרי מידע, סיווג אבטחה ומעבדים', icon: Database, iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
]

export default function DocCreator({ orgId, orgName, businessId, v3Answers, supabase, isPaid, existingDocTypes, onDocumentCreated }: DocCreatorProps) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState(0)
  const [lastCreated, setLastCreated] = useState<{ type: string; label: string } | null>(null)
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

  const generateDocument = async (docType: string, label: string) => {
    if (!isPaid) return
    setGenerating(docType)
    setGenProgress(0)
    setLastCreated(null)

    const progressTimer = setInterval(() => {
      setGenProgress(p => {
        if (p >= 90) { clearInterval(progressTimer); return 90 }
        return p + (p < 30 ? 8 : p < 60 ? 4 : 2)
      })
    }, 500)

    try {
      const res = await authFetch('/api/generate-documents', {
        method: 'POST',
        body: JSON.stringify({
          orgId,
          orgName,
          businessId: businessId || '',
          answers: [],
          v3Answers,
          singleDocType: docType,
        })
      })

      clearInterval(progressTimer)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה ביצירת המסמך')
      }

      setGenProgress(100)
      setLastCreated({ type: docType, label })
      toast(`${label} — נוצר בהצלחה ונשלח לאישור הממונה`)
      onDocumentCreated()
      setTimeout(() => { setGenerating(null); setGenProgress(0) }, 1200)
    } catch (err: any) {
      clearInterval(progressTimer)
      toast(err.message || 'שגיאה ביצירת המסמך', 'error')
      setGenerating(null)
      setGenProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        בחרו סוג מסמך — המערכת תייצר אותו על בסיס נתוני הארגון שהוזנו באשף.
      </p>

      {/* Progress banner */}
      {generating && (
        <div className="bg-gradient-to-l from-indigo-50 to-white rounded-xl p-4 border border-indigo-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 text-indigo-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-800">
                {genProgress >= 100 ? '✅ המסמך נוצר!' : `מייצר ${DOC_TYPE_OPTIONS.find(o => o.type === generating)?.label || 'מסמך'}...`}
              </p>
              <p className="text-xs text-indigo-500">
                {genProgress < 30 ? 'מנתח נתוני ארגון...' : genProgress < 60 ? 'כותב באמצעות AI...' : genProgress < 90 ? 'שומר ושולח לאישור...' : 'הושלם!'}
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${genProgress}%` }} />
          </div>
        </div>
      )}

      {/* Success banner */}
      {!generating && lastCreated && (
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">{lastCreated.label} — נוצר בהצלחה!</span>
          </div>
          <button onClick={() => setLastCreated(null)} className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer">✕</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {DOC_TYPE_OPTIONS.map(opt => {
          const exists = existingDocTypes.includes(opt.type)
          const isGenerating = generating === opt.type
          const justCreated = lastCreated?.type === opt.type
          const Icon = opt.icon

          return (
            <button
              key={opt.type}
              onClick={() => generateDocument(opt.type, opt.label)}
              disabled={!isPaid || isGenerating || !!generating}
              className={`text-right p-4 rounded-xl border transition-all cursor-pointer disabled:cursor-not-allowed ${
                justCreated
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                  : exists
                  ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  : 'bg-white border-stone-200 hover:border-indigo-200 hover:shadow-sm'
              } ${!isPaid ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${justCreated ? 'bg-emerald-100' : opt.iconBg}`}>
                  {isGenerating ? (
                    <Loader2 className={`h-5 w-5 animate-spin ${opt.iconColor}`} />
                  ) : justCreated ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Icon className={`h-5 w-5 ${opt.iconColor}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-800">{opt.label}</h3>
                    {justCreated ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✓ נוצר!</span>
                    ) : exists ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">קיים</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{opt.description}</p>
                  {isGenerating && (
                    <p className="text-xs text-indigo-500 mt-1 font-medium">מייצר באמצעות AI...</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {!isPaid && (
        <div className="bg-stone-50 rounded-lg p-3 text-center text-sm text-stone-500">
          🔒 הפעילו את המערכת כדי ליצור מסמכים
        </div>
      )}
    </div>
  )
}
