'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Shield, FileText, MessageSquare, CheckCircle2, AlertCircle, Download, Send, User, LogOut, Bot, Loader2, Eye, X, Menu, Mail, Plus, Clock, Sparkles, PartyPopper, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [showWelcome, setShowWelcome] = useState(false)

  // Check for welcome param
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      // Remove the param from URL
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!loading && !session) { router.push('/login') }
  }, [loading, session, router])

  useEffect(() => {
    if (user && supabase) {
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      loadUserData()
    }
  }, [user, supabase])

  const loadUserData = async () => {
    if (!user || !supabase) return
    const { data: userData } = await supabase.from('users').select('*, organizations(*)').eq('auth_user_id', user.id).single()
    if (userData?.organizations) {
      setOrganization(userData.organizations)
      const { data: docs } = await supabase.from('documents').select('*').eq('org_id', userData.organizations.id)
      if (docs) setDocuments(docs)
      const { data: qa } = await supabase.from('qa_interactions').select('*').eq('org_id', userData.organizations.id).order('created_at', { ascending: false }).limit(10)
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
      const response = await fetch('/api/qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim(), orgId: organization.id, orgContext: { name: organization.name, industry: organization.industry, size: organization.employee_count } }) })
      if (response.ok) { const data = await response.json(); setQaHistory([data, ...qaHistory]); setQuestion('') }
    } catch (error) { console.error('Q&A error:', error) } finally { setIsAsking(false) }
  }

  const handleSignOut = async () => { await signOut(); router.push('/') }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!session) return null

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: CheckCircle2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'messages', label: 'הודעות', icon: Mail, badge: unreadMessages },
    { id: 'qa', label: 'שאלות ותשובות', icon: MessageSquare },
    { id: 'settings', label: 'הגדרות', icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Confetti Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#FCD34D', '#34D399', '#F472B6', '#60A5FA'][i % 4],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`
                    }}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                  <PartyPopper className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">ברוכים הבאים! 🎉</h2>
                <p className="opacity-90">ההרשמה הושלמה בהצלחה</p>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">ממונה הגנת פרטיות הוקצה</p>
                    <p className="text-sm text-green-700">DPO מוסמך ממונה על הארגון שלכם</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">מסמכים נוצרו</p>
                    <p className="text-sm text-green-700">מדיניות פרטיות, אבטחה ורישום מאגרים</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">הבוט מוכן לשאלות</p>
                    <p className="text-sm text-green-700">מענה מיידי 24/7 לכל שאלה בנושא פרטיות</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>הצעד הבא:</strong> עברו ללשונית "מסמכים" להוריד את מדיניות הפרטיות והטמיעו אותה באתר שלכם.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  onClick={() => { setShowWelcome(false); setActiveTab('documents') }}
                >
                  <FileText className="h-4 w-4 ml-2" />
                  צפייה במסמכים
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowWelcome(false)}
                >
                  סגירה
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /><span className="font-bold">DPO-Pro</span></div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu className="h-5 w-5" /></Button>
      </div>
      <div className="flex">
        <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block fixed md:sticky top-0 right-0 h-screen w-64 bg-white border-l z-50 overflow-y-auto`}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8"><Shield className="h-8 w-8 text-primary" /><span className="font-bold text-xl">DPO-Pro</span></div>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setMobileMenuOpen(false) }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-right transition-colors ${activeTab === tab.id ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                  <div className="flex items-center gap-3"><tab.icon className="h-5 w-5" /><span>{tab.label}</span></div>
                  {tab.badge && tab.badge > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>{tab.badge}</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="absolute bottom-0 right-0 left-0 p-6 border-t bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0"><p className="font-medium truncate">{userName}</p><p className="text-sm text-gray-500 truncate">{user?.email}</p></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}><LogOut className="h-4 w-4 ml-2" />התנתקות</Button>
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-8 md:mr-0">
          <div className="mb-8">
            <Badge variant="outline" className="mb-2">{organization?.status === 'active' ? 'פעיל' : 'בתהליך'}</Badge>
            <h1 className="text-2xl md:text-3xl font-bold">שלום, {userName}</h1>
            <p className="text-gray-600">ברוכים הבאים ללוח הבקרה של {organization?.name || 'הארגון שלך'}</p>
          </div>
          {activeTab === 'overview' && <OverviewTab organization={organization} documents={documents} setActiveTab={setActiveTab} unreadMessages={unreadMessages} />}
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
          {activeTab === 'messages' && <MessagesTab organization={organization} userName={userName} userId={user?.id} onUnreadChange={(count) => setUnreadMessages(count)} />}
          {activeTab === 'qa' && <QATab question={question} setQuestion={setQuestion} isAsking={isAsking} handleAskQuestion={handleAskQuestion} qaHistory={qaHistory} />}
          {activeTab === 'settings' && <SettingsTab organization={organization} user={user} />}
        </main>
      </div>
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
    </div>
  )
}

function OverviewTab({ organization, documents, setActiveTab, unreadMessages }: { organization: any, documents: any[], setActiveTab: (tab: any) => void, unreadMessages: number }) {
  const complianceScore = organization?.compliance_score || 92
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">ציון ציות</p><p className="text-2xl font-bold">{complianceScore}%</p></div><CheckCircle2 className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">מסמכים פעילים</p><p className="text-2xl font-bold">{documents.length}</p></div><FileText className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">זמן DPO שנוצל</p><p className="text-2xl font-bold">0 דק'</p></div><User className="h-8 w-8 text-orange-500" /></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('messages')}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">הודעות חדשות</p><p className="text-2xl font-bold">{unreadMessages}</p></div><Mail className={`h-8 w-8 ${unreadMessages > 0 ? 'text-red-500' : 'text-gray-400'}`} /></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>התקדמות בציות</CardTitle><CardDescription>סטטוס העמידה בדרישות תיקון 13</CardDescription></CardHeader><CardContent><Progress value={complianceScore} className="h-4 mb-4" /><div className="grid md:grid-cols-3 gap-4"><div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>DPO ממונה</span></div><div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>מדיניות פרטיות</span></div><div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>רישום מאגרים</span></div></div></CardContent></Card>
      <Card><CardContent className="p-6"><Badge variant="success" className="text-lg px-4 py-2">{organization?.status === 'active' ? 'פעיל ומוגן' : 'בתהליך הקמה'}</Badge></CardContent></Card>
      <Card><CardHeader><CardTitle>פעולות מהירות</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-4 gap-4"><Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('documents')}><FileText className="h-5 w-5" /><span>צפייה במסמכים</span></Button><Button variant="outline" className="h-auto py-4 flex-col gap-2 relative" onClick={() => setActiveTab('messages')}><Mail className="h-5 w-5" /><span>פנייה לממונה</span>{unreadMessages > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}</Button><Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('documents')}><Download className="h-5 w-5" /><span>הורדת דוחות</span></Button><Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('settings')}><AlertCircle className="h-5 w-5" /><span>דיווח אירוע</span></Button></div></CardContent></Card>
    </div>
  )
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (organization?.id) loadThreads() }, [organization?.id])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadThreads = async () => {
    try { setIsLoading(true); const response = await fetch(`/api/messages?orgId=${organization.id}`); const data = await response.json(); setThreads(data.threads || []); const totalUnread = data.threads?.reduce((acc: number, t: any) => acc + (t.unreadCount || 0), 0) || 0; onUnreadChange(totalUnread) } catch (error) { console.error('Error loading threads:', error) } finally { setIsLoading(false) }
  }

  const loadMessages = async (threadId: string) => {
    try { const response = await fetch(`/api/messages?orgId=${organization.id}&threadId=${threadId}`); const data = await response.json(); setMessages(data.messages || []); await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', threadId, senderType: 'user' }) }); loadThreads() } catch (error) { console.error('Error loading messages:', error) }
  }

  const selectThread = (thread: any) => { setSelectedThread(thread); loadMessages(thread.id) }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return
    setIsSending(true)
    try { await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send_message', threadId: selectedThread.id, content: newMessage, senderType: 'user', senderName: userName, senderId: userId }) }); setNewMessage(''); loadMessages(selectedThread.id) } catch (error) { console.error('Error sending message:', error) } finally { setIsSending(false) }
  }

  const createThread = async () => {
    if (!newSubject.trim() || !newContent.trim()) return
    setIsSending(true)
    try { const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_thread', orgId: organization.id, subject: newSubject, content: newContent, senderType: 'user', senderName: userName, senderId: userId }) }); const data = await response.json(); setNewSubject(''); setNewContent(''); setShowNewThread(false); loadThreads(); if (data.thread) selectThread(data.thread) } catch (error) { console.error('Error creating thread:', error) } finally { setIsSending(false) }
  }

  const formatTime = (dateString: string) => { const date = new Date(dateString); const now = new Date(); const diff = now.getTime() - date.getTime(); const days = Math.floor(diff / (1000 * 60 * 60 * 24)); if (days === 0) return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); if (days === 1) return 'אתמול'; if (days < 7) return `לפני ${days} ימים`; return date.toLocaleDateString('he-IL') }

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      {showNewThread && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><div className="flex items-center justify-between"><CardTitle>פנייה חדשה לממונה</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowNewThread(false)}><X className="h-5 w-5" /></Button></div></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">נושא</label><Input placeholder="נושא הפנייה..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">תוכן ההודעה</label><Textarea placeholder="כתבו את הודעתכם כאן..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[120px]" /></div>
              <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowNewThread(false)}>ביטול</Button><Button onClick={createThread} disabled={!newSubject.trim() || !newContent.trim() || isSending}>{isSending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}שליחה</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">הודעות לממונה</h2><Button onClick={() => setShowNewThread(true)}><Plus className="h-4 w-4 ml-2" />פנייה חדשה</Button></div>
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">שיחות ({threads.length})</CardTitle></CardHeader>
          <CardContent className="p-2">
            {threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" /><p>אין שיחות עדיין</p><Button variant="link" onClick={() => setShowNewThread(true)}>התחילו שיחה חדשה</Button></div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <button key={thread.id} onClick={() => selectThread(thread)} className={`w-full p-3 rounded-lg text-right transition-colors ${selectedThread?.id === thread.id ? 'bg-primary/10 border border-primary' : 'hover:bg-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0"><p className={`font-medium truncate ${thread.unreadCount > 0 ? 'text-primary' : ''}`}>{thread.subject}</p><p className="text-sm text-gray-500 truncate">{thread.lastMessage?.content || 'אין הודעות'}</p></div>
                      <div className="flex flex-col items-end gap-1"><span className="text-xs text-gray-400">{formatTime(thread.last_message_at)}</span>{thread.unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{thread.unreadCount}</span>}</div>
                    </div>
                    <Badge variant={thread.status === 'open' ? 'default' : 'secondary'} className="mt-2 text-xs">{thread.status === 'open' ? 'פתוח' : thread.status === 'closed' ? 'סגור' : thread.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          {selectedThread ? (
            <>
              <CardHeader className="border-b"><div className="flex items-center justify-between"><div><CardTitle>{selectedThread.subject}</CardTitle><CardDescription className="flex items-center gap-2"><Clock className="h-3 w-3" />נפתח {formatTime(selectedThread.created_at)}</CardDescription></div><Badge variant={selectedThread.status === 'open' ? 'default' : 'secondary'}>{selectedThread.status === 'open' ? 'פתוח' : 'סגור'}</Badge></div></CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender_type === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
                        <div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{msg.sender_type === 'user' ? msg.sender_name : 'הממונה'}</span><span className={`text-xs ${msg.sender_type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</span></div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {selectedThread.status === 'open' && (
                  <div className="border-t p-4"><div className="flex gap-2"><Textarea placeholder="כתבו הודעה..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[80px]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} /><Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} className="self-end">{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div></div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-gray-500"><MessageSquare className="h-16 w-16 text-gray-300 mb-4" /><p>בחרו שיחה מהרשימה</p><p className="text-sm">או התחילו שיחה חדשה</p></CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}

function DocumentsTab({ documents }: { documents: any[] }) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  
  const getDocTypeLabel = (type: string) => { const labels: Record<string, string> = { privacy_policy: 'מדיניות פרטיות', database_registration: 'רישום מאגר', security_policy: 'מדיניות אבטחה', dpo_appointment: 'כתב מינוי DPO', procedure: 'נוהל' }; return labels[type] || type }
  
  const getDocIcon = (type: string) => {
    if (type === 'dpo_appointment') return '📜'
    if (type === 'privacy_policy') return '🔒'
    if (type === 'security_policy') return '🛡️'
    if (type === 'database_registration') return '🗄️'
    return '📄'
  }
  
  const isAppointmentLetter = (doc: any) => doc.type === 'dpo_appointment'

  const exportDocument = async (doc: any, format: 'pdf' | 'docx' | 'txt') => {
    setIsExporting(doc.id); setExportFormat(format)
    try {
      const response = await fetch('/api/documents/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id, format }) })
      if (!response.ok) throw new Error('Export failed')
      const data = await response.json()
      if (format === 'pdf') { const { generatePDF } = await import('@/lib/document-export'); await generatePDF(data.definition, data.filename) }
      else if (format === 'docx') { const { generateDOCX } = await import('@/lib/document-export'); await generateDOCX(data.content, data.title, data.orgName, data.filename) }
      else { const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = data.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
    } catch (err) { console.error('Export error:', err); alert('שגיאה בייצוא המסמך') } finally { setIsExporting(null); setExportFormat(null) }
  }

  const downloadAllDocuments = async () => { for (let i = 0; i < documents.length; i++) { await exportDocument(documents[i], 'pdf'); await new Promise(resolve => setTimeout(resolve, 1000)) } }

  if (documents.length === 0) return <Card><CardContent className="p-8 text-center"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">אין מסמכים עדיין</h2><p className="text-gray-600">המסמכים יופקו אוטומטית לאחר השלמת תהליך ההרשמה</p></CardContent></Card>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">מסמכים ({documents.length})</h2><Button variant="outline" onClick={downloadAllDocuments}><Download className="h-4 w-4 ml-2" />הורדת הכל</Button></div>
      
      {/* Appointment Letter Alert - Show if exists and pending signature */}
      {documents.find(d => d.type === 'dpo_appointment' && d.status === 'pending_signature') && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl">📜</div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-800">נדרשת חתימה על כתב מינוי</h3>
                <p className="text-sm text-orange-700 mb-2">כתב המינוי מחכה לחתימה שלכם ושל הממונה. זהו מסמך משפטי הנדרש לפי תיקון 13.</p>
                <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-100" onClick={() => setSelectedDoc(documents.find(d => d.type === 'dpo_appointment'))}>
                  <Eye className="h-4 w-4 ml-2" />
                  צפייה וחתימה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className={`hover:shadow-md transition-shadow ${isAppointmentLetter(doc) ? 'border-blue-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${isAppointmentLetter(doc) ? 'bg-blue-100' : 'bg-primary/10'}`}>
                    {getDocIcon(doc.type)}
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {doc.title}
                      {isAppointmentLetter(doc) && <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">משפטי</Badge>}
                    </h3>
                    <p className="text-sm text-gray-500">{getDocTypeLabel(doc.type)} • גרסה {doc.version}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.status === 'active' ? 'success' : doc.status === 'pending_signature' ? 'warning' : 'secondary'}>
                    {doc.status === 'active' ? 'פעיל' : doc.status === 'pending_signature' ? 'ממתין לחתימה' : 'טיוטה'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)} title="צפייה"><Eye className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => exportDocument(doc, 'pdf')} disabled={isExporting === doc.id} title="הורדה כ-PDF">{isExporting === doc.id && exportFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-medium">PDF</span>}</Button>
                  <Button variant="outline" size="sm" onClick={() => exportDocument(doc, 'docx')} disabled={isExporting === doc.id} title="הורדה כ-Word">{isExporting === doc.id && exportFormat === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-medium">DOCX</span>}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0 border-b"><div className="flex items-center justify-between"><div><CardTitle>{selectedDoc.title}</CardTitle><CardDescription>{getDocTypeLabel(selectedDoc.type)} • גרסה {selectedDoc.version}</CardDescription></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => exportDocument(selectedDoc, 'pdf')}>PDF</Button><Button variant="outline" size="sm" onClick={() => exportDocument(selectedDoc, 'docx')}>Word</Button><Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)}><X className="h-5 w-5" /></Button></div></div></CardHeader>
            <CardContent className="flex-1 overflow-auto p-6"><div className="whitespace-pre-wrap text-right leading-relaxed" dir="rtl">{selectedDoc.content || 'אין תוכן זמין'}</div></CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function QATab({ question, setQuestion, isAsking, handleAskQuestion, qaHistory }: { question: string, setQuestion: (q: string) => void, isAsking: boolean, handleAskQuestion: () => void, qaHistory: any[] }) {
  return (
    <div className="space-y-6">
      <Card><CardHeader><div className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /><CardTitle>שאלו את הבוט</CardTitle></div><CardDescription>שאלו שאלות בנושאי פרטיות וקבלו תשובות מיידיות</CardDescription></CardHeader><CardContent><Textarea placeholder="הקלידו את השאלה שלכם..." value={question} onChange={(e) => setQuestion(e.target.value)} className="mb-4 min-h-[100px]" /><Button onClick={handleAskQuestion} disabled={!question.trim() || isAsking}>{isAsking ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}שליחה</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>היסטוריית שאלות</CardTitle></CardHeader><CardContent>{qaHistory.length === 0 ? <p className="text-gray-500 text-center py-8">עדיין לא נשאלו שאלות</p> : <div className="space-y-4">{qaHistory.map((qa: any, index: number) => (<div key={qa.id || index} className="border rounded-lg p-4"><div className="flex items-start gap-2 mb-2"><User className="h-5 w-5 text-gray-400 mt-0.5" /><p className="font-medium">{qa.question}</p></div><div className="flex items-start gap-2 mr-7"><Bot className="h-5 w-5 text-primary mt-0.5" /><p className="text-gray-600">{qa.answer}</p></div>{qa.confidence_score && <div className="mr-7 mt-2"><Badge variant={qa.confidence_score > 0.7 ? 'success' : 'warning'}>רמת ביטחון: {Math.round(qa.confidence_score * 100)}%</Badge></div>}</div>))}</div>}</CardContent></Card>
    </div>
  )
}

function SettingsTab({ organization, user }: { organization: any, user: any }) {
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>פרטי הארגון</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm text-gray-500">שם הארגון</label><p className="font-medium">{organization?.name || '-'}</p></div><div><label className="text-sm text-gray-500">תעשייה</label><p className="font-medium">{organization?.industry || '-'}</p></div><div><label className="text-sm text-gray-500">מספר עובדים</label><p className="font-medium">{organization?.employee_count || '-'}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle>פרטי המשתמש</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm text-gray-500">אימייל</label><p className="font-medium">{user?.email || '-'}</p></div><div><label className="text-sm text-gray-500">סטטוס חשבון</label><Badge variant="success">פעיל</Badge></div></CardContent></Card>
      <Card><CardHeader><CardTitle>דיווח על אירוע אבטחה</CardTitle><CardDescription>במקרה של אירוע אבטחת מידע או הפרת פרטיות</CardDescription></CardHeader><CardContent><Button variant="destructive"><AlertCircle className="h-4 w-4 ml-2" />דווח על אירוע</Button></CardContent></Card>
    </div>
  )
}
