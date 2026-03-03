'use client'

import { useState, useEffect } from 'react'
import { 
  Database, 
  Plus, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Zap,
  FileText,
  Users,
  Globe,
  Lock,
  Clock,
  Building,
  X
} from 'lucide-react'

// =============================================
// Types
// =============================================
interface ProcessingActivity {
  id: string
  name: string
  description: string
  department: string
  status: string
  legal_basis: string
  data_categories: string[]
  special_categories: string[]
  data_subject_categories: string[]
  estimated_records_count: number
  includes_minors: boolean
  purposes: string[]
  international_transfers: boolean
  transfer_countries: string[]
  retention_period: string
  security_measures: string[]
  risk_level: string
  requires_ppa_registration: boolean
  requires_dpia: boolean
  dpia_completed: boolean
  ai_risk_assessment: string
  ai_recommendations: string[]
  created_at: string
  last_reviewed_at: string
}

interface ROPATabProps {
  orgId: string
}

// =============================================
// Data Categories & Options
// =============================================
const DATA_CATEGORIES = {
  basic: [
    { id: 'name', label: 'שם מלא' },
    { id: 'email', label: 'כתובת אימייל' },
    { id: 'phone', label: 'מספר טלפון' },
    { id: 'address', label: 'כתובת מגורים' },
    { id: 'date_of_birth', label: 'תאריך לידה' },
    { id: 'gender', label: 'מגדר' },
    { id: 'photo', label: 'תמונה' }
  ],
  identifiers: [
    { id: 'id_number', label: 'תעודת זהות', sensitive: true },
    { id: 'passport', label: 'מספר דרכון', sensitive: true },
    { id: 'drivers_license', label: 'רישיון נהיגה' }
  ],
  financial: [
    { id: 'bank_account', label: 'פרטי חשבון בנק', sensitive: true },
    { id: 'credit_card', label: 'פרטי כרטיס אשראי', sensitive: true },
    { id: 'salary', label: 'פרטי שכר', sensitive: true },
    { id: 'tax_info', label: 'מידע מס' }
  ],
  sensitive: [
    { id: 'health', label: 'מידע רפואי/בריאותי', special: true },
    { id: 'biometric', label: 'מידע ביומטרי', special: true },
    { id: 'genetic', label: 'מידע גנטי', special: true },
    { id: 'racial', label: 'מוצא אתני', special: true },
    { id: 'political', label: 'השקפות פוליטיות', special: true },
    { id: 'religious', label: 'אמונות דתיות', special: true },
    { id: 'sexual', label: 'נטייה מינית', special: true },
    { id: 'criminal', label: 'עבר פלילי', special: true }
  ],
  digital: [
    { id: 'ip_address', label: 'כתובת IP' },
    { id: 'cookies', label: 'עוגיות ומזהי מעקב' },
    { id: 'device_id', label: 'מזהה מכשיר' },
    { id: 'location', label: 'נתוני מיקום GPS' },
    { id: 'browsing_history', label: 'היסטוריית גלישה' }
  ]
}

const DATA_SUBJECTS = [
  { id: 'customers', label: 'לקוחות' },
  { id: 'employees', label: 'עובדים' },
  { id: 'suppliers', label: 'ספקים' },
  { id: 'website_visitors', label: 'מבקרי אתר' },
  { id: 'job_applicants', label: 'מועמדים לעבודה' },
  { id: 'partners', label: 'שותפים עסקיים' },
  { id: 'minors', label: 'קטינים (מתחת ל-18)' }
]

const LEGAL_BASES = [
  { id: 'consent', label: 'הסכמה', desc: 'נושא המידע נתן הסכמה מפורשת' },
  { id: 'contract', label: 'ביצוע חוזה', desc: 'נדרש לביצוע חוזה עם נושא המידע' },
  { id: 'legal_obligation', label: 'חובה חוקית', desc: 'נדרש לעמידה בחוק' },
  { id: 'vital_interests', label: 'הגנה על חיים', desc: 'נדרש להגנה על חיי אדם' },
  { id: 'legitimate_interest', label: 'אינטרס לגיטימי', desc: 'אינטרס עסקי לגיטימי (דורש בדיקת איזון)' }
]

