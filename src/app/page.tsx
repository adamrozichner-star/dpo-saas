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
  Mail,
  Check
} from 'lucide-react'

// Inline Calculator Questions
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
  if (answers.org_type === 'public' || answers.org_type === 'health') return { type: 'required', score: 100 }
  if (score >= 50) return { type: 'required', score }
  if (score >= 30) return { type: 'likely', score }
  if (score >= 15) return { type: 'recommended', score }
  return { type: 'not_required', score }
}

// ===========================================
// STUNNING ANIMATED SUPERHERO COMPONENT
// ===========================================
function SuperheroIllustration() {
  const [warningIndex, setWarningIndex] = useState(0)
  const [isBlocking, setIsBlocking] = useState(false)
  const warnings = ['דליפת מידע', 'פריצה', 'קנס', 'תביעה', 'ביקורת']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlocking(true)
      setTimeout(() => {
        setWarningIndex(prev => (prev + 1) % warnings.length)
        setIsBlocking(false)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Animated background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 bg-cyan-400/20 rounded-full blur-2xl animate-ping" style={{ animationDuration: '3s' }} />
      </div>
      
      <svg viewBox="0 0 500 550" className="w-full h-auto relative z-10">
        <defs>
          {/* Gradients */}
          <linearGradient id="shieldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA">
              <animate attributeName="stop-color" values="#60A5FA;#818CF8;#60A5FA" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#3B82F6">
              <animate attributeName="stop-color" values="#3B82F6;#6366F1;#3B82F6" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          
          <linearGradient id="capeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
          </filter>

          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Floating Document Card - Top Right */}
        <g filter="url(#shadow)">
          <g className="animate-bounce" style={{ animationDuration: '3s' }}>
            <rect x="340" y="60" width="85" height="95" rx="16" fill="white" />
            <rect x="355" y="85" width="55" height="5" rx="2.5" fill="#E5E7EB" />
            <rect x="355" y="97" width="40" height="5" rx="2.5" fill="#E5E7EB" />
            <rect x="355" y="109" width="48" height="5" rx="2.5" fill="#E5E7EB" />
            <circle cx="382" cy="135" r="14" fill="#DBEAFE" />
            <path d="M375 135 L380 140 L390 130" stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x="382" y="75" textAnchor="middle" fontSize="11" fill="#6B7280" fontWeight="500">מסמכים</text>
          </g>
        </g>

        {/* Floating Database Card - Middle Right */}
        <g filter="url(#shadow)">
          <g className="animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
            <rect x="360" y="180" width="85" height="85" rx="16" fill="white" />
            <ellipse cx="402" cy="210" rx="25" ry="10" fill="#3B82F6" />
            <path d="M377 210 L377 235 Q402 250 427 235 L427 210" fill="none" stroke="#3B82F6" strokeWidth="3" />
            <ellipse cx="402" cy="235" rx="25" ry="10" fill="none" stroke="#3B82F6" strokeWidth="3" />
            <text x="402" y="258" textAnchor="middle" fontSize="10" fill="#6B7280" fontWeight="500">מאגרי מידע</text>
          </g>
        </g>

        {/* Floating Users Card - Bottom Right */}
        <g filter="url(#shadow)">
          <g className="animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '1s' }}>
            <rect x="340" y="290" width="85" height="85" rx="16" fill="white" />
            <circle cx="365" cy="320" r="12" fill="#BFDBFE" />
            <circle cx="400" cy="320" r="12" fill="#93C5FD" />
            <circle cx="382" cy="338" r="15" fill="#3B82F6" />
            <circle cx="382" cy="333" r="6" fill="white" />
            <text x="382" y="368" textAnchor="middle" fontSize="10" fill="#6B7280" fontWeight="500">נתוני לקוחות</text>
          </g>
        </g>

        {/* SUPERHERO */}
        <g transform="translate(100, 120)">
          {/* Cape with wave animation */}
          <g>
            <path d="M85 90 Q40 180 70 280 L130 280 Q160 180 115 90" fill="url(#capeGradient)">
              <animate 
                attributeName="d" 
                values="M85 90 Q40 180 70 280 L130 280 Q160 180 115 90;M85 90 Q50 180 65 280 L135 280 Q150 180 115 90;M85 90 Q40 180 70 280 L130 280 Q160 180 115 90" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </path>
          </g>

          {/* Legs with subtle movement */}
          <g>
            <rect x="65" y="220" width="30" height="90" rx="12" fill="url(#bodyGradient)">
              <animate attributeName="x" values="65;63;65" dur="1s" repeatCount="indefinite" />
            </rect>
            <rect x="105" y="220" width="30" height="90" rx="12" fill="url(#bodyGradient)">
              <animate attributeName="x" values="105;107;105" dur="1s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* Boots */}
          <rect x="58" y="300" width="42" height="25" rx="10" fill="#1E40AF" />
          <rect x="100" y="300" width="42" height="25" rx="10" fill="#1E40AF" />

          {/* Body */}
          <ellipse cx="100" cy="170" rx="55" ry="65" fill="url(#bodyGradient)" />

          {/* Belt */}
          <rect x="50" y="215" width="100" height="15" rx="5" fill="#FCD34D" />
          <rect x="90" y="212" width="20" height="21" rx="4" fill="#F59E0B" />
          <text x="100" y="227" textAnchor="middle" fontSize="10" fill="#92400E" fontWeight="bold">P</text>

          {/* Arms */}
          <g>
            {/* Left arm holding shield */}
            <ellipse cx="30" cy="160" rx="22" ry="50" fill="url(#bodyGradient)" transform="rotate(-25 30 160)" />
            {/* Right arm */}
            <ellipse cx="170" cy="160" rx="22" ry="50" fill="url(#bodyGradient)" transform="rotate(25 170 160)">
              <animate attributeName="transform" values="rotate(25 170 160);rotate(20 170 160);rotate(25 170 160)" dur="2s" repeatCount="indefinite" type="rotate" />
            </ellipse>
          </g>

          {/* Hands */}
          <circle cx="8" cy="200" r="18" fill="#FBBF24" />
          <circle cx="192" cy="200" r="18" fill="#FBBF24">
            <animate attributeName="cy" values="200;195;200" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Head with gentle bob */}
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="2s" repeatCount="indefinite" />
            <circle cx="100" cy="70" r="55" fill="#FBBF24" />
            
            {/* Mask */}
            <path d="M50 55 Q100 30 150 55 L150 80 Q100 65 50 80 Z" fill="#1D4ED8" />
            
            {/* Eyes with blink */}
            <g>
              <ellipse cx="75" cy="62" rx="15" ry="13" fill="white" />
              <ellipse cx="125" cy="62" rx="15" ry="13" fill="white" />
              <ellipse cx="78" cy="62" rx="7" ry="8" fill="#1E3A5F">
                <animate attributeName="ry" values="8;1;8" dur="4s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="122" cy="62" rx="7" ry="8" fill="#1E3A5F">
                <animate attributeName="ry" values="8;1;8" dur="4s" repeatCount="indefinite" />
              </ellipse>
              {/* Eye shine */}
              <circle cx="80" cy="59" r="3" fill="white" opacity="0.8" />
              <circle cx="124" cy="59" r="3" fill="white" opacity="0.8" />
            </g>

            {/* Smile */}
            <path d="M80 95 Q100 115 120 95" fill="none" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Chest emblem */}
          <g filter="url(#glow)">
            <circle cx="100" cy="160" r="28" fill="#60A5FA" />
            <circle cx="100" cy="160" r="22" fill="#3B82F6" />
            <text x="100" y="170" textAnchor="middle" fontSize="28" fontWeight="bold" fill="white">P</text>
          </g>
        </g>

        {/* SHIELD with glow effect */}
        <g transform="translate(40, 300)" filter="url(#strongGlow)">
          <g className={isBlocking ? 'animate-pulse' : ''}>
            <animateTransform attributeName="transform" type="rotate" values="-5,60,70;5,60,70;-5,60,70" dur="3s" repeatCount="indefinite" />
            <path 
              d="M60 0 L115 18 L115 75 Q115 125 60 150 Q5 125 5 75 L5 18 Z" 
              fill="url(#shieldGlow)"
            />
            <path 
              d="M60 12 L105 27 L105 72 Q105 115 60 137 Q15 115 15 72 L15 27 Z" 
              fill="white" 
              opacity="0.25"
            />
            <path 
              d="M60 25 L95 37 L95 68 Q95 100 60 118 Q25 100 25 68 L25 37 Z" 
              fill="none"
              stroke="white"
              strokeWidth="2"
              opacity="0.5"
            />
            {/* Checkmark */}
            <path d="M40 70 L55 85 L85 50" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </g>

        {/* ATTACK WARNINGS being blocked */}
        <g transform="translate(20, 430)">
          <g 
            className="transition-all duration-300"
            style={{ 
              transform: isBlocking ? 'translateX(-20px) scale(0.8)' : 'translateX(0) scale(1)',
              opacity: isBlocking ? 0.5 : 1 
            }}
          >
            <rect x="0" y="0" width="100" height="36" rx="18" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2">
              <animate attributeName="x" values="0;5;0" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <text x="50" y="24" textAnchor="middle" fontSize="13" fill="#DC2626" fontWeight="600">
              ⚠️ {warnings[warningIndex]}
            </text>
          </g>
          
          {/* Blocked indicator */}
          {isBlocking && (
            <g transform="translate(110, 8)">
              <circle cx="10" cy="10" r="12" fill="#10B981" />
              <path d="M5 10 L9 14 L16 6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* Protected Badge */}
        <g transform="translate(130, 490)">
          <rect x="0" y="0" width="170" height="42" rx="21" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
          <circle cx="28" cy="21" r="12" fill="#10B981" />
          <path d="M22 21 L26 25 L34 16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="105" y="27" textAnchor="middle" fontSize="13" fill="#065F46" fontWeight="600">הנתונים שלכם מוגנים</text>
        </g>
      </svg>
    </div>
  )
}

