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
// POLISHED HERO - Premium aesthetic design
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
    <div className="relative w-full max-w-[540px] mx-auto">
      {/* Soft background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-full blur-3xl opacity-60" />
      </div>
      
      <svg viewBox="0 0 540 540" className="w-full h-auto relative z-10">
        <defs>
          {/* Premium skin gradient - smooth and natural */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE4C9" />
            <stop offset="50%" stopColor="#FFDAB9" />
            <stop offset="100%" stopColor="#F5C9A6" />
          </linearGradient>
          
          {/* Rich suit gradient */}
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A90E2" />
            <stop offset="50%" stopColor="#357ABD" />
            <stop offset="100%" stopColor="#2968A8" />
          </linearGradient>
          
          {/* Premium cape gradient with depth */}
          <linearGradient id="capeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="40%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
          
          {/* Cape inner shadow */}
          <linearGradient id="capeInnerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          
          {/* Shield gradient - vibrant */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          
          {/* Hair gradient - rich brown with highlights */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="30%" stopColor="#4E342E" />
            <stop offset="100%" stopColor="#3E2723" />
          </linearGradient>
          
          {/* Hair highlight */}
          <linearGradient id="hairHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8D6E63" />
            <stop offset="100%" stopColor="#6D4C41" />
          </linearGradient>
          
          {/* Mask gradient */}
          <linearGradient id="maskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12"/>
          </filter>
          <filter id="cardShadow">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.08"/>
          </filter>
          <filter id="heroShadow">
            <feDropShadow dx="0" dy="12" stdDeviation="20" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* === FLOATING INFO CARDS === */}
        
        {/* Documents Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="355" y="60" width="105" height="90" rx="16" fill="white" />
            <rect x="375" y="85" width="60" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="375" y="96" width="45" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="375" y="107" width="52" height="5" rx="2.5" fill="#E2E8F0" />
            <circle cx="407" cy="130" r="11" fill="#DBEAFE" />
            <path d="M401 130 L405 134 L414 125" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="407" y="77" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">מסמכים</text>
          </g>
        </g>
        
        {/* Database Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="370" y="175" width="105" height="90" rx="16" fill="white" />
            <g transform="translate(422, 212)">
              <ellipse cx="0" cy="0" rx="22" ry="8" fill="#3B82F6" />
              <rect x="-22" y="0" width="44" height="18" fill="#3B82F6" opacity="0.7" />
              <ellipse cx="0" cy="18" rx="22" ry="8" fill="#3B82F6" opacity="0.5" />
            </g>
            <text x="422" y="250" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">מאגרי מידע</text>
          </g>
        </g>

        {/* Users Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="4.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="355" y="290" width="105" height="90" rx="16" fill="white" />
            <circle cx="390" cy="328" r="14" fill="#BFDBFE" />
            <circle cx="420" cy="328" r="14" fill="#93C5FD" />
            <circle cx="405" cy="345" r="16" fill="#3B82F6" />
            <circle cx="405" cy="338" r="7" fill="white" />
            <text x="405" y="373" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">נתוני לקוחות</text>
          </g>
        </g>

        {/* === HERO CHARACTER === */}
        <g filter="url(#heroShadow)">
          
          {/* CAPE - Beautiful flowing design */}
          <g>
            {/* Main cape body - sweeping flow */}
            <path d="M200 120 
                     C 220 125, 240 140, 255 170
                     C 280 220, 300 290, 310 370
                     Q 320 420, 300 460
                     L 265 455
                     Q 275 415, 270 370
                     C 262 300, 248 240, 235 190
                     C 225 160, 215 140, 200 130
                     Z" 
                  fill="url(#capeGrad)">
              <animate 
                attributeName="d" 
                values="M200 120 C 220 125, 240 140, 255 170 C 280 220, 300 290, 310 370 Q 320 420, 300 460 L 265 455 Q 275 415, 270 370 C 262 300, 248 240, 235 190 C 225 160, 215 140, 200 130 Z;
                        M200 120 C 225 128, 250 148, 270 180 C 300 235, 328 310, 340 390 Q 355 445, 330 480 L 290 472 Q 305 432, 298 385 C 288 310, 268 250, 248 195 C 235 162, 218 138, 200 128 Z;
                        M200 120 C 220 125, 240 140, 255 170 C 280 220, 300 290, 310 370 Q 320 420, 300 460 L 265 455 Q 275 415, 270 370 C 262 300, 248 240, 235 190 C 225 160, 215 140, 200 130 Z" 
                dur="3.5s" 
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            </path>
            
            {/* Cape highlight/fold */}
            <path d="M200 125 
                     C 215 130, 230 145, 242 170
                     C 255 200, 265 240, 272 290
                     L 258 292
                     C 252 245, 244 205, 232 175
                     C 222 152, 212 138, 200 132
                     Z" 
                  fill="url(#capeInnerGrad)" opacity="0.4">
              <animate 
                attributeName="d" 
                values="M200 125 C 215 130, 230 145, 242 170 C 255 200, 265 240, 272 290 L 258 292 C 252 245, 244 205, 232 175 C 222 152, 212 138, 200 132 Z;
                        M200 125 C 218 132, 238 150, 255 182 C 272 218, 288 265, 298 320 L 282 322 C 274 270, 260 222, 245 185 C 232 155, 215 135, 200 130 Z;
                        M200 125 C 215 130, 230 145, 242 170 C 255 200, 265 240, 272 290 L 258 292 C 252 245, 244 205, 232 175 C 222 152, 212 138, 200 132 Z" 
                dur="3.5s" 
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            </path>
          </g>

          {/* BODY */}
          <g transform="translate(75, 100)">
            
            {/* Torso - athletic build */}
            <path d="M75 70 
                     Q 110 60, 145 75
                     L 155 130
                     Q 150 180, 140 210
                     L 80 210
                     Q 70 180, 65 130
                     Z" 
                  fill="url(#suitGrad)" />
            
            {/* Torso highlight */}
            <ellipse cx="115" cy="130" rx="30" ry="22" fill="#60A5FA" opacity="0.15" />
            
            {/* Chest emblem - polished */}
            <g transform="translate(90, 115)">
              <ellipse cx="25" cy="0" rx="30" ry="24" fill="#1E40AF" />
              <ellipse cx="25" cy="0" rx="24" ry="19" fill="#3B82F6" />
              <ellipse cx="25" cy="-2" rx="20" ry="15" fill="#60A5FA" opacity="0.3" />
              <text x="25" y="8" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">P</text>
            </g>

            {/* Belt */}
            <rect x="68" y="195" width="84" height="18" rx="4" fill="#FCD34D" />
            <rect x="100" y="191" width="20" height="26" rx="5" fill="#F59E0B" />
            <ellipse cx="110" cy="204" rx="6" ry="6" fill="#D97706" opacity="0.3" />

            {/* LEGS - Strong stance */}
            {/* Left leg */}
            <path d="M85 210 L75 310 Q 72 325, 80 330 L 100 330 Q 105 325, 102 310 L 105 210 Z" fill="url(#suitGrad)" />
            <ellipse cx="88" cy="332" rx="18" ry="8" fill="#1E3A8A" />
            
            {/* Right leg */}
            <path d="M115 210 L 118 310 Q 120 325, 130 330 L 150 330 Q 155 325, 150 310 L 140 210 Z" fill="url(#suitGrad)" />
            <ellipse cx="140" cy="332" rx="18" ry="8" fill="#1E3A8A" />

            {/* LEFT ARM - Extended holding shield */}
            <path d="M75 80 
                     Q 50 90, 30 120
                     L 15 160
                     Q 8 175, 18 182
                     L 35 178
                     Q 48 145, 68 100
                     Z" 
                  fill="url(#suitGrad)" />
            <ellipse cx="22" cy="178" rx="18" ry="15" fill="url(#skinGrad)" />
            
            {/* Fingers on shield */}
            <ellipse cx="15" cy="172" rx="5" ry="8" fill="url(#skinGrad)" />
            <ellipse cx="28" cy="170" rx="5" ry="8" fill="url(#skinGrad)" />

            {/* RIGHT ARM - Confident pose */}
            <path d="M145 85 
                     Q 165 95, 178 120
                     L 185 155
                     Q 190 172, 180 180
                     L 168 175
                     Q 162 145, 152 110
                     Z" 
                  fill="url(#suitGrad)" />
            <ellipse cx="178" cy="178" rx="15" ry="13" fill="url(#skinGrad)" />

            {/* HEAD - Refined proportions */}
            <g transform="translate(80, -15)">
              {/* Neck */}
              <path d="M25 80 L45 80 L48 95 L22 95 Z" fill="url(#skinGrad)" />
              
              {/* Head shape - refined oval */}
              <ellipse cx="35" cy="42" rx="38" ry="44" fill="url(#skinGrad)" />
              
              {/* Ear hints */}
              <ellipse cx="-2" cy="45" rx="5" ry="8" fill="#F5C9A6" />
              <ellipse cx="72" cy="45" rx="5" ry="8" fill="#F5C9A6" />
              
              {/* HAIR - Styled, full, with volume */}
              {/* Main hair mass */}
              <path d="M0 35 
                       Q -2 18, 10 8
                       Q 25 -5, 45 -2
                       Q 65 0, 75 15
                       Q 80 28, 75 42
                       L 70 38
                       Q 72 28, 68 20
                       Q 60 8, 45 6
                       Q 28 4, 15 15
                       Q 5 25, 5 38
                       Z" 
                    fill="url(#hairGrad)" />
              
              {/* Hair top volume */}
              <path d="M10 12 
                       Q 20 -2, 40 -4
                       Q 58 -2, 68 10
                       Q 62 5, 45 3
                       Q 25 3, 15 12
                       Z" 
                    fill="url(#hairHighlight)" opacity="0.6" />
              
              {/* Hair wave detail */}
              <path d="M15 8 Q 30 0, 50 5 Q 45 2, 35 2 Q 22 3, 15 10" fill="#6D4C41" opacity="0.5" />
              
              {/* Side hair */}
              <path d="M2 38 Q 0 48, 3 55 L 6 52 Q 4 45, 5 38 Z" fill="url(#hairGrad)" />
              <path d="M68 38 Q 72 48, 70 55 L 66 52 Q 68 45, 67 38 Z" fill="url(#hairGrad)" />
              
              {/* MASK - Sleek superhero mask */}
              <path d="M2 35 
                       Q 35 18, 68 35
                       L 72 52
                       Q 35 42, -2 52
                       Z" 
                    fill="url(#maskGrad)" />
              
              {/* Mask edge highlight */}
              <path d="M5 36 Q 35 22, 65 36" stroke="#3B82F6" strokeWidth="1" fill="none" opacity="0.5" />
              
              {/* EYES - Expressive and confident */}
              {/* Left eye */}
              <ellipse cx="20" cy="44" rx="12" ry="13" fill="white" />
              <ellipse cx="22" cy="45" rx="6" ry="7" fill="#1E3A5F" />
              <circle cx="24" cy="43" r="2.5" fill="white" />
              <ellipse cx="20" cy="44" rx="12" ry="13" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
              
              {/* Right eye */}
              <ellipse cx="50" cy="44" rx="12" ry="13" fill="white" />
              <ellipse cx="48" cy="45" rx="6" ry="7" fill="#1E3A5F" />
              <circle cx="50" cy="43" r="2.5" fill="white" />
              <ellipse cx="50" cy="44" rx="12" ry="13" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
              
              {/* Eyebrows - confident expression */}
              <path d="M8 32 Q 15 29, 28 31" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M42 31 Q 55 29, 62 32" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              
              {/* Nose - subtle */}
              <path d="M35 50 L 33 60 Q 35 63, 38 60" stroke="#E5C4A8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              
              {/* Confident smile */}
              <path d="M24 70 Q 35 78, 48 70" fill="none" stroke="#C49A7A" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Chin definition */}
              <path d="M15 75 Q 35 88, 55 75" fill="none" stroke="#F0D0B8" strokeWidth="1" opacity="0.5" />
            </g>
          </g>
        </g>

        {/* === SHIELD - Premium design === */}
        <g transform="translate(35, 270)" filter="url(#softShadow)">
          {/* Shield body */}
          <path d="M55 0 L108 18 L108 72 Q108 120 55 145 Q2 120 2 72 L2 18 Z" fill="url(#shieldGrad)" />
          
          {/* Shield outer ring */}
          <path d="M55 8 L100 24 L100 70 Q100 112 55 135 Q10 112 10 70 L10 24 Z" fill="none" stroke="white" strokeWidth="2" opacity="0.25" />
          
          {/* Shield inner highlight */}
          <path d="M55 20 L90 33 L90 68 Q90 100 55 118 Q20 100 20 68 L20 33 Z" fill="white" opacity="0.1" />
          
          {/* Checkmark */}
          <path d="M35 68 L50 85 L80 48" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          
          {/* Shield shine */}
          <ellipse cx="40" cy="45" rx="15" ry="20" fill="white" opacity="0.1" />
        </g>

        {/* === THREAT BADGE === */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;12,6;0,0" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          <g transform="translate(25, 430)" filter="url(#softShadow)">
            <rect x="0" y="0" width="108" height="40" rx="20" fill="#FEE2E2" stroke="#FECACA" strokeWidth="2" />
            <text x="54" y="26" textAnchor="middle" fontSize="13" fill="#DC2626" fontWeight="600">
              ⚠️ {threats[threatIndex]}
            </text>
          </g>
        </g>

        {/* Impact lines - subtle */}
        <g transform="translate(130, 360)" opacity="0.5">
          <line x1="0" y1="0" x2="-35" y2="25" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.7;0" dur="1.2s" repeatCount="indefinite"/>
          </line>
          <line x1="5" y1="12" x2="-28" y2="42" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.6;0" dur="1.2s" repeatCount="indefinite" begin="0.4s"/>
          </line>
        </g>

        {/* === PROTECTED BADGE === */}
        <g transform="translate(165, 485)" filter="url(#softShadow)">
          <rect x="0" y="0" width="185" height="44" rx="22" fill="#D1FAE5" stroke="#A7F3D0" strokeWidth="2" />
          <circle cx="30" cy="22" r="13" fill="#10B981" />
          <path d="M24 22 L28 26 L37 16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="115" y="28" textAnchor="middle" fontSize="14" fill="#047857" fontWeight="600">הנתונים שלכם מוגנים</text>
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
