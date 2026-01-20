'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft,
  Building2,
  Users,
  Lock,
  Zap,
  AlertTriangle,
  Database,
  Mail,
  Check
} from 'lucide-react'

// Inline Calculator Questions (4 quick questions)
const checkQuestions = [
  {
    id: 'employees',
    question: 'כמה עובדים יש בעסק?',
    options: [
      { value: '1-10', label: '1-10 עובדים', points: 0 },
      { value: '11-50', label: '11-50 עובדים', points: 5 },
      { value: '51-250', label: '51-250 עובדים', points: 10 },
      { value: '250+', label: 'מעל 250 עובדים', points: 15 },
    ]
  },
  {
    id: 'data_type',
    question: 'איזה סוג מידע אתם מנהלים?',
    options: [
      { value: 'basic', label: 'פרטי קשר בסיסיים בלבד', points: 0 },
      { value: 'financial', label: 'מידע פיננסי / תשלומים', points: 20 },
      { value: 'health', label: 'מידע רפואי / בריאותי', points: 30 },
      { value: 'sensitive', label: 'מידע רגיש אחר (ביומטרי, פלילי)', points: 30 },
    ]
  },
  {
    id: 'records',
    question: 'כמה רשומות של אנשים יש במאגרים?',
    options: [
      { value: 'under_1k', label: 'פחות מ-1,000', points: 0 },
      { value: '1k-10k', label: '1,000 - 10,000', points: 10 },
      { value: '10k-50k', label: '10,000 - 50,000', points: 25 },
      { value: '50k+', label: 'מעל 50,000', points: 35 },
    ]
  },
  {
    id: 'org_type',
    question: 'מהו סוג הארגון?',
    options: [
      { value: 'private', label: 'חברה פרטית', points: 0 },
      { value: 'public_supplier', label: 'ספק לגוף ציבורי', points: 20 },
      { value: 'public', label: 'גוף ציבורי / ממשלתי', points: 100 },
      { value: 'health', label: 'מוסד בריאות / קופ"ח', points: 100 },
    ]
  },
]

type CheckResult = 'required' | 'likely' | 'recommended' | 'not_required'

function calculateCheckResult(answers: Record<string, string>): { type: CheckResult; score: number } {
  let score = 0
  
  checkQuestions.forEach(q => {
    const answer = answers[q.id]
    const option = q.options.find(o => o.value === answer)
    if (option) score += option.points
  })

  if (answers.org_type === 'public' || answers.org_type === 'health') {
    return { type: 'required', score: 100 }
  }

  if (score >= 50) return { type: 'required', score }
  if (score >= 30) return { type: 'likely', score }
  if (score >= 15) return { type: 'recommended', score }
  return { type: 'not_required', score }
}

