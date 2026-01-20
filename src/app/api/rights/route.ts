import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const orgId = searchParams.get('orgId')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get organization info for public form
  if (action === 'get_org' && orgId) {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({ organization: org })
  }

  // Get requests for organization (authenticated)
  if (action === 'get_requests' && orgId) {
    const { data: requests, error } = await supabase
      .from('data_subject_requests')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const body = await request.json()
  const { action } = body

  // Submit new request (public)
  if (action === 'submit_request') {
    const { orgId, requestType, fullName, idNumber, email, phone, details } = body

    // Validate required fields
    if (!orgId || !requestType || !fullName || !idNumber || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify organization exists
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Generate request number
    const requestNumber = `DSR-${Date.now().toString(36).toUpperCase()}`

    // Calculate deadline (30 days from now)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)

    // Insert request
    const { data: newRequest, error } = await supabase
      .from('data_subject_requests')
      .insert({
        org_id: orgId,
        request_number: requestNumber,
        request_type: requestType,
        status: 'pending',
        requester_name: fullName,
        requester_id: idNumber,
        requester_email: email,
        requester_phone: phone || null,
        details: details || null,
        deadline: deadline.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating request:', error)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    // Create notification for organization (message thread)
    try {
      const requestTypeLabels: Record<string, string> = {
        access: 'עיון במידע',
        rectification: 'תיקון מידע',
        erasure: 'מחיקת מידע',
        objection: 'התנגדות לעיבוד'
      }

      const { data: thread } = await supabase
        .from('message_threads')
        .insert({
          org_id: orgId,
          subject: `בקשת ${requestTypeLabels[requestType]} - ${requestNumber}`,
          status: 'open',
          priority: 'high'
        })
        .select()
        .single()

      if (thread) {
        await supabase
          .from('messages')
          .insert({
            thread_id: thread.id,
            sender_type: 'system',
            sender_name: 'מערכת',
            content: `התקבלה בקשה חדשה למימוש זכויות פרטיות:

📋 מספר בקשה: ${requestNumber}
📝 סוג: ${requestTypeLabels[requestType]}
👤 מגיש הבקשה: ${fullName}
📧 אימייל: ${email}
📅 מועד אחרון למענה: ${deadline.toLocaleDateString('he-IL')}

${details ? `פרטים נוספים:\n${details}` : ''}

⚠️ יש להשיב לבקשה תוך 30 יום על פי חוק.`
          })
      }
    } catch (notifyError) {
      console.error('Error creating notification:', notifyError)
      // Don't fail the request if notification fails
    }

    // TODO: Send email to requester with confirmation
    // TODO: Send email to organization admin

    return NextResponse.json({ 
      success: true, 
      requestNumber,
      message: 'Request submitted successfully'
    })
  }

  // Update request status (authenticated)
  if (action === 'update_request') {
    const { requestId, status, response, respondedBy } = body

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (response) {
      updateData.response = response
      updateData.responded_at = new Date().toISOString()
      updateData.responded_by = respondedBy || null
    }

    const { error } = await supabase
      .from('data_subject_requests')
      .update(updateData)
      .eq('id', requestId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
