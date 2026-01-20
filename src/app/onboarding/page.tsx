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
  Shield, ArrowRight, ArrowLeft, CheckCircle2, Building2, Database,
  Share2, Lock, FileCheck, Loader2, AlertCircle, User, Mail, Eye,
  FileText, Users, Sparkles, Phone
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// Onboarding steps definition
const STEPS = [
  {
    id: 'tier',
    title: 'בחירת חבילה',
    description: 'בחרו את החבילה המתאימה לעסק',
    icon: Shield
  },
  {
    id: 'account',
    title: 'יצירת חשבון',
    description: 'פרטים בסיסיים להתחברות',
    icon: User
  },
  {
    id: 'business',
    title: 'פרטי העסק',
    description: 'שם העסק וח.פ',
    icon: Building2
  },
  {
    id: 'data',
    title: 'סוגי המידע',
    description: 'איזה מידע אתם אוספים',
    icon: Database
  },
  {
    id: 'security',
    title: 'אבטחה ושיתוף',
    description: 'אמצעי אבטחה ושיתוף מידע',
    icon: Lock
  },
  {
    id: 'summary',
    title: 'סיכום ואישור',
    description: 'סקירה לפני יצירת המסמכים',
    icon: FileCheck
  }
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, signUp, signIn, loading: authLoading } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [generationProgress, setGenerationProgress] = useState(0)
  
  // Form data
  const [formData, setFormData] = useState({
    // Tier
    tier: '' as 'basic' | 'extended' | '',
    // Account
    email: '',
    password: '',
    fullName: '',
    phone: '',
    // Business
    businessName: '',
    businessId: '',
    businessType: '',
    employeeCount: '',
    // Data
    dataTypes: [] as string[],
    dataSources: [] as string[],
    processingPurposes: [] as string[],
    // Security
    securityMeasures: [] as string[],
    thirdPartySharing: null as boolean | null,
    internationalTransfer: null as boolean | null,
    cloudStorage: '',
    existingPolicy: null as boolean | null,
    databaseRegistered: ''
  })

  // Check if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // User is logged in - skip to business details
      setCurrentStep(2)
    }
  }, [authLoading, user])

  // Handle tier from URL param
  useEffect(() => {
    const tier = searchParams.get('tier')
    if (tier === 'basic' || tier === 'extended') {
      setFormData(prev => ({ ...prev, tier }))
      if (currentStep === 0) {
        setCurrentStep(1)
      }
    }
  }, [searchParams])

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayValue = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'tier':
        return !!formData.tier
      case 'account':
        if (user) return true // Already logged in
        return formData.email && formData.password && formData.fullName && formData.password.length >= 6
      case 'business':
        return formData.businessName && formData.businessId && formData.businessType && formData.employeeCount
      case 'data':
        return formData.dataTypes.length > 0 && formData.dataSources.length > 0 && formData.processingPurposes.length > 0
      case 'security':
        return formData.securityMeasures.length > 0 && 
               formData.thirdPartySharing !== null && 
               formData.internationalTransfer !== null &&
               formData.cloudStorage &&
               formData.existingPolicy !== null
      case 'summary':
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    setError(null)
    
    // If on account step and not logged in, create account
    if (STEPS[currentStep].id === 'account' && !user) {
      try {
        const { error: signUpError } = await signUp(formData.email, formData.password, formData.fullName)
        if (signUpError) {
          // Try to sign in if account exists
          const { error: signInError } = await signIn(formData.email, formData.password)
          if (signInError) {
            setError('שגיאה ביצירת חשבון: ' + signUpError.message)
            return
          }
        }
      } catch (err: any) {
        setError(err.message)
        return
      }
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!supabase || !user) {
      setError('נא להתחבר מחדש')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress(10)
    setStatus('יוצרים את הארגון שלכם...')

    try {
      // 1. Create organization
      setGenerationProgress(20)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.businessName,
          business_id: formData.businessId,
          tier: formData.tier || 'basic',
          status: 'onboarding',
          risk_level: formData.dataTypes.some(d => ['health', 'financial', 'biometric'].includes(d)) ? 'sensitive' : 'standard'
        })
        .select()
        .single()

      if (orgError) throw new Error('שגיאה ביצירת הארגון: ' + orgError.message)

      // 2. Update user with org_id
      setStatus('מקשרים את החשבון לארגון...')
      setGenerationProgress(30)
      
      await supabase
        .from('users')
        .update({ 
          org_id: orgData.id,
          name: formData.fullName || user.email?.split('@')[0]
        })
        .eq('auth_user_id', user.id)

      // 3. Create organization profile
      setStatus('שומרים את פרופיל הארגון...')
      setGenerationProgress(40)
      
      await supabase
        .from('organization_profiles')
        .insert({
          org_id: orgData.id,
          business_type: formData.businessType,
          employee_count: parseInt(formData.employeeCount.split('-')[0]) || 10,
          data_types: formData.dataTypes,
          processing_purposes: formData.processingPurposes,
          security_measures: formData.securityMeasures
        })

      // 4. Assign DPO (get first available DPO)
      setStatus('מקצים ממונה הגנת פרטיות...')
      setGenerationProgress(50)
      
      const { data: dpoData } = await supabase
        .from('dpos')
        .select('id')
        .limit(1)
        .single()

      if (dpoData) {
        await supabase
          .from('organizations')
          .update({ dpo_id: dpoData.id })
          .eq('id', orgData.id)
      }

      // 5. Generate documents
      setStatus('מייצרים מסמכים מותאמים אישית...')
      setGenerationProgress(60)
      
      const docResponse = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgData.id,
          orgName: formData.businessName,
          businessId: formData.businessId,
          answers: [
            { questionId: 'business_type', value: formData.businessType },
            { questionId: 'employee_count', value: formData.employeeCount },
            { questionId: 'data_types', value: formData.dataTypes },
            { questionId: 'data_sources', value: formData.dataSources },
            { questionId: 'processing_purposes', value: formData.processingPurposes },
            { questionId: 'security_measures', value: formData.securityMeasures },
            { questionId: 'third_party_sharing', value: formData.thirdPartySharing },
            { questionId: 'international_transfer', value: formData.internationalTransfer },
            { questionId: 'cloud_storage', value: formData.cloudStorage },
            { questionId: 'existing_policy', value: formData.existingPolicy }
          ]
        })
      })

      if (!docResponse.ok) {
        console.error('Document generation failed, but continuing...')
      }

      setGenerationProgress(80)

      // 6. Create welcome message thread
      setStatus('יוצרים ערוץ תקשורת עם הממונה...')
      
      const { data: threadData } = await supabase
        .from('message_threads')
        .insert({
          org_id: orgData.id,
          subject: 'ברוכים הבאים ל-DPO-Pro! 🎉',
          status: 'active'
        })
        .select()
        .single()

      if (threadData) {
        await supabase
          .from('messages')
          .insert({
            thread_id: threadData.id,
            sender_type: 'dpo',
            sender_name: 'הממונה',
            content: `שלום ${formData.fullName || 'ולקוח יקר'},

ברוכים הבאים ל-DPO-Pro! 🎉

אני הממונה על הגנת הפרטיות שלכם. המסמכים שלכם נוצרו ומוכנים לשימוש.

מה עכשיו?
1. עברו על המסמכים בלשונית "מסמכים"
2. הורידו והטמיעו את מדיניות הפרטיות באתר שלכם
3. שאלו אותי כל שאלה - אני כאן בשבילכם!

בהצלחה,
הממונה שלכם`
          })
      }

      // 7. Update org status to active
      setStatus('מסיימים...')
      setGenerationProgress(95)
      
      await supabase
        .from('organizations')
        .update({ status: 'active' })
        .eq('id', orgData.id)

      setGenerationProgress(100)
      setStatus('הושלם! מעבירים ללוח הבקרה...')
      
      setTimeout(() => {
        router.push('/dashboard?welcome=true')
      }, 1500)

    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'אירעה שגיאה בתהליך ההרשמה')
      setIsGenerating(false)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Generation in progress
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-50" />
              <div className="relative w-full h-full bg-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">מכינים את הכל בשבילכם</h2>
            <p className="text-gray-600 mb-6">{status}</p>
            <Progress value={generationProgress} className="h-3 mb-2" />
            <p className="text-sm text-gray-500">{generationProgress}%</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const StepIcon = STEPS[currentStep].icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">DPO-Pro</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{STEPS[currentStep].title}</span>
            <span>שלב {currentStep + 1} מתוך {STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-600 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <StepIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>{STEPS[currentStep].title}</CardTitle>
                <CardDescription>{STEPS[currentStep].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            הקודם
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === STEPS.length - 1 ? 'סיום והפקת מסמכים' : 'הבא'}
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  function renderStepContent() {
    switch (STEPS[currentStep].id) {
      case 'tier':
        return <TierStep formData={formData} updateFormData={updateFormData} />
      case 'account':
        return <AccountStep formData={formData} updateFormData={updateFormData} user={user} />
      case 'business':
        return <BusinessStep formData={formData} updateFormData={updateFormData} />
      case 'data':
        return <DataStep formData={formData} toggleArrayValue={toggleArrayValue} />
      case 'security':
        return <SecurityStep formData={formData} updateFormData={updateFormData} toggleArrayValue={toggleArrayValue} />
      case 'summary':
        return <SummaryStep formData={formData} />
      default:
        return null
    }
  }
}

