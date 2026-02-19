import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth"
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

החזר תשובה בפורמט JSON תקין בלבד. אל תוסיף טקסט לפני או אחרי ה-JSON. אל תשתמש ב-markdown.

הפורמט הנדרש:
{"summary": "סיכום המסמך", "risk_score": 50, "issues": [{"severity": "high", "issue": "תיאור", "location": "מיקום", "suggestion": "הצעה"}], "positive_points": ["נקודה חיובית"], "recommendation": "המלצה", "requires_dpo_review": false, "dpo_review_reason": ""}`

async function callAnthropicAPI(content: string, reviewType: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  console.log('Using API key from environment:', apiKey ? 'Found' : 'NOT FOUND')
  
  if (!apiKey) {
    console.error('API key is empty')
    return null
  }

  const reviewPrompt = `סקור את המסמך הבא וזהה בעיות פרטיות. החזר JSON תקין בלבד.

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
        model: 'claude-3-haiku-20240307',
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
    console.log('Raw response preview:', responseText.substring(0, 500))
    
    // Parse JSON response with robust error handling
    try {
      let cleanedResponse = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/\/\/.*$/gm, '')  // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .trim()
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
      }
      
      const parsed = JSON.parse(cleanedResponse)
      console.log('Parsed successfully, keys:', Object.keys(parsed))
      console.log('Issues count:', parsed.issues?.length || 0)
      return parsed
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.log('Raw response that failed to parse:', responseText.substring(0, 1000))
      
      // Fallback: Extract fields manually using regex
      let summary = ''
      let riskScore = 50
      const issues: Array<{severity: string; issue: string; suggestion: string}> = []
      
      // Extract summary
      const summaryMatch = responseText.match(/"summary"\s*:\s*"([^"]+)"/)
      if (summaryMatch) summary = summaryMatch[1]
      
      // Extract risk score
      const scoreMatch = responseText.match(/"risk_score"\s*:\s*(\d+)/)
      if (scoreMatch) riskScore = parseInt(scoreMatch[1], 10)
      
      // Try to extract individual issues using exec loop
      const issueRegex = /"issue"\s*:\s*"([^"]+)"/g
      const severityRegex = /"severity"\s*:\s*"([^"]+)"/g
      const suggestionRegex = /"suggestion"\s*:\s*"([^"]+)"/g
      
      const issueTexts: string[] = []
      const severities: string[] = []
      const suggestions: string[] = []
      
      let match
      while ((match = issueRegex.exec(responseText)) !== null) {
        issueTexts.push(match[1])
      }
      while ((match = severityRegex.exec(responseText)) !== null) {
        severities.push(match[1])
      }
      while ((match = suggestionRegex.exec(responseText)) !== null) {
        suggestions.push(match[1])
      }
      
      for (let i = 0; i < issueTexts.length; i++) {
        issues.push({
          severity: severities[i] || 'medium',
          issue: issueTexts[i],
          suggestion: suggestions[i] || ''
        })
      }
      
      console.log('Fallback extraction - Summary:', summary.substring(0, 100))
      console.log('Fallback extraction - Issues found:', issues.length)
      
      return {
        summary: summary || 'לא ניתן לנתח את המסמך',
        risk_score: riskScore,
        issues: issues,
        positive_points: [],
        recommendation: 'מומלץ לבקש בדיקת DPO',
        requires_dpo_review: true,
        dpo_review_reason: 'שגיאה בניתוח אוטומטי'
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Anthropic API call failed:', errorMessage)
    return null
  }
}

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
          console.log('Summary:', aiReview.summary)
          console.log('Issues:', JSON.stringify(aiReview.issues))
          console.log('Risk score:', aiReview.risk_score)
          
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Document review error:', errorMessage)
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
