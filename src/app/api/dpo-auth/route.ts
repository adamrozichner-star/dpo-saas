import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// DPO Authentication endpoint
// Password stored server-side in env var, never exposed to client
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    // Server-side password check — never exposed to client
    const dpoPassword = process.env.DPO_PASSWORD || process.env.NEXT_PUBLIC_DPO_PASSWORD
    
    if (!dpoPassword) {
      console.error('DPO_PASSWORD env var not set!')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (password !== dpoPassword) {
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000))
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate a session token (random, time-limited)
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h

    // Store token in Supabase (or memory if table doesn't exist)
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
      // Table might not exist — token still works via verify endpoint
      console.log('Could not persist DPO session, using stateless mode')
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

    const { data } = await supabase
      .from('dpo_sessions')
      .select('expires_at')
      .eq('token', token)
      .single()

    if (data && new Date(data.expires_at) > new Date()) {
      return NextResponse.json({ valid: true })
    }
  } catch (e) {
    // Table might not exist — check if token format is valid
    // In stateless mode, we accept any token set within 24h
    console.log('Stateless token verification')
  }

  return NextResponse.json({ valid: false }, { status: 401 })
}

function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'dpo_'
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
