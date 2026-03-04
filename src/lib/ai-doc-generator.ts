import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export interface OrgContext {
  orgName: string
  businessId?: string
  industry?: string
  dpoName: string
  dpoEmail: string
  dpoPhone?: string
  dpoLicense?: string
  databases?: string[]
  dbDetails?: Record<string, any>
  processors?: string[]
  customProcessors?: string[]
  storage?: string[]
  accessControl?: string
  securityOwner?: string
  securityOwnerName?: string
  hasConsent?: boolean
  customDatabases?: string[]
  v3Answers?: Record<string, any>
  wizardAnswers?: Record<string, any>
}

const SYSTEM_PROMPT = `אתה עורך דין ישראלי מומחה בהגנת פרטיות ואבטחת מידע.
אתה כותב מסמכים משפטיים מקצועיים בעברית עבור עסקים ישראליים.

כללים:
- כתוב בעברית תקנית, ברורה ומקצועית
- הפנה לסעיפים ספציפיים בחוק הגנת הפרטיות, תיקון 13, ותקנות אבטחת מידע 2017
- התאם את המסמך לגודל, תחום ומורכבות הארגון
- השתמש בפורמט Markdown עם כותרות, טבלאות ורשימות
- כלול שדות חתימה ותאריך כשרלוונטי
- אל תמציא מידע — אם חסר מידע, כתוב "לא צוין" או השמט את הסעיף
- המסמך חייב להיות שלם, מוכן לשימוש, ולא טיוטה חלקית`

const INDUSTRY_LABELS: Record<string, string> = {
  tech: 'טכנולוגיה', health: 'בריאות ורפואה', finance: 'פיננסים וביטוח',
  education: 'חינוך', legal: 'משפטים', retail: 'קמעונאות ומסחר',
  realestate: 'נדל"ן', hr: 'משאבי אנוש וגיוס', marketing: 'שיווק ופרסום',
  nonprofit: 'עמותות ומלכ"רים', government: 'ממשלה ורשויות', other: 'אחר'
}

const DB_LABELS: Record<string, string> = {
  customers: 'לקוחות', employees: 'עובדים', suppliers: 'ספקים', leads: 'לידים/מתעניינים',
  patients: 'מטופלים', students: 'תלמידים/סטודנטים', members: 'חברי מועדון',
  website: 'משתמשי אתר/אפליקציה', cameras: 'מצלמות אבטחה', cvs: 'קורות חיים',
}

function buildOrgSummary(ctx: OrgContext): string {
  const v3 = ctx.v3Answers || {}
  const lines: string[] = []
  
  lines.push(`שם הארגון: ${ctx.orgName}`)
  if (ctx.businessId) lines.push(`ח.פ / ע.מ: ${ctx.businessId}`)
  if (ctx.industry || v3.industry) lines.push(`תחום: ${INDUSTRY_LABELS[v3.industry || ctx.industry || ''] || v3.industry || ctx.industry || 'לא צוין'}`)
  lines.push(`ממונה הגנת פרטיות: ${ctx.dpoName} (${ctx.dpoEmail})`)
  
  // Databases
  const dbs = v3.databases || ctx.databases || []
  if (dbs.length > 0) {
    lines.push(`\nמאגרי מידע (${dbs.length}):`)
    const dbDetails = v3.dbDetails || ctx.dbDetails || {}
    for (const db of dbs) {
      const detail = dbDetails[db] || {}
      const label = DB_LABELS[db] || db
      const parts = [`  - ${label}`]
      if (detail.size) parts.push(`(${detail.size} רשומות)`)
      if (detail.fields?.length) parts.push(`— שדות: ${detail.fields.join(', ')}`)
      lines.push(parts.join(' '))
    }
  }
  
  // Processors
  const processors = [...(v3.processors || ctx.processors || []), ...(v3.customProcessors || ctx.customProcessors || [])]
  if (processors.length > 0) {
    lines.push(`\nספקי עיבוד (${processors.length}): ${processors.join(', ')}`)
  }
  
  // Storage
  const storage = v3.storage || ctx.storage || []
  if (storage.length > 0) {
    lines.push(`אחסון מידע: ${storage.join(', ')}`)
  }
  
  // Security
  if (v3.accessControl || ctx.accessControl) {
    lines.push(`בקרת גישה: ${v3.accessControl || ctx.accessControl}`)
  }
  
  return lines.join('\n')
}

