'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle,
  Download,
  Send,
  User,
  LogOut,
  ChevronLeft,
  Bot,
  Loader2,
  Eye,
  X,
  ClipboardList,
  Users,
  Menu,
  Lock,
  RefreshCw,
  Upload,
  FileSearch,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import WelcomeModal from '@/components/WelcomeModal'
import ComplianceChecklist from '@/components/ComplianceChecklist'
import ComplianceScoreCard from '@/components/ComplianceScoreCard'
import DataSubjectRequests from '@/components/DataSubjectRequests'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'qa' | 'checklist' | 'requests' | 'doc-review' | 'settings'>('overview')
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [qaHistory, setQaHistory] = useState<any[]>([])
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [documentReviews, setDocumentReviews] = useState<any[]>([])
  const [complianceData, setComplianceData] = useState<{
    score: number
    gaps: string[]
    checklist: any[]
  }>({ score: 0, gaps: [], checklist: [] })

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  // Check for welcome parameter
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    if (user && supabase) {
      // Get user name from metadata
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      
      // Load user's organization
      loadUserData()
    }
  }, [user, supabase])

  const loadUserData = async () => {
    if (!user || !supabase) return

    // Get user profile and organization
    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('auth_user_id', user.id)
      .single()

    if (userData?.organizations) {
      setOrganization(userData.organizations)
      
      // Load documents for this organization
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('org_id', userData.organizations.id)
      
      if (docs) setDocuments(docs)

      // Load Q&A history
      const { data: qa } = await supabase
        .from('qa_interactions')
        .select('*')
        .eq('org_id', userData.organizations.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (qa) setQaHistory(qa)

      // Load compliance data from organization profile
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('compliance_score, compliance_gaps, compliance_checklist')
        .eq('org_id', userData.organizations.id)
        .single()

      if (profile) {
        setComplianceData({
          score: profile.compliance_score || calculateDefaultScore(docs || []),
          gaps: profile.compliance_gaps || [],
          checklist: profile.compliance_checklist || generateDefaultChecklist(docs || [])
        })
      } else {
        // Generate default compliance data
        setComplianceData({
          score: calculateDefaultScore(docs || []),
          gaps: [],
          checklist: generateDefaultChecklist(docs || [])
        })
      }
    }
  }

  // Calculate default compliance score based on documents
  const calculateDefaultScore = (docs: any[]) => {
    let score = 25 // Base score for having DPO
    if (docs.length > 0) score += 25 // Has documents
    if (docs.find(d => d.type === 'privacy_policy')) score += 15
    if (docs.find(d => d.type === 'security_procedures' || d.type === 'security_policy')) score += 15
    if (docs.find(d => d.type === 'database_definition' || d.type === 'database_registration')) score += 10
    if (docs.find(d => d.type === 'dpo_appointment')) score += 10
    return Math.min(score, 100)
  }

  // Generate default checklist
  const generateDefaultChecklist = (docs: any[]) => {
    return [
      {
        id: 'privacy_policy',
        title: 'מדיניות פרטיות',
        description: 'פרסום מדיניות פרטיות באתר',
        category: 'documentation',
        completed: docs.some(d => d.type === 'privacy_policy'),
        priority: 'high'
      },
      {
        id: 'security_procedures',
        title: 'נהלי אבטחת מידע',
        description: 'נהלים כתובים לאבטחת מידע',
        category: 'documentation',
        completed: docs.some(d => d.type === 'security_procedures' || d.type === 'security_policy'),
        priority: 'high'
      },
      {
        id: 'database_definition',
        title: 'הגדרות מאגר מידע',
        description: 'תיעוד מאגרי המידע בארגון',
        category: 'documentation',
        completed: docs.some(d => d.type === 'database_definition' || d.type === 'database_registration'),
        priority: 'high'
      },
      {
        id: 'dpo_appointment',
        title: 'כתב מינוי DPO',
        description: 'כתב מינוי רשמי לממונה',
        category: 'documentation',
        completed: docs.some(d => d.type === 'dpo_appointment'),
        priority: 'high'
      },
      {
        id: 'database_registration',
        title: 'רישום מאגרי מידע',
        description: 'רישום ברשות להגנת הפרטיות',
        category: 'registration',
        completed: false,
        priority: 'high',
        action: 'הגשת בקשה',
        actionUrl: 'https://www.gov.il/he/service/database_registration'
      },
      {
        id: 'employee_training',
        title: 'הדרכת עובדים',
        description: 'הדרכת עובדים בנושאי פרטיות',
        category: 'training',
        completed: false,
        priority: 'medium'
      },
      {
        id: 'access_control',
        title: 'בקרת גישה',
        description: 'הגדרת הרשאות גישה למערכות',
        category: 'security',
        completed: false,
        priority: 'high'
      },
      {
        id: 'data_subject_process',
        title: 'תהליך טיפול בפניות',
        description: 'נוהל לטיפול בבקשות נושאי מידע',
        category: 'processes',
        completed: false,
        priority: 'medium'
      }
    ]
  }

  const handleAskQuestion = async () => {
    if (!question.trim() || !organization || !supabase) return
    setIsAsking(true)
    
    try {
      // Call AI Q&A API
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          orgId: organization.id,
          userId: user?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setQaHistory([{
          id: data.id || Date.now(),
          question,
          answer: data.answer,
          confidence_score: data.confidenceScore,
          created_at: new Date().toISOString()
        }, ...qaHistory])
      }
      setQuestion('')
    } catch (err) {
      console.error('Error asking question:', err)
    } finally {
      setIsAsking(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerateDocs = async () => {
    if (!organization?.id || isRegenerating || !supabase) return
    
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organization.id })
      })
      
      if (response.ok) {
        // Reload documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', organization.id)
          .order('created_at', { ascending: false })
        
        if (docs) setDocuments(docs)
        
        // Switch to documents tab to show results
        setActiveTab('documents')
      }
    } catch (error) {
      console.error('Error regenerating documents:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="font-bold text-lg">DPO-Pro</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile slide-in */}
      <aside className={`
        fixed top-0 h-full w-64 bg-white border-l shadow-sm z-50
        transition-transform duration-300 ease-in-out
        md:right-0 md:translate-x-0
        ${mobileMenuOpen ? 'right-0 translate-x-0' : '-right-64 translate-x-full md:translate-x-0 md:right-0'}
      `}>
        <div className="p-4 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          <NavButton 
            icon={<CheckCircle2 />} 
            label="סקירה כללית" 
            active={activeTab === 'overview'}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<FileText />} 
            label="מסמכים" 
            active={activeTab === 'documents'}
            onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<ClipboardList />} 
            label="רשימת ציות" 
            active={activeTab === 'checklist'}
            onClick={() => { setActiveTab('checklist'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<Users />} 
            label="בקשות פרטיות" 
            active={activeTab === 'requests'}
            onClick={() => { setActiveTab('requests'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<MessageSquare />} 
            label="שאלות ותשובות" 
            active={activeTab === 'qa'}
            onClick={() => { setActiveTab('qa'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<FileSearch />} 
            label="בדיקת מסמכים" 
            active={activeTab === 'doc-review'}
            onClick={() => { setActiveTab('doc-review'); setMobileMenuOpen(false) }}
          />
          <NavButton 
            icon={<User />} 
            label="הגדרות" 
            active={activeTab === 'settings'}
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }}
          />
        </nav>

        <div className="absolute bottom-0 right-0 left-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתקות
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:mr-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Welcome Modal */}
        {showWelcome && organization && (
          <WelcomeModal
            orgName={organization.name}
            documentsCount={documents.length}
            complianceScore={complianceData.score}
            onClose={() => setShowWelcome(false)}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">שלום, {userName}</h1>
            <p className="text-gray-600 text-sm md:text-base">
              {organization ? `ברוכים הבאים ללוח הבקרה של ${organization.name}` : 'ברוכים הבאים! השלימו את ההרשמה כדי להתחיל'}
            </p>
          </div>
          {organization ? (
            <Badge variant={organization.status === 'active' ? 'success' : 'warning'}>
              {organization.status === 'active' ? 'פעיל' : 'בהקמה'}
            </Badge>
          ) : (
            <Link href="/onboarding">
              <Button>השלמת הגדרת ארגון</Button>
            </Link>
          )}
        </div>

        {!organization ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">עוד לא הגדרתם ארגון</h2>
              <p className="text-gray-600 mb-4">השלימו את תהליך ההרשמה כדי להתחיל להשתמש במערכת</p>
              <Link href="/onboarding">
                <Button size="lg">התחילו עכשיו</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab 
                organization={organization} 
                documents={documents} 
                complianceScore={complianceData.score}
                complianceGaps={complianceData.gaps}
                onNavigate={(tab) => setActiveTab(tab as any)}
                onRegenerateDocs={handleRegenerateDocs}
                isRegenerating={isRegenerating}
              />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab 
                documents={documents} 
                isPaid={organization?.subscription_status === 'active'}
                onRegenerate={handleRegenerateDocs}
                isRegenerating={isRegenerating}
              />
            )}
            {activeTab === 'checklist' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">רשימת ציות</h2>
                <ComplianceChecklist 
                  items={complianceData.checklist}
                  onToggle={(id) => {
                    setComplianceData(prev => ({
                      ...prev,
                      checklist: prev.checklist.map(item => 
                        item.id === id ? { ...item, completed: !item.completed } : item
                      )
                    }))
                  }}
                />
              </div>
            )}
            {activeTab === 'requests' && organization && (
              <DataSubjectRequests orgId={organization.id} />
            )}
            {activeTab === 'qa' && (
              <QATab 
                qaHistory={qaHistory}
                question={question}
                setQuestion={setQuestion}
                onAsk={handleAskQuestion}
                isAsking={isAsking}
                orgId={organization?.id}
              />
            )}
            {activeTab === 'doc-review' && (
              <DocumentReviewTab 
                orgId={organization?.id}
                reviews={documentReviews}
                setReviews={setDocumentReviews}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab organization={organization} user={user} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        active 
          ? 'bg-primary text-white' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function OverviewTab({ 
  organization, 
  documents, 
  complianceScore, 
  complianceGaps,
  onNavigate,
  onRegenerateDocs,
  isRegenerating = false
}: { 
  organization: any, 
  documents: any[],
  complianceScore: number,
  complianceGaps: string[],
  onNavigate: (tab: string) => void,
  onRegenerateDocs: () => void,
  isRegenerating?: boolean
}) {
  const hasSubscription = organization?.subscription_status === 'active'
  
  return (
    <div className="space-y-6">
      {/* Upgrade Banner - show if no active subscription */}
      {!hasSubscription && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">שדרגו לחבילה מלאה</p>
                  <p className="text-sm text-gray-600">קבלו גישה לכל הכלים והתמיכה של ממונה מוסמך</p>
                </div>
              </div>
              <Link href="/subscribe">
                <Button>צפייה בחבילות</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Compliance Score Card */}
        <ComplianceScoreCard 
          score={complianceScore}
          gaps={complianceGaps}
          lastUpdated={new Date().toLocaleDateString('he-IL')}
        />

        {/* Stats Cards */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">מסמכים פעילים</p>
                <p className="text-3xl font-bold">{documents.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">זמן DPO שנוצל</p>
                <p className="text-3xl font-bold">0 דק׳</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DPO Card */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <User className="h-8 w-8 text-primary" />
              </div>
              <Badge className="mb-2">הממונה שלכם</Badge>
              <h3 className="font-bold">עו"ד דנה כהן</h3>
              <p className="text-sm text-gray-500 mb-3">ממונה הגנת פרטיות</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onNavigate('qa')}
              >
                <MessageSquare className="h-4 w-4 ml-2" />
                שליחת הודעה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle>סטטוס עמידה בדרישות</CardTitle>
          <CardDescription>התקדמות בעמידה בדרישות תיקון 13</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg text-center ${documents.some(d => d.type === 'dpo_appointment') ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.some(d => d.type === 'dpo_appointment') ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              ) : (
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              )}
              <p className="text-sm font-medium">DPO ממונה</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${documents.some(d => d.type === 'privacy_policy') ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.some(d => d.type === 'privacy_policy') ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              ) : (
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              )}
              <p className="text-sm font-medium">מדיניות פרטיות</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${documents.some(d => d.type === 'security_procedures' || d.type === 'security_policy') ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.some(d => d.type === 'security_procedures' || d.type === 'security_policy') ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              ) : (
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              )}
              <p className="text-sm font-medium">נהלי אבטחה</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${documents.some(d => d.type === 'database_definition' || d.type === 'database_registration') ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.some(d => d.type === 'database_definition' || d.type === 'database_registration') ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              ) : (
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              )}
              <p className="text-sm font-medium">הגדרות מאגר</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('documents')}
            >
              <FileText className="h-5 w-5" />
              <span>צפייה במסמכים</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('qa')}
            >
              <MessageSquare className="h-5 w-5" />
              <span>שאלה לממונה</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={onRegenerateDocs}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <span>{isRegenerating ? 'מייצר...' : 'יצירת מסמכים'}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('requests')}
            >
              <Users className="h-5 w-5" />
              <span>בקשות פרטיות</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('checklist')}
            >
              <ClipboardList className="h-5 w-5" />
              <span>רשימת ציות</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentsTab({ documents, isPaid = false, onRegenerate, isRegenerating = false }: { 
  documents: any[], 
  isPaid?: boolean,
  onRegenerate?: () => void,
  isRegenerating?: boolean
}) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      database_registration: 'רישום מאגר',
      security_policy: 'מדיניות אבטחה',
      procedure: 'נוהל',
      dpo_appointment: 'כתב מינוי DPO'
    }
    return labels[type] || type
  }

  const downloadDocument = (doc: any) => {
    if (!isPaid) return // Block download for unpaid users
    
    // Create nicely formatted content
    const header = `${'═'.repeat(50)}
${doc.title}
${'═'.repeat(50)}

`
    const footer = `

${'─'.repeat(50)}
נוצר על ידי DPO-Pro
תאריך: ${new Date().toLocaleDateString('he-IL')}
`
    const content = header + (doc.content || '') + footer
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAllDocuments = () => {
    if (!isPaid) return
    documents.forEach((doc, index) => {
      setTimeout(() => downloadDocument(doc), index * 500)
    })
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">אין מסמכים עדיין</h2>
          <p className="text-gray-600 mb-6">לחצו על הכפתור כדי ליצור את המסמכים שלכם</p>
          {onRegenerate && (
            <Button onClick={onRegenerate} disabled={isRegenerating}>
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מייצר מסמכים...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  יצירת מסמכים
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Paywall Banner */}
      {!isPaid && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Lock className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">המסמכים מוכנים! 🎉</h3>
                  <p className="text-gray-600">שלמו כדי להוריד את המסמכים ולקבל גישה מלאה למערכת</p>
                </div>
              </div>
              <Link href="/subscribe">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                  <Lock className="h-4 w-4 ml-2" />
                  שלם לגישה מלאה - ₪500/חודש
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">מסמכים ({documents.length})</h2>
        <Button 
          variant="outline" 
          onClick={downloadAllDocuments}
          disabled={!isPaid}
          className={!isPaid ? 'opacity-50' : ''}
        >
          <Download className="h-4 w-4 ml-2" />
          הורדת הכל
          {!isPaid && <Lock className="h-3 w-3 mr-2" />}
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className={`hover:shadow-md transition-shadow ${!isPaid ? 'relative' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {getDocTypeLabel(doc.type)} • גרסה {doc.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.status === 'active' ? 'success' : 'secondary'}>
                    {doc.status === 'active' ? 'פעיל' : 'טיוטה'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => downloadDocument(doc)}
                    disabled={!isPaid}
                    className={!isPaid ? 'opacity-50' : ''}
                  >
                    {isPaid ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedDoc.title}</CardTitle>
                  <CardDescription>
                    {getDocTypeLabel(selectedDoc.type)} • גרסה {selectedDoc.version}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <Button variant="outline" onClick={() => downloadDocument(selectedDoc)}>
                      <Download className="h-4 w-4 ml-2" />
                      הורדה
                    </Button>
                  ) : (
                    <Link href="/subscribe">
                      <Button className="bg-amber-600 hover:bg-amber-700">
                        <Lock className="h-4 w-4 ml-2" />
                        שלם להורדה
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-6 relative">
              {/* Document content with blur for unpaid */}
              <div 
                className={`whitespace-pre-wrap text-right leading-relaxed ${!isPaid ? 'blur-sm select-none' : ''}`} 
                dir="rtl"
              >
                {selectedDoc.content || 'אין תוכן זמין'}
              </div>
              
              {/* Overlay for unpaid users */}
              {!isPaid && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">תוכן נעול</h3>
                    <p className="text-gray-600 mb-4">שלמו כדי לצפות ולהוריד את המסמך המלא</p>
                    <Link href="/subscribe">
                      <Button className="bg-amber-600 hover:bg-amber-700">
                        שלם לגישה - ₪500/חודש
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// This is the updated QATab function to replace the existing one in dashboard/page.tsx
// Find the existing QATab function (around line 963) and replace it with this

function QATab({ qaHistory, question, setQuestion, onAsk, isAsking, orgId, onEscalateToDPO }: any) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [escalatingId, setEscalatingId] = useState<string | null>(null)
  const [escalateMessage, setEscalateMessage] = useState('')
  const [showEscalateModal, setShowEscalateModal] = useState<any>(null)
  const [isEscalating, setIsEscalating] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return

    setUploadedFile(file)
    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('action', 'upload_and_review')
      formData.append('file', file)
      formData.append('orgId', orgId)
      formData.append('reviewType', 'other')

      const response = await fetch('/api/document-review', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setUploadResult(data.aiReview)
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEscalateToDPO = async (qa: any, additionalMessage: string = '') => {
    setIsEscalating(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_escalation',
          orgId,
          originalQuestion: qa.question,
          aiAnswer: qa.answer,
          additionalMessage,
          qaId: qa.id
        })
      })

      if (response.ok) {
        alert('הפנייה נשלחה בהצלחה לממונה. תקבלו תשובה בהקדם.')
        setShowEscalateModal(null)
        setEscalateMessage('')
      } else {
        alert('שגיאה בשליחת הפנייה. נסו שוב.')
      }
    } catch (err) {
      console.error('Escalation error:', err)
      alert('שגיאה בשליחת הפנייה')
    } finally {
      setIsEscalating(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">שאלות ותשובות</h2>

      {/* Ask Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            שאלו את הבוט
          </CardTitle>
          <CardDescription>
            שאלו שאלות בנושאי פרטיות או העלו מסמך לבדיקה מהירה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="הקלידו את השאלה שלכם..."
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="qa-file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('qa-file-upload')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Upload className="h-4 w-4 ml-2" />
                )}
                {isUploading ? 'מעלה...' : 'העלאת מסמך לבדיקה'}
              </Button>
              {uploadedFile && !isUploading && (
                <span className="text-sm text-gray-500">{uploadedFile.name}</span>
              )}
            </div>
            <Button onClick={onAsk} disabled={!question.trim() || isAsking}>
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              שליחה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              תוצאות בדיקת AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Score */}
            <div className={`p-4 rounded-lg ${
              uploadResult.risk_score >= 70 ? 'bg-red-50 border border-red-200' :
              uploadResult.risk_score >= 40 ? 'bg-amber-50 border border-amber-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">ציון סיכון:</span>
                <span className={`text-2xl font-bold ${
                  uploadResult.risk_score >= 70 ? 'text-red-600' :
                  uploadResult.risk_score >= 40 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {uploadResult.risk_score}%
                </span>
              </div>
            </div>

            {/* Summary */}
            {uploadResult.summary && (
              <div>
                <h4 className="font-medium mb-2">סיכום:</h4>
                <p className="text-gray-700">{uploadResult.summary}</p>
              </div>
            )}

            {/* Issues */}
            {uploadResult.issues?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">בעיות שזוהו:</h4>
                <div className="space-y-2">
                  {uploadResult.issues.map((issue: any, i: number) => (
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

            {/* Recommendation */}
            {uploadResult.recommendation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-1">המלצה:</h4>
                <p>{uploadResult.recommendation}</p>
              </div>
            )}

            {/* DPO Review CTA */}
            {uploadResult.requires_dpo_review && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h4 className="font-bold">מומלץ בדיקת DPO אנושי</h4>
                    <p className="text-sm text-gray-600">{uploadResult.dpo_review_reason || 'המסמך דורש בדיקה מעמיקה'}</p>
                  </div>
                  <Link href="/dashboard?tab=doc-review">
                    <Button size="sm">
                      הזמנת בדיקה - ₪350
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setUploadResult(null)}>
              סגור תוצאות
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Q&A History */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית שאלות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {qaHistory.length === 0 && (
            <p className="text-center text-gray-500 py-8">עדיין לא נשאלו שאלות</p>
          )}
          {qaHistory.map((qa: any) => (
            <div key={qa.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{qa.question}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(qa.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3 mr-11">
                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{qa.answer}</p>
                  
                  {/* Low confidence indicator and escalation button */}
                  {(qa.confidence_score < 0.7 || qa.escalated) && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">התשובה עשויה להיות לא מלאה</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowEscalateModal(qa)}
                          className="text-primary border-primary hover:bg-primary/10"
                        >
                          <MessageSquare className="h-4 w-4 ml-1" />
                          פנה לממונה אנושי
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Always show escalation option */}
              {qa.confidence_score >= 0.7 && !qa.escalated && (
                <div className="mr-11 mt-2">
                  <button 
                    onClick={() => setShowEscalateModal(qa)}
                    className="text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    לא מרוצה מהתשובה? פנה לממונה אנושי →
                  </button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  פנייה לממונה אנושי
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowEscalateModal(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>
                הממונה יקבל את השאלה המקורית ותשובת הבוט, ויחזיר תשובה מקצועית
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Original Q&A */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">השאלה המקורית:</p>
                  <p className="text-sm font-medium">{showEscalateModal.question}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">תשובת הבוט:</p>
                  <p className="text-sm">{showEscalateModal.answer}</p>
                </div>
              </div>

              {/* Additional message */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  הערות נוספות (אופציונלי)
                </label>
                <Textarea
                  value={escalateMessage}
                  onChange={(e) => setEscalateMessage(e.target.value)}
                  placeholder="הוסיפו פרטים או הקשר שיעזרו לממונה לתת תשובה מדויקת יותר..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ⏱️ זמן תגובה משוער: עד 24 שעות בימי עסקים
                </p>
              </div>
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEscalateModal(null)}>
                ביטול
              </Button>
              <Button 
                onClick={() => handleEscalateToDPO(showEscalateModal, escalateMessage)}
                disabled={isEscalating}
              >
                {isEscalating ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                שלח לממונה
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

    

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">שאלות ותשובות</h2>

      {/* Ask Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            שאלו את הבוט
          </CardTitle>
          <CardDescription>
            שאלו שאלות בנושאי פרטיות או העלו מסמך לבדיקה מהירה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="הקלידו את השאלה שלכם..."
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="qa-file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('qa-file-upload')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Upload className="h-4 w-4 ml-2" />
                )}
                {isUploading ? 'מעלה...' : 'העלאת מסמך לבדיקה'}
              </Button>
              {uploadedFile && !isUploading && (
                <span className="text-sm text-gray-500">{uploadedFile.name}</span>
              )}
            </div>
            <Button onClick={onAsk} disabled={!question.trim() || isAsking}>
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              שליחה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              תוצאות בדיקת AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Score */}
            <div className={`p-4 rounded-lg ${
              uploadResult.risk_score >= 70 ? 'bg-red-50 border border-red-200' :
              uploadResult.risk_score >= 40 ? 'bg-amber-50 border border-amber-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">ציון סיכון:</span>
                <span className={`text-2xl font-bold ${
                  uploadResult.risk_score >= 70 ? 'text-red-600' :
                  uploadResult.risk_score >= 40 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {uploadResult.risk_score}%
                </span>
              </div>
            </div>

            {/* Summary */}
            {uploadResult.summary && (
              <div>
                <h4 className="font-medium mb-2">סיכום:</h4>
                <p className="text-gray-700">{uploadResult.summary}</p>
              </div>
            )}

            {/* Issues */}
            {uploadResult.issues?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">בעיות שזוהו:</h4>
                <div className="space-y-2">
                  {uploadResult.issues.map((issue: any, i: number) => (
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

            {/* Recommendation */}
            {uploadResult.recommendation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-1">המלצה:</h4>
                <p>{uploadResult.recommendation}</p>
              </div>
            )}

            {/* DPO Review CTA */}
            {uploadResult.requires_dpo_review && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h4 className="font-bold">מומלץ בדיקת DPO אנושי</h4>
                    <p className="text-sm text-gray-600">{uploadResult.dpo_review_reason || 'המסמך דורש בדיקה מעמיקה'}</p>
                  </div>
                  <Link href="/dashboard?tab=doc-review">
                    <Button size="sm">
                      הזמנת בדיקה - ₪350
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setUploadResult(null)}>
              סגור תוצאות
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Q&A History */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית שאלות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {qaHistory.length === 0 && (
            <p className="text-center text-gray-500 py-8">עדיין לא נשאלו שאלות</p>
          )}
          {qaHistory.map((qa: any) => (
            <div key={qa.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{qa.question}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(qa.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3 mr-11">
                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm">{qa.answer}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// Document Review Tab
function DocumentReviewTab({ orgId, reviews, setReviews }: { orgId: string, reviews: any[], setReviews: (r: any[]) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [reviewType, setReviewType] = useState('contract')
  const [selectedReview, setSelectedReview] = useState<any>(null)

  useEffect(() => {
    if (orgId) loadReviews()
  }, [orgId])

  const loadReviews = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/document-review?orgId=${orgId}`)
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('action', 'upload_and_review')
      formData.append('file', file)
      formData.append('orgId', orgId)
      formData.append('reviewType', reviewType)

      const response = await fetch('/api/document-review', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        loadReviews()
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const requestDPOReview = async (reviewId: string, urgency: string = 'normal') => {
    try {
      const formData = new FormData()
      formData.append('action', 'request_dpo_review')
      formData.append('reviewId', reviewId)
      formData.append('urgency', urgency)

      await fetch('/api/document-review', {
        method: 'POST',
        body: formData
      })
      
      loadReviews()
    } catch (err) {
      console.error('Error requesting DPO review:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      uploaded: { label: 'הועלה', className: 'bg-gray-100 text-gray-800' },
      ai_reviewed: { label: 'נבדק ע"י AI', className: 'bg-blue-100 text-blue-800' },
      dpo_pending: { label: 'ממתין ל-DPO', className: 'bg-amber-100 text-amber-800' },
      completed: { label: 'הושלם', className: 'bg-green-100 text-green-800' }
    }
    const badge = badges[status] || { label: status, className: 'bg-gray-100' }
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-green-600'
  }

  const reviewTypes = [
    { id: 'contract', label: 'חוזה' },
    { id: 'policy', label: 'מדיניות' },
    { id: 'consent_form', label: 'טופס הסכמה' },
    { id: 'other', label: 'אחר' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">בדיקת מסמכים</h2>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            העלאת מסמך לבדיקה
          </CardTitle>
          <CardDescription>
            העלו חוזה, מדיניות או טופס לבדיקת עמידה בדרישות פרטיות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {reviewTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            <input
              type="file"
              id="doc-review-upload"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleUpload}
            />
            <Button 
              onClick={() => document.getElementById('doc-review-upload')?.click()}
              disabled={isUploading}
              className="flex-1 sm:flex-none"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Upload className="h-4 w-4 ml-2" />
              )}
              {isUploading ? 'מעלה ובודק...' : 'בחירת קובץ'}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            נתמכים: PDF, Word, טקסט • הבדיקה כוללת סריקת AI אוטומטית
          </p>
        </CardContent>
      </Card>

      {/* Pricing Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">🔍 בדיקת DPO מקצועית</h3>
              <p className="text-gray-600">קבלו בדיקה מעמיקה ע"י ממונה מוסמך עם תיקונים והמלצות</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">החל מ-</p>
              <p className="text-2xl font-bold text-primary">₪250</p>
              <p className="text-xs text-gray-500">לפי סוג המסמך</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>המסמכים שלי</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <FileSearch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">עדיין לא הועלו מסמכים</p>
              <p className="text-sm text-gray-400">העלו מסמך לקבלת בדיקת AI מיידית</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        review.ai_risk_score >= 70 ? 'bg-red-100' :
                        review.ai_risk_score >= 40 ? 'bg-amber-100' :
                        'bg-green-100'
                      }`}>
                        <FileText className={`h-5 w-5 ${getRiskColor(review.ai_risk_score || 50)}`} />
                      </div>
                      <div>
                        <p className="font-medium">{review.original_filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(review.status)}
                          {review.ai_risk_score && (
                            <span className={`text-sm ${getRiskColor(review.ai_risk_score)}`}>
                              סיכון: {review.ai_risk_score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.created_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.status === 'ai_reviewed' && !review.dpo_review_requested && (
                        <Button 
                          size="sm" 
                          onClick={() => requestDPOReview(review.id)}
                        >
                          הזמנת בדיקת DPO
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedReview(review)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* AI Summary Preview */}
                  {review.ai_review_summary && (
                    <p className="text-sm text-gray-600 mt-2 mr-13">
{(() => {
  let summary = review.ai_review_summary || '';
  if (summary.includes('"summary"') || summary.startsWith('{')) {
    const match = summary.match(/"summary"\s*:\s*"([^"]+)"/);
    summary = match ? match[1] : summary.replace(/[{}":\[\]]/g, ' ').trim();
  }
  return summary.substring(0, 150);
})()}...                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
<Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
  <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{selectedReview.original_filename}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedReview(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                {getStatusBadge(selectedReview.status)}
                {selectedReview.ai_risk_score && (
                  <span className={`font-bold ${getRiskColor(selectedReview.ai_risk_score)}`}>
                    ציון סיכון: {selectedReview.ai_risk_score}%
                  </span>
                )}
              </div>

              {/* AI Summary */}
              {selectedReview.ai_review_summary && (
                <div>
                  <h4 className="font-medium mb-2">סיכום AI:</h4>
<p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
  {(() => {
    let summary = selectedReview.ai_review_summary || '';
    // Clean up any JSON artifacts that might be in old records
    if (summary.includes('"summary"') || summary.startsWith('{')) {
      try {
        const parsed = JSON.parse(summary);
        return parsed.summary || summary;
      } catch {
        // Extract summary from partial JSON
        const match = summary.match(/"summary"\s*:\s*"([^"]+)"/);
        return match ? match[1] : summary.replace(/[{}":\[\]]/g, ' ').trim();
      }
    }
    return summary;
  })()}
</p>                </div>
              )}

              {/* Issues */}
              {selectedReview.ai_issues_found?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">בעיות שזוהו ({selectedReview.ai_issues_found.length}):</h4>
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
              {selectedReview.dpo_notes && (
                <div>
                  <h4 className="font-medium mb-2">הערות הממונה:</h4>
                  <p className="text-gray-700 bg-green-50 p-3 rounded-lg">{selectedReview.dpo_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedReview.status === 'ai_reviewed' && !selectedReview.dpo_review_requested && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    רוצים בדיקה מקצועית? הממונה יעבור על המסמך ויחזיר גרסה מתוקנת
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => { requestDPOReview(selectedReview.id, 'normal'); setSelectedReview(null) }}>
                      בדיקה רגילה - ₪350
                    </Button>
                    <Button variant="outline" onClick={() => { requestDPOReview(selectedReview.id, 'urgent'); setSelectedReview(null) }}>
                      דחוף (24 שעות) - ₪525
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SettingsTab({ organization, user }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">הגדרות</h2>
        <Link href="/settings">
          <Button variant="outline">הגדרות מתקדמות</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הארגון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">שם העסק</label>
              <p className="font-medium">{organization?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">מספר ח.פ</label>
              <p className="font-medium">{organization?.business_id || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">חבילה</label>
              <Badge>{organization?.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</Badge>
            </div>
            <div>
              <label className="text-sm text-gray-600">סטטוס</label>
              <Badge variant={organization?.status === 'active' ? 'success' : 'warning'}>
                {organization?.status === 'active' ? 'פעיל' : 'בהקמה'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרטי משתמש</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">אימייל</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">שם</label>
              <p className="font-medium">{user?.user_metadata?.name || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
