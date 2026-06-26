// =============================================================================
// PROVISIONAL ENGINEERING SEED - the sysadmin security questionnaire (E2).
//
// NOT AUTHORITATIVE. A short, plain, sysadmin-facing question set authored to
// wire the first real collection purpose (access_links purpose
// 'sysadmin_questionnaire') end to end. Wording, coverage, and the choices are
// placeholders PENDING REVIEW by Amir and Roy before anything is treated as
// real or surfaced to a customer as authoritative. Every row is marked
// source_tier='expert_judgment', confidence=0.5.
//
// Identity model (matches hub_questions): each question is its own stable
// template_id at version 1; the whole SET is grouped by a single
// asset_template_id (SYSADMIN_QSET_ID). hub_questions.asset_template_id has no
// FK, and this set is intentionally NOT a data asset - it is a question-set
// grouping key, distinct from the hub_asset_templates catalog. resolve_access_link
// returns all active hub_questions sharing this asset_template_id, ordered by
// order_index.
//
// This set is reusable: a DPO attaches it to whichever obligation needs
// infrastructure/security input from a sysadmin (it is not bound to one rule).
// =============================================================================

// Synthetic question-set grouping id (NOT a hub_asset_templates row).
export const SYSADMIN_QSET_ID = 'c5a00000-0000-4000-8000-000000000001'

export interface SysadminQuestion {
  templateId: string
  orderIndex: number
  questionText: string
  questionType: string
  choices: string[] | null
  required: boolean
  helpText: string | null
}

export const seedSysadminQuestions: SysadminQuestion[] = [
  {
    templateId: 'c5a01001-0000-4000-8000-000000000001',
    orderIndex: 1,
    questionText: 'האם מתבצעים גיבויים שוטפים של המערכות והמאגרים?',
    questionType: 'single_choice',
    choices: ['כן', 'לא', 'חלקי'],
    required: true,
    helpText: null,
  },
  {
    templateId: 'c5a01002-0000-4000-8000-000000000002',
    orderIndex: 2,
    questionText: 'האם בוצעה בדיקת שחזור מגיבוי ב-12 החודשים האחרונים?',
    questionType: 'single_choice',
    choices: ['כן', 'לא', 'לא ידוע'],
    required: true,
    helpText: 'גיבוי שלא נבדק בשחזור אינו גיבוי שאפשר לסמוך עליו.',
  },
  {
    templateId: 'c5a01003-0000-4000-8000-000000000003',
    orderIndex: 3,
    questionText: 'האם הגישה למערכות הרגישות מוגנת באימות דו-שלבי?',
    questionType: 'single_choice',
    choices: ['כן', 'לא', 'חלקי'],
    required: true,
    helpText: null,
  },
  {
    templateId: 'c5a01004-0000-4000-8000-000000000004',
    orderIndex: 4,
    questionText: 'האם קיימת מדיניות הרשאות, ומתבצעת בדיקה תקופתית של מי ניגש למה?',
    questionType: 'single_choice',
    choices: ['כן', 'לא', 'בחלקו'],
    required: true,
    helpText: null,
  },
  {
    templateId: 'c5a01005-0000-4000-8000-000000000005',
    orderIndex: 5,
    questionText: 'האם נשמרים יומני גישה (לוגים) למערכות שמכילות מידע אישי?',
    questionType: 'single_choice',
    choices: ['כן', 'לא', 'חלקי'],
    required: true,
    helpText: null,
  },
  {
    templateId: 'c5a01006-0000-4000-8000-000000000006',
    orderIndex: 6,
    questionText: 'האם יש תיקיות רשת משותפות עם מידע אישי? אם כן, מי ניגש אליהן?',
    questionType: 'text',
    choices: null,
    required: false,
    helpText: 'תיאור חופשי קצר.',
  },
  {
    templateId: 'c5a01007-0000-4000-8000-000000000007',
    orderIndex: 7,
    questionText: 'האם קיימות מערכות ישנות או מורשת שאינן מעודכנות ומכילות מידע אישי?',
    questionType: 'text',
    choices: null,
    required: false,
    helpText: 'תיאור חופשי קצר.',
  },
]
