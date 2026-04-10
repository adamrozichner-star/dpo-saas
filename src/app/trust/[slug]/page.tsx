import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DPO_CONFIG } from '@/lib/dpo-config'

// =============================================
// Data fetching
// =============================================
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getOrgBySlug(slug: string) {
  const supabase = getSupabase()
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('public_slug', slug)
    .eq('trust_page_enabled', true)
    .single()
  return org
}

async function getTrustData(orgId: string) {
  const supabase = getSupabase()
  const [{ data: review }, { data: profile }, { data: docs }] = await Promise.all([
    supabase.from('compliance_reviews').select('score_after, created_at')
      .eq('org_id', orgId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('organization_profiles').select('profile_data')
      .eq('org_id', orgId).maybeSingle(),
    supabase.from('documents').select('type, title, status')
      .eq('org_id', orgId).in('status', ['active', 'approved']),
  ])
  return { review, profile, docs }
}

// =============================================
// SEO Metadata
// =============================================
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params
  const org = await getOrgBySlug(slug)
  if (!org) return { title: 'לא נמצא · Deepo' }
  return {
    title: `${org.name} · ציות לפרטיות · Deepo`,
    description: `${org.name} מחויבים להגנה על המידע שלך. ציות לתיקון 13 לחוק הגנת הפרטיות.`,
    openGraph: {
      title: `${org.name} · ציות לפרטיות`,
      description: `${org.name} מחויבים להגנה על המידע שלך. מוגן על ידי Deepo.`,
    },
  }
}

// =============================================
// Label maps
// =============================================
const DB_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  customers: { label: 'לקוחות', icon: '👥', desc: 'מידע אישי של לקוחות מוגן בהתאם לחוק' },
  employees: { label: 'עובדים', icon: '🏢', desc: 'מידע על עובדים נשמר באופן מאובטח' },
  cvs: { label: 'מועמדים', icon: '📄', desc: 'קורות חיים ופרטי מועמדים מוגנים' },
  suppliers_id: { label: 'ספקים', icon: '🤝', desc: 'מידע אישי של ספקים מנוהל בהתאם לחוק' },
  website_leads: { label: 'לידים', icon: '🌐', desc: 'פרטים שנאספו מהאתר מוגנים' },
  payments: { label: 'תשלומים', icon: '💳', desc: 'מידע פיננסי מוצפן ומאובטח' },
  cameras: { label: 'מצלמות', icon: '📹', desc: 'צילומי מצלמות מנוהלים בהתאם לתקנות' },
  medical: { label: 'מידע רפואי', icon: '🏥', desc: 'מידע רפואי רגיש מוגן ברמה הגבוהה ביותר' },
}

// =============================================
// Page Component
// =============================================
export default async function TrustPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const org = await getOrgBySlug(slug)
  if (!org) notFound()

  const { review, profile, docs } = await getTrustData(org.id)

  const v3 = profile?.profile_data?.v3Answers || {}
  const databases: string[] = [...(v3.databases || []), ...(v3.customDatabases || [])]
  const complianceScore = review?.score_after ?? null
  const lastReviewDate = review?.created_at
  const activeDocs = docs || []
  const privacyPolicy = activeDocs.find((d: any) => d.type === 'privacy_policy')
  const isCompliant = complianceScore !== null && complianceScore >= 50

  const initials = org.name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??'

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-stone-50" dir="rtl">
      {/* Hero */}
      <header className="pt-12 pb-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-5 shadow-sm border border-amber-200/50">
            <span className="text-2xl font-bold text-amber-700">{initials}</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">{org.name}</h1>
          <p className="text-lg text-stone-500">מחויבים להגנה על המידע שלך</p>
          {lastReviewDate && (
            <p className="text-xs text-stone-400 mt-3">
              עודכן לאחרונה: {new Date(lastReviewDate).toLocaleDateString('he-IL')}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
        {/* Trust Signals */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Score */}
          {complianceScore !== null && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${complianceScore >= 70 ? 'text-emerald-600' : complianceScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {complianceScore}%
              </div>
              <p className="text-xs text-stone-500 mt-1">ציון ציות</p>
            </div>
          )}

          {/* DPO Badge */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
            <div className="text-2xl">🛡️</div>
            <p className="text-xs text-stone-500 mt-1">DPO ממונה</p>
          </div>

          {/* Amendment 13 */}
          {isCompliant && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center shadow-sm">
              <div className="text-2xl">✅</div>
              <p className="text-xs text-emerald-700 mt-1">תואם תיקון 13</p>
            </div>
          )}

          {/* Last Review */}
          {lastReviewDate && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
              <div className="text-2xl">📋</div>
              <p className="text-xs text-stone-500 mt-1">סקירה אחרונה</p>
              <p className="text-[10px] text-stone-400">{new Date(lastReviewDate).toLocaleDateString('he-IL')}</p>
            </div>
          )}
        </section>

        {/* What We Protect */}
        {databases.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">מה אנחנו מגנים</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {databases
                .filter(db => DB_LABELS[db])
                .map(db => {
                  const info = DB_LABELS[db]
                  return (
                    <div key={db} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xl">{info.icon}</span>
                        <h3 className="font-medium text-stone-800">{info.label}</h3>
                      </div>
                      <p className="text-sm text-stone-500">{info.desc}</p>
                    </div>
                  )
                })}
            </div>
          </section>
        )}

        {/* Policies & DPO Contact */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4">מדיניות ויצירת קשר</h2>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm divide-y divide-stone-100">
            {privacyPolicy && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📜</span>
                  <span className="text-sm font-medium text-stone-700">מדיניות פרטיות</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">פעיל</span>
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🛡️</span>
                <span className="text-sm font-medium text-stone-700">ממונה הגנת הפרטיות</span>
              </div>
              <span className="text-sm text-stone-500">{DPO_CONFIG.name}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📧</span>
                <span className="text-sm font-medium text-stone-700">דוא״ל ממונה</span>
              </div>
              <a href={`mailto:${DPO_CONFIG.email}`} className="text-sm text-indigo-600 hover:underline">{DPO_CONFIG.email}</a>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <span className="text-sm font-medium text-stone-700">טלפון</span>
              </div>
              <a href={`tel:${DPO_CONFIG.phone}`} className="text-sm text-indigo-600 hover:underline">{DPO_CONFIG.phone}</a>
            </div>
          </div>
        </section>

        {/* Data Subject Rights */}
        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-6 text-center">
          <h2 className="text-lg font-semibold text-stone-800 mb-2">ממש את זכויותיך</h2>
          <p className="text-sm text-stone-600 mb-4">
            לפי חוק הגנת הפרטיות, יש לך זכות לעיין, לתקן או למחוק מידע אישי שנשמר עליך.
          </p>
          <Link
            href={`/rights/${org.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-sm"
          >
            הגש בקשה
          </Link>
        </section>
      </main>

      {/* Footer — viral badge */}
      <footer className="border-t border-stone-200 bg-gradient-to-b from-white to-amber-50/30 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <a
            href="https://deepo.co.il"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
              <span className="text-sm">🛡️</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-700 font-medium">מוגן על ידי</p>
              <p className="text-sm font-bold text-amber-800 group-hover:text-amber-900">Deepo</p>
            </div>
          </a>
          <p className="text-xs text-stone-400 mt-4">
            <a href="https://deepo.co.il" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition-colors">
              השג ציות לתיקון 13 ב-5 דקות →
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
