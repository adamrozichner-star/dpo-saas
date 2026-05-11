'use client'

// Post-payment celebratory landing. Routed to from /payment/success after the
// subscription is confirmed. Diverges by tier:
//   - recommended/premium → "meet your Deepo DPO" (Dana Cohen)
//   - basic               → "you are the DPO" + soft upsell
// Both paths CTA forward to /dashboard. Direct /dashboard access still works —
// /welcome is a pass-through, not a gate.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2, Loader2, Sparkles, Mail, FileCheck,
  Shield, ArrowLeft, Users, BookOpen, MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DPO_CONFIG } from '@/lib/dpo-config'

type Tier = 'basic' | 'recommended' | 'premium' | 'enterprise' | null

export default function WelcomePage() {
  const router = useRouter()
  const { user, supabase, loading: authLoading } = useAuth()
  const [tier, setTier] = useState<Tier>(null)
  const [orgName, setOrgName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    const load = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!userData?.org_id) {
          router.push('/onboarding')
          return
        }

        const { data: org } = await supabase
          .from('organizations')
          .select('tier, name')
          .eq('id', userData.org_id)
          .single()

        setTier((org?.tier as Tier) || 'basic')
        setOrgName(org?.name || '')
      } catch (e) {
        console.error('[Welcome] load error:', e)
        setTier('basic')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, user, supabase, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const isBasic = tier === 'basic'

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-6">
          <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} priority />
        </div>

        {isBasic ? (
          <BasicWelcomeCard orgName={orgName} />
        ) : (
          <PaidWelcomeCard orgName={orgName} />
        )}
      </div>
    </div>
  )
}

// =================================================================
// Recommended / Premium — "Meet your Deepo DPO"
// =================================================================
function PaidWelcomeCard({ orgName }: { orgName: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-3">
        ✓ ההרשמה הושלמה
      </div>

      <div className="relative w-28 h-28 mx-auto mb-4">
        <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-amber-200 shadow-lg bg-gradient-to-br from-amber-100 to-indigo-100">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face"
            alt={DPO_CONFIG.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
              ;(e.target as HTMLImageElement).parentElement!.innerHTML =
                '<div class="w-full h-full flex items-center justify-center text-indigo-600 text-3xl font-bold bg-indigo-50">ד״כ</div>'
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

      <h1 className="text-2xl font-bold text-gray-800 mb-1">{DPO_CONFIG.name}</h1>
      <p className="text-sm text-gray-500 mb-4">ממונה הגנת פרטיות מוסמכת | 12 שנות ניסיון</p>

      <div className="flex flex-wrap gap-2 justify-center mb-5">
        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
          <Mail className="h-3.5 w-3.5 text-indigo-500" />{DPO_CONFIG.email}
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
          <FileCheck className="h-3.5 w-3.5 text-indigo-500" />רישיון {DPO_CONFIG.licenseNumber}
        </div>
      </div>

      <div className="bg-amber-50/60 rounded-xl p-4 mb-5 text-right">
        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm justify-center">
          <Sparkles className="h-4 w-4 text-amber-500" />מה הממונה תעשה עבור {orgName || 'הארגון שלכם'}
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

      <Link href="/dashboard">
        <button
          className="w-full py-3.5 rounded-xl border-none text-white text-base font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          המשך ללוח הבקרה
          <ArrowLeft className="h-4 w-4" />
        </button>
      </Link>
      <p className="text-center text-[11px] text-gray-400 mt-3">
        המסמכים שלכם זמינים בלוח הבקרה
      </p>
    </div>
  )
}

// =================================================================
// Basic — "You are the DPO"
// =================================================================
function BasicWelcomeCard({ orgName }: { orgName: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-3">
        ✓ ההרשמה הושלמה
      </div>

      <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-amber-100 flex items-center justify-center shadow-lg">
        <Shield className="h-12 w-12 text-indigo-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">אתם הממונה — ואנחנו כאן לעזור</h1>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        בחבילת הניהול העצמי, {orgName || 'הארגון שלכם'} ממנה את עצמו כממונה הגנת פרטיות.
        Deepo מספקת את הכלים, התבניות והליווי שתצטרכו.
      </p>

      <div className="bg-indigo-50/60 rounded-xl p-4 mb-5 text-right">
        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm justify-center">
          <Sparkles className="h-4 w-4 text-indigo-500" />מה תקבלו במסלול הניהול העצמי
        </h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {[
            { icon: BookOpen, label: 'מסמכי מדיניות, נהלים וכתבי מינוי מוכנים' },
            { icon: FileCheck, label: 'רשימת משימות ציות מותאמת לעסק שלכם' },
            { icon: MessageSquare, label: 'עוזר AI לשאלות פרטיות בסיסיות 24/7' },
            { icon: Users, label: 'תזכורות, סקירות וכלי דיווח לאירועי אבטחה' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 justify-start">
              <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/dashboard">
        <button
          className="w-full py-3.5 rounded-xl border-none text-white text-base font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          המשך ללוח הבקרה
          <ArrowLeft className="h-4 w-4" />
        </button>
      </Link>

      <div className="mt-5 pt-5 border-t border-stone-100">
        <p className="text-xs text-gray-500 mb-2">
          רוצים שנמנה עבורכם ממונה הגנת פרטיות מוסמכת?
        </p>
        <Link
          href="/subscribe"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          שדרגו לחבילה מומלצת
          <ArrowLeft className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