const SECURITY_MEASURES = [
  { id: 'encryption_rest', label: 'הצפנת מידע בשרת' },
  { id: 'encryption_transit', label: 'הצפנה בהעברה (SSL)' },
  { id: 'access_control', label: 'בקרת גישה מבוססת תפקידים' },
  { id: 'mfa', label: 'אימות דו-שלבי' },
  { id: 'audit_logs', label: 'יומני ביקורת' },
  { id: 'backup', label: 'גיבוי קבוע' },
  { id: 'firewall', label: 'חומת אש' },
  { id: 'employee_training', label: 'הדרכת עובדים' }
]

const DEPARTMENTS = [
  'מכירות', 'שיווק', 'משאבי אנוש', 'כספים', 'IT', 'שירות לקוחות', 'תפעול', 'הנהלה', 'אחר'
]

// =============================================
// Main Component
// =============================================
export default function ROPATab({ orgId }: ROPATabProps) {
  const [activities, setActivities] = useState<ProcessingActivity[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<ProcessingActivity | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [editingActivity, setEditingActivity] = useState<ProcessingActivity | null>(null)

  // Load activities
  const loadActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ropa?orgId=${orgId}`)
      const data = await response.json()
      setActivities(data.activities || [])
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading ROPA:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) loadActivities()
  }, [orgId])

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    }
    const labels: Record<string, string> = {
      critical: 'קריטי',
      high: 'גבוה',
      medium: 'בינוני',
      low: 'נמוך'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${styles[risk] || 'bg-gray-100'}`}>
        {labels[risk] || risk}
      </span>
    )
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('האם למחוק את פעילות העיבוד?')) return
    
    try {
      await fetch('/api/ropa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', activityId: id })
      })
      loadActivities()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            מפת עיבוד מידע (ROPA)
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            תיעוד פעילויות עיבוד המידע האישי בארגון
          </p>
        </div>
        
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף פעילות עיבוד
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-gray-500">סה"כ פעילויות</p>
          </div>
          <div className={`rounded-lg border p-4 text-center ${stats.by_risk.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
            <p className="text-3xl font-bold text-red-600">{stats.by_risk.critical + stats.by_risk.high}</p>
            <p className="text-sm text-gray-500">סיכון גבוה/קריטי</p>
          </div>
          <div className={`rounded-lg border p-4 text-center ${stats.requires_ppa > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <p className="text-3xl font-bold text-amber-600">{stats.requires_ppa}</p>
            <p className="text-sm text-gray-500">טעונים רישום ברשות</p>
          </div>
          <div className={`rounded-lg border p-4 text-center ${stats.requires_dpia > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
            <p className="text-3xl font-bold text-orange-600">{stats.requires_dpia}</p>
            <p className="text-sm text-gray-500">דורשים DPIA</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.by_risk.low + stats.by_risk.medium}</p>
            <p className="text-sm text-gray-500">סיכון נמוך/בינוני</p>
          </div>
        </div>
      )}

      {/* Alert for PPA Registration */}
      {stats?.requires_ppa > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">נדרש רישום ברשות להגנת הפרטיות</h3>
              <p className="text-sm text-amber-700 mt-1">
                {stats.requires_ppa} פעילויות עיבוד עומדות בתנאי חובת הרישום (מעל 10,000 רשומות או מידע רגיש).
                יש לרשום את מאגרי המידע ברשות להגנת הפרטיות.
              </p>
              <a 
                href="https://www.gov.il/he/service/database_registration" 
                target="_blank"
                className="text-sm text-amber-800 underline font-medium mt-2 inline-block"
              >
                לטופס רישום מאגר מידע →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">פעילויות עיבוד ({activities.length})</h3>
        </div>
        
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">עדיין לא הוגדרו פעילויות עיבוד</p>
            <p className="text-sm">לחצו על "הוסף פעילות עיבוד" כדי להתחיל</p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{activity.name}</h4>
                      {getRiskBadge(activity.risk_level)}
                      {activity.requires_ppa_registration && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                          טעון רישום
                        </span>
                      )}
                      {activity.special_categories?.length > 0 && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                          מידע רגיש
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      {activity.department && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {activity.department}
                        </span>
                      )}
                      {activity.estimated_records_count && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {activity.estimated_records_count.toLocaleString()} רשומות
                        </span>
                      )}
                      {activity.data_categories?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {activity.data_categories.length} סוגי מידע
                        </span>
                      )}
                      {activity.international_transfers && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Globe className="w-3 h-3" />
                          העברה לחו"ל
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedActivity(activity); setViewMode('detail') }}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="צפייה"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => { setEditingActivity(activity); setShowWizard(true) }}
                      className="p-2 hover:bg-blue-50 rounded"
                      title="עריכה"
                    >
                      <Edit className="w-4 h-4 text-blue-500" />
                    <button
                      onClick={() => deleteActivity(activity.id)}
                      className="p-2 hover:bg-red-50 rounded"
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ActivityWizard
          orgId={orgId}
          editData={editingActivity || undefined}
          onClose={() => { setShowWizard(false); setEditingActivity(null) }}
          onSave={() => { setShowWizard(false); setEditingActivity(null); loadActivities() }}
        />
      )}

      {/* Detail Modal */}
      {viewMode === 'detail' && selectedActivity && (
        <ActivityDetail
          activity={selectedActivity}
          onClose={() => { setSelectedActivity(null); setViewMode('list') }}
          onRefresh={loadActivities}
        />
      )}
    </div>
  )
}

// =============================================
// Activity Wizard Component
// =============================================
function ActivityWizard({ orgId, editData, onClose, onSave }: { orgId: string; editData?: ProcessingActivity; onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalSteps = 5
  
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    description: editData?.description || '',
    department: editData?.department || '',
    purposes: editData?.purposes || [] as string[],
    legal_basis: editData?.legal_basis || '',
    legal_basis_details: '',
    data_categories: editData?.data_categories || [] as string[],
    special_categories: editData?.special_categories || [] as string[],
    data_subject_categories: editData?.data_subject_categories || [] as string[],
    estimated_records_count: editData?.estimated_records_count?.toString() || '',
    includes_minors: editData?.includes_minors || false,
    international_transfers: editData?.international_transfers || false,
    transfer_countries: editData?.transfer_countries || [] as string[],
    retention_period: editData?.retention_period || '',
    security_measures: editData?.security_measures || [] as string[]
  })

  const toggleArrayItem = (field: keyof typeof formData, item: string) => {
    const arr = formData[field] as string[]
    if (arr.includes(item)) {
      setFormData({ ...formData, [field]: arr.filter(i => i !== item) })
    } else {
      setFormData({ ...formData, [field]: [...arr, item] })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ropa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editData ? 'update' : 'create',
          orgId,
          ...(editData ? { activityId: editData.id } : {}),
          data: {
            ...formData,
            estimated_records_count: formData.estimated_records_count ? parseInt(formData.estimated_records_count) : null,
            special_categories: formData.data_categories.filter(c => 
              DATA_CATEGORIES.sensitive.some(s => s.id === c)
            )
          }
        })
      })
      
      if (response.ok) {
        onSave()
      } else {
        alert('שגיאה בשמירה')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('שגיאה בשמירה')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{editData ? 'עריכת פעילות עיבוד' : 'הוספת פעילות עיבוד חדשה'}</h2>
            <p className="text-primary-foreground/80 text-sm">שלב {step} מתוך {totalSteps}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-4">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">פרטים בסיסיים</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">שם הפעילות *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="לדוגמה: ניהול לקוחות, משכורות עובדים, שיווק באימייל"
                  className="w-full border rounded-lg p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תארו בקצרה את מטרת העיבוד והשימוש במידע"
                  className="w-full border rounded-lg p-3 min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">מחלקה</label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border rounded-lg p-3"
                >
                  <option value="">בחרו מחלקה</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">מטרות העיבוד</label>
                <input
                  type="text"
                  placeholder="הקלידו מטרה ולחצו Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const input = e.target as HTMLInputElement
                      if (input.value.trim()) {
                        setFormData({ ...formData, purposes: [...formData.purposes, input.value.trim()] })
                        input.value = ''
                      }
                    }
                  }}
                  className="w-full border rounded-lg p-3"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.purposes.map((p, i) => (
                    <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm flex items-center gap-1">
                      {p}
                      <button onClick={() => setFormData({ ...formData, purposes: formData.purposes.filter((_, idx) => idx !== i) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Data Categories */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">סוגי מידע נאספים</h3>
              <p className="text-sm text-gray-600 mb-4">סמנו את כל סוגי המידע האישי שנאספים במסגרת פעילות זו</p>

              {Object.entries(DATA_CATEGORIES).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 capitalize">
                    {category === 'basic' && '📋 מידע בסיסי'}
                    {category === 'identifiers' && '🆔 מזהים'}
                    {category === 'financial' && '💰 מידע פיננסי'}
                    {category === 'sensitive' && '⚠️ מידע רגיש (קטגוריות מיוחדות)'}
                    {category === 'digital' && '💻 מידע דיגיטלי'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(item => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          formData.data_categories.includes(item.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-gray-50'
                        } ${(item as any).special ? 'border-red-200' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.data_categories.includes(item.id)}
                          onChange={() => toggleArrayItem('data_categories', item.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{item.label}</span>
                        {(item as any).sensitive && <span className="text-xs text-amber-600">רגיש</span>}
                        {(item as any).special && <span className="text-xs text-red-600">מיוחד</span>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Data Subjects & Scale */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">נושאי מידע והיקף</h3>

              <div>
                <label className="block text-sm font-medium mb-2">על מי נאסף המידע?</label>
                <div className="grid grid-cols-2 gap-2">
                  {DATA_SUBJECTS.map(subject => (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                        formData.data_subject_categories.includes(subject.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.data_subject_categories.includes(subject.id)}
                        onChange={() => {
                          toggleArrayItem('data_subject_categories', subject.id)
                          if (subject.id === 'minors') {
                            setFormData(prev => ({ ...prev, includes_minors: !prev.includes_minors }))
                          }
                        }}
                        className="rounded"
                      />
                      <span>{subject.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">מספר רשומות משוער</label>
                <input
                  type="number"
                  value={formData.estimated_records_count}
                  onChange={e => setFormData({ ...formData, estimated_records_count: e.target.value })}
                  placeholder="לדוגמה: 5000"
                  className="w-full border rounded-lg p-3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  מאגרים עם מעל 10,000 רשומות חייבים ברישום ברשות להגנת הפרטיות
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">בסיס חוקי לעיבוד</label>
                <div className="space-y-2">
                  {LEGAL_BASES.map(basis => (
                    <label
                      key={basis.id}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                        formData.legal_basis === basis.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="legal_basis"
                        checked={formData.legal_basis === basis.id}
                        onChange={() => setFormData({ ...formData, legal_basis: basis.id })}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium">{basis.label}</span>
                        <p className="text-sm text-gray-500">{basis.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Transfers & Retention */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">העברה ושמירה</h3>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.international_transfers}
                    onChange={e => setFormData({ ...formData, international_transfers: e.target.checked })}
                    className="rounded w-5 h-5"
                  />
                  <div>
                    <span className="font-medium">המידע מועבר מחוץ לישראל</span>
                    <p className="text-sm text-gray-500">כולל שימוש בשירותי ענן בחו"ל</p>
                  </div>
                </label>
              </div>

              {formData.international_transfers && (
                <div>
                  <label className="block text-sm font-medium mb-1">מדינות יעד</label>
                  <input
                    type="text"
                    placeholder="לדוגמה: ארה״ב, אירופה (הקלידו ולחצו Enter)"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        if (input.value.trim()) {
                          setFormData({ ...formData, transfer_countries: [...formData.transfer_countries, input.value.trim()] })
                          input.value = ''
                        }
                      }
                    }}
                    className="w-full border rounded-lg p-3"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.transfer_countries.map((c, i) => (
                      <span key={i} className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                        {c}
                        <button onClick={() => setFormData({ ...formData, transfer_countries: formData.transfer_countries.filter((_, idx) => idx !== i) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">תקופת שמירה</label>
                <input
                  type="text"
                  value={formData.retention_period}
                  onChange={e => setFormData({ ...formData, retention_period: e.target.value })}
                  placeholder="לדוגמה: 7 שנים, עד לסיום ההתקשרות + שנה"
                  className="w-full border rounded-lg p-3"
                />
              </div>
            </div>
          )}

          {/* Step 5: Security */}
          {step === 5 && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">אמצעי אבטחה</h3>
              <p className="text-sm text-gray-600 mb-4">סמנו את אמצעי האבטחה שמיושמים להגנה על המידע</p>

              <div className="grid grid-cols-2 gap-2">
                {SECURITY_MEASURES.map(measure => (
                  <label
                    key={measure.id}
                    className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                      formData.security_measures.includes(measure.id)
                        ? 'bg-green-50 border-green-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.security_measures.includes(measure.id)}
                      onChange={() => toggleArrayItem('security_measures', measure.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{measure.label}</span>
                  </label>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">📋 סיכום</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• שם: {formData.name || '—'}</li>
                  <li>• {formData.data_categories.length} סוגי מידע</li>
                  <li>• {formData.data_subject_categories.length} קטגוריות נושאי מידע</li>
                  <li>• {formData.estimated_records_count || '?'} רשומות</li>
                  <li>• העברה לחו"ל: {formData.international_transfers ? 'כן' : 'לא'}</li>
                  <li>• {formData.security_measures.length} אמצעי אבטחה</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            {step > 1 ? 'הקודם' : 'ביטול'}
          </button>
          
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.name}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
            >
              הבא
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  שמור פעילות
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Activity Detail Modal
// =============================================
function ActivityDetail({ activity: initialActivity, onClose, onRefresh }: { activity: ProcessingActivity; onClose: () => void; onRefresh: () => void }) {
  const [activity, setActivity] = useState(initialActivity)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeActivity = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ropa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', activityId: activity.id })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Fetch the updated activity to show AI results
        const activityResponse = await fetch(`/api/ropa?action=get&id=${activity.id}`)
        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          setActivity(activityData.activity)
        }
        onRefresh()
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    }
    return colors[risk] || 'text-gray-600'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{activity.name}</h2>
            <p className="text-sm text-gray-500">{activity.department || 'לא צוינה מחלקה'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Risk & Compliance */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${activity.risk_level === 'critical' || activity.risk_level === 'high' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-500">רמת סיכון</p>
              <p className={`text-2xl font-bold ${getRiskColor(activity.risk_level)}`}>
                {activity.risk_level === 'critical' && 'קריטי'}
                {activity.risk_level === 'high' && 'גבוה'}
                {activity.risk_level === 'medium' && 'בינוני'}
                {activity.risk_level === 'low' && 'נמוך'}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${activity.requires_ppa_registration ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-sm text-gray-500">רישום ברשות</p>
              <p className={`text-lg font-bold ${activity.requires_ppa_registration ? 'text-amber-600' : 'text-green-600'}`}>
                {activity.requires_ppa_registration ? 'נדרש' : 'לא נדרש'}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${activity.requires_dpia && !activity.dpia_completed ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-500">DPIA</p>
              <p className={`text-lg font-bold ${activity.requires_dpia && !activity.dpia_completed ? 'text-orange-600' : 'text-gray-600'}`}>
                {activity.requires_dpia ? (activity.dpia_completed ? 'הושלם' : 'נדרש') : 'לא נדרש'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">סוגי מידע ({activity.data_categories?.length || 0})</h4>
              <div className="flex flex-wrap gap-1">
                {activity.data_categories?.map(cat => (
                  <span key={cat} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {cat}
                  </span>
                ))}
              </div>
              
              {activity.special_categories?.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm text-red-600 font-medium">מידע רגיש:</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activity.special_categories.map(cat => (
                      <span key={cat} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">נושאי מידע</h4>
              <div className="flex flex-wrap gap-1">
                {activity.data_subject_categories?.map(sub => (
                  <span key={sub} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                    {sub}
                  </span>
                ))}
              </div>
              {activity.includes_minors && (
                <p className="text-sm text-red-600 mt-2">⚠️ כולל מידע על קטינים</p>
              )}
            </div>
          </div>

          {/* More Info */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">מספר רשומות:</span>
              <span className="font-medium mr-2">{activity.estimated_records_count?.toLocaleString() || 'לא צוין'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">בסיס חוקי:</span>
              <span className="font-medium mr-2">{activity.legal_basis || 'לא צוין'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">תקופת שמירה:</span>
              <span className="font-medium mr-2">{activity.retention_period || 'לא צוין'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">העברה לחו"ל:</span>
              <span className="font-medium mr-2">{activity.international_transfers ? 'כן' : 'לא'}</span>
            </div>
          </div>

          {/* Security Measures */}
          {activity.security_measures?.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">אמצעי אבטחה ({activity.security_measures.length})</h4>
              <div className="flex flex-wrap gap-1">
                {activity.security_measures.map(m => (
                  <span key={m} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {activity.ai_risk_assessment ? (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                ניתוח AI
              </h4>
              <p className="text-sm text-blue-700">{activity.ai_risk_assessment}</p>
              
              {activity.ai_recommendations?.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-blue-800">המלצות:</h5>
                  <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
                    {activity.ai_recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={analyzeActivity}
              disabled={isAnalyzing}
              className="w-full p-4 border-2 border-dashed rounded-lg text-center hover:bg-gray-50 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מנתח...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-5 h-5" />
                  הפעל ניתוח AI
                </span>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}
