// =============================================================================
// PROVISIONAL ENGINEERING SEED - hub_gap_rules.
//
// NOT AUTHORITATIVE. These rules are a developer-authored starter set, hand
// translated from the legacy hardcoded logic (src/lib/compliance-engine.ts and
// src/lib/regulatory-engine.ts) purely to exercise the evaluator end to end.
// The wording, severities, thresholds, and legal mapping are placeholders
// PENDING LEGAL REVIEW by Amir and Roy before anything is treated as real.
// Do not surface these to customers or rely on them for compliance.
//
// Identity model (matches the hub catalog): each rule has a stable template_id
// and version 1. asset_template_id points at a live hub_asset_templates row
// (template_id values read from the live catalog on 2026-06-23). rule_dsl is a
// Condition (see dsl.ts), tested against the facts from facts.ts.
// =============================================================================

import type { GapRuleInput } from './evaluator'

// Live hub_asset_templates.template_id values (verified live).
const ASSET = {
  customer_database: 'a3f23907-9276-4bea-82c2-f2f5b29a3866',
  mailing_list: '821b070d-db56-46b3-b510-fd906619d87f',
  security_cameras: 'ffc7ae0a-d500-4cf7-be37-b6965243ed4d',
} as const

// PR12: ledger-backed compliance stats. Maps a gap-rule templateId to the legacy
// ancillary stat its obligation implies (securityLevel/needsReporting/needsCiso).
// The rules ALREADY evaluated these thresholds and minted the obligations; this
// lets buildLedgerSummary derive the stats from obligation provenance instead of
// re-running the legacy engine. CO-LOCATED with the rules ON PURPOSE: revising a
// rule's regulatory meaning means revising this map. A rule with no entry has no
// stat impact (safe default: basic / false). Keyed by templateId (== obligations.source_rule_id).
export const RULE_STAT_IMPACT: Record<string, { needsReporting?: boolean; securityHigh?: boolean; needsCiso?: boolean }> = {
  'b1000001-0000-4000-8000-000000000001': { securityHigh: true },   // medical + significant volume -> high security level
  'b1000002-0000-4000-8000-000000000002': { needsReporting: true }, // over 100,000 subjects -> database registration
  'b1000006-0000-4000-8000-000000000006': { needsCiso: true },      // access too broad to sensitive data -> CISO consideration
  'b1000008-0000-4000-8000-000000000008': { needsReporting: true }, // processing activity -> database registration
}

export const seedGapRules: GapRuleInput[] = [
  {
    templateId: 'b1000001-0000-4000-8000-000000000001',
    version: 1,
    name: 'מידע רפואי בהיקף משמעותי מחייב רמת אבטחה גבוהה',
    description:
      'הארגון מנהל מאגר עם מידע רפואי וכ-10,000 רשומות או יותר. נדרשת עמידה במשטר אבטחת המידע ברמה הגבוהה.',
    severity: 'critical',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: { all: [{ fact: 'hasMedical', op: 'eq', value: true }, { fact: 'totalRecords', op: 'gte', value: 10000 }] },
  },
  {
    templateId: 'b1000002-0000-4000-8000-000000000002',
    version: 1,
    name: 'היקף נושאי מידע מעל 100,000 מחייב רישום מאגר',
    description: 'מספר נושאי המידע המוערך עולה על 100,000. נדרש לבחון חובת רישום מאגר מול הרשות להגנת הפרטיות.',
    severity: 'critical',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: { fact: 'totalRecords', op: 'gte', value: 100000 },
  },
  {
    templateId: 'b1000003-0000-4000-8000-000000000003',
    version: 1,
    name: 'מצלמות אבטחה מחייבות שילוט וניהול הקלטות',
    description: 'קיימת מערכת מצלמות. נדרש שילוט נראה לעין, מדיניות שמירת הקלטות, והגדרת אחראי על המערכת.',
    severity: 'warning',
    assetTemplateId: ASSET.security_cameras,
    ruleDsl: { fact: 'hasCameras', op: 'eq', value: true },
  },
  {
    templateId: 'b1000004-0000-4000-8000-000000000004',
    version: 1,
    name: 'דיוור שיווקי ללא מנגנון הסכמה',
    description: 'הארגון אוסף לידים מהאתר אך אין מנגנון הסכמה מתועד. נדרש מנגנון הסכמה לפי סעיף 30א לחוק התקשורת.',
    severity: 'critical',
    assetTemplateId: ASSET.mailing_list,
    ruleDsl: { all: [{ fact: 'hasWebLeads', op: 'eq', value: true }, { fact: 'hasConsent', op: 'eq', value: 'no' }] },
  },
  {
    templateId: 'b1000005-0000-4000-8000-000000000005',
    version: 1,
    name: 'התקשרות עם מעבדי מידע מחייבת הסכם עיבוד',
    description: 'הארגון נעזר בספקים המעבדים מידע אישי. נדרש הסכם עיבוד מידע (DPA) חתום מול כל מעבד.',
    severity: 'warning',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: { fact: 'processorCount', op: 'gte', value: 1 },
  },
  {
    templateId: 'b1000006-0000-4000-8000-000000000006',
    version: 1,
    name: 'הרשאת גישה רחבה מדי למידע רגיש',
    description: 'הגישה למידע פתוחה לכלל העובדים בעוד שהארגון מחזיק מידע רגיש. נדרש צמצום הרשאות לפי הצורך.',
    severity: 'warning',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: {
      all: [
        { fact: 'accessControl', op: 'eq', value: 'all' },
        { any: [{ fact: 'hasMedical', op: 'eq', value: true }, { fact: 'isHealthOrFinance', op: 'eq', value: true }] },
      ],
    },
  },
  {
    templateId: 'b1000007-0000-4000-8000-000000000007',
    version: 1,
    name: 'פעילות עיבוד מחייבת תסקיר השפעה על הפרטיות',
    description: 'אחת מפעילויות העיבוד סומנה כדורשת תסקיר השפעה על הפרטיות (DPIA). נדרש לבצע ולתעד את התסקיר.',
    severity: 'warning',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: { fact: 'anyRequiresDpia', op: 'eq', value: true },
  },
  {
    templateId: 'b1000008-0000-4000-8000-000000000008',
    version: 1,
    name: 'פעילות עיבוד מחייבת רישום מאגר',
    description: 'אחת מפעילויות העיבוד סומנה כדורשת רישום מאגר. נדרש להשלים את הרישום מול הרשות להגנת הפרטיות.',
    severity: 'critical',
    assetTemplateId: ASSET.customer_database,
    ruleDsl: { fact: 'anyRequiresPpa', op: 'eq', value: true },
  },
]