// Superhero SVG Component with animated warnings
function SuperheroIllustration() {
  const [warningIndex, setWarningIndex] = useState(0)
  const warnings = ['דליפת מידע', 'פריצה', 'קנס', 'תביעה', 'ביקורת']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setWarningIndex(prev => (prev + 1) % warnings.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <svg viewBox="0 0 400 500" className="w-full h-auto max-w-md">
      {/* Background glow */}
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      
      {/* Glow effect */}
      <ellipse cx="200" cy="300" rx="180" ry="200" fill="url(#glow)" />
      
      {/* Floating icons - Documents */}
      <g transform="translate(280, 80)">
        <rect x="0" y="0" width="70" height="80" rx="12" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
        <rect x="15" y="20" width="40" height="4" rx="2" fill="#E5E7EB" />
        <rect x="15" y="30" width="30" height="4" rx="2" fill="#E5E7EB" />
        <rect x="15" y="40" width="35" height="4" rx="2" fill="#E5E7EB" />
        <circle cx="35" cy="60" r="10" fill="#3B82F6" opacity="0.2" />
        <path d="M30 60 L33 63 L40 56" stroke="#3B82F6" strokeWidth="2" fill="none" />
        <text x="35" y="12" textAnchor="middle" fontSize="8" fill="#6B7280">מסמכים</text>
      </g>
      
      {/* Floating icons - Database */}
      <g transform="translate(220, 160)">
        <rect x="0" y="0" width="70" height="70" rx="12" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
        <ellipse cx="35" cy="28" rx="20" ry="8" fill="#3B82F6" />
        <path d="M15 28 L15 45 Q35 55 55 45 L55 28" fill="none" stroke="#3B82F6" strokeWidth="2" />
        <ellipse cx="35" cy="45" rx="20" ry="8" fill="none" stroke="#3B82F6" strokeWidth="2" />
        <text x="35" y="62" textAnchor="middle" fontSize="8" fill="#6B7280">מאגרי מידע</text>
      </g>
      
      {/* Floating icons - Users/Customers */}
      <g transform="translate(260, 280)">
        <rect x="0" y="0" width="70" height="70" rx="12" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
        <circle cx="25" cy="28" r="10" fill="#3B82F6" opacity="0.3" />
        <circle cx="45" cy="28" r="10" fill="#3B82F6" opacity="0.5" />
        <circle cx="35" cy="40" r="12" fill="#3B82F6" />
        <circle cx="35" cy="35" r="5" fill="white" />
        <text x="35" y="62" textAnchor="middle" fontSize="8" fill="#6B7280">נתוני לקוחות</text>
      </g>
      
      {/* Superhero body */}
      <g transform="translate(80, 200)">
        {/* Cape */}
        <path d="M60 80 Q30 150 50 220 L90 220 Q110 150 80 80" fill="#1D4ED8" />
        
        {/* Legs */}
        <rect x="55" y="180" width="25" height="80" rx="10" fill="url(#bodyGradient)" />
        <rect x="85" y="180" width="25" height="80" rx="10" fill="url(#bodyGradient)" />
        
        {/* Boots */}
        <rect x="50" y="250" width="35" height="20" rx="8" fill="#1E40AF" />
        <rect x="80" y="250" width="35" height="20" rx="8" fill="#1E40AF" />
        
        {/* Body */}
        <ellipse cx="82" cy="140" rx="45" ry="55" fill="url(#bodyGradient)" />
        
        {/* Belt */}
        <rect x="40" y="175" width="85" height="12" rx="4" fill="#FCD34D" />
        <rect x="75" y="172" width="15" height="18" rx="3" fill="#F59E0B" />
        
        {/* Arms */}
        <ellipse cx="30" cy="130" rx="18" ry="40" fill="url(#bodyGradient)" transform="rotate(-20 30 130)" />
        <ellipse cx="135" cy="130" rx="18" ry="40" fill="url(#bodyGradient)" transform="rotate(20 135 130)" />
        
        {/* Hands */}
        <circle cx="15" cy="165" r="15" fill="#FBBF24" />
        <circle cx="150" cy="165" r="15" fill="#FBBF24" />
        
        {/* Head */}
        <circle cx="82" cy="60" r="45" fill="#FBBF24" />
        
        {/* Mask */}
        <path d="M40 50 Q82 30 124 50 L124 70 Q82 60 40 70 Z" fill="#1D4ED8" />
        
        {/* Eyes (white part) */}
        <ellipse cx="60" cy="55" rx="12" ry="10" fill="white" />
        <ellipse cx="104" cy="55" rx="12" ry="10" fill="white" />
        
        {/* Eyes (pupils) */}
        <ellipse cx="63" cy="55" rx="5" ry="6" fill="#1E3A5F" />
        <ellipse cx="101" cy="55" rx="5" ry="6" fill="#1E3A5F" />
        
        {/* Smile */}
        <path d="M65 80 Q82 95 99 80" fill="none" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
        
        {/* P logo on chest */}
        <circle cx="82" cy="130" r="20" fill="#60A5FA" />
        <text x="82" y="138" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">P</text>
      </g>
      
      {/* Shield */}
      <g transform="translate(30, 300)">
        <path d="M50 0 L95 15 L95 60 Q95 100 50 120 Q5 100 5 60 L5 15 Z" fill="url(#shieldGradient)" filter="drop-shadow(0 4px 8px rgba(59,130,246,0.5))" />
        <path d="M50 10 L85 22 L85 58 Q85 90 50 108 Q15 90 15 58 L15 22 Z" fill="white" opacity="0.2" />
        <path d="M35 55 L45 65 L70 40" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      
      {/* Attack elements being blocked */}
      <g transform="translate(0, 250)">
        {/* Warning/Attack icon */}
        <g transform="translate(10, 80)" className="animate-pulse">
          <rect x="0" y="0" width="75" height="30" rx="15" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" />
          <text x="37" y="20" textAnchor="middle" fontSize="11" fill="#EF4444">⚠️ {warnings[warningIndex]}</text>
        </g>
      </g>
      
      {/* Protected badge */}
      <g transform="translate(100, 430)">
        <rect x="0" y="0" width="140" height="35" rx="17" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" />
        <circle cx="25" cy="17" r="8" fill="#10B981" />
        <path d="M21 17 L24 20 L29 14" stroke="white" strokeWidth="2" fill="none" />
        <text x="80" y="22" textAnchor="middle" fontSize="11" fill="#065F46">הנתונים שלכם מוגנים</text>
      </g>
    </svg>
  )
}

