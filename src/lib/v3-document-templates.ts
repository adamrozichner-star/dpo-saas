// ═══════════════════════════════════════════════════════
// V3 DOCUMENT TEMPLATES
// Uses rich v3Answers data for ROPA, consent, processor agreements
// ═══════════════════════════════════════════════════════

const DB_LABELS: Record<string, string> = {
  customers: 'לקוחות',
  cvs: 'קו"ח / מועמדים',
  employees: 'עובדים',
  cameras: 'מצלמות',
  website_leads: 'לידים מהאתר',
  suppliers_id: 'ספקים (עוסק מורשה)',
  payments: 'תשלומים',
  medical: 'רפואי',
}

const PROC_LABELS: Record<string, string> = {
  crm_saas: 'CRM / מערכת ניהול',
  payroll: 'שכר / HR',
  marketing: 'שיווק / דיוור',
  cloud_hosting: 'אחסון ענן',
  call_center: 'מוקד שירות',
  accounting: 'הנה"ח / רו"ח',
}

const SIZE_LABELS: Record<string, string> = {
  'under100': 'עד 100',
  '100-1k': '100–1,000',
  '1k-10k': '1,000–10,000',
  '10k-100k': '10,000–100,000',
  '100k+': 'מעל 100,000',
}

const ACCESS_LABELS: Record<string, string> = {
  '1-2': '1-2',
  '3-10': '3-10',
  '11-50': '11-50',
  '50-100': '50-100',
  '100+': '100+',
}

const RETENTION_LABELS: Record<string, string> = {
  never: 'ללא מחיקה',
  sometimes: 'לפעמים',
  quarterly: 'כל רבעון',
  policy: 'לפי נוהל מוגדר',
}

const INDUSTRY_LABELS: Record<string, string> = {
  retail: 'קמעונאות ומסחר',
  technology: 'טכנולוגיה',
  healthcare: 'בריאות ורפואה',
  health: 'בריאות ורפואה',
  finance: 'פיננסים',
  education: 'חינוך',
  services: 'שירותים',
  manufacturing: 'ייצור',
  food: 'מזון ומסעדנות',
  realestate: 'נדל"ן',
  other: 'אחר',
}

const DB_FIELDS: Record<string, string[]> = {
  customers: ['שם', 'טלפון', 'אימייל', 'כתובת', 'ת.ז', 'מידע פיננסי', 'היסטוריית רכישות'],
  cvs: ['שם', 'טלפון', 'אימייל', 'ת.ז', 'ניסיון תעסוקתי', 'השכלה', 'המלצות'],
  employees: ['שם', 'ת.ז', 'כתובת', 'שכר', 'חשבון בנק', 'ביצועים', 'מידע רפואי'],
  cameras: ['צילום פנים', 'מיקום', 'תאריך ושעה'],
  website_leads: ['שם', 'טלפון', 'אימייל', 'כתובת IP', 'עמודים שנצפו'],
  suppliers_id: ['שם', 'ת.ז / ח.פ', 'טלפון', 'חשבון בנק', 'פרטי חוזה'],
  payments: ['שם', 'מספר כרטיס', 'תוקף', 'CVV', 'כתובת חיוב'],
  medical: ['שם', 'ת.ז', 'מידע רפואי', 'אבחנות', 'תרופות', 'ביטוח'],
}

const SENSITIVE_FIELDS = [
  'ת.ז', 'מידע פיננסי', 'שכר', 'חשבון בנק', 'מידע רפואי',
  'אבחנות', 'תרופות', 'מספר כרטיס', 'CVV', 'צילום פנים',
]

