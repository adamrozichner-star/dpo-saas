import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth"
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return unauthorizedResponse()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey || !anthropicKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const formData = await request.formData()
    
    const file = formData.get('file') as File | null
    const orgId = formData.get('orgId') as string
    const orgName = formData.get('orgName') as string
    const docType = formData.get('docType') as string || 'custom'

    if (!file || !orgId) {
      return NextResponse.json({ error: 'Missing file or orgId' }, { status: 400 })
    }

    // Read file content
    const fileText = await file.text()
    
    if (fileText.length < 50) {
      return NextResponse.json({ error: 'File too short or unreadable' }, { status: 400 })
    }

    if (fileText.length > 100000) {
      return NextResponse.json({ error: 'File too large (max 100KB text)' }, { status: 400 })
    }

    // Get org profile for context
    const { data: profile } = await supabase
      .from('organization_profiles')
      .select('profile_data')
      .eq('org_id', orgId)
      .single()

    const answers = profile?.profile_data?.answers || []
    const contextLines = answers.map((a: any) => `${a.questionId}: ${Array.isArray(a.value) ? a.value.join(', ') : a.value}`).join('\n')

    // Call Claude to adapt document
    const client = new Anthropic({ apiKey: anthropicKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `אתה מומחה לתיקון 13 לחוק הגנת הפרטיות בישראל.

הלקוח העלה מסמך קיים שברצונו להתאים לדרישות תיקון 13. 

פרטי הארגון:
שם: ${orgName || 'לא צוין'}
${contextLines}

המסמך המקורי:
---
${fileText.slice(0, 50000)}
---

בבקשה:
1. נתח את המסמך וזהה מה חסר בהתאם לתיקון 13
2. צור גרסה מעודכנת ומלאה של המסמך שעומדת בדרישות תיקון 13
3. סמן בסוגריים מרובעים [נוסף] כל סעיף חדש שהוספת
4. כתוב בעברית, בשפה משפטית ברורה

החזר רק את המסמך המעודכן, ללא הקדמות או הסברים.`
      }]
    })

    const adaptedContent = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n')

    // Save as new document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        org_id: orgId,
        type: docType,
        title: `${file.name} — מותאם לתיקון 13`,
        content: adaptedContent,
        status: 'pending_review',
        generated_by: 'upload_adapt',
        version: 1
      })
      .select()
      .single()

    if (docError) {
      console.error('Doc save error:', docError)
      return NextResponse.json({ error: 'Failed to save adapted document' }, { status: 500 })
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        event_type: 'document_uploaded_adapted',
        org_id: orgId,
        details: { 
          original_filename: file.name,
          original_size: fileText.length,
          adapted_size: adaptedContent.length,
          doc_id: doc.id
        }
      })
    } catch {}

    // Queue for DPO review
    try {
      await supabase.from('dpo_queue').insert({
        org_id: orgId,
        type: 'review',
        title: `מסמך הועלה והותאם — ${file.name}`,
        status: 'pending',
        ai_summary: `הלקוח העלה מסמך קיים (${file.name}) והמערכת התאימה אותו לדרישות תיקון 13. נדרשת סקירת הממונה.`
      })
    } catch {}

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        content_preview: adaptedContent.slice(0, 200)
      }
    })

  } catch (error: any) {
    console.error('Upload-doc error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 })
  }
}
