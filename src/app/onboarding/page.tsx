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
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { onboardingSteps } from '@/lib/mock-data'
import { OnboardingQuestion, OnboardingAnswer } from '@/types'

const stepIcons = [Building2, Database, Share2, Lock, FileCheck]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([])
  const [selectedTier, setSelectedTier] = useState<'basic' | 'extended' | null>(null)
  const [showTierSelection, setShowTierSelection] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Check for tier in URL
  useEffect(() => {
    const tier = searchParams.get('tier')
    if (tier === 'basic' || tier === 'extended') {
      setSelectedTier(tier)
      setShowTierSelection(false)
    }
  }, [searchParams])

  const currentStepData = onboardingSteps[currentStep]
  const totalSteps = onboardingSteps.length
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

  const canProceed = () => {
    if (!currentStepData) return false
    return currentStepData.questions.every(q => {
      if (!q.required) return true
      const answer = getAnswer(q.id)
      if (Array.isArray(answer)) return answer.length > 0
      return answer !== undefined && answer !== ''
    })
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
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
      setError('לא מחובר למערכת')
      return
    }

    setIsGenerating(true)
    setError(null)
    setStatus('יוצרים את הארגון שלכם...')

    try {
      // Get business name from answers
      const businessNameAnswer = answers.find(a => a.questionId === 'business_name')
      const businessIdAnswer = answers.find(a => a.questionId === 'business_id')
      
      const businessName = businessNameAnswer?.value as string || 'עסק חדש'
      const businessId = businessIdAnswer?.value as string || ''

      console.log('Creating organization:', { businessName, businessId, tier: selectedTier })

      // 1. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: businessName,
          business_id: businessId,
          subscription_tier: selectedTier || 'basic',
          status: 'active'
        })
        .select()
        .single()

      if (orgError) {
        console.error('Org creation error:', orgError)
        throw new Error('שגיאה ביצירת הארגון: ' + orgError.message)
      }

      console.log('Organization created:', orgData)
      setStatus('מעדכנים את פרטי המשתמש...')

      // 2. Update user with org_id
      const { error: userError } = await supabase
        .from('users')
        .update({ org_id: orgData.id })
        .eq('auth_user_id', user.id)

      if (userError) {
        console.error('User update error:', userError)
        // Don't throw - organization was created
      }

      // 3. Save organization profile
      setStatus('שומרים את פרופיל הארגון...')
      const { error: profileError } = await supabase
        .from('organization_profiles')
        .insert({
          org_id: orgData.id,
          profile_data: { answers, completedAt: new Date().toISOString() }
        })

      if (profileError) {
        console.error('Profile save error:', profileError)
        // Don't throw - organization was created
      }

      // 4. Generate documents
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
          console.log('Documents generated successfully')
        } else {
          console.log('Document generation returned non-ok status, continuing anyway')
        }
      } catch (docError) {
        console.log('Document generation failed, continuing anyway:', docError)
      }

      setStatus('הושלם! מעבירים ללוח הבקרה...')
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)

    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'אירעה שגיאה בתהליך ההרשמה')
      setIsGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Generating screen
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">מייצרים את המסמכים שלכם</h2>
            <p className="text-gray-600 mb-4">{status}</p>
            <Progress value={66} className="h-2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tier Selection Screen
  if (showTierSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            חזרה לדף הבית
          </Link>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">DPO-Pro</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">בחרו את החבילה שלכם</h1>
            <p className="text-gray-600">התחילו עם 14 ימי ניסיון חינם</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedTier === 'basic' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedTier('basic')}
            >
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    DPO ממונה מוסמך
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    מערכת AI מלאה
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    הפקת מסמכים אוטומטית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Q&A חכם לעובדים
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedTier === 'extended' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedTier('extended')}
            >
              <CardHeader>
                <Badge className="w-fit mb-2">מומלץ</Badge>
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    כל מה שבחבילה הבסיסית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    סקירה תקופתית
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    זמינות DPO מוגברת
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ליווי DPIA
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button 
              size="lg" 
              onClick={() => setShowTierSelection(false)}
              disabled={!selectedTier}
            >
              המשך להגדרת הארגון
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Questions Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
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
            <span>שלב {currentStep + 1} מתוך {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Current Step */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {stepIcons[currentStep] && (() => {
                const Icon = stepIcons[currentStep]
                return <Icon className="h-6 w-6 text-primary" />
              })()}
              <div>
                <CardTitle>{currentStepData?.title}</CardTitle>
                <CardDescription>מלאו את הפרטים הבאים</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStepData?.questions.map((question: OnboardingQuestion) => (
  <div key={question.id} className="space-y-2">
    <label className="block font-medium">
      {question.text}
      {question.required && <span className="text-red-500 mr-1">*</span>}
    </label>
    
    {question.type === 'text' && (
      <Input
        value={(getAnswer(question.id) as string) || ''}
        onChange={(e) => handleAnswer(question.id, e.target.value)}
      />
    )}

    {(question.type === 'single_choice' || question.type === 'multi_choice') && (
      <div className="grid grid-cols-2 gap-2">
        {question.options?.map((option) => (
          <Button
            key={option.value}
            variant={getAnswer(question.id) === option.value ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => handleAnswer(question.id, option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    )}

    {question.type === 'number' && (
      <Input
        type="number"
        value={(getAnswer(question.id) as number) || ''}
        onChange={(e) => handleAnswer(question.id, parseInt(e.target.value) || 0)}
      />
    )}

    {question.type === 'boolean' && (
      <div className="flex gap-4">
        <Button
          variant={getAnswer(question.id) === true ? 'default' : 'outline'}
          onClick={() => handleAnswer(question.id, true)}
        >
          כן
        </Button>
        <Button
          variant={getAnswer(question.id) === false ? 'default' : 'outline'}
          onClick={() => handleAnswer(question.id, false)}
        >
          לא
        </Button>
      </div>
    )}
  </div>
))}
                {question.type === 'number' && (
                  <Input
                    type="number"
                    value={(getAnswer(question.id) as number) || ''}
                    onChange={(e) => handleAnswer(question.id, parseInt(e.target.value) || 0)}
                    placeholder={question.placeholder}
                  />
                )}

                {question.type === 'boolean' && (
                  <div className="flex gap-4">
                    <Button
                      variant={getAnswer(question.id) === true ? 'default' : 'outline'}
                      onClick={() => handleAnswer(question.id, true)}
                    >
                      כן
                    </Button>
                    <Button
                      variant={getAnswer(question.id) === false ? 'default' : 'outline'}
                      onClick={() => handleAnswer(question.id, false)}
                    >
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
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            הקודם
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === totalSteps - 1 ? 'סיום והפקת מסמכים' : 'הבא'}
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>
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
