'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Shield, FileText, MessageSquare, CheckCircle2, AlertCircle, Download,
  Send, User, LogOut, Bot, Loader2, Eye, X, Menu, Mail, Plus, Clock, ArrowRight
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const router = useRouter()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'messages' | 'qa' | 'settings'>('overview')
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [qaHistory, setQaHistory] = useState<any[]>([])
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!loading && !session) router.push('/login')
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
      .from('users').select('*, organizations(*)').eq('auth_user_id', user.id).single()

    if (userData?.organizations) {
      setOrganization(userData.organizations)
      const { data: docs } = await supabase.from('documents').select('*').eq('org_id', userData.organizations.id)
      if (docs) setDocuments(docs)
      const { data: qa } = await supabase.from('qa_interactions').select('*')
        .eq('org_id', userData.organizations.id).order('created_at', { ascending: false }).limit(10)
      if (qa) setQaHistory(qa)
      loadUnreadCount(userData.organizations.id)
    }
  }

  const loadUnreadCount = async (orgId: string) => {
    try {
      const response = await fetch(`/api/messages?orgId=${orgId}`)
      const data = await response.json()
      const totalUnread = data.threads?.reduce((acc: number, t: any) => acc + (t.unreadCount || 0), 0) || 0
      setUnreadMessages(totalUnread)
    } catch (error) { console.error('Error loading unread count:', error) }
  }

  const handleAskQuestion = async () => {
    if (!question.trim() || !organization || !supabase) return
    setIsAsking(true)
    try {
      const response = await fetch('/api/qa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), orgId: organization.id,
          orgContext: { name: organization.name, industry: organization.industry, size: organization.employee_count }
        })
      })
      if (response.ok) { const data = await response.json(); setQaHistory([data, ...qaHistory]); setQuestion('') }
    } catch (error) { console.error('Q&A error:', error) }
    finally { setIsAsking(false) }
  }

  const handleSignOut = async () => { await signOut(); router.push('/') }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!session) return null

  const tabs = [
    { id: 'overview', label: 'סקירה', icon: CheckCircle2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'messages', label: 'הודעות', icon: Mail, badge: unreadMessages },
    { id: 'qa', label: 'שאלות', icon: MessageSquare },
    { id: 'settings', label: 'הגדרות', icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold">DPO-Pro</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30 safe-area-bottom">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-2 min-w-[60px] relative ${
                activeTab === tab.id ? 'text-primary' : 'text-gray-500'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={`
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
          fixed md:sticky top-0 right-0 h-screen w-64 bg-white border-l z-50
          overflow-y-auto transition-transform duration-300 ease-in-out
          md:block
        `}>
          <div className="p-6 hidden md:block">
            <div className="flex items-center gap-2 mb-8">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">DPO-Pro</span>
            </div>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setMobileMenuOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-right transition-colors ${
                    activeTab === tab.id ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && tab.badge > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-white text-primary' : 'bg-red-500 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Menu Content */}
          <div className="md:hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="font-bold text-xl">DPO-Pro</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
          </div>

          {/* Desktop User Info */}
          <div className="absolute bottom-0 right-0 left-0 p-6 border-t bg-white hidden md:block">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {/* Header */}
          <div className="mb-6">
            <Badge variant="outline" className="mb-2 text-xs">
              {organization?.status === 'active' ? 'פעיל' : 'בתהליך'}
            </Badge>
            <h1 className="text-xl md:text-3xl font-bold">שלום, {userName}</h1>
            <p className="text-gray-600 text-sm md:text-base">{organization?.name || 'הארגון שלך'}</p>
          </div>

          {activeTab === 'overview' && <OverviewTab organization={organization} documents={documents} setActiveTab={setActiveTab} unreadMessages={unreadMessages} />}
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
          {activeTab === 'messages' && <MessagesTab organization={organization} userName={userName} userId={user?.id} onUnreadChange={(count) => setUnreadMessages(count)} />}
          {activeTab === 'qa' && <QATab question={question} setQuestion={setQuestion} isAsking={isAsking} handleAskQuestion={handleAskQuestion} qaHistory={qaHistory} />}
          {activeTab === 'settings' && <SettingsTab organization={organization} user={user} />}
        </main>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  )
}

function OverviewTab({ organization, documents, setActiveTab, unreadMessages }: { organization: any, documents: any[], setActiveTab: (tab: any) => void, unreadMessages: number }) {
  const complianceScore = organization?.compliance_score || 92
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">ציון ציות</p>
                <p className="text-xl md:text-2xl font-bold">{complianceScore}%</p>
              </div>
              <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">מסמכים</p>
                <p className="text-xl md:text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">זמן DPO</p>
                <p className="text-xl md:text-2xl font-bold">0 דק'</p>
              </div>
              <User className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('messages')}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">הודעות</p>
                <p className="text-xl md:text-2xl font-bold">{unreadMessages}</p>
              </div>
              <Mail className={`h-6 w-6 md:h-8 md:w-8 ${unreadMessages > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">התקדמות בציות</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={complianceScore} className="h-3 md:h-4 mb-3 md:mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <div className="flex items-center gap-2 p-2 md:p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">DPO ממונה</span>
            </div>
            <div className="flex items-center gap-2 p-2 md:p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">מדיניות פרטיות</span>
            </div>
            <div className="flex items-center gap-2 p-2 md:p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">רישום מאגרים</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - 2 cols on mobile */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Button variant="outline" className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2" onClick={() => setActiveTab('documents')}>
              <FileText className="h-5 w-5" />
              <span className="text-xs md:text-sm">מסמכים</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 relative" onClick={() => setActiveTab('messages')}>
              <Mail className="h-5 w-5" />
              <span className="text-xs md:text-sm">פנייה לממונה</span>
              {unreadMessages > 0 && (
                <span className="absolute top-1 left-1 md:top-2 md:left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
              )}
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2" onClick={() => setActiveTab('documents')}>
              <Download className="h-5 w-5" />
              <span className="text-xs md:text-sm">הורדת דוחות</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2" onClick={() => setActiveTab('settings')}>
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs md:text-sm">דיווח אירוע</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============== MESSAGES TAB ==============
function MessagesTab({ organization, userName, userId, onUnreadChange }: { organization: any, userName: string, userId?: string, onUnreadChange: (count: number) => void }) {
  const [threads, setThreads] = useState<any[]>([])
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (organization?.id) loadThreads() }, [organization?.id])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadThreads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/messages?orgId=${organization.id}`)
      const data = await response.json()
      setThreads(data.threads || [])
      const totalUnread = data.threads?.reduce((acc: number, t: any) => acc + (t.unreadCount || 0), 0) || 0
      onUnreadChange(totalUnread)
    } catch (error) { console.error('Error loading threads:', error) }
    finally { setIsLoading(false) }
  }

  const loadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/messages?orgId=${organization.id}&threadId=${threadId}`)
      const data = await response.json()
      setMessages(data.messages || [])
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', threadId, senderType: 'user' }) })
      loadThreads()
    } catch (error) { console.error('Error loading messages:', error) }
  }

  const selectThread = (thread: any) => { 
    setSelectedThread(thread)
    loadMessages(thread.id)
    setMobileView('chat') // Switch to chat view on mobile
  }

  const backToList = () => {
    setMobileView('list')
    setSelectedThread(null)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return
    setIsSending(true)
    try {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', threadId: selectedThread.id, content: newMessage, senderType: 'user', senderName: userName, senderId: userId }) })
      setNewMessage('')
      loadMessages(selectedThread.id)
    } catch (error) { console.error('Error sending message:', error) }
    finally { setIsSending(false) }
  }

  const createThread = async () => {
    if (!newSubject.trim() || !newContent.trim()) return
    setIsSending(true)
    try {
      const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_thread', orgId: organization.id, subject: newSubject, content: newContent, senderType: 'user', senderName: userName, senderId: userId }) })
      const data = await response.json()
      setNewSubject(''); setNewContent(''); setShowNewThread(false); loadThreads()
      if (data.thread) selectThread(data.thread)
    } catch (error) { console.error('Error creating thread:', error) }
    finally { setIsSending(false) }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString); const now = new Date(); const diff = now.getTime() - date.getTime(); const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    else if (days === 1) return 'אתמול'
    else if (days < 7) return `לפני ${days} ימים`
    else return date.toLocaleDateString('he-IL')
  }

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">פנייה חדשה</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowNewThread(false)}><X className="h-5 w-5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">נושא</label><Input placeholder="נושא הפנייה..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">תוכן ההודעה</label><Textarea placeholder="כתבו את הודעתכם כאן..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[100px]" /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewThread(false)}>ביטול</Button>
                <Button onClick={createThread} disabled={!newSubject.trim() || !newContent.trim() || isSending}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}שליחה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold">הודעות</h2>
        <Button size="sm" onClick={() => setShowNewThread(true)}><Plus className="h-4 w-4 ml-1" />חדש</Button>
      </div>

      {/* Mobile: Show either list OR chat */}
      <div className="md:hidden">
        {mobileView === 'list' ? (
          <Card>
            <CardContent className="p-2">
              {threads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">אין שיחות עדיין</p>
                  <Button variant="link" size="sm" onClick={() => setShowNewThread(true)}>התחילו שיחה</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {threads.map((thread) => (
                    <button key={thread.id} onClick={() => selectThread(thread)} className="w-full p-3 rounded-lg text-right hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate text-sm ${thread.unreadCount > 0 ? 'text-primary' : ''}`}>{thread.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{thread.lastMessage?.content || 'אין הודעות'}</p>
                      </div>
                      <div className="flex items-center gap-2 mr-2">
                        {thread.unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{thread.unreadCount}</span>}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="border-b py-3 px-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={backToList}><ArrowRight className="h-5 w-5" /></Button>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{selectedThread?.subject}</CardTitle>
                  <p className="text-xs text-gray-500">{formatTime(selectedThread?.created_at)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-2.5 rounded-lg text-sm ${msg.sender_type === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            {selectedThread?.status === 'open' && (
              <div className="border-t p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input placeholder="כתבו הודעה..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }} />
                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">שיחות ({threads.length})</CardTitle></CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" /><p className="text-sm">אין שיחות</p></div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <button key={thread.id} onClick={() => selectThread(thread)} className={`w-full p-3 rounded-lg text-right transition-colors ${selectedThread?.id === thread.id ? 'bg-primary/10 border border-primary' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0"><p className={`font-medium truncate text-sm ${thread.unreadCount > 0 ? 'text-primary' : ''}`}>{thread.subject}</p><p className="text-xs text-gray-500 truncate">{thread.lastMessage?.content || ''}</p></div>
                      {thread.unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{thread.unreadCount}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedThread ? (
            <>
              <CardHeader className="border-b py-3"><CardTitle className="text-base">{selectedThread.subject}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] p-3 rounded-lg ${msg.sender_type === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 rounded-tl-none'}`}>
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {selectedThread.status === 'open' && (
                  <div className="border-t p-3 flex gap-2">
                    <Textarea placeholder="כתבו הודעה..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} className="self-end">{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[400px] text-gray-500"><MessageSquare className="h-12 w-12 text-gray-300 mb-2" /><p className="text-sm">בחרו שיחה</p></CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}

// ============== DOCUMENTS TAB ==============
function DocumentsTab({ documents }: { documents: any[] }) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = { privacy_policy: 'מדיניות פרטיות', database_registration: 'רישום מאגר', security_policy: 'מדיניות אבטחה', procedure: 'נוהל' }
    return labels[type] || type
  }

  const exportDocument = async (doc: any, format: 'pdf' | 'docx' | 'txt') => {
    setIsExporting(doc.id); setExportFormat(format)
    try {
      const response = await fetch('/api/documents/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id, format }) })
      if (!response.ok) throw new Error('Export failed')
      const data = await response.json()
      if (format === 'pdf') { const { generatePDF } = await import('@/lib/document-export'); await generatePDF(data.definition, data.filename) }
      else if (format === 'docx') { const { generateDOCX } = await import('@/lib/document-export'); await generateDOCX(data.content, data.title, data.orgName, data.filename) }
      else { const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = data.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
    } catch (err) { console.error('Export error:', err); alert('שגיאה בייצוא') }
    finally { setIsExporting(null); setExportFormat(null) }
  }

  if (documents.length === 0) return <Card><CardContent className="p-6 text-center"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" /><h2 className="text-lg font-bold mb-1">אין מסמכים</h2><p className="text-sm text-gray-600">יופקו לאחר ההרשמה</p></CardContent></Card>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold">מסמכים ({documents.length})</h2>
      </div>

      <div className="grid gap-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start md:items-center justify-between gap-3">
                <div className="flex items-start md:items-center gap-3 flex-1 min-w-0" onClick={() => setSelectedDoc(doc)}>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm md:text-base truncate">{doc.title}</h3>
                    <p className="text-xs text-gray-500">{getDocTypeLabel(doc.type)}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => exportDocument(doc, 'pdf')} disabled={isExporting === doc.id}>
                      {isExporting === doc.id && exportFormat === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">PDF</span>}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => exportDocument(doc, 'docx')} disabled={isExporting === doc.id}>
                      {isExporting === doc.id && exportFormat === 'docx' ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">DOCX</span>}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedDoc(doc)}><Eye className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <Card className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0 border-b py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base md:text-lg truncate">{selectedDoc.title}</CardTitle>
                  <p className="text-xs text-gray-500">{getDocTypeLabel(selectedDoc.type)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => exportDocument(selectedDoc, 'pdf')}>PDF</Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => exportDocument(selectedDoc, 'docx')}>Word</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDoc(null)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 md:p-6">
              <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed" dir="rtl">{selectedDoc.content || 'אין תוכן'}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============== QA TAB ==============
function QATab({ question, setQuestion, isAsking, handleAskQuestion, qaHistory }: { question: string, setQuestion: (q: string) => void, isAsking: boolean, handleAskQuestion: () => void, qaHistory: any[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /><CardTitle className="text-base">שאלו את הבוט</CardTitle></div>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="הקלידו שאלה..." value={question} onChange={(e) => setQuestion(e.target.value)} className="mb-3 min-h-[80px]" />
          <Button onClick={handleAskQuestion} disabled={!question.trim() || isAsking} size="sm">
            {isAsking ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}שליחה
          </Button>
        </CardContent>
      </Card>

      {qaHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">היסטוריה</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qaHistory.map((qa: any, index: number) => (
                <div key={qa.id || index} className="border rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2"><User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" /><p className="font-medium text-sm">{qa.question}</p></div>
                  <div className="flex items-start gap-2 mr-6"><Bot className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><p className="text-sm text-gray-600">{qa.answer}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============== SETTINGS TAB ==============
function SettingsTab({ organization, user }: { organization: any, user: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">פרטי הארגון</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-xs text-gray-500">שם</label><p className="font-medium text-sm">{organization?.name || '-'}</p></div>
          <div><label className="text-xs text-gray-500">תעשייה</label><p className="font-medium text-sm">{organization?.industry || '-'}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">פרטי המשתמש</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-xs text-gray-500">אימייל</label><p className="font-medium text-sm">{user?.email || '-'}</p></div>
          <div><label className="text-xs text-gray-500">סטטוס</label><Badge variant="success" className="text-xs">פעיל</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">דיווח אירוע</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm"><AlertCircle className="h-4 w-4 ml-2" />דווח</Button>
        </CardContent>
      </Card>
    </div>
  )
}
