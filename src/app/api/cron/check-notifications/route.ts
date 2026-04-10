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
        org_id: string; type: string; severity: string
        title: string; description: string; action_url: string; action_label: string
        expires_at?: string
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
            org_id: org.id, type: 'doc_stale_privacy', severity: age > 12 ? 'critical' : 'warning',
            title: 'מדיניות הפרטיות דורשת עדכון',
            description: 'מדיניות הפרטיות שלך לא עודכנה מעל 11 חודשים — הרגולטור דורש עדכון שנתי.',
            action_url: '/dashboard?tab=documents', action_label: 'עדכן מדיניות',
          })
        }
      }

      const secDoc = activeDocs.find(d => d.type === 'security_policy' || d.type === 'security_procedures')
      if (secDoc) {
        const age = (now.getTime() - new Date(secDoc.updated_at || secDoc.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (age > 12) {
          pending.push({
            org_id: org.id, type: 'doc_stale_security', severity: 'warning',
            title: 'נוהל אבטחת מידע דורש סקירה שנתית',
            description: 'נוהל אבטחת המידע לא עודכן מעל שנה. מומלץ לסקור ולעדכן.',
            action_url: '/dashboard?tab=documents', action_label: 'סקור נוהל',
          })
        }
      }

      // ──────────────────────────────────
      // 2. Missing required docs
      // ──────────────────────────────────
      if (!docTypes.includes('dpo_appointment')) {
        pending.push({
          org_id: org.id, type: 'missing_doc_dpo', severity: 'warning',
          title: 'טרם נוצר כתב מינוי DPO',
          description: 'כתב מינוי ממונה הגנת פרטיות נדרש לפי החוק.',
          action_url: '/dashboard?tab=documents', action_label: 'צור כתב מינוי',
        })
      }
      if (!docTypes.includes('ropa')) {
        pending.push({
          org_id: org.id, type: 'missing_doc_ropa', severity: 'info',
          title: 'טרם הוגדר רישום פעילויות עיבוד (ROPA)',
          description: 'רישום פעילויות עיבוד מידע הוא חלק חשוב מציות לחוק.',
          action_url: '/dashboard?tab=databases', action_label: 'הגדר ROPA',
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
              org_id: org.id, type: 'critical_finding', severity: 'critical',
              title: `ממצא קריטי פתוח: ${cf.title}`,
              description: cf.description || 'ממצא קריטי שטרם טופל דורש תשומת לב מיידית.',
              action_url: '/dashboard?tab=compliance', action_label: 'טפל בממצא',
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
            org_id: org.id, type: 'onboarding_incomplete', severity: 'info',
            title: 'השלם את ההרשמה כדי לקבל מסמכים מדויקים',
            description: 'תהליך ההרשמה טרם הושלם — חלק מהמסמכים לא ישקפו את המצב המלא.',
            action_url: '/onboarding', action_label: 'השלם הרשמה',
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
            org_id: org.id, type: 'open_incident', severity: 'critical',
            title: `אירוע אבטחה פתוח דורש טיפול`,
            description: `האירוע "${inc.title || 'ללא כותרת'}" פתוח מעל 24 שעות.`,
            action_url: '/dashboard?tab=incidents', action_label: 'טפל באירוע',
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
          org_id: org.id, type: 'quarterly_review', severity: 'info',
          title: 'סקירת ציות רבעונית מומלצת',
          description: 'תחילת רבעון חדש — זה הזמן לסקור את מצב הציות שלכם.',
          action_url: '/dashboard?tab=compliance', action_label: 'הרץ סקירה',
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }

      // ──────────────────────────────────
      // Insert all pending (dedupe via unique index)
      // ──────────────────────────────────
      for (const n of pending) {
        const { error: insertErr } = await supabase
          .from('notifications')
          .upsert(n, { onConflict: 'org_id,type,title', ignoreDuplicates: true })
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
