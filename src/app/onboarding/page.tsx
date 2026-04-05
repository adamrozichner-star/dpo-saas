'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, ArrowRight, CheckCircle2, Database,
  Lock, FileCheck, Loader2, AlertCircle, User, Sparkles,
  Mail, MessageCircle, Send, ChevronDown, ChevronUp
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { OnboardingAnswer } from '@/types'

// ═══════════════════════════════════════════════════════
// CARD DATA CONSTANTS
// ═══════════════════════════════════════════════════════

const INDUSTRIES = [
  { v: 'health', l: '🏥 בריאות' }, { v: 'retail', l: '🛍️ קמעונאות' },
  { v: 'tech', l: '💻 טכנולוגיה' }, { v: 'services', l: '🔧 שירותים' },
  { v: 'finance', l: '💰 פיננסים' }, { v: 'education', l: '📚 חינוך' },
  { v: 'legal', l: '⚖️ משפט' }, { v: 'food', l: '🍽️ מזון' },
  { v: 'realestate', l: '🏠 נדל״ן' },
]

const ACCESS_RANGES = [
  { v: '1-2', l: '1-2', desc: 'ניהול יחיד', num: 2 },
  { v: '3-10', l: '3-10', desc: 'צוות קטן', num: 10 },
  { v: '11-50', l: '11-50', desc: 'ארגון בינוני', num: 50 },
  { v: '50-100', l: '50-100', desc: 'ארגון גדול', num: 100 },
  { v: '100+', l: '100+', desc: 'ארגון ענק', num: 150 },
]

const DB_TYPES = [
  { v: 'customers', l: '📋 לקוחות', icon: '📋' },
  { v: 'cvs', l: '📄 קו"ח / מועמדים', icon: '📄' },
  { v: 'employees', l: '👥 עובדים', icon: '👥' },
  { v: 'cameras', l: '📹 מצלמות', icon: '📹' },
  { v: 'website_leads', l: '🌐 לידים מהאתר', icon: '🌐' },
  { v: 'suppliers_id', l: '🔑 עוסק מורשה', icon: '🔑' },
  { v: 'payments', l: '💳 תשלומים', icon: '💳' },
  { v: 'medical', l: '🏥 רפואי', icon: '🏥' },
]

const SIZE_RANGES = [
  { v: 'under100', l: 'עד 100', num: 50 },
  { v: '100-1k', l: '100–1,000', num: 500 },
  { v: '1k-10k', l: '1,000–10,000', num: 5000 },
  { v: '10k-100k', l: '10,000–100,000', num: 50000 },
  { v: '100k+', l: '100,000+', num: 150000 },
]

const DB_FIELDS: Record<string, string[]> = {
  customers: ['שם', 'טלפון', 'אימייל', 'כתובת', 'ת.ז', 'מידע פיננסי', 'היסטוריית רכישות'],
  cvs: ['שם', 'טלפון', 'אימייל', 'ת.ז', 'ניסיון תעסוקתי', 'השכלה', 'המלצות'],
  employees: ['שם', 'ת.ז', 'כתובת', 'שכר', 'חשבון בנק', 'ביצועים', 'מידע רפואי'],
  cameras: ['צילום פנים', 'מיקום', 'תאריך ושעה'],
  website_leads: ['שם', 'טלפון', 'אימייל', 'כתובת IP', 'עמודים שנצפו'],
  suppliers_id: ['שם', 'ת.ז / ח.פ', 'טלפון', 'חשבון בנק', 'פרטי חוזה'],
  payments: ['שם', 'מספר כרטיס', 'תוקף', 'CVV', 'כתובת חיוב'],
  medical: ['שם', 'ת.ז', 'מידע רפואי', 'אבחנות', 'תרופות', 'ביטוח'],
}

const SENSITIVE_FIELDS = [
  'ת.ז', 'מידע פיננסי', 'שכר', 'חשבון בנק', 'מידע רפואי',
  'אבחנות', 'תרופות', 'מספר כרטיס', 'CVV', 'צילום פנים', 'ביצועים', 'כתובת IP',
]

const RETENTION_OPTIONS = [
  { v: 'never', l: '😬 אף פעם' },
  { v: 'sometimes', l: '🤷 לפעמים' },
  { v: 'quarterly', l: '📅 כל רבעון' },
  { v: 'policy', l: '✅ יש נוהל' },
]

const OWNER_OPTIONS = [
  { v: 'none', l: '❌ אין' },
  { v: 'owner', l: '👤 בעל העסק' },
  { v: 'it', l: '💻 איש IT' },
  { v: 'external', l: '🏢 חברה חיצונית' },
]

const STORAGE_OPTIONS = [
  { v: 'email', l: '📧 מייל' }, { v: 'crm', l: '📊 CRM' },
  { v: 'cloud', l: '☁️ ענן' }, { v: 'paper', l: '📁 פיזי' },
  { v: 'local', l: '💻 מחשב מקומי' }, { v: 'erp', l: '🔄 ERP / שכר' },
]

const PROCESSOR_OPTIONS = [
  { v: 'crm_saas', l: '📊 CRM / מערכת ניהול' },
  { v: 'payroll', l: '💰 שכר / HR' },
  { v: 'marketing', l: '📢 שיווק / דיוור' },
  { v: 'cloud_hosting', l: '☁️ אחסון ענן' },
  { v: 'call_center', l: '📞 מוקד שירות' },
  { v: 'accounting', l: '🧮 הנה"ח / רו"ח' },
]

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface V3Answers {
  bizName?: string
  companyId?: string
  industry?: string
  industryOther?: string
  access?: string
  databases?: string[]
  customDatabases?: string[]
  totalSize?: string
  storage?: string[]
  customStorage?: string[]
  securityOwner?: string
  securityOwnerOther?: string
  securityOwnerName?: string
  cameraOwner?: string
  cameraOwnerOther?: string
  cameraOwnerName?: string
  accessControl?: string
  processors?: string[]
  customProcessors?: string[]
  hasConsent?: string
  dbDetails?: Record<string, { fields?: string[]; size?: string; retention?: string; access?: string }>
  [key: string]: any
}

interface DBClassification {
  type: string
  level: string
  levelHe: string
  color: string
  emoji: string
  reasons: string[]
  alerts: string[]
  hasSensitive: boolean
  sizeNum: number
}

interface CardDef {
  id: string
  icon: string
  q: string
  type: string
  placeholder?: string
  hint?: string
  lawRef?: string
}

// ═══════════════════════════════════════════════════════
// CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════

function classifyDB(dbType: string, answers: V3Answers): Omit<DBClassification, 'type'> {
  const detail = answers.dbDetails?.[dbType] || {}
  const fields = detail.fields || []
  const size = detail.size || 'under100'
  const hasSensitive = fields.some(f => SENSITIVE_FIELDS.includes(f))
  const sizeNum = SIZE_RANGES.find(s => s.v === size)?.num || 50
  const accessNum = ACCESS_RANGES.find(a => a.v === detail.access)?.num || ACCESS_RANGES.find(a => a.v === answers.access)?.num || 10

  let level = 'basic', levelHe = 'בסיסי', color = '#22c55e', emoji = '✅', reasons: string[] = []

  if (hasSensitive) { level = 'medium'; levelHe = 'בינוני'; color = '#f59e0b'; emoji = '⚠️'; reasons.push('מכיל מידע רגיש') }
  if (dbType === 'cameras') { level = 'medium'; levelHe = 'בינוני'; color = '#f59e0b'; emoji = '⚠️'; reasons.push('צילום = מידע אישי') }
  if (dbType === 'medical') { level = 'medium'; levelHe = 'בינוני'; color = '#f59e0b'; emoji = '⚠️'; reasons.push('מידע רפואי = רגיש') }
  if (sizeNum >= 100000 || accessNum >= 100) {
    level = 'high'; levelHe = 'גבוהה'; color = '#ef4444'; emoji = '🔴'
    if (sizeNum >= 100000) reasons.push('מעל 100,000 נושאי מידע')
    if (accessNum >= 100) reasons.push('מעל 100 בעלי הרשאה')
  }
  if ((detail.access === '1-2' || (!detail.access && answers.access === '1-2')) && sizeNum < 10000 && !hasSensitive && dbType !== 'cameras' && dbType !== 'medical') {
    level = 'individual'; levelHe = 'ניהול יחיד'; color = '#6366f1'; emoji = '👤'
    reasons = ['עד 2 בעלי הרשאה, ללא מידע רגיש']
  }

  const alerts: string[] = []
  if (dbType === 'cvs' && detail.retention && !['quarterly', 'policy'].includes(detail.retention))
    alerts.push('חובה למחוק קו"ח כל 3 חודשים (עד שנתיים לצורך מקצועי)')
  if (dbType === 'website_leads' && answers.hasConsent === 'no')
    alerts.push('חובה להוסיף מנגנון הסכמה בטפסי האתר')
  if (dbType === 'cameras' && !answers.cameraOwnerName)
    alerts.push('נדרש למנות אחראי מצלמות בכתב')

  return { level, levelHe, color, emoji, reasons, alerts, hasSensitive, sizeNum }
}

