'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, CheckCircle2, ArrowLeft, PartyPopper, Loader2 } from 'lucide-react';
import Image from 'next/image';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const transactionId = searchParams.get('txn');

  useEffect(() => {
    // Give Cardcom webhook time to process
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">מאשר את התשלום...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white" dir="rtl">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl p-12 shadow-xl border border-green-100 text-center">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2">
              <PartyPopper className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            התשלום הושלם בהצלחה! 🎉
          </h1>

          <p className="text-lg text-slate-600 mb-8">
            ברוכים הבאים למשפחת Deepo! החשבון שלך שודרג והארגון שלך מוגן עכשיו.
          </p>

          {/* What's Next */}
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-right">
            <h2 className="font-bold text-slate-900 mb-4">מה עכשיו?</h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <span>הממונה שלך יצור קשר תוך 24 שעות להיכרות ראשונית</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <span>המשך ליצור מסמכים דרך הצ'אט או לוח הבקרה</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <span>השלם את מיפוי מאגרי המידע (ROPA) שלך</span>
              </li>
            </ul>
          </div>

          {/* Features Unlocked */}
          <div className="bg-green-50 rounded-2xl p-6 mb-8 text-right">
            <h2 className="font-bold text-green-800 mb-4">✓ מה שזמין לך עכשיו:</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-green-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>DPO ממונה</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>מסמכים ללא הגבלה</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>ניהול אירועי אבטחה</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>ROPA אוטומטי</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Audit trail מלא</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>תמיכה עברית</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard?payment=success"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            עבור ללוח הבקרה
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <p className="mt-6 text-sm text-slate-500">
            חשבונית מס תישלח לכתובת האימייל שלך תוך 24 שעות
          </p>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
