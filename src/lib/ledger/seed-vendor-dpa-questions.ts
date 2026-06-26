// =============================================================================
// PROVISIONAL ENGINEERING SEED - the vendor DPA attestation set (E3).
//
// NOT AUTHORITATIVE. A short, plain, vendor-facing attestation for the Reg 15
// data-processing-agreement chase (access_links purpose 'vendor_dpa'). Wording
// and coverage are placeholders PENDING REVIEW by Amir and Roy. Every row is
// source_tier='expert_judgment', confidence=0.5.
//
// Identity model (matches seed-sysadmin-questions): each question is its own
// stable template_id at version 1; the set is grouped by VENDOR_DPA_QSET_ID
// (a question-set key, not a hub_asset_templates data asset). resolve_access_link
// returns all active rows sharing this asset_template_id, ordered by order_index.
//
// SEMANTIC KEY: question_type stays a real render type (single_choice / date /
// text - constrained by hub_questions.question_type CHECK). The machine key that
// binds an answer to a data_recipients field lives in depends_on.key (jsonb,
// returned by resolve_access_link). The public page copies depends_on.key into
// each submitted answer item as `k`; submit_access_link's vendor_dpa branch reads
// k in ('dpa_has','dpa_signed_date','dpa_expiry_date'). The page renders a date
// input for question_type='date', a select for choices, else a textarea.
// =============================================================================

// Synthetic question-set grouping id (sits next to SYSADMIN_QSET_ID ...0001).
export const VENDOR_DPA_QSET_ID = 'c5a00000-0000-4000-8000-000000000002'

export interface VendorDpaQuestion {
  templateId: string
  orderIndex: number
  questionText: string
  questionType: string
  choices: string[] | null
  required: boolean
  helpText: string | null
  key: string | null // semantic binding, stored in depends_on.key
}

export const seedVendorDpaQuestions: VendorDpaQuestion[] = [
  {
    templateId: 'c5a02001-0000-4000-8000-000000000001',
    orderIndex: 1,
    questionText: 'האם קיים הסכם עיבוד נתונים (DPA) חתום מול הארגון?',
    questionType: 'single_choice',
    choices: ['כן', 'לא'],
    required: true,
    helpText: null,
    key: 'dpa_has',
  },
  {
    templateId: 'c5a02002-0000-4000-8000-000000000002',
    orderIndex: 2,
    questionText: 'תאריך החתימה על ההסכם (אם קיים)',
    questionType: 'date',
    choices: null,
    required: false,
    helpText: 'אם אין הסכם חתום, ניתן להשאיר ריק.',
    key: 'dpa_signed_date',
  },
  {
    templateId: 'c5a02003-0000-4000-8000-000000000003',
    orderIndex: 3,
    questionText: 'תאריך חידוש או פקיעת ההסכם (אם ידוע)',
    questionType: 'date',
    choices: null,
    required: false,
    helpText: 'אם לא ידוע, נחשב שנה מתאריך החתימה.',
    key: 'dpa_expiry_date',
  },
  {
    templateId: 'c5a02004-0000-4000-8000-000000000004',
    orderIndex: 4,
    questionText: 'הערות',
    questionType: 'text',
    choices: null,
    required: false,
    helpText: null,
    key: null,
  },
]
