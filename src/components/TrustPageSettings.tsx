'use client'

import { useState, useEffect } from 'react'
import { Globe, Copy, ExternalLink, Check, Loader2 } from 'lucide-react'

interface TrustPageSettingsProps {
  organization: any
  supabase: any
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export default function TrustPageSettings({ organization, supabase }: TrustPageSettingsProps) {
  const [enabled, setEnabled] = useState(organization?.trust_page_enabled || false)
  const [slug, setSlug] = useState(organization?.public_slug || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [copied, setCopied] = useState<'url' | 'embed' | null>(null)

  useEffect(() => {
    if (!slug && organization?.name) {
      setSlug(slugify(organization.name))
    }
  }, [organization?.name, slug])

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://deepo.co.il'

  const trustUrl = `${appUrl}/trust/${slug}`

  const embedCode = `<a href="${trustUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${appUrl}/badge.svg" alt="מוגן על ידי Deepo" width="200" height="60" />
</a>`

  const handleSave = async () => {
    if (!supabase || !organization?.id) return
    setSaving(true)
    setSaveMsg('')
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          trust_page_enabled: enabled,
          public_slug: slug || null,
        })
        .eq('id', organization.id)

      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          setSaveMsg('הכתובת תפוסה — נסו כתובת אחרת')
        } else {
          setSaveMsg('שגיאה בשמירה')
        }
      } else {
        organization.trust_page_enabled = enabled
        organization.public_slug = slug
        setSaveMsg('נשמר בהצלחה ✓')
        setTimeout(() => setSaveMsg(''), 3000)
      }
    } catch {
      setSaveMsg('שגיאה בשמירה')
    }
    setSaving(false)
  }

  const handleCopy = (text: string, type: 'url' | 'embed') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-amber-500" />
        <h2 className="font-semibold text-stone-800">דף ציות ציבורי</h2>
      </div>
      <p className="text-sm text-stone-500 mb-5">
        פרסם דף ציבורי שמציג את מחויבות הארגון לפרטיות. שתף קישור או הטמע תג באתר שלך.
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-5">
        <label className="text-sm font-medium text-stone-700">פרסם דף ציות ציבורי</label>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-amber-500' : 'bg-stone-300'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'right-0.5' : 'right-[22px]'}`} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Slug input */}
          <div>
            <label className="text-sm text-stone-500 block mb-1">כתובת הדף</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                <span className="text-xs text-stone-400 px-3 whitespace-nowrap border-l border-stone-200">/trust/</span>
                <input
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  className="flex-1 px-3 py-2 bg-transparent text-sm text-stone-800 focus:outline-none"
                  placeholder="my-company"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !slug}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'שומר...' : 'שמור'}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.includes('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{saveMsg}</span>
            )}
          </div>

          {/* Preview & URLs */}
          {slug && organization?.public_slug && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              {/* Trust page URL */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">קישור לדף</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600 truncate" dir="ltr">
                    {trustUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(trustUrl, 'url')}
                    className="px-3 py-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    {copied === 'url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-stone-500" />}
                  </button>
                  <a
                    href={trustUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-stone-500" />
                  </a>
                </div>
              </div>

              {/* Embed code */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">קוד הטמעה לאתר שלך</label>
                <div className="relative">
                  <pre className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 overflow-x-auto whitespace-pre-wrap" dir="ltr">
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(embedCode, 'embed')}
                    className="absolute top-2 left-2 p-1.5 bg-white border border-stone-200 rounded-md hover:bg-stone-50 transition-colors"
                  >
                    {copied === 'embed' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-stone-500" />}
                  </button>
                </div>
              </div>

              {/* Badge preview */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">תצוגה מקדימה</label>
                <div className="inline-block p-3 bg-white border border-stone-200 rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/badge.svg" alt="מוגן על ידי Deepo" width={200} height={60} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
