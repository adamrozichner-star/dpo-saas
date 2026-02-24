'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function PaymentRequiredPage() {
  const router = useRouter()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
      return
    }
  }, [loading, session, router])

  // Double-check: if they already have an active subscription, redirect to dashboard
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !supabase) return

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .single()

       if (userData?.org_id) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('org_id', userData.org_id)
            .eq('status', 'active')
            .single()

          if (sub) {
            // Check if onboarding is complete
            const { data: profile } = await supabase
              .from('organization_profiles')
              .select('id')
              .eq('org_id', userData.org_id)
              .single()

            if (profile) {
              router.push('/dashboard')
            } else {
              router.push('/onboarding')
            }
            return
          }
        }
      } catch (e) {
        // No subscription found — stay on this page
      }
      setChecking(false)
    }

    if (user && supabase) {
      checkSubscription()
    }
  }, [user, supabase, router])

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white" dir="rtl">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-slate-800">MyDPO</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            נדרש תשלום לגישה למערכת
          </h1>
          
          <p className="text-slate-500 mb-8 leading-relaxed">
            החשבון שלך נוצר בהצלחה! כדי לגשת ללוח הבקרה, המסמכים והצ׳אט עם ה-DPO, 
            יש להשלים את תהליך התשלום.
          </p>

          {/* What you get */}
          <div className="bg-slate-50 rounded-xl p-5 mb-8 text-right">
            <p className="text-sm font-semibold text-slate-700 mb-3">מה כלול במנוי:</p>
            <div className="space-y-2">
              {[
                'DPO ממונה מוסמך',
                'מסמכי ציות מלאים',
                'ניטור ודיווח אוטומטי',
                'צ׳אט עם DPO לשאלות',
                'ניהול אירועי אבטחה',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/subscribe')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-xl transition-colors text-lg mb-4"
          >
            השלמת תשלום — ₪500/חודש
          </button>

          <button
            onClick={() => router.push('/checkout')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-xl transition-colors text-sm mb-6"
          >
            צפייה בחבילות נוספות
          </button>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <button
              onClick={async () => {
                await signOut()
                router.push('/login')
              }}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              התנתקות
            </button>
            <a
              href="mailto:support@mydpo.co.il"
              className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              צריך עזרה?
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2025 MyDPO. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}
