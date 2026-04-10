'use client'

import { useState } from 'react'
import { X, AlertCircle, Loader2, Shield } from 'lucide-react'
import { MissingField } from '@/lib/doc-requirements'

interface MissingInfoModalProps {
  docType: string
  docLabel: string
  missingFields: MissingField[]
  onComplete: (values: Record<string, string>) => void
  onCancel: () => void
}

const FIELD_PLACEHOLDERS: Record<string, string> = {
  bizName: 'לדוגמה: חברת אלפא בע"מ',
  companyId: 'לדוגמה: 515123456',
  industry: 'לדוגמה: טכנולוגיה, שירותים, בריאות',
  securityOwner: 'לדוגמה: בעל העסק, איש IT',
}

const INDUSTRY_OPTIONS = [
  { v: 'health', l: 'בריאות / רפואה' },
  { v: 'retail', l: 'קמעונאות / מסחר' },
  { v: 'tech', l: 'טכנולוגיה / הייטק' },
  { v: 'services', l: 'שירותים מקצועיים' },
  { v: 'finance', l: 'פיננסים / ביטוח' },
  { v: 'education', l: 'חינוך / הדרכה' },
  { v: 'legal', l: 'משפטים' },
  { v: 'food', l: 'מזון / הסעדה' },
  { v: 'realestate', l: 'נדל"ן' },
  { v: 'other', l: 'אחר' },
]

export default function MissingInfoModal({ docType, docLabel, missingFields, onComplete, onCancel }: MissingInfoModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const updateField = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  const allFilled = missingFields.every(f => values[f.field]?.trim())

  const handleSubmit = () => {
    if (!allFilled) return
    setSaving(true)
    onComplete(values)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-stone-200 bg-gradient-to-l from-amber-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">פרטים חסרים</h3>
                  <p className="text-xs text-stone-500">נדרשים ליצירת {docLabel}</p>
                </div>
              </div>
              <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="p-5 space-y-4">
            <p className="text-sm text-stone-500">השלימו את הפרטים הבאים כדי שנוכל ליצור מסמך מדויק:</p>

            {missingFields.map(f => (
              <div key={f.field}>
                <label className="text-sm font-medium text-stone-700 block mb-1">{f.label}</label>
                {f.field === 'industry' ? (
                  <select
                    value={values[f.field] || ''}
                    onChange={e => updateField(f.field, e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">בחרו תחום...</option>
                    {INDUSTRY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : (
                  <input
                    value={values[f.field] || ''}
                    onChange={e => updateField(f.field, e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS[f.field] || ''}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-indigo-400"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-stone-100 flex items-center justify-between">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allFilled || saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {saving ? 'שומר...' : 'המשך ליצירת מסמך'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
