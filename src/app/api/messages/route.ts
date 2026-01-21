import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET - Fetch threads and messages
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const threadId = searchParams.get('threadId')

    if (threadId) {
      // Fetch specific thread with messages
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .select('*')
        .eq('id', threadId)
        .single()

      if (threadError) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }

      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      return NextResponse.json({ thread, messages: messages || [] })
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    // Fetch all threads for organization
    const { data: threads, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        messages (
          id,
          content,
          sender_type,
          sender_name,
          created_at,
          read_at
        )
      `)
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Calculate unread count for each thread
    const threadsWithUnread = threads?.map(thread => ({
      ...thread,
      unreadCount: thread.messages?.filter((m: any) => 
        m.sender_type === 'dpo' && !m.read_at
      ).length || 0,
      lastMessage: thread.messages?.[thread.messages.length - 1] || null
    }))

    return NextResponse.json({ threads: threadsWithUnread || [] })

  } catch (error: unknown) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create thread or send message
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { action, orgId, threadId, subject, content, senderType, senderName, senderId, priority } = body

    // =========================================
    // Create Escalation from Q&A
    // =========================================
    if (action === 'create_escalation') {
      const { originalQuestion, aiAnswer, additionalMessage, qaId } = body
      
      if (!orgId || !originalQuestion) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Create escalation thread
      const escalationSubject = `פנייה לממונה: ${originalQuestion.substring(0, 50)}${originalQuestion.length > 50 ? '...' : ''}`
      
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          org_id: orgId,
          subject: escalationSubject,
          priority: 'high',
          status: 'open',
          thread_type: 'escalation',
          metadata: {
            source: 'qa_escalation',
            qa_id: qaId,
            original_question: originalQuestion,
            ai_answer: aiAnswer
          }
        })
        .select()
        .single()

      if (threadError) {
        console.error('Escalation thread creation error:', threadError)
        return NextResponse.json({ error: 'Failed to create escalation' }, { status: 500 })
      }

      // Create formatted message content
      const messageContent = `📋 **פנייה מהמערכת האוטומטית**

**השאלה המקורית:**
${originalQuestion}

**תשובת הבוט:**
${aiAnswer}

${additionalMessage ? `**הערות נוספות מהלקוח:**
${additionalMessage}` : ''}

---
*הלקוח ביקש תשובה אנושית לשאלה זו*`

      // Create first message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          thread_id: thread.id,
          sender_type: 'system',
          sender_name: 'מערכת DPO-Pro',
          content: messageContent
        })
        .select()
        .single()

      if (msgError) {
        console.error('Escalation message creation error:', msgError)
      }

      // Mark original Q&A as escalated
      if (qaId) {
        await supabase
          .from('qa_interactions')
          .update({ 
            escalated: true,
            escalation_thread_id: thread.id 
          })
          .eq('id', qaId)
      }

      // Create notification for DPO
      await supabase.from('notifications').insert({
        org_id: orgId,
        type: 'escalation',
        title: '⚠️ פנייה דחופה מלקוח',
        body: `לקוח ביקש תשובה אנושית: ${originalQuestion.substring(0, 100)}`,
        link: `/dpo/messages/${thread.id}`,
        priority: 'high'
      })

      // Also create escalation record
      await supabase.from('escalations').insert({
        org_id: orgId,
        thread_id: thread.id,
        qa_id: qaId,
        reason: 'customer_request',
        original_question: originalQuestion,
        ai_answer: aiAnswer,
        customer_notes: additionalMessage,
        status: 'pending'
      }).catch(err => {
        // Escalations table might not exist, that's ok
        console.log('Note: Could not create escalation record:', err.message)
      })

      // Trigger auto-analysis for the newly created queue item
      // The database trigger creates the dpo_queue item, so we find it and analyze
      setTimeout(async () => {
        try {
          const { data: queueItem } = await supabase
            .from('dpo_queue')
            .select('id')
            .eq('related_thread_id', thread.id)
            .single()
          
          if (queueItem) {
            // Fire and forget - call the DPO API to analyze
            fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/dpo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'ai_analyze', itemId: queueItem.id })
            }).catch(err => console.log('Auto-analyze trigger failed:', err))
          }
        } catch (e) {
          console.log('Could not trigger auto-analysis:', e)
        }
      }, 1000) // Give the trigger time to create the queue item

      return NextResponse.json({ 
        success: true, 
        thread, 
        message,
        escalationId: thread.id 
      })
    }

    // =========================================
    // Create Thread
    // =========================================
    if (action === 'create_thread') {
      // Create new thread
      if (!orgId || !subject || !content) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          org_id: orgId,
          subject,
          priority: priority || 'normal',
          status: 'open'
        })
        .select()
        .single()

      if (threadError) {
        console.error('Thread creation error:', threadError)
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
      }

      // Create first message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          thread_id: thread.id,
          sender_type: senderType || 'user',
          sender_id: senderId,
          sender_name: senderName || 'משתמש',
          content
        })
        .select()
        .single()

      if (msgError) {
        console.error('Message creation error:', msgError)
      }

      // Create notification for DPO
      await supabase.from('notifications').insert({
        org_id: orgId,
        type: 'message',
        title: 'פנייה חדשה',
        body: subject,
        link: `/dpo/messages/${thread.id}`
      })

      return NextResponse.json({ thread, message })

    } else if (action === 'send_message') {
      // Send message to existing thread
      if (!threadId || !content) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_type: senderType || 'user',
          sender_id: senderId,
          sender_name: senderName || 'משתמש',
          content
        })
        .select()
        .single()

      if (error) {
        console.error('Message send error:', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
      }

      // Update thread last_message_at
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)

      // Get thread to find org
      const { data: thread } = await supabase
        .from('message_threads')
        .select('org_id, subject')
        .eq('id', threadId)
        .single()

      // Create notification
      if (thread) {
        const notifTitle = senderType === 'dpo' ? 'תגובה מהממונה' : 'הודעה חדשה'
        
        await supabase.from('notifications').insert({
          org_id: thread.org_id,
          type: 'message',
          title: notifTitle,
          body: thread.subject,
          link: `/messages/${threadId}`
        })
      }

      return NextResponse.json({ message })

    } else if (action === 'mark_read') {
      // Mark messages as read
      if (!threadId) {
        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
      }

      const readerType = senderType || 'user'
      const oppositeType = readerType === 'user' ? 'dpo' : 'user'

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('sender_type', oppositeType)
        .is('read_at', null)

      return NextResponse.json({ success: true })

    } else if (action === 'close_thread') {
      // Close thread
      if (!threadId) {
        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
      }

      await supabase
        .from('message_threads')
        .update({ status: 'closed' })
        .eq('id', threadId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: unknown) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