// ============== STEP COMPONENTS ==============

function TierStep({ formData, updateFormData }: { formData: any, updateFormData: (field: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm mb-4">בחרו את החבילה המתאימה לעסק שלכם. ניתן לשדרג בכל עת.</p>
      
      <div className="grid gap-4">
        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            formData.tier === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
          }`}
          onClick={() => updateFormData('tier', 'basic')}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">חבילה בסיסית</h3>
              <p className="text-sm text-gray-500">לעסקים קטנים ובינוניים</p>
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold">₪500</span>
              <span className="text-gray-500 text-sm"> / חודש</span>
            </div>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />DPO ממונה מוסמך</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />מערכת AI מלאה</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />הפקת מסמכים אוטומטית</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />עד 2 פניות לממונה ברבעון</li>
          </ul>
        </div>

        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
            formData.tier === 'extended' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
          }`}
          onClick={() => updateFormData('tier', 'extended')}
        >
          <Badge className="absolute -top-2 right-4 bg-blue-600">מומלץ</Badge>
          <div className="flex justify-between items-start mb-2 mt-2">
            <div>
              <h3 className="font-bold text-lg">חבילה מורחבת</h3>
              <p className="text-sm text-gray-500">לעסקים עם מידע רגיש</p>
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold">₪1,200</span>
              <span className="text-gray-500 text-sm"> / חודש</span>
            </div>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />כל מה שבבסיסית</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />סקירה תקופתית של הממונה</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />זמינות מורחבת</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />עד 8 פניות לממונה ברבעון</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function AccountStep({ formData, updateFormData, user }: { formData: any, updateFormData: (field: string, value: any) => void, user: any }) {
  if (user) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-2">כבר מחוברים!</h3>
        <p className="text-gray-600">מחובר כ: {user.email}</p>
        <p className="text-sm text-gray-500 mt-2">לחצו "הבא" להמשך</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm mb-4">צרו חשבון כדי לשמור את ההתקדמות ולגשת למערכת</p>
      
      <div>
        <label className="block font-medium mb-1">שם מלא <span className="text-red-500">*</span></label>
        <Input
          value={formData.fullName}
          onChange={(e) => updateFormData('fullName', e.target.value)}
          placeholder="ישראל ישראלי"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">אימייל <span className="text-red-500">*</span></label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">סיסמה <span className="text-red-500">*</span></label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          placeholder="לפחות 6 תווים"
        />
        {formData.password && formData.password.length < 6 && (
          <p className="text-sm text-red-500 mt-1">הסיסמה חייבת להכיל לפחות 6 תווים</p>
        )}
      </div>

      <div>
        <label className="block font-medium mb-1">טלפון (אופציונלי)</label>
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => updateFormData('phone', e.target.value)}
          placeholder="050-1234567"
        />
      </div>

      <p className="text-xs text-gray-500">
        יש לכם כבר חשבון? <Link href="/login" className="text-blue-600 hover:underline">התחברו כאן</Link>
      </p>
    </div>
  )
}

