import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth"
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  generateAllDocuments, 
  calculateComplianceScore,
  generateComplianceChecklist,
  answersToDocumentVariables
} from '@/lib/document-generator'
import { DocumentVariables } from '@/lib/document-templates'
import { generateV3Documents } from '@/lib/v3-document-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log('Generate documents API called')
  
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request)
    if (!auth) return unauthorizedResponse()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    let { orgId, orgName, businessId, answers, v3Answers, singleDocType, wizardAnswers, wizardId } = await request.json()

    console.log('Generating docs for:', orgName, 'orgId:', orgId, singleDocType ? `(single: ${singleDocType})` : '(all)')
    console.log('Answers received:', answers?.length || 0)
    console.log('V3 answers:', v3Answers ? 'present' : 'missing')
    if (wizardAnswers) console.log('Wizard answers:', JSON.stringify(wizardAnswers))

    if (!orgId || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auto-fetch stored answers if not provided (e.g. from DocCreator)
    if ((!answers || answers.length === 0) || (!v3Answers || Object.keys(v3Answers).length === 0)) {
      const { data: storedProfile } = await supabase
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', orgId)
        .single()

      if (storedProfile?.profile_data) {
        if (!answers || answers.length === 0) {
          answers = storedProfile.profile_data.answers || []
          console.log('Loaded stored answers:', answers.length)
        }
        if (!v3Answers || Object.keys(v3Answers).length === 0) {
          v3Answers = storedProfile.profile_data.v3Answers || {}
          console.log('Loaded stored v3Answers:', Object.keys(v3Answers).length, 'keys')
        }
        if (!businessId) {
          businessId = storedProfile.profile_data.businessId || ''
        }
      }
    }

    // Get DPO details from database (fallback to config if not found)
    let dpoName = 'עו"ד דנה כהן'
    let dpoLicense = 'DPO-2025-001'
    let dpoEmail = 'dpo@mydpo.co.il'
    let dpoPhone = '03-555-1234'
    
    const { data: dpoData } = await supabase
      .from('dpos')
      .select('*')
      .limit(1)
      .single()
    
    if (dpoData) {
      dpoName = dpoData.name || dpoName
      dpoLicense = dpoData.license_number || dpoLicense
      dpoEmail = dpoData.email || dpoEmail
      dpoPhone = dpoData.phone || dpoPhone
    }

    // Generate document variables with DPO info from database
    const baseVariables = answersToDocumentVariables(answers || [], orgName, businessId || '')
    const variables: DocumentVariables = {
      ...baseVariables,
      dpoName,
      dpoEmail,
      dpoPhone,
      dpoLicense
    }

    // Generate all documents using our template system with DPO logic
    console.log('Generating documents with DPO logic templates...')
    const documents = generateAllDocuments(
      answers || [],
      orgName,
      businessId || '',
      variables // Pass the enhanced variables
    )
    console.log('Generated', documents.length, 'documents')

    // Generate v3 documents (ROPA, consent form, processor agreement) if v3Answers present
    let v3Docs: Array<{ title: string; content: string; type: string }> = []
    if (v3Answers && Object.keys(v3Answers).length > 0) {
      console.log('Generating v3 documents from onboarding data...')
      v3Docs = generateV3Documents({
        orgName,
        businessId: businessId || '',
        v3Answers,
        dpoName,
        dpoEmail,
        dpoPhone,
        dpoLicense
      })
      console.log('Generated', v3Docs.length, 'v3 documents:', v3Docs.map(d => d.type).join(', '))
    }

    // Merge all documents
    const allDocuments = [...documents, ...v3Docs]

    // ── SINGLE DOC MODE ──────────────────────────────
    // When singleDocType is specified, only save that one doc
    if (singleDocType) {
      let targetDoc: { type: string; title: string; content: string } | undefined

      // ── WIZARD-DRIVEN DPA ──
      // When wizard provides specific supplier data, generate a supplier-specific DPA
      if (wizardId === 'dpa' && wizardAnswers && singleDocType === 'processor_agreement') {
        const supplierName = wizardAnswers.supplierName || 'ספק'
        const supplierService = wizardAnswers.supplierService || ''
        const dataShared = Array.isArray(wizardAnswers.dataShared) ? wizardAnswers.dataShared : []
        const serverLocation = wizardAnswers.serverLocation || 'israel'
        const date = new Date().toLocaleDateString('he-IL')

        const dataLabels: Record<string, string> = {
          names: 'שמות ופרטי קשר', ids: 'מספרי ת.ז', financial: 'מידע פיננסי',
          health: 'מידע רפואי', behavioral: 'מידע התנהגותי', employee: 'מידע על עובדים'
        }
        const locationLabels: Record<string, string> = {
          israel: 'ישראל', eu: 'אירופה (EU)', us: 'ארה"ב', other: 'אחר'
        }
        const dataList = dataShared.map((d: string) => dataLabels[d] || d).join(', ')

        const content = `# הסכם עיבוד מידע (DPA)
## בין ${orgName} לבין ${supplierName}

**תאריך:** ${date}

---

## 1. הצדדים להסכם

| | פרטים |
|---|---|
| **מזמין (בעל המידע)** | ${orgName} |
| **ח.פ / ע.מ** | ${businessId || '—'} |
| **ממונה הגנת פרטיות** | ${dpoName} |
| **אימייל ממונה** | ${dpoEmail} |
| **מעבד (ספק)** | ${supplierName} |
| **סוג השירות** | ${supplierService} |
| **מיקום שרתים** | ${locationLabels[serverLocation] || serverLocation} |

---

## 2. סוגי המידע המועברים

${dataList || 'לא צוין'}

---

## 3. מטרת העיבוד

העיבוד מתבצע אך ורק לצורך מתן השירות "${supplierService}" כמפורט בהסכם השירות הראשי בין הצדדים.

## 4. חובות המעבד (${supplierName})

- **סודיות:** המעבד מתחייב לשמור על סודיות המידע ולהבטיח שכל עובדיו חתמו על הסכם סודיות
- **אבטחת מידע:** המעבד יישם אמצעי אבטחה מתאימים בהתאם לסוג המידע ורגישותו, לרבות הצפנה, גיבוי, ובקרת גישה
- **העברה הלאה:** המעבד לא יעביר את המידע לצד שלישי ללא אישור בכתב מראש מהמזמין
- **סיום ההתקשרות:** בסיום ההסכם, המעבד ימחק או ישיב את כל המידע האישי בתוך 30 יום
- **שיתוף פעולה:** המעבד ישתף פעולה עם בקשות זכויות נושאי מידע ועם בדיקות ציות
${serverLocation !== 'israel' ? `- **העברה בינלאומית:** בהתאם לתקנות הגנת הפרטיות (העברת מידע אל מאגרי מידע שמחוץ לגבולות המדינה), 2001` : ''}

## 5. חובות המזמין (${orgName})

- העברת מידע למעבד אך ורק בהתאם לבסיס חוקי מתאים
- יידוע נושאי המידע על השימוש במעבד, ככל שנדרש
- פיקוח על עמידת המעבד בתנאי הסכם זה

## 6. דיווח על אירוע אבטחה

המעבד ידווח למזמין על כל אירוע אבטחת מידע **תוך 24 שעות** מרגע הגילוי, בציון:
- תיאור האירוע
- סוגי המידע שנפגעו
- מספר נושאי המידע המושפעים
- הצעדים שננקטו לטיפול

## 7. תוקף ההסכם

הסכם זה ייכנס לתוקף ביום חתימתו ויישאר בתוקף כל עוד המעבד מעבד מידע אישי עבור המזמין.

---

**חתימת המזמין:** ________________  תאריך: ${date}

**חתימת המעבד:** ________________  תאריך: ________
`
        targetDoc = {
          type: 'processor_agreement',
          title: `הסכם עיבוד מידע — ${supplierName}`,
          content
        }
        console.log(`Generated wizard-driven DPA for supplier: ${supplierName}`)
      }

      // ── WIZARD-DRIVEN CAMERA OFFICER APPOINTMENT ──
      if (wizardId === 'camera_officer' && wizardAnswers && singleDocType === 'camera_appointment') {
        const officerName = wizardAnswers.officerName || ''
        const officerRole = wizardAnswers.officerRole || ''
        const cameraCount = wizardAnswers.cameraCount || ''
        const cameraLocations = wizardAnswers.cameraLocations || ''
        const date = new Date().toLocaleDateString('he-IL')

        targetDoc = {
          type: 'camera_appointment',
          title: `כתב מינוי אחראי מצלמות — ${officerName}`,
          content: `# כתב מינוי אחראי מצלמות אבטחה

**${orgName}**
${businessId ? `ח.פ / ע.מ: ${businessId}` : ''}

**תאריך:** ${date}

---

## 1. מינוי

הריני ממנה את **${officerName}**${officerRole ? `, ${officerRole}` : ''}, כאחראי/ת על מערכת המצלמות בארגון.

## 2. פרטי מערכת המצלמות

| פרט | ערך |
|---|---|
| **מספר מצלמות** | ${cameraCount || 'לא צוין'} |
| **מיקומים** | ${cameraLocations || 'לא צוין'} |
| **ממונה הגנת פרטיות** | ${dpoName} |

## 3. תחומי אחריות

האחראי/ת ידאג/תדאג ל:

- **תחזוקה שוטפת** — וידוא תקינות המצלמות ומערכת ההקלטה
- **בקרת גישה** — רק מורשים יוכלו לצפות בצילומים
- **שמירת הקלטות** — הקלטות יישמרו לתקופה שלא תעלה על 30 יום, אלא אם נדרש אחרת בחוק
- **מחיקת הקלטות** — הקלטות שחלף מועד שמירתן יימחקו באופן מאובטח
- **שילוט** — הצבת שילוט ברור במקומות בהם מותקנות מצלמות, בהתאם לחוק
- **טיפול בבקשות** — מענה לבקשות צפייה בצילומים מנושאי מידע, בתיאום עם הממונה על הגנת הפרטיות
- **דיווח** — דיווח מיידי לממונה על כל אירוע חריג הקשור למערכת המצלמות

## 4. הצהרה

אני, ${officerName}, מאשר/ת כי קראתי את כתב המינוי ומבין/ה את תחומי האחריות המפורטים לעיל.

---

**חתימת הממנה:** ________________  תאריך: ${date}

**חתימת הממונה:** ________________  תאריך: ________

---
*מסמך זה נוצר על ידי מערכת MyDPO בהתאם לדרישות חוק הגנת הפרטיות, סעיף 7.*
`
        }
        console.log(`Generated camera officer appointment for: ${officerName}`)
      }

      // ── WIZARD-DRIVEN CV RETENTION POLICY ──
      if (wizardId === 'cv_retention' && wizardAnswers && singleDocType === 'cv_retention_policy') {
        const storageLocation = wizardAnswers.storageLocation || 'other'
        const volume = wizardAnswers.volume || ''
        const currentPractice = wizardAnswers.currentPractice || ''
        const date = new Date().toLocaleDateString('he-IL')

        const storageLabels: Record<string, string> = {
          email: 'אימייל', drive: 'Google Drive / OneDrive', hr_system: 'מערכת HR', local: 'מחשב מקומי', other: 'אחר'
        }
        const volumeLabels: Record<string, string> = { '1-10': '1-10 בחודש', '10-50': '10-50 בחודש', '50+': 'מעל 50 בחודש' }
        const practiceLabels: Record<string, string> = { nothing: 'לא נמחקים', sometimes: 'נמחקים לפעמים', manual: 'מחיקה ידנית' }

        targetDoc = {
          type: 'cv_retention_policy',
          title: 'מדיניות שמירה ומחיקה של קורות חיים',
          content: `# מדיניות שמירה ומחיקה של קורות חיים

**${orgName}**
${businessId ? `ח.פ / ע.מ: ${businessId}` : ''}

**תאריך:** ${date} | **ממונה הגנת פרטיות:** ${dpoName}

---

## 1. מטרה

מדיניות זו מגדירה את הכללים לשמירה, ניהול ומחיקה של קורות חיים (קו"ח) המתקבלים בארגון, בהתאם לחוק הגנת הפרטיות ותקנות שמירת מידע.

## 2. מצב נוכחי

| פרט | ערך |
|---|---|
| **מיקום אחסון** | ${storageLabels[storageLocation] || storageLocation} |
| **היקף חודשי** | ${volumeLabels[volume] || 'לא צוין'} |
| **פרקטיקה נוכחית** | ${practiceLabels[currentPractice] || 'לא צוין'} |

## 3. כללי שמירה

### 3.1 תקופת שמירה
- **מועמדים שלא התקבלו:** קו"ח יישמרו **עד 3 חודשים** מתום הליך הגיוס
- **הארכה:** ניתן להאריך **עד שנתיים** בלבד, בתנאי שיש צורך מקצועי מתועד ושהתקבלה הסכמת המועמד/ת
- **מועמדים שהתקבלו:** קו"ח ישולבו בתיק העובד/ת ויהיו כפופים למדיניות שמירת מידע עובדים

### 3.2 תנאים להארכת שמירה
הארכה מעבר ל-3 חודשים תתאפשר רק אם:
1. קיים צורך מקצועי ספציפי ומתועד (לדוגמה: משרה צפויה)
2. המועמד/ת נתן/ה הסכמה מפורשת בכתב
3. ההארכה אושרה על ידי מנהל/ת HR

## 4. נוהל מחיקה

### 4.1 מחיקה שוטפת
- בכל **1 בחודש** יבוצע סריקה של קו"ח שחלפה תקופת שמירתם
- קו"ח שעבר מועד השמירה יימחקו **מכל מקורות האחסון**: ${storageLabels[storageLocation] || 'כל המערכות'}

### 4.2 אופן המחיקה
- מחיקה מלאה מהמערכת (לא העברה לסל מיחזור)
- ריקון סל מיחזור / פח אשפה
- תיעוד פעולת המחיקה (תאריך, כמות, מבצע/ת)

### 4.3 אחריות
- **אחראי ביצוע:** מנהל/ת HR או מי שהוסמך/ה לכך
- **אחראי פיקוח:** ממונה הגנת פרטיות (${dpoName})

## 5. תיעוד

יש לתעד בטבלה:

| תאריך מחיקה | מספר קו"ח שנמחקו | מקור | מבצע/ת | הערות |
|---|---|---|---|---|
| | | | | |

## 6. הפרות

אי-עמידה במדיניות זו עלולה לגרור:
- חשיפה רגולטורית מול הרשות להגנת הפרטיות
- קנס כספי בהתאם לתיקון 13

---
*מסמך זה נוצר על ידי מערכת MyDPO. עודכן לאחרונה: ${date}*
`
        }
        console.log('Generated CV retention policy')
      }

      // ── WIZARD-DRIVEN EMPLOYEE TRAINING ──
      if (wizardId === 'employee_training' && wizardAnswers && singleDocType === 'employee_training') {
        const employeeCount = wizardAnswers.employeeCount || ''
        const departments = wizardAnswers.departments || ''
        const lastTraining = wizardAnswers.lastTraining || 'never'
        const format = wizardAnswers.format || 'document'
        const date = new Date().toLocaleDateString('he-IL')

        const lastLabels: Record<string, string> = { never: 'מעולם לא נערכה', year_plus: 'לפני יותר משנה', this_year: 'השנה' }

        targetDoc = {
          type: 'employee_training',
          title: 'תכנית הדרכת פרטיות לעובדים',
          content: `# תכנית הדרכת פרטיות לעובדים

**${orgName}**
${businessId ? `ח.פ / ע.מ: ${businessId}` : ''}

**תאריך:** ${date} | **ממונה הגנת פרטיות:** ${dpoName}

---

## 1. רקע ומטרה

בהתאם לתקנות אבטחת מידע 2017 (סעיף 10), ארגון המחזיק מאגרי מידע חייב לקיים הדרכות תקופתיות לעובדים בנושא הגנת פרטיות ואבטחת מידע.

| פרט | ערך |
|---|---|
| **מספר עובדים** | ${employeeCount || 'לא צוין'} |
| **מחלקות עיקריות** | ${departments || 'לא צוין'} |
| **הדרכה אחרונה** | ${lastLabels[lastTraining] || 'לא ידוע'} |

## 2. נושאי ההדרכה

### 2.1 מבוא לפרטיות (15 דקות)
- מהו מידע אישי? דוגמאות רלוונטיות לארגון
- חוק הגנת הפרטיות — מה הוא דורש מאיתנו?
- תיקון 13 — מה חדש ומה ההשלכות

### 2.2 כללי עשה ואל תעשה (15 דקות)
- **אל תשתפו** מידע אישי עם מי שלא מורשה
- **אל תשלחו** מידע אישי במייל לא מוצפן
- **אל תאחסנו** קבצים עם מידע אישי בשולחן העבודה
- **כן תנעלו** מחשבים כשעוזבים את העמדה
- **כן תדווחו** מיידית על כל חשד לדליפת מידע
- **כן תמחקו** קבצים שאין בהם צורך

### 2.3 זיהוי ודיווח על אירועי אבטחה (10 דקות)
- מהו אירוע אבטחת מידע?
- דוגמאות: מייל שנשלח בטעות, מחשב שנגנב, גישה לא מורשית
- למי לדווח ותוך כמה זמן (מיידי → ${dpoName})
- חובת דיווח תוך 72 שעות לרשות

### 2.4 זכויות נושאי מידע (10 דקות)
- מה לעשות אם לקוח מבקש "למחוק את המידע שלי"?
- מה לעשות אם לקוח מבקש "לראות מה יש לכם עליי"?
- תהליך: הפנו ל-${dpoName} (${dpoEmail})

## 3. אישור השתתפות

כל עובד/ת שהשתתף/ה בהדרכה חייב/ת לחתום:

> אני, ____________, מאשר/ת כי השתתפתי בהדרכת פרטיות ואבטחת מידע בתאריך ________ ומבין/ה את חובותיי בנושא.
>
> חתימה: ____________ תאריך: ____________

## 4. תיעוד

| תאריך הדרכה | מספר משתתפים | מחלקה | מעביר/ת ההדרכה | הערות |
|---|---|---|---|---|
| | | | | |

## 5. תדירות

- **הדרכה שנתית** חובה לכל עובד/ת עם גישה למידע אישי
- **הדרכת כניסה** לכל עובד/ת חדש/ה — תוך שבועיים מתחילת העבודה
- **הדרכת רענון** בעקבות אירוע אבטחה או שינוי מדיניות

---
*מסמך זה נוצר על ידי מערכת MyDPO. עודכן לאחרונה: ${date}*
`
        }
        console.log(`Generated employee training program (${employeeCount} employees, ${departments})`)
      }

      // ── STANDARD SINGLE DOC ──
      if (!targetDoc) {
        targetDoc = allDocuments.find(d => d.type === singleDocType)
      }

      if (!targetDoc) {
        return NextResponse.json({ error: `Document type ${singleDocType} not found in templates` }, { status: 400 })
      }

      // Check if this type already exists (skip for wizard DPAs — each supplier gets its own)
      const isWizardDPA = wizardId === 'dpa' && singleDocType === 'processor_agreement'
      
      if (isWizardDPA) {
        // Always insert a new doc for each supplier
        await supabase
          .from('documents')
          .insert({
            org_id: orgId,
            type: targetDoc.type,
            title: targetDoc.title,
            content: targetDoc.content,
            version: 1,
            status: 'pending_review',
            generated_by: 'system',
          })
      } else {
        // Standard: check if exists, update or insert
        const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('org_id', orgId)
        .eq('type', singleDocType)
        .eq('generated_by', 'system')

      // If exists, update; otherwise insert
      if (existing && existing.length > 0) {
        await supabase
          .from('documents')
          .update({
            title: targetDoc.title,
            content: targetDoc.content,
            version: 2,
            status: singleDocType === 'dpo_appointment' ? 'pending_signature' : 'pending_review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
      } else {
        await supabase
          .from('documents')
          .insert({
            org_id: orgId,
            type: targetDoc.type,
            title: targetDoc.title,
            content: targetDoc.content,
            version: 1,
            status: singleDocType === 'dpo_appointment' ? 'pending_signature' : 'pending_review',
            generated_by: 'system',
          })
      }
      } // end else (non-wizard)

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          org_id: orgId,
          action: 'single_document_generated',
          details: { docType: singleDocType, title: targetDoc.title, ...(wizardAnswers ? { wizardAnswers } : {}) }
        })
      } catch {}

      // DPO queue
      try {
        await supabase.from('dpo_queue').insert({
          org_id: orgId,
          type: 'review',
          title: `מסמך חדש: ${targetDoc.title}`,
          status: 'pending',
          ai_summary: `הלקוח יצר מסמך ${targetDoc.title} — נדרשת סקירת הממונה.`
        })
      } catch {}

      return NextResponse.json({
        success: true,
        documents: [{ type: targetDoc.type, title: targetDoc.title }],
        message: `Document ${singleDocType} generated`
      })
    }
    // ── END SINGLE DOC MODE ──────────────────────────

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(answers || [])
    console.log('Compliance score:', complianceScore.score, 'Level:', complianceScore.level)

    // Generate checklist
    const checklist = generateComplianceChecklist(answers || [])
    console.log('Checklist items:', checklist.length)

    // Save documents to database
    console.log('Saving documents to database...')
    
    // Prevent duplicates — delete any existing docs for this org first
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id, type')
      .eq('org_id', orgId)
      .eq('generated_by', 'system')
    
    if (existingDocs && existingDocs.length > 0) {
      console.log(`Found ${existingDocs.length} existing system-generated docs — replacing`)
      await supabase
        .from('documents')
        .delete()
        .eq('org_id', orgId)
        .eq('generated_by', 'system')
    }

    const documentRecords = allDocuments.map(doc => ({
      org_id: orgId,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      version: 1,
      status: doc.type === 'dpo_appointment' ? 'pending_signature' : 'pending_review',
      generated_by: 'system'
    }))

    const { data: savedDocs, error: docsError } = await supabase
      .from('documents')
      .insert(documentRecords)
      .select()

    if (docsError) {
      console.error('Error saving documents:', docsError)
      return NextResponse.json({ error: 'Failed to save documents' }, { status: 500 })
    }

    console.log('Saved', savedDocs?.length, 'documents')

    // Create DPO queue item for document review (prevent duplicates)
    try {
      // Remove any existing pending review items for this org
      await supabase.from('dpo_queue')
        .delete()
        .eq('org_id', orgId)
        .eq('type', 'review')
        .eq('status', 'pending')
      
      await supabase.from('dpo_queue').insert({
        org_id: orgId,
        type: 'review',
        priority: 'medium',
        status: 'pending',
        title: `סקירת מסמכים — ארגון חדש (${savedDocs?.length || 0} מסמכים)`,
        description: `מסמכים שנוצרו אוטומטית דורשים אישור ממונה: ${allDocuments.map(d => d.title).join(', ')}`,
        ai_summary: `נוצרו ${savedDocs?.length || 0} מסמכים אוטומטית עבור ארגון חדש. יש לסקור ולאשר.`,
        ai_draft_response: 'מסמכים נסקרו ואושרו.'
      })
    } catch (e) {
      console.log('Could not create DPO review queue item:', e)
    }

    // Update organization with compliance score and status
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ 
        status: 'active',
        compliance_score: complianceScore.score,
        risk_level: complianceScore.level === 'high' ? 'standard' : 
                   complianceScore.level === 'medium' ? 'elevated' : 'high'
      })
      .eq('id', orgId)

    if (orgError) {
      console.error('Error updating organization:', orgError)
      // Don't fail the whole request for this
    }

    // Save compliance checklist to organization profile
    const { error: profileError } = await supabase
      .from('organization_profiles')
      .update({
        compliance_checklist: checklist,
        compliance_score: complianceScore.score,
        compliance_gaps: complianceScore.gaps
      })
      .eq('org_id', orgId)

    if (profileError) {
      console.log('Note: Could not update profile with checklist:', profileError.message)
      // Don't fail for this either
    }

    // Log the document generation in audit trail
    try {
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        action: 'documents_generated',
        details: {
          document_count: allDocuments.length,
          document_types: allDocuments.map(d => d.type),
          compliance_score: complianceScore.score,
          dpo_name: dpoName
        }
      })
    } catch (auditError) {
      console.log('Note: Could not create audit log')
    }

    console.log('Document generation complete!')
    
    return NextResponse.json({ 
      success: true, 
      documents: savedDocs,
      complianceScore: complianceScore,
      checklist: checklist
    })

  } catch (error: any) {
    console.error('Error generating documents:', error.message)
    return NextResponse.json({ error: 'Failed to generate documents' }, { status: 500 })
  }
}
