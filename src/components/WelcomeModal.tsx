'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  FileText, 
  CheckCircle2, 
  PartyPopper,
  ArrowLeft,
  User,
  MessageSquare,
  X,
  Sparkles,
  Star
} from 'lucide-react'

interface WelcomeModalProps {
  orgName: string
  documentsCount: number
  complianceScore: number
  onClose: () => void
  onStartTour?: () => void
}

// Confetti piece component
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

// Firework burst component
const FireworkBurst = ({ x, y, delay }: { x: number, y: number, delay: number }) => (
  <div 
    className="absolute animate-firework-burst"
    style={{ 
      left: `${x}%`, 
      top: `${y}%`,
      animationDelay: `${delay}s`
    }}
  >
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 rounded-full animate-firework-particle"
        style={{
          backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
          transform: `rotate(${i * 45}deg) translateY(-20px)`,
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
)

export default function WelcomeModal({ 
  orgName, 
  documentsCount, 
  complianceScore,
  onClose,
  onStartTour
}: WelcomeModalProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [showFireworks, setShowFireworks] = useState(true)
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number, delay: number, color: string, left: number, size: number }>>([])
  const [fireworks, setFireworks] = useState<Array<{ id: number, x: number, y: number, delay: number }>>([])

  // Generate confetti pieces
  useEffect(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
    const pieces = [...Array(80)].map((_, i) => ({
      id: i,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      size: Math.random() * 8 + 4
    }))
    setConfettiPieces(pieces)

    // Generate firework bursts
    const fw = [...Array(6)].map((_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 10 + Math.random() * 40,
      delay: i * 0.3
    }))
    setFireworks(fw)

    // Hide effects after animation
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4000)
    const fireworkTimer = setTimeout(() => setShowFireworks(false), 3000)
    
    return () => {
      clearTimeout(confettiTimer)
      clearTimeout(fireworkTimer)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <ConfettiPiece key={piece.id} {...piece} />
          ))}
        </div>
      )}

      {/* Firework Bursts */}
      {showFireworks && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {fireworks.map((fw) => (
            <FireworkBurst key={fw.id} {...fw} />
          ))}
        </div>
      )}

      <Card className="w-full max-w-lg relative animate-in zoom-in-95 duration-500 shadow-2xl border-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <CardContent className="pt-8 pb-6 text-center">
          {/* Celebration Icon with glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 w-28 h-28 mx-auto rounded-full bg-green-400/30 blur-xl animate-pulse" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
              <PartyPopper className="h-14 w-14 text-white animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md animate-in zoom-in duration-500 delay-300">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            {/* Sparkle decorations */}
            <Sparkles className="absolute -top-2 left-1/4 h-5 w-5 text-yellow-400 animate-pulse" />
            <Star className="absolute top-1/4 -right-4 h-4 w-4 text-yellow-400 animate-pulse delay-150" />
            <Sparkles className="absolute bottom-0 -left-2 h-4 w-4 text-yellow-400 animate-pulse delay-300" />
          </div>

          {/* Main Message */}
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            מזל טוב! 🎉
          </h2>
          <p className="text-gray-600 mb-6 text-lg">
            <span className="font-semibold text-gray-800">{orgName}</span> כעת מוגן על ידי ממונה הגנת פרטיות מוסמך
          </p>

          {/* Stats with enhanced styling */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{documentsCount}</p>
              <p className="text-xs text-blue-600 font-medium">מסמכים נוצרו</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-green-700">{complianceScore}%</p>
              <p className="text-xs text-green-600 font-medium">ציון ציות</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                <User className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-purple-700">✓</p>
              <p className="text-xs text-purple-600 font-medium">DPO ממונה</p>
            </div>
          </div>

          {/* What's Next with better styling */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-xl p-5 mb-6 text-right border border-gray-200">
            <h3 className="font-bold mb-3 text-gray-800 flex items-center gap-2 justify-end">
              <span>מה הלאה?</span>
              <span className="text-lg">🚀</span>
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </span>
                <span>עברו על המסמכים שנוצרו והתאימו לצרכים שלכם</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </span>
                <span>פרסמו את מדיניות הפרטיות באתר שלכם</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </span>
                <span>השתמשו בבוט לשאלות של העובדים</span>
              </li>
            </ul>
          </div>

          {/* Actions with gradient button */}
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all text-lg h-14" 
              onClick={onClose}
            >
              התחילו לעבוד
              <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
            {onStartTour && (
              <Button variant="outline" size="lg" className="w-full h-12" onClick={onStartTour}>
                <MessageSquare className="ml-2 h-4 w-4" />
                סיור מודרך במערכת
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(1080deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 4s ease-out forwards;
        }
        
        @keyframes firework-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-firework-burst {
          animation: firework-burst 1.5s ease-out forwards;
        }
        
        @keyframes firework-particle {
          0% {
            transform: rotate(var(--rotation)) translateY(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation)) translateY(-60px);
            opacity: 0;
          }
        }
        .animate-firework-particle {
          animation: firework-particle 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
