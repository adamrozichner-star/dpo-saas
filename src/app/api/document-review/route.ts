import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Privacy compliance review prompt
const REVIEW_SYSTEM_PROMPT = `אתה מומחה משפטי ישראלי בתחום הגנת הפרטיות ותיקון 13 לחוק הגנת הפרטיות.

תפקידך לסקור מסמכים ולזהות בעיות פרטיות פוטנציאליות.

בבדיקת המסמך, התמקד ב:
1. עמידה בדרישות תיקון 13 לחוק הגנת הפרטיות
2. הסכמות מפורשות לאיסוף ועיבוד מידע
3. זכויות נושאי המידע (גישה, תיקון, מחיקה)
4. אבטחת מידע והעברה לצדדים שלישיים
5. תקופות שמירת מידע
6. מינוי ממונה הגנת פרטיות (אם רלוונטי)

החזר תשובה בפורמט JSON בלבד (ללא markdown):
{
  "summary": "סיכום קצר של המסמך ומטרתו",
  "risk_score": 0-100 (0=תקין, 100=בעייתי מאוד),
  "issues": [
    {
      "severity": "high/medium/low",
      "issue": "תיאור הבעיה",
      "location": "איפה במסמך (אם ידוע)",
      "suggestion": "הצעה לתיקון"
    }
  ],
  "positive_points": ["נקודות חיוביות במסמך"],
  "recommendation": "המלצה כללית - האם לאשר, לתקן, או לדחות",
  "requires_dpo_review": true/false,
  "dpo_review_reason": "סיבה להמלצה על בדיקת DPO אנושי (אם רלוונטי)"
}`

