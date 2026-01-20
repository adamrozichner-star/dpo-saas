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
// WARRIOR DEFENDER - Spartan-inspired intense fighter
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
      
      <svg viewBox="0 0 560 560" className="w-full h-auto relative z-10">
        <defs>
          {/* Skin gradient */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D0B5" />
            <stop offset="50%" stopColor="#E8C4A0" />
            <stop offset="100%" stopColor="#D4A574" />
          </linearGradient>
          
          {/* Suit gradient */}
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A90E2" />
            <stop offset="50%" stopColor="#357ABD" />
            <stop offset="100%" stopColor="#2968A8" />
          </linearGradient>
          
          {/* Cape gradient */}
          <linearGradient id="capeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="40%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
          
          <linearGradient id="capeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          
          {/* Shield gradient */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          
          {/* Hair/beard gradient - dark warrior hair */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2D2319" />
            <stop offset="100%" stopColor="#1A1410" />
          </linearGradient>
          
          {/* Mask gradient */}
          <linearGradient id="maskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Threat gradient */}
          <linearGradient id="threatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEE2E2" />
            <stop offset="100%" stopColor="#FECACA" />
          </linearGradient>
          
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12"/>
          </filter>
          <filter id="cardShadow">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.08"/>
          </filter>
          <filter id="heroGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="15" floodOpacity="0.1" floodColor="#3B82F6"/>
          </filter>
        </defs>

        {/* === INCOMING THREATS FROM ABOVE-LEFT === */}
        
        {/* Threat 1 - Main threat coming from top-left */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;25,20;0,0" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          <g transform="translate(30, 80)" filter="url(#softShadow)">
            <rect x="0" y="0" width="105" height="38" rx="19" fill="url(#threatGrad)" stroke="#F87171" strokeWidth="2" />
            <text x="52" y="25" textAnchor="middle" fontSize="12" fill="#DC2626" fontWeight="600">
              ⚠️ {threats[threatIndex]}
            </text>
          </g>
        </g>

        {/* Threat 2 - Secondary threat */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;20,25;0,0" dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          <g transform="translate(80, 25)" filter="url(#softShadow)">
            <rect x="0" y="0" width="85" height="32" rx="16" fill="url(#threatGrad)" stroke="#F87171" strokeWidth="2" opacity="0.8" />
            <text x="42" y="21" textAnchor="middle" fontSize="11" fill="#DC2626" fontWeight="600">
              ⚠️ קנס
            </text>
          </g>
        </g>

        {/* Threat 3 - Third threat */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;18,22;0,0" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          <g transform="translate(5, 150)" filter="url(#softShadow)">
            <rect x="0" y="0" width="80" height="32" rx="16" fill="url(#threatGrad)" stroke="#F87171" strokeWidth="2" opacity="0.7" />
            <text x="40" y="21" textAnchor="middle" fontSize="11" fill="#DC2626" fontWeight="600">
              ⚠️ תביעה
            </text>
          </g>
        </g>

        {/* Impact lines from threats to shield */}
        <g transform="translate(160, 180)" opacity="0.6">
          <line x1="-40" y1="-60" x2="0" y2="0" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 4">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" repeatCount="indefinite"/>
          </line>
          <line x1="-80" y1="-40" x2="-10" y2="20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 4">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.2s" repeatCount="indefinite" begin="0.3s"/>
          </line>
          <line x1="-90" y1="0" x2="-20" y2="40" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 4">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.4s" repeatCount="indefinite" begin="0.6s"/>
          </line>
        </g>

        {/* Block spark effects */}
        <g transform="translate(155, 175)">
          <circle r="5" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="indefinite"/>
            <animate attributeName="r" values="3;8;3" dur="0.6s" repeatCount="indefinite"/>
          </circle>
        </g>
        <g transform="translate(140, 200)">
          <circle r="4" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="0.7s" repeatCount="indefinite" begin="0.2s"/>
            <animate attributeName="r" values="2;6;2" dur="0.7s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
        </g>

        {/* === FLOATING INFO CARDS === */}
        
        {/* Documents Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="380" y="100" width="105" height="90" rx="16" fill="white" />
            <rect x="400" y="125" width="60" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="400" y="136" width="45" height="5" rx="2.5" fill="#E2E8F0" />
            <rect x="400" y="147" width="52" height="5" rx="2.5" fill="#E2E8F0" />
            <circle cx="432" cy="170" r="11" fill="#DBEAFE" />
            <path d="M426 170 L430 174 L439 165" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="432" y="117" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">מסמכים</text>
          </g>
        </g>
        
        {/* Database Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="395" y="215" width="105" height="90" rx="16" fill="white" />
            <g transform="translate(447, 252)">
              <ellipse cx="0" cy="0" rx="22" ry="8" fill="#3B82F6" />
              <rect x="-22" y="0" width="44" height="18" fill="#3B82F6" opacity="0.7" />
              <ellipse cx="0" cy="18" rx="22" ry="8" fill="#3B82F6" opacity="0.5" />
            </g>
            <text x="447" y="290" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">מאגרי מידע</text>
          </g>
        </g>

        {/* Users Card */}
        <g filter="url(#cardShadow)">
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="4.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <rect x="380" y="330" width="105" height="90" rx="16" fill="white" />
            <circle cx="415" cy="368" r="14" fill="#BFDBFE" />
            <circle cx="445" cy="368" r="14" fill="#93C5FD" />
            <circle cx="430" cy="385" r="16" fill="#3B82F6" />
            <circle cx="430" cy="378" r="7" fill="white" />
            <text x="430" y="413" textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">נתוני לקוחות</text>
          </g>
        </g>

        {/* === WARRIOR HERO === */}
        <g filter="url(#heroGlow)">
          
          {/* CAPE - Starting from SHOULDERS, flowing dramatically */}
          <g>
            {/* Cape attachment point is at shoulders */}
            <path d="M255 195
                     C 280 200, 310 230, 330 290
                     C 355 370, 365 430, 350 490
                     L 310 485
                     C 318 430, 312 375, 295 305
                     C 280 250, 265 220, 255 205
                     Z" 
                  fill="url(#capeGrad)">
              <animate 
                attributeName="d" 
                values="M255 195 C 280 200, 310 230, 330 290 C 355 370, 365 430, 350 490 L 310 485 C 318 430, 312 375, 295 305 C 280 250, 265 220, 255 205 Z;
                        M255 195 C 290 205, 330 245, 360 315 C 395 400, 410 465, 390 525 L 345 518 C 358 460, 348 400, 325 325 C 300 260, 275 218, 255 203 Z;
                        M255 195 C 280 200, 310 230, 330 290 C 355 370, 365 430, 350 490 L 310 485 C 318 430, 312 375, 295 305 C 280 250, 265 220, 255 205 Z" 
                dur="3s" 
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            </path>
            
            {/* Cape fold/highlight */}
            <path d="M255 200
                     C 275 205, 295 230, 310 275
                     C 325 320, 332 360, 330 400
                     L 315 398
                     C 316 362, 310 325, 298 285
                     C 285 245, 268 218, 255 208
                     Z" 
                  fill="url(#capeHighlight)" opacity="0.3">
              <animate 
                attributeName="d" 
                values="M255 200 C 275 205, 295 230, 310 275 C 325 320, 332 360, 330 400 L 315 398 C 316 362, 310 325, 298 285 C 285 245, 268 218, 255 208 Z;
                        M255 200 C 285 208, 315 245, 340 300 C 365 360, 378 410, 372 455 L 355 452 C 358 408, 348 360, 328 305 C 305 255, 278 218, 255 206 Z;
                        M255 200 C 275 205, 295 230, 310 275 C 325 320, 332 360, 330 400 L 315 398 C 316 362, 310 325, 298 285 C 285 245, 268 218, 255 208 Z" 
                dur="3s" 
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            </path>
          </g>

          {/* BODY */}
          <g transform="translate(135, 160)">
            
            {/* Torso */}
            <path d="M60 50 
                     Q 95 40, 130 55
                     L 140 115
                     Q 135 170, 125 200
                     L 65 200
                     Q 55 170, 50 115
                     Z" 
                  fill="url(#suitGrad)" />
            
            {/* Shoulder pads - cape attachment */}
            <ellipse cx="60" cy="55" rx="18" ry="12" fill="#2563EB" />
            <ellipse cx="130" cy="55" rx="18" ry="12" fill="#2563EB" />
            
            {/* Chest emblem */}
            <g transform="translate(70, 95)">
              <ellipse cx="25" cy="0" rx="28" ry="22" fill="#1E40AF" />
              <ellipse cx="25" cy="0" rx="22" ry="17" fill="#3B82F6" />
              <text x="25" y="8" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">P</text>
            </g>

            {/* Belt */}
            <rect x="53" y="185" width="84" height="18" rx="4" fill="#FCD34D" />
            <rect x="85" y="181" width="20" height="26" rx="5" fill="#F59E0B" />

            {/* LEGS */}
            <path d="M70 200 L60 305 Q 57 320, 65 325 L 85 325 Q 90 320, 87 305 L 90 200 Z" fill="url(#suitGrad)" />
            <ellipse cx="73" cy="327" rx="18" ry="8" fill="#1E3A8A" />
            
            <path d="M100 200 L103 305 Q 105 320, 115 325 L 135 325 Q 140 320, 135 305 L 125 200 Z" fill="url(#suitGrad)" />
            <ellipse cx="125" cy="327" rx="18" ry="8" fill="#1E3A8A" />

            {/* LEFT ARM - RAISED UP holding shield to block from above */}
            <path d="M55 60 
                     Q 25 50, 5 25
                     L -15 -10
                     Q -25 -20, -20 -30
                     L -5 -25
                     Q 15 0, 45 35
                     Z" 
                  fill="url(#suitGrad)" />
            <ellipse cx="-12" cy="-22" rx="18" ry="15" fill="url(#skinGrad)" transform="rotate(-20)" />

            {/* RIGHT ARM - Tense, ready position */}
            <path d="M130 65 
                     Q 155 75, 168 100
                     L 175 140
                     Q 180 158, 170 165
                     L 158 160
                     Q 152 130, 140 90
                     Z" 
                  fill="url(#suitGrad)" />
            <ellipse cx="168" cy="163" rx="15" ry="13" fill="url(#skinGrad)" />

            {/* HEAD - WARRIOR FACE - Intense Leonidas style */}
            <g transform="translate(65, -55)">
              {/* Neck - thicker, muscular */}
              <path d="M18 100 L52 100 L55 115 L15 115 Z" fill="url(#skinGrad)" />
              
              {/* Head shape - more angular, masculine */}
              <path d="M5 50 
                       Q 5 20, 35 15
                       Q 65 20, 65 50
                       Q 68 75, 55 95
                       L 15 95
                       Q 2 75, 5 50
                       Z" 
                    fill="url(#skinGrad)" />
              
              {/* HAIR - Short, dark, warrior style */}
              <path d="M5 45 
                       Q 3 25, 15 15
                       Q 35 5, 55 15
                       Q 67 25, 65 45
                       L 62 42
                       Q 63 28, 52 20
                       Q 35 12, 18 20
                       Q 8 28, 8 42
                       Z" 
                    fill="url(#hairGrad)" />
              
              {/* Hair texture lines */}
              <path d="M15 18 Q 25 12, 35 12 Q 45 12, 55 18" stroke="#1A1410" strokeWidth="2" fill="none" opacity="0.5" />
              <path d="M12 25 L 18 35" stroke="#1A1410" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M58 25 L 52 35" stroke="#1A1410" strokeWidth="1.5" fill="none" opacity="0.3" />
              
              {/* BEARD - Short stubble/beard like Leonidas */}
              <path d="M10 70 
                       Q 10 85, 25 92
                       Q 35 95, 45 92
                       Q 60 85, 60 70
                       L 58 72
                       Q 57 82, 45 88
                       Q 35 90, 25 88
                       Q 13 82, 12 72
                       Z" 
                    fill="url(#hairGrad)" opacity="0.7" />
              
              {/* Beard texture */}
              <path d="M20 78 L22 85" stroke="#1A1410" strokeWidth="1" opacity="0.4" />
              <path d="M30 80 L31 88" stroke="#1A1410" strokeWidth="1" opacity="0.4" />
              <path d="M40 80 L39 88" stroke="#1A1410" strokeWidth="1" opacity="0.4" />
              <path d="M50 78 L48 85" stroke="#1A1410" strokeWidth="1" opacity="0.4" />
              
              {/* MASK */}
              <path d="M5 42 
                       Q 35 28, 65 42
                       L 68 58
                       Q 35 48, 2 58
                       Z" 
                    fill="url(#maskGrad)" />
              
              {/* EYES - INTENSE, ANGRY, warrior stare */}
              {/* Left eye */}
              <g>
                <ellipse cx="22" cy="52" rx="11" ry="9" fill="white" />
                <ellipse cx="24" cy="53" rx="6" ry="6" fill="#1A1410" />
                <circle cx="25" cy="51" r="2" fill="white" />
                {/* Angry eyebrow - furrowed DOWN */}
                <path d="M8 40 Q 18 44, 32 42" stroke="#1A1410" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
              
              {/* Right eye */}
              <g>
                <ellipse cx="48" cy="52" rx="11" ry="9" fill="white" />
                <ellipse cx="46" cy="53" rx="6" ry="6" fill="#1A1410" />
                <circle cx="47" cy="51" r="2" fill="white" />
                {/* Angry eyebrow - furrowed DOWN */}
                <path d="M38 42 Q 52 44, 62 40" stroke="#1A1410" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
              
              {/* Forehead crease - showing intensity */}
              <path d="M25 38 L30 40 L35 38" stroke="#D4A574" strokeWidth="1" fill="none" opacity="0.5" />
              <path d="M35 38 L40 40 L45 38" stroke="#D4A574" strokeWidth="1" fill="none" opacity="0.5" />
              
              {/* Nose - strong, defined */}
              <path d="M35 55 L 32 68 Q 35 72, 40 68 L 37 55" fill="#D4A574" opacity="0.3" />
              <path d="M32 68 Q 35 72, 40 68" stroke="#C49A7A" strokeWidth="1.5" fill="none" />
              
              {/* MOUTH - BATTLE CRY / INTENSE GRIMACE */}
              <path d="M20 78 
                       Q 25 72, 35 72
                       Q 45 72, 50 78
                       Q 45 83, 35 83
                       Q 25 83, 20 78
                       Z" 
                    fill="#8B4513" />
              {/* Teeth showing - battle cry */}
              <path d="M24 76 L46 76 L46 79 L24 79 Z" fill="white" />
              {/* Teeth line */}
              <line x1="28" y1="76" x2="28" y2="79" stroke="#D4A574" strokeWidth="0.5" />
              <line x1="32" y1="76" x2="32" y2="79" stroke="#D4A574" strokeWidth="0.5" />
              <line x1="35" y1="76" x2="35" y2="79" stroke="#D4A574" strokeWidth="0.5" />
              <line x1="38" y1="76" x2="38" y2="79" stroke="#D4A574" strokeWidth="0.5" />
              <line x1="42" y1="76" x2="42" y2="79" stroke="#D4A574" strokeWidth="0.5" />
              
              {/* Jaw muscles - tense */}
              <path d="M8 65 Q 5 75, 12 88" stroke="#D4A574" strokeWidth="1" fill="none" opacity="0.4" />
              <path d="M62 65 Q 65 75, 58 88" stroke="#D4A574" strokeWidth="1" fill="none" opacity="0.4" />
            </g>
          </g>
        </g>

        {/* === SHIELD - RAISED UP to block from above === */}
        <g transform="translate(95, 115) rotate(-25)" filter="url(#softShadow)">
          {/* Shield body */}
          <path d="M55 0 L108 18 L108 72 Q108 120 55 145 Q2 120 2 72 L2 18 Z" fill="url(#shieldGrad)" />
          
          {/* Shield rings */}
          <path d="M55 8 L100 24 L100 70 Q100 112 55 135 Q10 112 10 70 L10 24 Z" fill="none" stroke="white" strokeWidth="2" opacity="0.25" />
          <path d="M55 20 L90 33 L90 68 Q90 100 55 118 Q20 100 20 68 L20 33 Z" fill="white" opacity="0.1" />
          
          {/* Checkmark */}
          <path d="M35 68 L50 85 L80 48" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          
          {/* Shield shine */}
          <ellipse cx="40" cy="45" rx="15" ry="20" fill="white" opacity="0.15" />
        </g>

        {/* === PROTECTED BADGE === */}
        <g transform="translate(175, 505)" filter="url(#softShadow)">
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
