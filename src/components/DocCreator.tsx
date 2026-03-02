'use client'

import { useState, useCallback } from 'react'
import { FileText, Loader2, CheckCircle2, Shield, Lock as LockIcon, BookOpen, Users, FileCheck, ClipboardList } from 'lucide-react'
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
  { type: 'security_policy', label: 'מדיניות אבטחת מידע', description: 'נהלי אבטחה בהתאם לתקנות אבטחת מידע 2017', icon: LockIcon, iconColor: 'text-red-600', iconBg: 'bg-red-50' },
  { type: 'dpo_appointment', label: 'כתב מינוי DPO', description: 'כתב מינוי ממונה הגנת פרטיות', icon: FileCheck, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
  { type: 'database_definition', label: 'הגדרת מאגרי מידע', description: 'תיעוד מפורט של מאגרי המידע בארגון', icon: ClipboardList, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  { type: 'consent_form', label: 'טופס הסכמה', description: 'טופס הסכמה מדעת לאיסוף מידע', icon: Users, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
  { type: 'ropa', label: 'מפת עיבוד נתונים (ROPA)', description: 'תיעוד פעילויות עיבוד מידע', icon: BookOpen, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
  { type: 'dpa', label: 'הסכם עיבוד מידע (DPA)', description: 'הסכם עם ספקים חיצוניים המעבדים מידע', icon: FileText, iconColor: 'text-stone-600', iconBg: 'bg-stone-100' },
]

export default function DocCreator({ orgId, orgName, businessId, v3Answers, supabase, isPaid, existingDocTypes, onDocumentCreated }: DocCreatorProps) {
  const [generating, setGenerating] = useState<string | null>(null)
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

  const generateDocument = async (docType: string) => {
    if (!isPaid) return
    setGenerating(docType)

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

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה ביצירת המסמך')
      }

      toast('המסמך נוצר ונשלח לאישור הממונה')
      onDocumentCreated()
    } catch (err: any) {
      toast(err.message || 'שגיאה ביצירת המסמך', 'error')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        בחרו סוג מסמך — המערכת תייצר אותו על בסיס נתוני הארגון שהוזנו באשף.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {DOC_TYPE_OPTIONS.map(opt => {
          const exists = existingDocTypes.includes(opt.type)
          const isGenerating = generating === opt.type
          const Icon = opt.icon

          return (
            <button
              key={opt.type}
              onClick={() => generateDocument(opt.type)}
              disabled={!isPaid || isGenerating || !!generating}
              className={`text-right p-4 rounded-xl border transition-all cursor-pointer disabled:cursor-not-allowed ${
                exists
                  ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  : 'bg-white border-stone-200 hover:border-indigo-200 hover:shadow-sm'
              } ${!isPaid ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                  {isGenerating ? (
                    <Loader2 className={`h-5 w-5 animate-spin ${opt.iconColor}`} />
                  ) : (
                    <Icon className={`h-5 w-5 ${opt.iconColor}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-800">{opt.label}</h3>
                    {exists && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        קיים
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{opt.description}</p>
                  {isGenerating && (
                    <p className="text-xs text-indigo-500 mt-1 font-medium">מייצר מסמך...</p>
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
