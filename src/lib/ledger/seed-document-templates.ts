// =============================================================================
// PROVISIONAL ENGINEERING SEED - hub_document_templates (Phase F1).
//
// NOT AUTHORITATIVE. Four developer-authored document template bodies (ROPA,
// processor agreement / DPA, DPO appointment, asset/database definition), salvaged
// from the legacy template text and rebound to the ledger via {{tokens}} that
// match the binders in doc-render.ts. The wording is a PLACEHOLDER pending LEGAL
// REVIEW by Amir and Roy - every row is source_tier='expert_judgment',
// confidence=0.5, reviewed_by=null. A render is only as authoritative as the
// approved template; do not surface these to a customer as final.
//
// Identity: each template has a stable template_id at version 1. asset_template_id
// is left NULL (these are org-level docs, not asset-type-bound). The {{tokens}} in
// each body MUST match the token keys produced by the matching binder in
// doc-render.ts (bindRopa / bindDpa / bindDpoAppointment / bindAssetDbDefinition).
// =============================================================================

import type { DocType } from './doc-render'

// hub_document_templates.asset_template_id is NOT NULL but these are org-level
// docs (not asset-type-bound); use a synthetic "org-level" marker (no FK on the
// catalog asset_template_id, same as the hub_questions question-set ids).
export const DOC_ORG_LEVEL_ASSET_ID = 'd0c00000-0000-4000-8000-000000000000'

export interface DocTemplateSeed {
  templateId: string
  // Catalog version. Bump when the BODY changes so approved docs (pinned at the old
  // version) diverge and flag for refresh - the fingerprint hashes the version, and
  // the renderer keeps exactly one ACTIVE row per template_id. Defaults to 1.
  version?: number
  docType: DocType
  name: string
  body: string
}

