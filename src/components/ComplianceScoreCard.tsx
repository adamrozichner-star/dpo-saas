'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

interface ComplianceScoreCardProps {
  score: number
  gaps?: string[]
  lastUpdated?: string
}

export default function ComplianceScoreCard({ score, gaps = [], lastUpdated }: ComplianceScoreCardProps) {
  // Determine level and colors
  const getLevel = (score: number) => {
    if (score >= 80) return { label: 'גבוה', color: 'green', icon: CheckCircle2 }
    if (score >= 50) return { label: 'בינוני', color: 'yellow', icon: TrendingUp }
    return { label: 'נמוך', color: 'red', icon: AlertTriangle }
  }

  const level = getLevel(score)
  const Icon = level.icon

  // Calculate gauge angle (0-180 degrees for half circle)
  const gaugeAngle = (score / 100) * 180

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">ציון ציות</CardTitle>
          <Badge 
            variant={level.color === 'green' ? 'success' : level.color === 'yellow' ? 'warning' : 'destructive'}
          >
            {level.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Gauge */}
        <div className="relative w-48 h-24 mx-auto mb-4">
          {/* Background arc */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            {/* Gray background */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Colored progress */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke={level.color === 'green' ? '#22C55E' : level.color === 'yellow' ? '#EAB308' : '#EF4444'}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${(gaugeAngle / 180) * 283} 283`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-4xl font-bold">{score}</span>
            <span className="text-sm text-gray-500">מתוך 100</span>
          </div>
        </div>

        {/* Status icon */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Icon className={`h-5 w-5 ${
            level.color === 'green' ? 'text-green-500' : 
            level.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
          }`} />
          <span className={`font-medium ${
            level.color === 'green' ? 'text-green-700' : 
            level.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {level.color === 'green' ? 'עמידה טובה בדרישות' : 
             level.color === 'yellow' ? 'יש מקום לשיפור' : 'נדרשת תשומת לב'}
          </span>
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2 text-gray-700">פערים שזוהו:</p>
            <ul className="space-y-1">
              {gaps.slice(0, 3).map((gap, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  {gap}
                </li>
              ))}
              {gaps.length > 3 && (
                <li className="text-sm text-gray-400">
                  ועוד {gaps.length - 3} פערים...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            עודכן לאחרונה: {lastUpdated}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