// ═══════════════════════════════════════════════════════
// V3 → LEGACY ANSWER MAPPING (for document generator)
// ═══════════════════════════════════════════════════════

function mapV3ToLegacyAnswers(v3: V3Answers): OnboardingAnswer[] {
  const answers: OnboardingAnswer[] = []
  const push = (id: string, val: any) => { if (val !== undefined && val !== null) answers.push({ questionId: id, value: val }) }

  push('business_name', v3.bizName)
  push('business_id', v3.companyId)

  const industryMap: Record<string, string> = {
    health: 'healthcare', retail: 'retail', tech: 'technology',
    services: 'services', finance: 'finance', education: 'education',
    legal: 'services', food: 'retail', realestate: 'services', other: 'other'
  }
  push('business_type', industryMap[v3.industry || ''] || 'other')

  const accessToEmp: Record<string, string> = {
    '1-2': '1-10', '3-10': '1-10', '11-50': '11-50', '50-100': '51-200', '100+': '200+'
  }
  // Derive max access across all DBs
  const allAccess = Object.values(v3.dbDetails || {}).map(d => d.access).filter(Boolean) as string[]
  const maxAccess = allAccess.length > 0
    ? allAccess.reduce((max, a) => {
        const maxNum = ACCESS_RANGES.find(r => r.v === max)?.num || 0
        const aNum = ACCESS_RANGES.find(r => r.v === a)?.num || 0
        return aNum > maxNum ? a : max
      })
    : v3.access || '3-10'
  push('employee_count', accessToEmp[maxAccess] || '1-10')

  const dataTypes: string[] = []
  const dbs = v3.databases || []
  if (dbs.some(d => ['customers', 'employees', 'cvs'].includes(d))) dataTypes.push('contact')
  if (dbs.some(d => ['employees', 'cvs', 'suppliers_id'].includes(d))) dataTypes.push('id')
  if (dbs.some(d => ['payments', 'customers'].includes(d))) { if (!dataTypes.includes('financial')) dataTypes.push('financial') }
  if (dbs.includes('medical')) dataTypes.push('health')
  if (dbs.includes('cameras')) dataTypes.push('biometric')
  if (dbs.includes('website_leads')) dataTypes.push('behavioral')
  if (dbs.some(d => ['employees', 'cvs'].includes(d))) { if (!dataTypes.includes('employment')) dataTypes.push('employment') }
  Object.values(v3.dbDetails || {}).forEach(detail => {
    const fields = detail.fields || []
    if (fields.some(f => ['שכר', 'חשבון בנק', 'מידע פיננסי', 'מספר כרטיס'].includes(f)) && !dataTypes.includes('financial'))
      dataTypes.push('financial')
    if (fields.some(f => ['מידע רפואי', 'אבחנות', 'תרופות'].includes(f)) && !dataTypes.includes('health'))
      dataTypes.push('health')
    if (fields.includes('כתובת IP') && !dataTypes.includes('location'))
      dataTypes.push('location')
  })
  push('data_types', dataTypes.length > 0 ? dataTypes : ['contact'])

  const sources: string[] = ['direct']
  if (dbs.includes('website_leads')) sources.push('website')
  if ((v3.processors || []).length > 0) sources.push('third_party')
  if (dbs.some(d => ['employees', 'cvs'].includes(d))) sources.push('employees')
  push('data_sources', sources)

  const purposes: string[] = ['service', 'legal']
  if (dbs.includes('website_leads')) purposes.push('marketing')
  if (dbs.some(d => ['employees', 'cvs'].includes(d))) purposes.push('hr')
  push('processing_purposes', purposes)

  push('third_party_sharing', (v3.processors || []).length > 0 || (v3.customProcessors || []).length > 0)
  push('international_transfer', (v3.storage || []).includes('cloud'))

  if ((v3.storage || []).includes('cloud')) {
    push('cloud_storage', 'international')
  } else if ((v3.storage || []).includes('erp')) {
    push('cloud_storage', 'israeli')
  } else {
    push('cloud_storage', 'none')
  }

  const measures: string[] = []
  if (v3.accessControl === 'strict') { measures.push('access_control'); measures.push('encryption') }
  if (v3.accessControl === 'partial') measures.push('access_control')
  if ((v3.storage || []).includes('cloud')) measures.push('backup')
  if (v3.securityOwner && v3.securityOwner !== 'none') measures.push('firewall')
  if (measures.length === 0) measures.push('none')
  push('security_measures', measures)

  push('previous_incidents', false)
  push('existing_policy', v3.hasConsent === 'yes')
  push('database_registered', 'unknown')

  const totalRecords = Object.values(v3.dbDetails || {}).reduce((sum, d) => {
    return sum + (SIZE_RANGES.find(s => s.v === d.size)?.num || 50)
  }, 0)
  if (totalRecords >= 100000) push('record_count', 'over_100k')
  else if (totalRecords >= 10000) push('record_count', '10k_to_100k')
  else if (totalRecords >= 1000) push('record_count', '1k_to_10k')
  else push('record_count', 'under_1k')

  return answers
}

// ═══════════════════════════════════════════════════════
// CARD COMPONENTS
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// QUESTION-SPECIFIC HELP TIPS
// ═══════════════════════════════════════════════════════
const QUESTION_TIPS: Record<string, { tip: string; why: string }> = {
  bizName: {
    tip: 'הזינו את שם העסק כפי שמופיע ברשם החברות או ברישיון העסק.',
    why: 'השם ישמש במסמכי הציות ובדיווחים לרשות להגנת הפרטיות.'
  },
  companyId: {
    tip: 'ח.פ = חברה פרטית (9 ספרות). ע.מ = עוסק מורשה.',
    why: 'נדרש לזיהוי הארגון מול רשם מאגרי המידע.'
  },
  industry: {
    tip: 'בחרו את התחום העיקרי של העסק. אם יש כמה — בחרו את הדומיננטי.',
    why: 'התחום קובע את רמת הסיכון ואת סוג המאגרים שסביר שקיימים אצלכם.'
  },
  databases: {
    tip: 'מאגר מידע = כל אוסף מאורגן של פרטים אישיים. למשל: רשימת לקוחות, רשימת עובדים, נתוני שכר.',
    why: 'חוק הגנת הפרטיות מחייב רישום מאגרים שמכילים מעל 10,000 רשומות.'
  },
  totalSize: {
    tip: 'חשבו על כל הרשומות בכל המאגרים ביחד — לקוחות, עובדים, ספקים, מנויים.',
    why: 'מעל 10,000 רשומות = חובת רישום ומינוי DPO. זה קריטי לקביעת החובות שלכם.'
  },
  storage: {
    tip: 'סמנו את כל המערכות בהן נשמר מידע אישי — גם אם זה רק אקסל או תיקיות בענן.',
    why: 'מיפוי מערכות נדרש כדי להבין אילו אמצעי אבטחה צריך ליישם.'
  },
  securityOwner: {
    tip: 'ממונה אבטחת מידע = האדם שאחראי על נהלי האבטחה בפועל בארגון.',
    why: 'תיקון 13 מחייב מינוי ממונה. אם אין — אנחנו נעזור לכם למנות.'
  },
  cameraOwner: {
    tip: 'אם יש לכם מצלמות אבטחה — חייב להיות אחראי מוגדר.',
    why: 'מצלמות נחשבות מאגר מידע בפני עצמו ודורשות נהלי מחיקה ושמירה.'
  },
  accessControl: {
    tip: 'עיקרון "הצורך לדעת" — כל עובד צריך לראות רק את המידע הרלוונטי לתפקידו.',
    why: 'הגבלת גישה היא דרישה בסיסית של אבטחת מידע לפי תיקון 13.'
  },
  processors: {
    tip: 'ספקים חיצוניים = כל גורם שמקבל גישה למידע אישי: רואה חשבון, חברת IT, שירות ענן, סליקה.',
    why: 'חייב הסכם עיבוד מול כל ספק. בלי זה — יש חשיפה משפטית.'
  },
  hasConsent: {
    tip: 'מנגנון הסכמה = באנר עוגיות, טופס הרשמה עם צ\'קבוקס, או מדיניות פרטיות באתר.',
    why: 'חובת הסכמה מדעת קיימת בחוק. בלי מנגנון — יש הפרה פוטנציאלית.'
  }
}