// ─── Doc type prompts ────────────────────────────────

const DOC_PROMPTS: Record<string, (ctx: OrgContext) => string> = {

  privacy_policy: (ctx) => `צור תקנון פרטיות מלא עבור הארגון הבא.

${buildOrgSummary(ctx)}

התקנון חייב לכלול:
1. מבוא — מי אנחנו ומה המסמך הזה
2. אילו סוגי מידע אנחנו אוספים (לפי מאגרי המידע שרשומים)
3. מטרות העיבוד — לכל מאגר
4. בסיס חוקי לעיבוד (הסכמה / אינטרס לגיטימי / חובה חוקית)
5. שיתוף מידע עם צדדים שלישיים (לפי רשימת הספקים)
6. אבטחת מידע — אמצעים שננקטים
7. תקופות שמירה
8. זכויות נושאי המידע (עיון, תיקון, מחיקה, התנגדות)
9. העברת מידע מחוץ לישראל (אם רלוונטי לפי הספקים)
10. שינויים בתקנון
11. יצירת קשר — פרטי הממונה

התאם את הלשון לתחום הפעילות של הארגון.`,

  security_procedures: (ctx) => `צור נוהל אבטחת מידע מלא עבור הארגון הבא.

${buildOrgSummary(ctx)}

הנוהל חייב לכלול:
1. מטרה והיקף
2. הגדרות
3. אחריות ותפקידים (מנכ"ל, ממונה פרטיות, ממונה אבטחה, עובדים)
4. סיווג מידע ורגישות
5. בקרת גישה — מדיניות הרשאות (לפי מצב בקרת הגישה הנוכחי)
6. אבטחה פיזית
7. אבטחת תקשורת (הצפנה, VPN, WiFi)
8. גיבוי ושחזור
9. ניהול אירועי אבטחה — נוהל דיווח 72 שעות
10. ניהול ספקים ומעבדים (לפי רשימת הספקים)
11. מחיקת מידע ושמירה
12. הדרכת עובדים
13. ביקורת תקופתית

התאם את רמת האבטחה הנדרשת לסוג המידע ולגודל הארגון.
בסס על תקנות אבטחת מידע 2017 וציין סעיפים ספציפיים.`,

  database_definition: (ctx) => `צור מסמך הגדרת מאגרי מידע עבור הארגון הבא.

${buildOrgSummary(ctx)}

לכל מאגר, כלול:
1. שם המאגר
2. מטרת המאגר
3. סוגי המידע (שדות)
4. בסיס חוקי
5. מקורות המידע
6. גישה — מי מורשה
7. אבטחה — אמצעים ספציפיים
8. שמירה — תקופת שמירה
9. מחיקה — נוהל מחיקה
10. העברה לצדדים שלישיים

בהתאם לסעיף 8 לחוק הגנת הפרטיות וטפסי רישום מאגרים (טופס 17).`,

  consent_form: (ctx) => `צור טופס הסכמה לאיסוף מידע עבור הארגון הבא.

${buildOrgSummary(ctx)}

הטופס חייב לכלול:
1. כותרת ברורה
2. זיהוי הארגון האוסף
3. אילו סוגי מידע נאספים
4. מטרת האיסוף
5. עם מי המידע ישותף
6. זכות לסרב ומשמעות הסירוב
7. תקופת שמירה
8. זכויות נושא המידע
9. פרטי יצירת קשר עם הממונה
10. שדה חתימה/אישור

עצב אותו כטופס קצר וברור שאפשר להטמיע באתר או להדפיס.
הסכמה חייבת להיות חופשית, מדעת, מפורשת.`,

  processor_agreement: (ctx) => {
    const w = ctx.wizardAnswers || {}
    return `צור הסכם עיבוד מידע (DPA) בין הארגון לספק.

${buildOrgSummary(ctx)}

פרטי הספק:
- שם הספק: ${w.supplierName || 'לא צוין'}
- סוג השירות: ${w.supplierService || 'לא צוין'}
- סוגי מידע מועברים: ${Array.isArray(w.dataShared) ? w.dataShared.join(', ') : 'לא צוין'}
- מיקום שרתים: ${w.serverLocation || 'לא צוין'}

ההסכם חייב לכלול:
1. הצדדים להסכם
2. הגדרות
3. סוגי המידע ומטרת העיבוד
4. חובות המעבד (סודיות, אבטחה, מחיקה בסיום, שיתוף פעולה)
5. חובות המזמין
6. איסור העברה לצד שלישי ללא אישור
7. דיווח על אירוע אבטחה (24 שעות)
8. ביקורת ופיקוח
9. סיום התקשרות וטיפול במידע
10. אחריות ושיפוי
11. העברה בינלאומית (אם השרתים מחוץ לישראל)
12. תוקף ההסכם
13. שדות חתימה

בסס על דרישות תיקון 13 לחוק הגנת הפרטיות.`
  },

  employee_training: (ctx) => {
    const w = ctx.wizardAnswers || {}
    return `צור תכנית הדרכת פרטיות לעובדים עבור הארגון הבא.

${buildOrgSummary(ctx)}

פרטי ההדרכה:
- מספר עובדים: ${w.employeeCount || 'לא צוין'}
- מחלקות עיקריות: ${w.departments || 'לא צוין'}
- הדרכה אחרונה: ${w.lastTraining || 'לא ידוע'}
- פורמט: ${w.format || 'מסמך'}

תכנית ההדרכה חייבת לכלול:
1. מבוא — למה פרטיות חשובה (התאם לתחום הארגון)
2. מה זה מידע אישי — דוגמאות ספציפיות ממאגרי הארגון
3. חוק הגנת הפרטיות ותיקון 13 — מה רלוונטי לעובדים
4. כללי עשה ואל תעשה — מותאם למחלקות הספציפיות
5. זיהוי ודיווח על אירוע אבטחה — למי פונים, תוך כמה זמן
6. טיפול בבקשות מנושאי מידע (עיון, מחיקה, תיקון)
7. שימוש בספקים ומערכות — מה מותר ומה אסור
8. טופס אישור השתתפות
9. טבלת תיעוד הדרכות
10. תדירות — הדרכה שנתית + כניסה לעבודה

התאם דוגמאות ותרחישים לתחום הפעילות של הארגון.
כתוב בשפה פשוטה שעובדים לא-משפטיים יבינו.`
  },
}

