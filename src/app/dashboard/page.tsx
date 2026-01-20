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
  Menu
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
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'qa' | 'checklist' | 'requests' | 'settings'>('overview')
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [qaHistory, setQaHistory] = useState<any[]>([])
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
              />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab documents={documents} />
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

function OverviewTab({ organization, documents, complianceScore, complianceGaps }: { 
  organization: any, 
  documents: any[],
  complianceScore: number,
  complianceGaps: string[]
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
              <Button variant="outline" size="sm" className="w-full">
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
          <div className="grid md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <FileText className="h-5 w-5" />
              <span>צפייה במסמכים</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <MessageSquare className="h-5 w-5" />
              <span>שאלה לממונה</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Download className="h-5 w-5" />
              <span>הורדת דוחות</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>דיווח אירוע</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentsTab({ documents }: { documents: any[] }) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      database_registration: 'רישום מאגר',
      security_policy: 'מדיניות אבטחה',
      procedure: 'נוהל'
    }
    return labels[type] || type
  }

  const downloadDocument = (doc: any) => {
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
          <p className="text-gray-600">המסמכים יופקו אוטומטית לאחר השלמת תהליך ההרשמה</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">מסמכים ({documents.length})</h2>
        <Button variant="outline" onClick={downloadAllDocuments}>
          <Download className="h-4 w-4 ml-2" />
          הורדת הכל
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
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
                  <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  <Button variant="outline" onClick={() => downloadDocument(selectedDoc)}>
                    <Download className="h-4 w-4 ml-2" />
                    הורדה
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-6">
              <div className="whitespace-pre-wrap text-right leading-relaxed" dir="rtl">
                {selectedDoc.content || 'אין תוכן זמין'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function QATab({ qaHistory, question, setQuestion, onAsk, isAsking }: any) {
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
            שאלו שאלות בנושאי פרטיות וקבלו תשובות מיידיות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="הקלידו את השאלה שלכם..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end mt-3">
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
