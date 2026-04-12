import { SupabaseClient } from '@supabase/supabase-js'
import { activityRequiresDPIA, DB_LABELS_DPIA } from './dpia-templates'

interface PendingNotification {
  org_id: string
  type: string
  title: string
  body: string
  link: string
}

export async function checkAndCreateNotificationsForOrg(orgId: string, supabase: SupabaseClient) {
  console.log('[Notif Trigger] Starting for org:', orgId)
  const now = new Date()
  const pending: PendingNotification[] = []

  const [{ data: org }, { data: docs }, { data: incidents }, { data: reviews }, { data: profile }, { data: dpias }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('documents').select('id, type, status, updated_at, created_at').eq('org_id', orgId),
    supabase.from('security_incidents').select('id, title, status, created_at').eq('org_id', orgId),
    supabase.from('compliance_reviews').select('id, findings, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1),
    supabase.from('organization_profiles').select('profile_data').eq('org_id', orgId).maybeSingle(),
    supabase.from('dpia_assessments').select('id, activity_id, activity_name, next_review_date, action_plan').eq('org_id', orgId),
  ])

  if (!org) {
    console.log('[Notif Trigger] Org not found:', orgId)
    return
  }

  console.log('[Notif Check] org:', org.id, 'onboarding_completed:', org.onboarding_completed, 'docs:', (docs || []).length, 'created_at:', org.created_at)

  const docTypes = (docs || []).map(d => d.type)
  const activeDocs = (docs || []).filter(d => d.status === 'active')
  const orgAgeDays = (now.getTime() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24)

  // 0. Welcome & essential docs for new/any users
  if (orgAgeDays < 7 && (docs || []).length === 0) {
    pending.push({
      org_id: orgId, type: 'welcome:info',
      title: 'ברוכים הבאים ל-Deepo!',
      body: 'בואו ניצור את המסמך הראשון שלכם — מדיניות פרטיות מותאמת לעסק.',
      link: '/dashboard?tab=documents',
    })
  }

  if (!docTypes.includes('privacy_policy')) {
    pending.push({
      org_id: orgId, type: 'doc:warning',
      title: 'צרו מדיניות פרטיות',
      body: 'מדיניות פרטיות היא מסמך חובה לפי תיקון 13. ניתן ליצור אותה בלחיצת כפתור.',
      link: '/dashboard?tab=documents',
    })
  }

  // 1. Document staleness
  const pp = activeDocs.find(d => d.type === 'privacy_policy')
  if (pp) {
    const age = (now.getTime() - new Date(pp.updated_at || pp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (age > 11) {
      pending.push({
        org_id: orgId, type: `doc:${age > 12 ? 'critical' : 'warning'}`,
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
        org_id: orgId, type: 'doc:warning',
        title: 'נוהל אבטחת מידע דורש סקירה שנתית',
        body: 'נוהל אבטחת המידע לא עודכן מעל שנה. מומלץ לסקור ולעדכן.',
        link: '/dashboard?tab=documents',
      })
    }
  }

  // 2. Missing required docs
  if (!docTypes.includes('dpo_appointment')) {
    pending.push({
      org_id: orgId, type: 'doc:warning',
      title: 'טרם נוצר כתב מינוי DPO',
      body: 'כתב מינוי ממונה הגנת פרטיות נדרש לפי החוק.',
      link: '/dashboard?tab=documents',
    })
  }
  if (!docTypes.includes('ropa')) {
    pending.push({
      org_id: orgId, type: 'doc:info',
      title: 'טרם הוגדר רישום פעילויות עיבוד (ROPA)',
      body: 'רישום פעילויות עיבוד מידע הוא חלק חשוב מציות לחוק.',
      link: '/dashboard?tab=databases',
    })
  }

  // 3. Critical findings open 7+ days
  const latestReview = reviews?.[0]
  if (latestReview) {
    const reviewAge = (now.getTime() - new Date(latestReview.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const findings = Array.isArray(latestReview.findings) ? latestReview.findings : []
    const criticals = findings.filter((f: any) => f.severity === 'critical')
    if (criticals.length > 0 && reviewAge >= 7) {
      for (const cf of criticals) {
        pending.push({
          org_id: orgId, type: 'compliance:critical',
          title: `ממצא קריטי פתוח: ${cf.title}`,
          body: cf.description || 'ממצא קריטי שטרם טופל דורש תשומת לב מיידית.',
          link: '/dashboard?tab=compliance',
        })
      }
    }
  }

  // 4. Onboarding incomplete
  if (org.onboarding_completed === false) {
    pending.push({
      org_id: orgId, type: 'onboarding:info',
      title: 'השלימו את ההרשמה לקבלת מסמכים מדויקים',
      body: 'תהליך ההרשמה טרם הושלם — השלימו אותו כדי שהמסמכים ישקפו את המצב המלא.',
      link: '/onboarding',
    })
  }

  // 5. Open incidents 24+ hours
  const openIncidents = (incidents || []).filter(i => i.status === 'open')
  for (const inc of openIncidents) {
    const incAge = (now.getTime() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60)
    if (incAge >= 24) {
      pending.push({
        org_id: orgId, type: 'incident:critical',
        title: 'אירוע אבטחה פתוח דורש טיפול',
        body: `האירוע "${inc.title || 'ללא כותרת'}" פתוח מעל 24 שעות.`,
        link: '/dashboard?tab=incidents',
      })
    }
  }

  // 5b. Rights workflow missing
  const v3Early = profile?.profile_data?.v3Answers || {}
  if (v3Early.rightsWorkflow === 'no') {
    pending.push({
      org_id: orgId, type: 'compliance:critical',
      title: 'הקימו תהליך טיפול בבקשות זכויות תוך 30 יום',
      body: 'סעיפים 13-14 לחוק הגנת הפרטיות מחייבים תהליך מסודר לטיפול בבקשות עיון, תיקון ומחיקה.',
      link: '/dashboard?tab=settings&section=rights-workflow',
    })
  }

  // 6. DPIA checks
  const v3 = profile?.profile_data?.v3Answers || {}
  const databases: string[] = [...(v3.databases || []), ...(v3.customDatabases || [])]
  const dbDetails = v3.dbDetails || {}
  const coveredActivityIds = new Set((dpias || []).map(d => d.activity_id).filter(Boolean))

  const requiringDpia = databases.filter(dbKey => {
    if (coveredActivityIds.has(dbKey)) return false
    return activityRequiresDPIA(dbKey, dbDetails[dbKey] || {}).required
  })

  if (requiringDpia.length > 0) {
    pending.push({
      org_id: orgId, type: 'dpia:critical',
      title: `${requiringDpia.length} פעילויות דורשות תסקיר השפעה`,
      body: 'הרגולטור דורש תסקיר השפעה על הפרטיות (DPIA) עבור פעילויות עם מידע רגיש או היקף גדול.',
      link: '/dashboard?tab=compliance',
    })
  }

  // DPIA reviews due
  for (const dpia of dpias || []) {
    if (!dpia.next_review_date) continue
    const daysUntil = (new Date(dpia.next_review_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 30) {
      pending.push({
        org_id: orgId, type: daysUntil < 0 ? 'dpia:critical' : 'dpia:warning',
        title: `תסקיר "${dpia.activity_name}" דורש סקירה תקופתית`,
        body: daysUntil < 0 ? `הסקירה באיחור של ${Math.abs(Math.round(daysUntil))} ימים.` : `הסקירה תגיע בעוד ${Math.round(daysUntil)} ימים.`,
        link: '/dashboard?tab=compliance',
      })
    }

    // Overdue action items
    const actions = Array.isArray(dpia.action_plan) ? dpia.action_plan : []
    const overdue = actions.filter((a: any) => !a.completed && a.deadline && new Date(a.deadline) < now)
    if (overdue.length > 0) {
      pending.push({
        org_id: orgId, type: 'dpia:warning',
        title: `פעולה בתסקיר "${dpia.activity_name}" באיחור`,
        body: `${overdue.length} פעולות באיחור בתוכנית הטיפול.`,
        link: '/dashboard?tab=compliance',
      })
    }
  }

  // Insert with dedupe
  let created = 0
  for (const n of pending) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('org_id', n.org_id)
      .eq('type', n.type)
      .eq('title', n.title)
      .limit(1)
      .maybeSingle()

    if (existing) continue

    const { error: insertErr } = await supabase.from('notifications').insert(n)
    if (insertErr) {
      console.error('[Notif Trigger] Insert error:', insertErr.message, 'for:', n.title)
    } else {
      created++
    }
  }
  console.log(`[Notif Trigger] Done for org ${orgId}: ${pending.length} pending, ${created} created`)
}
