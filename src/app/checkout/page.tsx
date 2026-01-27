'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Check, ArrowRight, Loader2, CreditCard, Lock, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type Plan = 'basic' | 'extended' | 'enterprise';

const PLANS = {
  basic: {
    name: 'חבילה בסיסית',
    price: 500,
    annualPrice: 5000,
    description: 'לעסקים קטנים ובינוניים',
    features: [
      'ממונה הגנת פרטיות מוסמך',
      'מסמכים אוטומטיים',
      'בוט Q&A לעובדים',
      'יומן ביקורת',
      'תמיכה בדוא"ל',
      'זמן תגובה: 72 שעות',
    ],
    popular: false,
  },
  extended: {
    name: 'חבילה מורחבת',
    price: 1200,
    annualPrice: 12000,
    description: 'לעסקים עם מידע רגיש',
    features: [
      'כל מה שבחבילה הבסיסית',
      'סקירה רבעונית של הממונה',
      '30 דק׳ זמן DPO/חודש',
      'ליווי באירועי אבטחה',
      'תמיכה טלפונית',
      'זמן תגובה: 24 שעות',
      'עד 3 משתמשים',
    ],
    popular: true,
  },
  enterprise: {
    name: 'חבילה ארגונית',
    price: 3500,
    annualPrice: 35000,
    description: 'לארגונים עם דרישות מורכבות',
    features: [
      'כל מה שבחבילה המורחבת',
      '2 שעות זמן DPO/חודש',
      'סקירה חודשית',
      'הדרכת עובדים רבעונית',
      'DPIA מלא כלול',
      'זמן תגובה: 4 שעות',
      'משתמשים ללא הגבלה',
      'SLA מובטח',
    ],
    popular: false,
  },
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session, supabase } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState<Plan>('extended');
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Get plan from URL if provided
  useEffect(() => {
    const planParam = searchParams.get('plan') as Plan;
    if (planParam && PLANS[planParam]) {
      setSelectedPlan(planParam);
    }
    
    if (searchParams.get('cancelled')) {
      setError('התשלום בוטל. ניתן לנסות שוב.');
    }
  }, [searchParams]);

  // Load user organization
  useEffect(() => {
    async function loadOrg() {
      if (!user || !supabase) return;
      
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', user.id)
        .single();
      
      if (data) {
        setOrganization(data);
        
        // Calculate trial days left
        if (data.trial_end_date) {
          const endDate = new Date(data.trial_end_date);
          const now = new Date();
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, daysLeft));
        }
      }
    }
    loadOrg();
  }, [user, supabase]);

  const handleCheckout = async () => {
    if (!user || !organization) {
      router.push('/login?redirect=/checkout');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hyp/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization.id,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.email?.split('@')[0],
          plan: selectedPlan,
          isAnnual,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.paymentUrl) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // Redirect to HYP payment page
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'שגיאה ביצירת התשלום. נסה שוב.');
      setIsLoading(false);
    }
  };

  const currentPlan = PLANS[selectedPlan];
  const displayPrice = isAnnual ? currentPlan.annualPrice : currentPlan.price;
  const monthlyEquivalent = isAnnual ? Math.round(currentPlan.annualPrice / 12) : currentPlan.price;
  const savings = isAnnual ? currentPlan.price * 12 - currentPlan.annualPrice : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">MyDPO</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Lock className="h-4 w-4" />
            <span>תשלום מאובטח</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Trial Warning */}
        {trialDaysLeft !== null && trialDaysLeft <= 3 && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
            trialDaysLeft === 0 
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>
              {trialDaysLeft === 0 
                ? 'תקופת הניסיון הסתיימה! השלם את התשלום כדי להמשיך להשתמש ב-MyDPO.'
                : `נותרו ${trialDaysLeft} ימים לתקופת הניסיון שלך.`
              }
            </span>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            בחר את החבילה שלך
          </h1>
          <p className="text-slate-600">
            כל החבילות כוללות DPO מוסמך + מערכת AI מלאה
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${!isAnnual ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
            חודשי
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isAnnual ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              isAnnual ? 'right-0.5' : 'right-7'
            }`} />
          </button>
          <span className={`text-sm ${isAnnual ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
            שנתי
            <span className="text-green-600 mr-1">(חסכון 17%)</span>
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {(Object.keys(PLANS) as Plan[]).map((planKey) => {
            const plan = PLANS[planKey];
            const isSelected = selectedPlan === planKey;
            const price = isAnnual ? plan.annualPrice : plan.price;
            const monthlyPrice = isAnnual ? Math.round(plan.annualPrice / 12) : plan.price;

            return (
              <div
                key={planKey}
                onClick={() => setSelectedPlan(planKey)}
                className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02]' 
                    : 'border border-slate-200 hover:border-blue-300 hover:shadow-lg'
                } ${plan.popular ? 'border-blue-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      הכי פופולרי
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">₪{monthlyPrice}</span>
                    <span className="text-slate-500">/חודש</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-slate-500 mt-1">
                      ₪{price} לשנה (חיסכון ₪{plan.price * 12 - plan.annualPrice})
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className={`w-full py-3 rounded-xl text-center font-medium transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {isSelected ? 'נבחר ✓' : 'בחר חבילה'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Checkout Summary */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">סיכום הזמנה</h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">חבילה</span>
              <span className="font-medium text-slate-900">{currentPlan.name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">תקופת חיוב</span>
              <span className="font-medium text-slate-900">{isAnnual ? 'שנתי' : 'חודשי'}</span>
            </div>
            {isAnnual && savings > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-green-600">חיסכון</span>
                <span className="font-medium text-green-600">₪{savings}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3">
              <span className="text-lg font-medium text-slate-900">סה"כ לתשלום</span>
              <span className="text-2xl font-bold text-slate-900">₪{displayPrice}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                מעבד...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                המשך לתשלום מאובטח
              </>
            )}
          </button>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              <span>SSL מאובטח</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>ביטול בכל עת</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            בלחיצה על "המשך לתשלום" אתה מסכים ל
            <Link href="/terms" className="text-blue-600 hover:underline">תנאי השימוש</Link>
            {' '}ול
            <Link href="/privacy" className="text-blue-600 hover:underline">מדיניות הפרטיות</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