// ═══════════════════════════════════════════════════════
// INLINE ONBOARDING HELPER (replaces floating widget)
// ═══════════════════════════════════════════════════════
function OnboardingHelper({ 
  questionId, 
  questionText,
  isDBPhase,
  dbName,
  supabase 
}: { 
  questionId: string | null
  questionText: string | null
  isDBPhase: boolean
  dbName: string | null
  supabase: any
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Reset chat when question changes
  useEffect(() => {
    setMessages([])
    setChatOpen(false)
    setInput('')
  }, [questionId, dbName])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const tip = questionId ? QUESTION_TIPS[questionId] : null

  const sendMessage = async (directMsg?: string) => {
    const userMsg = (directMsg || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const contextHint = isDBPhase && dbName
        ? `המשתמש ממלא פרטים על מאגר "${dbName}". עזור לו.`
        : questionText
          ? `שאלה נוכחית: ${questionText}`
          : ''

      const res = await fetch('/api/chat/contextual', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message: userMsg, 
          context: 'onboarding',
          contextHint,
          extraContext: tip ? `טיפ רלוונטי: ${tip.tip}. הסיבה: ${tip.why}` : ''
        })
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      let fullText = ''
      const decoder = new TextDecoder()

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', text: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              fullText += data.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', text: fullText }
                return copy
              })
            } else if (data.type === 'done') {
              fullText = data.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', text: fullText }
                return copy
              })
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'שגיאה. נסו שוב.' }])
    } finally {
      setLoading(false)
    }
  }

  const helpContext = isDBPhase && dbName
    ? `פירוט מאגר: ${dbName}`
    : questionText || null

  if (!helpContext && !tip) return null

  return (
    <div className="mt-3 space-y-2">
      {/* Contextual tip */}
      {tip && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-amber-100 shadow-sm">
          <p className="text-sm text-stone-600 leading-relaxed">{tip.tip}</p>
          <p className="text-xs text-stone-400 mt-1">📌 {tip.why}</p>
        </div>
      )}

      {/* DB phase tip */}
      {isDBPhase && dbName && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-indigo-100 shadow-sm">
          <p className="text-sm text-stone-600 leading-relaxed">
            מלאו את הפרטים עבור מאגר <strong className="text-indigo-600">{dbName}</strong> — סוגי מידע, מספר רשומות, תקופת שמירה ומי יכול לגשת.
          </p>
          <p className="text-xs text-stone-400 mt-1">📌 כל מאגר נרשם בנפרד מול הרשות.</p>
        </div>
      )}

      {/* Inline chat toggle + chat */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition"
        >
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            צריכים עזרה? שאלו אותי
          </span>
          {chatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {chatOpen && (
          <div className="border-t border-stone-100">
            {/* Messages */}
            {messages.length > 0 && (
              <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-2">
                {messages.map((m, i) => (
                  <div key={i} className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-stone-800 bg-amber-50 px-3 py-2 rounded-lg' : 'text-stone-600 px-1'}`}>
                    {m.text || (loading && i === messages.length - 1 ? '...' : '')}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Quick suggestions */}
            {messages.length === 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5">
                {[
                  'מה זה אומר?',
                  'למה זה חשוב?',
                  'מה לבחור?'
                ].map(s => (
                  <button key={s} onClick={() => sendMessage(s)} 
                    className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-stone-100">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                placeholder="שאלו שאלה..."
                className="flex-1 text-sm bg-transparent border-0 outline-none text-stone-800 placeholder-stone-400"
                disabled={loading}
              />
              <button 
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg disabled:opacity-30 text-amber-600 hover:bg-amber-50 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardShell({ icon, question, hint, lawRef, animDir, children }: {
  icon: string; question: string; hint?: string; lawRef?: string;
  animDir: string; children: React.ReactNode
}) {
  return (
    <div 
      className="bg-white rounded-2xl p-6 shadow-lg transition-all duration-200"
      style={{
        transform: animDir === 'in' ? 'translateX(0)' : 'translateX(-16px)',
        opacity: animDir === 'in' ? 1 : 0,
      }}
    >
      <div className="text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <div className="text-lg font-bold text-gray-800 mb-1 leading-snug">{question}</div>
        {hint && (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3 leading-relaxed">
            💡 {hint}
          </div>
        )}
        {lawRef && (
          <div className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md mb-2">
            ⚖️ {lawRef}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function ChipPicker({ options, value, onSelect, allowOther, otherValue, onOtherChange }: {
  options: { v: string; l: string }[]
  value?: string
  onSelect: (v: string) => void
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (v: string) => void
}) {
  const [showOther, setShowOther] = useState(false)
  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {options.map(o => (
          <button
            key={o.v}
            onClick={() => { setShowOther(false); onSelect(o.v) }}
            className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer font-medium transition-all border-2 ${
              value === o.v
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {o.l}
          </button>
        ))}
        {allowOther && (
          <button
            onClick={() => { setShowOther(true); onSelect('other') }}
            className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer font-medium transition-all border-2 ${
              value === 'other'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            ✏️ אחר
          </button>
        )}
      </div>
      {(showOther || value === 'other') && allowOther && (
        <input
          value={otherValue || ''}
          onChange={e => onOtherChange?.(e.target.value)}
          placeholder="פרטו..."
          autoFocus
          className="mt-3 w-full px-4 py-2.5 rounded-xl border-2 border-amber-300 text-sm text-center outline-none focus:border-amber-400"
        />
      )}
    </div>
  )
}

function MultiPicker({ options, selected, onToggle, allowOther, otherItems, onAddOther, onRemoveOther }: {
  options: { v: string; l: string }[]
  selected: string[]
  onToggle: (v: string) => void
  allowOther?: boolean
  otherItems?: string[]
  onAddOther?: (v: string) => void
  onRemoveOther?: (i: number) => void
}) {
  const [otherText, setOtherText] = useState('')
  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {options.map(o => {
          const sel = selected.includes(o.v)
          return (
            <button
              key={o.v}
              onClick={() => onToggle(o.v)}
              className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer font-medium transition-all border-2 ${
                sel
                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {o.l}
            </button>
          )
        })}
      </div>
      {otherItems && otherItems.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mt-2">
          {otherItems.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-amber-50 border border-amber-400 text-amber-800">
              {item}
              <span onClick={() => onRemoveOther?.(i)} className="cursor-pointer font-bold">×</span>
            </span>
          ))}
        </div>
      )}
      {allowOther && (
        <div className="flex gap-2 mt-3 justify-center">
          <input
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            placeholder="הוסיפו אחר..."
            onKeyDown={e => { if (e.key === 'Enter' && otherText.trim()) { onAddOther?.(otherText.trim()); setOtherText('') }}}
            className="flex-1 max-w-[200px] px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-amber-400"
          />
          <button
            onClick={() => { if (otherText.trim()) { onAddOther?.(otherText.trim()); setOtherText('') }}}
            className="px-4 py-2 rounded-lg border-none bg-amber-500 text-white text-sm font-semibold cursor-pointer hover:bg-amber-600"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

function NamedOwnerPicker({ options, value, onSelect, name, onNameChange, allowOther, otherValue, onOtherChange }: {
  options: { v: string; l: string }[]
  value?: string
  onSelect: (v: string) => void
  name?: string
  onNameChange: (v: string) => void
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (v: string) => void
}) {
  const [showOther, setShowOther] = useState(false)
  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {options.map(o => (
          <button
            key={o.v}
            onClick={() => { setShowOther(false); onSelect(o.v) }}
            className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer font-medium transition-all border-2 ${
              value === o.v
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {o.l}
          </button>
        ))}
        {allowOther && (
          <button
            onClick={() => { setShowOther(true); onSelect('other') }}
            className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer font-medium transition-all border-2 ${
              value === 'other'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            ✏️ אחר
          </button>
        )}
      </div>
      {(showOther || value === 'other') && (
        <input
          value={otherValue || ''}
          onChange={e => onOtherChange?.(e.target.value)}
          placeholder="תארו..."
          autoFocus
          className="mt-2 w-full px-3 py-2 rounded-lg border-2 border-amber-300 text-sm text-center outline-none"
        />
      )}
      {value && value !== 'none' && (
        <input
          value={name || ''}
          onChange={e => onNameChange(e.target.value)}
          placeholder="שם האחראי (מומלץ)"
          className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-center outline-none focus:border-amber-400"
        />
      )}
    </div>
  )
}

function DBDetailCard({ dbType, animDir, onDone, existingDetail }: {
  dbType: string; animDir: string;
  onDone: (detail: { fields: string[]; size: string; retention: string | null; access: string }) => void
  existingDetail?: { fields?: string[]; size?: string; retention?: string; access?: string }
}) {
  const [fields, setFields] = useState<string[]>(existingDetail?.fields || [])
  const [size, setSize] = useState<string | null>(existingDetail?.size || null)
  const [retention, setRetention] = useState<string | null>(existingDetail?.retention || null)
  const [access, setAccess] = useState<string | null>(existingDetail?.access || null)
  const dbInfo = DB_TYPES.find(d => d.v === dbType)
  const availableFields = DB_FIELDS[dbType] || []
  const toggle = (f: string) => setFields(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])
  const ok = fields.length > 0 && size && access

  return (
    <div 
      className="bg-white rounded-2xl p-5 shadow-lg transition-all duration-200"
      style={{
        transform: animDir === 'in' ? 'translateX(0)' : 'translateX(-16px)',
        opacity: animDir === 'in' ? 1 : 0,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">{dbInfo?.icon}</span>
        <div>
          <div className="text-base font-bold text-gray-800">{dbInfo?.l}</div>
          <div className="text-xs text-indigo-500">פירוט מאגר</div>
        </div>
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-2">מה שמור?</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {availableFields.map(f => {
          const sel = fields.includes(f)
          const sens = SENSITIVE_FIELDS.includes(f)
          return (
            <button
              key={f}
              onClick={() => toggle(f)}
              className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all border-[1.5px] ${
                sel
                  ? sens ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              {sens && sel ? '🔒 ' : ''}{f}
            </button>
          )
        })}
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-2">כמה רשומות?</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SIZE_RANGES.map(s => (
          <button
            key={s.v}
            onClick={() => setSize(s.v)}
            className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all border-[1.5px] ${
              size === s.v
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-2">כמה אנשים ניגשים למאגר?</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ACCESS_RANGES.map(a => (
          <button
            key={a.v}
            onClick={() => setAccess(a.v)}
            className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all border-[1.5px] ${
              access === a.v
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {a.l}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-2">מחיקת מידע ישן</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {RETENTION_OPTIONS.map(r => (
          <button
            key={r.v}
            onClick={() => setRetention(r.v)}
            className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all border-[1.5px] ${
              retention === r.v
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {r.l}
          </button>
        ))}
      </div>
      {dbType === 'cvs' && retention && !['quarterly', 'policy'].includes(retention) && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          ⚠️ חובה למחוק כל 3 חודשים (עד שנתיים לצורך מקצועי)
        </div>
      )}

      <button
        onClick={() => ok && onDone({ fields, size: size!, retention, access: access! })}
        disabled={!ok}
        className={`w-full py-2.5 rounded-xl border-none text-sm font-semibold cursor-pointer transition-all ${
          ok ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-300 text-gray-500 cursor-default'
        }`}
      >
        {ok ? '✓ הבא' : 'סמנו שדות, גודל וגישה'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CLASSIFICATION REPORT
// ═══════════════════════════════════════════════════════

function ClassificationReport({ answers, onContinue, isReview }: { answers: V3Answers; onContinue: () => void; isReview?: boolean }) {
  const dbs = answers.databases || []
  const customDBs = answers.customDatabases || []
  const classifications = dbs.map(db => ({ type: db, ...classifyDB(db, answers) }))
  const highest = classifications.reduce((h, c) => {
    const ord: Record<string, number> = { individual: 0, basic: 1, medium: 2, high: 3 }
    return (ord[c.level] || 0) > (ord[h.level] || 0) ? c : h
  }, { level: 'individual', levelHe: 'ניהול יחיד', color: '#6366f1', emoji: '👤' } as any)

  const totalRecords = classifications.reduce((sum, c) => sum + (c.sizeNum || 0), 0)
  const potentialFinePerRecord = totalRecords * 4

  const globalAlerts: string[] = []
  if (answers.securityOwner === 'none') globalAlerts.push('🔴 אין אחראי אבטחת מידע — חובה למנות')
  if (answers.accessControl === 'all') globalAlerts.push('⚠️ כל העובדים רואים הכל — נדרשת בקרת גישה')
  if (answers.hasConsent === 'no') globalAlerts.push('⚠️ אין מנגנון הסכמה באתר — חובה לפי תיקון 13')
  if ((answers.processors || []).length > 0 || (answers.customProcessors || []).length > 0)
    globalAlerts.push('📋 יש ספקים חיצוניים — נדרשים הסכמי עיבוד מידע בכתב')
  if (answers.securityOwner && answers.securityOwner !== 'none' && answers.cameraOwner && answers.securityOwner === answers.cameraOwner)
    globalAlerts.push('⚠️ שימו לב: ממונה פרטיות (DPO) וממונה אבטחת מידע (CISO) צריכים להיות תפקידים נפרדים')

  const generatedDocs = [
    'מדיניות פרטיות', 'נוהלי אבטחת מידע', 'מסמך הגדרות מאגרי מידע', 'כתב מינוי DPO', 'מיפוי מערכות',
    ...(dbs.includes('website_leads') ? ['תקנון אתר + מנגנון הסכמה'] : []),
    ...(dbs.includes('cameras') ? ['מדיניות מצלמות אבטחה'] : []),
    ...((answers.processors?.length || 0) > 0 || (answers.customProcessors?.length || 0) > 0 ? ['הסכם עיבוד מידע לספקים'] : []),
  ]

  return (
    <div dir="rtl">
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="text-xl font-extrabold text-gray-800 m-0">תוצאות סיווג המאגרים</h2>
        <p className="text-xs text-gray-500 mt-1">
          <span>{dbs.length + customDBs.length} מאגרים זוהו</span>
          {answers.bizName && <span> • <bdi>{answers.bizName}</bdi></span>}
        </p>
      </div>

      <div 
        className="p-4 rounded-2xl mb-4 text-center border-2"
        style={{
          background: highest.level === 'high' ? '#fef2f2' : highest.level === 'medium' ? '#fffbeb' : '#f0fdf4',
          borderColor: highest.level === 'high' ? '#fca5a5' : highest.level === 'medium' ? '#fde68a' : '#bbf7d0',
        }}
      >
        <div className="text-xs text-gray-500 mb-1">רמת אבטחה נדרשת</div>
        <div className="text-2xl font-black" style={{ color: highest.color }}>{highest.emoji} {highest.levelHe}</div>
      </div>

      <div className="p-4 rounded-2xl mb-4 border-2 border-red-300" style={{ background: 'linear-gradient(135deg, #fef2f2, #fff7ed)' }}>
        <div className="text-sm font-bold text-red-600 mb-2">⚖️ חשיפה לפי תיקון 13 (בתוקף מ-14.8.2025)</div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-amber-800">עיצום לפי רשומות</div>
            <div className="text-lg font-extrabold text-red-600">₪{potentialFinePerRecord.toLocaleString()}</div>
            <div className="text-[10px] text-red-700">~4₪ × {totalRecords.toLocaleString()} רשומות</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-amber-800">עיצום מקסימלי</div>
            <div className="text-lg font-extrabold text-red-600">5% מהמחזור</div>
            <div className="text-[10px] text-red-700">+ עד 3 שנות מאסר במרמה</div>
          </div>
        </div>
        <div className="text-[11px] text-amber-800 mt-2 p-2 bg-red-50/20 rounded-md">
          💬 ראש הרשות (פבר׳ 2026): ״עשרות תיקים פתוחים, קנסות של מיליונים בקרוב״
        </div>
      </div>

      {classifications.map(c => {
        const dbInfo = DB_TYPES.find(d => d.v === c.type)
        const detail = answers.dbDetails?.[c.type] || {}
        return (
          <div key={c.type} className="p-3 rounded-xl mb-2 border border-gray-200 bg-white">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{dbInfo?.icon} {dbInfo?.l}</span>
              <span 
                className="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                style={{ background: c.color + '18', color: c.color, borderColor: c.color + '40' }}
              >
                {c.emoji} {c.levelHe}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {detail.size && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {SIZE_RANGES.find(s => s.v === detail.size)?.l} רשומות
                </span>
              )}
              {(detail.fields?.length || 0) > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {detail.fields!.length} שדות
                </span>
              )}
              {detail.access && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {ACCESS_RANGES.find(a => a.v === detail.access)?.l} בעלי גישה
                </span>
              )}
              {c.hasSensitive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">🔒 רגיש</span>
              )}
            </div>
            {c.reasons.length > 0 && (
              <div className="mt-1 text-[11px] text-gray-500">{c.reasons.join(' • ')}</div>
            )}
            {c.alerts.map((a, i) => (
              <div key={i} className="mt-1 px-2 py-1 rounded-md bg-red-50 text-[11px] text-red-600">⚠️ {a}</div>
            ))}
          </div>
        )
      })}

      {customDBs.map((name, i) => (
        <div key={`custom-${i}`} className="p-3 rounded-xl mb-2 border border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">📦 {name}</span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-500 border border-amber-200">⚠️ לבדיקה</span>
          </div>
        </div>
      ))}

      {globalAlerts.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
          <div className="text-xs font-bold text-amber-800 mb-1.5">💡 פערים שזוהו</div>
          {globalAlerts.map((a, i) => (
            <div key={i} className="text-xs text-yellow-900 py-0.5 leading-relaxed">{a}</div>
          ))}
        </div>
      )}

      <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200">
        <div className="text-xs font-bold text-green-800 mb-1.5">📦 ייוצרו עבורכם:</div>
        {generatedDocs.map((d, i) => (
          <div key={i} className="text-xs text-green-800 py-0.5">✓ {d}</div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full mt-4 mb-20 py-3.5 rounded-xl border-none text-white text-base font-bold cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
      >
        {isReview ? 'בחירת חבילה ותשלום' : 'הכירו את הממונה שלכם'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

function OnboardingContent() {
  const router = useRouter()
  const { user, supabase, loading } = useAuth()

  const [step, setStep] = useState(0)
  const [v3Answers, setV3Answers] = useState<V3Answers>({ dbDetails: {}, customDatabases: [], customProcessors: [], customStorage: [] })
  const [animDir, setAnimDir] = useState('in')
  const [tempName, setTempName] = useState('')
  const [showReport, setShowReport] = useState(false)

  const [showDpoIntro, setShowDpoIntro] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isReviewMode, setIsReviewMode] = useState(false)

  const set = useCallback((k: string, v: any) => setV3Answers(p => ({ ...p, [k]: v })), [])
  
  // === NUCLEAR FIX: Session-aware refs that can NEVER be overwritten by async effects ===
  const sessionStarted = useRef(false) // true once user interacts with any card
  const sessionAnswers = useRef<Record<string, any>>({}) // captures ALL user inputs this session

  const selectedDBs = v3Answers.databases || []
  const needsCam = selectedDBs.includes('cameras')

  const CARDS: CardDef[] = [
    { id: 'bizName', icon: '🏢', q: 'מה שם העסק?', type: 'text', placeholder: 'שם מלא של העסק' },
    { id: 'companyId', icon: '🔢', q: 'מה מספר ח.פ / ע.מ?', type: 'text', placeholder: 'לדוגמה: 515000000' },
    { id: 'industry', icon: '🎯', q: 'מה התחום?', type: 'pick_other' },
    { id: 'databases', icon: '📊', q: 'אילו מאגרי מידע אישי קיימים בעסק?', type: 'multi_other',
      hint: 'מייל + CRM + תיקיות = מאגר אחד. ספק עצמאי עם ת.ז = מידע פרטי!' },
    { id: 'totalSize', icon: '📏', q: 'כמה רשומות של אנשים יש לכם בכל המאגרים?', type: 'pick',
      hint: 'מעל 100,000 = רמת אבטחה גבוהה אוטומטית',
      lawRef: 'תקנות אבטחת מידע 2017' },
    { id: 'storage', icon: '💾', q: 'באילו מערכות אתם עובדים?', type: 'multi_other_storage',
      hint: 'כל מקום שיש בו מידע אישי — גם מייל וגם תיקיות' },
    { id: 'securityOwner', icon: '🛡️', q: 'מי אחראי על אבטחת מידע?', type: 'named_owner' },
    ...(needsCam ? [{ id: 'cameraOwner', icon: '📹', q: 'מי אחראי על המצלמות?', type: 'named_owner' }] : []),
    { id: 'accessControl', icon: '🔐', q: 'כל העובדים רואים את כל המידע?', type: 'pick' },
    { id: 'processors', icon: '🔗', q: 'ספקים חיצוניים שמעבדים מידע עבורכם?', type: 'multi_other_proc',
      hint: 'תיקון 13 מחייב הסכם עיבוד מידע בכתב עם כל ספק',
      lawRef: 'תיקון 13, חובת הסדרה חוזית' },
    { id: 'hasConsent', icon: '🍪', q: 'יש לכם מנגנון הסכמה (consent) באתר?', type: 'pick',
      hint: 'תיקון 13 מרחיב את חובת השקיפות וההסכמה מדעת',
      lawRef: 'תיקון 13, סעיף יידוע מורחב' },
  ]

  const mainLen = CARDS.length
  const dbPhaseStart = mainLen
  const totalDBs = selectedDBs.length
  const isDBPhase = step >= dbPhaseStart && step < dbPhaseStart + totalDBs && !showReport
  const currentDBIdx = step - dbPhaseStart
  const currentDetailDB = isDBPhase ? selectedDBs[currentDBIdx] : null
  const progress = isDBPhase
    ? Math.min(((currentDBIdx + 1) / Math.max(totalDBs, 1)) * 100, 100)
    : Math.min(((step + 1) / mainLen) * 100, 100)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!supabase || !user) return
    const checkExisting = async () => {
      const { data: userData } = await supabase.from('users').select('org_id').eq('auth_user_id', user.id).single()
      if (userData?.org_id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('org_id', userData.org_id)
          .in('status', ['active', 'past_due'])
          .maybeSingle()

        if (sub) {
          localStorage.removeItem('dpo_v3_answers')
          router.push('/dashboard')
          return
        }

        const { data: profileData } = await supabase
          .from('organization_profiles')
          .select('profile_data')
          .eq('org_id', userData.org_id)
          .single()

        if (profileData?.profile_data?.v3Answers && !sessionStarted.current) {
          // Only restore from DB if user hasn't started a new session
          console.log('[Onboarding] Restoring from DB profile:', profileData.profile_data.v3Answers.bizName)
          setV3Answers(profileData.profile_data.v3Answers)
          setShowReport(true)
          setIsReviewMode(true)
        }
      }
    }
    checkExisting()
  }, [supabase, user, router])

  useEffect(() => {
    if (step > 0 && user) {
      localStorage.setItem('dpo_v3_answers', JSON.stringify(v3Answers))
      localStorage.setItem('dpo_v3_step', String(step))
      localStorage.setItem('dpo_v3_user', user.id)
    }
  }, [v3Answers, step, user])

  useEffect(() => {
    if (!user) return
    // If user already started interacting, NEVER overwrite
    if (sessionStarted.current) return
    
    const savedUser = localStorage.getItem('dpo_v3_user')
    // Clear stale data from a different user
    if (savedUser && savedUser !== user.id) {
      console.log('[Onboarding] Different user, clearing localStorage')
      localStorage.removeItem('dpo_v3_answers')
      localStorage.removeItem('dpo_v3_step')
      localStorage.removeItem('dpo_v3_user')
      localStorage.removeItem('dpo_recommended_tier')
      return
    }
    const saved = localStorage.getItem('dpo_v3_answers')
    const savedStep = localStorage.getItem('dpo_v3_step')
    if (saved && savedStep) {
      try {
        const parsed = JSON.parse(saved)
        const resumeStep = parseInt(savedStep)
        if (resumeStep > 2 && parsed.bizName) {
          console.log('[Onboarding] Resuming from step', resumeStep, 'bizName:', parsed.bizName)
          setV3Answers(parsed)
          setStep(resumeStep)
        } else if (parsed.databases?.length > 0) {
          console.log('[Onboarding] Resuming to report, bizName:', parsed.bizName)
          setV3Answers(parsed)
          setShowReport(true)
          setIsReviewMode(true)
        } else {
          // Incomplete data — start fresh
          console.log('[Onboarding] Stale data, clearing')
          localStorage.removeItem('dpo_v3_answers')
          localStorage.removeItem('dpo_v3_step')
        }
      } catch (e) { /* ignore */ }
    }
  }, [user])

  const [textInput, setTextInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateField = (cardId: string, value: any): string | null => {
    switch (cardId) {
      case 'bizName': {
        const v = (value || '').trim()
        if (!v) return 'נא להזין שם עסק'
        if (v.length < 2) return 'שם עסק חייב להכיל לפחות 2 תווים'
        return null
      }
      case 'companyId': {
        const v = (value || '').trim()
        if (!v) return 'נא להזין מספר ח.פ / ע.מ'
        if (!/^\d+$/.test(v)) return 'מספר ח.פ / ע.מ חייב להכיל ספרות בלבד'
        if (v.length < 5 || v.length > 9) return 'מספר ח.פ / ע.מ חייב להכיל 5-9 ספרות'
        return null
      }
      default:
        return null
    }
  }

  const advance = useCallback((key?: string, val?: any) => {
    // Validate before advancing
    if (key) {
      const err = validateField(key, val)
      if (err) {
        setValidationError(err)
        return
      }
      setValidationError(null)
    }
    // Mark session as started — blocks ALL async overwrites
    sessionStarted.current = true
    if (key) {
      console.log(`[Onboarding] advance: ${key} = "${typeof val === 'string' ? val : JSON.stringify(val)}"`)
      set(key, val)
      sessionAnswers.current[key] = val
    }
    setAnimDir('out')
    setTimeout(() => { setStep(s => s + 1); setAnimDir('in'); setValidationError(null) }, 180)
  }, [set])

  useEffect(() => {
    if (step >= mainLen && !showReport && !showDpoIntro && !isGenerating) {
      const predefinedDBs = v3Answers.databases || []
      if (predefinedDBs.length === 0 || step >= mainLen + predefinedDBs.length) {
        setShowReport(true)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mainLen, showReport, showDpoIntro, isGenerating])

  const handleDBDetailDone = useCallback((dbType: string, detail: any) => {
    sessionStarted.current = true
    setV3Answers(p => ({ ...p, dbDetails: { ...p.dbDetails, [dbType]: detail } }))
    setAnimDir('out')
    setTimeout(() => {
      const nextDBIdx = step - mainLen + 1
      if (nextDBIdx >= selectedDBs.length) {
        setShowReport(true)
      }
      setStep(s => s + 1)
      setAnimDir('in')
    }, 180)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mainLen, selectedDBs.length])

  // FIX: DB enum only allows 'basic' | 'recommended' — no 'enterprise'
  const calculateRecommendedTier = useCallback((): 'basic' | 'recommended' => {
    const totalRecords = Object.values(v3Answers.dbDetails || {}).reduce((sum, d) => {
      return sum + (SIZE_RANGES.find(s => s.v === d.size)?.num || 50)
    }, 0)
    const dbs = v3Answers.databases || []
    const hasMedical = dbs.includes('medical')
    const isFinance = v3Answers.industry === 'finance'
    const isHealth = v3Answers.industry === 'health'

    if (totalRecords >= 100000 || isHealth || isFinance) return 'recommended'
    if (totalRecords >= 10000 || hasMedical || dbs.length >= 5 || 
        (v3Answers.processors || []).length >= 3) return 'recommended'
    return 'basic'
  }, [v3Answers])

  const handleReportContinue = useCallback(() => {
    if (isReviewMode) {
      router.push('/dashboard')
    } else {
      setShowReport(false)
      setShowDpoIntro(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isReviewMode, router])

  const handleComplete = async () => {
    if (!supabase || !user) { setError('לא מחובר למערכת'); return }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress(10)
    setStatus('סורקים את פרופיל הארגון...')

    try {
      // Build final answers: merge state with session overrides (ref is bulletproof)
      let finalV3 = { ...v3Answers, ...sessionAnswers.current }
      const businessName = finalV3.bizName || 'עסק חדש'
      console.log('[Onboarding] handleComplete v8:', { 
        sessionBizName: sessionAnswers.current.bizName,
        stateBizName: v3Answers.bizName,
        finalBizName: finalV3.bizName,
        businessName 
      })
      const legacyAnswers = mapV3ToLegacyAnswers(finalV3)
      const autoTier = calculateRecommendedTier()

      setGenerationProgress(25)
      setStatus('מקימים את סביבת הציות שלכם...')

      // === SERVER-SIDE ORG CREATION (bypasses RLS) ===
      const { data: { session: sess } } = await supabase.auth.getSession()
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (sess?.access_token) authHeaders['Authorization'] = `Bearer ${sess.access_token}`

      const orgRes = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          v3Answers: finalV3,
          legacyAnswers,
          tier: autoTier
        })
      })
      
      const orgResult = await orgRes.json()
      console.log('[Onboarding] Server response:', orgResult)
      
      if (!orgRes.ok || !orgResult.success) {
        throw new Error(orgResult.error || 'שגיאה ביצירת הארגון')
      }

      const orgId = orgResult.orgId
      const orgName = orgResult.orgName

      setGenerationProgress(60)
      setStatus('מייצרים מדיניות, נהלים ומסמכים...')

      // Generate documents (also server-side)
      try {
        const docRes = await fetch('/api/generate-documents', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            orgId, orgName, businessId: finalV3.companyId || '',
            answers: legacyAnswers, v3Answers: finalV3
          })
        })
        if (docRes.ok) { setGenerationProgress(90); setStatus('בודקים שהכל תקין...') }
        else console.log('[Onboarding] Doc generation failed:', await docRes.text())
      } catch (docError) { console.log('[Onboarding] Doc generation skipped:', docError) }

      localStorage.setItem('dpo_v3_answers', JSON.stringify(finalV3))
      localStorage.removeItem('dpo_v3_step')
      localStorage.setItem('dpo_recommended_tier', autoTier)

      setGenerationProgress(100)
      setStatus('הכל מוכן! מעבירים אתכם...')

      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'welcome', to: user?.email,
            data: { name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'משתמש', orgName }
          })
        })
      } catch (emailErr) { console.log('Welcome email skipped:', emailErr) }

      setTimeout(() => router.push('/dashboard?welcome=true'), 1500)
    } catch (err: any) {
      console.error('[Onboarding] handleComplete error:', err)
      setError(err.message || 'אירעה שגיאה בתהליך ההרשמה')
      setIsGenerating(false)
    }
  }

  const getOptions = (id: string) => {
    switch(id) {
      case 'industry': return INDUSTRIES
      case 'access': return ACCESS_RANGES.map(a => ({ v: a.v, l: `${a.l} (${a.desc})` }))
      case 'databases': return DB_TYPES
      case 'totalSize': return SIZE_RANGES.map(s => ({ v: s.v, l: s.l }))
      case 'accessControl': return [
        { v: 'all', l: '😬 כולם רואים הכל' },
        { v: 'partial', l: '🔓 הרשאות חלקיות' },
        { v: 'strict', l: '🔒 לפי תפקיד בלבד' },
      ]
      case 'hasConsent': return [
        { v: 'yes', l: '✅ כן, יש' },
        { v: 'no', l: '❌ אין' },
        { v: 'no_website', l: '🚫 אין אתר' },
      ]
      default: return OWNER_OPTIONS
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isGenerating) {
    const steps = [
      { icon: '📊', label: 'ניתוח מאגרים', desc: 'מזהים את סוגי המידע', threshold: 15 },
      { icon: '🔒', label: 'רמת אבטחה', desc: 'מעריכים חשיפה רגולטורית', threshold: 40 },
      { icon: '📋', label: 'מסמכים', desc: 'מכינים מדיניות ונהלים', threshold: 65 },
      { icon: '✅', label: 'הכל מוכן', desc: 'מעבירים ללוח הבקרה', threshold: 92 },
    ]

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1e40af]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-[#1e40af] text-lg">Deepo</span>
            </div>
          </div>

          {/* Main card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Animated gradient bar at top */}
            <div className="h-1 bg-slate-100 relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-l from-blue-600 via-indigo-500 to-blue-400 transition-all duration-700 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            <div className="px-6 py-8">
              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-1">מנתחים את העסק שלכם</h2>
                <p className="text-sm text-slate-500">{status}</p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {steps.map((step, i) => {
                  const isComplete = generationProgress >= step.threshold
                  const isCurrent = !isComplete && (i === 0 || generationProgress >= steps[i - 1].threshold) && generationProgress < 100

                  return (
                    <div 
                      key={i}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                        isComplete 
                          ? 'bg-emerald-50 border border-emerald-100' 
                          : isCurrent 
                            ? 'bg-blue-50 border border-blue-100' 
                            : 'bg-slate-50 border border-slate-100'
                      }`}
                      style={{ 
                        opacity: generationProgress >= Math.max(0, step.threshold - 20) ? 1 : 0.4,
                        transform: generationProgress >= Math.max(0, step.threshold - 20) ? 'translateX(0)' : 'translateX(-8px)',
                        transition: `all 0.5s ease ${i * 0.1}s`
                      }}
                    >
                      {/* Icon/check */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base transition-all duration-300 ${
                        isComplete 
                          ? 'bg-emerald-500 text-white' 
                          : isCurrent 
                            ? 'bg-blue-100' 
                            : 'bg-slate-100'
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <span>{step.icon}</span>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isComplete ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs ${isComplete ? 'text-emerald-500' : isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>
                          {isComplete ? 'הושלם' : step.desc}
                        </p>
                      </div>

                      {/* Status indicator */}
                      {isComplete && (
                        <span className="text-emerald-500 text-xs font-medium">✓</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Progress percentage */}
              <div className="mt-6 text-center">
                <span className="text-2xl font-bold text-slate-700">{Math.round(generationProgress)}%</span>
              </div>
            </div>
          </div>

          {/* Reassurance */}
          <p className="text-center text-xs text-slate-400 mt-4">
            🔒 הנתונים מאובטחים ומוצפנים
          </p>
        </div>
      </div>
    )
  }

  if (showDpoIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1e40af]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-[#1e40af]">Deepo</span>
            </div>
            <button onClick={() => { setShowDpoIntro(false); setShowReport(true) }}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />חזרה
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-amber-200 shadow-lg bg-gradient-to-br from-amber-100 to-indigo-100">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face"
                  alt="עו״ד דנה כהן" className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-indigo-600 text-3xl font-bold bg-indigo-50">ד״כ</div>';
                  }} 
                />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow">
                <CheckCircle2 className="h-3 w-3" />מוסמכת
              </div>
            </div>

            <div className="inline-block text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-2">
              הממונה שלכם
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-1">עו״ד דנה כהן</h1>
            <p className="text-sm text-gray-500 mb-4">ממונה הגנת פרטיות מוסמכת | 12 שנות ניסיון</p>

            <div className="flex flex-wrap gap-2 justify-center mb-5">
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />dpo@deepo.co.il
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
                <FileCheck className="h-3.5 w-3.5 text-indigo-500" />רישיון DPO-2025-001
              </div>
            </div>

            <div className="bg-amber-50/60 rounded-xl p-4 mb-5 text-right">
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm justify-center">
                <Sparkles className="h-4 w-4 text-amber-500" />מה הממונה תעשה עבורכם?
              </h4>
              <div className="grid grid-cols-1 gap-1.5 text-sm">
                {[
                  'פיקוח שוטף על עמידה בחוק הגנת הפרטיות',
                  'טיפול בפניות נושאי מידע וזכויות',
                  'ייעוץ פרטיות ואבטחת מידע',
                  'קשר עם הרשות להגנת הפרטיות',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 justify-start">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />{error}
              </div>
            )}

            {/* Business name confirmation */}
            <div className="bg-indigo-50/60 rounded-xl p-4 mb-4 text-right">
              <label className="text-xs text-gray-500 mb-1 block">שם העסק שירשם:</label>
              <input
                value={sessionAnswers.current.bizName || v3Answers.bizName || ''}
                onChange={e => {
                  sessionStarted.current = true
                  sessionAnswers.current.bizName = e.target.value
                  set('bizName', e.target.value)
                  if (error) setError(null)
                }}
                className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-center font-semibold text-gray-800 bg-white focus:outline-none focus:border-indigo-400"
                placeholder="שם העסק"
              />
            </div>

            <button
              onClick={() => {
                const name = (sessionAnswers.current.bizName || v3Answers.bizName || '').trim()
                if (!name || name.length < 2) {
                  setError('נא להזין שם עסק (לפחות 2 תווים)')
                  return
                }
                handleComplete()
              }}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-xl border-none text-white text-base font-bold cursor-pointer disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />{status || 'מכינים את המערכת...'}
                </span>
              ) : (
                'סיום והפקת מסמכים ⬅'
              )}
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              המסמכים יופקו אוטומטית ויהיו זמינים בלוח הבקרה
            </p>
            <p className="text-center text-[9px] text-gray-300 mt-1">v10</p>
          </div>
        </div>
      </div>
    )
  }

  if (showReport) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
              {isReviewMode ? (
                <button onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
                  <ArrowRight className="h-4 w-4" />חזרה ללוח הבקרה
                </button>
              ) : (
                <button onClick={() => { setShowReport(false); setStep(0) }}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
                  <ArrowRight className="h-4 w-4" />חזרה לשאלון
                </button>
              )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1e40af]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-[#1e40af]">Deepo</span>
            </div>
          </div>
          <ClassificationReport answers={v3Answers} onContinue={handleReportContinue} isReview={isReviewMode} />
        </div>
      </div>
    )
  }

  const card = step < mainLen ? CARDS[step] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4" dir="rtl">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1e40af]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[#1e40af]">Deepo</span>
          </div>
          {step > 0 && (
            <button 
              onClick={() => {
                if (isDBPhase) {
                  if (currentDBIdx === 0) {
                    setStep(mainLen - 1)
                  } else {
                    setStep(s => s - 1)
                  }
                } else {
                  setStep(s => s - 1)
                }
                setAnimDir('in')
              }}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
            >
              <ArrowRight className="h-3 w-3" />
              חזרה
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-amber-600 font-bold">
            ⚡ {isDBPhase ? `פירוט ${currentDBIdx + 1}/${totalDBs}` : `${step + 1}/${mainLen}`}
          </span>
          <span className="text-[11px] text-gray-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full mb-5 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: isDBPhase ? '#6366f1' : '#f59e0b' }}
          />
        </div>

        {card && !isDBPhase && (
          <CardShell icon={card.icon} question={card.q} hint={card.hint} lawRef={card.lawRef} animDir={animDir}>
            
            {card.type === 'text' && (
              <div className="mt-3">
                <input
                  placeholder={card.placeholder}
                  value={textInput || v3Answers[card.id] || ''}
                  onChange={e => {
                    sessionStarted.current = true
                    setTextInput(e.target.value)
                    set(card.id, e.target.value)
                    sessionAnswers.current[card.id] = e.target.value
                    if (validationError) setValidationError(null)
                  }}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-base text-center outline-none transition-colors ${validationError ? 'border-red-400 bg-red-50/50' : 'border-amber-300 focus:border-amber-400'}`}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = textInput || v3Answers[card.id] || ''
                      advance(card.id, val)
                      if (!validateField(card.id, val)) setTextInput('')
                    }
                  }}
                  autoFocus
                />
                {validationError && (
                  <p className="text-red-500 text-xs mt-1.5 text-center">{validationError}</p>
                )}
                <button 
                  onClick={() => {
                    const val = textInput || v3Answers[card.id] || ''
                    advance(card.id, val)
                    if (!validateField(card.id, val)) setTextInput('')
                  }}
                  className={`w-full mt-3 py-2.5 rounded-xl border-none text-white text-sm font-semibold cursor-pointer ${!(textInput || v3Answers[card.id]) ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  הבא ⬅
                </button>
              </div>
            )}

            {card.type === 'pick' && (
              <ChipPicker options={getOptions(card.id)} value={v3Answers[card.id]}
                onSelect={v => advance(card.id, v)} />
            )}

            {card.type === 'pick_other' && (
              <>
                <ChipPicker options={getOptions(card.id)} value={v3Answers[card.id]}
                  onSelect={v => { setValidationError(null); if (v !== 'other') advance(card.id, v); else set(card.id, v) }}
                  allowOther otherValue={v3Answers[card.id + 'Other']}
                  onOtherChange={v => { set(card.id + 'Other', v); if (validationError) setValidationError(null) }} />
                {v3Answers[card.id] === 'other' && (
                  <>
                    {validationError && (
                      <p className="text-red-500 text-xs mt-1.5 text-center">{validationError}</p>
                    )}
                    <button onClick={() => {
                      if (!v3Answers[card.id + 'Other']?.trim()) {
                        setValidationError('נא להזין ערך')
                        return
                      }
                      setValidationError(null)
                      advance(card.id, 'other')
                    }}
                      className={`mt-3 px-6 py-2.5 rounded-xl border-none text-white text-sm font-semibold cursor-pointer ${!v3Answers[card.id + 'Other']?.trim() ? 'bg-gray-300' : 'bg-amber-500 hover:bg-amber-600'}`}>
                      הבא ⬅
                    </button>
                  </>
                )}
              </>
            )}

            {card.type === 'multi_other' && (
              <>
                <MultiPicker options={getOptions(card.id)} selected={v3Answers[card.id] || []}
                  onToggle={v => { const c = v3Answers[card.id] || []; set(card.id, c.includes(v) ? c.filter((x: string) => x !== v) : [...c, v]) }}
                  allowOther otherItems={v3Answers.customDatabases}
                  onAddOther={v => set('customDatabases', [...(v3Answers.customDatabases || []), v])}
                  onRemoveOther={i => set('customDatabases', (v3Answers.customDatabases || []).filter((_: string, idx: number) => idx !== i))} />
                {((v3Answers[card.id]?.length > 0) || (v3Answers.customDatabases?.length || 0) > 0) && (
                  <button onClick={() => advance(card.id, v3Answers[card.id])}
                    className="mt-3 px-6 py-2.5 rounded-xl border-none bg-amber-500 text-white text-sm font-semibold cursor-pointer hover:bg-amber-600">
                    הבא ⬅
                  </button>
                )}
              </>
            )}

            {card.type === 'multi_other_storage' && (
              <>
                <MultiPicker options={STORAGE_OPTIONS} selected={v3Answers.storage || []}
                  onToggle={v => { const c = v3Answers.storage || []; set('storage', c.includes(v) ? c.filter((x: string) => x !== v) : [...c, v]) }}
                  allowOther otherItems={v3Answers.customStorage}
                  onAddOther={v => set('customStorage', [...(v3Answers.customStorage || []), v])}
                  onRemoveOther={i => set('customStorage', (v3Answers.customStorage || []).filter((_: string, idx: number) => idx !== i))} />
                {((v3Answers.storage?.length || 0) > 0 || (v3Answers.customStorage?.length || 0) > 0) && (
                  <button onClick={() => advance('storage', v3Answers.storage)}
                    className="mt-3 px-6 py-2.5 rounded-xl border-none bg-amber-500 text-white text-sm font-semibold cursor-pointer hover:bg-amber-600">
                    הבא ⬅
                  </button>
                )}
              </>
            )}

            {card.type === 'multi_other_proc' && (
              <>
                <MultiPicker options={PROCESSOR_OPTIONS} selected={v3Answers.processors || []}
                  onToggle={v => { const c = v3Answers.processors || []; set('processors', c.includes(v) ? c.filter((x: string) => x !== v) : [...c, v]) }}
                  allowOther otherItems={v3Answers.customProcessors}
                  onAddOther={v => set('customProcessors', [...(v3Answers.customProcessors || []), v])}
                  onRemoveOther={i => set('customProcessors', (v3Answers.customProcessors || []).filter((_: string, idx: number) => idx !== i))} />
                <button onClick={() => advance('processors', v3Answers.processors || [])}
                  className="mt-3 px-6 py-2.5 rounded-xl border-none bg-amber-500 text-white text-sm font-semibold cursor-pointer hover:bg-amber-600">
                  {(v3Answers.processors?.length || 0) > 0 || (v3Answers.customProcessors?.length || 0) > 0 ? 'הבא ⬅' : 'אין ספקים, הבא ⬅'}
                </button>
              </>
            )}

            {card.type === 'named_owner' && (
              <>
                <NamedOwnerPicker
                  options={OWNER_OPTIONS} value={v3Answers[card.id]}
                  onSelect={v => { set(card.id, v); setValidationError(null); if (v === 'none') { setTempName(''); setTimeout(() => advance(card.id, v), 100) } }}
                  name={tempName} onNameChange={v => { setTempName(v); if (validationError) setValidationError(null) }}
                  allowOther otherValue={v3Answers[card.id + 'Other']}
                  onOtherChange={v => set(card.id + 'Other', v)} />
                {v3Answers[card.id] && v3Answers[card.id] !== 'none' && (
                  <>
                    {validationError && (
                      <p className="text-red-500 text-xs mt-1.5 text-center">{validationError}</p>
                    )}
                    <button onClick={() => {
                      if (!tempName.trim()) {
                        setValidationError('נא להזין שם האחראי')
                        return
                      }
                      setValidationError(null)
                      set(card.id + 'Name', tempName); setTempName(''); advance(card.id, v3Answers[card.id])
                    }}
                      className={`mt-3 px-6 py-2.5 rounded-xl border-none text-white text-sm font-semibold cursor-pointer ${!tempName.trim() ? 'bg-gray-300' : 'bg-amber-500 hover:bg-amber-600'}`}>
                      הבא ⬅
                    </button>
                  </>
                )}
              </>
            )}
          </CardShell>
        )}

        {isDBPhase && currentDetailDB && (
          <DBDetailCard
            key={currentDetailDB}
            dbType={currentDetailDB}
            animDir={animDir}
            existingDetail={v3Answers.dbDetails?.[currentDetailDB]}
            onDone={detail => handleDBDetailDone(currentDetailDB, detail)}
          />
        )}

        <p className="text-center text-[11px] text-gray-400 mt-4">
          {isDBPhase ? `פירוט מאגר ${currentDBIdx + 1} מתוך ${totalDBs}` : `שאלה ${step + 1} מתוך ${mainLen}`} • נשמר אוטומטית
        </p>

        {/* Inline help section — centered under questions */}
        <OnboardingHelper
          questionId={card?.id || null}
          questionText={card?.q || null}
          isDBPhase={isDBPhase}
          dbName={currentDetailDB}
          supabase={supabase}
        />
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
