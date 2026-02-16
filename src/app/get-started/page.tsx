'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Shield, 
  ArrowLeft, 
  Building2,
  Users,
  Loader2,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// Quick assessment - just 2 questions to get to payment fast
const industries = [
  { id: 'healthcare', label: 'בריאות ורפואה', risk: 'high' },
  { id: 'finance', label: 'פיננסים וביטוח', risk: 'high' },
  { id: 'retail', label: 'קמעונאות ומסחר', risk: 'medium' },
  { id: 'technology', label: 'טכנולוגיה ותוכנה', risk: 'medium' },
  { id: 'education', label: 'חינוך והדרכה', risk: 'medium' },
  { id: 'services', label: 'שירותים מקצועיים', risk: 'low' },
  { id: 'manufacturing', label: 'תעשייה וייצור', risk: 'low' },
  { id: 'other', label: 'אחר', risk: 'low' },
]

const companySizes = [
  { id: 'small', label: '1-10 עובדים', records: 'under_10k' },
  { id: 'medium', label: '11-50 עובדים', records: '10k_to_50k' },
  { id: 'large', label: '51-200 עובדים', records: '50k_to_100k' },
  { id: 'enterprise', label: '200+ עובדים', records: 'over_100k' },
]

export default function GetStartedPage() {
  const router = useRouter()
  const { user, supabase, loading } = useAuth()
  
  const [step, setStep] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/register?redirect=/get-started')
    }
  }, [loading, user, router])

  // Calculate recommended plan based on quick assessment
  const getRecommendedPlan = () => {
    const industryData = industries.find(i => i.id === industry)
    const sizeData = companySizes.find(s => s.id === companySize)
    
    // Enterprise: Large company OR high-risk industry with medium+ size
    if (companySize === 'enterprise' || 
        (industryData?.risk === 'high' && (companySize === 'medium' || companySize === 'large'))) {
      return 'enterprise'
    }
    
    // Extended: Medium+ company OR high-risk industry
    if (companySize === 'large' || companySize === 'medium' || industryData?.risk === 'high') {
      return 'extended'
    }
    
    return 'basic'
  }

  const handleContinue = async () => {
    if (step === 1 && companyName.trim()) {
      setStep(2)
      return
    }
    
    if (step === 2 && industry) {
      setStep(3)
      return
    }

    if (step === 3 && companySize) {
      // Save quick assessment and redirect to payment
      setIsSubmitting(true)
      setError(null)

      try {
        // Save to localStorage for later use in full onboarding
        localStorage.setItem('mydpo_quick_assessment', JSON.stringify({
          companyName,
          industry,
          companySize,
          recommendedPlan: getRecommendedPlan(),
          createdAt: new Date().toISOString()
        }))

        // Redirect to checkout with recommended plan
        const plan = getRecommendedPlan()
        router.push(`/checkout?plan=${plan}`)
        
      } catch (err: any) {
        setError('אירעה שגיאה. נסה שוב.')
        setIsSubmitting(false)
      }
    }
  }

  const canContinue = () => {
    if (step === 1) return companyName.trim().length > 0
    if (step === 2) return industry !== ''
    if (step === 3) return companySize !== ''
    return false
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">MyDPO</span>
          </Link>
          <div className="text-sm text-slate-500">
            שלב {step} מתוך 3
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="max-w-xl mx-auto px-4 py-12">
        {/* Step 1: Company Name */}
        {step === 1 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              מה שם העסק שלך?
            </h1>
            <p className="text-slate-500 mb-8">
              נתחיל עם הפרטים הבסיסיים
            </p>

            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="שם החברה / העסק"
              className="w-full px-4 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-center"
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Industry */}
        {step === 2 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              באיזה תחום {companyName} פועל?
            </h1>
            <p className="text-slate-500 mb-8">
              זה יעזור לנו להתאים את המסמכים לתחום שלך
            </p>

            <div className="grid grid-cols-2 gap-3">
              {industries.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setIndustry(ind.id)}
                  className={`p-4 rounded-xl border-2 text-right transition-all ${
                    industry === ind.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Company Size */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              כמה עובדים ב-{companyName}?
            </h1>
            <p className="text-slate-500 mb-8">
              זה עוזר לנו להמליץ על החבילה המתאימה
            </p>

            <div className="space-y-3">
              {companySizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setCompanySize(size.id)}
                  className={`w-full p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                    companySize === size.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span>{size.label}</span>
                  {companySize === size.id && (
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Continue button */}
        <div className="mt-8">
          <button
            onClick={handleContinue}
            disabled={!canContinue() || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                מעבד...
              </>
            ) : step === 3 ? (
              <>
                המשך לבחירת חבילה
                <ArrowLeft className="h-5 w-5" />
              </>
            ) : (
              <>
                המשך
                <ArrowLeft className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-3 text-slate-500 hover:text-slate-700 py-2 transition-colors"
          >
            חזרה
          </button>
        )}

        {/* Trust badges */}
        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>מאובטח</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>2 דקות להשלמה</span>
          </div>
        </div>
      </main>
    </div>
  )
}
