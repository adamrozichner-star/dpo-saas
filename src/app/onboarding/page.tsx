'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Building2,
  Database,
  Share2,
  Lock,
  FileCheck,
  Loader2,
  AlertCircle,
  User,
  Sparkles,
  HelpCircle,
  Phone,
  Mail,
  Crown,
  X
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { onboardingSteps } from '@/lib/mock-data'
import { OnboardingQuestion, OnboardingAnswer } from '@/types'

const stepIcons = [Building2, Database, Share2, Lock, FileCheck, User]
const stepDescriptions = [
  'נתחיל עם פרטים בסיסיים על העסק',
  'ספרו לנו איזה מידע אתם אוספים',
  'איך ואיפה המידע מאוחסן ומשותף',
  'בואו נבדוק את רמת האבטחה הנוכחית',
  'עוד קצת על המצב הרגולטורי הקיים',
  'הכירו את הממונה שלכם'
]

// Industry-specific suggestions for data types
const industrySuggestions: Record<string, string[]> = {
  healthcare: ['contact', 'id', 'health'],
  finance: ['contact', 'id', 'financial'],
  retail: ['contact', 'financial', 'behavioral'],
  technology: ['contact', 'behavioral', 'employment'],
  education: ['contact', 'id', 'employment'],
  services: ['contact', 'financial'],
  manufacturing: ['contact', 'employment'],
  other: ['contact']
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([])
  const [selectedTier, setSelectedTier] = useState<'basic' | 'extended' | 'enterprise' | null>(null)
  const [showTierSelection, setShowTierSelection] = useState(false) // Start with questions, show pricing AFTER
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [recommendedTier, setRecommendedTier] = useState<'basic' | 'extended' | 'enterprise'>('basic')

  // Add step for DPO intro
  const allSteps = [...onboardingSteps, { id: 6, title: 'הממונה שלכם', questions: [] }]
  const totalSteps = allSteps.length

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    const tier = searchParams.get('tier')
    if (tier === 'basic' || tier === 'extended' || tier === 'enterprise') {
      setSelectedTier(tier)
      if (tier === 'enterprise') {
        setShowEnterpriseModal(true)
      }
      // Don't skip to pricing - let user go through questions first
    }
  }, [searchParams])

  // Auto-save answers to localStorage
  useEffect(() => {
    if (answers.length > 0) {
      localStorage.setItem('dpo_onboarding_answers', JSON.stringify(answers))
      localStorage.setItem('dpo_onboarding_step', String(currentStep))
    }
  }, [answers, currentStep])

  // Load saved answers on mount
  useEffect(() => {
    const saved = localStorage.getItem('dpo_onboarding_answers')
    const savedStep = localStorage.getItem('dpo_onboarding_step')
    if (saved) {
      try {
        setAnswers(JSON.parse(saved))
        if (savedStep) setCurrentStep(parseInt(savedStep))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  const currentStepData = allSteps[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  const getAnswer = (questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.value
  }

  const handleAnswer = (questionId: string, value: string | string[] | boolean | number) => {
    const existing = answers.findIndex(a => a.questionId === questionId)
    if (existing >= 0) {
      const newAnswers = [...answers]
      newAnswers[existing] = { questionId, value }
      setAnswers(newAnswers)
    } else {
      setAnswers([...answers, { questionId, value }])
    }
  }

  // Get suggested data types based on industry
  const getSuggestedDataTypes = () => {
    const businessType = getAnswer('business_type') as string
    return industrySuggestions[businessType] || industrySuggestions.other
  }

  const canProceed = () => {
    if (currentStep === totalSteps - 1) return true // DPO intro step
    if (!currentStepData || !currentStepData.questions) return false
    return currentStepData.questions.every((q: OnboardingQuestion) => {
      if (!q.required) return true
      const answer = getAnswer(q.id)
      if (Array.isArray(answer)) return answer.length > 0
      return answer !== undefined && answer !== ''
    })
  }

  // Calculate recommended tier based on answers
  const calculateRecommendedTier = (): 'basic' | 'extended' | 'enterprise' => {
    const dataTypes = getAnswer('data_types') as string[] || []
    const recordCount = getAnswer('record_count') as string || ''
    const industry = getAnswer('industry') as string || ''
    const thirdPartySharing = getAnswer('third_party_sharing') as boolean
    const internationalTransfers = getAnswer('international_transfers') as boolean
    
    // Enterprise indicators
    if (
      recordCount === 'over_100k' ||
      industry === 'healthcare' ||
      industry === 'finance' ||
      (dataTypes.includes('health') && dataTypes.includes('financial'))
    ) {
      return 'enterprise'
    }
    
    // Extended indicators
    if (
      recordCount === '10k_to_100k' ||
      dataTypes.includes('health') ||
      dataTypes.includes('biometric') ||
      thirdPartySharing ||
      internationalTransfers ||
      dataTypes.length >= 4
    ) {
      return 'extended'
    }
    
    return 'basic'
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Last step completed - show pricing with recommendation
      const recommended = calculateRecommendedTier()
      setRecommendedTier(recommended)
      setShowTierSelection(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleComplete = async () => {
    if (!supabase || !user) {
      setError('לא מחובר למערכת')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress(10)
    setStatus('יוצרים את הארגון שלכם...')

    try {
      const businessNameAnswer = answers.find(a => a.questionId === 'business_name')
      const businessIdAnswer = answers.find(a => a.questionId === 'business_id')
      
      const businessName = businessNameAnswer?.value as string || 'עסק חדש'
      const businessId = businessIdAnswer?.value as string || ''

      setGenerationProgress(20)

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: businessName,
          business_id: businessId,
          tier: selectedTier || 'basic',
          status: 'active'
        })
        .select()
        .single()

      if (orgError) {
        throw new Error('שגיאה ביצירת הארגון: ' + orgError.message)
      }

      setGenerationProgress(40)
      setStatus('מעדכנים את פרטי המשתמש...')

      await supabase
        .from('users')
        .update({ org_id: orgData.id })
        .eq('auth_user_id', user.id)

      setGenerationProgress(50)
      setStatus('שומרים את פרופיל הארגון...')
      
      await supabase
        .from('organization_profiles')
        .insert({
          org_id: orgData.id,
          profile_data: { answers, completedAt: new Date().toISOString() }
        })

      setGenerationProgress(60)
      setStatus('מייצרים מסמכים...')
      
      try {
        const response = await fetch('/api/generate-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId: orgData.id,
            orgName: businessName,
            businessId: businessId,
            answers: answers
          })
        })
        
        if (response.ok) {
          setGenerationProgress(90)
          setStatus('מסמכים נוצרו בהצלחה!')
        }
      } catch (docError) {
        console.log('Document generation skipped')
      }

      // Clear saved data
      localStorage.removeItem('dpo_onboarding_answers')
      localStorage.removeItem('dpo_onboarding_step')

      setGenerationProgress(100)
      setStatus('הושלם! מעבירים ללוח הבקרה...')
      
      // Send welcome email with org details
      try {
        const orgName = answers.find(a => a.questionId === 'org_name')?.value || 'הארגון שלך'
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'welcome',
            to: user?.email,
            data: { 
              name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'משתמש',
              orgName: orgName
            }
          })
        })
      } catch (emailErr) {
        console.log('Welcome email skipped:', emailErr)
      }
      
      setTimeout(() => {
        router.push('/dashboard?welcome=true')
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה בתהליך ההרשמה')
      setIsGenerating(false)
    }
  }

  const handleEnterpriseSelect = () => {
    setSelectedTier('enterprise')
    setShowEnterpriseModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">מייצרים את המסמכים שלכם</h2>
            <p className="text-gray-600 mb-6">{status}</p>
            <Progress value={generationProgress} className="h-3 mb-4" />
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
              <div className={generationProgress >= 25 ? 'text-primary font-medium' : ''}>
                <FileCheck className="h-4 w-4 mx-auto mb-1" />
                מדיניות פרטיות
              </div>
              <div className={generationProgress >= 50 ? 'text-primary font-medium' : ''}>
                <Database className="h-4 w-4 mx-auto mb-1" />
                הגדרות מאגר
              </div>
              <div className={generationProgress >= 75 ? 'text-primary font-medium' : ''}>
                <Lock className="h-4 w-4 mx-auto mb-1" />
                נהלי אבטחה
              </div>
              <div className={generationProgress >= 90 ? 'text-primary font-medium' : ''}>
                <User className="h-4 w-4 mx-auto mb-1" />
                כתב מינוי
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Enterprise Contact Modal
  if (showEnterpriseModal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-slate-100 rounded-full p-4 w-fit">
              <Crown className="h-10 w-10 text-slate-700" />
            </div>
            <Badge className="mx-auto mb-2 bg-slate-600">לארגונים</Badge>
            <CardTitle className="text-2xl">חבילה ארגונית</CardTitle>
            <CardDescription>
              פתרון מותאם אישית לארגונים גדולים
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">החבילה כוללת:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  2 שעות זמן DPO בחודש
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  זמן תגובה עד 4 שעות
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  סקירת תאימות חודשית
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  הדרכות לעובדים (רבעוני)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  DPIA מלא כלול
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  משתמשים ללא הגבלה
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  SLA מובטח
                </li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold mb-1">₪3,500</p>
              <p className="text-gray-600">לחודש</p>
            </div>

            <div className="space-y-3">
              <p className="text-center text-gray-600">צרו קשר לתיאום פגישת היכרות:</p>
              
              <Button 
                className="w-full h-12 bg-slate-700 hover:bg-slate-800"
                onClick={() => window.location.href = 'mailto:enterprise@dpo-pro.co.il?subject=בקשת מידע - חבילה ארגונית'}
              >
                <Mail className="h-5 w-5 ml-2" />
                enterprise@dpo-pro.co.il
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-12"
                onClick={() => window.location.href = 'tel:+972-3-555-1234'}
              >
                <Phone className="h-5 w-5 ml-2" />
                03-555-1234
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500">
              נחזור אליכם תוך יום עסקים אחד
            </p>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => {
                setShowEnterpriseModal(false)
                setSelectedTier(null)
              }}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה לבחירת חבילות
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showTierSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setShowTierSelection(false)}
            className="inline-flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לשאלון
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl" style={{color: '#1e40af'}}>MyDPO</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">בחרו את החבילה שלכם</h1>
            <p className="text-gray-600 mb-4">בהתבסס על הפרטים שמילאתם, אנחנו ממליצים על:</p>
            
            {/* Trial Banner */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
              <Sparkles className="h-5 w-5" />
              14 ימי ניסיון חינם • ללא כרטיס אשראי • ביטול בכל עת
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Basic Package */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg relative ${selectedTier === 'basic' ? 'ring-2 ring-primary' : ''} ${recommendedTier === 'basic' ? 'border-2 border-emerald-500' : ''}`}
              onClick={() => setSelectedTier('basic')}
            >
              {recommendedTier === 'basic' && (
                <Badge className="absolute -top-3 right-4 bg-emerald-500">מומלץ עבורך</Badge>
              )}
              <CardHeader>
                <CardTitle>חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">₪500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    DPO ממונה מוסמך
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    מערכת AI מלאה
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    הפקת מסמכים אוטומטית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Q&A חכם לעובדים
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <X className="h-4 w-4 flex-shrink-0" />
                    סקירה תקופתית
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <X className="h-4 w-4 flex-shrink-0" />
                    ליווי DPIA
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Extended Package */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${selectedTier === 'extended' ? 'ring-2 ring-primary border-primary' : 'border-primary/50'} ${recommendedTier === 'extended' ? 'border-emerald-500' : ''}`}
              onClick={() => setSelectedTier('extended')}
            >
              {recommendedTier === 'extended' ? (
                <Badge className="absolute -top-3 right-4 bg-emerald-500">מומלץ עבורך</Badge>
              ) : (
                <Badge className="absolute -top-3 right-4 bg-primary">הכי פופולרי</Badge>
              )}
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם פעילות מורכבת</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">₪1,200</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    כל מה שבחבילה הבסיסית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    30 דקות זמן DPO בחודש
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    סקירה רבעונית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    זמן תגובה 24 שעות
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ליווי DPIA
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    עד 3 משתמשים
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Enterprise Package */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 relative ${selectedTier === 'enterprise' ? 'ring-2 ring-slate-500' : ''} ${recommendedTier === 'enterprise' ? 'border-2 border-emerald-500' : ''}`}
              onClick={handleEnterpriseSelect}
            >
              {recommendedTier === 'enterprise' && (
                <Badge className="absolute -top-3 right-4 bg-emerald-500">מומלץ עבורך</Badge>
              )}
              <CardHeader>
                <Badge className="w-fit mb-2 bg-slate-600">לארגונים</Badge>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-slate-600" />
                  חבילה ארגונית
                </CardTitle>
                <CardDescription>לארגונים עם דרישות מורכבות</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">₪3,500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    כל מה שבחבילה המורחבת
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    2 שעות זמן DPO בחודש
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    סקירה חודשית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    זמן תגובה 4 שעות
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    הדרכות לעובדים
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    משתמשים ללא הגבלה + SLA
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button 
              size="lg" 
              onClick={() => {
                if (selectedTier === 'enterprise') {
                  setShowEnterpriseModal(true)
                } else {
                  setShowTierSelection(false)
                }
              }}
              disabled={!selectedTier}
              className="h-14 px-8 text-lg"
            >
              {selectedTier === 'enterprise' ? 'צרו קשר' : 'המשך להגדרת הארגון'}
              <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
          </div>

          {/* Comparison hint */}
          <p className="text-center text-sm text-gray-500 mt-4">
            לא בטוחים מה מתאים לכם? <Link href="/contact" className="text-primary hover:underline">דברו איתנו</Link>
          </p>
        </div>
      </div>
    )
  }

  // DPO Introduction Step - Attractive single screen
  if (currentStep === totalSteps - 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={handleBack} className="gap-2 text-white/80 hover:text-white hover:bg-white/10">
              <ArrowRight className="h-4 w-4" />
              הקודם
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-white">MyDPO</span>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Image Side */}
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex items-center justify-center min-h-[400px]">
                {/* Professional woman placeholder - using avatar.iran.liara.run for realistic placeholder */}
                <div className="relative">
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                    <img 
                      src="https://avatar.iran.liara.run/public/job/lawyer/female" 
                      alt="עו״ד דנה כהן"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Verified badge */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    מוסמכת
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-6 right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              </div>

              {/* Content Side */}
              <div className="p-8 flex flex-col justify-center">
                <Badge className="w-fit mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100">הממונה שלכם</Badge>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">עו״ד דנה כהן</h1>
                <p className="text-slate-600 mb-6">ממונה הגנת פרטיות מוסמכת | 12 שנות ניסיון</p>

                {/* Contact Info - Compact */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">dpo@mydpo.co.il</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">רישיון DPO-2025-001</span>
                  </div>
                </div>

                {/* What DPO does - Compact grid */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    מה הממונה תעשה עבורכם?
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>פיקוח על עמידה בחוק</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>טיפול בפניות נושאי מידע</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>ייעוץ פרטיות ואבטחה</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>קשר עם הרשות להגנת הפרטיות</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* CTA Button */}
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  onClick={handleNext}
                >
                  <Sparkles className="ml-2 h-5 w-5" />
                  המשך לבחירת חבילה
                </Button>
                
                <p className="text-center text-xs text-slate-500 mt-3">
                  14 ימי ניסיון חינם • ביטול בכל עת
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const StepIcon = stepIcons[currentStep] || FileCheck

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold" style={{color: '#1e40af'}}>MyDPO</span>
          </div>
        </div>

        {/* Progress with Step Icons */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {allSteps.map((step, index) => {
              const Icon = stepIcons[index] || FileCheck
              const isActive = index === currentStep
              const isComplete = index < currentStep
              return (
                <div 
                  key={step.id} 
                  className={`flex flex-col items-center ${index < totalSteps - 1 ? 'flex-1' : ''}`}
                >
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-primary text-white scale-110' 
                        : isComplete 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Step Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <StepIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-1">{currentStepData?.title}</h2>
          <p className="text-gray-600">{stepDescriptions[currentStep]}</p>
        </div>

        {/* Questions */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {currentStepData?.questions.map((question: OnboardingQuestion) => (
              <div key={question.id} className="space-y-3">
                <label className="block font-medium text-lg">
                  {question.text}
                  {question.required && <span className="text-red-500 mr-1">*</span>}
                </label>
                
                {question.helpText && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <HelpCircle className="h-4 w-4" />
                    {question.helpText}
                  </p>
                )}

                {/* Show suggestions for data_types based on industry */}
                {question.id === 'data_types' && getAnswer('business_type') && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 mb-1">
                      <Sparkles className="h-4 w-4 inline ml-1" />
                      מומלץ לתחום שלכם:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getSuggestedDataTypes().map(type => {
                        const option = question.options?.find(o => o.value === type)
                        return option ? (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {option.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
                
                {question.type === 'text' && (
                  <Input
                    value={(getAnswer(question.id) as string) || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    placeholder="הקלידו כאן..."
                    className="h-12 text-lg"
                  />
                )}

                {question.type === 'single_choice' && question.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={getAnswer(question.id) === option.value ? 'default' : 'outline'}
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => handleAnswer(question.id, option.value)}
                      >
                        {getAnswer(question.id) === option.value && (
                          <CheckCircle2 className="h-4 w-4 ml-2 flex-shrink-0" />
                        )}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}

                {question.type === 'multi_choice' && question.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option) => {
                      const currentValues = (getAnswer(question.id) as string[]) || []
                      const isSelected = currentValues.includes(option.value)
                      const isSuggested = question.id === 'data_types' && getSuggestedDataTypes().includes(option.value)
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className={`justify-start h-auto py-3 px-4 ${isSuggested && !isSelected ? 'border-blue-300 bg-blue-50' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              handleAnswer(question.id, currentValues.filter(v => v !== option.value))
                            } else {
                              handleAnswer(question.id, [...currentValues, option.value])
                            }
                          }}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 ml-2 flex-shrink-0" />
                          )}
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {question.type === 'number' && (
                  <Input
                    type="number"
                    value={(getAnswer(question.id) as number) || ''}
                    onChange={(e) => handleAnswer(question.id, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-12 text-lg"
                  />
                )}

                {question.type === 'boolean' && (
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={getAnswer(question.id) === true ? 'default' : 'outline'}
                      className="flex-1 h-14 text-lg"
                      onClick={() => handleAnswer(question.id, true)}
                    >
                      {getAnswer(question.id) === true && <CheckCircle2 className="h-5 w-5 ml-2" />}
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={getAnswer(question.id) === false ? 'default' : 'outline'}
                      className="flex-1 h-14 text-lg"
                      onClick={() => handleAnswer(question.id, false)}
                    >
                      {getAnswer(question.id) === false && <CheckCircle2 className="h-5 w-5 ml-2" />}
                      לא
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="h-12"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            הקודם
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="h-12 px-8"
          >
            {currentStep === totalSteps - 2 ? 'הכירו את הממונה' : 'הבא'}
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>

        {/* Step indicator text */}
        <p className="text-center text-sm text-gray-500 mt-4">
          שלב {currentStep + 1} מתוך {totalSteps} • התשובות נשמרות אוטומטית
        </p>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
