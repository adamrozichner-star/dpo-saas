'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Send,
  Eye,
  Lock,
  Users,
  TrendingUp,
  X
} from 'lucide-react'

export default function DPOAdminPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'stats'>('pending')
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [selectedReview, setSelectedReview] = useState<any>(null)
  const [dpoNotes, setDpoNotes] = useState('')
  const [reviewedContent, setReviewedContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const authenticate = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/dpo-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_stats', password })
      })
      
      if (response.ok) {
        setIsAuthenticated(true)
        localStorage.setItem('dpo_admin_password', password)
        const data = await response.json()
        setStats(data.stats)
      } else {
        setError('סיסמה שגויה')
      }
    } catch (err) {
      setError('שגיאת חיבור')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const savedPassword = localStorage.getItem('dpo_admin_password')
    if (savedPassword) {
      setPassword(savedPassword)
      // Auto-authenticate with saved password
      fetch('/api/dpo-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_stats', password: savedPassword })
      }).then(res => {
        if (res.ok) {
          setIsAuthenticated(true)
          res.json().then(data => setStats(data.stats))
        }
      })
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'pending') {
        const response = await fetch('/api/dpo-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_pending_reviews', password })
        })
        const data = await response.json()
        setReviews(data.reviews || [])
      } else if (activeTab === 'all') {
        const response = await fetch('/api/dpo-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_all_reviews', password })
        })
        const data = await response.json()
        setReviews(data.reviews || [])
      } else if (activeTab === 'stats') {
        const response = await fetch('/api/dpo-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_stats', password })
        })
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const startReview = async (reviewId: string) => {
    await fetch('/api/dpo-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'start_review', 
        password,
        reviewId,
        dpoId: 'dpo-1'
      })
    })
    loadData()
  }

  const completeReview = async () => {
    if (!selectedReview) return
    
    setIsSubmitting(true)
    try {
      await fetch('/api/dpo-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_review',
          password,
          reviewId: selectedReview.id,
          notes: dpoNotes,
          reviewedContent
        })
      })
      
      setSelectedReview(null)
      setDpoNotes('')
      setReviewedContent('')
      loadData()
    } catch (err) {
      console.error('Error completing review:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50'
    if (score >= 40) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: string }> = {
      pending: { label: 'ממתין', variant: 'bg-amber-100 text-amber-800' },
      in_progress: { label: 'בטיפול', variant: 'bg-blue-100 text-blue-800' },
      completed: { label: 'הושלם', variant: 'bg-green-100 text-green-800' }
    }
    const badge = badges[status] || { label: status, variant: 'bg-gray-100' }
    return <Badge className={badge.variant}>{badge.label}</Badge>
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>ממשק DPO</CardTitle>
            <CardDescription>הזינו את סיסמת הממונה</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                onKeyDown={(e) => e.key === 'Enter' && authenticate()}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button 
                className="w-full" 
                onClick={authenticate}
                disabled={isLoading || !password}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 ml-2" />}
                כניסה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-xl">ממשק DPO</h1>
              <p className="text-sm text-gray-500">ניהול בקשות בדיקה</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => {
              localStorage.removeItem('dpo_admin_password')
              setIsAuthenticated(false)
            }}
          >
            התנתקות
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-gray-500">ממתינים</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-sm text-gray-500">בטיפול</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.completedThisMonth}</p>
                <p className="text-sm text-gray-500">הושלמו החודש</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">₪{stats.revenueThisMonth?.toLocaleString()}</p>
                <p className="text-sm text-gray-500">הכנסות החודש</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            <Clock className="h-4 w-4 ml-2" />
            ממתינים ({stats?.pending || 0})
          </Button>
          <Button 
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            <FileText className="h-4 w-4 ml-2" />
            כל הבקשות
          </Button>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg">אין בקשות ממתינות</h3>
              <p className="text-gray-500">כל הבקשות טופלו</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getRiskColor(review.ai_risk_score || 50)}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold">{review.original_filename}</h3>
                        <p className="text-sm text-gray-500">
                          {review.organizations?.name} • {review.users?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(review.dpo_review_status)}
                          {review.urgency === 'urgent' && (
                            <Badge className="bg-red-100 text-red-800">דחוף</Badge>
                          )}
                          <Badge variant="outline">₪{review.dpo_review_price}</Badge>
                          {review.ai_risk_score && (
                            <span className={`text-sm px-2 py-1 rounded ${getRiskColor(review.ai_risk_score)}`}>
                              סיכון: {review.ai_risk_score}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.dpo_review_status === 'pending' && (
                        <Button size="sm" onClick={() => startReview(review.id)}>
                          התחל טיפול
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedReview(review)
                          setDpoNotes(review.dpo_notes || '')
                          setReviewedContent(review.reviewed_content || review.original_content || '')
                        }}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        צפייה
                      </Button>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {review.ai_review_summary && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">סיכום AI:</p>
                      <p className="text-sm text-blue-800">{review.ai_review_summary}</p>
                    </div>
                  )}

                  {/* AI Issues */}
                  {review.ai_issues_found?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">בעיות שזוהו:</p>
                      <div className="flex flex-wrap gap-2">
                        {review.ai_issues_found.slice(0, 3).map((issue: any, i: number) => (
                          <Badge 
                            key={i} 
                            className={
                              issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {issue.issue?.substring(0, 40)}...
                          </Badge>
                        ))}
                        {review.ai_issues_found.length > 3 && (
                          <Badge variant="outline">+{review.ai_issues_found.length - 3} נוספות</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedReview.original_filename}</CardTitle>
                  <CardDescription>
                    {selectedReview.organizations?.name} • {selectedReview.review_type}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedReview(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-6 space-y-6">
              {/* Original Content */}
              <div>
                <h4 className="font-bold mb-2">תוכן מקורי:</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm">{selectedReview.original_content}</pre>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedReview.ai_issues_found?.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">ניתוח AI:</h4>
                  <div className="space-y-2">
                    {selectedReview.ai_issues_found.map((issue: any, i: number) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border-r-4 ${
                          issue.severity === 'high' ? 'bg-red-50 border-red-500' :
                          issue.severity === 'medium' ? 'bg-amber-50 border-amber-500' :
                          'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <p className="font-medium">{issue.issue}</p>
                        {issue.suggestion && (
                          <p className="text-sm text-gray-600 mt-1">💡 {issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DPO Notes */}
              <div>
                <h4 className="font-bold mb-2">הערות הממונה:</h4>
                <Textarea
                  value={dpoNotes}
                  onChange={(e) => setDpoNotes(e.target.value)}
                  placeholder="הוסיפו הערות ללקוח..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Reviewed Content */}
              <div>
                <h4 className="font-bold mb-2">תוכן מתוקן (אופציונלי):</h4>
                <Textarea
                  value={reviewedContent}
                  onChange={(e) => setReviewedContent(e.target.value)}
                  placeholder="הדביקו כאן את התוכן המתוקן או השאירו ריק..."
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>
            </CardContent>

            <div className="border-t p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                ביטול
              </Button>
              <Button 
                onClick={completeReview}
                disabled={isSubmitting || !dpoNotes.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                )}
                סיום בדיקה
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
