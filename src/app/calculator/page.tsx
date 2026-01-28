'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Mail,
  FileText,
  Loader2,
  Clock
} from 'lucide-react'
import DpoCalculator from '@/components/DpoCalculator'

interface CalculatorResult {
  required: boolean
  riskLevel: 'high' | 'medium' | 'low'
  reasons: string[]
  penaltyExposure: string
}

export default function CalculatorPage() {
  const [result, setResult] = useState<CalculatorResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)

  const handleCalculatorComplete = (calcResult: CalculatorResult, calcAnswers: Record<string, boolean>) => {
    setResult(calcResult)
    setAnswers(calcAnswers)
    setShowEmailCapture(true)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    
    try {
      // Send to email API
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'calculator_lead',
          to: email,
          data: {
            result,
            answers,
            timestamp: new Date().toISOString()
          }
        })
      })
      setEmailSubmitted(true)
    } catch (error) {
      console.error('Error submitting email:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl" style={{color: '#1e40af'}}>MyDPO</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">התחברות</Button>
              </Link>
              <Link href="/onboarding">
                <Button className="text-white" style={{backgroundColor: '#10b981'}}>התחל עכשיו</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            בדיקה חינמית • 30 שניות
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            האם העסק שלכם חייב בממונה הגנת פרטיות?
          </h1>
          <p className="text-gray-600 text-lg">
            ענו על 5 שאלות פשוטות וגלו אם אתם חשופים לקנסות על פי תיקון 13
          </p>
        </div>

        {/* Urgency Banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Clock className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">האכיפה כבר התחילה</p>
            <p className="text-sm text-red-600">תיקון 13 נכנס לתוקף באוגוסט 2025. קנסות של אלפי שקלים לכל הפרה.</p>
          </div>
        </div>

        {/* Calculator or Results */}
        {!showEmailCapture ? (
          <DpoCalculator 
            onComplete={handleCalculatorComplete}
            showResultInline={false}
          />
        ) : (
          <div className="space-y-6">
            {/* Result Card */}
            <Card>
              <CardContent className="py-8">
                {/* Result Header */}
                <div className="text-center mb-6">
                  {result?.required ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                      </div>
                      <Badge variant="destructive" className="text-lg px-4 py-1 mb-2">
                        חובה למנות DPO
                      </Badge>
                      <h2 className="text-2xl font-bold text-red-700">
                        הארגון שלכם חייב בממונה הגנת פרטיות
                      </h2>
                    </>
                  ) : result?.riskLevel === 'high' ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-10 w-10 text-orange-600" />
                      </div>
                      <Badge className="bg-orange-500 text-lg px-4 py-1 mb-2">
                        מומלץ מאוד
                      </Badge>
                      <h2 className="text-2xl font-bold text-orange-700">
                        מומלץ מאוד למנות ממונה הגנת פרטיות
                      </h2>
                    </>
                  ) : result?.riskLevel === 'medium' ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-10 w-10 text-yellow-600" />
                      </div>
                      <Badge className="bg-yellow-500 text-lg px-4 py-1 mb-2">
                        מומלץ
                      </Badge>
                      <h2 className="text-2xl font-bold text-yellow-700">
                        מומלץ לשקול מינוי ממונה
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                      </div>
                      <Badge className="bg-green-500 text-lg px-4 py-1 mb-2">
                        סיכון נמוך
                      </Badge>
                      <h2 className="text-2xl font-bold text-green-700">
                        אינכם חייבים בממונה כרגע
                      </h2>
                    </>
                  )}
                </div>

                {/* Reasons */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-2">הסיבות:</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {result?.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Penalty - Only show if DPO is required */}
                {result?.required && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="font-semibold text-red-800">חשיפה פוטנציאלית לקנסות</h4>
                    </div>
                    <p className="text-3xl font-bold text-red-700">{result?.penaltyExposure}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Capture Card */}
            <Card className="border-primary">
              <CardContent className="py-6">
                {!emailSubmitted ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold">קבלו דוח מפורט בחינם</h3>
                        <p className="text-sm text-gray-600">
                          כולל המלצות ספציפיות לעסק שלכם
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="הזינו אימייל..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                        required
                        dir="ltr"
                      />
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="h-4 w-4 ml-2" />
                            שליחה
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h3 className="font-bold text-green-700">הדוח נשלח!</h3>
                    <p className="text-sm text-gray-600">בדקו את תיבת האימייל שלכם</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                רוצים לפתור את זה עכשיו?
              </p>
              <Link href="/onboarding">
                <Button size="lg" className="text-lg px-8">
                  מינוי DPO + מערכת מלאה ב-₪500/חודש
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-gray-500">
                14 ימי ניסיון חינם • ללא התחייבות
              </p>
            </div>

            {/* Back to calculator */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowEmailCapture(false)
                  setResult(null)
                  setAnswers({})
                  setEmailSubmitted(false)
                  setEmail('')
                }}
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                בדיקה מחדש
              </Button>
            </div>
          </div>
        )}

        {/* Trust Elements */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
            <div>
              <div className="text-2xl font-bold text-primary mb-1">500+</div>
              <div>עסקים משתמשים</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-1">15 דק׳</div>
              <div>זמן הקמה</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-1">₪500</div>
              <div>לחודש בלבד</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <p>© 2026 MyDPO. כל הזכויות שמורות.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="/terms" className="hover:text-gray-700">תנאי שימוש</Link>
          <Link href="/privacy" className="hover:text-gray-700">מדיניות פרטיות</Link>
        </div>
      </footer>
    </div>
  )
}
