// src/app/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Shield, ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const transactionId = searchParams.get('txn');

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Give webhook time to process
      await new Promise(resolve => setTimeout(resolve, 2500));
      setStatus('success');

      // Check if user needs to complete onboarding
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // First get user's org_id from users table
            const { data: userData } = await supabase
              .from('users')
              .select('org_id')
              .eq('auth_user_id', session.user.id)
              .maybeSingle();
            
            if (userData?.org_id) {
              // Then check org status
              const { data: org } = await supabase
                .from('organizations')
                .select('id, status')
                .eq('id', userData.org_id)
                .single();

              // If org status is onboarding, needs full onboarding
              if (org && org.status === 'onboarding') {
                setNeedsOnboarding(true);
                // Clear quick assessment data
                localStorage.removeItem('mydpo_quick_assessment');
                // Redirect to full onboarding after payment
                setTimeout(() => {
                  router.push('/onboarding');
                }, 4000);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error('Check onboarding status error:', e);
      }

      // Default: redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 4000);
    };

    checkAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white" />
          </div>
        </div>

        {status === 'verifying' ? (
          <>
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              מאמת את התשלום...
            </h1>
            <p className="text-slate-600">
              אנא המתן רגע
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              התשלום התקבל בהצלחה! 🎉
            </h1>
            
            <p className="text-slate-600 mb-6">
              {needsOnboarding 
                ? 'עכשיו נשלים את הגדרת הארגון ונייצר לך את המסמכים.'
                : 'תודה שבחרת ב-MyDPO. המנוי שלך פעיל כעת.'
              }
            </p>
            
            <div className="bg-emerald-50 rounded-lg p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                ✓ התשלום אושר
                <br />
                ✓ המנוי שלך פעיל
                <br />
                ✓ אישור נשלח למייל
              </p>
            </div>

            {needsOnboarding ? (
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>המשך להגדרת הארגון</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <span>המשך ללוח הבקרה</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            
            <p className="text-sm text-slate-500 mt-4">
              מעביר אותך אוטומטית...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