// ─── Main export ────────────────────────────────

export async function generateDocWithAI(
  docType: string,
  ctx: OrgContext
): Promise<{ content: string; title: string } | null> {
  const promptFn = DOC_PROMPTS[docType]
  if (!promptFn) return null

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('AI doc generation: no API key, falling back to template')
    return null
  }

  try {
    console.log(`AI generating ${docType} for ${ctx.orgName}...`)
    const userPrompt = promptFn(ctx)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0]
    if (text.type !== 'text' || !text.text) {
      console.log('AI doc generation: empty response')
      return null
    }

    // Derive title from doc type
    const titles: Record<string, string> = {
      privacy_policy: 'תקנון פרטיות',
      security_procedures: 'נוהל אבטחת מידע',
      database_definition: 'הגדרת מאגרי מידע',
      consent_form: 'טופס הסכמה לאיסוף מידע',
      processor_agreement: ctx.wizardAnswers?.supplierName
        ? `הסכם עיבוד מידע — ${ctx.wizardAnswers.supplierName}`
        : 'הסכם עיבוד מידע (DPA)',
      employee_training: 'תכנית הדרכת פרטיות לעובדים',
    }

    console.log(`AI generated ${docType}: ${text.text.length} chars`)
    return {
      content: text.text,
      title: titles[docType] || docType,
    }
  } catch (err: any) {
    console.error(`AI doc generation failed for ${docType}:`, err.message)
    return null
  }
}

// Which doc types should use AI (others keep templates)
export const AI_DOC_TYPES = [
  'privacy_policy',
  'security_procedures',
  'database_definition',
  'consent_form',
  'processor_agreement',
  'employee_training',
]
