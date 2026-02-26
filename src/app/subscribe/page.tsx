'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Shield, Check, Loader2, CreditCard, CheckCircle2,
  Phone, Sparkles, AlertTriangle, Eye
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [recommendedTier, setRecommendedTier] = useState<string>('basic')
  const [reasons, setReasons] = useState<string[]>([])

  // Reset processing state on mount / back-button
  useEffect(() => {
    setIsProcessing(false)
    setSelectedPlan(null)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) { setIsProcessing(false); setSelectedPlan(null) }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
      return
    }
    if (user && supabase) loadOrganization()

    const payment = searchParams.get('payment')
    if (payment === 'success') setPaymentSuccess(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, supabase, searchParams])

  // Load recommendation from localStorage
  useEffect(() => {
    const tier = localStorage.getItem('dpo_recommended_tier')
    if (tier === 'basic' || tier === 'extended') setRecommendedTier(tier)

    try {
      const saved = localStorage.getItem('dpo_v3_answers')
      if (!saved) return
      const v3 = JSON.parse(saved)
      const r: string[] = []

      const dbs = v3.databases || []
      const dbCount = dbs.length + (v3.customDatabases?.length || 0)
      if (dbCount > 0) r.push(`${dbCount} מאגרי מידע זוהו בארגון`)

      if (v3.industry === 'health') r.push('תחום בריאות — רגולציה מחמירה')
      else if (v3.industry === 'finance') r.push('תחום פיננסי — רגולציה מחמירה')

      if (dbs.includes('medical')) r.push('מידע רפואי — דורש סיווג אבטחה גבוה')
      if ((v3.processors?.length || 0) > 0) r.push(`${v3.processors.length} ספקים חיצוניים — נדרשים הסכמי עיבוד`)

      const SIZE_NUMS: Record<string, number> = { 'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000 }
      const totalRecords = Object.values(v3.dbDetails || {}).reduce((sum: number, d: any) => sum + (SIZE_NUMS[d.size] || 50), 0)
      if (totalRecords >= 10000) r.push(`כ-${totalRecords.toLocaleString()} נושאי מידע`)

      if (v3.securityOwner === 'none') r.push('אין אחראי אבטחת מידע — נדרשת חבילה עם ליווי')
      if (v3.hasConsent === 'no') r.push('חסר מנגנון הסכמה — דורש טיפול')

      setReasons(r)
    } catch (e) { /* ignore */ }
  }, [])

  const loadOrganization = async () => {
    if (!supabase || !user) return
    const { data: userData } = await supabase
      .from('users').select('org_id').eq('auth_user_id', user.id).single()
    if (userData?.org_id) {
      const { data: org } = await supabase
        .from('organizations').select('*').eq('id', userData.org_id).single()
      setOrganization(org)
      if (org?.tier && !localStorage.getItem('dpo_recommended_tier')) {
        setRecommendedTier(org.tier)
      }
    }
  }

  const handleSelectPlan = async (planId: string) => {
    if (!user) { router.push('/login?redirect=/subscribe'); return }
    setSelectedPlan(planId)
    setError(null)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/cardcom/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          orgId: organization?.id,
          userId: user?.id,
          userEmail: user?.email,
          userName: organization?.name || user?.user_metadata?.name || '',
        })
      })
      const data = await response.json()
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        let errorMsg = data.error || 'שגיאה ביצירת התשלום'
        if (errorMsg.includes('not configured') || errorMsg.includes('missing credentials')) {
          errorMsg = 'מערכת התשלומים בתהליך הגדרה. נסו שוב בעוד מספר דקות.'
        }
        setError(errorMsg)
        setIsProcessing(false)
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת. נסו שוב.')
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl p-8 shadow-lg">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">התשלום בוצע בהצלחה!</h1>
          <p className="text-gray-600 mb-6">המנוי שלכם הופעל. ברוכים הבאים ל-MyDPO!</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            המשך ללוח הבקרה
          </Button>
        </div>
      </div>
    )
  }

  const otherTier = recommendedTier === 'basic' ? 'extended' : 'basic'

  const plans: Record<string, { name: string; price: number; desc: string; features: string[] }> = {
    basic: {
      name: 'בסיסית',
      price: 500,
      desc: 'לעסקים קטנים עם פעילות סטנדרטית',
      features: [
        'DPO ממונה מוסמך',
        'מערכת AI מלאה',
        'מסמכים מותאמים אוטומטית',
        'בוט שאלות ותשובות',
        'תמיכה בדוא״ל (72 שעות)',
      ],
    },
    extended: {
      name: 'מורחבת',
      price: 1200,
      desc: 'לעסקים עם מידע רגיש או פעילות מורכבת',
      features: [
        'הכל בבסיסית, ובנוסף:',
        'סקירה תקופתית רבעונית',
        'זמינות DPO עד 30 דק׳/חודש',
        'ליווי אירועי אבטחה',
        'תמיכה טלפונית (24 שעות)',
        'עד 3 משתמשים',
      ],
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1e40af]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-[#1e40af]">MyDPO</span>
        </div>
        <Link href="/onboarding" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          חזרה לתוצאות
        </Link>
      </div>

      <div className="max-w-md mx-auto px-4 py-5">
        {/* Recommendation banner */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-blue-100 mb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-800 mb-1">
                על בסיס הניתוח, אנחנו ממליצים על חבילה {plans[recommendedTier].name}
              </div>
              {reasons.length > 0 && (
                <div className="space-y-0.5">
                  {reasons.slice(0, 4).map((r, i) => (
                    <div key={i} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" /> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommended plan — prominent */}
        <PlanCard
          plan={plans[recommendedTier]}
          planId={recommendedTier}
          isRecommended={true}
          isProcessing={isProcessing}
          selectedPlan={selectedPlan}
          onSelect={handleSelectPlan}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-3.5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[11px] text-gray-400">או</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Other plan — compact */}
        <PlanCard
          plan={plans[otherTier]}
          planId={otherTier}
          isRecommended={false}
          isProcessing={isProcessing}
          selectedPlan={selectedPlan}
          onSelect={handleSelectPlan}
        />

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 text-sm flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Enterprise link */}
        <div className="mt-5 text-center">
          <a href="mailto:hello@mydpo.co.il?subject=בקשה לחבילה ארגונית" 
             className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
            ארגון גדול? <span className="underline">צרו קשר לחבילה מותאמת</span>
          </a>
        </div>

        {/* Footer badges */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400 pb-4">
          <span>🔒 תשלום מאובטח</span>
          <span>·</span>
          <span>ביטול בכל עת</span>
          <span>·</span>
          <span>ללא התחייבות</span>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, planId, isRecommended, isProcessing, selectedPlan, onSelect }: {
  plan: { name: string; price: number; desc: string; features: string[] }
  planId: string
  isRecommended: boolean
  isProcessing: boolean
  selectedPlan: string | null
  onSelect: (id: string) => void
}) {
  const processing = isProcessing && selectedPlan === planId

  return (
    <div className={`bg-white rounded-xl overflow-hidden transition-all ${
      isRecommended 
        ? 'shadow-md border-2 border-blue-500' 
        : 'shadow-sm border border-gray-200'
    }`}>
      {isRecommended && (
        <div className="bg-blue-600 text-white text-center text-xs font-medium py-1.5">
          ✨ מומלץ על בסיס הנתונים שלכם
        </div>
      )}
      <div className={isRecommended ? 'p-4' : 'px-4 py-3'}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <span className={`font-bold ${isRecommended ? 'text-base' : 'text-sm'} text-gray-800`}>
              חבילה {plan.name}
            </span>
            <div className="text-[11px] text-gray-500 mt-0.5">{plan.desc}</div>
          </div>
          <div className="text-left flex-shrink-0 mr-3">
            <div className={`font-extrabold ${isRecommended ? 'text-2xl' : 'text-lg'} text-gray-800 leading-tight`}>
              ₪{plan.price.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 text-left">לחודש + מע״מ</div>
          </div>
        </div>

        {/* Features */}
        <div className={`${isRecommended ? 'grid grid-cols-1 gap-1.5' : 'grid grid-cols-2 gap-x-2 gap-y-1'} mb-3`}>
          {plan.features.map((f, i) => (
            <div key={i} className={`flex items-center gap-1.5 ${isRecommended ? 'text-[13px]' : 'text-[11px]'} text-gray-600`}>
              <Check className={`${isRecommended ? 'h-3.5 w-3.5' : 'h-3 w-3'} text-green-500 flex-shrink-0`} />
              <span>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => onSelect(planId)}
          disabled={isProcessing}
          className={`w-full rounded-xl border-none font-bold cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-2 ${
            isRecommended
              ? 'bg-blue-600 hover:bg-blue-700 text-white text-sm py-3'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2.5'
          }`}
        >
          {processing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> מעבד...</>
          ) : (
            <><CreditCard className="h-4 w-4" /> בחירת חבילה {plan.name}</>
          )}
        </button>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  )
}
