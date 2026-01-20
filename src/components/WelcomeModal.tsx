'use client'

import { useState, useEffect } from 'react'
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
  X
} from 'lucide-react'

interface WelcomeModalProps {
  orgName: string
  documentsCount: number
  complianceScore: number
  onClose: () => void
  onStartTour?: () => void
}

export default function WelcomeModal({ 
  orgName, 
  documentsCount, 
  complianceScore,
  onClose,
  onStartTour
}: WelcomeModalProps) {
  const [confetti, setConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Confetti Effect */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <Card className="w-full max-w-lg relative animate-in zoom-in-95 duration-300">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <CardContent className="pt-8 pb-6 text-center">
          {/* Celebration Icon */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <PartyPopper className="h-12 w-12 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Main Message */}
          <h2 className="text-2xl font-bold mb-2">מזל טוב! 🎉</h2>
          <p className="text-gray-600 mb-6">
            {orgName} כעת מוגן על ידי ממונה הגנת פרטיות מוסמך
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{documentsCount}</p>
              <p className="text-xs text-blue-600">מסמכים נוצרו</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{complianceScore}%</p>
              <p className="text-xs text-green-600">ציון ציות</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">✓</p>
              <p className="text-xs text-purple-600">DPO ממונה</p>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
            <h3 className="font-semibold mb-2">מה הלאה?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                עברו על המסמכים שנוצרו והתאימו לצרכים שלכם
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                פרסמו את מדיניות הפרטיות באתר שלכם
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                השתמשו בבוט לשאלות של העובדים
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onClose}>
              התחילו לעבוד
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
            {onStartTour && (
              <Button variant="outline" size="lg" className="w-full" onClick={onStartTour}>
                <MessageSquare className="ml-2 h-4 w-4" />
                סיור מודרך במערכת
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          width: 10px;
          height: 10px;
          animation: confetti 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  )
}