function formatDate(): string {
  return new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getLegalBasis(dbType: string): string {
  const bases: Record<string, string> = {
    customers: 'הסכמה / ביצוע חוזה',
    cvs: 'הסכמה',
    employees: 'חובה חוקית / ביצוע חוזה',
    cameras: 'אינטרס לגיטימי (ביטחון)',
    website_leads: 'הסכמה',
    suppliers_id: 'ביצוע חוזה / חובה חוקית',
    payments: 'ביצוע חוזה / חובה חוקית',
    medical: 'חובה חוקית / הסכמה מפורשת',
  }
  return bases[dbType] || 'הסכמה'
}

function getPurpose(dbType: string): string {
  const purposes: Record<string, string> = {
    customers: 'ניהול קשרי לקוחות, מתן שירות, שיווק',
    cvs: 'גיוס עובדים, ניהול תהליך מיון',
    employees: 'ניהול משאבי אנוש, שכר, דיווח לרשויות',
    cameras: 'אבטחת מקום העבודה, מניעת גניבות',
    website_leads: 'שיווק, יצירת קשר עם מתעניינים',
    suppliers_id: 'ניהול ספקים, חשבוניות, דיווח מע"מ',
    payments: 'עיבוד תשלומים, חיובים, החזרים',
    medical: 'טיפול רפואי, ניהול תיק מטופל',
  }
  return purposes[dbType] || 'מתן שירות'
}

interface V3DocContext {
  orgName: string
  businessId: string
  v3Answers: any
  dpoName: string
  dpoEmail: string
  dpoPhone: string
  dpoLicense: string
}

// ═══════════════════════════════════════════════════════
// ROPA — Records of Processing Activities
// ═══════════════════════════════════════════════════════
export function generateROPA(ctx: V3DocContext): string {
  const v3 = ctx.v3Answers
  const dbs = v3.databases || []
  const customDbs = v3.customDatabases || []
  const allDbs = [...dbs, ...customDbs]
  const processors = v3.processors || []
  const customProcessors = v3.customProcessors || []
  const allProcessors = [...processors, ...customProcessors]
  const dbDetails = v3.dbDetails || {}
  const storage = v3.storage || []
  const customStorage = v3.customStorage || []
  const industry = v3.industry || 'other'
  const date = formatDate()

  // Build per-DB rows
  const dbRows = allDbs.map((db: string) => {
    const detail = dbDetails[db] || {}
    const label = DB_LABELS[db] || db
    const fields = detail.fields || DB_FIELDS[db] || []
    const sensitiveFields = fields.filter((f: string) => SENSITIVE_FIELDS.includes(f))
    const hasSensitive = sensitiveFields.length > 0
    const size = SIZE_LABELS[detail.size] || 'לא צוין'
    const access = ACCESS_LABELS[detail.access] || 'לא צוין'
    const retention = RETENTION_LABELS[detail.retention] || 'לא הוגדר'
    const legalBasis = getLegalBasis(db)
    const purpose = getPurpose(db)

    return `### מאגר: ${label}

| פרט | ערך |
|-----|-----|
| מטרת העיבוד | ${purpose} |
| בסיס חוקי | ${legalBasis} |
| סוגי מידע | ${fields.join(', ')} |
| מידע רגיש | ${hasSensitive ? '⚠️ כן — ' + sensitiveFields.join(', ') : 'לא'} |
| היקף (רשומות) | ${size} |
| מספר בעלי גישה | ${access} |
| מדיניות מחיקה | ${retention} |
| נושאי מידע | ${db === 'employees' ? 'עובדי הארגון' : db === 'cvs' ? 'מועמדים' : db === 'suppliers_id' ? 'ספקים' : 'לקוחות / משתמשים'} |
`
  }).join('\n')

  // Processors section
  const procSection = allProcessors.length > 0 ? `
## 3. מעבדי מידע (ספקים חיצוניים)

| ספק | סוג שירות | בסיס ההתקשרות |
|-----|-----------|---------------|
${allProcessors.map((p: string) => `| ${PROC_LABELS[p] || p} | עיבוד מידע מטעם הארגון | הסכם עיבוד מידע (נדרש) |`).join('\n')}

**הערה:** יש לוודא כי קיים הסכם עיבוד מידע (DPA) חתום עם כל ספק המופיע ברשימה.
` : `
## 3. מעבדי מידע

לא צוינו ספקים חיצוניים המעבדים מידע אישי מטעם הארגון.
`

  // Storage section
  const storageItems = [...storage, ...customStorage]
  const storageSection = storageItems.length > 0 ? `
## 4. אחסון מידע

המידע מאוחסן ב:
${storageItems.map((s: string) => `- ${s}`).join('\n')}
` : ''

  // International transfer detection
  const intlProcessors = ['cloud_hosting', 'crm_saas', 'marketing']
  const hasIntlTransfer = processors.some((p: string) => intlProcessors.includes(p))

  return `# רשומת פעילויות עיבוד (ROPA)

Record of Processing Activities — בהתאם לתיקון 13 לחוק הגנת הפרטיות

---

## 1. פרטי בעל המאגר

| פרט | ערך |
|-----|-----|
| שם הארגון | ${ctx.orgName} |
| ח.פ./ע.מ. | ${ctx.businessId} |
| תחום פעילות | ${INDUSTRY_LABELS[industry] || industry} |
| ממונה הגנת פרטיות | ${ctx.dpoName} |
| אימייל ממונה | ${ctx.dpoEmail} |
| תאריך עדכון | ${date} |

---

## 2. פעילויות עיבוד — פירוט מאגרים

${dbRows}

---

${procSection}

${storageSection}

---

## 5. העברות מידע

### העברה לצדדים שלישיים
${allProcessors.length > 0 ? `מידע מועבר ל-${allProcessors.length} ספקים חיצוניים כמפורט בסעיף 3.` : 'אין העברת מידע לצדדים שלישיים.'}

### העברה לחו"ל
${hasIntlTransfer ? `⚠️ **קיימת העברת מידע לחו"ל** — שירותי ענן ו/או SaaS בינלאומיים.
יש לוודא:
- המדינה מספקת רמת הגנה נאותה
- קיימים הסכמים חוזיים מתאימים (SCC)
- עמידה בהנחיות הרשות להגנת הפרטיות` : 'לא זוהתה העברת מידע לחו"ל.'}

---

## 6. אמצעי אבטחה

| אמצעי | סטטוס |
|-------|-------|
| אחראי אבטחה | ${v3.securityOwner === 'none' ? '❌ לא מונה' : '✅ ' + (v3.securityOwnerName || v3.securityOwner)} |
| בקרת גישה | ${v3.accessControl === 'role' ? '✅ לפי תפקיד' : v3.accessControl === 'limited' ? '⚠️ מוגבל חלקית' : '❌ כולם רואים הכל'} |
| מדיניות הסכמה | ${v3.hasConsent === 'yes' ? '✅ קיימת' : v3.hasConsent === 'partial' ? '⚠️ חלקית' : '❌ חסרה'} |

---

## 7. סקירה ועדכון

רשומה זו תיסקר ותעודכן:
- לפחות פעם בשנה
- בכל שינוי מהותי בפעילויות העיבוד
- בעת הוספת מאגר מידע חדש
- בעת התקשרות עם ספק חדש

---

**תאריך יצירה:** ${date}
**נוצר על ידי:** מערכת Deepo
**סטטוס:** ממתין לאישור הממונה

*מסמך זה נוצר בהתאם לדרישות תיקון 13 לחוק הגנת הפרטיות, התשמ"א-1981*
`
}

// ═══════════════════════════════════════════════════════
// CONSENT FORM — טופס הסכמה לאיסוף מידע
// ═══════════════════════════════════════════════════════
export function generateConsentForm(ctx: V3DocContext): string {
  const v3 = ctx.v3Answers
  const dbs = v3.databases || []
  const dbDetails = v3.dbDetails || {}
  const processors = v3.processors || []
  const customProcessors = v3.customProcessors || []
  const allProcessors = [...processors, ...customProcessors]
  const date = formatDate()

  // Collect all fields across all DBs for the consent
  const allFieldsSet = new Set<string>()
  for (const db of dbs) {
    const detail = dbDetails[db] || {}
    const fields = detail.fields || DB_FIELDS[db] || []
    fields.forEach((f: string) => allFieldsSet.add(f))
  }
  const allFields = Array.from(allFieldsSet)
  const sensitiveFields = allFields.filter(f => SENSITIVE_FIELDS.includes(f))

  // Collect all purposes
  const purposes = new Set<string>()
  for (const db of dbs) {
    purposes.add(getPurpose(db))
  }

  return `# טופס הסכמה לאיסוף ועיבוד מידע אישי

**${ctx.orgName}**
ח.פ./ע.מ.: ${ctx.businessId}

בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13

---

## הודעה על איסוף מידע אישי

${ctx.orgName} ("הארגון") מבקש/ת את הסכמתך לאיסוף ועיבוד המידע האישי שלך כמפורט להלן.

---

## 1. המידע שנאסף

הארגון אוסף את סוגי המידע הבאים:

${allFields.map(f => `- ${f}`).join('\n')}

${sensitiveFields.length > 0 ? `
### מידע רגיש
הארגון אוסף גם מידע רגיש הכולל: **${sensitiveFields.join(', ')}**.
עיבוד מידע רגיש נעשה אך ורק בהסכמתך המפורשת ובהתאם לחוק.
` : ''}

---

## 2. מטרות השימוש

המידע ישמש למטרות הבאות:

${Array.from(purposes).map(p => `- ${p}`).join('\n')}

---

## 3. שיתוף מידע

${allProcessors.length > 0 ? `המידע עשוי להיות מועבר לספקי השירות הבאים הפועלים מטעם הארגון:

${allProcessors.map((p: string) => `- ${PROC_LABELS[p] || p}`).join('\n')}

כל ספק מחויב בהסכם לשמירה על סודיות המידע.` : 'המידע לא יועבר לצדדים שלישיים, למעט כנדרש על פי חוק.'}

---

## 4. תקופת שמירה

המידע יישמר למשך הזמן הנדרש למטרות שלשמן נאסף, ולא יותר מהנדרש על פי חוק.

---

## 5. הזכויות שלך

על פי חוק הגנת הפרטיות, עומדות לך הזכויות הבאות:

- **עיון** — לעיין במידע השמור עליך
- **תיקון** — לבקש תיקון מידע שגוי
- **מחיקה** — לבקש מחיקת המידע שלך
- **התנגדות** — להתנגד לעיבוד בנסיבות מסוימות
- **ביטול הסכמה** — לבטל הסכמה זו בכל עת

לממוש זכויותיך, פנה/י אל ממונה הגנת הפרטיות:
**${ctx.dpoName}** — ${ctx.dpoEmail}

---

## 6. הסכמה

☐ אני מסכים/ה לאיסוף ועיבוד המידע האישי שלי כמפורט לעיל.

${sensitiveFields.length > 0 ? `☐ אני מסכים/ה במפורש לעיבוד המידע הרגיש שלי (${sensitiveFields.join(', ')}).

` : ''}☐ אני מאשר/ת שקראתי והבנתי את מדיניות הפרטיות של הארגון.

---

**שם:** _______________________

**חתימה:** _______________________

**תאריך:** _______________________

---

**פרטי התקשרות:**
${ctx.orgName}
ממונה הגנת הפרטיות: ${ctx.dpoName}
אימייל: ${ctx.dpoEmail}
${ctx.dpoPhone ? `טלפון: ${ctx.dpoPhone}` : ''}

---

**תאריך יצירה:** ${date}

*מסמך זה נוצר בהתאם לדרישות תיקון 13 לחוק הגנת הפרטיות, התשמ"א-1981*
`
}

// ═══════════════════════════════════════════════════════
// PROCESSOR AGREEMENT — הסכם עיבוד מידע (DPA)
// ═══════════════════════════════════════════════════════
export function generateProcessorAgreement(ctx: V3DocContext): string {
  const v3 = ctx.v3Answers
  const processors = v3.processors || []
  const customProcessors = v3.customProcessors || []
  const allProcessors = [...processors, ...customProcessors]
  const dbs = v3.databases || []
  const dbDetails = v3.dbDetails || {}
  const date = formatDate()

  if (allProcessors.length === 0) {
    return `# הסכם עיבוד מידע (DPA)

**${ctx.orgName}**

---

לא זוהו ספקים חיצוניים המעבדים מידע אישי מטעם הארגון.
מסמך זה ייווצר מחדש כאשר יתווספו ספקים.

---

*תאריך: ${date}*
`
  }

  // Collect data types shared with processors
  const allFieldsSet = new Set<string>()
  for (const db of dbs) {
    const detail = dbDetails[db] || {}
    const fields = detail.fields || DB_FIELDS[db] || []
    fields.forEach((f: string) => allFieldsSet.add(f))
  }
  const sensitiveFields = Array.from(allFieldsSet).filter(f => SENSITIVE_FIELDS.includes(f))

  // Per-processor appendix
  const procAppendix = allProcessors.map((p: string, i: number) => {
    const label = PROC_LABELS[p] || p
    return `### נספח ${i + 1}: ${label}

| פרט | ערך |
|-----|-----|
| שם הספק | ${label} |
| סוג שירות | עיבוד מידע מטעם הארגון |
| סוגי מידע שמועברים | [יש להשלים] |
| מטרת העיבוד | ${p === 'payroll' ? 'עיבוד שכר ודיווח לרשויות' : p === 'marketing' ? 'שיווק ודיוור' : p === 'accounting' ? 'הנהלת חשבונות ודיווח' : p === 'cloud_hosting' ? 'אחסון ועיבוד נתונים' : p === 'call_center' ? 'שירות לקוחות' : 'ניהול נתונים'} |
| משך ההתקשרות | [יש להשלים] |
| מיקום עיבוד | ${['cloud_hosting', 'crm_saas', 'marketing'].includes(p) ? 'ישראל / חו"ל (לוודא הלימה רגולטורית)' : 'ישראל'} |

**סטטוס הסכם:** ❌ טרם נחתם — נדרשת פעולה
`
  }).join('\n---\n\n')

  return `# הסכם עיבוד מידע (DPA)

Data Processing Agreement — בהתאם לתיקון 13 לחוק הגנת הפרטיות

---

## הצדדים

**בעל המאגר ("הלקוח"):**
| פרט | ערך |
|-----|-----|
| שם | ${ctx.orgName} |
| ח.פ./ע.מ. | ${ctx.businessId} |
| ממונה הגנת פרטיות | ${ctx.dpoName} |
| אימייל | ${ctx.dpoEmail} |

**המעבד ("הספק"):**
[פרטי הספק — יש להשלים לכל ספק בנפרד]

---

## 1. הגדרות

"מידע אישי" — כל מידע הנוגע לאדם מזוהה או ניתן לזיהוי, כהגדרתו בחוק הגנת הפרטיות, התשמ"א-1981.

"עיבוד" — כל פעולה המבוצעת במידע אישי, לרבות איסוף, אחסון, שימוש, העברה ומחיקה.

---

## 2. מטרת העיבוד

המעבד יעבד מידע אישי אך ורק למטרות שהוגדרו על ידי בעל המאגר, כמפורט בנספחים להסכם זה.

---

## 3. חובות המעבד

המעבד מתחייב:

### 3.1 אבטחת מידע
- ליישם אמצעי אבטחה מתאימים בהתאם לתקנות אבטחת מידע 2017
- להצפין מידע אישי בהעברה ובאחסון
- להגביל גישה למידע לעובדים מורשים בלבד
- לנהל תיעוד של כל הגישות למידע

### 3.2 סודיות
- לשמור על סודיות המידע
- להבטיח שכל עובד החשוף למידע חתום על התחייבות סודיות

### 3.3 תת-מעבדים
- לא להעביר מידע לצד שלישי ללא אישור מראש ובכתב
- לוודא שכל תת-מעבד מחויב בהסכם דומה

### 3.4 סיום ההתקשרות
- בתום ההסכם, למחוק או להשיב את כל המידע האישי
- לספק אישור בכתב על המחיקה

---

## 4. חובות בעל המאגר

בעל המאגר מתחייב:
- להעביר מידע רק למטרות חוקיות ומוגדרות
- להודיע למעבד על כל שינוי בדרישות
- לשתף פעולה בטיפול בפניות נושאי מידע

---

## 5. אירועי אבטחה

### 5.1 דיווח
המעבד ידווח לבעל המאגר על כל אירוע אבטחה תוך **24 שעות** מרגע הגילוי.

### 5.2 שיתוף פעולה
המעבד ישתף פעולה עם בעל המאגר בחקירת האירוע ובדיווח לרשות להגנת הפרטיות (אם נדרש תוך 24 שעות).

---

## 6. זכויות נושאי מידע

המעבד יסייע לבעל המאגר בטיפול בבקשות נושאי מידע:
- בקשות עיון (סעיף 13)
- בקשות תיקון (סעיף 14)
- בקשות מחיקה (סעיף 14א)

---

## 7. ביקורת

בעל המאגר רשאי לבצע ביקורת, או למנות מבקר מטעמו, לבדיקת עמידת המעבד בתנאי הסכם זה, בהודעה מראש של 14 יום.

---

## 8. אחריות ושיפוי

כל צד ישפה את הצד האחר בגין כל נזק הנובע מהפרת הסכם זה.

---

## 9. תוקף ההסכם

הסכם זה ייכנס לתוקף ביום חתימתו ויישאר בתוקף כל עוד המעבד מחזיק או מעבד מידע אישי מטעם בעל המאגר.

---

## 10. חתימות

### בעל המאגר — ${ctx.orgName}

שם: _______________________

תפקיד: _______________________

חתימה: _______________________

תאריך: _______________________

---

### המעבד — [שם הספק]

שם: _______________________

תפקיד: _______________________

חתימה: _______________________

תאריך: _______________________

---

## נספחים — פירוט ספקים

${procAppendix}

---

${sensitiveFields.length > 0 ? `
## הערה חשובה

⚠️ הארגון מעבד מידע רגיש (${sensitiveFields.join(', ')}). יש לוודא שהספק עומד בדרישות אבטחה מוגברות בהתאם לתקנות אבטחת מידע 2017.

---
` : ''}

**תאריך יצירה:** ${date}
**נוצר על ידי:** מערכת Deepo
**סטטוס:** טיוטה — יש להשלים פרטי ספק ולחתום

*מסמך זה נוצר בהתאם לדרישות תיקון 13 לחוק הגנת הפרטיות, התשמ"א-1981*
`
}

// ═══════════════════════════════════════════════════════
// EXPORT: Generate all v3 documents
// ═══════════════════════════════════════════════════════
export function generateV3Documents(ctx: V3DocContext): Array<{
  title: string
  content: string
  type: string
}> {
  const docs: Array<{ title: string; content: string; type: string }> = []

  // Always generate ROPA
  docs.push({
    title: 'רשומת פעילויות עיבוד (ROPA)',
    content: generateROPA(ctx),
    type: 'ropa'
  })

  // Always generate consent form
  docs.push({
    title: 'טופס הסכמה לאיסוף מידע',
    content: generateConsentForm(ctx),
    type: 'consent_form'
  })

  // Generate processor agreement if there are processors
  const processors = ctx.v3Answers?.processors || []
  const customProcessors = ctx.v3Answers?.customProcessors || []
  if (processors.length > 0 || customProcessors.length > 0) {
    docs.push({
      title: 'הסכם עיבוד מידע (DPA)',
      content: generateProcessorAgreement(ctx),
      type: 'processor_agreement'
    })
  }

  return docs
}

// ═══════════════════════════════════════════════════════
// DATABASE STRUCTURE — מסמך מבנה מאגר
// Required by Regulation 2 of the 2017 Data Security Regulations
// ═══════════════════════════════════════════════════════
export function generateDatabaseStructure(ctx: V3DocContext): string {
  const v3 = ctx.v3Answers
  const databases = v3.databases || []
  const processors = v3.processors || []
  const securityMeasures = v3.securityMeasures || []
  const now = new Date().toLocaleDateString('he-IL')

  let doc = `# מסמך מבנה מאגר מידע\n\n`
  doc += `**ארגון:** ${ctx.orgName}\n`
  doc += `**ח.פ./ע.מ.:** ${ctx.businessId}\n`
  doc += `**ממונה הגנת פרטיות:** ${ctx.dpoName}\n`
  doc += `**תאריך:** ${now}\n`
  doc += `**סיווג:** מסמך פנימי — מוגן\n\n---\n\n`

  doc += `## 1. רשימת מאגרי מידע\n\n`
  if (databases.length > 0) {
    databases.forEach((db: any, i: number) => {
      const label = DB_LABELS[db.id] || db.name || db.id
      doc += `### מאגר ${i + 1}: ${label}\n\n`
      doc += `- **מטרה:** ${db.purpose || 'לא צוינה'}\n`
      doc += `- **סוגי מידע:** ${(db.dataTypes || []).join(', ') || 'לא צוינו'}\n`
      doc += `- **רמת אבטחה:** ${db.securityLevel || 'רגילה'}\n`
      doc += `- **בקרת גישה:** גישה מוגבלת לבעלי הרשאה בלבד\n`
      doc += `- **תקופת שמירה:** ${db.retentionPeriod || 'בהתאם למדיניות הארגון'}\n\n`
    })
  } else {
    doc += `לא הוגדרו מאגרים ספציפיים. יש להשלים פרט זה.\n\n`
  }

  doc += `## 2. סיווג אבטחת מידע\n\n`
  doc += `| רמת סיווג | תיאור | אמצעי הגנה נדרשים |\n`
  doc += `|---|---|---|\n`
  doc += `| רגיל | מידע עסקי כללי | הצפנה בסיסית, בקרת גישה |\n`
  doc += `| רגיש | מידע אישי מזהה | הצפנה מתקדמת, אימות דו-שלבי |\n`
  doc += `| רגיש מאוד | מידע בריאותי/ביומטרי | הצפנה מלאה, גישה מוגבלת, לוג ביקורת |\n\n`

  doc += `## 3. רשימת מעבדי מידע\n\n`
  if (processors.length > 0) {
    processors.forEach((p: any, i: number) => {
      doc += `${i + 1}. **${p.name || p.id}** — ${p.purpose || 'לא צוין'}${p.location ? ` (${p.location})` : ''}\n`
    })
  } else {
    doc += `לא צוינו מעבדי מידע חיצוניים.\n`
  }

  doc += `\n## 4. אמצעי אבטחה\n\n`
  if (securityMeasures.length > 0) {
    securityMeasures.forEach((m: string) => { doc += `- ${m}\n` })
  } else {
    doc += `- הצפנת מידע בתנועה ובמנוחה\n- בקרת גישה מבוססת תפקידים\n- גיבוי יומי\n- ניטור גישות חריגות\n`
  }

  doc += `\n## 5. מפת זרימת מידע\n\n`
  doc += `*ראו דיאגרמת זרימת מידע אינטראקטיבית בלוח הבקרה של Deepo.*\n\n`

  doc += `---\n\n*מסמך זה נוצר אוטומטית על ידי מערכת Deepo ונבדק על ידי ממונה הגנת הפרטיות.*\n`

  return doc
}

// =============================================
// DPIA — Privacy Impact Assessment document
// =============================================
export interface DpiaDocData {
  activity_name: string
  description: string
  legal_basis: string
  data_categories: string[]
  risks: Array<{ name: string; category: string; initial: number; residual: number; initialLevel: string; residualLevel: string }>
  controls: string[]
  residual_score: number
  risk_level: string
  action_plan: Array<{ text: string; owner: string; deadline: string; completed: boolean }>
}

export function generateDPIA(ctx: V3DocContext, dpia: DpiaDocData): string {
  const date = formatDate()
  const bizName = ctx.v3Answers?.bizName || ctx.orgName
  const legalLabels: Record<string, string> = {
    consent: 'הסכמת נושא המידע',
    contract: 'ביצוע חוזה',
    legal_obligation: 'חובה חוקית',
    legitimate_interest: 'אינטרס לגיטימי',
    vital_interests: 'אינטרסים חיוניים',
  }
  const levelLabels: Record<string, string> = { low: 'נמוך', medium: 'בינוני', high: 'גבוה', critical: 'קריטי' }

  let doc = `# תסקיר השפעה על הפרטיות (DPIA)\n\n`
  doc += `**ארגון:** ${bizName}\n`
  doc += `**פעילות:** ${dpia.activity_name}\n`
  doc += `**תאריך עריכה:** ${date}\n`
  doc += `**רמת סיכון שיורי:** ${levelLabels[dpia.risk_level] || dpia.risk_level} (${dpia.residual_score}/25)\n\n`
  doc += `---\n\n`

  doc += `## 1. תיאור הפעילות\n\n${dpia.description || 'לא הוגדר'}\n\n`

  doc += `## 2. בסיס חוקי לעיבוד\n\n${legalLabels[dpia.legal_basis] || dpia.legal_basis || 'לא הוגדר'}\n\n`

  doc += `## 3. מיפוי זרימת המידע\n\nקטגוריות מידע: ${(dpia.data_categories || []).join(', ') || 'לא צוין'}\n\n`

  doc += `## 4. זיהוי סיכונים\n\n`
  doc += `| סיכון | קטגוריה | סיכון ראשוני | סיכון שיורי |\n|---|---|---|---|\n`
  dpia.risks.forEach(r => {
    doc += `| ${r.name} | ${r.category} | ${r.initial} (${levelLabels[r.initialLevel] || r.initialLevel}) | ${r.residual} (${levelLabels[r.residualLevel] || r.residualLevel}) |\n`
  })
  doc += `\n`

  doc += `## 5. בקרות קיימות\n\n`
  if (dpia.controls.length === 0) {
    doc += `אין בקרות פעילות מתועדות.\n\n`
  } else {
    dpia.controls.forEach(c => { doc += `- ${c}\n` })
    doc += `\n`
  }

  doc += `## 6. הערכת סיכון שיורי\n\n`
  doc += `לאחר יישום הבקרות, רמת הסיכון הכוללת היא **${levelLabels[dpia.risk_level]}** (ציון ${dpia.residual_score} מתוך 25).\n\n`

  doc += `## 7. תוכנית פעולה\n\n`
  if (dpia.action_plan.length === 0) {
    doc += `לא הוגדרו פעולות נוספות.\n\n`
  } else {
    dpia.action_plan.forEach((a, i) => {
      doc += `${i + 1}. **${a.text}**\n`
      if (a.owner) doc += `   - אחראי: ${a.owner}\n`
      if (a.deadline) doc += `   - יעד: ${a.deadline}\n`
      doc += `   - סטטוס: ${a.completed ? 'הושלם ✓' : 'פתוח'}\n\n`
    })
  }

  doc += `## 8. אישור הנהלה\n\nתסקיר זה מחייב אישור של בעל הארגון או הממונה הממונה.\n\n`

  const reviewDate = new Date()
  reviewDate.setMonth(reviewDate.getMonth() + 18)
  doc += `## 9. תאריך סקירה הבאה\n\n${reviewDate.toLocaleDateString('he-IL')} (18 חודשים ממועד האישור)\n\n`

  doc += `---\n\n*מסמך זה נוצר אוטומטית על ידי מערכת Deepo בהתאם למתודולוגיית הרשות להגנת הפרטיות.*\n`

  return doc
}