function BusinessStep({ formData, updateFormData }: { formData: any, updateFormData: (field: string, value: any) => void }) {
  const businessTypes = [
    { value: 'retail', label: 'קמעונאות / מסחר' },
    { value: 'technology', label: 'טכנולוגיה / הייטק' },
    { value: 'healthcare', label: 'בריאות / רפואה' },
    { value: 'finance', label: 'פיננסים / ביטוח' },
    { value: 'education', label: 'חינוך / הדרכה' },
    { value: 'services', label: 'שירותים מקצועיים' },
    { value: 'manufacturing', label: 'ייצור / תעשייה' },
    { value: 'other', label: 'אחר' }
  ]

  const employeeCounts = [
    { value: '1-10', label: '1-10 עובדים' },
    { value: '11-50', label: '11-50 עובדים' },
    { value: '51-200', label: '51-200 עובדים' },
    { value: '200+', label: 'מעל 200 עובדים' }
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium mb-1">שם העסק <span className="text-red-500">*</span></label>
        <Input
          value={formData.businessName}
          onChange={(e) => updateFormData('businessName', e.target.value)}
          placeholder="שם החברה בע״מ"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">מספר ח.פ / עוסק מורשה <span className="text-red-500">*</span></label>
        <Input
          value={formData.businessId}
          onChange={(e) => updateFormData('businessId', e.target.value)}
          placeholder="9 ספרות"
          maxLength={9}
        />
      </div>

      <div>
        <label className="block font-medium mb-2">תחום פעילות <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {businessTypes.map(type => (
            <Button
              key={type.value}
              type="button"
              variant={formData.businessType === type.value ? 'default' : 'outline'}
              className="justify-start text-sm h-auto py-2"
              onClick={() => updateFormData('businessType', type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">מספר עובדים <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {employeeCounts.map(count => (
            <Button
              key={count.value}
              type="button"
              variant={formData.employeeCount === count.value ? 'default' : 'outline'}
              className="justify-start text-sm"
              onClick={() => updateFormData('employeeCount', count.value)}
            >
              {count.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DataStep({ formData, toggleArrayValue }: { formData: any, toggleArrayValue: (field: string, value: string) => void }) {
  const dataTypes = [
    { value: 'contact', label: 'פרטי קשר (שם, טלפון, אימייל)' },
    { value: 'id', label: 'מספר זהות / דרכון' },
    { value: 'financial', label: 'פרטי תשלום / פיננסיים' },
    { value: 'health', label: 'מידע רפואי / בריאותי' },
    { value: 'biometric', label: 'מידע ביומטרי' },
    { value: 'location', label: 'נתוני מיקום' },
    { value: 'behavioral', label: 'נתוני התנהגות / גלישה' },
    { value: 'employment', label: 'מידע תעסוקתי' }
  ]

  const dataSources = [
    { value: 'direct', label: 'ישירות מלקוחות' },
    { value: 'website', label: 'אתר / אפליקציה' },
    { value: 'third_party', label: 'צדדים שלישיים' },
    { value: 'public', label: 'מקורות ציבוריים' },
    { value: 'employees', label: 'עובדים' }
  ]

  const purposes = [
    { value: 'service', label: 'מתן שירות' },
    { value: 'marketing', label: 'שיווק ופרסום' },
    { value: 'analytics', label: 'אנליטיקס' },
    { value: 'legal', label: 'דרישות חוק' },
    { value: 'hr', label: 'משאבי אנוש' },
    { value: 'security', label: 'אבטחה' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2">אילו סוגי מידע אתם אוספים? <span className="text-red-500">*</span></label>
        <p className="text-sm text-gray-500 mb-2">ניתן לבחור מספר אפשרויות</p>
        <div className="grid grid-cols-2 gap-2">
          {dataTypes.map(type => (
            <Button
              key={type.value}
              type="button"
              variant={formData.dataTypes.includes(type.value) ? 'default' : 'outline'}
              className="justify-start text-sm h-auto py-2"
              onClick={() => toggleArrayValue('dataTypes', type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">מאיפה מגיע המידע? <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {dataSources.map(source => (
            <Button
              key={source.value}
              type="button"
              variant={formData.dataSources.includes(source.value) ? 'default' : 'outline'}
              className="justify-start text-sm"
              onClick={() => toggleArrayValue('dataSources', source.value)}
            >
              {source.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">למה משמש המידע? <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {purposes.map(purpose => (
            <Button
              key={purpose.value}
              type="button"
              variant={formData.processingPurposes.includes(purpose.value) ? 'default' : 'outline'}
              className="justify-start text-sm"
              onClick={() => toggleArrayValue('processingPurposes', purpose.value)}
            >
              {purpose.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SecurityStep({ formData, updateFormData, toggleArrayValue }: { formData: any, updateFormData: (field: string, value: any) => void, toggleArrayValue: (field: string, value: string) => void }) {
  const securityMeasures = [
    { value: 'encryption', label: 'הצפנת מידע' },
    { value: 'access_control', label: 'בקרת גישה' },
    { value: 'backup', label: 'גיבויים' },
    { value: 'firewall', label: 'חומת אש' },
    { value: 'antivirus', label: 'אנטי-וירוס' },
    { value: 'training', label: 'הדרכות עובדים' }
  ]

  const cloudOptions = [
    { value: 'none', label: 'לא משתמשים' },
    { value: 'israeli', label: 'ספק ישראלי' },
    { value: 'international', label: 'ספק בינלאומי' },
    { value: 'both', label: 'שניהם' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2">אמצעי אבטחה קיימים <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {securityMeasures.map(measure => (
            <Button
              key={measure.value}
              type="button"
              variant={formData.securityMeasures.includes(measure.value) ? 'default' : 'outline'}
              className="justify-start text-sm"
              onClick={() => toggleArrayValue('securityMeasures', measure.value)}
            >
              {measure.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">משתפים מידע עם גורמים חיצוניים? <span className="text-red-500">*</span></label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={formData.thirdPartySharing === true ? 'default' : 'outline'}
            onClick={() => updateFormData('thirdPartySharing', true)}
          >
            כן
          </Button>
          <Button
            type="button"
            variant={formData.thirdPartySharing === false ? 'default' : 'outline'}
            onClick={() => updateFormData('thirdPartySharing', false)}
          >
            לא
          </Button>
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">מידע מועבר/מאוחסן מחוץ לישראל? <span className="text-red-500">*</span></label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={formData.internationalTransfer === true ? 'default' : 'outline'}
            onClick={() => updateFormData('internationalTransfer', true)}
          >
            כן
          </Button>
          <Button
            type="button"
            variant={formData.internationalTransfer === false ? 'default' : 'outline'}
            onClick={() => updateFormData('internationalTransfer', false)}
          >
            לא
          </Button>
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">שירותי ענן <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {cloudOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={formData.cloudStorage === option.value ? 'default' : 'outline'}
              className="justify-start text-sm"
              onClick={() => updateFormData('cloudStorage', option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium mb-2">קיימת מדיניות פרטיות כתובה? <span className="text-red-500">*</span></label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={formData.existingPolicy === true ? 'default' : 'outline'}
            onClick={() => updateFormData('existingPolicy', true)}
          >
            כן
          </Button>
          <Button
            type="button"
            variant={formData.existingPolicy === false ? 'default' : 'outline'}
            onClick={() => updateFormData('existingPolicy', false)}
          >
            לא
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryStep({ formData }: { formData: any }) {
  const tierLabels = { basic: 'חבילה בסיסית - ₪500/חודש', extended: 'חבילה מורחבת - ₪1,200/חודש' }
  const businessTypeLabels: Record<string, string> = {
    retail: 'קמעונאות / מסחר', technology: 'טכנולוגיה / הייטק', healthcare: 'בריאות / רפואה',
    finance: 'פיננסים / ביטוח', education: 'חינוך / הדרכה', services: 'שירותים מקצועיים',
    manufacturing: 'ייצור / תעשייה', other: 'אחר'
  }

  const hasSensitiveData = formData.dataTypes.some((d: string) => ['health', 'financial', 'biometric', 'id'].includes(d))

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          {tierLabels[formData.tier as keyof typeof tierLabels]}
        </h3>
        <p className="text-sm text-gray-600">14 ימי ניסיון חינם, ללא התחייבות</p>
      </div>

      <div className="space-y-4">
        <div className="border-b pb-3">
          <h4 className="font-medium text-gray-500 text-sm mb-1">פרטי העסק</h4>
          <p className="font-bold">{formData.businessName}</p>
          <p className="text-sm text-gray-600">ח.פ: {formData.businessId}</p>
          <p className="text-sm text-gray-600">{businessTypeLabels[formData.businessType]} • {formData.employeeCount} עובדים</p>
        </div>

        <div className="border-b pb-3">
          <h4 className="font-medium text-gray-500 text-sm mb-1">סוגי מידע</h4>
          <div className="flex flex-wrap gap-1">
            {formData.dataTypes.map((type: string) => (
              <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
            ))}
          </div>
          {hasSensitiveData && (
            <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              מידע רגיש - נדרשת הקפדה מיוחדת
            </p>
          )}
        </div>

        <div>
          <h4 className="font-medium text-gray-500 text-sm mb-1">אבטחה</h4>
          <div className="flex flex-wrap gap-1">
            {formData.securityMeasures.map((measure: string) => (
              <Badge key={measure} variant="outline" className="text-xs">{measure}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5" />
          מה יקרה עכשיו?
        </h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ ניצור 3 מסמכים מותאמים אישית</li>
          <li>✓ נקצה לכם ממונה הגנת פרטיות מוסמך</li>
          <li>✓ תקבלו גישה מלאה למערכת</li>
          <li>✓ הבוט החכם יהיה זמין 24/7</li>
        </ul>
      </div>
    </div>
  )
}

// ============== MAIN EXPORT ==============
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
