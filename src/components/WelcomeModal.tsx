'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, FileText, CheckCircle2, X, Sparkles,
  AlertTriangle, Database, ClipboardList
} from 'lucide-react'

interface WelcomeModalProps {
  orgName: string
  documentsCount: number
  complianceScore: number
  onClose: () => void
  v3Answers?: any
}

const ConfettiPiece = ({ delay, color, left, size }: { delay: number, color: string, left: number, size: number }) => (
  <div
    className="absolute animate-confetti-fall"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      transform: `rotate(${Math.random() * 360}deg)`,
    }}
  />
)

export default function WelcomeModal({ 
  orgName, documentsCount, complianceScore, onClose, v3Answers
}: WelcomeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number, delay: number, color: string, left: number, size: number }>>([])

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
  const securityColor = isHighSecurity ? 'text-red-600' : totalRecords >= 10000 ? 'text-amber-600' : 'text-green-600'

  // Reporting obligation
  const needsReporting = isHighSecurity || totalRecords >= 100000

  // Count pending user actions
  const userActions: string[] = []
  userActions.push('חתימה על כתב מינוי DPO')
  if (hasConsent === 'no') userActions.push('הטמעת מנגנון הסכמה באתר')
  if (processorCount > 0) userActions.push(`${processorCount} הסכמי עיבוד מידע לספקים`)
  if (accessControl === 'all') userActions.push('הגדרת בקרת גישה למאגרים')

  useEffect(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
    const pieces = [...Array(60)].map((_, i) => ({
      id: i,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      size: Math.random() * 8 + 4
    }))
    setConfettiPieces(pieces)
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <ConfettiPiece key={piece.id} {...piece} />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden">
        <button onClick={onClose} className="absolute top-4 left-4 text-white/70 hover:text-white z-10">
          <X className="h-5 w-5" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-l from-indigo-600 to-blue-700 px-6 pt-8 pb-6 text-white text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-1">🎉 ברוכים הבאים ל-MyDPO!</h2>
          <p className="text-blue-100 text-sm">{orgName} — הממונה שלכם כבר עובדת</p>
        </div>

        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          {/* What we found */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              על בסיס הנתונים שהזנתם
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{dbCount}</div>
                <div className="text-[11px] text-indigo-600">מאגרי מידע</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${securityColor}`}>{securityLevel}</div>
                <div className="text-[11px] text-gray-600">רמת אבטחה</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{documentsCount || 4}</div>
                <div className="text-[11px] text-green-600">מסמכים נוצרו</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-700">✓</div>
                <div className="text-[11px] text-green-600">DPO ממונה</div>
              </div>
            </div>
          </div>

          {/* 3 Steps roadmap */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              3 צעדים לציות מלא
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-emerald-800">מינוי ממונה הגנת פרטיות</div>
                  <div className="text-xs text-emerald-600">בוצע אוטומטית — עו״ד דנה כהן</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">2</div>
                <div>
                  <div className="font-semibold text-sm text-amber-800">אישור מסמכים</div>
                  <div className="text-xs text-amber-600">{documentsCount || 4} מסמכים נוצרו — הממונה תסקור תוך 48 שעות</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">3</div>
                <div>
                  <div className="font-semibold text-sm text-blue-800">פעולות נדרשות</div>
                  <div className="text-xs text-blue-600">{userActions.length} פעולות ממתינות לכם בלוח הבקרה</div>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting obligation callout */}
          {needsReporting && (
            <div className="mb-5 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-red-800">חובת דיווח לרשות להגנת הפרטיות</div>
                <div className="text-xs text-red-600 mt-0.5">על בסיס סיווג המאגרים שלכם, קיימת חובת רישום. נכין עבורכם את הטפסים.</div>
              </div>
            </div>
          )}

          {/* Key actions preview */}
          {userActions.length > 0 && (
            <div className="mb-2 p-3 bg-gray-50 rounded-xl">
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

        {/* CTA */}
        <div className="px-6 pb-6">
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
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(1080deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall 4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
