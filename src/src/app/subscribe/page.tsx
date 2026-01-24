'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Check,
  Loader2,
  CreditCard,
  CheckCircle2,
  X,
  Building2,
  Phone
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const plans = [
  {
    id: 'basic',
    name: 'בסיסית',
    price: 500,
    description: 'לעסקים קטנים עם פעילות סטנדרטית',
    features: [
      'DPO ממונה מוסמך',
      'מערכת ניהול פרטיות מלאה',
      'מסמכים מותאמים אוטומטית',
      'בוט שאלות ותשובות AI',
      'תמיכה בדוא"ל',
      'זמן תגובה: 72 שעות',
    ],
    notIncluded: [
      'סקירה תקופתית',
      'זמינות DPO מורחבת',
      'ליווי אירועי אבטחה',
    ],
    popular: false,
    cta: 'בחירת חבילה'
  },
  {
    id: 'extended',
    name: 'מורחבת',
    price: 1200,
    description: 'לעסקים עם מידע רגיש או פעילות מורכבת',
    features: [
      'כל מה שבחבילה הבסיסית',
      'סקירה תקופתית רבעונית',
      'זמינות DPO עד 30 דק׳/חודש',
      'ליווי אירועי אבטחה',
      'תמיכה טלפונית',
      'זמן תגובה: 24 שעות',
      'עד 3 משתמשים',
    ],
    notIncluded: [],
    popular: true,
    cta: 'בחירת חבילה'
  },
  {
    id: 'enterprise',
    name: 'ארגונית',
    price: 3500,
    description: 'לארגונים גדולים עם דרישות מורכבות',
    features: [
      'כל מה שבחבילה המורחבת',
      'זמינות DPO עד 2 שעות/חודש',
      'זמן תגובה: 4 שעות',
      'סקירה תקופתית חודשית',
      'הדרכת עובדים (רבעונית)',
      'DPIA מלא כלול',
      'משתמשים ללא הגבלה',
      'SLA מובטח',
      'מנהל לקוח ייעודי',
    ],
    notIncluded: [],
    popular: false,
    cta: 'צרו קשר'
  }
]

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
      return
    }

    if (user && supabase) {
      loadOrganization()
    }

    const payment = searchParams.get('payment')
    if (payment === 'success') {
      setPaymentSuccess(true)
    }
  }, [loading, user, supabase, searchParams])

  const loadOrganization = async () => {
    if (!supabase || !user) return

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userData?.org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.org_id)
        .single()
      
      setOrganization(org)
    }
  }

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'enterprise') {
      setShowEnterpriseModal(true)
      return
    }

    setSelectedPlan(planId)
    setError(null)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/tranzila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_checkout',
          tier: planId,
          orgId: organization?.id,
          userId: user?.id,
          userEmail: user?.email
        })
      })

      const data = await response.json()
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || 'שגיאה ביצירת התשלום')
        setIsProcessing(false)
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת')
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">התשלום בוצע בהצלחה!</h1>
            <p className="text-gray-600 mb-6">המנוי שלך הופעל. ברוכים הבאים ל-MyDPO!</p>
            <Button onClick={() => router.push('/dashboard')}>
              המשך ללוח הבקרה
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl" style={{color: '#1e40af'}}>MyDPO</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">חזרה ללוח הבקרה</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">בחרו את החבילה המתאימה לכם</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            כל החבילות כוללות DPO ממונה מוסמך ומערכת ניהול פרטיות מלאה.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative flex flex-col ${plan.popular ? 'border-primary border-2 shadow-lg' : ''} ${plan.id === 'enterprise' ? 'bg-gradient-to-b from-slate-50 to-slate-100' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 right-4 bg-primary">
                  הכי פופולרי
                </Badge>
              )}
              {plan.id === 'enterprise' && (
                <Badge className="absolute -top-3 right-4 bg-slate-800">
                  <Building2 className="h-3 w-3 ml-1" />
                  לארגונים
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₪{plan.price.toLocaleString()}</span>
                  <span className="text-gray-500"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-400">
                      <X className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full mt-auto ${plan.id === 'enterprise' ? 'bg-slate-800 hover:bg-slate-900' : ''}`}
                  variant={plan.popular ? 'default' : plan.id === 'enterprise' ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isProcessing && selectedPlan !== 'enterprise'}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : plan.id === 'enterprise' ? (
                    <Phone className="h-4 w-4 ml-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 ml-2" />
                  )}
                  {isProcessing && selectedPlan === plan.id ? 'מעבד...' : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="max-w-md mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-700">
            {error === 'Payment not configured' ? 'מערכת התשלומים עדיין לא הוגדרה' : error}
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>🔒 תשלום מאובטח באמצעות Tranzila</p>
          <p>ניתן לבטל בכל עת • ללא התחייבות</p>
        </div>

        {/* Comparison Table */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">השוואת חבילות</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-right p-4">תכונה</th>
                  <th className="text-center p-4">בסיסית</th>
                  <th className="text-center p-4 bg-primary/5">מורחבת</th>
                  <th className="text-center p-4 bg-slate-100">ארגונית</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4">מחיר חודשי</td>
                  <td className="text-center p-4">₪500</td>
                  <td className="text-center p-4 bg-primary/5 font-bold">₪1,200</td>
                  <td className="text-center p-4 bg-slate-100">₪3,500</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">DPO ממונה</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-slate-100"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">מסמכים אוטומטיים</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-slate-100"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">זמן DPO</td>
                  <td className="text-center p-4">חריגים בלבד</td>
                  <td className="text-center p-4 bg-primary/5">30 דק׳/חודש</td>
                  <td className="text-center p-4 bg-slate-100">2 שעות/חודש</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">זמן תגובה</td>
                  <td className="text-center p-4">72 שעות</td>
                  <td className="text-center p-4 bg-primary/5">24 שעות</td>
                  <td className="text-center p-4 bg-slate-100">4 שעות</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">סקירה תקופתית</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="text-center p-4 bg-primary/5">רבעונית</td>
                  <td className="text-center p-4 bg-slate-100">חודשית</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">משתמשים</td>
                  <td className="text-center p-4">1</td>
                  <td className="text-center p-4 bg-primary/5">3</td>
                  <td className="text-center p-4 bg-slate-100">ללא הגבלה</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">הדרכת עובדים</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="text-center p-4 bg-primary/5"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="text-center p-4 bg-slate-100"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">SLA מובטח</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="text-center p-4 bg-primary/5"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="text-center p-4 bg-slate-100"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  חבילה ארגונית
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowEnterpriseModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>
                צרו קשר לקבלת הצעה מותאמת לארגון שלכם
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="font-medium">החבילה הארגונית כוללת:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 2 שעות זמן DPO בחודש</li>
                  <li>• זמן תגובה של 4 שעות</li>
                  <li>• סקירה חודשית</li>
                  <li>• הדרכות לעובדים</li>
                  <li>• SLA מובטח</li>
                  <li>• מנהל לקוח ייעודי</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <a href="mailto:enterprise@dpo-pro.co.il?subject=בקשה לחבילה ארגונית" className="block">
                  <Button className="w-full">
                    📧 שלחו מייל
                  </Button>
                </a>
                <a href="tel:+972-XXX-XXXXXX" className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="h-4 w-4 ml-2" />
                    התקשרו אלינו
                  </Button>
                </a>
              </div>

              <p className="text-xs text-gray-500 text-center">
                נחזור אליכם תוך יום עסקים אחד
              </p>
            </CardContent>
          </Card>
        </div>
      )}
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
