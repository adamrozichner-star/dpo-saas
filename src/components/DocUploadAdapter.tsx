'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface DocUploadAdapterProps {
  orgId: string
  orgName: string
  supabase: any
  onDocumentCreated: () => void
}

const DOC_TYPES: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות',
  security_policy: 'מדיניות אבטחה',
  consent_form: 'טופס הסכמה',
  dpa: 'הסכם עיבוד מידע (DPA)',
  employee_policy: 'מדיניות עובדים',
  procedure: 'נוהל',
  custom: 'אחר',
}

type Phase = 'upload' | 'analyzing' | 'results'

interface GapItem {
  type: 'added' | 'exists'
  text: string
}

export default function DocUploadAdapter({ orgId, orgName, supabase, onDocumentCreated }: DocUploadAdapterProps) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedType, setSelectedType] = useState('custom')
  const [fileName, setFileName] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [adaptedContent, setAdaptedContent] = useState('')
  const [gaps, setGaps] = useState<GapItem[]>([])
  const [showOriginal, setShowOriginal] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    return fetch(url, { ...options, headers })
  }, [supabase])

  const processFile = async (file: File) => {
    setError('')
    setFileName(file.name)

    // Read file
    const text = await file.text()
    if (text.length < 50) {
      setError('הקובץ קצר מדי או לא קריא')
      return
    }
    if (text.length > 100000) {
      setError('הקובץ גדול מדי (מקסימום 100KB טקסט)')
      return
    }

    setOriginalContent(text)
    setPhase('analyzing')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('orgId', orgId)
      formData.append('orgName', orgName)
      formData.append('docType', selectedType)

      const res = await authFetch('/api/upload-doc', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה בעיבוד המסמך')
      }

      const data = await res.json()

      // Fetch the full adapted document
      const { data: doc } = await supabase
        .from('documents')
        .select('content')
        .eq('id', data.document.id)
        .single()

      const adapted = doc?.content || data.document.content_preview || ''
      setAdaptedContent(adapted)

      // Extract gaps from [נוסף] markers
      const extractedGaps: GapItem[] = []
      const lines = adapted.split('\n')
      for (const line of lines) {
        if (line.includes('[נוסף]')) {
          extractedGaps.push({ type: 'added', text: line.replace('[נוסף]', '').trim() })
        }
      }

      // Add some "exists" items for context
      const existsCount = Math.max(2, Math.min(5, lines.filter((l: string) => l.trim().length > 20 && !l.includes('[נוסף]')).length))
      let added = 0
      for (const line of lines) {
        if (added >= 3) break
        if (line.trim().length > 30 && !line.includes('[נוסף]') && !line.startsWith('#')) {
          extractedGaps.push({ type: 'exists', text: line.trim().slice(0, 80) })
          added++
        }
      }

      // Sort: added first
      extractedGaps.sort((a, b) => (a.type === 'added' ? -1 : 1) - (b.type === 'added' ? -1 : 1))
      setGaps(extractedGaps)
      setPhase('results')

    } catch (err: any) {
      setError(err.message || 'שגיאה בעיבוד המסמך')
      setPhase('upload')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [selectedType])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const reset = () => {
    setPhase('upload')
    setFileName('')
    setOriginalContent('')
    setAdaptedContent('')
    setGaps([])
    setError('')
    setShowOriginal(false)
  }

  return (
    <div className="space-y-4">
      {phase === 'upload' && (
        <>
          {/* Doc type selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-stone-500">סוג מסמך:</span>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(DOC_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedType === key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-stone-300 hover:border-indigo-300 hover:bg-stone-50'
            }`}
          >
            <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-stone-400'}`} />
            <p className="text-base font-medium text-stone-700">
              גררו קובץ לכאן או לחצו לבחירה
            </p>
            <p className="text-sm text-stone-400 mt-1">
              .docx, .txt, .pdf — עד 100KB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.txt,.pdf,.rtf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {error && (
            <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </>
      )}

      {phase === 'analyzing' && (
        <div className="bg-indigo-50 rounded-2xl p-12 text-center border border-indigo-200">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-stone-800">מנתח את המסמך...</p>
          <p className="text-sm text-stone-500 mt-1">
            {fileName} — בודק התאמה לתיקון 13 ומייצר גרסה מעודכנת
          </p>
          <p className="text-xs text-stone-400 mt-3">עלול לקחת עד 30 שניות</p>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-4">
          {/* Success header */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-stone-800">המסמך הותאם לתיקון 13</p>
              <p className="text-sm text-stone-500">
                {fileName} — נשמר ונשלח לאישור הממונה
              </p>
            </div>
            <button onClick={reset} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Gap analysis */}
          {gaps.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">📊 ניתוח פערים</h3>
              <div className="space-y-1.5">
                {gaps.filter(g => g.type === 'added').map((g, i) => (
                  <div key={`a-${i}`} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">✗</span>
                    <span className="text-stone-600">חסר: {g.text}</span>
                  </div>
                ))}
                {gaps.filter(g => g.type === 'exists').map((g, i) => (
                  <div key={`e-${i}`} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-stone-500">{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adapted document preview */}
          <div className="bg-white rounded-xl border border-stone-200">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">📄 מסמך מותאם</h3>
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                {showOriginal ? 'הסתר מקור' : 'הצג מקור להשוואה'}
                {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {showOriginal ? (
              <div className="grid grid-cols-2 divide-x divide-stone-200">
                <div className="p-4">
                  <div className="text-xs text-stone-400 mb-2 font-medium">מקור</div>
                  <pre className="text-xs text-stone-500 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-sans leading-relaxed">
                    {originalContent.slice(0, 5000)}
                  </pre>
                </div>
                <div className="p-4">
                  <div className="text-xs text-indigo-500 mb-2 font-medium">מותאם לתיקון 13</div>
                  <pre className="text-xs text-stone-700 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-sans leading-relaxed" dangerouslySetInnerHTML={{
                    __html: adaptedContent.slice(0, 5000).replace(
                      /\[נוסף\]/g,
                      '<span class="bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-bold">נוסף</span>'
                    )
                  }} />
                </div>
              </div>
            ) : (
              <div className="p-4">
                <pre className="text-sm text-stone-700 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-sans leading-relaxed" dangerouslySetInnerHTML={{
                  __html: adaptedContent.slice(0, 5000).replace(
                    /\[נוסף\]/g,
                    '<span class="bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-bold">נוסף</span>'
                  )
                }} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                toast('המסמך נשמר ונשלח לאישור הממונה')
                onDocumentCreated()
                reset()
              }}
              className="flex-1 px-4 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors cursor-pointer text-sm"
            >
              ✓ אישור — המסמך נשלח לסקירת הממונה
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors cursor-pointer text-sm"
            >
              העלאת מסמך אחר
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
