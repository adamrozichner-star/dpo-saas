'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, CheckCircle2, Loader2, Eye, Edit, Trash2, Ban,
  User, Mail, Phone, FileText, AlertCircle, Lock
} from 'lucide-react'

const REQUEST_TYPES = [
  { 
    id: 'access', 
    label: 'עיון במידע', 
    icon: Eye,
    description: 'קבלת העתק של המידע האישי השמור עליי',
    color: 'blue'
  },
  { 
    id: 'rectification', 
    label: 'תיקון מידע', 
    icon: Edit,
    description: 'תיקון מידע שגוי או לא מדויק',
    color: 'yellow'
  },
  { 
    id: 'erasure', 
    label: 'מחיקת מידע', 
    icon: Trash2,
    description: 'מחיקת המידע האישי השמור עליי',
    color: 'red'
  },
  { 
    id: 'objection', 
    label: 'התנגדות לעיבוד', 
    icon: Ban,
    description: 'התנגדות לשימוש במידע למטרה מסוימת',
    color: 'purple'
  },
]

export default function DataSubjectRightsPage() {
  const params = useParams()
  const orgId = params.orgId as string
  
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    requestType: '',
    fullName: '',
    idNumber: '',
    email: '',
    phone: '',
    details: '',
    consent: false
  })

  useEffect(() => {
    loadOrganization()
  }, [orgId])

  const loadOrganization = async () => {
    try {
      const response = await fetch(`/api/rights?action=get_org&orgId=${orgId}`)
      const data = await response.json()
      if (data.organization) {
        setOrganization(data.organization)
      } else {
        setError('ארגון לא נמצא')
      }
    } catch (err) {
      setError('שגיאה בטעינת הדף')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.consent) {
      setError('יש לאשר את תנאי הבקשה')
      return
    }
    
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_request',
          orgId,
          ...formData
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setRequestNumber(data.requestNumber)
        setSubmitted(true)
      } else {
        setError(data.error || 'שגיאה בשליחת הבקשה')
      }
    } catch (err) {
      setError('שגיאה בשליחת הבקשה')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">שגיאה</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">הבקשה נשלחה בהצלחה!</h2>
            <p className="text-gray-600 mb-4">קיבלנו את בקשתך ונטפל בה בהקדם.</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">מספר הבקשה שלך:</p>
              <p className="text-2xl font-mono font-bold text-blue-900">{requestNumber}</p>
            </div>

            <div className="text-sm text-gray-500 space-y-2">
              <p>✓ אישור נשלח לכתובת המייל שלך</p>
              <p>✓ נטפל בבקשה תוך 30 יום</p>
              <p>✓ תקבל/י עדכון במייל עם התשובה</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">{organization?.name}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">בקשה למימוש זכויות פרטיות</h1>
          <p className="text-gray-600">
            על פי חוק הגנת הפרטיות, עומדות לך זכויות ביחס למידע האישי שלך
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Request Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>סוג הבקשה</CardTitle>
              <CardDescription>בחר/י את סוג הבקשה</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {REQUEST_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = formData.requestType === type.id
                  return (
                    <div
                      key={type.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateField('requestType', type.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{type.label}</h3>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>פרטים אישיים</CardTitle>
              <CardDescription>לצורך זיהוי ויצירת קשר</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  שם מלא <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="pr-10"
                    placeholder="ישראל ישראלי"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  תעודת זהות <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={formData.idNumber}
                    onChange={(e) => updateField('idNumber', e.target.value)}
                    className="pr-10"
                    placeholder="9 ספרות"
                    maxLength={9}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">נדרש לצורך אימות זהות</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  אימייל <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="pr-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="pr-10"
                    placeholder="050-1234567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>פרטי הבקשה</CardTitle>
              <CardDescription>תאר/י את בקשתך</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.details}
                onChange={(e) => updateField('details', e.target.value)}
                placeholder={
                  formData.requestType === 'access' ? 'אנא פרט/י איזה מידע את/ה מבקש/ת לקבל...' :
                  formData.requestType === 'rectification' ? 'אנא פרט/י איזה מידע שגוי ומה התיקון הנדרש...' :
                  formData.requestType === 'erasure' ? 'אנא פרט/י איזה מידע את/ה מבקש/ת למחוק...' :
                  formData.requestType === 'objection' ? 'אנא פרט/י לאיזה שימוש את/ה מתנגד/ת...' :
                  'אנא פרט/י את בקשתך...'
                }
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Consent & Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-6">
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.consent}
                  onChange={(e) => updateField('consent', e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm">
                  אני מאשר/ת כי הפרטים שמסרתי נכונים, ומבין/ה שייתכן שאידרש לאימות זהות נוסף לפני מענה לבקשה.
                  הבקשה תטופל בהתאם לחוק הגנת הפרטיות תוך 30 יום.
                </label>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={!formData.requestType || !formData.fullName || !formData.idNumber || !formData.email || !formData.consent || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 ml-2" />
                    שליחת הבקשה
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>טופס זה מופעל על ידי <strong>DPO-Pro</strong></p>
          <p>הממונה על הגנת הפרטיות של {organization?.name}</p>
        </div>
      </div>
    </div>
  )
}
