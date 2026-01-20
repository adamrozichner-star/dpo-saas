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

// Calculator Questions
const checkQuestions = [
  { id: 'employees', question: 'כמה עובדים יש בעסק?', options: [
    { value: '1-10', label: '1-10 עובדים', points: 0 },
    { value: '11-50', label: '11-50 עובדים', points: 5 },
    { value: '51-250', label: '51-250 עובדים', points: 10 },
    { value: '250+', label: 'מעל 250 עובדים', points: 15 },
  ]},
  { id: 'data_type', question: 'איזה סוג מידע אתם מנהלים?', options: [
    { value: 'basic', label: 'פרטי קשר בסיסיים בלבד', points: 0 },
    { value: 'financial', label: 'מידע פיננסי / תשלומים', points: 20 },
    { value: 'health', label: 'מידע רפואי / בריאותי', points: 30 },
    { value: 'sensitive', label: 'מידע רגיש אחר (ביומטרי, פלילי)', points: 30 },
  ]},
  { id: 'records', question: 'כמה רשומות של אנשים יש במאגרים?', options: [
    { value: 'under_1k', label: 'פחות מ-1,000', points: 0 },
    { value: '1k-10k', label: '1,000 - 10,000', points: 10 },
    { value: '10k-50k', label: '10,000 - 50,000', points: 25 },
    { value: '50k+', label: 'מעל 50,000', points: 35 },
  ]},
  { id: 'org_type', question: 'מהו סוג הארגון?', options: [
    { value: 'private', label: 'חברה פרטית', points: 0 },
    { value: 'public_supplier', label: 'ספק לגוף ציבורי', points: 20 },
    { value: 'public', label: 'גוף ציבורי / ממשלתי', points: 100 },
    { value: 'health', label: 'מוסד בריאות / קופ"ח', points: 100 },
  ]},
]

type CheckResult = 'required' | 'likely' | 'recommended' | 'not_required'

function calculateCheckResult(answers: Record<string, string>): { type: CheckResult; score: number } {
  let score = 0
  checkQuestions.forEach(q => {
    const option = q.options.find(o => o.value === answers[q.id])
    if (option) score += option.points
  })
  if (answers.org_type === 'public' || answers.org_type === 'health') return { type: 'required', score: 100 }
  if (score >= 50) return { type: 'required', score }
  if (score >= 30) return { type: 'likely', score }
  if (score >= 15) return { type: 'recommended', score }
  return { type: 'not_required', score }
}

