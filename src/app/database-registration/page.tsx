'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, Database, ExternalLink, CheckCircle2, Circle, ArrowRight, 
  ArrowLeft, FileText, AlertTriangle, Clock, Copy, Download,
  Loader2, HelpCircle, Phone, Mail, Building2, User, ChevronDown, ChevronUp
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// Registration steps data
const REGISTRATION_STEPS = [
  {
    id: 1,
    title: 'הכנת המסמכים',
    description: 'אספו את כל המידע הנדרש לרישום',
    duration: '10 דקות',
    tasks: [
      { id: 'doc1', text: 'צילום תעודת זהות של בעל העסק / מורשה חתימה', required: true },
      { id: 'doc2', text: 'אישור רישום החברה (נסח חברה)', required: true },
      { id: 'doc3', text: 'פרטי המאגר מהמסמך שהפקנו', required: true },
      { id: 'doc4', text: 'פרטי איש קשר בארגון', required: true },
    ]
  },
  {
    id: 2,
    title: 'כניסה למערכת הרשם',
    description: 'גישה לאתר רשם מאגרי המידע',
    duration: '5 דקות',
    tasks: [
      { id: 'sys1', text: 'גלישה לאתר הרשות להגנת הפרטיות', required: true, link: 'https://www.gov.il/he/service/registration-of-database' },
      { id: 'sys2', text: 'הזדהות באמצעות מערכת ממשלתית (רשות המיסים / ביטוח לאומי)', required: true },
      { id: 'sys3', text: 'בחירה ב"רישום מאגר חדש"', required: true },
    ]
  },
  {
    id: 3,
    title: 'מילוי פרטי המאגר',
    description: 'העתקת הפרטים מהמסמך שהכנו',
    duration: '15 דקות',
    tasks: [
      { id: 'fill1', text: 'שם המאגר ומטרתו', required: true },
      { id: 'fill2', text: 'סוגי המידע הנשמרים', required: true },
      { id: 'fill3', text: 'מקורות המידע', required: true },
      { id: 'fill4', text: 'השימושים במידע', required: true },
      { id: 'fill5', text: 'העברות מידע לצדדים שלישיים', required: true },
      { id: 'fill6', text: 'אמצעי אבטחה', required: true },
    ]
  },
  {
    id: 4,
    title: 'פרטי אנשי קשר',
    description: 'הזנת פרטי בעל המאגר והממונים',
    duration: '5 דקות',
    tasks: [
      { id: 'contact1', text: 'פרטי בעל המאגר (שם, ת.ז, כתובת)', required: true },
      { id: 'contact2', text: 'פרטי מנהל המאגר', required: true },
      { id: 'contact3', text: 'פרטי הממונה על אבטחת מידע (DPO)', required: true },
    ]
  },
  {
    id: 5,
    title: 'תשלום ואישור',
    description: 'תשלום אגרה וקבלת מספר רישום',
    duration: '5 דקות',
    tasks: [
      { id: 'pay1', text: 'תשלום אגרת רישום (₪156)', required: true },
      { id: 'pay2', text: 'קבלת אישור רישום במייל', required: true },
      { id: 'pay3', text: 'שמירת מספר הרישום במערכת', required: true },
    ]
  }
]

