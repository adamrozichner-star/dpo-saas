import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth"
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request)
    if (!auth) return unauthorizedResponse()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    const ip_address = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
    const user_agent = request.headers.get('user-agent') || 'unknown'

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        event_type: body.event_type,
        user_id: body.user_id,
        org_id: body.org_id,
        details: body.details || {},
        ip_address: ip_address.split(',')[0].trim(),
        user_agent,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Audit log error:', error)
      return NextResponse.json({ success: true, warning: 'Audit log failed' })
    }

    return NextResponse.json({ success: true, logId: data?.id })

  } catch (error: any) {
    console.error('Audit error:', error.message)
    return NextResponse.json({ success: true, warning: 'Audit log failed' })
  }
}

export async function GET(request: NextRequest) {
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request)
    if (!auth) return unauthorizedResponse()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    
    const orgId = searchParams.get('org_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: data })

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