export const seedDocumentTemplates: DocTemplateSeed[] = [
  {
    templateId: 'd0c00001-0000-4000-8000-000000000001',
    docType: 'ropa',
    name: 'רשומת פעילויות עיבוד (ROPA)',
    body: `# רשומת פעילויות עיבוד (ROPA)

**ארגון:** {{orgName}}
**ממונה הגנת הפרטיות:** {{dpoName}} ({{dpoEmail}})

## סוגי מידע
{{categories}}

## מטרות עיבוד
{{purposes}}

## נכסי מידע
| נכס |
| --- |
{{assetsTable}}

## מקבלי מידע
| מקבל | הסכם עיבוד |
| --- | --- |
{{recipientsTable}}

_מסמך זה נוצר אוטומטית מתוך מצב הציות הנוכחי. טיוטה - ממתין לאישור ממונה._`,
  },
  {
    templateId: 'd0c00002-0000-4000-8000-000000000002',
    docType: 'processor_agreement',
    name: 'מצב הסכמי עיבוד מול ספקים (DPA)',
    body: `# מצב הסכמי עיבוד נתונים (DPA)

**ארגון:** {{orgName}}
**ממונה הגנת הפרטיות:** {{dpoName}} ({{dpoEmail}})

## ספקים והסכמים
| ספק | הסכם | תאריך חתימה | תוקף |
| --- | --- | --- | --- |
{{vendorsTable}}

## ספקים ללא הסכם חתום
{{missingList}}

_מסמך זה משקף את מצב ההסכמים הנוכחי בספר הציות. טיוטה - ממתין לאישור ממונה._`,
  },
  {
    templateId: 'd0c00003-0000-4000-8000-000000000003',
    docType: 'dpo_appointment',
    name: 'כתב מינוי ממונה על הגנת הפרטיות',
    body: `# כתב מינוי ממונה על הגנת הפרטיות

הארגון **{{orgName}}** ממנה בזאת את **{{dpoName}}** לתפקיד ממונה על הגנת הפרטיות.

| | |
| --- | --- |
| שם הממונה | {{dpoName}} |
| אימייל | {{dpoEmail}} |
| מספר רישיון | {{dpoLicense}} |

הממונה אחראי על יישום הוראות חוק הגנת הפרטיות ותקנותיו בארגון.

_טיוטה - ממתין לאישור ממונה._`,
  },
  {
    templateId: 'd0c00004-0000-4000-8000-000000000004',
    docType: 'asset_db_definition',
    name: 'הגדרת מאגרי מידע',
    body: `# הגדרת מאגרי מידע

**ארגון:** {{orgName}}
**ממונה הגנת הפרטיות:** {{dpoName}}

## סוגי מידע
{{dataTypes}}

## מאגרים
{{assetsBlock}}

## אמצעי אבטחה
{{securityMeasures}}

_מסמך זה נוצר אוטומטית מתוך מצב הציות הנוכחי. טיוטה - ממתין לאישור ממונה._`,
  },

  // ---- F2c bespoke docs (the most legally-sensitive) ----------------------
  // The bodies below are AI-DRAFTED STARTING POINTS, NOT legal text. They are
  // flag-gated and must NOT be shown to a customer until Amir/Roy replace the
  // prose. The {{tokens}} + their binding (doc-render.ts) are the stable
  // engineering contract; the lawyer redlines the wording. [[ ... ]] markers are
  // sections that REQUIRE legal prose Roy/Amir must supply.
  {
    templateId: 'd0c00005-0000-4000-8000-000000000005',
    // v2: Roy-grounded PROVISIONAL prose for sections 4/7/9 + DSAR intake in 8
    // (was LEGAL_PLACEHOLDER at v1). Bump flags v1-approved policies for refresh.
    version: 2,
    docType: 'privacy_policy',
    name: 'מדיניות פרטיות',
    body: `# מדיניות פרטיות

> טיוטה אוטומטית - לא לשימוש לקוח עד אישור משפטי (רועי/אמיר). הנוסח המשפטי טעון השלמה והגהה.

**בעל המאגר:** {{orgName}}
**ממונה הגנת הפרטיות:** {{dpoName}} ({{dpoEmail}}) · רישיון {{dpoLicense}}

## 1. מבוא
מסמך זה מתאר כיצד {{orgName}} אוסף, מעבד, משתף ושומר מידע אישי, ואת זכויות נושאי המידע בהתאם לחוק הגנת הפרטיות ותקנותיו.

## 2. סוגי המידע שאנו אוספים
{{categories}}

## 3. מטרות העיבוד
{{purposes}}

## 4. בסיס חוקי לעיבוד
עיבוד המידע נשען על שני בסיסים משלימים: (1) הסכמת נושא המידע, הניתנת בעת מסירת פרטיו לשם קבלת השירות או המוצר; (2) הצורך של {{orgName}} בעיבוד המידע לשם ניהול פעילותו העסקית השוטפת והלגיטימית, לרבות מתן השירות, התקשרות חוזית וקיום חובות החלות עליו לפי דין. נושא המידע רשאי לחזור בו מהסכמתו בכל עת, בכפוף למגבלות שבדין ולמטרות שבגינן נדרש המשך שמירת המידע.

## 5. שיתוף מידע עם צדדים שלישיים
{{thirdParties}}

## 6. אבטחת מידע
{{security}}

## 7. תקופות שמירה
תקופת שמירת המידע אינה אחידה ונקבעת לפי מטרת העיבוד. ככלל, מידע נשמר רק למשך הזמן הנדרש להגשמת המטרה שלשמה נאסף, אלא אם קיימת חובה שבדין לשמירה ארוכה יותר. עקרונות השמירה לפי מטרה:
- מידע הנדרש לצורך חובות מס ודיווח: נשמר 7 שנים, בהתאם לדרישות רשות המסים.
- מידע הקשור למערכת יחסים מתמשכת עם נושא המידע (למשל לקוח או מקבל שירות ארוך טווח): נשמר למשך כל תקופת ההתקשרות ולתקופה סבירה לאחריה, בהתאם לצורך ולדין.
- מידע שאין בו עוד צורך ולא חלה עליו חובת שמירה: יימחק או יושמד בתום המטרה.
תקופות השמירה המדויקות לכל מטרה נקבעות ומתעדכנות על ידי {{orgName}} בהתאם לפעילותו.

## 8. זכויות נושאי המידע ואופן הגשת בקשה
בהתאם לחוק הגנת הפרטיות, לכל אדם הזכות לעיין במידע אודותיו, לבקש את תיקונו או מחיקתו, ולהתנגד לעיבוד. להגשת בקשה למימוש זכות יש לפנות לממונה הגנת הפרטיות באמצעות פרטי הקשר שבתחתית מסמך זה, תוך ציון שם הפונה, סוג הבקשה (עיון, תיקון, מחיקה או התנגדות) והפרטים הדרושים לזיהוי הבקשה. הארגון ישיב לבקשה תוך 30 יום כנדרש בחוק.

## 9. העברת מידע אל מחוץ לישראל
{{orgName}} אינו מעביר מידע אישי אל מחוץ לישראל לצרכיו שלו. עם זאת, לשם פעילותו הוא נעזר בספקי שירות (כגון שירותי אחסון, תוכנה וענן) שחלקם ממוקמים מחוץ לישראל, ובמסגרת זו עשוי המידע להיות מאוחסן או מעובד אצלם בהתאם לתנאי ההתקשרות עמם ולדין החל. הארגון פועל להבטיח כי ספקים אלה נוקטים אמצעי הגנה הולמים על המידע.

## 10. שינויים במדיניות
מדיניות זו עשויה להתעדכן מעת לעת. גרסה מעודכנת תפורסם בערוצי הארגון.

## 11. יצירת קשר
ממונה הגנת הפרטיות: {{dpoName}} · {{dpoEmail}}

_טיוטה אוטומטית - לא לשימוש לקוח עד אישור רועי/אמיר._`,
  },
  {
    templateId: 'd0c00006-0000-4000-8000-000000000006',
    docType: 'security_procedures',
    name: 'נוהל אבטחת מידע',
    body: `# נוהל אבטחת מידע

> טיוטה אוטומטית - לא לשימוש לקוח עד אישור משפטי (רועי/אמיר). הנוסח טעון השלמה והגהה.

**ארגון:** {{orgName}}
**ממונה הגנת הפרטיות:** {{dpoName}}

## מערכות בהיקף הנוהל
{{systems}}

## אמצעי אבטחה קיימים
{{security}}

## נהלים תפעוליים
{{procedures}}

_טיוטה אוטומטית - לא לשימוש לקוח עד אישור רועי/אמיר._`,
  },
]
