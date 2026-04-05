import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth'
import { maskPII, unmaskPII } from '@/lib/pii-guard'
import { checkRateLimit, RATE_LIMITS, rateLimitKey, isRapidFire } from '@/lib/rate-limiter'
import { validateInput, VALIDATION_CONFIGS } from '@/lib/input-validator'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

const SYSTEM_PROMPT = `אתה עוזר קצר וממוקד של MyDPO - שירות ממונה הגנת פרטיות לעסקים בישראל.

כללים:
1. ענה בעברית, קצר וברור (2-4 משפטים)
2. תן מידע מעשי וישים
3. אל תשתמש ב-Markdown (ללא ** או ##)
4. השתמש באימוג'ים במידה
5. הצע צעד הבא קונקרטי
6. אם לא בטוח - הצע לפנות לממונה

נושאים: תיקון 13, מאגרי מידע, ROPA, אירועי אבטחה, מדיניות פרטיות, הסכמות, DSAR.`

export async function POST(request: NextRequest) {
  try {
    // Auth: try full auth first, fall back to JWT-only for onboarding users without orgs
    let auth = await authenticateRequest(request, supabase)
    let userId = auth?.userId
    let orgId = auth?.orgId

    // If full auth fails, check if user has a valid JWT but no org yet (onboarding)
    if (!auth) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) {
          userId = user.id
          orgId = user.id // Use user.id as rate-limit key during onboarding
        }
      }
    }

    if (!userId) return unauthorizedResponse()

    const { message, context, contextHint, extraContext } = await request.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 })
    }

    // Rate limit (contextual = 10/min)
    const rl = checkRateLimit(rateLimitKey(orgId || userId, 'contextual'), RATE_LIMITS.contextual)
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'יותר מדי שאלות. נסה שוב בעוד דקה.' }), { status: 429 })
    }
    if (isRapidFire(orgId || userId)) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'לאט לאט!' }), { status: 429 })
    }

    // Validate
    const validation = validateInput(message, VALIDATION_CONFIGS.contextual)
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.reason, message: validation.reasonHe }), { status: 400 })
    }

    // PII mask
    const piiResult = maskPII(validation.sanitized)
    if (piiResult.detectedTypes.length > 0 && orgId && orgId !== userId) {
      // Fire-and-forget audit log (only if real org exists)
      Promise.resolve(supabase.from('audit_logs').insert({
        event_type: 'pii_detected',
        user_id: userId,
        org_id: orgId,
        details: { types: piiResult.detectedTypes, action: 'masked', source: 'contextual_chat', context },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      })).catch(() => {})
    }

    // Get org name for context (skip if no real org)
    let orgName = 'ארגון חדש'
    let orgIndustry = 'לא צוין'
    if (auth?.orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, industry')
        .eq('id', auth.orgId)
        .single()
      orgName = org?.name || orgName
      orgIndustry = org?.industry || orgIndustry
    }

    // Build context-aware prompt
    const systemPrompt = `${SYSTEM_PROMPT}

ארגון: ${orgName} (${orgIndustry})
${contextHint ? `\nהקשר: ${contextHint}` : ''}
${extraContext ? `\nמידע נוסף: ${extraContext}` : ''}`

    // Stream response (Haiku for speed)
    const stream = await anthropic.messages.stream({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: piiResult.masked }]
    })

    let fullText = ''
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              let chunk = event.delta.text
              fullText += chunk

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: chunk })}\n\n`))
            }
          }

          // Unmask PII in full response
          if (piiResult.map.size > 0) {
            fullText = unmaskPII(fullText, piiResult.map)
          }

          // Strip markdown
          fullText = fullText
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/^###?\s*/gm, '')
            .trim()

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'AI error' })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[CONTEXTUAL] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}
