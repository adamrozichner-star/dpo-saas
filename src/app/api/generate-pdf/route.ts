import { NextRequest, NextResponse } from 'next/server'

// Simple HTML to PDF using browser print
// This endpoint returns an HTML page that can be printed/saved as PDF

export async function POST(request: NextRequest) {
  try {
    const { title, content, orgName } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }
    
    const today = new Date().toLocaleDateString('he-IL')
    
    // Create a printable HTML document
    const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'מסמך'} - MyDPO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', Arial, sans-serif;
      line-height: 1.8;
      color: #1e293b;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 8px;
    }
    
    .doc-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .meta {
      font-size: 14px;
      color: #64748b;
    }
    
    .content {
      white-space: pre-wrap;
      font-size: 15px;
      line-height: 1.9;
    }
    
    .content h1, .content h2, .content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      color: #1e293b;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none !important;
      }
      
      .header {
        margin-bottom: 30px;
      }
    }
    
    .print-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 12px 24px;
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'Heebo', Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .print-btn:hover {
      background: #1e3a8a;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    הורד כ-PDF
  </button>
  
  <div class="header">
    <div class="logo">MyDPO</div>
    <h1 class="doc-title">${title || 'מסמך'}</h1>
    <div class="meta">
      ${orgName ? `<div>ארגון: ${orgName}</div>` : ''}
      <div>תאריך: ${today}</div>
    </div>
  </div>
  
  <div class="content">${escapeHtml(content)}</div>
  
  <div class="footer">
    <p>מסמך זה נוצר באמצעות MyDPO - מערכת ניהול פרטיות לעסקים</p>
    <p>© ${new Date().getFullYear()} MyDPO. כל הזכויות שמורות.</p>
  </div>
  
  <script>
    // Auto-trigger print dialog after a short delay
    // setTimeout(() => window.print(), 500);
  </script>
</body>
</html>
`
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
    
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}
