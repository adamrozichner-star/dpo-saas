'use client'

import { Shield, X, Eye, Lock, BarChart3, FileText, Clock, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UnpaidWelcomeModalProps {
  orgName: string
  complianceScore: number
  gapCount: number
  onClose: () => void
}

export default function UnpaidWelcomeModal({
  orgName,
  complianceScore,
  gapCount,
  onClose,
}: UnpaidWelcomeModalProps) {
  const router = useRouter()
  const scoreColor = complianceScore >= 70 ? '#059669' : complianceScore >= 40 ? '#d97706' : '#dc2626'

  const features = [
    { icon: BarChart3, text: 'ציון ציות + ניתוח פערים', free: true },
    { icon: FileText, text: `כותרות מסמכים מותאמים`, free: true },
    { icon: Clock, text: 'לוח זמנים ותזכורות', free: true },
    { icon: Shield, text: 'מינוי ממונה + ביצוע פעולות', free: false },
    { icon: MessageCircle, text: 'צ׳אט עם הממונה', free: false },
    { icon: FileText, text: 'מסמכים מלאים + חתימה', free: false },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full relative overflow-hidden"
        style={{
          maxWidth: 420,
          borderRadius: 20,
          background: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          animation: 'modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div
          className="text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2563eb 100%)',
            padding: '32px 28px 44px',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/15 flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-[22px] font-extrabold text-white mb-1">
              הניתוח שלכם מוכן
            </h2>
            <p className="text-blue-200/80 text-sm">{orgName}</p>
          </div>
        </div>

        {/* Score card — overlapping header */}
        <div className="px-7 relative" style={{ marginTop: -24, zIndex: 2 }}>
          <div
            className="text-center"
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '20px 24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid #f1f5f9',
            }}
          >
            <div className="text-[13px] text-gray-400 mb-1">ציון ציות נוכחי</div>
            <div className="flex items-baseline justify-center gap-1">
              <span
                className="text-[52px] font-black leading-none"
                style={{ color: scoreColor, letterSpacing: '-2px' }}
              >
                {complianceScore}
              </span>
              <span className="text-lg text-gray-300 font-semibold">/100</span>
            </div>
            {gapCount > 0 && (
              <div
                className="mt-2 inline-block text-xs font-semibold rounded-lg px-3 py-1.5"
                style={{ background: '#fef2f2', color: '#991b1b' }}
              >
                ⚠️ {gapCount} פערים זוהו · חשיפה לקנסות
              </div>
            )}
          </div>
        </div>

        {/* Feature list */}
        <div className="px-7 pt-5">
          <div className="text-[13px] font-bold text-gray-600 mb-2.5">
            מה תוכלו לראות כאן:
          </div>
          <div className="flex flex-col gap-1.5">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                  style={{
                    background: f.free ? '#f0fdf4' : '#f8fafc',
                    opacity: f.free ? 1 : 0.55,
                  }}
                >
                  <Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: f.free ? '#15803d' : '#94a3b8' }}
                  />
                  <span
                    className="flex-1 text-[13px] font-medium"
                    style={{ color: f.free ? '#15803d' : '#94a3b8' }}
                  >
                    {f.text}
                  </span>
                  {f.free ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTAs */}
        <div className="px-7 pt-5 pb-7">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-white text-[15px] font-bold rounded-xl border-none cursor-pointer transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
          >
            צפייה בלוח הבקרה ←
          </button>
          <p className="text-center text-[12px] text-gray-400 mt-2.5">
            ניתן להפעיל את המערכת המלאה בכל עת · ₪500/חודש
          </p>
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
