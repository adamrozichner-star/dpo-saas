'use client'

import { useEffect, useState } from 'react'
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
  ChevronLeft, Send, Timer, Lock, Loader2, Menu, X, ArrowRight
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'

const DPO_PASSWORD = process.env.NEXT_PUBLIC_DPO_PASSWORD || 'dpo2024secure'

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const isAuth = sessionStorage.getItem('dpo_authenticated')
    if (isAuth === 'true') onSuccess()
    setIsChecking(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === DPO_PASSWORD) {
      sessionStorage.setItem('dpo_authenticated', 'true')
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="h-7 w-7 text-purple-600" />
          </div>
          <CardTitle className="text-lg">פורטל ממונה</CardTitle>
          <CardDescription>הזן סיסמה לגישה</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              className={error ? 'border-red-500' : ''}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">סיסמה שגויה</p>}
            <Button type="submit" className="w-full">כניסה</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DPODashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { dpo, allOrganizations, escalations } = useAppStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'escalations' | 'time'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

  if (!isAuthenticated) return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />

  const filteredOrgs = allOrganizations.filter(org => 
    org.name.includes(searchQuery) || org.businessId.includes(searchQuery)
  )
  const openEscalations = escalations.filter(e => e.status === 'open' || e.status === 'in_progress')
  const totalTimeThisMonth = escalations.reduce((sum, e) => sum + e.dpoTimeMinutes, 0)

  const tabs = [
    { id: 'overview', label: 'סקירה', icon: CheckCircle2 },
    { id: 'clients', label: 'לקוחות', icon: Building2, badge: allOrganizations.length },
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
              className={`flex flex-col items-center p-2 min-w-[60px] relative ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{tab.badge}</span>
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
                <p className="font-medium text-sm truncate">{dpo?.name || 'ממונה'}</p>
                <p className="text-xs text-gray-500">{dpo?.licenseNumber}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm" onClick={() => {
              sessionStorage.removeItem('dpo_authenticated')
              window.location.href = '/'
            }}>
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
                <p className="text-sm font-medium truncate">{dpo?.name || 'ממונה'}</p>
                <p className="text-xs text-gray-500 truncate">{dpo?.licenseNumber}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => {
              sessionStorage.removeItem('dpo_authenticated')
              window.location.href = '/'
            }}>
              <LogOut className="h-4 w-4 ml-2" />התנתקות
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">שלום, {dpo?.name || 'ממונה'}</h1>
              <p className="text-sm text-gray-600">לוח בקרה</p>
            </div>
            <Button variant="outline" size="icon" className="hidden md:flex"><Bell className="h-5 w-5" /></Button>
          </div>

          {activeTab === 'overview' && <OverviewTab dpo={dpo} organizations={allOrganizations} escalations={escalations} totalTime={totalTimeThisMonth} />}
          {activeTab === 'clients' && <ClientsTab organizations={filteredOrgs} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
          {activeTab === 'escalations' && <EscalationsTab escalations={escalations} organizations={allOrganizations} />}
          {activeTab === 'time' && <TimeTrackingTab escalations={escalations} organizations={allOrganizations} />}
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
                const org = organizations.find((o: any) => o.id === esc.orgId)
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
                <div className="flex justify-between text-sm mb-1"><span>סטנדרטי</span><span>{organizations.filter((o: any) => o.riskLevel === 'standard').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.riskLevel === 'standard').length / organizations.length) * 100 : 0} className="bg-green-100 [&>div]:bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>רגיש</span><span>{organizations.filter((o: any) => o.riskLevel === 'sensitive').length}</span></div>
                <Progress value={organizations.length ? (organizations.filter((o: any) => o.riskLevel === 'sensitive').length / organizations.length) * 100 : 0} className="bg-yellow-100 [&>div]:bg-yellow-500" />
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
                      <p className="text-xs text-gray-500">ח.פ {org.businessId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 flex-shrink-0">
                    <Badge variant={org.riskLevel === 'standard' ? 'success' : 'warning'} className="text-xs">
                      {org.riskLevel === 'standard' ? 'סטנדרטי' : 'רגיש'}
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

function EscalationsTab({ escalations, organizations }: any) {
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = { urgent: 'דחוף', high: 'גבוה', medium: 'בינוני', low: 'נמוך' }
    return labels[priority] || priority
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { open: 'פתוח', in_progress: 'בטיפול', resolved: 'נפתר', closed: 'סגור' }
    return labels[status] || status
  }

  const selectEscalation = (esc: any) => {
    setSelectedEscalation(esc)
    setMobileView('detail')
  }

  const backToList = () => {
    setMobileView('list')
    setSelectedEscalation(null)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg md:text-xl font-bold">פניות ({escalations.length})</h2>

      {/* Mobile view */}
      <div className="md:hidden">
        {mobileView === 'list' ? (
          <div className="space-y-2">
            {escalations.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-gray-500">אין פניות</CardContent></Card>
            ) : (
              escalations.map((esc: any) => {
                const org = organizations.find((o: any) => o.id === esc.orgId)
                return (
                  <Card key={esc.id} className="cursor-pointer" onClick={() => selectEscalation(esc)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{esc.subject}</p>
                          <p className="text-xs text-gray-500">{org?.name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={esc.priority === 'urgent' ? 'destructive' : esc.priority === 'high' ? 'warning' : 'secondary'} className="text-xs">
                            {getPriorityLabel(esc.priority)}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
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
                <Button variant="ghost" size="icon" onClick={backToList}><ArrowRight className="h-5 w-5" /></Button>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{selectedEscalation?.subject}</CardTitle>
                  <p className="text-xs text-gray-500">{organizations.find((o: any) => o.id === selectedEscalation?.orgId)?.name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{selectedEscalation?.description || 'אין תיאור'}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">עדיפות: {getPriorityLabel(selectedEscalation?.priority)}</Badge>
                <Badge variant="outline">סטטוס: {getStatusLabel(selectedEscalation?.status)}</Badge>
                <Badge variant="outline">זמן: {selectedEscalation?.dpoTimeMinutes} דק'</Badge>
              </div>
              {selectedEscalation?.status !== 'closed' && (
                <div className="space-y-2">
                  <Textarea placeholder="תגובה..." value={response} onChange={(e) => setResponse(e.target.value)} className="min-h-[80px]" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">בטיפול</Button>
                    <Button size="sm" className="flex-1"><Send className="h-4 w-4 ml-1" />שלח</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {escalations.map((esc: any) => {
            const org = organizations.find((o: any) => o.id === esc.orgId)
            return (
              <Card 
                key={esc.id}
                className={`cursor-pointer transition-all ${selectedEscalation?.id === esc.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedEscalation(esc)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{esc.subject}</h3>
                      <p className="text-xs text-gray-500">{org?.name}</p>
                    </div>
                    <Badge variant={esc.priority === 'urgent' ? 'destructive' : esc.priority === 'high' ? 'warning' : 'secondary'} className="text-xs">
                      {getPriorityLabel(esc.priority)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(esc.createdAt)}</span>
                    <Badge variant={esc.status === 'open' ? 'warning' : esc.status === 'resolved' ? 'success' : 'secondary'} className="text-xs">
                      {getStatusLabel(esc.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {selectedEscalation ? (
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{selectedEscalation.subject}</CardTitle>
              <CardDescription>{organizations.find((o: any) => o.id === selectedEscalation.orgId)?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{selectedEscalation.description || 'אין תיאור'}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span><span className="text-gray-500">עדיפות:</span> {getPriorityLabel(selectedEscalation.priority)}</span>
                <span><span className="text-gray-500">זמן:</span> {selectedEscalation.dpoTimeMinutes} דק'</span>
              </div>
              {selectedEscalation.resolution && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">{selectedEscalation.resolution}</p>
                </div>
              )}
              {selectedEscalation.status !== 'closed' && (
                <div className="space-y-2">
                  <Textarea placeholder="תגובה..." value={response} onChange={(e) => setResponse(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">בטיפול</Button>
                    <Button size="sm"><Send className="h-4 w-4 ml-1" />שלח</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-sm">בחר פנייה</p>
          </Card>
        )}
      </div>
    </div>
  )
}

function TimeTrackingTab({ escalations, organizations }: any) {
  const timeByOrg = organizations.map((org: any) => {
    const orgEscalations = escalations.filter((e: any) => e.orgId === org.id)
    const totalMinutes = orgEscalations.reduce((sum: number, e: any) => sum + e.dpoTimeMinutes, 0)
    return { ...org, totalMinutes, escalationCount: orgEscalations.length }
  }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)

  const totalMinutes = escalations.reduce((sum: number, e: any) => sum + e.dpoTimeMinutes, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-lg md:text-xl font-bold">מעקב זמן</h2>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-xs text-gray-600">סה״כ החודש</p>
            <p className="text-xl md:text-2xl font-bold">{totalMinutes} דקות</p>
            <p className="text-xs text-gray-500">{(totalMinutes / 60).toFixed(1)} שעות</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">זמן לפי לקוח</CardTitle></CardHeader>
        <CardContent>
          {timeByOrg.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">אין נתונים</p>
          ) : (
            <div className="space-y-4">
              {timeByOrg.filter((org: any) => org.totalMinutes > 0).map((org: any) => (
                <div key={org.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{org.name}</span>
                    <span className="text-gray-500 flex-shrink-0">{org.totalMinutes} דק' ({org.escalationCount} פניות)</span>
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
