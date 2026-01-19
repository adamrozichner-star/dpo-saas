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
  X,
  Menu,
  ClipboardCheck,
  ExternalLink
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (user && supabase) {
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      loadUserData()
    }
  }, [user, supabase])

  const loadUserData = async () => {
    if (!user || !supabase) return

    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('auth_user_id', user.id)
      .single()

    if (userData?.organizations) {
      setOrganization(userData.organizations)
      
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('org_id', userData.organizations.id)
      
      if (docs) setDocuments(docs)

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
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          orgId: organization.id,
          orgContext: {
            name: organization.name,
            industry: organization.industry,
            size: organization.employee_count
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setQaHistory([data, ...qaHistory])
        setQuestion('')
      }
    } catch (error) {
      console.error('Q&A error:', error)
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

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: CheckCircle2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'qa', label: 'שאלות ותשובות', icon: MessageSquare },
    { id: 'settings', label: 'הגדרות', icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold">DPO-Pro</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${mobileMenuOpen ? 'block' : 'hidden'} md:block
          fixed md:sticky top-0 right-0 h-screen w-64 bg-white border-l z-50
          overflow-y-auto
        `}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">DPO-Pro</span>
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setMobileMenuOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right
                    transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-primary text-white' 
                      : 'hover:bg-gray-100 text-gray-700'}
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 right-0 left-0 p-6 border-t bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 md:mr-0">
          {/* Header */}
          <div className="mb-8">
            <Badge variant="outline" className="mb-2">
              {organization?.status === 'active' ? 'פעיל' : 'בתהליך'}
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold">
              שלום, {userName}
            </h1>
            <p className="text-gray-600">
              ברוכים הבאים ללוח הבקרה של {organization?.name || 'הארגון שלך'}
            </p>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <OverviewTab 
              organization={organization} 
              documents={documents}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab documents={documents} />
          )}
          {activeTab === 'qa' && (
            <QATab 
              question={question}
              setQuestion={setQuestion}
              isAsking={isAsking}
              handleAskQuestion={handleAskQuestion}
              qaHistory={qaHistory}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab organization={organization} user={user} />
          )}
        </main>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}

function OverviewTab({ organization, documents, setActiveTab }: { 
  organization: any, 
  documents: any[],
  setActiveTab: (tab: 'overview' | 'documents' | 'qa' | 'settings') => void 
}) {
  const complianceScore = organization?.compliance_score || 92
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ציון ציות</p>
                <p className="text-2xl font-bold">{complianceScore}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">מסמכים פעילים</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">זמן DPO שנוצל</p>
                <p className="text-2xl font-bold">0 דק'</p>
              </div>
              <User className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">חבילה</p>
                <p className="text-2xl font-bold">בסיסית</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
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
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>DPO ממונה</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>מדיניות פרטיות</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>רישום מאגרים</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <Badge variant="success" className="text-lg px-4 py-2">
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
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveTab('documents')}
            >
              <FileText className="h-5 w-5" />
              <span>צפייה במסמכים</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveTab('qa')}
            >
              <MessageSquare className="h-5 w-5" />
              <span>שאלה לממונה</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveTab('documents')}
            >
              <Download className="h-5 w-5" />
              <span>הורדת דוחות</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveTab('settings')}
            >
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
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      database_registration: 'רישום מאגר',
      security_policy: 'מדיניות אבטחה',
      procedure: 'נוהל'
    }
    return labels[type] || type
  }

  const exportDocument = async (doc: any, format: 'pdf' | 'docx' | 'txt') => {
    setIsExporting(doc.id)
    setExportFormat(format)
    
    try {
      const response = await fetch('/api/documents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id, format })
      })

      if (!response.ok) throw new Error('Export failed')
      
      const data = await response.json()

      if (format === 'pdf') {
        const { generatePDF } = await import('@/lib/document-export')
        await generatePDF(data.definition, data.filename)
      } else if (format === 'docx') {
        const { generateDOCX } = await import('@/lib/document-export')
        await generateDOCX(data.content, data.title, data.orgName, data.filename)
      } else {
        const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('שגיאה בייצוא המסמך')
    } finally {
      setIsExporting(null)
      setExportFormat(null)
    }
  }

  const downloadAllDocuments = async () => {
    for (let i = 0; i < documents.length; i++) {
      await exportDocument(documents[i], 'pdf')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
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
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)} title="צפייה">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportDocument(doc, 'pdf')}
                    disabled={isExporting === doc.id}
                    title="הורדה כ-PDF"
                  >
                    {isExporting === doc.id && exportFormat === 'pdf' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">PDF</span>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportDocument(doc, 'docx')}
                    disabled={isExporting === doc.id}
                    title="הורדה כ-Word"
                  >
                    {isExporting === doc.id && exportFormat === 'docx' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">DOCX</span>
                    )}
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
                  <Button variant="outline" size="sm" onClick={() => exportDocument(selectedDoc, 'pdf')}>
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportDocument(selectedDoc, 'docx')}>
                    Word
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

function QATab({ 
  question, 
  setQuestion, 
  isAsking, 
  handleAskQuestion, 
  qaHistory 
}: {
  question: string
  setQuestion: (q: string) => void
  isAsking: boolean
  handleAskQuestion: () => void
  qaHistory: any[]
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>שאלו את הבוט</CardTitle>
          </div>
          <CardDescription>
            שאלו שאלות בנושאי פרטיות וקבלו תשובות מיידיות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="הקלידו את השאלה שלכם..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mb-4 min-h-[100px]"
          />
          <Button 
            onClick={handleAskQuestion} 
            disabled={!question.trim() || isAsking}
          >
            {isAsking ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            שליחה
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>היסטוריית שאלות</CardTitle>
        </CardHeader>
        <CardContent>
          {qaHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">עדיין לא נשאלו שאלות</p>
          ) : (
            <div className="space-y-4">
              {qaHistory.map((qa: any, index: number) => (
                <div key={qa.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <p className="font-medium">{qa.question}</p>
                  </div>
                  <div className="flex items-start gap-2 mr-7">
                    <Bot className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-gray-600">{qa.answer}</p>
                  </div>
                  {qa.confidence_score && (
                    <div className="mr-7 mt-2">
                      <Badge variant={qa.confidence_score > 0.7 ? 'success' : 'warning'}>
                        רמת ביטחון: {Math.round(qa.confidence_score * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsTab({ organization, user }: { organization: any, user: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>פרטי הארגון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">שם הארגון</label>
            <p className="font-medium">{organization?.name || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">תעשייה</label>
            <p className="font-medium">{organization?.industry || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">מספר עובדים</label>
            <p className="font-medium">{organization?.employee_count || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרטי המשתמש</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">אימייל</label>
            <p className="font-medium">{user?.email || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">סטטוס חשבון</label>
            <Badge variant="success">פעיל</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>דיווח על אירוע אבטחה</CardTitle>
          <CardDescription>
            במקרה של אירוע אבטחת מידע או הפרת פרטיות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">
            <AlertCircle className="h-4 w-4 ml-2" />
            דווח על אירוע
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
