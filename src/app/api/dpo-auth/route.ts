import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateSecureToken } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

// DPO Authentication endpoint
// Password stored server-side in env var, never exposed to client
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    // Server-side only — NEVER use NEXT_PUBLIC_ prefix
    const dpoPassword = process.env.DPO_PASSWORD
    
    if (!dpoPassword) {
      console.error('DPO_PASSWORD env var not set!')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (password !== dpoPassword) {
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000))
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate a cryptographically secure session token
    const token = generateSecureToken('dpo_', 32)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h

    // Store token in Supabase
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await supabase.from('dpo_sessions').upsert({
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to persist DPO session:', e)
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      token,
      expiresAt
    })

  } catch (error) {
    console.error('DPO auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// Verify token
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-dpo-token') || 
                new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('dpo_sessions')
      .select('expires_at')
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    if (new Date(data.expires_at) > new Date()) {
      return NextResponse.json({ valid: true })
    }
  } catch (e) {
    // Fail closed — if anything goes wrong, deny access
    console.error('Token verification error:', e)
  }

  return NextResponse.json({ valid: false }, { status: 401 })
}
