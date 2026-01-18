'use client'

import { useEffect, useState } from 'react'
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
  X
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
      '3 מסמכים מותאמים',
      'בוט שאלות ותשובות',
      'תמיכה בדוא"ל',
    ],
    notIncluded: [
      'סקירה תקופתית',
      'זמינות DPO מורחבת',
      'ליווי אירועי אבטחה',
    ],
    popular: false
  },
  {
    id: 'extended',
    name: 'מורחבת',
    price: 1200,
    description: 'לעסקים עם מידע רגיש או פעילות מורכבת',
    features: [
      'כל מה שבחבילה הבסיסית',
      'סקירה תקופתית רבעונית',
      'זמינות DPO עד 2 שעות/חודש',
      'ליווי אירועי אבטחה',
      'תמיכה טלפונית',
      'DPIA בסיסי כלול',
    ],
    notIncluded: [],
    popular: true
  }
]

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
      return
    }

    if (user && supabase) {
      loadOrganization()
    }

    // Check for success callback
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
    setSelectedPlan(planId)
    setError(null)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/payment', {
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
        // Redirect to LemonSqueezy checkout
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
            <p className="text-gray-600 mb-6">המנוי שלך הופעל. ברוכים הבאים ל-DPO-Pro!</p>
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
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">חזרה ללוח הבקרה</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Pricing Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">בחרו את החבילה המתאימה לכם</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            כל החבילות כוללות DPO ממונה מוסמך ומערכת ניהול פרטיות מלאה.
            בחרו את החבילה המתאימה לגודל ולסוג העסק שלכם.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.popular ? 'border-primary border-2' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 right-4 bg-primary">
                  הכי פופולרי
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₪{plan.price}</span>
                  <span className="text-gray-500"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-400">
                      <X className="h-5 w-5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isProcessing}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 ml-2" />
                  )}
                  {isProcessing && selectedPlan === plan.id ? 'מעבד...' : 'בחירת חבילה'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-700">
            {error}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">שאלות נפוצות</h2>
          <div className="space-y-4">
            <details className="bg-white rounded-lg p-4 border">
              <summary className="font-medium cursor-pointer">האם אפשר לשדרג/לשנות חבילה?</summary>
              <p className="mt-2 text-gray-600">כן, ניתן לשדרג או לשנות חבילה בכל עת. השינוי ייכנס לתוקף במחזור החיוב הבא.</p>
            </details>
            <details className="bg-white rounded-lg p-4 border">
              <summary className="font-medium cursor-pointer">מה כלול בזמינות DPO?</summary>
              <p className="mt-2 text-gray-600">זמינות DPO מאפשרת פנייה ישירה לממונה לשאלות מורכבות, ייעוץ בנושאי פרטיות, וליווי אירועים מיוחדים.</p>
            </details>
            <details className="bg-white rounded-lg p-4 border">
              <summary className="font-medium cursor-pointer">איך מבטלים מנוי?</summary>
              <p className="mt-2 text-gray-600">ניתן לבטל מנוי בכל עת דרך הגדרות החשבון. הביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.</p>
            </details>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>🔒 תשלום מאובטח באמצעות LemonSqueezy</p>
          <p>ניתן לבטל בכל עת • ללא התחייבות</p>
        </div>
      </main>
    </div>
  )
}
