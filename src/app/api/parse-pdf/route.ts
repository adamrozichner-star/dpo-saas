import { NextRequest, NextResponse } from 'next/server'

// Simple PDF text extraction using pdf-parse
// Install: npm install pdf-parse

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    try {
      // Dynamic import of pdf-parse
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      
      // Extract text (limit to first 15000 chars for API limits)
      let text = data.text || ''
      const truncated = text.length > 15000
      if (truncated) {
        text = text.substring(0, 15000) + '\n\n[... המסמך קוצר - יותר מדי טקסט]'
      }

      return NextResponse.json({
        success: true,
        text: text.trim(),
        pages: data.numpages,
        truncated,
        fileName: file.name
      })
      
    } catch (parseError: any) {
      console.error('PDF parse error:', parseError)
      
      // If pdf-parse not installed, return helpful error
      if (parseError.code === 'MODULE_NOT_FOUND') {
        return NextResponse.json({
          success: false,
          error: 'PDF parsing not available',
          message: 'יש להתקין את ספריית pdf-parse: npm install pdf-parse'
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to parse PDF',
        message: 'לא הצלחתי לקרוא את ה-PDF. נסה להעתיק את הטקסט ידנית.'
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('PDF API error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      message: error.message 
    }, { status: 500 })
  }
}
