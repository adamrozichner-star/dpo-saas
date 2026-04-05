import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TrackerPattern {
  name: string
  category: 'analytics' | 'advertising' | 'social' | 'functional' | 'other'
  patterns: RegExp[]
  description: string
}

const TRACKER_PATTERNS: TrackerPattern[] = [
  { name: 'Google Analytics (GA4)', category: 'analytics', patterns: [/gtag\s*\(/i, /G-[A-Z0-9]+/i, /googletagmanager/i], description: 'מערכת אנליטיקה של Google' },
  { name: 'Google Analytics (UA)', category: 'analytics', patterns: [/UA-\d+-\d+/i, /google-analytics\.com\/analytics/i], description: 'גרסה ישנה של Google Analytics' },
  { name: 'Google Tag Manager', category: 'analytics', patterns: [/GTM-[A-Z0-9]+/i, /googletagmanager\.com\/gtm/i], description: 'מנהל תגיות של Google' },
  { name: 'Facebook Pixel', category: 'advertising', patterns: [/fbq\s*\(/i, /facebook\.com\/tr/i, /connect\.facebook\.net/i], description: 'פיקסל פרסום של Facebook' },
  { name: 'TikTok Pixel', category: 'advertising', patterns: [/ttq\./i, /analytics\.tiktok\.com/i], description: 'פיקסל פרסום של TikTok' },
  { name: 'Google Ads', category: 'advertising', patterns: [/AW-[0-9]+/i, /googleads\.g\.doubleclick/i, /conversion\.js/i], description: 'מעקב המרות Google Ads' },
  { name: 'Hotjar', category: 'analytics', patterns: [/hotjar\.com/i, /hj\s*\(/i, /_hjSettings/i], description: 'מפות חום ומעקב התנהגות משתמשים' },
  { name: 'Clarity', category: 'analytics', patterns: [/clarity\.ms/i], description: 'כלי מעקב של Microsoft' },
  { name: 'LinkedIn Insight', category: 'advertising', patterns: [/snap\.licdn\.com/i, /linkedin\.com\/px/i], description: 'מעקב המרות LinkedIn' },
  { name: 'Twitter Pixel', category: 'advertising', patterns: [/static\.ads-twitter\.com/i, /twq\s*\(/i], description: 'מעקב המרות Twitter/X' },
  { name: 'Pinterest Tag', category: 'advertising', patterns: [/pintrk\s*\(/i, /ct\.pinterest\.com/i], description: 'מעקב המרות Pinterest' },
  { name: 'Snapchat Pixel', category: 'advertising', patterns: [/sc-static\.net\/scevent/i, /snaptr\s*\(/i], description: 'מעקב המרות Snapchat' },
  { name: 'Mixpanel', category: 'analytics', patterns: [/mixpanel\.com/i, /mixpanel\.init/i], description: 'אנליטיקת מוצר' },
  { name: 'Segment', category: 'analytics', patterns: [/cdn\.segment\.com/i, /analytics\.js/i], description: 'פלטפורמת נתוני לקוחות' },
  { name: 'Amplitude', category: 'analytics', patterns: [/amplitude\.com/i, /amplitude\.getInstance/i], description: 'אנליטיקת מוצר' },
  { name: 'Intercom', category: 'functional', patterns: [/intercom\.com/i, /intercomSettings/i], description: 'צ׳אט ותמיכה' },
  { name: 'Crisp', category: 'functional', patterns: [/client\.crisp\.chat/i, /CRISP_WEBSITE_ID/i], description: 'צ׳אט חי' },
  { name: 'Drift', category: 'functional', patterns: [/js\.driftt\.com/i, /drift\.com/i], description: 'צ׳אט מכירות' },
  { name: 'HubSpot', category: 'analytics', patterns: [/js\.hs-scripts\.com/i, /hubspot\.com/i, /hs-analytics/i], description: 'מערכת שיווק ו-CRM' },
  { name: 'Taboola', category: 'advertising', patterns: [/cdn\.taboola\.com/i, /tbl_/i], description: 'רשת פרסום תוכן' },
  { name: 'Outbrain', category: 'advertising', patterns: [/outbrain\.com/i], description: 'רשת פרסום תוכן' },
  { name: 'Yandex Metrica', category: 'analytics', patterns: [/mc\.yandex\.ru/i, /ym\s*\(/i], description: 'אנליטיקה של Yandex' },
]

const CONSENT_PATTERNS = [
  /cookie.?consent/i,
  /cookie.?banner/i,
  /cookie.?notice/i,
  /cookie.?policy/i,
  /gdpr/i,
  /consent.?management/i,
  /onetrust/i,
  /cookiebot/i,
  /cookie.?law/i,
  /privacy.?notice/i,
  /cookie-consent/i,
]

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let targetUrl: URL
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the HTML
    let html: string
    try {
      const response = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'Deepo-Scanner/1.0' },
        signal: AbortSignal.timeout(10000),
      })
      html = await response.text()
    } catch {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 })
    }

    // Scan for trackers
    const foundTrackers = TRACKER_PATTERNS.filter(tracker =>
      tracker.patterns.some(pattern => pattern.test(html))
    ).map(tracker => ({
      name: tracker.name,
      category: tracker.category,
      description: tracker.description,
    }))

    // Check for consent mechanism
    const hasConsentMechanism = CONSENT_PATTERNS.some(pattern => pattern.test(html))

    // Categorize findings
    const analytics = foundTrackers.filter(t => t.category === 'analytics')
    const advertising = foundTrackers.filter(t => t.category === 'advertising')
    const social = foundTrackers.filter(t => t.category === 'social')
    const functional = foundTrackers.filter(t => t.category === 'functional')

    // Risk assessment
    const riskLevel = !hasConsentMechanism && foundTrackers.length > 0
      ? 'high'
      : foundTrackers.length > 5
      ? 'medium'
      : 'low'

    const recommendations: string[] = []
    if (!hasConsentMechanism && foundTrackers.length > 0) {
      recommendations.push('חובה להוסיף מנגנון הסכמה לעוגיות (Cookie Consent Banner)')
    }
    if (advertising.length > 0) {
      recommendations.push('פיקסלים פרסומיים דורשים הסכמה מפורשת של המשתמש לפני טעינה')
    }
    if (analytics.length > 2) {
      recommendations.push('מספר רב של כלי אנליטיקה — שקלו לצמצם כדי למזער איסוף מידע')
    }
    if (!hasConsentMechanism) {
      recommendations.push('מומלץ להטמיע פתרון כמו CookieBot או OneTrust לניהול הסכמות')
    }

    return NextResponse.json({
      url: targetUrl.toString(),
      scannedAt: new Date().toISOString(),
      trackers: {
        total: foundTrackers.length,
        list: foundTrackers,
        byCategory: { analytics: analytics.length, advertising: advertising.length, social: social.length, functional: functional.length },
      },
      consent: {
        hasConsentMechanism,
        compliant: hasConsentMechanism || foundTrackers.length === 0,
      },
      riskLevel,
      recommendations,
    })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
