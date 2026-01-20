'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Circle,
  FileText,
  Shield,
  Lock,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'

interface ChecklistItem {
  id: string
  title: string
  description: string
  category: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  action?: string
  actionUrl?: string
}

interface ComplianceChecklistProps {
  items: ChecklistItem[]
  onToggle?: (id: string) => void
}

const categoryIcons: Record<string, any> = {
  documentation: FileText,
  registration: Shield,
  security: Lock,
  training: Users,
  processes: AlertTriangle
}

const categoryLabels: Record<string, string> = {
  documentation: 'תיעוד',
  registration: 'רישום',
  security: 'אבטחה',
  training: 'הדרכות',
  processes: 'תהליכים'
}

const priorityColors: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-green-600 bg-green-50'
}

const priorityLabels: Record<string, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה'
}

export default function ComplianceChecklist({ items, onToggle }: ComplianceChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['documentation', 'security'])
  
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  // Calculate stats
  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Count by priority
  const incompleteHigh = items.filter(i => !i.completed && i.priority === 'high').length
  const incompleteMedium = items.filter(i => !i.completed && i.priority === 'medium').length

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>רשימת ציות</CardTitle>
            <CardDescription>מעקב אחר עמידה בדרישות תיקון 13</CardDescription>
          </div>
          <Badge variant={progress >= 80 ? 'success' : progress >= 50 ? 'warning' : 'destructive'}>
            {completedCount}/{totalCount} הושלמו
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">התקדמות כללית</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Priority Summary */}
        {(incompleteHigh > 0 || incompleteMedium > 0) && (
          <div className="flex gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
            {incompleteHigh > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">{incompleteHigh} משימות בעדיפות גבוהה</span>
              </div>
            )}
            {incompleteMedium > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">{incompleteMedium} משימות בעדיפות בינונית</span>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const Icon = categoryIcons[category] || FileText
            const isExpanded = expandedCategories.includes(category)
            const categoryCompleted = categoryItems.filter(i => i.completed).length
            const categoryTotal = categoryItems.length
            
            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{categoryLabels[category] || category}</p>
                      <p className="text-xs text-gray-500">{categoryCompleted}/{categoryTotal} הושלמו</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={(categoryCompleted / categoryTotal) * 100} className="w-20 h-2" />
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="divide-y">
                    {categoryItems.map(item => (
                      <div 
                        key={item.id}
                        className={`p-4 flex items-start gap-3 ${item.completed ? 'bg-green-50/50' : ''}`}
                      >
                        <button
                          onClick={() => onToggle?.(item.id)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-medium ${item.completed ? 'line-through text-gray-400' : ''}`}>
                              {item.title}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${priorityColors[item.priority]}`}
                            >
                              {priorityLabels[item.priority]}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{item.description}</p>
                          {item.action && !item.completed && (
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 h-auto mt-1 text-primary"
                              onClick={() => item.actionUrl && window.open(item.actionUrl, '_blank')}
                            >
                              {item.action}
                              <ExternalLink className="h-3 w-3 mr-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
