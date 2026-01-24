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

    // Use Sonnet - it supports document type
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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
                text: `קרא את המסמך והחזר בפורמט הזה בדיוק:
TYPE: [סוג: מדיניות פרטיות / הסכם / תקנון / טופס / חוזה / אחר]
SUMMARY: [סיכום בשורה אחת בעברית]
PAGES: [מספר עמודים]
CONTENT: [תוכן עיקרי מקוצר עד 2000 תווים]`
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
    
    // Parse response
    const typeMatch = responseText.match(/TYPE:\s*(.+?)(?:\n|$)/)
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?:\n|$)/)
    const pagesMatch = responseText.match(/PAGES:\s*(\d+)/)
    const contentMatch = responseText.match(/CONTENT:\s*([\s\S]*)/)
    
    const docType = typeMatch ? typeMatch[1].trim() : 'מסמך'
    const summary = summaryMatch ? summaryMatch[1].trim() : ''
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 1
    const text = contentMatch ? contentMatch[1].trim() : responseText

    return NextResponse.json({
      success: true,
      text: text.substring(0, 8000),
      summary,
      docType,
      pages,
      truncated: text.length > 8000,
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
