'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye,
  Loader2,
  Shield,
  User,
  Lock,
  Database,
  AlertTriangle,
  FileCheck
} from 'lucide-react'

interface GeneratingDocument {
  id: string
  type: string
  title: string
  icon: React.ReactNode
  progress: number
  status: 'waiting' | 'generating' | 'complete' | 'error'
  estimatedTime: number // seconds
}

interface DocumentGenerationProgressProps {
  orgId: string
  orgName: string
  answers: any[]
  onComplete: (documents: any[]) => void
  supabase: any
}

const DOCUMENT_TYPES = [
  { 
    type: 'privacy_policy', 
    title: 'מדיניות פרטיות', 
    icon: <FileText className="h-5 w-5" />,
    estimatedTime: 3
  },
  { 
    type: 'dpo_appointment', 
    title: 'כתב מינוי ממונה', 
    icon: <User className="h-5 w-5" />,
    estimatedTime: 2
  },
  { 
    type: 'security_procedures', 
    title: 'נהלי אבטחת מידע', 
    icon: <Lock className="h-5 w-5" />,
    estimatedTime: 4
  },
  { 
    type: 'database_registration', 
    title: 'רישום מאגרי מידע', 
    icon: <Database className="h-5 w-5" />,
    estimatedTime: 3
  },
  { 
    type: 'incident_response', 
    title: 'נוהל טיפול באירועי אבטחה', 
    icon: <AlertTriangle className="h-5 w-5" />,
    estimatedTime: 2
  },
  { 
    type: 'data_subject_process', 
    title: 'תהליך בקשות נושאי מידע', 
    icon: <FileCheck className="h-5 w-5" />,
    estimatedTime: 2
  }
]

export default function DocumentGenerationProgress({
  orgId,
  orgName,
  answers,
  onComplete,
  supabase
}: DocumentGenerationProgressProps) {
  const [documents, setDocuments] = useState<GeneratingDocument[]>(
    DOCUMENT_TYPES.map((doc, index) => ({
      id: `doc-${index}`,
      type: doc.type,
      title: doc.title,
      icon: doc.icon,
      progress: 0,
      status: index === 0 ? 'generating' : 'waiting',
      estimatedTime: doc.estimatedTime
    }))
  )
  const [currentDocIndex, setCurrentDocIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(true)
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Animate progress bars
  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(() => {
      setDocuments(prev => {
        const updated = [...prev]
        const currentDoc = updated[currentDocIndex]
        
        if (currentDoc && currentDoc.status === 'generating') {
          // Increment progress
          const increment = 100 / (currentDoc.estimatedTime * 10) // 10 updates per second
          currentDoc.progress = Math.min(95, currentDoc.progress + increment)
        }
        
        return updated
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentDocIndex, isGenerating])

  // Actually generate documents on mount
  useEffect(() => {
    generateDocuments()
  }, [])

  const generateDocuments = async () => {
    try {
      // Call the API to generate documents
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          orgName,
          answers
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate documents')
      }

      const data = await response.json()
      
      // Simulate progressive completion
      for (let i = 0; i < documents.length; i++) {
        await new Promise(resolve => setTimeout(resolve, documents[i].estimatedTime * 500))
        
        setDocuments(prev => {
          const updated = [...prev]
          updated[i].progress = 100
          updated[i].status = 'complete'
          if (i + 1 < updated.length) {
            updated[i + 1].status = 'generating'
          }
          return updated
        })
        setCurrentDocIndex(i + 1)
      }

      setGeneratedDocs(data.documents || [])
      setIsGenerating(false)
      
      // Notify parent after short delay
      setTimeout(() => {
        onComplete(data.documents || [])
      }, 1500)

    } catch (err: any) {
      console.error('Document generation error:', err)
      setError(err.message)
      setIsGenerating(false)
      
      // Mark current doc as error, complete others as-is
      setDocuments(prev => {
        const updated = [...prev]
        const current = updated.find(d => d.status === 'generating')
        if (current) current.status = 'error'
        return updated
      })
    }
  }

  const completedCount = documents.filter(d => d.status === 'complete').length
  const totalProgress = Math.round(documents.reduce((acc, d) => acc + d.progress, 0) / documents.length)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isGenerating ? 'מכינים את המסמכים שלך...' : 'המסמכים מוכנים! 🎉'}
        </h2>
        <p className="text-slate-600">
          {isGenerating 
            ? `${orgName} - יוצרים ${documents.length} מסמכים מותאמים אישית`
            : 'כל המסמכים נוצרו בהצלחה וממתינים לאישור הממונה'
          }
        </p>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">התקדמות כללית</span>
          <span className="font-semibold text-slate-900">{completedCount}/{documents.length} מסמכים</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div 
            key={doc.id}
            className={`p-4 rounded-xl border transition-all duration-300 ${
              doc.status === 'complete' 
                ? 'bg-emerald-50 border-emerald-200' 
                : doc.status === 'generating'
                ? 'bg-blue-50 border-blue-200'
                : doc.status === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                doc.status === 'complete' 
                  ? 'bg-emerald-500 text-white' 
                  : doc.status === 'generating'
                  ? 'bg-blue-500 text-white'
                  : doc.status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {doc.status === 'complete' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : doc.status === 'generating' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : doc.status === 'error' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  doc.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900">{doc.title}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    doc.status === 'complete' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : doc.status === 'generating'
                      ? 'bg-blue-100 text-blue-700'
                      : doc.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {doc.status === 'complete' && 'מוכן'}
                    {doc.status === 'generating' && 'בהכנה...'}
                    {doc.status === 'waiting' && 'ממתין'}
                    {doc.status === 'error' && 'שגיאה'}
                  </span>
                </div>

                {/* Progress Bar */}
                {(doc.status === 'generating' || doc.status === 'complete') && (
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        doc.status === 'complete' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                )}

                {/* DPO Verification Badge */}
                {doc.status === 'complete' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    <span>ממתין לאישור DPO (עד 72 שעות)</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {doc.status === 'complete' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <strong>שגיאה:</strong> {error}
          <br />
          <span className="text-red-600">ניתן ליצור מסמכים ידנית דרך הצ'אט</span>
        </div>
      )}

      {/* Completion Message */}
      {!isGenerating && !error && (
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">מעולה! המסמכים מוכנים</h4>
              <p className="text-sm text-slate-600 mb-2">
                הממונה שלך יבדוק ויאשר את המסמכים תוך 72 שעות.
                <br />
                בינתיים, תוכל לצפות בהם ולערוך במידת הצורך.
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  צפה במסמכים
                </Button>
                <Button size="sm" variant="outline">
                  המשך ללוח הבקרה
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
