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
]
