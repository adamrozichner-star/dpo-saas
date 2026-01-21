'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  Building2, 
  Database, 
  Eye, 
  Heart,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react'

interface CalculatorQuestion {
  id: string
  text: string
  helpText: string
  icon: React.ReactNode
  yesImplication: 'required' | 'likely' | 'factor'
}

const questions: CalculatorQuestion[] = [
  {
    id: 'public_body',
    text: 'האם הארגון שלכם הוא גוף ציבורי?',
    helpText: 'משרד ממשלתי, רשות מקומית, תאגיד סטטוטורי, או גוף הממומן מתקציב המדינה',
    icon: <Building2 className="h-6 w-6" />,
    yesImplication: 'required'
  },
  {
    id: 'data_trading',
    text: 'האם אתם עוסקים במסחר במידע או בדיוור ישיר?',
    helpText: 'מכירת מאגרי מידע, שירותי דיוור ישיר, או העברת מידע אישי תמורת תשלום',
    icon: <Database className="h-6 w-6" />,
    yesImplication: 'likely'
  },
  {
    id: 'large_database',
    text: 'האם יש לכם מאגר עם יותר מ-10,000 רשומות?',
    helpText: 'מאגר לקוחות, משתמשים, או כל מאגר מידע אישי עם למעלה מ-10,000 אנשים',
    icon: <Database className="h-6 w-6" />,
    yesImplication: 'factor'
  },
  {
    id: 'systematic_monitoring',
    text: 'האם אתם מבצעים ניטור שיטתי של אנשים?',
    helpText: 'מצלמות אבטחה, מעקב GPS, ניטור התנהגות באתר/אפליקציה, או מעקב אחר עובדים',
    icon: <Eye className="h-6 w-6" />,
    yesImplication: 'likely'
  },
  {
    id: 'sensitive_data',
    text: 'האם אתם מעבדים מידע רגיש?',
    helpText: 'מידע רפואי, ביומטרי, פיננסי מפורט, דתי, מיני, פלילי, או מידע על קטינים',
    icon: <Heart className="h-6 w-6" />,
    yesImplication: 'likely'
  }
]

interface CalculatorResult {
  required: boolean
  riskLevel: 'high' | 'medium' | 'low'
  reasons: string[]
  penaltyExposure: string
}

function calculateResult(answers: Record<string, boolean>): CalculatorResult {
  const reasons: string[] = []
  let riskScore = 0

  // Public body = automatic requirement
  if (answers.public_body) {
    reasons.push('גוף ציבורי מחויב במינוי ממונה על פי החוק')
    riskScore += 100
  }

  // Data trading + large database = requirement
  if (answers.data_trading && answers.large_database) {
    reasons.push('עיסוק במסחר במידע עם מאגר גדול מחייב מינוי ממונה')
    riskScore += 100
  } else if (answers.data_trading) {
    reasons.push('עיסוק במסחר במידע מעלה את הסיכון')
    riskScore += 40
  }

  // Large database alone
  if (answers.large_database && !answers.data_trading) {
    reasons.push('מאגר מידע גדול (מעל 10,000) דורש תשומת לב מוגברת')
    riskScore += 30
  }

  // Systematic monitoring
  if (answers.systematic_monitoring) {
    reasons.push('ניטור שיטתי של אנשים מחייב פיקוח על הגנת פרטיות')
    riskScore += 50
  }

  // Sensitive data
  if (answers.sensitive_data) {
    reasons.push('עיבוד מידע רגיש מחייב רמת הגנה גבוהה')
    riskScore += 50
  }

  // Determine if required
  const required = riskScore >= 100

  // Determine risk level
  let riskLevel: 'high' | 'medium' | 'low'
  if (riskScore >= 80) {
    riskLevel = 'high'
  } else if (riskScore >= 40) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  // Calculate penalty exposure - show maximum for impact
  // תיקון 13 allows fines up to ₪3.2M for corporations
  let penaltyExposure: string
  if (answers.large_database || answers.sensitive_data) {
    // Large database or sensitive data - highest exposure
    penaltyExposure = 'עד ₪3,200,000'
  } else if (required) {
    // Required but standard - medium exposure
    penaltyExposure = 'עד ₪1,000,000'
  } else if (reasons.length > 0) {
    // Some risk factors present
    penaltyExposure = 'עד ₪500,000'
  } else {
    // Low risk
    penaltyExposure = 'עד ₪100,000'
  }

  // Add default reason if none
  if (reasons.length === 0) {
    reasons.push('רמת סיכון נמוכה, אך מומלץ לשקול מינוי ממונה לצורך עמידה ברגולציה')
  }

  return { required, riskLevel, reasons, penaltyExposure }
}

