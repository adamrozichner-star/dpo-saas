'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, CheckCircle2, Loader2, FileText, Eye, Download, Sparkles, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const DOC_LABELS: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות',
  security_policy: 'נוהל אבטחת מידע',
  dpo_appointment: 'כתב מינוי DPO',
  database_registration: 'רישום מאגרי מידע',
  ropa: 'מפת עיבוד (ROPA)',
  consent_form: 'טופס הסכמה',
}

const DOC_ICONS: Record<string, string> = {
  privacy_policy: '🔒',
  security_policy: '🛡️',
  dpo_appointment: '📋',
  database_registration: '🗄️',
  ropa: '📊',
  consent_form: '✅',
}

export default function PaymentRequiredPage() {
  const router = useRouter()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [checking, setChecking] = useState(true)
  const [documents, setDocuments] = useState<any[]>([])
  const [orgName, setOrgName] = useState('')
  const [previewDoc, setPreviewDoc] = useState<any>(null)
  const [hasOrg, setHasOrg] = useState(false)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
      return
    }
  }, [loading, session, router])

  useEffect(() => {
    const checkAndLoad = async () => {
      if (!user || !supabase) return
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .single()

        if (userData?.org_id) {
          setHasOrg(true)
          
          // Check subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('org_id', userData.org_id)
            .eq('status', 'active')
            .single()

          if (sub) {
            router.push('/dashboard?welcome=true')
            return
          }

          // Load org + docs
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', userData.org_id)
            .single()
          setOrgName(org?.name || '')

          const { data: docs } = await supabase
            .from('documents')
            .select('id, type, title, content, status, created_at')
            .eq('org_id', userData.org_id)
            .order('created_at', { ascending: true })
          setDocuments(docs || [])
        }
      } catch (e) {
        console.log('Check error:', e)
      }
      setChecking(false)
    }
    if (user && supabase) checkAndLoad()
  }, [user, supabase, router])

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-stone-500 text-sm">טוען...</p>
        </div>
      </div>
    )
  }

  const hasDocs = documents.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-stone-50" dir="rtl">
      {/* Top bar */}
      <div className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
          </div>
          <button onClick={async () => { await signOut(); router.push('/login') }} className="text-sm text-stone-400 hover:text-stone-600">
            התנתקות
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero — adapts based on whether docs exist */}
        <div className="text-center mb-8">
          {hasDocs ? (
            <>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                {documents.length} מסמכים נוצרו בהצלחה!
              </div>
              <h1 className="text-3xl font-bold text-stone-800 mb-2">
                {orgName ? `המסמכים של ${orgName} מוכנים` : 'המסמכים שלך מוכנים'}
              </h1>
              <p className="text-stone-500 text-lg">
                השלם את התשלום כדי לצפות, להוריד ולנהל את כל המסמכים
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                ברוך הבא ל-Deepo
              </div>
              <h1 className="text-3xl font-bold text-stone-800 mb-2">
                {orgName ? `${orgName}, הגנת הפרטיות שלך מתחילה כאן` : 'הגנת הפרטיות שלך מתחילה כאן'}
              </h1>
              <p className="text-stone-500 text-lg">
                ממונה הגנת פרטיות + מערכת AI מלאה — כל מה שצריך לתיקון 13
              </p>
            </>
          )}
        </div>

        {/* Blurred Document Cards — only when docs exist */}
        {hasDocs && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 pb-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-lg">
                    {DOC_ICONS[doc.type] || '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm">{doc.title || DOC_LABELS[doc.type] || doc.type}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString('he-IL')} · {doc.status === 'pending_review' ? 'ממתין לאישור' : 'מוכן'}
                    </p>
                  </div>
                  <Lock className="h-4 w-4 text-stone-300 flex-shrink-0 mt-1" />
                </div>
                <div className="relative px-4 pb-4">
                  <div className="text-xs text-stone-600 leading-relaxed select-none" style={{
                    filter: 'blur(4px)',
                    WebkitFilter: 'blur(4px)',
                    maxHeight: 80,
                    overflow: 'hidden',
                    direction: 'rtl'
                  }}>
                    {(doc.content || '').slice(0, 300)}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                  <div className="relative flex items-center gap-2 mt-2">
                    <button onClick={() => setPreviewDoc(doc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
                      <Eye className="h-3.5 w-3.5" />
                      הצצה
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-400 bg-stone-50 rounded-lg cursor-not-allowed" disabled>
                      <Download className="h-3.5 w-3.5" />
                      <Lock className="h-3 w-3" />
                      הורדה
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No docs — show what they'll GET (visual preview of deliverables) */}
        {!hasDocs && (
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {[
              { icon: '🔒', title: 'מדיניות פרטיות', desc: 'מותאמת לעסק שלך' },
              { icon: '🛡️', title: 'נוהל אבטחת מידע', desc: 'עם נהלים מפורטים' },
              { icon: '📋', title: 'כתב מינוי DPO', desc: 'מוכן לחתימה' },
              { icon: '📊', title: 'מפת עיבוד נתונים', desc: 'ROPA מלא' },
              { icon: '🗄️', title: 'רישום מאגרי מידע', desc: 'לפי דרישות החוק' },
              { icon: '✅', title: 'טופס הסכמה', desc: 'לאיסוף מידע אישי' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3 opacity-75">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-lg">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm">{item.title}</p>
                  <p className="text-xs text-stone-400">{item.desc}</p>
                </div>
                <Lock className="h-4 w-4 text-stone-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* CTA Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8 text-center max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-stone-800 mb-2">פתח גישה מלאה</h2>
          <p className="text-stone-500 text-sm mb-5">כל מה שצריך לעמוד בתיקון 13</p>
          <div className="bg-stone-50 rounded-xl p-4 mb-5 text-right space-y-2">
            {[
              'צפייה והורדת כל המסמכים',
              'DPO ממונה מוסמך — עו"ד דנה כהן',
              'עוזר AI לשאלות ציות',
              'ניהול אירועי אבטחה + דדליינים',
              'עדכונים אוטומטיים בשינוי רגולציה',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-stone-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/subscribe')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-lg mb-3 shadow-sm">
            המשך לתשלום — ₪500/חודש
          </button>
          <button onClick={() => router.push('/checkout')} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 px-6 rounded-xl transition-colors text-sm">
            צפייה בחבילות נוספות
          </button>
          <p className="text-xs text-stone-400 mt-4">ביטול בכל עת · ללא התחייבות</p>
        </div>

        <p className="text-center text-xs text-stone-400 mt-8">© 2025 Deepo. כל הזכויות שמורות.</p>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-800">{previewDoc.title || DOC_LABELS[previewDoc.type]}</p>
                <p className="text-xs text-stone-400 mt-0.5">תצוגה מקדימה</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
            </div>
            <div className="p-5 relative" style={{ maxHeight: '50vh', overflow: 'hidden' }}>
              <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap" dir="rtl">
                {(previewDoc.content || '').slice(0, 600)}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(transparent, white 40%)' }}>
                <div className="absolute bottom-0 left-0 right-0 text-center pb-4">
                  <Lock className="h-5 w-5 text-stone-300 mx-auto mb-1" />
                  <p className="text-sm text-stone-400">השלם תשלום לצפייה מלאה</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-stone-100 text-center">
              <button onClick={() => { setPreviewDoc(null); router.push('/subscribe') }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-8 rounded-xl transition-colors">
                פתח גישה מלאה →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
