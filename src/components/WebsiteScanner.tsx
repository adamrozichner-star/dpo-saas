'use client'

import { useState } from 'react'
import { Search, Globe, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export default function WebsiteScanner({ supabase }: { supabase: any }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const scan = async () => {
    if (!url) return
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch('/api/scan-website', { method: 'POST', headers, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResults(data)
    } catch { setError('שגיאה בסריקה') }
    finally { setLoading(false) }
  }

  const categoryLabels: Record<string, { label: string; bg: string; text: string }> = {
    analytics: { label: 'אנליטיקה', bg: 'bg-blue-100', text: 'text-blue-700' },
    advertising: { label: 'פרסום', bg: 'bg-amber-100', text: 'text-amber-700' },
    functional: { label: 'פונקציונלי', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-indigo-500" />
        <h3 className="font-semibold text-stone-800">סריקת אתר — עוגיות ופיקסלים</h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.co.il"
          className="flex-1 px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
          dir="ltr"
          onKeyDown={e => e.key === 'Enter' && scan()}
        />
        <button onClick={scan} disabled={loading || !url} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'סורק...' : 'סרוק'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {results && (
        <div className="space-y-4">
          {/* Risk Level */}
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
            results.riskLevel === 'high' ? 'bg-red-50 text-red-700' :
            results.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' :
            'bg-emerald-50 text-emerald-700'
          }`}>
            {results.riskLevel === 'low' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {results.riskLevel === 'high' ? 'סיכון גבוה — חסר מנגנון הסכמה' : results.riskLevel === 'medium' ? 'סיכון בינוני — מומלץ לבדוק' : 'סיכון נמוך'}
          </div>

          {/* Consent Status */}
          <div className="flex items-center gap-2 text-sm">
            {results.consent?.hasConsentMechanism
              ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-700">נמצא מנגנון הסכמה</span></>
              : <><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-amber-700">לא נמצא מנגנון הסכמה</span></>
            }
          </div>

          {/* Trackers Found */}
          {results.trackers?.list?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-stone-700 mb-2">עוקבים שנמצאו ({results.trackers.total})</h4>
              <div className="space-y-1.5">
                {results.trackers.list.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-stone-50 rounded-lg text-sm">
                    <div className="min-w-0">
                      <span className="text-stone-800 text-sm font-medium">{t.name}</span>
                      <span className="text-stone-400 text-xs mr-2">{t.description}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${categoryLabels[t.category]?.bg || 'bg-stone-100'} ${categoryLabels[t.category]?.text || 'text-stone-600'}`}>
                      {categoryLabels[t.category]?.label || t.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {results.recommendations?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-stone-700 mb-2">המלצות</h4>
              {results.recommendations.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1.5 text-sm text-indigo-700">
                  <span className="flex-shrink-0">💡</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {results.trackers?.total === 0 && (
            <p className="text-sm text-stone-500 text-center py-4">לא נמצאו עוקבים או פיקסלים</p>
          )}
        </div>
      )}

      {!results && !loading && !error && (
        <p className="text-xs text-stone-400 text-center">הזינו כתובת אתר לבדיקת עוגיות, פיקסלים וצורך בהסכמה</p>
      )}
    </div>
  )
}