export default function DatabaseRegistrationGuidePage() {
  const router = useRouter()
  const { user, session, loading, supabase } = useAuth()
  const [organization, setOrganization] = useState<any>(null)
  const [dbDocument, setDbDocument] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUpsell, setShowUpsell] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (user && supabase) {
      loadData()
    }
  }, [user, supabase])

  const loadData = async () => {
    if (!user || !supabase) return
    setIsLoading(true)
    
    try {
      // Load user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_user_id', user.id)
        .single()

      if (userData?.organizations) {
        setOrganization(userData.organizations)
        
        // Load database registration document
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', userData.organizations.id)
          .eq('type', 'database_registration')
          .single()
        
        if (docs) {
          setDbDocument(docs)
        }

        // Load saved progress
        const { data: progress } = await supabase
          .from('organization_profiles')
          .select('registration_progress')
          .eq('org_id', userData.organizations.id)
          .single()

        if (progress?.registration_progress) {
          setCompletedTasks(progress.registration_progress.completedTasks || [])
          setCurrentStep(progress.registration_progress.currentStep || 1)
          setRegistrationNumber(progress.registration_progress.registrationNumber || '')
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTask = async (taskId: string) => {
    const newCompleted = completedTasks.includes(taskId)
      ? completedTasks.filter(t => t !== taskId)
      : [...completedTasks, taskId]
    
    setCompletedTasks(newCompleted)
    
    // Save progress
    if (supabase && organization) {
      await supabase
        .from('organization_profiles')
        .upsert({
          org_id: organization.id,
          registration_progress: {
            completedTasks: newCompleted,
            currentStep,
            registrationNumber,
            lastUpdated: new Date().toISOString()
          }
        }, { onConflict: 'org_id' })
    }
  }

  const saveRegistrationNumber = async () => {
    if (!registrationNumber || !supabase || !organization) return
    setIsSaving(true)
    
    try {
      // Update organization with registration number
      await supabase
        .from('organizations')
        .update({ database_registration_number: registrationNumber })
        .eq('id', organization.id)

      // Update document status
      if (dbDocument) {
        await supabase
          .from('documents')
          .update({ 
            status: 'registered',
            metadata: { registrationNumber, registeredAt: new Date().toISOString() }
          })
          .eq('id', dbDocument.id)
      }

      // Save progress
      await supabase
        .from('organization_profiles')
        .upsert({
          org_id: organization.id,
          registration_progress: {
            completedTasks,
            currentStep: 5,
            registrationNumber,
            completed: true,
            completedAt: new Date().toISOString()
          }
        }, { onConflict: 'org_id' })

      alert('מספר הרישום נשמר בהצלחה!')
    } catch (error) {
      console.error('Error saving registration number:', error)
      alert('שגיאה בשמירה')
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('הועתק!')
  }

  const getStepProgress = (stepId: number) => {
    const step = REGISTRATION_STEPS.find(s => s.id === stepId)
    if (!step) return 0
    const completed = step.tasks.filter(t => completedTasks.includes(t.id)).length
    return (completed / step.tasks.length) * 100
  }

  const getTotalProgress = () => {
    const totalTasks = REGISTRATION_STEPS.reduce((acc, s) => acc + s.tasks.length, 0)
    return (completedTasks.length / totalTasks) * 100
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה ללוח הבקרה
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">מדריך רישום מאגר מידע</span>
              </div>
            </div>
            <Badge variant={getTotalProgress() === 100 ? 'success' : 'secondary'}>
              {getTotalProgress() === 100 ? 'הושלם ✓' : `${Math.round(getTotalProgress())}% הושלם`}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">התקדמות הרישום</h2>
                <p className="text-gray-600">עקבו אחר השלבים לרישום המאגר ברשם מאגרי המידע</p>
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-primary">{Math.round(getTotalProgress())}%</div>
                <div className="text-sm text-gray-500">{completedTasks.length} מתוך {REGISTRATION_STEPS.reduce((acc, s) => acc + s.tasks.length, 0)} משימות</div>
              </div>
            </div>
            <Progress value={getTotalProgress()} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Steps Column */}
          <div className="lg:col-span-2 space-y-4">
            {REGISTRATION_STEPS.map((step) => {
              const stepProgress = getStepProgress(step.id)
              const isExpanded = expandedStep === step.id
              const isCompleted = stepProgress === 100
              
              return (
                <Card key={step.id} className={`transition-all ${isCompleted ? 'border-green-300 bg-green-50/50' : ''}`}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-600'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{step.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {step.duration}
                            <span className="mx-1">•</span>
                            {step.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">{Math.round(stepProgress)}%</div>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                    <Progress value={stepProgress} className="h-1 mt-3" />
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3 mt-2">
                        {step.tasks.map((task) => (
                          <div 
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              completedTasks.includes(task.id) 
                                ? 'bg-green-100 hover:bg-green-150' 
                                : 'bg-gray-100 hover:bg-gray-150'
                            }`}
                            onClick={() => toggleTask(task.id)}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              completedTasks.includes(task.id)
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300'
                            }`}>
                              {completedTasks.includes(task.id) && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <span className={completedTasks.includes(task.id) ? 'line-through text-gray-500' : ''}>
                                {task.text}
                              </span>
                              {task.required && !completedTasks.includes(task.id) && (
                                <Badge variant="outline" className="mr-2 text-xs">חובה</Badge>
                              )}
                            </div>
                            {(task as any).link && (
                              <a 
                                href={(task as any).link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Step 5 - Registration number input */}
                      {step.id === 5 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <label className="block font-medium mb-2">מספר רישום המאגר:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={registrationNumber}
                              onChange={(e) => setRegistrationNumber(e.target.value)}
                              placeholder="הזינו את מספר הרישום שקיבלתם"
                              className="flex-1 px-3 py-2 border rounded-lg"
                            />
                            <Button onClick={saveRegistrationNumber} disabled={!registrationNumber || isSaving}>
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמירה'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a 
                  href="https://www.gov.il/he/service/registration-of-database"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full justify-start" variant="default">
                    <ExternalLink className="h-4 w-4 ml-2" />
                    מעבר לאתר הרשם
                  </Button>
                </a>
                
                {dbDocument && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => router.push('/dashboard?tab=documents')}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    צפייה במסמך הרישום
                  </Button>
                )}

                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowUpsell(true)}
                >
                  <Building2 className="h-4 w-4 ml-2" />
                  שירות רישום עבורכם
                </Button>
              </CardContent>
            </Card>

            {/* Document Preview */}
            {dbDocument && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    המסמך שלכם
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-3">
                    השתמשו במסמך זה למילוי הטופס באתר הרשם
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {dbDocument.content?.slice(0, 500)}...
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => copyToClipboard(dbDocument.content)}
                  >
                    <Copy className="h-4 w-4 ml-2" />
                    העתקת תוכן המסמך
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  צריכים עזרה?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>הממונה שלכם זמין לשאלות בנושא הרישום.</p>
                <Link href="/dashboard?tab=messages">
                  <Button variant="outline" size="sm" className="w-full">
                    <Mail className="h-4 w-4 ml-2" />
                    שליחת הודעה לממונה
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Important Info */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  חשוב לדעת
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>אגרת רישום:</strong> ₪156</p>
                <p><strong>זמן טיפול:</strong> עד 30 יום</p>
                <p><strong>תוקף:</strong> הרישום תקף כל עוד המאגר פעיל</p>
                <p><strong>עדכון:</strong> חובה לעדכן בכל שינוי מהותי</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upsell Modal */}
      {showUpsell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>שירות רישום מאגר עבורכם</CardTitle>
              <CardDescription>אנחנו נטפל בכל התהליך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700 mb-2">₪500</div>
                <p className="text-sm text-green-600">חד פעמי (לא כולל אגרת רשם)</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">מילוי הטופס המלא</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">הגשה לרשם מאגרי המידע</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">מעקב עד קבלת אישור</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">עדכון המערכת שלכם</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => {
                  // TODO: Handle upsell purchase
                  alert('שירות זה יהיה זמין בקרוב!')
                }}>
                  הזמנת השירות
                </Button>
                <Button variant="outline" onClick={() => setShowUpsell(false)}>
                  סגירה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
