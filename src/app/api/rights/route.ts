import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDataSubjectRequestNotification } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Email template for requester confirmation
async function sendRequesterConfirmationEmail(
  email: string,
  data: {
    requestNumber: string
    requestType: string
    fullName: string
    orgName: string
    deadline: string
  }
) {
  const typeLabels: Record<string, string> = {
    access: 'עיון במידע',
    rectification: 'תיקון מידע',
    erasure: 'מחיקת מידע',
    objection: 'התנגדות לעיבוד'
  }

  try {
    // Using Resend directly
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'MyDPO <noreply@mydpo.co.il>',
        to: email,
        subject: `אישור קבלת בקשה - ${data.requestNumber}`,
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #059669; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ הבקשה התקבלה</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #047857; margin-top: 0;">שלום ${data.fullName},</h2>
    <p>בקשתך למימוש זכויות פרטיות התקבלה בהצלחה.</p>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p><strong>מספר בקשה:</strong> ${data.requestNumber}</p>
      <p><strong>סוג בקשה:</strong> ${typeLabels[data.requestType] || data.requestType}</p>
      <p><strong>ארגון:</strong> ${data.orgName}</p>
      <p><strong>צפי למענה:</strong> עד ${data.deadline}</p>
    </div>

    <p>נציג הארגון יטפל בבקשתך ויחזור אליך בהקדם, ולא יאוחר מ-30 יום כנדרש בחוק.</p>
    
    <p style="color: #6b7280; font-size: 14px;">
      שמרו את מספר הבקשה למעקב עתידי.
    </p>
  </div>
  <div style="background: #1e293b; color: #94a3b8; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">MyDPO - מערכת ניהול פרטיות</p>
  </div>
</body>
</html>`,
        text: `שלום ${data.fullName},\n\nבקשתך התקבלה בהצלחה.\n\nמספר בקשה: ${data.requestNumber}\nסוג: ${typeLabels[data.requestType]}\nארגון: ${data.orgName}\nצפי למענה: עד ${data.deadline}\n\nנציג הארגון יטפל בבקשתך בהקדם.`
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend error:', errorData)
      return { success: false, error: errorData }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// Email to organization admin about new request
async function sendOrgNotificationEmail(
  adminEmail: string,
  data: {
    requestNumber: string
    requestType: string
    requesterName: string
    requesterEmail: string
    deadline: string
    orgName: string
  }
) {
  const typeLabels: Record<string, string> = {
    access: 'עיון במידע',
    rectification: 'תיקון מידע',
    erasure: 'מחיקת מידע',
    objection: 'התנגדות לעיבוד'
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'MyDPO <noreply@mydpo.co.il>',
        to: adminEmail,
        subject: `⚠️ בקשת נושא מידע חדשה - ${data.requestNumber}`,
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #F59E0B; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ בקשת נושא מידע חדשה</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #b45309; margin-top: 0;">התקבלה בקשה חדשה!</h2>
    <p>התקבלה בקשת נושא מידע שדורשת את תשומת לבך:</p>
    
    <div style="background: white; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p><strong>מספר בקשה:</strong> ${data.requestNumber}</p>
      <p><strong>סוג:</strong> ${typeLabels[data.requestType] || data.requestType}</p>
      <p><strong>שם המבקש:</strong> ${data.requesterName}</p>
      <p><strong>אימייל:</strong> ${data.requesterEmail}</p>
      <p style="color: #dc2626;"><strong>מועד אחרון למענה:</strong> ${data.deadline}</p>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;">
        ⏰ <strong>חשוב:</strong> יש להשיב לבקשה תוך 30 יום על פי חוק הגנת הפרטיות.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-saas.vercel.app'}/dashboard?tab=requests" 
         style="background: #F59E0B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        טיפול בבקשה ←
      </a>
    </div>
  </div>
  <div style="background: #1e293b; color: #94a3b8; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">MyDPO - מערכת ניהול פרטיות</p>
  </div>
</body>
</html>`,
        text: `בקשת נושא מידע חדשה!\n\nמספר: ${data.requestNumber}\nסוג: ${typeLabels[data.requestType]}\nמבקש: ${data.requesterName}\nאימייל: ${data.requesterEmail}\nמועד אחרון: ${data.deadline}\n\nיש להשיב תוך 30 יום.`
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend error:', errorData)
      return { success: false, error: errorData }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

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

    // Verify organization exists and get admin email
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get organization admin user email
    const { data: orgUser } = await supabase
      .from('users')
      .select('email')
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .single()

    // Generate request number
    const requestNumber = `DSR-${Date.now().toString(36).toUpperCase()}`

    // Calculate deadline (30 days from now)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    const deadlineStr = deadline.toLocaleDateString('he-IL')

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
📅 מועד אחרון למענה: ${deadlineStr}

${details ? `פרטים נוספים:\n${details}` : ''}

⚠️ יש להשיב לבקשה תוך 30 יום על פי חוק.`
          })
      }
    } catch (notifyError) {
      console.error('Error creating notification:', notifyError)
    }

    // Send confirmation email to requester
    if (process.env.RESEND_API_KEY) {
      console.log('Sending confirmation email to requester:', email)
      const requesterEmailResult = await sendRequesterConfirmationEmail(email, {
        requestNumber,
        requestType,
        fullName,
        orgName: org.name,
        deadline: deadlineStr
      })
      console.log('Requester email result:', requesterEmailResult)

      // Send notification email to organization admin
      if (orgUser?.email) {
        console.log('Sending notification email to org admin:', orgUser.email)
        const orgEmailResult = await sendOrgNotificationEmail(orgUser.email, {
          requestNumber,
          requestType,
          requesterName: fullName,
          requesterEmail: email,
          deadline: deadlineStr,
          orgName: org.name
        })
        console.log('Org admin email result:', orgEmailResult)
      }
    } else {
      console.warn('RESEND_API_KEY not configured - skipping emails')
    }

    return NextResponse.json({ 
      success: true, 
      requestNumber,
      message: 'Request submitted successfully'
    })
  }

  // Update request status (authenticated)
  if (action === 'update_request') {
    const { requestId, status, response, respondedBy } = body

    // Get request details for email
    const { data: requestData } = await supabase
      .from('data_subject_requests')
      .select('*, organizations(name)')
      .eq('id', requestId)
      .single()

    const updateData: Record<string, unknown> = {
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

    // Send email to requester when request is completed or rejected
    if (requestData && (status === 'completed' || status === 'rejected') && process.env.RESEND_API_KEY) {
      const statusLabels: Record<string, string> = {
        completed: 'הושלמה',
        rejected: 'נדחתה'
      }

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || 'MyDPO <noreply@mydpo.co.il>',
            to: requestData.requester_email,
            subject: `עדכון לבקשה ${requestData.request_number} - ${statusLabels[status]}`,
            html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${status === 'completed' ? '#059669' : '#dc2626'}; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${status === 'completed' ? '✅ הבקשה טופלה' : '❌ הבקשה נדחתה'}</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="margin-top: 0;">שלום ${requestData.requester_name},</h2>
    <p>בקשתך מספר <strong>${requestData.request_number}</strong> ${statusLabels[status]}.</p>
    
    ${response ? `
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0;">תשובת הארגון:</h3>
      <p style="white-space: pre-wrap;">${response}</p>
    </div>
    ` : ''}
    
    <p style="color: #6b7280; font-size: 14px;">
      אם יש לך שאלות נוספות, ניתן לפנות לארגון ישירות.
    </p>
  </div>
</body>
</html>`,
            text: `שלום ${requestData.requester_name},\n\nבקשתך ${requestData.request_number} ${statusLabels[status]}.\n\n${response ? `תשובה:\n${response}` : ''}`
          })
        })
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
