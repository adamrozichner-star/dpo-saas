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
  Loader2
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
    if (user) {
      // Get user name from metadata
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      
      // Load user's organization
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

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
    if (!question.trim() || !organization) return
    setIsAsking(true)
    
    try {
      // For now, generate a mock AI response
      // TODO: Connect to Claude API
      const mockAnswer = generateMockAnswer(question)
      
      // Save to database
      const { data, error } = await supabase
        .from('qa_interactions')
        .insert({
          org_id: organization.id,
          question: question,
          answer: mockAnswer,
          confidence_score: 0.85,
          escalated: false
        })
        .select()
        .single()

      if (data) {
        setQaHistory([data, ...qaHistory])
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

function NavButton({ icon, label, active, onClick }: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
        ${active 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      {icon}
      {label}
    </button>
  )
}

function OverviewTab({ organization, documents }: any) {
  const complianceScore = organization?.status === 'active' ? 92 : 45

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ציון תאימות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${complianceScore > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {complianceScore}%
              </span>
              <span className="text-sm text-gray-500 mb-1">{complianceScore > 80 ? 'תקין' : 'דרוש שיפור'}</span>
            </div>
            <Progress value={complianceScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">מסמכים פעילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{documents.length}</span>
              <span className="text-sm text-gray-500 mb-1">מסמכים</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סטטוס</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={organization?.status === 'active' ? 'success' : 'warning'} className="text-base">
              {organization?.status === 'active' ? 'פעיל ומוגן' : 'בתהליך הקמה'}
            </Badge>
          </CardContent>
        </Card>
      </div>

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
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      database_registration: 'רישום מאגר',
      security_policy: 'מדיניות אבטחה',
      procedure: 'נוהל'
    }
    return labels[type] || type
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
        <h2 className="text-xl font-bold">מסמכים</h2>
        <Button variant="outline">
          <Download className="h-4 w-4 ml-2" />
          הורדת הכל
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
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
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
      <h2 className="text-xl font-bold">הגדרות</h2>

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

// Helper function to generate mock AI answers
function generateMockAnswer(question: string): string {
  const questionLower = question.toLowerCase()
  
  if (questionLower.includes('מחיקה') || questionLower.includes('למחוק')) {
    return 'בהתאם לזכות המחיקה בחוק הגנת הפרטיות, יש לטפל בבקשת מחיקה תוך 30 יום. יש לתעד את הבקשה, לבצע את המחיקה מכל המערכות, ולשלוח אישור ללקוח.'
  }
  
  if (questionLower.includes('ניוזלטר') || questionLower.includes('דיוור') || questionLower.includes('שיווק')) {
    return 'שליחת דיוור שיווקי מחייבת הסכמה מפורשת מראש (opt-in). ההסכמה צריכה להיות ברורה, מתועדת, וניתנת לביטול בכל עת.'
  }
  
  return 'תודה על השאלה. על פי הנהלים והמדיניות, מומלץ לפעול בזהירות ולתעד כל פעולה. אם יש צורך בהכוונה נוספת, ניתן לפנות לממונה.'
}
