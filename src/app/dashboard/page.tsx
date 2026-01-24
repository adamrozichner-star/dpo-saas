'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
  X
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
        action: 'התחל',
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
        action: 'התחל',
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
        action: 'התחל',
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
        description: isUrgent ? 'פחות מ-24 שעות לדדליין!' : 'אירוע אבטחה פתוח דורש טיפול',
        priority: isUrgent ? 'high' : 'medium',
        deadline: deadline?.toLocaleDateString('he-IL'),
        action: 'טפל',
        actionPath: `/chat?incident=${incident.id}`
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
        action: 'טפל',
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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal 
          onClose={() => setShowWelcome(false)} 
          orgName={organization?.name || ''} 
          documentsCount={documents.length}
          complianceScore={complianceScore}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-stone-100/80 backdrop-blur-sm border-l border-stone-200 transform transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-stone-800">MyDPO</span>
            </Link>
          </div>

          {/* Chat Button */}
          <div className="px-4 pb-4">
            <Link href="/chat">
              <button className="w-full py-3 px-4 bg-teal-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-teal-600 transition-colors shadow-sm">
                <Bot className="h-5 w-5" />
                צ׳אט עם הממונה
              </button>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
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
            />
            <NavButton 
              icon={<Settings className="h-5 w-5" />} 
              label="הגדרות" 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }} 
            />
          </nav>

          {/* User */}
          <div className="p-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{userName}</p>
                  <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                התנתקות
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-stone-50/90 backdrop-blur-sm border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-stone-800">MyDPO</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center"
          >
            <Menu className="h-5 w-5 text-stone-600" />
          </button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
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
            <TasksTab tasks={tasks} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab documents={documents} organization={organization} />
          )}
          {activeTab === 'incidents' && (
            <IncidentsTab incidents={incidents} orgId={organization?.id} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab organization={organization} user={user} />
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
  badge
}: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors ${
        active 
          ? 'bg-white text-indigo-600 font-medium shadow-sm' 
          : 'text-stone-600 hover:bg-white/50'
      }`}
    >
      <span className={active ? 'text-indigo-500' : 'text-stone-400'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-rose-100 text-rose-600 text-xs font-medium px-2 py-0.5 rounded-full">
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
  const hasSubscription = organization?.subscription_status === 'active'

  const getScoreInfo = () => {
    if (complianceScore >= 70) return { label: 'מצוין', bg: 'bg-emerald-100', text: 'text-emerald-700' }
    if (complianceScore >= 40) return { label: 'טעון שיפור', bg: 'bg-amber-100', text: 'text-amber-700' }
    return { label: 'דורש טיפול', bg: 'bg-rose-100', text: 'text-rose-700' }
  }

  const scoreInfo = getScoreInfo()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">
          👋 שלום, {organization?.name || 'משתמש'}
        </h1>
        <p className="text-stone-500 mt-1">הנה סקירה של מצב הציות שלכם</p>
      </div>

      {/* Top Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-stone-500">ציון ציות</p>
            <span className={`px-2.5 py-1 ${scoreInfo.bg} ${scoreInfo.text} rounded-full text-xs font-medium`}>
              {scoreInfo.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-stone-800">{complianceScore}</span>
            <span className="text-stone-400 text-lg">/100</span>
          </div>
        </div>

        {/* DPO Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-4">הממונה שלכם</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-6 w-6 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-stone-800">עו"ד דנה כהן</p>
              <p className="text-sm text-stone-500">ממונה הגנת פרטיות</p>
            </div>
            <Link href="/chat">
              <button className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium">
                שלח הודעה
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 flex items-center gap-4 cursor-pointer hover:border-stone-300 transition-colors" onClick={() => onNavigate('documents')}>
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{documents.length}</p>
            <p className="text-sm text-stone-500">מסמכים</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 flex items-center gap-4 cursor-pointer hover:border-stone-300 transition-colors" onClick={() => onNavigate('tasks')}>
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{tasks.length}</p>
            <p className="text-sm text-stone-500">משימות פתוחות</p>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-800">📋 מה הצעד הבא?</h2>
            <button 
              onClick={() => onNavigate('tasks')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              כל המשימות
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 3).map((task, index) => (
              <div 
                key={task.id} 
                className={`flex items-center gap-4 p-3 rounded-xl border ${
                  task.priority === 'high' 
                    ? 'bg-rose-50 border-rose-100' 
                    : task.priority === 'medium' 
                    ? 'bg-amber-50 border-amber-100' 
                    : 'bg-stone-50 border-stone-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  task.priority === 'high' 
                    ? 'bg-rose-200 text-rose-700' 
                    : task.priority === 'medium' 
                    ? 'bg-amber-200 text-amber-700' 
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800">{task.title}</p>
                  <p className="text-sm text-stone-500 truncate">{task.description}</p>
                </div>
                <Link href={task.actionPath || '/chat'}>
                  <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
                    {task.action}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Card */}
      {!hasSubscription && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-stone-800">שדרגו לחבילה מלאה</p>
                <p className="text-sm text-stone-500">גישה לכל הכלים והתמיכה של ממונה מוסמך</p>
              </div>
            </div>
            <Link href="/subscribe">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
                צפייה בחבילות
              </button>
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
function TasksTab({ tasks }: { tasks: Task[] }) {
  const getPriorityStyle = (priority: string) => {
    const styles = {
      high: { bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700', number: 'bg-rose-200 text-rose-700' },
      medium: { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', number: 'bg-amber-200 text-amber-700' },
      low: { bg: 'bg-stone-50', border: 'border-stone-100', badge: 'bg-stone-100 text-stone-700', number: 'bg-stone-200 text-stone-700' }
    }
    return styles[priority as keyof typeof styles] || styles.low
  }

  const getPriorityLabel = (priority: string) => {
    const labels = { high: 'דחוף', medium: 'רגיל', low: 'נמוך' }
    return labels[priority as keyof typeof labels] || priority
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">📋 משימות</h1>
          <p className="text-stone-500 mt-1">כל מה שצריך לעשות במקום אחד</p>
        </div>
        <Link href="/chat">
          <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" />
            משימה חדשה
          </button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">מצוין! אין משימות פתוחות</h3>
          <p className="text-stone-500">כל המשימות הושלמו. המשיכו כך! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            const style = getPriorityStyle(task.priority)
            return (
              <div 
                key={task.id} 
                className={`${style.bg} rounded-xl p-4 border ${style.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full ${style.number} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-stone-800">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">{task.description}</p>
                    {task.deadline && (
                      <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        דדליין: {task.deadline}
                      </p>
                    )}
                  </div>
                  <Link href={task.actionPath || '/chat'}>
                    <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
                      {task.action}
                    </button>
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
function DocumentsTab({ documents, organization }: { documents: Document[], organization: any }) {
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
      draft: 'bg-stone-100 text-stone-700',
      pending: 'bg-amber-100 text-amber-700'
    }
    return styles[status] || 'bg-stone-100 text-stone-700'
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
          <h1 className="text-2xl font-semibold text-stone-800">📁 מסמכים</h1>
          <p className="text-stone-500 mt-1">כל המסמכים והמדיניות של הארגון</p>
        </div>
        <Link href="/chat">
          <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" />
            מסמך חדש
          </button>
        </Link>
      </div>

      {/* Filters */}
      {docTypes.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            הכל ({documents.length})
          </button>
          {docTypes.map(type => (
            <button 
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {getDocTypeLabel(type)}
            </button>
          ))}
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-stone-300" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">אין מסמכים עדיין</h3>
          <p className="text-stone-500 mb-4">התחילו ביצירת מדיניות פרטיות דרך הצ׳אט</p>
          <Link href="/chat">
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
              <Bot className="h-4 w-4 inline ml-2" />
              יצירת מסמך
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div 
              key={doc.id} 
              className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-stone-800 truncate">{doc.name || getDocTypeLabel(doc.type)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(doc.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors" title="צפייה">
                    <Eye className="h-4 w-4 text-stone-500" />
                  </button>
                  {isPaid && (
                    <button className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors" title="הורדה">
                      <Download className="h-4 w-4 text-stone-500" />
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
function IncidentsTab({ incidents, orgId }: { incidents: any[], orgId: string }) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const closedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status))

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-rose-100 text-rose-700',
      investigating: 'bg-amber-100 text-amber-700',
      contained: 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-stone-100 text-stone-700'
    }
    return styles[status] || 'bg-stone-100 text-stone-700'
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
          <h1 className="text-2xl font-semibold text-stone-800">🚨 אירועי אבטחה</h1>
          <p className="text-stone-500 mt-1">ניהול ותיעוד אירועי אבטחה ופרטיות</p>
        </div>
        <Link href="/chat">
          <button className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            דיווח אירוע חדש
          </button>
        </Link>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="font-semibold text-stone-800">אירועים פעילים ({activeIncidents.length})</h2>
          </div>
          <div className="space-y-3">
            {activeIncidents.map(incident => {
              const timeLeft = incident.authority_deadline ? getTimeRemaining(incident.authority_deadline) : null
              return (
                <div 
                  key={incident.id} 
                  className="bg-white rounded-xl p-4 shadow-sm border border-rose-100"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-stone-800">{incident.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                          {getStatusLabel(incident.status)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500">{incident.description?.slice(0, 100)}...</p>
                      {timeLeft && (
                        <p className={`text-sm mt-2 flex items-center gap-1 ${timeLeft.urgent ? 'text-rose-600 font-medium' : 'text-stone-500'}`}>
                          <Clock className="h-4 w-4" />
                          זמן לדיווח לרשות: {timeLeft.text}
                        </p>
                      )}
                    </div>
                    <Link href={`/chat?incident=${incident.id}`}>
                      <button className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors">
                        טיפול
                      </button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {incidents.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">אין אירועי אבטחה</h3>
          <p className="text-stone-500">לא דווחו אירועי אבטחה. המשיכו לשמור על הפרטיות! ✨</p>
        </div>
      )}

      {/* Closed Incidents */}
      {closedIncidents.length > 0 && (
        <div>
          <h2 className="font-semibold text-stone-500 mb-3">היסטוריה ({closedIncidents.length})</h2>
          <div className="space-y-2">
            {closedIncidents.slice(0, 5).map(incident => (
              <div key={incident.id} className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-700">{incident.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                      {getStatusLabel(incident.status)}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
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
        <h1 className="text-2xl font-semibold text-stone-800">⚙️ הגדרות</h1>
        <p className="text-stone-500 mt-1">ניהול הארגון והחשבון</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <h2 className="font-semibold text-stone-800 mb-4">פרטי הארגון</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-stone-500">שם העסק</label>
            <p className="font-medium text-stone-800 mt-1">{organization?.name || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">מספר ח.פ</label>
            <p className="font-medium text-stone-800 mt-1">{organization?.business_id || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">חבילה</label>
            <p className="mt-1">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                {organization?.tier === 'extended' ? 'מורחבת' : organization?.tier === 'enterprise' ? 'ארגונית' : 'בסיסית'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-stone-500">סטטוס</label>
            <p className="mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${organization?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {organization?.status === 'active' ? 'פעיל' : 'בהקמה'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <h2 className="font-semibold text-stone-800 mb-4">פרטי משתמש</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-stone-500">אימייל</label>
            <p className="font-medium text-stone-800 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">שם</label>
            <p className="font-medium text-stone-800 mt-1">{user?.user_metadata?.name || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-800">ניהול חבילה ותשלום</h2>
            <p className="text-sm text-stone-500 mt-1">לשדרוג או שינוי חבילה</p>
          </div>
          <Link href="/subscribe">
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
              ניהול חבילה
            </button>
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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
