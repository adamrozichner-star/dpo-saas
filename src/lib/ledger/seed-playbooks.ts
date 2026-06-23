// =============================================================================
// PROVISIONAL ENGINEERING SEED - hub_control_playbooks (B3).
//
// NOT AUTHORITATIVE. Developer-authored recurring controls for the obligations
// the B2 seed mints today, ONLY to exercise the control instantiator. Cadences,
// owner roles, and checklists are placeholders PENDING LEGAL REVIEW by Amir and
// Roy. In-row markers: source_tier='expert_judgment', confidence=0.5.
//
// SCOPE: annual review controls for the 4 existing obligations. The real
// regulatory periodic controls (risk assessment / pen-test every 18 months,
// training every 2 years - from regulatory-engine.ts) are DEFERRED: their
// cadences cannot be expressed in the current cadence enum (daily..annual), and
// no gap rule mints their obligations yet. See the cadence_months follow-up in
// tasks/lessons.md.
// =============================================================================

import type { PlaybookInput } from './controls'

// Live hub_asset_templates.template_id values (verified live).
const ASSET = {
  customer_database: 'a3f23907-9276-4bea-82c2-f2f5b29a3866',
  security_cameras: 'ffc7ae0a-d500-4cf7-be37-b6965243ed4d',
} as const

export const seedPlaybooks: PlaybookInput[] = [
  {
    templateId: 'c1000001-0000-4000-8000-000000000001',
    version: 1,
    assetTemplateId: ASSET.customer_database,
    name: 'בדיקת רישום מאגר שנתית',
    description: 'בדיקה שנתית של תקפות רישום המאגר מול הרשות להגנת הפרטיות וחידוש במידת הצורך.',
    cadence: 'annual',
    ownerRole: 'dpo',
    checklist: ['לאמת שהרישום בתוקף', 'לבדוק שינויים שמחייבים עדכון רישום', 'לחדש אם פג תוקף'],
  },
  {
    templateId: 'c1000002-0000-4000-8000-000000000002',
    version: 1,
    assetTemplateId: ASSET.security_cameras,
    name: 'בדיקת מצלמות אבטחה שנתית',
    description: 'בדיקה שנתית של שילוט, מדיניות שמירת הקלטות, ותקינות מערכת המצלמות.',
    cadence: 'annual',
    ownerRole: 'owner',
    checklist: ['לוודא שילוט נראה לעין', 'לאמת מדיניות שמירת הקלטות', 'לבדוק הרשאות גישה להקלטות'],
  },
  {
    templateId: 'c1000003-0000-4000-8000-000000000003',
    version: 1,
    assetTemplateId: ASSET.customer_database,
    name: 'בדיקת הסכמי עיבוד מול ספקים שנתית',
    description: 'בדיקה שנתית של תוקף הסכמי עיבוד המידע (DPA) מול הספקים וקבלת דוח שנתי מהם.',
    cadence: 'annual',
    ownerRole: 'dpo',
    checklist: ['לוודא DPA חתום בתוקף לכל ספק', 'לבקש דוח עמידה שנתי', 'לעדכן רשימת ספקים'],
  },
]

// Deterministic map: gap-rule template_id -> the playbook whose control satisfies
// obligations minted by that rule. (No schema link exists between gap rules and
// playbooks; this is the provisional binding.)
export const ruleToPlaybook: Record<string, string> = {
  'b1000002-0000-4000-8000-000000000002': 'c1000001-0000-4000-8000-000000000001', // PPA >100k -> PPA review
  'b1000008-0000-4000-8000-000000000008': 'c1000001-0000-4000-8000-000000000001', // PPA activity -> PPA review (shared)
  'b1000003-0000-4000-8000-000000000003': 'c1000002-0000-4000-8000-000000000002', // cameras -> CCTV review
  'b1000005-0000-4000-8000-000000000005': 'c1000003-0000-4000-8000-000000000003', // processors/DPA -> DPA review
}
