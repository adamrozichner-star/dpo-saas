import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64
                }
              },
              {
                type: 'text',
                text: `קרא את המסמך הזה והחזר את התוכן שלו.
ענה בפורמט הבא בלבד:
---CONTENT_START---
[התוכן המלא של המסמך כאן]
---CONTENT_END---
---PAGES---
[מספר העמודים המשוער]
---TYPE---
[סוג המסמך: מדיניות פרטיות / הסכם / תקנון / טופס / אחר]`
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Anthropic API error:', errorData)
      throw new Error(errorData.error?.message || 'API request failed')
    }

    const data = await response.json()
    const responseText = data.content?.[0]?.text || ''
    
    const contentMatch = responseText.match(/---CONTENT_START---([\s\S]*?)---CONTENT_END---/)
    const pagesMatch = responseText.match(/---PAGES---\s*(\d+)/)
    const typeMatch = responseText.match(/---TYPE---\s*(.+)/)
    
    const text = contentMatch ? contentMatch[1].trim() : responseText
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 1
    const docType = typeMatch ? typeMatch[1].trim() : 'מסמך'

    return NextResponse.json({
      success: true,
      text: text.substring(0, 15000),
      pages,
      docType,
      truncated: text.length > 15000,
      fileName: file.name
    })
    
  } catch (error: any) {
    console.error('PDF API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Server error', 
      message: error.message || 'לא הצלחתי לקרוא את ה-PDF'
    }, { status: 500 })
  }
}
