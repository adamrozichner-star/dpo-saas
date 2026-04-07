import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRACKER_PATTERNS = [
  { name: 'Google Analytics (GA4)', category: 'analytics', patterns: [/gtag\s*\(/i, /G-[A-Z0-9]+/i, /googletagmanager/i], description: '\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05D4 \u05E9\u05DC Google' },
  { name: 'Google Analytics (UA)', category: 'analytics', patterns: [/UA-\d+-\d+/i, /google-analytics\.com\/analytics/i], description: '\u05D2\u05E8\u05E1\u05D4 \u05D9\u05E9\u05E0\u05D4 \u05E9\u05DC Google Analytics' },
  { name: 'Google Tag Manager', category: 'analytics', patterns: [/GTM-[A-Z0-9]+/i, /googletagmanager\.com\/gtm/i], description: '\u05DE\u05E0\u05D4\u05DC \u05EA\u05D2\u05D9\u05D5\u05EA \u05E9\u05DC Google' },
  { name: 'Facebook Pixel', category: 'advertising', patterns: [/fbq\s*\(/i, /facebook\.com\/tr/i, /connect\.facebook\.net/i], description: '\u05E4\u05D9\u05E7\u05E1\u05DC \u05E4\u05E8\u05E1\u05D5\u05DD \u05E9\u05DC Facebook' },
  { name: 'TikTok Pixel', category: 'advertising', patterns: [/ttq\./i, /analytics\.tiktok\.com/i], description: '\u05E4\u05D9\u05E7\u05E1\u05DC \u05E4\u05E8\u05E1\u05D5\u05DD \u05E9\u05DC TikTok' },
  { name: 'Google Ads', category: 'advertising', patterns: [/AW-[0-9]+/i, /googleads\.g\.doubleclick/i], description: '\u05DE\u05E2\u05E7\u05D1 \u05D4\u05DE\u05E8\u05D5\u05EA Google Ads' },
  { name: 'Hotjar', category: 'analytics', patterns: [/hotjar\.com/i, /_hjSettings/i], description: '\u05DE\u05E4\u05D5\u05EA \u05D7\u05D5\u05DD \u05D5\u05DE\u05E2\u05E7\u05D1 \u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA' },
  { name: 'Clarity', category: 'analytics', patterns: [/clarity\.ms/i], description: '\u05DB\u05DC\u05D9 \u05DE\u05E2\u05E7\u05D1 \u05E9\u05DC Microsoft' },
  { name: 'LinkedIn Insight', category: 'advertising', patterns: [/snap\.licdn\.com/i, /linkedin\.com\/px/i], description: '\u05DE\u05E2\u05E7\u05D1 \u05D4\u05DE\u05E8\u05D5\u05EA LinkedIn' },
  { name: 'Twitter Pixel', category: 'advertising', patterns: [/static\.ads-twitter\.com/i, /twq\s*\(/i], description: '\u05DE\u05E2\u05E7\u05D1 \u05D4\u05DE\u05E8\u05D5\u05EA Twitter/X' },
  { name: 'Pinterest Tag', category: 'advertising', patterns: [/pintrk\s*\(/i, /ct\.pinterest\.com/i], description: '\u05DE\u05E2\u05E7\u05D1 \u05D4\u05DE\u05E8\u05D5\u05EA Pinterest' },
  { name: 'Snapchat Pixel', category: 'advertising', patterns: [/sc-static\.net\/scevent/i], description: '\u05DE\u05E2\u05E7\u05D1 \u05D4\u05DE\u05E8\u05D5\u05EA Snapchat' },
  { name: 'Mixpanel', category: 'analytics', patterns: [/mixpanel\.com/i], description: '\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05EA \u05DE\u05D5\u05E6\u05E8' },
  { name: 'Segment', category: 'analytics', patterns: [/cdn\.segment\.com/i], description: '\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA' },
  { name: 'Amplitude', category: 'analytics', patterns: [/amplitude\.com/i], description: '\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05EA \u05DE\u05D5\u05E6\u05E8' },
  { name: 'Intercom', category: 'functional', patterns: [/intercom\.com/i, /intercomSettings/i], description: '\u05E6\u05F3\u05D0\u05D8 \u05D5\u05EA\u05DE\u05D9\u05DB\u05D4' },
  { name: 'Crisp', category: 'functional', patterns: [/client\.crisp\.chat/i], description: '\u05E6\u05F3\u05D0\u05D8 \u05D7\u05D9' },
  { name: 'HubSpot', category: 'analytics', patterns: [/js\.hs-scripts\.com/i, /hubspot\.com/i], description: '\u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05D9\u05D5\u05D5\u05E7 \u05D5-CRM' },
  { name: 'Taboola', category: 'advertising', patterns: [/cdn\.taboola\.com/i], description: '\u05E8\u05E9\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u05EA\u05D5\u05DB\u05DF' },
  { name: 'Outbrain', category: 'advertising', patterns: [/outbrain\.com/i], description: '\u05E8\u05E9\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u05EA\u05D5\u05DB\u05DF' },
]

const CONSENT_PATTERNS = [/cookie.?consent/i, /cookie.?banner/i, /cookie.?notice/i, /gdpr/i, /consent.?management/i, /onetrust/i, /cookiebot/i]

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 scans per minute
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { success: rateLimitOk } = rateLimit(`scan-website:${ip}`, 3, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    let targetUrl: URL
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

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

    const foundTrackers = TRACKER_PATTERNS.filter(tracker =>
      tracker.patterns.some(pattern => pattern.test(html))
    ).map(({ name, category, description }) => ({ name, category, description }))

    const hasConsentMechanism = CONSENT_PATTERNS.some(pattern => pattern.test(html))

    const analytics = foundTrackers.filter(t => t.category === 'analytics')
    const advertising = foundTrackers.filter(t => t.category === 'advertising')
    const functional = foundTrackers.filter(t => t.category === 'functional')

    const riskLevel = !hasConsentMechanism && foundTrackers.length > 0 ? 'high' : foundTrackers.length > 5 ? 'medium' : 'low'

    const recommendations: string[] = []
    if (!hasConsentMechanism && foundTrackers.length > 0) recommendations.push('\u05D7\u05D5\u05D1\u05D4 \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05DE\u05E0\u05D2\u05E0\u05D5\u05DF \u05D4\u05E1\u05DB\u05DE\u05D4 \u05DC\u05E2\u05D5\u05D2\u05D9\u05D5\u05EA (Cookie Consent Banner)')
    if (advertising.length > 0) recommendations.push('\u05E4\u05D9\u05E7\u05E1\u05DC\u05D9\u05DD \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05D9\u05DD \u05D3\u05D5\u05E8\u05E9\u05D9\u05DD \u05D4\u05E1\u05DB\u05DE\u05D4 \u05DE\u05E4\u05D5\u05E8\u05E9\u05EA \u05DC\u05E4\u05E0\u05D9 \u05D8\u05E2\u05D9\u05E0\u05D4')
    if (analytics.length > 2) recommendations.push('\u05DE\u05E1\u05E4\u05E8 \u05E8\u05D1 \u05E9\u05DC \u05DB\u05DC\u05D9 \u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05D4 \u2014 \u05E9\u05E7\u05DC\u05D5 \u05DC\u05E6\u05DE\u05E6\u05DD')
    if (!hasConsentMechanism) recommendations.push('\u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D4\u05D8\u05DE\u05D9\u05E2 \u05E4\u05EA\u05E8\u05D5\u05DF \u05DB\u05DE\u05D5 CookieBot \u05D0\u05D5 OneTrust')

    return NextResponse.json({
      url: targetUrl.toString(),
      scannedAt: new Date().toISOString(),
      trackers: { total: foundTrackers.length, list: foundTrackers, byCategory: { analytics: analytics.length, advertising: advertising.length, functional: functional.length } },
      consent: { hasConsentMechanism, compliant: hasConsentMechanism || foundTrackers.length === 0 },
      riskLevel,
      recommendations,
    })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
