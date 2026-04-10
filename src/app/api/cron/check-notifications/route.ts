import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const now = new Date()
  const results = { orgs: 0, notifications: 0, errors: [] as string[] }

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, onboarding_completed, created_at')

    if (error || !orgs) {
      return NextResponse.json({ error: 'Failed to fetch orgs' }, { status: 500 })
    }

    for (const org of orgs) {
      results.orgs++
      const pending: Array<{
        org_id: string; type: string
        title: string; body: string; link: string
      }> = []

      // Fetch org data in parallel
      const [{ data: docs }, { data: incidents }, { data: reviews }] = await Promise.all([
        supabase.from('documents').select('id, type, status, updated_at, created_at').eq('org_id', org.id),
        supabase.from('security_incidents').select('id, title, status, created_at').eq('org_id', org.id),
        supabase.from('compliance_reviews').select('id, findings, created_at').eq('org_id', org.id).order('created_at', { ascending: false }).limit(1),
      ])

      const docTypes = (docs || []).map(d => d.type)
      const activeDocs = (docs || []).filter(d => d.status === 'active')

      // ──────────────────────────────────
      // 1. Document staleness
      // ──────────────────────────────────
      const pp = activeDocs.find(d => d.type === 'privacy_policy')
      if (pp) {
        const age = (now.getTime() - new Date(pp.updated_at || pp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (age > 11) {
          pending.push({
            org_id: org.id, type: `doc:${age > 12 ? 'critical' : 'warning'}`,
            title: 'מדיניות הפרטיות דורשת עדכון',
            body: 'מדיניות הפרטיות שלך לא עודכנה מעל 11 חודשים — הרגולטור דורש עדכון שנתי.',
            link: '/dashboard?tab=documents',
          })
        }
      }

      const secDoc = activeDocs.find(d => d.type === 'security_policy' || d.type === 'security_procedures')
      if (secDoc) {
        const age = (now.getTime() - new Date(secDoc.updated_at || secDoc.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (age > 12) {
          pending.push({
            org_id: org.id, type: 'doc:warning',
            title: 'נוהל אבטחת מידע דורש סקירה שנתית',
            body: 'נוהל אבטחת המידע לא עודכן מעל שנה. מומלץ לסקור ולעדכן.',
            link: '/dashboard?tab=documents',
          })
        }
      }

      // ──────────────────────────────────
      // 2. Missing required docs
      // ──────────────────────────────────
      if (!docTypes.includes('dpo_appointment')) {
        pending.push({
          org_id: org.id, type: 'doc:warning',
          title: 'טרם נוצר כתב מינוי DPO',
          body: 'כתב מינוי ממונה הגנת פרטיות נדרש לפי החוק.',
          link: '/dashboard?tab=documents',
        })
      }
      if (!docTypes.includes('ropa')) {
        pending.push({
          org_id: org.id, type: 'doc:info',
          title: 'טרם הוגדר רישום פעילויות עיבוד (ROPA)',
          body: 'רישום פעילויות עיבוד מידע הוא חלק חשוב מציות לחוק.',
          link: '/dashboard?tab=databases',
        })
      }

      // ──────────────────────────────────
      // 3. Critical findings open 7+ days
      // ──────────────────────────────────
      const latestReview = reviews?.[0]
      if (latestReview) {
        const reviewAge = (now.getTime() - new Date(latestReview.created_at).getTime()) / (1000 * 60 * 60 * 24)
        const findings = Array.isArray(latestReview.findings) ? latestReview.findings : []
        const criticals = findings.filter((f: any) => f.severity === 'critical')
        if (criticals.length > 0 && reviewAge >= 7) {
          for (const cf of criticals) {
            pending.push({
              org_id: org.id, type: 'compliance:critical',
              title: `ממצא קריטי פתוח: ${cf.title}`,
              body: cf.description || 'ממצא קריטי שטרם טופל דורש תשומת לב מיידית.',
              link: '/dashboard?tab=compliance',
            })
          }
        }
      }

      // ──────────────────────────────────
      // 4. Onboarding incomplete 3+ days
      // ──────────────────────────────────
      if (org.onboarding_completed === false) {
        const orgAge = (now.getTime() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (orgAge >= 3) {
          pending.push({
            org_id: org.id, type: 'onboarding:info',
            title: 'השלם את ההרשמה כדי לקבל מסמכים מדויקים',
            body: 'תהליך ההרשמה טרם הושלם — חלק מהמסמכים לא ישקפו את המצב המלא.',
            link: '/onboarding',
          })
        }
      }

      // ──────────────────────────────────
      // 5. Open incidents 24+ hours
      // ──────────────────────────────────
      const openIncidents = (incidents || []).filter(i => i.status === 'open')
      for (const inc of openIncidents) {
        const incAge = (now.getTime() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60)
        if (incAge >= 24) {
          pending.push({
            org_id: org.id, type: 'incident:critical',
            title: `אירוע אבטחה פתוח דורש טיפול`,
            body: `האירוע "${inc.title || 'ללא כותרת'}" פתוח מעל 24 שעות.`,
            link: '/dashboard?tab=incidents',
          })
        }
      }

      // ──────────────────────────────────
      // 6. Quarterly reminder (1st of quarter)
      // ──────────────────────────────────
      const month = now.getMonth() + 1
      const day = now.getDate()
      if (day === 1 && [1, 4, 7, 10].includes(month)) {
        pending.push({
          org_id: org.id, type: 'compliance:info',
          title: 'סקירת ציות רבעונית מומלצת',
          body: 'תחילת רבעון חדש — זה הזמן לסקור את מצב הציות שלכם.',
          link: '/dashboard?tab=compliance',
        })
      }

      // ──────────────────────────────────
      // Insert all pending (query-based dedupe)
      // ──────────────────────────────────
      for (const n of pending) {
        // Check if identical notification already exists
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('org_id', n.org_id)
          .eq('type', n.type)
          .eq('title', n.title)
          .limit(1)
          .maybeSingle()

        if (existing) continue // skip duplicate

        const { error: insertErr } = await supabase
          .from('notifications')
          .insert(n)
        if (insertErr) {
          results.errors.push(`org ${org.id}: ${insertErr.message}`)
        } else {
          results.notifications++
        }
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Check notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
