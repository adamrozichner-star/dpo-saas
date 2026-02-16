// src/app/payment/error/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, ArrowRight, Shield, RefreshCw, HelpCircle } from 'lucide-react';

export default function PaymentErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('txn');
  const errorCode = searchParams.get('error');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          התשלום לא הושלם
        </h1>
        
        <p className="text-slate-600 mb-6">
          לא הצלחנו לעבד את התשלום שלך. אל דאגה, לא חויבת.
        </p>
        
        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-right">
          <p className="text-slate-700 text-sm font-medium mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            סיבות אפשריות:
          </p>
          <ul className="text-slate-600 text-sm space-y-1 mr-6">
            <li>• פרטי כרטיס האשראי שגויים</li>
            <li>• אין מספיק יתרה בכרטיס</li>
            <li>• הכרטיס חסום לעסקאות אינטרנט</li>
            <li>• התשלום בוטל</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push('/checkout')}
            className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>נסה שוב</span>
          </button>
          
          <Link
            href="/"
            className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>חזרה לדף הבית</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            נתקלת בבעיה? צור קשר:
            <br />
            <a href="mailto:support@mydpo.co.il" className="text-emerald-600 hover:underline">
              support@mydpo.co.il
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