// ===========================================
// MODERN CUTE MASCOT - Duolingo/Notion Style
// ===========================================
function HeroMascot() {
  const [threatIndex, setThreatIndex] = useState(0)
  const threats = ['דליפת מידע', 'פריצה', 'קנס', 'תביעה', 'ביקורת']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setThreatIndex(prev => (prev + 1) % threats.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full max-w-[500px] mx-auto">
      {/* Soft background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60" />
      </div>
      
      <svg viewBox="0 0 500 480" className="w-full h-auto relative z-10">
        <defs>
          {/* Simple gradients */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD93D" />
            <stop offset="100%" stopColor="#F4C430" />
          </linearGradient>
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4F8EF7" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="capeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* === FLOATING INFO CARDS === */}
        
        {/* Documents Card - Top */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="4s" repeatCount="indefinite"/>
            <rect x="320" y="40" width="100" height="85" rx="16" fill="white" />
            <rect x="340" y="60" width="60" height="6" rx="3" fill="#E2E8F0" />
            <rect x="340" y="72" width="45" height="6" rx="3" fill="#E2E8F0" />
            <rect x="340" y="84" width="52" height="6" rx="3" fill="#E2E8F0" />
            <circle cx="370" cy="108" r="10" fill="#DBEAFE" />
            <path d="M365 108 L368 111 L376 103" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="370" y="55" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">מסמכים</text>
          </g>
        </g>
        
        {/* Database Card - Middle */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="5s" repeatCount="indefinite"/>
            <rect x="340" y="150" width="100" height="85" rx="16" fill="white" />
            <g transform="translate(390, 185)">
              <ellipse cx="0" cy="0" rx="22" ry="8" fill="#3B82F6" />
              <rect x="-22" y="0" width="44" height="20" fill="#3B82F6" opacity="0.7" />
              <ellipse cx="0" cy="20" rx="22" ry="8" fill="#3B82F6" opacity="0.5" />
            </g>
            <text x="390" y="223" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">מאגרי מידע</text>
          </g>
        </g>

        {/* Users Card - Bottom */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-10;0,0" dur="4.5s" repeatCount="indefinite"/>
            <rect x="320" y="260" width="100" height="85" rx="16" fill="white" />
            <circle cx="355" cy="295" r="14" fill="#BFDBFE" />
            <circle cx="385" cy="295" r="14" fill="#93C5FD" />
            <circle cx="370" cy="310" r="16" fill="#3B82F6" />
            <circle cx="370" cy="303" r="7" fill="white" />
            <text x="370" y="338" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">נתוני לקוחות</text>
          </g>
        </g>

        {/* === CUTE MASCOT CHARACTER === */}
        <g transform="translate(80, 85)">
          {/* Simple breathing animation on whole character */}
          <animateTransform attributeName="transform" type="translate" values="80,85;80,82;80,85" dur="3s" repeatCount="indefinite"/>
          
          {/* Cape - simple flowing */}
          <path d="M95 115 Q60 200 85 310 L165 310 Q190 200 155 115" fill="url(#capeGrad)">
            <animate attributeName="d" 
              values="M95 115 Q60 200 85 310 L165 310 Q190 200 155 115;
                      M95 115 Q55 200 80 310 L170 310 Q195 200 155 115;
                      M95 115 Q60 200 85 310 L165 310 Q190 200 155 115" 
              dur="4s" repeatCount="indefinite"/>
          </path>

          {/* Body - rounded suit */}
          <ellipse cx="125" cy="200" rx="65" ry="80" fill="url(#suitGrad)" />
          
          {/* Legs */}
          <rect x="85" y="260" width="32" height="70" rx="16" fill="url(#suitGrad)" />
          <rect x="133" y="260" width="32" height="70" rx="16" fill="url(#suitGrad)" />
          
          {/* Boots - rounded */}
          <ellipse cx="101" cy="335" rx="22" ry="12" fill="#1E3A8A" />
          <ellipse cx="149" cy="335" rx="22" ry="12" fill="#1E3A8A" />
          
          {/* Belt */}
          <rect x="68" y="245" width="114" height="18" rx="9" fill="#FCD34D" />
          <rect x="113" y="241" width="24" height="26" rx="6" fill="#F59E0B" />
          <text x="125" y="260" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#92400E">P</text>

          {/* Arms */}
          <ellipse cx="50" cy="180" rx="22" ry="50" fill="url(#suitGrad)" transform="rotate(-10 50 180)" />
          <ellipse cx="200" cy="180" rx="22" ry="50" fill="url(#suitGrad)" transform="rotate(10 200 180)" />
          
          {/* Hands - round and cute */}
          <circle cx="35" cy="225" r="22" fill="url(#skinGrad)" />
          <circle cx="215" cy="225" r="22" fill="url(#skinGrad)" />

          {/* HEAD - Big and round like Duolingo */}
          <circle cx="125" cy="70" r="65" fill="url(#skinGrad)" />
          
          {/* Mask - sleek */}
          <path d="M65 55 Q125 25 185 55 L185 85 Q125 70 65 85 Z" fill="#1D4ED8" />
          
          {/* Eyes - Big, expressive, Duolingo style */}
          <ellipse cx="95" cy="65" rx="18" ry="20" fill="white" />
          <ellipse cx="155" cy="65" rx="18" ry="20" fill="white" />
          
          {/* Pupils - with subtle animation */}
          <circle cx="100" cy="68" r="10" fill="#1E293B">
            <animate attributeName="cy" values="68;65;68" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="150" cy="68" r="10" fill="#1E293B">
            <animate attributeName="cy" values="68;65;68" dur="3s" repeatCount="indefinite"/>
          </circle>
          
          {/* Eye shine */}
          <circle cx="104" cy="63" r="4" fill="white" />
          <circle cx="154" cy="63" r="4" fill="white" />
          
          {/* Happy smile */}
          <path d="M100 100 Q125 125 150 100" fill="none" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
          
          {/* Rosy cheeks */}
          <ellipse cx="70" cy="90" rx="12" ry="8" fill="#FDBA74" opacity="0.6" />
          <ellipse cx="180" cy="90" rx="12" ry="8" fill="#FDBA74" opacity="0.6" />

          {/* Chest emblem */}
          <circle cx="125" cy="195" r="28" fill="#60A5FA" />
          <circle cx="125" cy="195" r="22" fill="white" opacity="0.2" />
          <text x="125" y="204" textAnchor="middle" fontSize="26" fontWeight="bold" fill="white">P</text>
        </g>

        {/* === SHIELD === */}
        <g transform="translate(20, 280)" filter="url(#softShadow)">
          <animateTransform attributeName="transform" type="translate" values="20,280;20,275;20,280" dur="3s" repeatCount="indefinite"/>
          
          <path d="M55 0 L105 15 L105 65 Q105 105 55 125 Q5 105 5 65 L5 15 Z" fill="url(#shieldGrad)" />
          <path d="M55 10 L95 23 L95 62 Q95 95 55 113 Q15 95 15 62 L15 23 Z" fill="white" opacity="0.2" />
          
          {/* Checkmark */}
          <path d="M35 60 L50 75 L80 42" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* === THREAT BADGE === */}
        <g transform="translate(15, 420)">
          <rect x="0" y="0" width="105" height="38" rx="19" fill="#FEE2E2" stroke="#F87171" strokeWidth="2">
            <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
          </rect>
          <text x="52" y="25" textAnchor="middle" fontSize="13" fill="#DC2626" fontWeight="600">
            ⚠️ {threats[threatIndex]}
          </text>
        </g>

        {/* Block effect - simple lines */}
        <g transform="translate(120, 395)" opacity="0.4">
          <line x1="0" y1="30" x2="-25" y2="45" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.6;0" dur="1.5s" repeatCount="indefinite"/>
          </line>
          <line x1="5" y1="40" x2="-20" y2="55" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.6;0" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
          </line>
        </g>

        {/* === PROTECTED BADGE === */}
        <g transform="translate(140, 430)" filter="url(#softShadow)">
          <rect x="0" y="0" width="175" height="42" rx="21" fill="#D1FAE5" stroke="#34D399" strokeWidth="2" />
          <circle cx="28" cy="21" r="12" fill="#10B981" />
          <path d="M22 21 L26 25 L35 15" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <text x="108" y="27" textAnchor="middle" fontSize="13" fill="#047857" fontWeight="600">הנתונים שלכם מוגנים</text>
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
    setCheckAnswers({ ...checkAnswers, [checkQuestions[checkStep].id]: value })
    setTimeout(() => {
      if (checkStep < checkQuestions.length - 1) setCheckStep(checkStep + 1)
      else setCheckComplete(true)
    }, 200)
  }

  const resetCheck = () => { setCheckStep(0); setCheckAnswers({}); setCheckComplete(false) }
  const checkResult = checkComplete ? calculateCheckResult(checkAnswers) : null

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Nav */}
      <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">DPO-Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {['בדיקת חובה', 'יתרונות', 'מחירים', 'שאלות נפוצות'].map((item, i) => (
                <Link key={i} href={`#${['check', 'features', 'pricing', 'faq'][i]}`} className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login"><Button variant="ghost">התחברות</Button></Link>
              <Link href="/register"><Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">התחל בחינם</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-blue-50/50 via-white to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Right - Content */}
            <div className="text-center lg:text-right order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-600 text-sm font-medium">תיקון 13 נכנס לתוקף - האכיפה כבר כאן</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                ממונה הגנת פרטיות
                <br />
                <span className="text-blue-600">ב-₪500 לחודש</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-2">ממונה אנושי מוסמך + מערכת AI שעושה 98% מהעבודה.</p>
              <p className="text-lg text-gray-600 mb-8"><span className="font-semibold text-gray-900">במקום לשלם עשרות אלפי ₪</span> - קבלו הכל במנוי חודשי פשוט.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 h-14 text-base">
                    התחילו תוך 15 דקות
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#check">
                  <Button size="lg" variant="outline" className="px-8 h-14 text-base border-2">
                    בדקו אם אתם חייבים DPO
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-gray-500">
                {['ללא התחייבות', 'הקמה תוך 15 דקות', 'DPO מוסמך'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Left - Mascot */}
            <div className="order-2 flex justify-center lg:justify-start">
              <HeroMascot />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-white border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '+500', label: 'עסקים משתמשים' },
              { value: '98%', label: 'אוטומציה מלאה' },
              { value: '15 דק׳', label: 'זמן הקמה' },
              { value: '24/7', label: 'מענה AI' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section id="check" className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">בדיקה חינמית</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">האם העסק שלכם חייב DPO?</h2>
            <p className="text-gray-600">ענו על 4 שאלות קצרות וגלו תוך 30 שניות</p>
          </div>

          <Card className="max-w-2xl mx-auto shadow-xl border-0">
            {!checkComplete ? (
              <CardContent className="p-6 md:p-8">
                <div className="text-sm text-gray-500 mb-2">שאלה {checkStep + 1} מתוך {checkQuestions.length}</div>
                <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${((checkStep + 1) / checkQuestions.length) * 100}%` }} />
                </div>
                <h3 className="text-xl font-bold mb-6 text-center">{checkQuestions[checkStep].question}</h3>
                <div className="space-y-3">
                  {checkQuestions[checkStep].options.map((option) => (
                    <button key={option.value} onClick={() => handleCheckAnswer(option.value)}
                      className={`w-full p-4 rounded-xl border-2 text-right transition-all hover:border-blue-400 hover:bg-blue-50 ${checkAnswers[checkQuestions[checkStep].id] === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {checkStep > 0 && <button onClick={() => setCheckStep(checkStep - 1)} className="mt-4 text-gray-500 hover:text-gray-700 text-sm">← חזרה</button>}
              </CardContent>
            ) : (
              <CardContent className="p-6 md:p-8">
                <div className={`rounded-xl p-6 mb-6 ${checkResult?.type === 'required' ? 'bg-red-50 border-t-4 border-red-500' : checkResult?.type === 'likely' ? 'bg-orange-50 border-t-4 border-orange-500' : checkResult?.type === 'recommended' ? 'bg-yellow-50 border-t-4 border-yellow-500' : 'bg-green-50 border-t-4 border-green-500'}`}>
                  <div className="flex justify-center mb-4">
                    {checkResult?.type === 'required' || checkResult?.type === 'likely' ? (
                      <AlertTriangle className={`h-12 w-12 ${checkResult?.type === 'required' ? 'text-red-500' : 'text-orange-500'}`} />
                    ) : <CheckCircle2 className={`h-12 w-12 ${checkResult?.type === 'recommended' ? 'text-yellow-500' : 'text-green-500'}`} />}
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">
                    {checkResult?.type === 'required' && 'כנראה שאתם חייבים DPO'}
                    {checkResult?.type === 'likely' && 'סביר שאתם חייבים DPO'}
                    {checkResult?.type === 'recommended' && 'מומלץ לשקול מינוי DPO'}
                    {checkResult?.type === 'not_required' && 'כנראה לא חייבים DPO'}
                  </h3>
                  <p className="text-center text-gray-600">
                    {checkResult?.type === 'required' && 'על פי המאפיינים שהזנתם, העסק שלכם כנראה נדרש למנות ממונה הגנת פרטיות לפי תיקון 13.'}
                    {checkResult?.type === 'likely' && 'על פי המאפיינים שהזנתם, יש סבירות גבוהה שתידרשו למנות ממונה.'}
                    {checkResult?.type === 'recommended' && 'למרות שאינכם חייבים כרגע, מינוי DPO יכול להגן עליכם מפני סיכונים.'}
                    {checkResult?.type === 'not_required' && 'על פי המידע שמסרתם, נראה שאינכם מחויבים כרגע במינוי.'}
                  </p>
                </div>
                <Link href="/register" className="block">
                  <Button className="w-full h-14 text-base bg-blue-600 hover:bg-blue-700">
                    {checkResult?.type === 'not_required' ? 'בכל זאת מעוניין בשירות' : 'התחילו עכשיו ב-₪500/חודש'}
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                </Link>
                <button onClick={resetCheck} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm mt-3">בדיקה מחדש</button>
                <div className="mt-6 pt-6 border-t text-center">
                  <Link href="/calculator" className="text-blue-600 hover:underline text-sm font-medium inline-flex items-center gap-1">
                    <Mail className="h-4 w-4" /> קבלו בדיקה מעמיקה + דוח למייל
                  </Link>
                </div>
              </CardContent>
            )}
          </Card>
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
              { icon: <Users className="h-6 w-6" />, title: "ממונה אנושי מוסמך", desc: "DPO מוסמך עם רישיון, שממונה רשמית על הארגון שלכם" },
              { icon: <FileText className="h-6 w-6" />, title: "מסמכים אוטומטיים", desc: "מדיניות פרטיות, רישום מאגרים, ונהלי אבטחה" },
              { icon: <MessageSquare className="h-6 w-6" />, title: "מענה AI לעובדים", desc: "בוט חכם שעונה על שאלות פרטיות 24/7" },
              { icon: <Lock className="h-6 w-6" />, title: "ניטור ובקרה", desc: "מעקב אחר שינויים, יומן ביקורת מלא" },
              { icon: <Zap className="h-6 w-6" />, title: "עדכונים שוטפים", desc: "המערכת מתעדכנת בהתאם לשינויי רגולציה" },
              { icon: <Building2 className="h-6 w-6" />, title: "מותאם לעסק", desc: "שאלון חכם שמייצר מסמכים רלוונטיים" },
            ].map((f, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="rounded-xl bg-blue-100 w-12 h-12 flex items-center justify-center text-blue-600 mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
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
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-4"><span className="text-4xl font-bold text-blue-600">₪500</span><span className="text-gray-600"> / חודש</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['ממונה הגנת פרטיות מוסמך', 'מדיניות פרטיות מותאמת', 'רישום מאגרי מידע', 'נהלי אבטחת מידע', 'בוט Q&A לעובדים', 'יומן ביקורת', 'עד 2 פניות ברבעון'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>{f}</span></li>
                  ))}
                </ul>
                <Link href="/register?tier=basic" className="block mt-6"><Button className="w-full h-12" size="lg">בחירת חבילה</Button></Link>
              </CardContent>
            </Card>
            <Card className="shadow-xl border-2 border-blue-500">
              <div className="absolute -top-3 right-4"><Badge className="bg-blue-600">הכי פופולרי</Badge></div>
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
                <div className="pt-4"><span className="text-4xl font-bold text-blue-600">₪1,200</span><span className="text-gray-600"> / חודש</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['כל מה שבחבילה הבסיסית', 'סקירה תקופתית של הממונה', 'זמינות מורחבת', 'ליווי באירועי אבטחה', 'דוחות רבעוניים', 'עד 8 פניות ברבעון', 'עדיפות בתגובה'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>{f}</span></li>
                  ))}
                </ul>
                <Link href="/register?tier=extended" className="block mt-6"><Button className="w-full h-12 bg-blue-600" size="lg">בחירת חבילה</Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">שאלות נפוצות</h2>
          <div className="space-y-4">
            {[
              { q: "מי חייב למנות DPO?", a: "על פי תיקון 13, גופים ציבוריים, סוחרי מידע עם מעל 10,000 רשומות, ומעבדי מידע רגיש בהיקף משמעותי." },
              { q: "האם ה-DPO הוא אדם אמיתי?", a: "כן! ממונה אמיתי ומוסמך חותם על המסמכים. המערכת עושה העבודה השוטפת." },
              { q: "מה קורה אם לא ממנים DPO?", a: "קנסות מ-10,000 ₪ עד מיליון ₪. האכיפה כבר החלה." },
              { q: "כמה זמן לוקח להתחיל?", a: "15 דקות להצטרפות, מסמכים אוטומטיים. מינוי רשמי תוך 24-48 שעות." },
            ].map((faq, i) => <FAQItem key={i} question={faq.q} answer={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">האכיפה כבר כאן. אתם מוכנים?</h2>
          <p className="text-xl opacity-90 mb-8">תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO.<br />אל תחכו לקנס - התחילו היום.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"><Button size="lg" variant="secondary" className="gap-2 h-14 px-8">התחילו עכשיו - חינם לשבועיים<ArrowLeft className="h-5 w-5" /></Button></Link>
            <Link href="/calculator"><Button size="lg" className="bg-white/10 border-2 border-white text-white hover:bg-white hover:text-blue-600 h-14 px-8">בדיקה מפורטת + דוח למייל</Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Shield className="h-5 w-5 text-white" /></div>
                <span className="font-bold">DPO-Pro</span>
              </div>
              <p className="text-sm">פתרון AI מקיף להגנת פרטיות ועמידה ברגולציה.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">שירותים</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white">מינוי ממונה</Link></li>
                <li><Link href="/#pricing" className="hover:text-white">מחירים</Link></li>
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
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">© 2026 DPO-Pro. כל הזכויות שמורות.</div>
        </div>
      </footer>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border rounded-xl bg-white shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-5 text-right flex justify-between items-center hover:bg-gray-50">
        <span className="font-semibold">{question}</span>
        <span className={`text-blue-500 text-xl transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      {isOpen && <div className="px-5 pb-5 text-gray-600">{answer}</div>}
    </div>
  )
}