export default function HomePage() {
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
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation */}
      <nav className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">DPO-Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <Link href="#check" className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all">בדיקת חובה</Link>
              <Link href="#features" className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all">יתרונות</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all">מחירים</Link>
              <Link href="#faq" className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all">שאלות נפוצות</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="hover:bg-blue-50">התחברות</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30">התחל בחינם</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - SUPERHERO ON LEFT, CONTENT ON RIGHT */}
      <section className="py-8 md:py-16 px-4 bg-gradient-to-b from-blue-50/80 via-white to-white overflow-hidden min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center">
            {/* RIGHT side - Content (appears first in RTL) */}
            <div className="text-center lg:text-right order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-full mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-600 text-sm font-medium">תיקון 13 נכנס לתוקף - האכיפה כבר כאן</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
                ממונה הגנת פרטיות
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">ב-₪500 לחודש</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-2">
                ממונה אנושי מוסמך + מערכת AI שעושה 98% מהעבודה.
              </p>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                <span className="font-bold text-gray-900">במקום לשלם עשרות אלפי ₪</span> - קבלו הכל במנוי חודשי פשוט.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl shadow-blue-500/30 text-lg h-14">
                    התחילו תוך 15 דקות
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#check">
                  <Button size="lg" variant="outline" className="px-8 border-2 hover:bg-blue-50 text-lg h-14">
                    בדקו אם אתם חייבים DPO
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span>ללא התחייבות</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span>הקמה תוך 15 דקות</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span>DPO מוסמך</span>
                </div>
              </div>
            </div>

            {/* LEFT side - Superhero Animation (appears second in RTL = visually on left) */}
            <div className="order-2 flex justify-center lg:justify-start">
              <SuperheroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '+500', label: 'עסקים משתמשים' },
              { value: '98%', label: 'אוטומציה מלאה' },
              { value: '15 דק׳', label: 'זמן הקמה' },
              { value: '24/7', label: 'מענה AI' },
            ].map((stat, i) => (
              <div key={i} className="group">
                <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  {stat.value}
                </div>
                <div className="text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="check" className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">בדיקה חינמית</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">האם העסק שלכם חייב DPO?</h2>
            <p className="text-gray-600">ענו על 4 שאלות קצרות וגלו תוך 30 שניות</p>
          </div>

          <div className="rounded-2xl border bg-white shadow-xl shadow-gray-200/50 max-w-2xl mx-auto overflow-hidden">
            {!checkComplete ? (
              <div className="p-6 md:p-8">
                <div className="text-sm text-gray-500 mb-2">שאלה {checkStep + 1} מתוך {checkQuestions.length}</div>
                <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${((checkStep + 1) / checkQuestions.length) * 100}%` }}
                  />
                </div>
                
                <h3 className="text-xl font-bold mb-6 text-center">{checkQuestions[checkStep].question}</h3>
                
                <div className="space-y-3">
                  {checkQuestions[checkStep].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleCheckAnswer(option.value)}
                      className={`w-full p-4 rounded-xl border-2 text-right transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-md
                        ${checkAnswers[checkQuestions[checkStep].id] === option.value 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {checkStep > 0 && (
                  <button onClick={() => setCheckStep(checkStep - 1)} className="mt-4 text-gray-500 hover:text-gray-700 text-sm">
                    ← חזרה לשאלה הקודמת
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 md:p-8">
                <div className={`rounded-xl p-6 mb-6 ${
                  checkResult?.type === 'required' ? 'bg-gradient-to-br from-red-50 to-red-100 border-t-4 border-red-500' :
                  checkResult?.type === 'likely' ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-t-4 border-orange-500' :
                  checkResult?.type === 'recommended' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-t-4 border-yellow-500' :
                  'bg-gradient-to-br from-green-50 to-green-100 border-t-4 border-green-500'
                }`}>
                  <div className="flex justify-center mb-4">
                    {checkResult?.type === 'required' || checkResult?.type === 'likely' ? (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${checkResult?.type === 'required' ? 'bg-red-100' : 'bg-orange-100'}`}>
                        <AlertTriangle className={`h-8 w-8 ${checkResult?.type === 'required' ? 'text-red-500' : 'text-orange-500'}`} />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${checkResult?.type === 'recommended' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <CheckCircle2 className={`h-8 w-8 ${checkResult?.type === 'recommended' ? 'text-yellow-500' : 'text-green-500'}`} />
                      </div>
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
                    <div className="bg-white/70 rounded-lg p-3 text-sm text-center">
                      <span className="text-red-600 font-semibold">⚠️ מומלץ לפעול מהר לפני ביקורת</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Link href="/register" className="block">
                    <Button className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                      {checkResult?.type === 'not_required' ? 'בכל זאת מעוניין בשירות' : 'התחילו עכשיו ב-₪500/חודש'}
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <button onClick={resetCheck} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm">בדיקה מחדש</button>
                </div>

                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-gray-500 mb-2">רוצים דוח מפורט יותר?</p>
                  <Link href="/calculator" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center gap-1">
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
            {[
              { icon: <Users className="h-6 w-6" />, title: "ממונה אנושי מוסמך", desc: "DPO מוסמך עם רישיון, שממונה רשמית על הארגון שלכם מול הרגולטור" },
              { icon: <FileText className="h-6 w-6" />, title: "מסמכים אוטומטיים", desc: "מדיניות פרטיות, רישום מאגרים, ונהלי אבטחה - נוצרים ומתעדכנים אוטומטית" },
              { icon: <MessageSquare className="h-6 w-6" />, title: "מענה AI לעובדים", desc: "בוט חכם שעונה על שאלות פרטיות 24/7, עם הסלמה לממונה במקרי קצה" },
              { icon: <Lock className="h-6 w-6" />, title: "ניטור ובקרה", desc: "מעקב אחר שינויים, יומן ביקורת מלא, והתראות על בעיות פוטנציאליות" },
              { icon: <Zap className="h-6 w-6" />, title: "עדכונים שוטפים", desc: "המערכת מתעדכנת אוטומטית בהתאם לשינויי רגולציה וצרכי הארגון" },
              { icon: <Building2 className="h-6 w-6" />, title: "מותאם לעסק שלכם", desc: "שאלון חכם שמאפיין את הפעילות ומייצר מסמכים רלוונטיים בדיוק" },
            ].map((feature, i) => (
              <Card key={i} className="group hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
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
            <Card className="relative hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">₪500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['ממונה הגנת פרטיות מוסמך', 'מדיניות פרטיות מותאמת', 'רישום מאגרי מידע', 'נהלי אבטחת מידע', 'בוט Q&A לעובדים', 'יומן ביקורת', 'עד 2 פניות לממונה ברבעון'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?tier=basic" className="block mt-6">
                  <Button className="w-full h-12" size="lg">בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-blue-500 shadow-xl shadow-blue-100">
              <div className="absolute -top-3 right-4">
                <Badge className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0">הכי פופולרי</Badge>
              </div>
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">₪1,200</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['כל מה שבחבילה הבסיסית', 'סקירה תקופתית של הממונה', 'זמינות מורחבת לשאלות', 'ליווי באירועי אבטחה', 'דוחות תאימות רבעוניים', 'עד 8 פניות לממונה ברבעון', 'עדיפות בתגובה'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?tier=extended" className="block mt-6">
                  <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700" size="lg">בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">שירותים נוספים לפי דרישה:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['DPIA - הערכת השפעה', 'חוות דעת משפטית', 'הדרכות לעובדים', 'ביקורת תאימות', 'ליווי אירוע אבטחה'].map((s, i) => (
                <Badge key={i} variant="outline" className="bg-white">{s}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">שאלות נפוצות</h2>
          </div>
          
          <div className="space-y-4">
            {[
              { q: "מי חייב למנות DPO?", a: "על פי תיקון 13, גופים ציבוריים, סוחרי מידע עם מעל 10,000 רשומות, ומעבדי מידע רגיש בהיקף משמעותי חייבים למנות ממונה הגנת פרטיות." },
              { q: "האם ה-DPO הוא אדם אמיתי?", a: "כן! ממונה הגנת פרטיות אמיתי ומוסמך חותם על כל המסמכים ואחראי מקצועית. המערכת שלנו עושה את העבודה השוטפת, והממונה מטפל בחריגים." },
              { q: "מה קורה אם לא ממנים DPO?", a: "הרשות להגנת הפרטיות יכולה להטיל קנסות החל מ-10,000 ₪ ללא הוכחת נזק, ועד מיליון ₪ במקרים חמורים. האכיפה כבר החלה." },
              { q: "כמה זמן לוקח להתחיל?", a: "תוך 15 דקות תסיימו את תהליך ההצטרפות, והמסמכים יופקו אוטומטית. המינוי הרשמי מושלם תוך 24-48 שעות." },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">האכיפה כבר כאן. אתם מוכנים?</h2>
          <p className="text-xl opacity-90 mb-8">
            תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO.
            <br />
            אל תחכו לקנס - התחילו היום.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 h-14 px-8 text-lg shadow-xl">
                התחילו עכשיו - חינם לשבועיים
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/calculator">
              <Button size="lg" className="bg-white/10 border-2 border-white text-white hover:bg-white hover:text-blue-700 gap-2 h-14 px-8 text-lg">
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">DPO-Pro</span>
              </div>
              <p className="text-sm">פתרון AI מקיף להגנת פרטיות ועמידה ברגולציה לעסקים בישראל.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">שירותים</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white transition-colors">מינוי ממונה</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">חבילות ומחירים</Link></li>
                <li><Link href="/calculator" className="hover:text-white transition-colors">בדיקת חובה</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">תמיכה</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white transition-colors">צור קשר</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">לוח בקרה</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">התחברות</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">משפטי</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link></li>
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

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-right flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold">{question}</span>
        <span className={`text-blue-500 text-2xl transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-gray-600">
          {answer}
        </div>
      )}
    </div>
  )
}
