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
// HEROIC DEFENDER - Superman-style pose with shield
// ===========================================
function HeroMascot() {
  const [threatIndex, setThreatIndex] = useState(0)
  const threats = ['דליפת מידע', 'פריצה', 'קנס', 'תביעה', 'ביקורת']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setThreatIndex(prev => (prev + 1) % threats.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full max-w-[520px] mx-auto">
      {/* Soft background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50" />
      </div>
      
      <svg viewBox="0 0 520 520" className="w-full h-auto relative z-10">
        <defs>
          {/* Skin gradient - warm tone */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFDBB4" />
            <stop offset="100%" stopColor="#F5C396" />
          </linearGradient>
          {/* Suit gradient */}
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          {/* Cape gradient */}
          <linearGradient id="capeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          {/* Shield gradient */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          {/* Hair gradient */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A3728" />
            <stop offset="100%" stopColor="#2D1F14" />
          </linearGradient>
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15"/>
          </filter>
          <filter id="strongShadow">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.25"/>
          </filter>
        </defs>

        {/* === FLOATING INFO CARDS === */}
        
        {/* Documents Card */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="4s" repeatCount="indefinite"/>
            <rect x="340" y="50" width="95" height="80" rx="14" fill="white" />
            <rect x="358" y="72" width="55" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="358" y="82" width="40" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="358" y="92" width="48" height="5" rx="2.5" fill="#E2E8F0" />
            <circle cx="387" cy="112" r="9" fill="#DBEAFE" />
            <path d="M382 112 L385 115 L393 107" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <text x="387" y="66" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">מסמכים</text>
          </g>
        </g>
        
        {/* Database Card */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" dur="4.5s" repeatCount="indefinite"/>
            <rect x="355" y="155" width="95" height="80" rx="14" fill="white" />
            <g transform="translate(402, 188)">
              <ellipse cx="0" cy="0" rx="20" ry="7" fill="#3B82F6" />
              <rect x="-20" y="0" width="40" height="16" fill="#3B82F6" opacity="0.7" />
              <ellipse cx="0" cy="16" rx="20" ry="7" fill="#3B82F6" opacity="0.5" />
            </g>
            <text x="402" y="223" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">מאגרי מידע</text>
          </g>
        </g>

        {/* Users Card */}
        <g filter="url(#softShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="5s" repeatCount="indefinite"/>
            <rect x="340" y="260" width="95" height="80" rx="14" fill="white" />
            <circle cx="372" cy="292" r="12" fill="#BFDBFE" />
            <circle cx="398" cy="292" r="12" fill="#93C5FD" />
            <circle cx="385" cy="306" r="14" fill="#3B82F6" />
            <circle cx="385" cy="300" r="6" fill="white" />
            <text x="385" y="332" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">נתוני לקוחות</text>
          </g>
        </g>

        {/* === HEROIC CHARACTER - Standing tall, angled pose === */}
        <g transform="translate(75, 55)">
          
          {/* CAPE - Flowing dramatically to the right */}
          <g>
            <path d="M155 95 
                     C 200 110, 240 180, 260 280
                     Q 270 350, 250 400
                     L 220 400
                     Q 200 350, 195 280
                     C 180 200, 165 140, 155 110
                     Z" 
                  fill="url(#capeGrad)">
              <animate 
                attributeName="d" 
                values="M155 95 C 200 110, 240 180, 260 280 Q 270 350, 250 400 L 220 400 Q 200 350, 195 280 C 180 200, 165 140, 155 110 Z;
                        M155 95 C 210 115, 255 185, 280 285 Q 295 360, 270 410 L 235 405 Q 210 355, 200 280 C 185 195, 165 135, 155 110 Z;
                        M155 95 C 200 110, 240 180, 260 280 Q 270 350, 250 400 L 220 400 Q 200 350, 195 280 C 180 200, 165 140, 155 110 Z" 
                dur="3s" 
                repeatCount="indefinite"/>
            </path>
            {/* Cape highlight */}
            <path d="M155 95 C 180 105, 200 130, 210 180 L 195 180 C 175 140, 160 115, 155 105 Z" fill="#2563EB" opacity="0.3"/>
          </g>

          {/* LEGS - Strong stance, slightly apart */}
          {/* Left leg (back) */}
          <path d="M95 285 L85 380 L75 385 L70 380 L72 375 L90 285 Z" fill="url(#suitGrad)" />
          <ellipse cx="75" cy="383" rx="18" ry="8" fill="#1E3A8A" /> {/* Boot */}
          
          {/* Right leg (front) */}
          <path d="M130 285 L145 375 L155 380 L160 375 L158 370 L140 285 Z" fill="url(#suitGrad)" />
          <ellipse cx="155" cy="378" rx="18" ry="8" fill="#1E3A8A" /> {/* Boot */}

          {/* TORSO - Angled heroic pose, chest out */}
          <path d="M70 140 
                   Q 110 130, 155 145
                   L 160 200
                   Q 155 260, 145 290
                   L 80 290
                   Q 70 260, 65 200
                   Z" 
                fill="url(#suitGrad)" />
          
          {/* Chest highlight */}
          <ellipse cx="115" cy="180" rx="35" ry="25" fill="#60A5FA" opacity="0.2" />
          
          {/* Belt */}
          <rect x="68" y="265" width="85" height="16" rx="4" fill="#FCD34D" />
          <rect x="102" y="262" width="20" height="22" rx="4" fill="#F59E0B" />
          <text x="112" y="278" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#92400E">P</text>

          {/* Chest emblem */}
          <g transform="translate(95, 175)">
            <ellipse cx="20" cy="0" rx="28" ry="22" fill="#1E40AF" />
            <ellipse cx="20" cy="0" rx="22" ry="17" fill="#3B82F6" />
            <text x="20" y="7" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">P</text>
          </g>

          {/* LEFT ARM - Extended forward holding shield */}
          <path d="M70 150 
                   Q 40 160, 15 200
                   L 5 240
                   Q 0 250, 10 255
                   L 30 250
                   Q 50 210, 65 170
                   Z" 
                fill="url(#suitGrad)" />
          {/* Left hand */}
          <ellipse cx="12" cy="248" rx="16" ry="14" fill="url(#skinGrad)" />

          {/* RIGHT ARM - On hip, confident pose */}
          <path d="M155 155 
                   Q 175 165, 185 190
                   L 190 230
                   Q 195 245, 185 255
                   L 175 250
                   Q 165 220, 160 180
                   Z" 
                fill="url(#suitGrad)" />
          {/* Right hand on hip */}
          <ellipse cx="183" cy="252" rx="14" ry="12" fill="url(#skinGrad)" />

          {/* HEAD - Confident, looking forward */}
          <g transform="translate(85, 45)">
            {/* Neck */}
            <rect x="20" y="55" width="30" height="20" fill="url(#skinGrad)" />
            
            {/* Head shape */}
            <ellipse cx="35" cy="35" rx="38" ry="42" fill="url(#skinGrad)" />
            
            {/* HAIR - Styled, heroic */}
            <path d="M5 25 
                     Q 10 5, 35 0
                     Q 60 5, 70 25
                     Q 72 35, 68 40
                     L 65 30
                     Q 55 15, 35 12
                     Q 15 15, 8 35
                     Q 3 35, 5 25
                     Z" 
                  fill="url(#hairGrad)" />
            {/* Hair detail/wave */}
            <path d="M25 8 Q 35 2, 50 10" stroke="#3D2817" strokeWidth="3" fill="none" />
            <path d="M15 18 Q 25 10, 40 15" stroke="#5D4330" strokeWidth="2" fill="none" opacity="0.5" />
            
            {/* Mask */}
            <path d="M5 30 
                     Q 35 15, 65 30
                     L 68 45
                     Q 35 35, 2 45
                     Z" 
                  fill="#1D4ED8" />
            
            {/* Eyes - Confident, determined look */}
            <g>
              {/* Left eye */}
              <ellipse cx="22" cy="40" rx="10" ry="11" fill="white" />
              <ellipse cx="24" cy="41" rx="5" ry="6" fill="#1E3A5F" />
              <circle cx="26" cy="39" r="2" fill="white" />
              
              {/* Right eye */}
              <ellipse cx="48" cy="40" rx="10" ry="11" fill="white" />
              <ellipse cx="46" cy="41" rx="5" ry="6" fill="#1E3A5F" />
              <circle cx="48" cy="39" r="2" fill="white" />
            </g>
            
            {/* Confident smirk */}
            <path d="M25 58 Q 35 65, 48 60" fill="none" stroke="#C48B6E" strokeWidth="3" strokeLinecap="round" />
            
            {/* Jaw line definition */}
            <path d="M5 50 Q 10 70, 35 75 Q 60 70, 65 50" fill="none" stroke="#E5B898" strokeWidth="1" opacity="0.5" />
          </g>
        </g>

        {/* === SHIELD - Held forward, actively blocking === */}
        <g transform="translate(25, 240)" filter="url(#strongShadow)">
          <g>
            {/* Shield body */}
            <path d="M60 0 L115 18 L115 75 Q115 125 60 150 Q5 125 5 75 L5 18 Z" fill="url(#shieldGrad)" />
            {/* Shield highlight */}
            <path d="M60 10 L105 25 L105 72 Q105 115 60 138 Q15 115 15 72 L15 25 Z" fill="white" opacity="0.15" />
            {/* Inner ring */}
            <path d="M60 25 L95 38 L95 70 Q95 105 60 125 Q25 105 25 70 L25 38 Z" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
            {/* Checkmark */}
            <path d="M40 70 L55 85 L85 50" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </g>

        {/* === INCOMING THREATS - Moving toward shield === */}
        
        {/* Threat 1 - Main threat badge */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;15,8;0,0" dur="2s" repeatCount="indefinite"/>
          <g transform="translate(5, 380)">
            <rect x="0" y="0" width="100" height="36" rx="18" fill="#FEE2E2" stroke="#F87171" strokeWidth="2" />
            <text x="50" y="24" textAnchor="middle" fontSize="12" fill="#DC2626" fontWeight="600">
              ⚠️ {threats[threatIndex]}
            </text>
          </g>
        </g>

        {/* Impact/block effect lines */}
        <g transform="translate(110, 320)">
          <line x1="0" y1="0" x2="-30" y2="20" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" opacity="0.6">
            <animate attributeName="opacity" values="0;0.8;0" dur="1s" repeatCount="indefinite"/>
          </line>
          <line x1="5" y1="15" x2="-25" y2="40" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" opacity="0.5">
            <animate attributeName="opacity" values="0;0.7;0" dur="1s" repeatCount="indefinite" begin="0.3s"/>
          </line>
          <line x1="-5" y1="25" x2="-35" y2="35" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.4">
            <animate attributeName="opacity" values="0;0.6;0" dur="1s" repeatCount="indefinite" begin="0.6s"/>
          </line>
        </g>

        {/* Small spark effects on shield */}
        <g transform="translate(80, 310)">
          <circle r="4" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"/>
            <animate attributeName="r" values="2;6;2" dur="0.8s" repeatCount="indefinite"/>
          </circle>
        </g>
        <g transform="translate(50, 350)">
          <circle r="3" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" begin="0.4s"/>
            <animate attributeName="r" values="1;5;1" dur="0.8s" repeatCount="indefinite" begin="0.4s"/>
          </circle>
        </g>

        {/* === PROTECTED BADGE === */}
        <g transform="translate(150, 460)" filter="url(#softShadow)">
          <rect x="0" y="0" width="180" height="42" rx="21" fill="#D1FAE5" stroke="#34D399" strokeWidth="2" />
          <circle cx="28" cy="21" r="12" fill="#10B981" />
          <path d="M22 21 L26 25 L35 15" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <text x="110" y="27" textAnchor="middle" fontSize="13" fill="#047857" fontWeight="600">הנתונים שלכם מוגנים</text>
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