async function callAnthropicAPI(content: string, reviewType: string) {
  // Hardcoded temporarily - move to env var later
  const apiKey = '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'
  
  console.log('Using hardcoded API key')
  
  if (!apiKey) {
    console.error('API key is empty')
    return null
  }

  const reviewPrompt = `סקור את המסמך הבא וזהה בעיות פרטיות:

סוג המסמך: ${reviewType}

תוכן המסמך:
${content.substring(0, 30000)}

${content.length > 30000 ? '... [המסמך קוצר]' : ''}`

  try {
    console.log('Calling Anthropic API...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: REVIEW_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: reviewPrompt }
        ]
      })
    })

    console.log('Anthropic response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const responseText = data.content?.[0]?.text || ''
    
    console.log('Got AI response, length:', responseText.length)
    
    // Parse JSON response
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return {
        summary: responseText.substring(0, 500),
        risk_score: 50,
        issues: [],
        recommendation: 'לא ניתן לנתח את התגובה',
        requires_dpo_review: true
      }
    }
  } catch (error: any) {
    console.error('Anthropic API call failed:', error.message)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const formData = await request.formData()
    
    const action = formData.get('action') as string
    const orgId = formData.get('orgId') as string
    const userId = formData.get('userId') as string

    // =========================================
    // Upload and AI Review
    // =========================================
    if (action === 'upload_and_review') {
      const file = formData.get('file') as File
      const reviewType = formData.get('reviewType') as string || 'other'
      const context = formData.get('context') as string || ''

      if (!file || !orgId) {
        return NextResponse.json({ error: 'Missing file or orgId' }, { status: 400 })
      }

      // Extract text from file
      let fileContent = ''
      const fileType = file.name.split('.').pop()?.toLowerCase()
      
      if (fileType === 'txt' || fileType === 'md') {
        fileContent = await file.text()
      } else if (fileType === 'pdf') {
        fileContent = '[PDF Document - תוכן מצורף כקובץ]'
      } else if (fileType === 'docx') {
        fileContent = '[Word Document - תוכן מצורף כקובץ]'
      } else {
        try {
          fileContent = await file.text()
        } catch {
          fileContent = '[לא ניתן לחלץ טקסט מהקובץ]'
        }
      }

      console.log('File uploaded:', file.name, 'Content length:', fileContent.length)

      // Upload file to Supabase Storage
      const fileName = `${orgId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('document-reviews')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        })

      let fileUrl = ''
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('document-reviews')
          .getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
      }

      // Create review record
      const { data: reviewRecord, error: recordError } = await supabase
        .from('document_reviews')
        .insert({
          org_id: orgId,
          user_id: userId,
          original_filename: file.name,
          original_file_url: fileUrl,
          original_file_type: fileType,
          original_content: fileContent.substring(0, 50000),
          review_type: reviewType,
          ai_review_status: 'pending',
          status: 'uploaded'
        })
        .select()
        .single()

      if (recordError) {
        console.error('Error creating review record:', recordError)
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
      }

      // Perform AI review
      let aiReview = null
      
      if (fileContent && fileContent.length > 10 && !fileContent.startsWith('[')) {
        console.log('Starting AI review for:', file.name)
        
        aiReview = await callAnthropicAPI(fileContent, reviewType)
        
        if (aiReview) {
          console.log('AI review completed successfully')
          await supabase
            .from('document_reviews')
            .update({
              ai_review_status: 'completed',
              ai_review_summary: aiReview.summary,
              ai_issues_found: aiReview.issues || [],
              ai_risk_score: aiReview.risk_score || 50,
              ai_reviewed_at: new Date().toISOString(),
              status: 'ai_reviewed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reviewRecord.id)
        } else {
          console.log('AI review failed')
          await supabase
            .from('document_reviews')
            .update({
              ai_review_status: 'failed',
              ai_review_summary: 'שגיאה בבדיקת AI - נסו שוב מאוחר יותר',
              status: 'ai_reviewed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reviewRecord.id)
        }
      } else {
        console.log('Cannot read file content')
        await supabase
          .from('document_reviews')
          .update({
            ai_review_status: 'failed',
            ai_review_summary: 'לא ניתן לקרוא את תוכן הקובץ - נסו להעלות קובץ טקסט',
            status: 'ai_reviewed',
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewRecord.id)
      }

      return NextResponse.json({
        success: true,
        reviewId: reviewRecord.id,
        aiReview
      })
    }

    // =========================================
    // Request DPO Review (paid)
    // =========================================
    if (action === 'request_dpo_review') {
      const reviewId = formData.get('reviewId') as string
      const urgency = formData.get('urgency') as string || 'normal'

      const { data: review } = await supabase
        .from('document_reviews')
        .select('*')
        .eq('id', reviewId)
        .single()

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      const { data: pricing } = await supabase
        .from('review_pricing')
        .select('*')
        .eq('review_type', review.review_type)
        .single()

      const basePrice = pricing?.base_price || 300
      const finalPrice = urgency === 'urgent' 
        ? basePrice * (pricing?.urgent_multiplier || 1.5)
        : basePrice

      await supabase
        .from('document_reviews')
        .update({
          dpo_review_requested: true,
          dpo_review_status: 'pending',
          dpo_review_price: finalPrice,
          urgency,
          status: 'dpo_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      return NextResponse.json({
        success: true,
        price: finalPrice,
        message: 'DPO review requested'
      })
    }

    // =========================================
    // Get Reviews List
    // =========================================
    if (action === 'list_reviews') {
      const { data: reviews, error } = await supabase
        .from('document_reviews')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
      }

      return NextResponse.json({ reviews })
    }

    // =========================================
    // Get Single Review
    // =========================================
    if (action === 'get_review') {
      const reviewId = formData.get('reviewId') as string

      const { data: review, error } = await supabase
        .from('document_reviews')
        .select('*')
        .eq('id', reviewId)
        .single()

      if (error || !review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      return NextResponse.json({ review })
    }

    // =========================================
    // Get Pricing
    // =========================================
    if (action === 'get_pricing') {
      const { data: pricing } = await supabase
        .from('review_pricing')
        .select('*')
        .eq('is_active', true)
        .order('base_price', { ascending: true })

      return NextResponse.json({ pricing: pricing || [] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Document review error:', error.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    const { data: reviews, error } = await supabase
      .from('document_reviews')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
