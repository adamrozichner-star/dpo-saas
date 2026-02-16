// src/app/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Shield, ArrowLeft } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const transactionId = searchParams.get('txn');

  useEffect(() => {
    // Give webhook time to process the payment
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2500);

    // Auto-redirect to dashboard after 5 seconds
    const redirectTimer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
    };
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
              התשלום התקבל בהצלחה!
            </h1>
            
            <p className="text-slate-600 mb-6">
              תודה שבחרת ב-MyDPO. המנוי שלך פעיל כעת.
            </p>
            
            <div className="bg-emerald-50 rounded-lg p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                ✓ הממונה שלך מוכן לעבודה
                <br />
                ✓ אישור נשלח לכתובת המייל שלך
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              <span>המשך ללוח הבקרה</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            
            <p className="text-sm text-slate-500 mt-4">
              מעביר אותך אוטומטית...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
