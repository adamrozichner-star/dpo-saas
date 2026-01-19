'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  X
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const router = useRouter()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'qa' | 'settings'>('overview')
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [qaHistory, setQaHistory] = useState<any[]>([])
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

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
    }
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
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l shadow-sm z-40">
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
            onClick={() => setActiveTab('overview')}
          />
          <NavButton 
            icon={<FileText />} 
            label="מסמכים" 
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          />
          <NavButton 
            icon={<MessageSquare />} 
            label="שאלות ותשובות" 
            active={activeTab === 'qa'}
            onClick={() => setActiveTab('qa')}
          />
          <NavButton 
            icon={<User />} 
            label="הגדרות" 
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
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
      <main className="mr-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">שלום, {userName}</h1>
            <p className="text-gray-600">
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
              <OverviewTab organization={organization} documents={documents} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab documents={documents} />
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

function OverviewTab({ organization, documents }: { organization: any, documents: any[] }) {
  const complianceScore = documents.length > 0 ? 92 : 0
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

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ציון ציות</p>
                <p className="text-2xl font-bold">{complianceScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">מסמכים פעילים</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">זמן DPO שנוצל</p>
                <p className="text-2xl font-bold">0 דק׳</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">חבילה</p>
                <p className="text-2xl font-bold">{organization?.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle>התקדמות בציות</CardTitle>
          <CardDescription>סטטוס העמידה בדרישות תיקון 13</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={complianceScore} className="h-4 mb-4" />
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium">DPO ממונה</p>
            </div>
            <div className={`p-3 rounded-lg ${documents.length > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.length > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              )}
              <p className="text-sm font-medium">מדיניות פרטיות</p>
            </div>
            <div className={`p-3 rounded-lg ${documents.length > 1 ? 'bg-green-50' : 'bg-gray-50'}`}>
              {documents.length > 1 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              )}
              <p className="text-sm font-medium">רישום מאגרים</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <Badge variant={organization?.status === 'active' ? 'success' : 'warning'} className="text-lg px-4 py-2">
            {organization?.status === 'active' ? 'פעיל ומוגן' : 'בתהליך הקמה'}
          </Badge>
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
