'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2,
  User,
  LogOut,
  Bot,
  Loader2,
  Menu,
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  Settings,
  ChevronLeft,
  Clock,
  Plus,
  Eye,
  Download,
  Bell,
  X,
  Sparkles,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import WelcomeModal from '@/components/WelcomeModal'

// ============================================
// TYPES
// ============================================
interface Task {
  id: string
  type: 'missing_doc' | 'dsar' | 'review' | 'incident' | 'periodic'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  deadline?: string
  action: string
  actionPath?: string
}

interface Document {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  content?: string
}

// ============================================
// MAIN COMPONENT
// ============================================
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, signOut, loading, supabase } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'incidents' | 'settings'>('overview')
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [complianceScore, setComplianceScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    if (user && supabase) {
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      loadAllData()
    }
  }, [user, supabase])

  const loadAllData = async () => {
    if (!user || !supabase) return
    setIsLoading(true)

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_user_id', user.id)
        .single()

      if (userData?.organizations) {
        const org = userData.organizations
        setOrganization(org)
        
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (docs) setDocuments(docs)

        const { data: incidentData } = await supabase
          .from('security_incidents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (incidentData) setIncidents(incidentData)

        const { data: dsarData } = await supabase
          .from('dsar_requests')
          .select('*')
          .eq('org_id', org.id)
          .in('status', ['pending', 'in_progress'])

        const score = calculateScore(docs || [], incidentData || [])
        setComplianceScore(score)
        
        const generatedTasks = generateTasks(docs || [], incidentData || [], dsarData || [], org)
        setTasks(generatedTasks)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateScore = (docs: any[], incidents: any[]) => {
    let score = 25
    const docTypes = docs.map(d => d.type)
    if (docTypes.includes('privacy_policy')) score += 15
    if (docTypes.includes('security_policy') || docTypes.includes('security_procedures')) score += 15
    if (docTypes.includes('dpo_appointment')) score += 10
    if (docTypes.includes('database_registration') || docTypes.includes('database_definition')) score += 10
    if (docs.length >= 5) score += 10
    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    score -= openIncidents.length * 5
    return Math.max(0, Math.min(100, score))
  }

  const generateTasks = (docs: any[], incidents: any[], dsars: any[], org: any): Task[] => {
    const tasks: Task[] = []
    const docTypes = docs.map(d => d.type)

    if (!docTypes.includes('privacy_policy')) {
      tasks.push({
        id: 'missing-privacy',
        type: 'missing_doc',
        title: 'יצירת מדיניות פרטיות',
        description: 'מדיניות פרטיות היא דרישה בסיסית בתיקון 13',
        priority: 'high',
        action: 'צור מדיניות',
        actionPath: '/chat'
      })
    }

    if (!docTypes.includes('security_policy') && !docTypes.includes('security_procedures')) {
      tasks.push({
        id: 'missing-security',
        type: 'missing_doc',
        title: 'יצירת נוהל אבטחת מידע',
        description: 'נדרש נוהל אבטחה מתועד לארגון',
        priority: 'high',
        action: 'צור נוהל',
        actionPath: '/chat'
      })
    }

    if (!docTypes.includes('dpo_appointment')) {
      tasks.push({
        id: 'missing-dpo',
        type: 'missing_doc',
        title: 'כתב מינוי DPO',
        description: 'יש להפיק כתב מינוי רשמי לממונה',
        priority: 'medium',
        action: 'צור כתב מינוי',
        actionPath: '/chat'
      })
    }

    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    openIncidents.forEach(incident => {
      const deadline = incident.authority_deadline ? new Date(incident.authority_deadline) : null
      const isUrgent = deadline && (deadline.getTime() - Date.now()) < 24 * 60 * 60 * 1000

      tasks.push({
        id: `incident-${incident.id}`,
        type: 'incident',
        title: `טיפול באירוע: ${incident.title}`,
        description: isUrgent ? '⚠️ פחות מ-24 שעות לדדליין!' : 'אירוע אבטחה פתוח דורש טיפול',
        priority: isUrgent ? 'high' : 'medium',
        deadline: deadline?.toLocaleDateString('he-IL'),
        action: 'טפל באירוע',
        actionPath: '/dashboard?tab=incidents'
      })
    })

    dsars.forEach(dsar => {
      tasks.push({
        id: `dsar-${dsar.id}`,
        type: 'dsar',
        title: `בקשת ${dsar.request_type === 'access' ? 'עיון' : dsar.request_type === 'deletion' ? 'מחיקה' : 'תיקון'} ממידע`,
        description: `מאת: ${dsar.requester_name || 'לא ידוע'}`,
        priority: 'medium',
        deadline: dsar.deadline,
        action: 'טפל בבקשה',
        actionPath: '/chat'
      })
    })

    const priorityOrder = { high: 0, medium: 1, low: 2 }
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return tasks
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activeIncidentsCount = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length
  const urgentTasksCount = tasks.filter(t => t.priority === 'high').length

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal 
          onClose={() => setShowWelcome(false)} 
          orgName={organization?.name || ''} 
          documentsCount={documents.length}
          complianceScore={complianceScore}
        />
      )}

      {/* Premium Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-l border-slate-200/50 transform transition-all duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static shadow-2xl shadow-slate-200/50 lg:shadow-none`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl bg-gradient-to-r from-blue-700 to-blue-600 bg-clip-text text-transparent">MyDPO</span>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">PRIVACY PROTECTION</p>
              </div>
            </Link>
          </div>

          {/* AI Assistant Button */}
          <div className="p-4">
            <Link href="/chat">
              <button className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold">צ׳אט עם הממונה</span>
                    <span className="text-xs text-emerald-100">AI מוכן לעזור</span>
                  </div>
                  <Sparkles className="h-4 w-4 text-emerald-200" />
                </div>
              </button>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1">
            <NavButton 
              icon={<LayoutDashboard className="h-5 w-5" />} 
              label="לוח בקרה" 
              active={activeTab === 'overview'} 
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false) }} 
            />
            <NavButton 
              icon={<ClipboardList className="h-5 w-5" />} 
              label="משימות" 
              active={activeTab === 'tasks'} 
              onClick={() => { setActiveTab('tasks'); setMobileMenuOpen(false) }}
              badge={urgentTasksCount > 0 ? urgentTasksCount : undefined}
              badgeColor="red"
            />
            <NavButton 
              icon={<FolderOpen className="h-5 w-5" />} 
              label="מסמכים" 
              active={activeTab === 'documents'} 
              onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false) }} 
            />
            <NavButton 
              icon={<AlertTriangle className="h-5 w-5" />} 
              label="אירועי אבטחה" 
              active={activeTab === 'incidents'} 
              onClick={() => { setActiveTab('incidents'); setMobileMenuOpen(false) }}
              badge={activeIncidentsCount > 0 ? activeIncidentsCount : undefined}
              badgeColor="red"
            />
            <NavButton 
              icon={<Settings className="h-5 w-5" />} 
              label="הגדרות" 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }} 
            />
          </nav>

          {/* User Card */}
          <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center ring-2 ring-blue-500/20">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-colors"
            >
              <LogOut className="h-4 w-4" />
              התנתקות
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:mr-0 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-700 to-blue-600 bg-clip-text text-transparent">MyDPO</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab 
              organization={organization}
              complianceScore={complianceScore}
              tasks={tasks}
              documents={documents}
              incidents={incidents}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab 
              tasks={tasks}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab 
              documents={documents}
              organization={organization}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'incidents' && (
            <IncidentsTab 
              incidents={incidents}
              orgId={organization?.id}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab 
              organization={organization}
              user={user}
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================
// NAV BUTTON
// ============================================
function NavButton({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge, 
  badgeColor = 'blue' 
}: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeColor?: 'red' | 'blue' | 'green'
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all duration-200 ${
        active 
          ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-700 font-semibold shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <span className={active ? 'text-blue-600' : 'text-slate-400'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`${badgeColor === 'red' ? 'bg-red-500' : 'bg-blue-500'} text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ============================================
// OVERVIEW TAB
// ============================================
function OverviewTab({ 
  organization, 
  complianceScore, 
  tasks, 
  documents, 
  incidents,
  onNavigate 
}: { 
  organization: any
  complianceScore: number
  tasks: Task[]
  documents: Document[]
  incidents: any[]
  onNavigate: (tab: any) => void
}) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const urgentTasks = tasks.filter(t => t.priority === 'high')
  const hasSubscription = organization?.subscription_status === 'active'

  const getScoreGradient = () => {
    if (complianceScore >= 70) return 'from-emerald-500 to-green-500'
    if (complianceScore >= 40) return 'from-amber-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  const getScoreLabel = () => {
    if (complianceScore >= 70) return { text: 'מצוין', color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (complianceScore >= 40) return { text: 'טעון שיפור', color: 'text-amber-600', bg: 'bg-amber-50' }
    return { text: 'דורש טיפול', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const scoreInfo = getScoreLabel()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
            שלום, {organization?.name || 'משתמש'} 👋
          </h1>
          <p className="text-slate-500 mt-1">הנה סקירה של מצב הציות שלכם</p>
        </div>
        <div className="hidden sm:block">
          <Link href="/chat">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
              <Bot className="h-4 w-4 ml-2" />
              שאל את הממונה
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {activeIncidents.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 p-5 text-white shadow-lg shadow-red-500/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">{activeIncidents.length} אירועי אבטחה פעילים</p>
                <p className="text-red-100">נדרשת תשומת לב מיידית</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              className="bg-white text-red-600 hover:bg-red-50 shadow-lg"
              onClick={() => onNavigate('incidents')}
            >
              טיפול מיידי
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {urgentTasks.length > 0 && !activeIncidents.length && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-amber-500/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">{urgentTasks.length} משימות דחופות</p>
                <p className="text-amber-100">יש לטפל בהן בהקדם</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              className="bg-white text-amber-600 hover:bg-amber-50 shadow-lg"
              onClick={() => onNavigate('tasks')}
            >
              צפייה במשימות
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compliance Score Card */}
        <div className="lg:col-span-1">
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="relative">
              <p className="text-sm font-medium text-slate-500 mb-4">ציון ציות</p>
              
              {/* Score Circle */}
              <div className="relative w-36 h-36 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle 
                    cx="70" 
                    cy="70" 
                    r="60" 
                    fill="none" 
                    stroke="url(#scoreGradient)"
                    strokeWidth="12" 
                    strokeLinecap="round"
                    strokeDasharray={`${complianceScore * 3.77} 377`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" className={complianceScore >= 70 ? 'text-emerald-500' : complianceScore >= 40 ? 'text-amber-500' : 'text-red-500'} stopColor="currentColor" />
                      <stop offset="100%" className={complianceScore >= 70 ? 'text-green-500' : complianceScore >= 40 ? 'text-orange-500' : 'text-rose-500'} stopColor="currentColor" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-800">{complianceScore}</span>
                  <span className="text-sm text-slate-400">מתוך 100</span>
                </div>
              </div>

              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${scoreInfo.bg} ${scoreInfo.color}`}>
                  {complianceScore >= 70 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {scoreInfo.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {/* Documents Card */}
          <div className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">מסמכים פעילים</p>
                <p className="text-3xl font-bold text-slate-800">{documents.length}</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('documents')}
              className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              צפייה במסמכים
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Tasks Card */}
          <div className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">משימות פתוחות</p>
                <p className="text-3xl font-bold text-slate-800">{tasks.length}</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('tasks')}
              className="mt-4 w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium hover:bg-purple-50 rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              צפייה במשימות
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* DPO Card */}
          <div className="sm:col-span-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm ring-2 ring-white/20">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">הממונה שלכם</p>
                  <p className="text-xl font-semibold">עו"ד דנה כהן</p>
                  <p className="text-slate-400 text-sm">ממונה הגנת פרטיות מוסמכת</p>
                </div>
              </div>
              <Link href="/chat">
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm">
                  <MessageSquare className="h-4 w-4 ml-2" />
                  שליחת הודעה
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next Section */}
      {tasks.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">מה הצעד הבא?</h2>
              <p className="text-slate-500 text-sm">המשימות הכי חשובות כרגע</p>
            </div>
            <button 
              onClick={() => onNavigate('tasks')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              כל המשימות
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 3).map((task, index) => (
              <div 
                key={task.id} 
                className={`group relative overflow-hidden rounded-2xl p-4 transition-all hover:shadow-lg ${
                  task.priority === 'high' 
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 hover:border-red-200' 
                    : task.priority === 'medium' 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 hover:border-amber-200' 
                    : 'bg-slate-50 border border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.priority === 'high' ? 'bg-red-100' : task.priority === 'medium' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <span className="text-lg font-bold text-slate-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    <p className="text-sm text-slate-500 truncate">{task.description}</p>
                  </div>
                  <Link href={task.actionPath || '/chat'}>
                    <Button 
                      size="sm" 
                      className={
                        task.priority === 'high' 
                          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                          : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                      }
                    >
                      {task.action}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell */}
      {!hasSubscription && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-xl">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-lg">שדרגו לחבילה מלאה</p>
                <p className="text-blue-100">קבלו גישה לכל הכלים והתמיכה של ממונה מוסמך</p>
              </div>
            </div>
            <Link href="/subscribe">
              <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
                צפייה בחבילות
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// TASKS TAB
// ============================================
function TasksTab({ tasks, onRefresh }: { tasks: Task[], onRefresh: () => void }) {
  const getPriorityStyle = (priority: string) => {
    const styles = {
      high: { badge: 'bg-red-100 text-red-700', icon: 'bg-red-100 text-red-600', card: 'border-red-100 hover:border-red-200' },
      medium: { badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-100 text-amber-600', card: 'border-amber-100 hover:border-amber-200' },
      low: { badge: 'bg-slate-100 text-slate-700', icon: 'bg-slate-100 text-slate-600', card: 'border-slate-100 hover:border-slate-200' }
    }
    return styles[priority as keyof typeof styles] || styles.low
  }

  const getPriorityLabel = (priority: string) => {
    const labels = { high: 'דחוף', medium: 'רגיל', low: 'נמוך' }
    return labels[priority as keyof typeof labels] || priority
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      missing_doc: <FileText className="h-5 w-5" />,
      dsar: <User className="h-5 w-5" />,
      review: <Eye className="h-5 w-5" />,
      incident: <AlertTriangle className="h-5 w-5" />,
      periodic: <Clock className="h-5 w-5" />
    }
    return icons[type as keyof typeof icons] || <ClipboardList className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">משימות</h1>
          <p className="text-slate-500 mt-1">כל מה שצריך לעשות במקום אחד</p>
        </div>
        <Link href="/chat">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
            <Plus className="h-4 w-4 ml-2" />
            משימה חדשה
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">מצוין! אין משימות פתוחות</h3>
          <p className="text-slate-500">כל המשימות הושלמו. המשיכו כך!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const style = getPriorityStyle(task.priority)
            return (
              <div 
                key={task.id} 
                className={`rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 border ${style.card} hover:shadow-xl transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${style.icon} flex items-center justify-center flex-shrink-0`}>
                    {getTypeIcon(task.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{task.description}</p>
                    {task.deadline && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        דדליין: {task.deadline}
                      </p>
                    )}
                  </div>
                  <Link href={task.actionPath || '/chat'}>
                    <Button 
                      size="sm" 
                      className={
                        task.priority === 'high' 
                          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                          : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                      }
                    >
                      {task.action}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// DOCUMENTS TAB
// ============================================
function DocumentsTab({ documents, organization, onRefresh }: { documents: Document[], organization: any, onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  const isPaid = organization?.subscription_status === 'active'

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      security_policy: 'מדיניות אבטחה',
      security_procedures: 'נוהלי אבטחה',
      dpo_appointment: 'כתב מינוי DPO',
      database_registration: 'רישום מאגר',
      database_definition: 'הגדרת מאגר',
      consent_form: 'טופס הסכמה',
      employee_policy: 'מדיניות עובדים',
      ropa: 'מפת עיבוד (ROPA)',
      dpa: 'הסכם עיבוד מידע'
    }
    return labels[type] || type
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      draft: 'bg-slate-100 text-slate-700',
      pending: 'bg-amber-100 text-amber-700'
    }
    return styles[status] || 'bg-slate-100 text-slate-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { active: 'פעיל', draft: 'טיוטה', pending: 'ממתין' }
    return labels[status] || status
  }

  const filteredDocs = filter === 'all' ? documents : documents.filter(d => d.type === filter)
  const docTypes = Array.from(new Set(documents.map(d => d.type)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">מסמכים</h1>
          <p className="text-slate-500 mt-1">כל המסמכים והמדיניות של הארגון</p>
        </div>
        <Link href="/chat">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
            <Plus className="h-4 w-4 ml-2" />
            מסמך חדש
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'all' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          הכל ({documents.length})
        </button>
        {docTypes.map(type => (
          <button 
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === type 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {getDocTypeLabel(type)}
          </button>
        ))}
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">אין מסמכים עדיין</h3>
          <p className="text-slate-500 mb-5">התחילו ביצירת מדיניות פרטיות דרך הצ׳אט</p>
          <Link href="/chat">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
              <Bot className="h-4 w-4 ml-2" />
              יצירת מסמך
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div 
              key={doc.id} 
              className="group rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-100 transition-colors">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 truncate">{doc.name || getDocTypeLabel(doc.type)}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" title="צפייה">
                    <Eye className="h-4 w-4 text-slate-600" />
                  </button>
                  {isPaid && (
                    <button className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" title="הורדה">
                      <Download className="h-4 w-4 text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// INCIDENTS TAB
// ============================================
function IncidentsTab({ incidents, orgId, onRefresh }: { incidents: any[], orgId: string, onRefresh: () => void }) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const closedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status))

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-red-100 text-red-700',
      investigating: 'bg-amber-100 text-amber-700',
      contained: 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-slate-100 text-slate-700'
    }
    return styles[status] || 'bg-slate-100 text-slate-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדש',
      investigating: 'בבדיקה',
      contained: 'נבלם',
      resolved: 'טופל',
      closed: 'סגור'
    }
    return labels[status] || status
  }

  const getTimeRemaining = (deadline: string) => {
    const now = new Date()
    const dl = new Date(deadline)
    const diff = dl.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 0) return { text: 'עבר הדדליין!', urgent: true }
    if (hours < 24) return { text: `${hours} שעות`, urgent: true }
    const days = Math.floor(hours / 24)
    return { text: `${days} ימים`, urgent: false }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">אירועי אבטחה</h1>
          <p className="text-slate-500 mt-1">ניהול ותיעוד אירועי אבטחה ופרטיות</p>
        </div>
        <Link href="/chat">
          <Button className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/25">
            <AlertTriangle className="h-4 w-4 ml-2" />
            דיווח אירוע חדש
          </Button>
        </Link>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-lg font-semibold text-slate-800">אירועים פעילים ({activeIncidents.length})</h2>
          </div>
          <div className="space-y-3">
            {activeIncidents.map(incident => {
              const timeLeft = incident.authority_deadline ? getTimeRemaining(incident.authority_deadline) : null
              return (
                <div 
                  key={incident.id} 
                  className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 border border-red-100 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{incident.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                            {getStatusLabel(incident.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{incident.description?.slice(0, 100)}...</p>
                        {timeLeft && (
                          <p className={`text-sm mt-2 flex items-center gap-1 ${timeLeft.urgent ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                            <Clock className="h-4 w-4" />
                            זמן לדיווח לרשות: {timeLeft.text}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25">
                      טיפול
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {incidents.length === 0 && (
        <div className="rounded-3xl bg-white p-12 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">אין אירועי אבטחה</h3>
          <p className="text-slate-500">לא דווחו אירועי אבטחה. המשיכו לשמור על הפרטיות!</p>
        </div>
      )}

      {/* Closed Incidents */}
      {closedIncidents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-500 mb-4">היסטוריה ({closedIncidents.length})</h2>
          <div className="space-y-2">
            {closedIncidents.slice(0, 5).map(incident => (
              <div key={incident.id} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{incident.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                      {getStatusLabel(incident.status)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(incident.created_at).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SETTINGS TAB
// ============================================
function SettingsTab({ organization, user }: { organization: any, user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">הגדרות</h1>
        <p className="text-slate-500 mt-1">ניהול הארגון והחשבון</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">פרטי הארגון</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-500">שם העסק</label>
            <p className="font-semibold text-slate-800 mt-1">{organization?.name || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-500">מספר ח.פ</label>
            <p className="font-semibold text-slate-800 mt-1">{organization?.business_id || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-500">חבילה</label>
            <p className="mt-1">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                {organization?.tier === 'extended' ? 'מורחבת' : organization?.tier === 'enterprise' ? 'ארגונית' : 'בסיסית'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-500">סטטוס</label>
            <p className="mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${organization?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {organization?.status === 'active' ? 'פעיל' : 'בהקמה'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">פרטי משתמש</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-500">אימייל</label>
            <p className="font-semibold text-slate-800 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-slate-500">שם</label>
            <p className="font-semibold text-slate-800 mt-1">{user?.user_metadata?.name || '-'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">ניהול חבילה ותשלום</h2>
            <p className="text-slate-400">לשדרוג או שינוי חבילה</p>
          </div>
          <Link href="/subscribe">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm">
              ניהול חבילה
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ============================================
// EXPORT
// ============================================
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