interface DpoCalculatorProps {
  onComplete?: (result: CalculatorResult, answers: Record<string, boolean>) => void
  showResultInline?: boolean
  compact?: boolean
}

export default function DpoCalculator({ 
  onComplete, 
  showResultInline = true,
  compact = false 
}: DpoCalculatorProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [showResult, setShowResult] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const question = questions[currentQuestion]

  const handleAnswer = (answer: boolean) => {
    const newAnswers = { ...answers, [question.id]: answer }
    setAnswers(newAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Calculate result
      setIsCalculating(true)
      setTimeout(() => {
        setIsCalculating(false)
        setShowResult(true)
        if (onComplete) {
          onComplete(calculateResult(newAnswers), newAnswers)
        }
      }, 800)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleReset = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setShowResult(false)
  }

  const result = showResult ? calculateResult(answers) : null

  if (isCalculating) {
    return (
      <Card className={compact ? '' : 'max-w-xl mx-auto'}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-bold mb-2">מחשבים את התוצאה...</h3>
          <p className="text-gray-600">בודקים את החשיפה שלכם לתיקון 13</p>
        </CardContent>
      </Card>
    )
  }

  if (showResult && result && showResultInline) {
    return (
      <Card className={compact ? '' : 'max-w-xl mx-auto'}>
        <CardContent className="py-8">
          {/* Result Header */}
          <div className="text-center mb-6">
            {result.required ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <Badge variant="destructive" className="text-lg px-4 py-1 mb-2">
                  חובה למנות DPO
                </Badge>
                <h3 className="text-2xl font-bold text-red-700">
                  הארגון שלכם חייב בממונה הגנת פרטיות
                </h3>
              </>
            ) : result.riskLevel === 'high' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <Badge className="bg-orange-500 text-lg px-4 py-1 mb-2">
                  מומלץ מאוד
                </Badge>
                <h3 className="text-2xl font-bold text-orange-700">
                  מומלץ מאוד למנות ממונה הגנת פרטיות
                </h3>
              </>
            ) : result.riskLevel === 'medium' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
                <Badge className="bg-yellow-500 text-lg px-4 py-1 mb-2">
                  מומלץ
                </Badge>
                <h3 className="text-2xl font-bold text-yellow-700">
                  מומלץ לשקול מינוי ממונה הגנת פרטיות
                </h3>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <Badge className="bg-green-500 text-lg px-4 py-1 mb-2">
                  סיכון נמוך
                </Badge>
                <h3 className="text-2xl font-bold text-green-700">
                  אינכם חייבים בממונה, אך כדאי לשקול
                </h3>
              </>
            )}
          </div>

          {/* Risk Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-2">למה?</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {result.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Penalty Exposure */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-800">חשיפה לקנסות</h4>
            </div>
            <p className="text-2xl font-bold text-red-700">{result.penaltyExposure}</p>
            <p className="text-sm text-red-600 mt-1">
              על פי תיקון 13 לחוק הגנת הפרטיות (אוגוסט 2025)
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Link href="/onboarding">
              <Button size="lg" className="w-full">
                התחילו עכשיו - רק ₪500/חודש
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full" onClick={handleReset}>
              בדיקה מחדש
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? '' : 'max-w-xl mx-auto'}>
      <CardContent className="py-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>שאלה {currentQuestion + 1} מתוך {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
            {question.icon}
          </div>
          <h3 className="text-xl font-bold mb-2">{question.text}</h3>
          <p className="text-gray-600 text-sm">{question.helpText}</p>
        </div>

        {/* Answer Buttons */}
        <div className="flex gap-4 mb-4">
          <Button 
            size="lg" 
            className="flex-1 h-14 text-lg"
            onClick={() => handleAnswer(true)}
          >
            כן
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="flex-1 h-14 text-lg"
            onClick={() => handleAnswer(false)}
          >
            לא
          </Button>
        </div>

        {/* Back Button */}
        {currentQuestion > 0 && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={handleBack}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            חזרה לשאלה הקודמת
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
