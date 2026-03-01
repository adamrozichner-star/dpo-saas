'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, X, CheckCircle2 } from 'lucide-react'

interface WelcomeModalProps {
  orgName: string
  documentsCount: number
  complianceScore: number
  dpoName?: string
  topAction?: string
  onClose: () => void
  v3Answers?: any // kept for backward compat
}

export default function WelcomeModal({
  orgName,
  documentsCount,
  complianceScore,
  dpoName = 'עו״ד דנה כהן',
  topAction = 'חתימה על כתב מינוי DPO',
  onClose,
}: WelcomeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Confetti
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#059669', '#10b981', '#34d399', '#6ee7b7',
      '#3b82f6', '#6366f1', '#f59e0b', '#fbbf24',
      '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16',
    ]

    interface P {
      x: number; y: number; vx: number; vy: number
      w: number; h: number; color: string; rot: number
      rs: number; g: number; op: number
      shape: 'rect' | 'circle' | 'strip'
    }

    const particles: P[] = []
    for (let i = 0; i < 150; i++) {
      const bx = canvas.width * (0.2 + Math.random() * 0.6)
      const a = Math.random() * Math.PI * 2
      const s = 4 + Math.random() * 10
      const shapes: P['shape'][] = ['rect', 'circle', 'strip']
      particles.push({
        x: bx, y: canvas.height * 0.25 + Math.random() * canvas.height * 0.1,
        vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(a) * s) - Math.random() * 5,
        w: 4 + Math.random() * 7, h: 4 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360, rs: (Math.random() - 0.5) * 10,
        g: 0.12 + Math.random() * 0.06, op: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      })
    }

    let frame: number
    let elapsed = 0
    const animate = () => {
      elapsed++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = 0
      for (const p of particles) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.rs
        if (elapsed > 150) p.op -= 0.01
        if (p.op <= 0 || p.y > canvas.height + 50) continue
        alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.op)
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill()
        } else if (p.shape === 'strip') {
          ctx.fillRect(-p.w / 2, -p.h, p.w * 0.6, p.h * 1.5)
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }
      if (alive > 0 && elapsed < 350) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const completed = [
    'מינוי ממונה הגנת פרטיות',
    `${documentsCount || 6} מסמכי ציות הופקו`,
    'הפעלת ניטור ציות שוטף',
    'ערוץ תקשורת עם הממונה',
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[60]" />

      <div
        className="w-full relative z-50 overflow-hidden"
        style={{
          maxWidth: 440,
          borderRadius: 24,
          background: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          border: '1px solid rgba(5,150,105,0.12)',
          animation: 'modal-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration header */}
        <div
          className="text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #064e3b 0%, #065f46 50%, #059669 100%)',
            padding: '28px 28px 36px',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.04,
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative z-[1]">
            <div className="text-[44px] mb-1">🎉</div>
            <h2 className="text-[22px] font-extrabold text-white mb-1">
              המערכת פעילה!
            </h2>
            <p className="text-emerald-200/80 text-sm">
              {orgName} מוגנת מעכשיו
            </p>
          </div>
        </div>

        {/* DPO + Docs cards */}
        <div className="px-6 relative" style={{ marginTop: -18, zIndex: 2 }}>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="text-center"
              style={{
                background: '#fff', borderRadius: 14, padding: '16px 12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #d1fae5',
              }}
            >
              <div className="text-[26px] mb-1">🛡️</div>
              <div className="text-[13px] font-bold text-emerald-800">ממונה מונתה</div>
              <div className="text-[12px] text-emerald-600">{dpoName}</div>
            </div>
            <div
              className="text-center"
              style={{
                background: '#fff', borderRadius: 14, padding: '16px 12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #bfdbfe',
              }}
            >
              <div className="text-[26px] mb-1">📄</div>
              <div className="text-[13px] font-bold text-blue-800">{documentsCount || 6} מסמכים</div>
              <div className="text-[12px] text-blue-600">הופקו ואושרו</div>
            </div>
          </div>
        </div>

        {/* Completed checklist */}
        <div className="px-6 pt-5">
          <div className="text-[13px] font-bold text-gray-600 mb-2.5">הושלם עבורכם:</div>
          {completed.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5"
              style={{
                padding: '8px 0',
                borderBottom: i < completed.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 22, height: 22, borderRadius: 7,
                  background: '#ecfdf5', color: '#059669',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                ✓
              </div>
              <span className="text-[13px] text-gray-600 font-medium">{item}</span>
            </div>
          ))}
        </div>

        {/* First action */}
        <div className="px-6 pt-4">
          <div
            className="flex items-start gap-3"
            style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 14, padding: '16px 18px', border: '1px solid #fde68a',
            }}
          >
            <span className="text-[20px] flex-shrink-0">⚡</span>
            <div>
              <div className="text-[13px] font-bold text-amber-800 mb-0.5">
                הצעד הראשון שלכם:
              </div>
              <div className="text-[13px] text-amber-700">
                {topAction} — זה המסמך שהרשות מבקשת ראשון בביקורת.
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pt-4 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-white text-[15px] font-bold rounded-xl border-none cursor-pointer transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              boxShadow: '0 4px 20px rgba(5,150,105,0.3)',
            }}
          >
            בואו נתחיל ←
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
