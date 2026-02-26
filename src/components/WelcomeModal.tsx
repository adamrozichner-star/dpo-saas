'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Shield, CheckCircle2, X, Sparkles,
  AlertTriangle, Database, ClipboardList
} from 'lucide-react'

interface WelcomeModalProps {
  orgName: string
  documentsCount: number
  complianceScore: number
  onClose: () => void
  v3Answers?: any
}

export default function WelcomeModal({ 
  orgName, documentsCount, complianceScore, onClose, v3Answers
}: WelcomeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Derive personalized data from v3Answers
  const dbs = v3Answers?.databases || []
  const customDbs = v3Answers?.customDatabases || []
  const dbCount = dbs.length + customDbs.length
  const processors = v3Answers?.processors || []
  const customProcessors = v3Answers?.customProcessors || []
  const processorCount = processors.length + customProcessors.length
  const hasConsent = v3Answers?.hasConsent
  const accessControl = v3Answers?.accessControl
  const industry = v3Answers?.industry

  // Determine security level
  const SIZE_NUMS: Record<string, number> = { 'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000 }
  const totalRecords = Object.values(v3Answers?.dbDetails || {}).reduce((sum: number, d: any) => sum + (SIZE_NUMS[d?.size] || 50), 0)
  const hasMedical = dbs.includes('medical')
  const isHealthOrFinance = industry === 'health' || industry === 'finance'
  const isHighSecurity = totalRecords >= 100000 || hasMedical || isHealthOrFinance
  const securityLevel = isHighSecurity ? 'גבוהה' : totalRecords >= 10000 ? 'בינונית' : 'בסיסית'
  const securityColor = isHighSecurity ? 'text-red-600' : totalRecords >= 10000 ? 'text-amber-600' : 'text-emerald-600'

  // Reporting obligation
  const needsReporting = isHighSecurity || totalRecords >= 100000

  // Count pending user actions
  const userActions: string[] = []
  userActions.push('חתימה על כתב מינוי DPO')
  if (hasConsent === 'no') userActions.push('הטמעת מנגנון הסכמה באתר')
  if (processorCount > 0) userActions.push(`${processorCount} הסכמי עיבוד מידע לספקים`)
  if (accessControl === 'all') userActions.push('הגדרת בקרת גישה למאגרים')

  // Canvas confetti — dramatic burst
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
      '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#84cc16',
      '#fbbf24', '#34d399', '#818cf8', '#fb923c'
    ]

    interface Particle {
      x: number; y: number; vx: number; vy: number
      w: number; h: number; color: string; rotation: number
      rotSpeed: number; gravity: number; opacity: number
      shape: 'rect' | 'circle' | 'strip'
    }

    const particles: Particle[] = []
    const TOTAL = 200

    // Burst from multiple origin points across top
    for (let i = 0; i < TOTAL; i++) {
      const burstX = canvas.width * (0.2 + Math.random() * 0.6)
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 12
      const shapes: Particle['shape'][] = ['rect', 'circle', 'strip']
      particles.push({
        x: burstX,
        y: canvas.height * 0.25 + Math.random() * canvas.height * 0.1,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(angle) * speed) - Math.random() * 6,
        w: 4 + Math.random() * 8,
        h: 4 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.12 + Math.random() * 0.08,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      })
    }

    let frame: number
    let elapsed = 0
    const animate = () => {
      elapsed++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      for (const p of particles) {
        p.vy += p.gravity
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rotation += p.rotSpeed

        if (elapsed > 180) p.opacity -= 0.008
        if (p.opacity <= 0 || p.y > canvas.height + 50) continue
        alive++

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'strip') {
          ctx.fillRect(-p.w / 2, -p.h, p.w * 0.6, p.h * 1.5)
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }

      if (alive > 0 && elapsed < 400) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      {/* Canvas confetti */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[60]" />

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl relative z-50 overflow-hidden"
        style={{ animation: 'modal-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <button onClick={onClose} className="absolute top-4 left-4 text-white/70 hover:text-white z-10">
          <X className="h-5 w-5" />
        </button>

        {/* Header gradient with prominent company name */}
        <div className="bg-gradient-to-l from-indigo-600 via-blue-600 to-violet-700 px-8 pt-7 pb-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">🎉 ברוכים הבאים ל-MyDPO!</h2>
          <div className="inline-block bg-white/15 backdrop-blur-sm rounded-xl px-6 py-2.5">
            <span className="text-xl font-bold text-white">{orgName}</span>
          </div>
          <p className="text-blue-200 text-sm mt-2">הממונה שלכם כבר עובדת — עו״ד דנה כהן</p>
        </div>

        {/* Content — two columns on wide layout */}
        <div className="px-8 py-5">
          {/* Stats row — 4 across */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              על בסיס הנתונים שהזנתם
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{dbCount}</div>
                <div className="text-[11px] text-indigo-600">מאגרי מידע</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${securityColor}`}>{securityLevel}</div>
                <div className="text-[11px] text-gray-600">רמת אבטחה</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{documentsCount || 4}</div>
                <div className="text-[11px] text-emerald-600">מסמכים נוצרו</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">✓</div>
                <div className="text-[11px] text-emerald-600">DPO ממונה</div>
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-5 mb-4">
            {/* Steps */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                3 צעדים לציות מלא
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-emerald-800">מינוי ממונה</div>
                    <div className="text-[11px] text-emerald-600">בוצע — עו״ד דנה כהן</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[11px] font-bold">2</div>
                  <div>
                    <div className="font-semibold text-sm text-amber-800">אישור מסמכים</div>
                    <div className="text-[11px] text-amber-600">{documentsCount || 4} מסמכים — סקירה תוך 48 שעות</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[11px] font-bold">3</div>
                  <div>
                    <div className="font-semibold text-sm text-blue-800">פעולות נדרשות</div>
                    <div className="text-[11px] text-blue-600">{userActions.length} פעולות ממתינות בלוח הבקרה</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: reporting + actions */}
            <div className="flex flex-col gap-3">
              {needsReporting && (
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-red-800">חובת דיווח לרשות</div>
                    <div className="text-[11px] text-red-600 mt-0.5">קיימת חובת רישום. נכין עבורכם את הטפסים.</div>
                  </div>
                </div>
              )}

              {userActions.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl flex-1">
                  <div className="text-xs font-semibold text-gray-500 mb-2">פעולות שממתינות לכם:</div>
                  {userActions.slice(0, 4).map((action, i) => (
                    <div key={i} className="text-xs text-gray-600 py-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {action}
                    </div>
                  ))}
                  {userActions.length > 4 && (
                    <div className="text-xs text-gray-400 mt-1">+{userActions.length - 4} נוספות</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl text-white text-base font-bold cursor-pointer border-none shadow-lg hover:shadow-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
          >
            המשך ללוח הבקרה ←
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
