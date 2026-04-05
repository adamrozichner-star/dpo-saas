// v3-document-templates.ts — Additional document generation templates

interface V3Answers {
  [key: string]: any
}

interface DatabaseEntry {
  name: string
  purpose: string
  dataTypes: string[]
  securityLevel: string
  processorName?: string
}

export function generateDatabaseStructure(orgName: string, answers: V3Answers): string {
  const databases: DatabaseEntry[] = answers.databases || []
  const processors = answers.thirdParties || []
  const now = new Date().toLocaleDateString('he-IL')

  let content = `# מסמך מבנה מאגר מידע\n\n`
  content += `**ארגון:** ${orgName}\n`
  content += `**תאריך:** ${now}\n`
  content += `**סיווג:** מסמך פנימי\n\n`
  content += `---\n\n`
  content += `## 1. רשימת מאגרי מידע\n\n`

  if (databases.length > 0) {
    databases.forEach((db, i) => {
      content += `### מאגר ${i + 1}: ${db.name}\n\n`
      content += `- **מטרה:** ${db.purpose}\n`
      content += `- **סוגי מידע:** ${db.dataTypes?.join(', ') || 'לא צוין'}\n`
      content += `- **סיווג אבטחה:** ${db.securityLevel || 'רגיל'}\n`
      if (db.processorName) {
        content += `- **מעבד מידע:** ${db.processorName}\n`
      }
      content += `\n`
    })
  } else {
    content += `לא הוגדרו מאגרים ספציפיים. יש להשלים פרט זה.\n\n`
  }

  content += `## 2. סיווג אבטחת מידע\n\n`
  content += `| רמת סיווג | תיאור | אמצעי הגנה נדרשים |\n`
  content += `|---|---|---|\n`
  content += `| רגיל | מידע עסקי כללי | הצפנה בסיסית, בקרת גישה |\n`
  content += `| רגיש | מידע אישי מזהה | הצפנה מתקדמת, אימות דו-שלבי |\n`
  content += `| רגיש מאוד | מידע בריאותי/ביומטרי | הצפנה מלאה, גישה מוגבלת, לוג ביקורת |\n\n`

  content += `## 3. רשימת מעבדי מידע\n\n`
  if (processors.length > 0) {
    processors.forEach((p: any, i: number) => {
      content += `${i + 1}. **${p.name}** — ${p.purpose}${p.location ? ` (${p.location})` : ''}\n`
    })
  } else {
    content += `לא צוינו מעבדי מידע חיצוניים.\n`
  }

  content += `\n## 4. אמצעי אבטחה\n\n`
  const securityMeasures = answers.securityMeasures || []
  if (securityMeasures.length > 0) {
    securityMeasures.forEach((m: string) => {
      content += `- ${m}\n`
    })
  } else {
    content += `- הצפנת מידע בתנועה ובמנוחה\n`
    content += `- בקרת גישה מבוססת תפקידים\n`
    content += `- גיבוי יומי\n`
    content += `- ניטור גישות חריגות\n`
  }

  content += `\n---\n\n`
  content += `*מסמך זה נוצר אוטומטית על ידי מערכת Deepo ונבדק על ידי ממונה הגנת הפרטיות.*\n`

  return content
}

export function generateV3Documents(orgName: string, answers: V3Answers): Array<{ type: string; title: string; content: string }> {
  const docs: Array<{ type: string; title: string; content: string }> = []

  // Always generate database structure if we have relevant data
  if (answers.databases || answers.thirdParties || answers.securityMeasures) {
    docs.push({
      type: 'database_structure',
      title: 'מסמך מבנה מאגר מידע',
      content: generateDatabaseStructure(orgName, answers),
    })
  }

  return docs
}