export default function HomePage() {
  // Inline calculator state
  const [checkStep, setCheckStep] = useState(0)
  const [checkAnswers, setCheckAnswers] = useState<Record<string, string>>({})
  const [checkComplete, setCheckComplete] = useState(false)

  const handleCheckAnswer = (value: string) => {
    const questionId = checkQuestions[checkStep].id
    const newAnswers = { ...checkAnswers, [questionId]: value }
    setCheckAnswers(newAnswers)

    setTimeout(() => {
      if (checkStep < checkQuestions.length - 1) {
        setCheckStep(checkStep + 1)
      } else {
        setCheckComplete(true)
      }
    }, 200)
  }

  const resetCheck = () => {
    setCheckStep(0)
    setCheckAnswers({})
    setCheckComplete(false)
  }

  const checkResult = checkComplete ? calculateCheckResult(checkAnswers) : null

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">DPO-Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#check" className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100">בדיקת חובה</Link>
              <Link href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100">יתרונות</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100">מחירים</Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100">שאלות נפוצות</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost">התחברות</Button>
              </Link>
              <Link href="/register">
                <Button>התחל בחינם</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Superhero */}
      <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Superhero Illustration */}
            <div className="order-2 lg:order-1 flex justify-center">
              <SuperheroIllustration />
            </div>
            
            {/* Right side - Content */}
            <div className="order-1 lg:order-2 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-6">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-600 text-sm font-medium">תיקון 13 נכנס לתוקף - האכיפה כבר כאן</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                ממונה הגנת פרטיות
                <br />
                <span className="text-primary">ב-₪500 לחודש</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-4">
                ממונה אנושי מוסמך + מערכת AI שעושה 98% מהעבודה.
              </p>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                <span className="font-semibold text-gray-900">במקום לשלם עשרות אלפי ₪</span> - קבלו הכל במנוי חודשי פשוט.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-end mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2 px-8">
                    התחילו תוך 15 דקות
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#check">
                  <Button size="lg" variant="outline" className="px-8">
                    בדקו אם אתם חייבים DPO
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <div className="flex flex-wrap gap-6 justify-center lg:justify-end text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>ללא התחייבות</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>הקמה תוך 15 דקות</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>DPO מוסמך</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-gradient-to-b from-white to-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">+500</div>
              <div className="text-gray-600">עסקים משתמשים</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
              <div className="text-gray-600">אוטומציה מלאה</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">15 דק׳</div>
              <div className="text-gray-600">זמן הקמה</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
              <div className="text-gray-600">מענה AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Inline Calculator Section */}
      <section id="check" className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">בדיקה חינמית</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">האם העסק שלכם חייב DPO?</h2>
            <p className="text-gray-600">ענו על 4 שאלות קצרות וגלו תוך 30 שניות</p>
          </div>

          <div className="rounded-xl border bg-white shadow-sm max-w-2xl mx-auto">
            {!checkComplete ? (
              <div className="p-6 md:p-8">
                <div className="text-sm text-gray-500 text-left mb-2">
                  שאלה {checkStep + 1} מתוך {checkQuestions.length}
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-6">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((checkStep + 1) / checkQuestions.length) * 100}%` }}
                  />
                </div>
                
                <h3 className="text-xl font-bold mb-6 text-center">
                  {checkQuestions[checkStep].question}
                </h3>
                
                <div className="space-y-3">
                  {checkQuestions[checkStep].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleCheckAnswer(option.value)}
                      className={`w-full p-4 rounded-lg border-2 text-right transition-all hover:border-primary hover:bg-primary/5
                        ${checkAnswers[checkQuestions[checkStep].id] === option.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-gray-200'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {checkStep > 0 && (
                  <button
                    onClick={() => setCheckStep(checkStep - 1)}
                    className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    ← חזרה לשאלה הקודמת
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 md:p-8">
                <div className={`rounded-lg p-6 mb-6 ${
                  checkResult?.type === 'required' ? 'bg-red-50 border-t-4 border-red-500' :
                  checkResult?.type === 'likely' ? 'bg-orange-50 border-t-4 border-orange-500' :
                  checkResult?.type === 'recommended' ? 'bg-yellow-50 border-t-4 border-yellow-500' :
                  'bg-green-50 border-t-4 border-green-500'
                }`}>
                  <div className="flex justify-center mb-4">
                    {checkResult?.type === 'required' || checkResult?.type === 'likely' ? (
                      <AlertTriangle className={`h-12 w-12 ${
                        checkResult?.type === 'required' ? 'text-red-500' : 'text-orange-500'
                      }`} />
                    ) : (
                      <CheckCircle2 className={`h-12 w-12 ${
                        checkResult?.type === 'recommended' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-center mb-2">
                    {checkResult?.type === 'required' && 'כנראה שאתם חייבים DPO'}
                    {checkResult?.type === 'likely' && 'סביר שאתם חייבים DPO'}
                    {checkResult?.type === 'recommended' && 'מומלץ לשקול מינוי DPO'}
                    {checkResult?.type === 'not_required' && 'כנראה לא חייבים DPO'}
                  </h3>
                  
                  <p className="text-center text-gray-600 mb-4">
                    {checkResult?.type === 'required' && 'על פי המאפיינים שהזנתם, העסק שלכם כנראה נדרש למנות ממונה הגנת פרטיות לפי תיקון 13.'}
                    {checkResult?.type === 'likely' && 'על פי המאפיינים שהזנתם, יש סבירות גבוהה שתידרשו למנות ממונה.'}
                    {checkResult?.type === 'recommended' && 'למרות שאינכם חייבים כרגע, מינוי DPO יכול להגן עליכם מפני סיכונים.'}
                    {checkResult?.type === 'not_required' && 'על פי המידע שמסרתם, נראה שאינכם מחויבים כרגע במינוי.'}
                  </p>

                  {(checkResult?.type === 'required' || checkResult?.type === 'likely') && (
                    <div className="bg-white/60 rounded p-3 text-sm text-center">
                      <span className="text-red-600 font-medium">⚠️ מומלץ לפעול מהר לפני ביקורת</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Link href="/register" className="block">
                    <Button className="w-full" size="lg">
                      {checkResult?.type === 'not_required' 
                        ? 'בכל זאת מעוניין בשירות' 
                        : 'התחילו עכשיו ב-₪500/חודש'}
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <button
                    onClick={resetCheck}
                    className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    בדיקה מחדש
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-gray-500 mb-2">רוצים דוח מפורט יותר?</p>
                  <Link href="/calculator" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    קבלו בדיקה מעמיקה + דוח למייל
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">מה כולל השירות?</h2>
            <p className="text-gray-600">כל מה שצריך לעמידה מלאה בתיקון 13</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="ממונה אנושי מוסמך"
              description="DPO מוסמך עם רישיון, שממונה רשמית על הארגון שלכם מול הרגולטור"
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="מסמכים אוטומטיים"
              description="מדיניות פרטיות, רישום מאגרים, ונהלי אבטחה - נוצרים ומתעדכנים אוטומטית"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="מענה AI לעובדים"
              description="בוט חכם שעונה על שאלות פרטיות 24/7, עם הסלמה לממונה במקרי קצה"
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="ניטור ובקרה"
              description="מעקב אחר שינויים, יומן ביקורת מלא, והתראות על בעיות פוטנציאליות"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="עדכונים שוטפים"
              description="המערכת מתעדכנת אוטומטית בהתאם לשינויי רגולציה וצרכי הארגון"
            />
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="מותאם לעסק שלכם"
              description="שאלון חכם שמאפיין את הפעילות ומייצר מסמכים רלוונטיים בדיוק"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">חבילות ומחירים</h2>
            <p className="text-gray-600">בחרו את החבילה המתאימה לעסק שלכם</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="relative">
              <CardHeader>
                <CardTitle>חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">₪500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <PricingFeature>ממונה הגנת פרטיות מוסמך</PricingFeature>
                  <PricingFeature>מדיניות פרטיות מותאמת</PricingFeature>
                  <PricingFeature>רישום מאגרי מידע</PricingFeature>
                  <PricingFeature>נהלי אבטחת מידע</PricingFeature>
                  <PricingFeature>בוט Q&A לעובדים</PricingFeature>
                  <PricingFeature>יומן ביקורת</PricingFeature>
                  <PricingFeature>עד 2 פניות לממונה ברבעון</PricingFeature>
                </ul>
                <Link href="/register?tier=basic" className="block mt-6">
                  <Button className="w-full" size="lg">בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-primary border-2">
              <div className="absolute -top-3 right-4">
                <Badge>הכי פופולרי</Badge>
              </div>
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">₪1,200</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <PricingFeature>כל מה שבחבילה הבסיסית</PricingFeature>
                  <PricingFeature>סקירה תקופתית של הממונה</PricingFeature>
                  <PricingFeature>זמינות מורחבת לשאלות</PricingFeature>
                  <PricingFeature>ליווי באירועי אבטחה</PricingFeature>
                  <PricingFeature>דוחות תאימות רבעוניים</PricingFeature>
                  <PricingFeature>עד 8 פניות לממונה ברבעון</PricingFeature>
                  <PricingFeature>עדיפות בתגובה</PricingFeature>
                </ul>
                <Link href="/register?tier=extended" className="block mt-6">
                  <Button className="w-full" size="lg">בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">שירותים נוספים לפי דרישה:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">DPIA - הערכת השפעה</Badge>
              <Badge variant="outline">חוות דעת משפטית</Badge>
              <Badge variant="outline">הדרכות לעובדים</Badge>
              <Badge variant="outline">ביקורת תאימות</Badge>
              <Badge variant="outline">ליווי אירוע אבטחה</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">שאלות נפוצות</h2>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              question="מי חייב למנות DPO?"
              answer="על פי תיקון 13, גופים ציבוריים, סוחרי מידע עם מעל 10,000 רשומות, ומעבדי מידע רגיש בהיקף משמעותי חייבים למנות ממונה הגנת פרטיות."
            />
            <FAQItem 
              question="האם ה-DPO הוא אדם אמיתי?"
              answer="כן! ממונה הגנת פרטיות אמיתי ומוסמך חותם על כל המסמכים ואחראי מקצועית. המערכת שלנו עושה את העבודה השוטפת, והממונה מטפל בחריגים."
            />
            <FAQItem 
              question="מה קורה אם לא ממנים DPO?"
              answer="הרשות להגנת הפרטיות יכולה להטיל קנסות החל מ-10,000 ₪ ללא הוכחת נזק, ועד מיליון ₪ במקרים חמורים. האכיפה כבר החלה."
            />
            <FAQItem 
              question="כמה זמן לוקח להתחיל?"
              answer="תוך 15 דקות תסיימו את תהליך ההצטרפות, והמסמכים יופקו אוטומטית. המינוי הרשמי מושלם תוך 24-48 שעות."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">האכיפה כבר כאן. אתם מוכנים?</h2>
          <p className="text-xl opacity-90 mb-8">
            תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO.
            <br />
            אל תחכו לקנס - התחילו היום.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                התחילו עכשיו - חינם לשבועיים
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/calculator">
              <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary gap-2">
                בדיקה מפורטת + דוח למייל
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">DPO-Pro</span>
              </div>
              <p className="text-sm">
                פתרון AI מקיף להגנת פרטיות ועמידה ברגולציה לעסקים בישראל.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">שירותים</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white">מינוי ממונה</Link></li>
                <li><Link href="/#pricing" className="hover:text-white">חבילות ומחירים</Link></li>
                <li><Link href="/calculator" className="hover:text-white">בדיקת חובה</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">תמיכה</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white">צור קשר</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">לוח בקרה</Link></li>
                <li><Link href="/login" className="hover:text-white">התחברות</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">משפטי</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">תנאי שימוש</Link></li>
                <li><Link href="/privacy" className="hover:text-white">מדיניות פרטיות</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            © 2026 DPO-Pro. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      <span>{children}</span>
    </li>
  )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-right flex justify-between items-center hover:bg-gray-50"
      >
        <span className="font-medium">{question}</span>
        <span className="text-gray-400 text-xl">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-gray-600">
          {answer}
        </div>
      )}
    </div>
  )
}
