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
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { onboardingSteps } from '@/lib/mock-data'
import { OnboardingQuestion, OnboardingAnswer } from '@/types'

const stepIcons = [Building2, Database, Share2, Lock, FileCheck]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { 
    onboardingStep, 
    onboardingAnswers,
    setOnboardingAnswer,
    nextOnboardingStep,
    prevOnboardingStep,
    selectTier,
    completeOnboarding,
    subscription
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(false)
  const [showTierSelection, setShowTierSelection] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Check for tier in URL
  useEffect(() => {
    const tier = searchParams.get('tier')
    if (tier === 'basic' || tier === 'extended') {
      selectTier(tier)
      setShowTierSelection(false)
    }
  }, [searchParams, selectTier])

  const currentStepData = onboardingSteps[onboardingStep]
  const totalSteps = onboardingSteps.length
  const progress = ((onboardingStep + 1) / totalSteps) * 100

  const getAnswer = (questionId: string) => {
    return onboardingAnswers.find(a => a.questionId === questionId)?.value
  }

  const handleAnswer = (questionId: string, value: string | string[] | boolean | number) => {
    setOnboardingAnswer({ questionId, value })
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
    if (onboardingStep < totalSteps - 1) {
      nextOnboardingStep()
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setIsGenerating(true)
    try {
      await completeOnboarding()
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsGenerating(false)
    }
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
              className={`cursor-pointer transition-all hover:shadow-lg ${subscription?.tier === 'basic' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => selectTier('basic')}
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
                    ממונה הגנת פרטיות מוסמך
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    מסמכים אוטומטיים
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    בוט Q&A לעובדים
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    עד 2 פניות ברבעון
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg border-primary ${subscription?.tier === 'extended' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => selectTier('extended')}
            >
              <div className="absolute -top-3 right-4">
                <Badge>מומלץ</Badge>
              </div>
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
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
                    ליווי באירועי אבטחה
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    עד 8 פניות ברבעון
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Button 
              size="lg" 
              onClick={() => setShowTierSelection(false)}
              disabled={!subscription}
            >
              המשך להרשמה
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Generating Documents Screen
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">מייצרים את המסמכים שלכם</h2>
          <p className="text-gray-600 mb-4">
            המערכת מנתחת את הפרטים ומייצרת מסמכי פרטיות מותאמים אישית...
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✓ מדיניות פרטיות</p>
            <p>✓ רישום מאגרי מידע</p>
            <p>✓ נהלי אבטחת מידע</p>
          </div>
        </Card>
      </div>
    )
  }

  // Main Onboarding Steps
  const StepIcon = stepIcons[onboardingStep] || Building2

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">DPO-Pro</span>
          </Link>
          <Badge variant="outline">
            {subscription?.tier === 'extended' ? 'חבילה מורחבת' : 'חבילה בסיסית'}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>שלב {onboardingStep + 1} מתוך {totalSteps}</span>
            <span>{Math.round(progress)}% הושלם</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {onboardingSteps.map((step, index) => {
            const Icon = stepIcons[index]
            const isActive = index === onboardingStep
            const isComplete = index < onboardingStep
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors
                  ${isActive ? 'bg-primary text-white' : ''}
                  ${isComplete ? 'bg-green-500 text-white' : ''}
                  ${!isActive && !isComplete ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Current Step Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StepIcon className="h-5 w-5 text-primary" />
              {currentStepData?.title}
            </CardTitle>
            <CardDescription>
              ענו על השאלות הבאות כדי שנוכל להתאים את המסמכים לעסק שלכם
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStepData?.questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={getAnswer(question.id)}
                onChange={(value) => handleAnswer(question.id, value)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevOnboardingStep}
            disabled={onboardingStep === 0}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            הקודם
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {onboardingStep === totalSteps - 1 ? 'סיום והפקת מסמכים' : 'הבא'}
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface QuestionFieldProps {
  question: OnboardingQuestion
  value: string | string[] | boolean | number | undefined
  onChange: (value: string | string[] | boolean | number) => void
}

function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  switch (question.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.text}
            {question.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.helpText}
          />
        </div>
      )

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.text}
            {question.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder={question.helpText}
          />
        </div>
      )

    case 'single_choice':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.text}
            {question.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {question.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`
                  p-3 rounded-lg border text-sm text-right transition-all
                  ${value === option.value 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
          {question.helpText && (
            <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
          )}
        </div>
      )

    case 'multi_choice':
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.text}
            {question.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {question.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter(v => v !== option.value))
                    } else {
                      onChange([...selectedValues, option.value])
                    }
                  }}
                  className={`
                    p-3 rounded-lg border text-sm text-right transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <span className={`
                      w-4 h-4 rounded border flex items-center justify-center
                      ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}
                    `}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </span>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
          {question.helpText && (
            <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
          )}
        </div>
      )

    case 'boolean':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.text}
            {question.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`
                flex-1 p-3 rounded-lg border text-sm transition-all
                ${value === true 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`
                flex-1 p-3 rounded-lg border text-sm transition-all
                ${value === false 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              לא
            </button>
          </div>
          {question.helpText && (
            <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
          )}
        </div>
      )

    default:
      return null
  }
}

// Loading fallback for Suspense
function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

// Main export with Suspense boundary
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  )
}
