'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, FileText, MessageSquare, Clock, CheckCircle2, AlertCircle,
  Users, Building2, AlertTriangle, Search, Bell, User, LogOut,
  ChevronLeft, Send, Timer, Loader2, Menu, X, ArrowRight, Mail
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function DPODashboardPage() {
  const router = useRouter()
  const { user, session, signOut, loading, supabase } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'messages' | 'escalations' | 'time'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data states
  const [dpo, setDpo] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [escalations, setEscalations] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check auth and load DPO data
  useEffect(() => {
    if (!loading && !session) {
      router.push('/dpo/login')
      return
    }

    if (user && supabase) {
      checkDPOAuth()
    }
  }, [loading, session, user, supabase])

  const checkDPOAuth = async () => {
    if (!supabase || !user) return

    try {
      // Check if user is a DPO
      const { data: dpoData, error: dpoError } = await supabase
        .from('dpos')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (dpoError || !dpoData) {
        setAuthError('אין לך הרשאות גישה לפורטל זה')
        return
      }

      setDpo(dpoData)
      await loadDPOData(dpoData.id)
    } catch (err) {
      console.error('Auth check error:', err)
      setAuthError('שגיאה בבדיקת הרשאות')
    }
  }

  const loadDPOData = async (dpoId: string) => {
    if (!supabase) return

    try {
      setIsLoadingData(true)

      // Load organizations assigned to this DPO
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*, organization_profiles(*)')
        .eq('dpo_id', dpoId)
        .order('created_at', { ascending: false })

      if (orgs) setOrganizations(orgs)

      // Load escalations for these organizations
      const orgIds = orgs?.map(o => o.id) || []
      if (orgIds.length > 0) {
        const { data: escs } = await supabase
          .from('escalations')
          .select('*')
          .in('org_id', orgIds)
          .order('created_at', { ascending: false })

        if (escs) setEscalations(escs)
      }

    } catch (err) {
      console.error('Error loading DPO data:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/dpo/login')
  }

  // Loading state
  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  // Auth error state
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">אין הרשאה</h2>
            <p className="text-gray-600 mb-4">{authError}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.push('/login')}>
                כניסה כלקוח
              </Button>
              <Button onClick={() => router.push('/dpo/login')}>
                כניסה כממונה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !dpo) return null

  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    org.business_id?.includes(searchQuery)
  )
  const openEscalations = escalations.filter(e => e.status === 'open' || e.status === 'in_progress')
  const totalTimeThisMonth = escalations.reduce((sum, e) => sum + (e.dpo_time_minutes || 0), 0)

  const tabs = [
    { id: 'overview', label: 'סקירה', icon: CheckCircle2 },
    { id: 'clients', label: 'לקוחות', icon: Building2, badge: organizations.length },
    { id: 'messages', label: 'הודעות', icon: Mail },
    { id: 'escalations', label: 'פניות', icon: AlertTriangle, badge: openEscalations.length },
    { id: 'time', label: 'זמן', icon: Timer },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          <span className="font-bold">DPO Portal</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-2 min-w-[50px] relative ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] mt-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{tab.badge}</span>
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
          overflow-y-auto transition-transform duration-300
        `}>
          <div className="p-4 border-b hidden md:block">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-purple-600" />
              <span className="font-bold text-lg">DPO-Pro</span>
            </Link>
            <Badge className="mt-2 bg-purple-100 text-purple-700">ממשק ממונה</Badge>
          </div>

          {/* Mobile menu header */}
          <div className="md:hidden p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-purple-600" />
              <span className="font-bold">DPO Portal</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}><X className="h-5 w-5" /></Button>
          </div>

          <nav className="p-4 space-y-2 hidden md:block">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-3"><tab.icon className="h-5 w-5" />{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="secondary" className="text-xs">{tab.badge}</Badge>
                )}
              </button>
            ))}
          </nav>

          {/* Mobile user info */}
          <div className="md:hidden p-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{dpo?.name}</p>
                <p className="text-xs text-gray-500">{dpo?.license_number}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 ml-2" />התנתקות
            </Button>
          </div>

          {/* Desktop user info */}
          <div className="absolute bottom-0 right-0 left-0 p-4 border-t bg-white hidden md:block">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{dpo?.name}</p>
                <p className="text-xs text-gray-500 truncate">{dpo?.license_number}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 ml-2" />התנתקות
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">שלום, {dpo?.name}</h1>
              <p className="text-sm text-gray-600">לוח בקרה לממונה</p>
            </div>
            <Button variant="outline" size="icon" className="hidden md:flex"><Bell className="h-5 w-5" /></Button>
          </div>

          {activeTab === 'overview' && <OverviewTab dpo={dpo} organizations={organizations} escalations={escalations} totalTime={totalTimeThisMonth} />}
          {activeTab === 'clients' && <ClientsTab organizations={filteredOrgs} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
          {activeTab === 'messages' && <MessagesTab dpo={dpo} organizations={organizations} supabase={supabase} />}
          {activeTab === 'escalations' && <EscalationsTab escalations={escalations} organizations={organizations} supabase={supabase} onUpdate={() => loadDPOData(dpo.id)} />}
          {activeTab === 'time' && <TimeTrackingTab escalations={escalations} organizations={organizations} />}
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
    </div>
  )
}

function OverviewTab({ dpo, organizations, escalations, totalTime }: any) {
  const activeOrgs = organizations.filter((o: any) => o.status === 'active').length
  const onboardingOrgs = organizations.filter((o: any) => o.status === 'onboarding').length
  const openEscalations = escalations.filter((e: any) => e.status === 'open' || e.status === 'in_progress').length
  const urgentEscalations = escalations.filter((e: any) => e.priority === 'urgent' || e.priority === 'high').length

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats - 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">לקוחות פעילים</p>
            <p className="text-xl md:text-2xl font-bold">{activeOrgs}</p>
            <p className="text-xs text-green-600">+{onboardingOrgs} בהקמה</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">פניות ממתינות</p>
            <p className="text-xl md:text-2xl font-bold">{openEscalations}</p>
            {urgentEscalations > 0 && <Badge variant="destructive" className="text-xs mt-1">{urgentEscalations} דחוף</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">זמן החודש</p>
            <p className="text-xl md:text-2xl font-bold">{totalTime}</p>
            <p className="text-xs text-gray-500">דקות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">הכנסה</p>
            <p className="text-xl md:text-2xl font-bold">₪{(activeOrgs * 500).toLocaleString()}</p>
            <p className="text-xs text-gray-500">משוער</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Escalations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">פניות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          {escalations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">אין פניות</p>
          ) : (
            <div className="space-y-2">
              {escalations.slice(0, 5).map((esc: any) => {
                const org = organizations.find((o: any) => o.id === esc.org_id)
                return (
                  <div key={esc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        esc.priority === 'urgent' ? 'bg-red-500' : esc.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{esc.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{org?.name}</p>
                      </div>
                    </div>
                    <Badge variant={esc.status === 'open' ? 'warning' : 'secondary'} className="text-xs flex-shrink-0">
                      {esc.status === 'open' ? 'פתוח' : 'בטיפול'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution - stack on mobile */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">לפי חבילה</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>בסיסית</span><span>{organizations.filter((o: any) => o.tier === 'basic').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.tier === 'basic').length / organizations.length) * 100 : 0} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>מורחבת</span><span>{organizations.filter((o: any) => o.tier === 'extended').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.tier === 'extended').length / organizations.length) * 100 : 0} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">לפי סיכון</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>סטנדרטי</span><span>{organizations.filter((o: any) => o.risk_level === 'standard').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.risk_level === 'standard').length / organizations.length) * 100 : 0} className="bg-green-100 [&>div]:bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>רגיש</span><span>{organizations.filter((o: any) => o.risk_level === 'sensitive').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.risk_level === 'sensitive').length / organizations.length) * 100 : 0} className="bg-yellow-100 [&>div]:bg-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientsTab({ organizations, searchQuery, setSearchQuery }: any) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-lg md:text-xl font-bold">לקוחות ({organizations.length})</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="חיפוש..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
      </div>

      <div className="grid gap-3">
        {organizations.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-gray-500">אין לקוחות</CardContent></Card>
        ) : (
          organizations.map((org: any) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm md:text-base truncate">{org.name}</h3>
                      <p className="text-xs text-gray-500">ח.פ {org.business_id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 flex-shrink-0">
                    <Badge variant={org.risk_level === 'standard' ? 'success' : 'warning'} className="text-xs">
                      {org.risk_level === 'standard' ? 'סטנדרטי' : 'רגיש'}
                    </Badge>
                    <Badge variant={org.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                      {org.status === 'active' ? 'פעיל' : 'בהקמה'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ============== MESSAGES TAB (DPO View) ==============
function MessagesTab({ dpo, organizations, supabase }: any) {
  const [threads, setThreads] = useState<any[]>([])
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAllThreads()
  }, [organizations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAllThreads = async () => {
    if (!supabase || organizations.length === 0) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const orgIds = organizations.map((o: any) => o.id)
      
      const { data: allThreads, error } = await supabase
        .from('message_threads')
        .select('*, messages(*)')
        .in('org_id', orgIds)
        .order('last_message_at', { ascending: false })

      if (allThreads) {
        const threadsWithOrgName = allThreads.map((t: any) => ({
          ...t,
          orgName: organizations.find((o: any) => o.id === t.org_id)?.name || 'לקוח',
          unreadCount: t.messages?.filter((m: any) => m.sender_type === 'user' && !m.read_at).length || 0,
          lastMessage: t.messages?.[t.messages.length - 1]
        }))
        setThreads(threadsWithOrgName)
      }
    } catch (err) {
      console.error('Error loading threads:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (threadId: string) => {
    if (!supabase) return

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)

    // Mark user messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('sender_type', 'user')
      .is('read_at', null)

    loadAllThreads()
  }

  const selectThread = (thread: any) => {
    setSelectedThread(thread)
    loadMessages(thread.id)
    setMobileView('chat')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !supabase) return

    setIsSending(true)
    try {
      await supabase.from('messages').insert({
        thread_id: selectedThread.id,
        sender_type: 'dpo',
        sender_name: dpo?.name || 'הממונה',
        content: newMessage
      })

      setNewMessage('')
      loadMessages(selectedThread.id)
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    else if (days === 1) return 'אתמול'
    else if (days < 7) return `לפני ${days} ימים`
    else return date.toLocaleDateString('he-IL')
  }

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>

  const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold">הודעות מלקוחות</h2>
        {totalUnread > 0 && <Badge variant="destructive">{totalUnread} חדשות</Badge>}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        {mobileView === 'list' ? (
          <Card>
            <CardContent className="p-2">
              {threads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">אין הודעות</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {threads.map((thread) => (
                    <button key={thread.id} onClick={() => selectThread(thread)} className="w-full p-3 rounded-lg text-right hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-purple-600 mb-0.5">{thread.orgName}</p>
                        <p className={`font-medium truncate text-sm ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'}`}>{thread.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{thread.lastMessage?.content || ''}</p>
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
                <Button variant="ghost" size="icon" onClick={() => setMobileView('list')}><ArrowRight className="h-5 w-5" /></Button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-600">{selectedThread?.orgName}</p>
                  <CardTitle className="text-base truncate">{selectedThread?.subject}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'dpo' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-2.5 rounded-lg text-sm ${msg.sender_type === 'dpo' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'dpo' ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input placeholder="כתבו תגובה..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }} />
                <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || isSending} className="bg-purple-600 hover:bg-purple-700">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 max-h-[600px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0"><CardTitle className="text-base">שיחות ({threads.length})</CardTitle></CardHeader>
          <CardContent className="p-2 overflow-y-auto flex-1">
            {threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" /><p className="text-sm">אין הודעות</p></div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <button key={thread.id} onClick={() => selectThread(thread)} className={`w-full p-3 rounded-lg text-right transition-colors ${selectedThread?.id === thread.id ? 'bg-purple-100 border border-purple-300' : 'hover:bg-gray-50'}`}>
                    <p className="text-xs text-purple-600 mb-0.5">{thread.orgName}</p>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate text-sm ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'}`}>{thread.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{thread.lastMessage?.content || ''}</p>
                      </div>
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
              <CardHeader className="border-b py-3">
                <p className="text-xs text-purple-600">{selectedThread.orgName}</p>
                <CardTitle className="text-base">{selectedThread.subject}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'dpo' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] p-3 rounded-lg ${msg.sender_type === 'dpo' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-100 rounded-tl-none'}`}>
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_type === 'dpo' ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Textarea placeholder="כתבו תגובה..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
                  <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} className="self-end bg-purple-600 hover:bg-purple-700">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
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

// ============== ESCALATIONS TAB ==============
function EscalationsTab({ escalations, organizations, supabase, onUpdate }: any) {
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [isSaving, setIsSaving] = useState(false)

  const getPriorityLabel = (priority: string) => ({ urgent: 'דחוף', high: 'גבוה', medium: 'בינוני', low: 'נמוך' }[priority] || priority)
  const getStatusLabel = (status: string) => ({ open: 'פתוח', in_progress: 'בטיפול', resolved: 'נפתר', closed: 'סגור' }[status] || status)

  const updateStatus = async (status: string) => {
    if (!selectedEscalation || !supabase) return
    setIsSaving(true)
    try {
      await supabase.from('escalations').update({ status }).eq('id', selectedEscalation.id)
      setSelectedEscalation({ ...selectedEscalation, status })
      onUpdate()
    } catch (err) { console.error(err) }
    finally { setIsSaving(false) }
  }

  const sendResponse = async () => {
    if (!response.trim() || !selectedEscalation || !supabase) return
    setIsSaving(true)
    try {
      await supabase.from('escalations').update({ 
        resolution: response, 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }).eq('id', selectedEscalation.id)
      setResponse('')
      setSelectedEscalation({ ...selectedEscalation, resolution: response, status: 'resolved' })
      onUpdate()
    } catch (err) { console.error(err) }
    finally { setIsSaving(false) }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg md:text-xl font-bold">פניות ({escalations.length})</h2>

      {/* Mobile */}
      <div className="md:hidden">
        {mobileView === 'list' ? (
          <div className="space-y-2">
            {escalations.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-gray-500">אין פניות</CardContent></Card>
            ) : (
              escalations.map((esc: any) => {
                const org = organizations.find((o: any) => o.id === esc.org_id)
                return (
                  <Card key={esc.id} className="cursor-pointer" onClick={() => { setSelectedEscalation(esc); setMobileView('detail') }}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{esc.subject}</p>
                          <p className="text-xs text-gray-500">{org?.name}</p>
                        </div>
                        <Badge variant={esc.priority === 'urgent' ? 'destructive' : esc.priority === 'high' ? 'warning' : 'secondary'} className="text-xs">{getPriorityLabel(esc.priority)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setMobileView('list')}><ArrowRight className="h-5 w-5" /></Button>
                <div className="flex-1"><CardTitle className="text-base">{selectedEscalation?.subject}</CardTitle></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-sm">{selectedEscalation?.description || 'אין תיאור'}</p></div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{getPriorityLabel(selectedEscalation?.priority)}</Badge>
                <Badge variant={selectedEscalation?.status === 'open' ? 'warning' : 'secondary'}>{getStatusLabel(selectedEscalation?.status)}</Badge>
              </div>
              {selectedEscalation?.status !== 'closed' && selectedEscalation?.status !== 'resolved' && (
                <div className="space-y-2">
                  <Textarea placeholder="תגובה/פתרון..." value={response} onChange={(e) => setResponse(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => updateStatus('in_progress')} disabled={isSaving}>בטיפול</Button>
                    <Button size="sm" className="flex-1 bg-purple-600" onClick={sendResponse} disabled={!response.trim() || isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'סגור פנייה'}
                    </Button>
                  </div>
                </div>
              )}
              {selectedEscalation?.resolution && (
                <div className="p-3 bg-green-50 rounded-lg"><p className="text-sm text-green-800">{selectedEscalation.resolution}</p></div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {escalations.map((esc: any) => {
            const org = organizations.find((o: any) => o.id === esc.org_id)
            return (
              <Card key={esc.id} className={`cursor-pointer ${selectedEscalation?.id === esc.id ? 'ring-2 ring-purple-500' : ''}`} onClick={() => setSelectedEscalation(esc)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div><p className="font-medium text-sm">{esc.subject}</p><p className="text-xs text-gray-500">{org?.name}</p></div>
                    <Badge variant={esc.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">{getPriorityLabel(esc.priority)}</Badge>
                  </div>
                  <Badge variant={esc.status === 'open' ? 'warning' : 'secondary'} className="text-xs">{getStatusLabel(esc.status)}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {selectedEscalation ? (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{selectedEscalation.subject}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-sm">{selectedEscalation.description || 'אין תיאור'}</p></div>
              {selectedEscalation.status !== 'closed' && selectedEscalation.status !== 'resolved' && (
                <div className="space-y-2">
                  <Textarea placeholder="תגובה/פתרון..." value={response} onChange={(e) => setResponse(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => updateStatus('in_progress')} disabled={isSaving}>בטיפול</Button>
                    <Button size="sm" className="bg-purple-600" onClick={sendResponse} disabled={!response.trim() || isSaving}>סגור פנייה</Button>
                  </div>
                </div>
              )}
              {selectedEscalation.resolution && <div className="p-3 bg-green-50 rounded-lg"><p className="text-sm text-green-800">{selectedEscalation.resolution}</p></div>}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64"><p className="text-gray-500 text-sm">בחר פנייה</p></Card>
        )}
      </div>
    </div>
  )
}

// ============== TIME TRACKING TAB ==============
function TimeTrackingTab({ escalations, organizations }: any) {
  const timeByOrg = organizations.map((org: any) => {
    const orgEscalations = escalations.filter((e: any) => e.org_id === org.id)
    const totalMinutes = orgEscalations.reduce((sum: number, e: any) => sum + (e.dpo_time_minutes || 0), 0)
    return { ...org, totalMinutes, escalationCount: orgEscalations.length }
  }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)

  const totalMinutes = escalations.reduce((sum: number, e: any) => sum + (e.dpo_time_minutes || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-lg md:text-xl font-bold">מעקב זמן</h2>
        <Card className="p-3">
          <div className="text-center">
            <p className="text-xs text-gray-600">סה״כ החודש</p>
            <p className="text-xl font-bold">{totalMinutes} דק'</p>
            <p className="text-xs text-gray-500">{(totalMinutes / 60).toFixed(1)} שעות</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">זמן לפי לקוח</CardTitle></CardHeader>
        <CardContent>
          {timeByOrg.filter((o: any) => o.totalMinutes > 0).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">אין נתונים</p>
          ) : (
            <div className="space-y-4">
              {timeByOrg.filter((o: any) => o.totalMinutes > 0).map((org: any) => (
                <div key={org.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{org.name}</span>
                    <span className="text-gray-500">{org.totalMinutes} דק'</span>
                  </div>
                  <Progress value={timeByOrg[0]?.totalMinutes ? (org.totalMinutes / timeByOrg[0].totalMinutes) * 100 : 0} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
