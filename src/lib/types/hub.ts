// TS types + Zod schemas for the L1 Hub (migration 022). Every Hub artifact
// is loaded through the relevant Zod schema at the read boundary so the
// rest of the app sees camelCase TS shapes with the snake_case DB
// translation isolated here.
//
// All Hub artifacts share a common shape (template_id, version, active,
// source-tier metadata, timestamps, created_by). HubArtifactCommon is the
// TS-side mirror of that shared shape.

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type HubSourceTier =
  | 'legal'
  | 'regulatory_guidance'
  | 'industry_norm'
  | 'expert_judgment';

export type QuestionType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'single_choice'
  | 'multi_choice'
  | 'list'
  | 'date';

export type ControlCadence =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

export type GapSeverity = 'info' | 'warning' | 'critical';
export type DocumentOutputFormat = 'markdown' | 'html' | 'plain';
export type ContinuationPriceModel = 'one_time' | 'recurring' | 'quote';

export const HubSourceTierSchema = z.enum(['legal', 'regulatory_guidance', 'industry_norm', 'expert_judgment']);
export const QuestionTypeSchema = z.enum(['text', 'number', 'boolean', 'single_choice', 'multi_choice', 'list', 'date']);
export const ControlCadenceSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual']);
export const GapSeveritySchema = z.enum(['info', 'warning', 'critical']);
export const DocumentOutputFormatSchema = z.enum(['markdown', 'html', 'plain']);
export const ContinuationPriceModelSchema = z.enum(['one_time', 'recurring', 'quote']);

// -----------------------------------------------------------------------------
// Common artifact shape — fields every Hub table has
// -----------------------------------------------------------------------------

export interface HubArtifactCommon {
  id: string;
  templateId: string;
  version: number;
  active: boolean;
  sourceTier: HubSourceTier;
  confidence: number;
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  relatedSources: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

// snake_case → camelCase common-fields transform helper. Each artifact's
// schema spreads this in via z.object.merge / extension.
const commonRowShape = {
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  version: z.number().int().min(1),
  active: z.boolean(),
  source_tier: HubSourceTierSchema,
  confidence: z.number().min(0).max(1),
  last_reviewed_at: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  related_sources: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().uuid().nullable(),
};

function commonFromRow(row: {
  id: string;
  template_id: string;
  version: number;
  active: boolean;
  source_tier: HubSourceTier;
  confidence: number;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  related_sources: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}): HubArtifactCommon {
  return {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    active: row.active,
    sourceTier: row.source_tier,
    confidence: row.confidence,
    lastReviewedAt: row.last_reviewed_at,
    reviewedBy: row.reviewed_by,
    relatedSources: row.related_sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

// -----------------------------------------------------------------------------
// AssetTemplate
// -----------------------------------------------------------------------------

export interface AssetTemplate extends HubArtifactCommon {
  slug: string;
  name: string;
  definition: string;
  iconName: string | null;
  notes: string | null;
}

export const AssetTemplateSchema = z.object({
  ...commonRowShape,
  slug: z.string().min(1),
  name: z.string().min(1),
  definition: z.string(),
  icon_name: z.string().nullable(),
  notes: z.string().nullable(),
}).transform((row): AssetTemplate => ({
  ...commonFromRow(row),
  slug: row.slug,
  name: row.name,
  definition: row.definition,
  iconName: row.icon_name,
  notes: row.notes,
}));

// -----------------------------------------------------------------------------
// HubQuestion
// -----------------------------------------------------------------------------

export interface HubQuestion extends HubArtifactCommon {
  assetTemplateId: string;
  orderIndex: number;
  questionText: string;
  questionType: QuestionType;
  choices: unknown | null;
  required: boolean;
  helpText: string | null;
  dependsOn: unknown | null;
}

export const HubQuestionSchema = z.object({
  ...commonRowShape,
  asset_template_id: z.string().uuid(),
  order_index: z.number().int(),
  question_text: z.string().min(1),
  question_type: QuestionTypeSchema,
  choices: z.unknown().nullable(),
  required: z.boolean(),
  help_text: z.string().nullable(),
  depends_on: z.unknown().nullable(),
}).transform((row): HubQuestion => ({
  ...commonFromRow(row),
  assetTemplateId: row.asset_template_id,
  orderIndex: row.order_index,
  questionText: row.question_text,
  questionType: row.question_type,
  choices: row.choices,
  required: row.required,
  helpText: row.help_text,
  dependsOn: row.depends_on,
}));

// -----------------------------------------------------------------------------
// DocumentTemplate
// -----------------------------------------------------------------------------

export interface DocumentTemplate extends HubArtifactCommon {
  assetTemplateId: string;
  name: string;
  description: string | null;
  body: string;
  variables: unknown[];
  outputFormat: DocumentOutputFormat;
}

export const DocumentTemplateSchema = z.object({
  ...commonRowShape,
  asset_template_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  body: z.string(),
  variables: z.array(z.unknown()),
  output_format: DocumentOutputFormatSchema,
}).transform((row): DocumentTemplate => ({
  ...commonFromRow(row),
  assetTemplateId: row.asset_template_id,
  name: row.name,
  description: row.description,
  body: row.body,
  variables: row.variables,
  outputFormat: row.output_format,
}));

// -----------------------------------------------------------------------------
// ControlPlaybook
// -----------------------------------------------------------------------------

export interface ControlPlaybook extends HubArtifactCommon {
  assetTemplateId: string;
  name: string;
  description: string;
  cadence: ControlCadence;
  ownerRole: string | null;
  checklist: unknown[];
}

export const ControlPlaybookSchema = z.object({
  ...commonRowShape,
  asset_template_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  cadence: ControlCadenceSchema,
  owner_role: z.string().nullable(),
  checklist: z.array(z.unknown()),
}).transform((row): ControlPlaybook => ({
  ...commonFromRow(row),
  assetTemplateId: row.asset_template_id,
  name: row.name,
  description: row.description,
  cadence: row.cadence,
  ownerRole: row.owner_role,
  checklist: row.checklist,
}));

// -----------------------------------------------------------------------------
// GapRule
// -----------------------------------------------------------------------------

export interface GapRule extends HubArtifactCommon {
  assetTemplateId: string;
  name: string;
  description: string;
  severity: GapSeverity;
  ruleDsl: unknown;
  remediationText: string | null;
  continuationServiceIds: string[];
}

export const GapRuleSchema = z.object({
  ...commonRowShape,
  asset_template_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  severity: GapSeveritySchema,
  rule_dsl: z.unknown(),
  remediation_text: z.string().nullable(),
  continuation_service_ids: z.array(z.string().uuid()),
}).transform((row): GapRule => ({
  ...commonFromRow(row),
  assetTemplateId: row.asset_template_id,
  name: row.name,
  description: row.description,
  severity: row.severity,
  ruleDsl: row.rule_dsl,
  remediationText: row.remediation_text,
  continuationServiceIds: row.continuation_service_ids,
}));

// -----------------------------------------------------------------------------
// ContinuationService
// -----------------------------------------------------------------------------

export interface ContinuationService extends HubArtifactCommon {
  name: string;
  description: string;
  priceModel: ContinuationPriceModel | null;
  estimatedPriceText: string | null;
  serviceKind: string;
}

export const ContinuationServiceSchema = z.object({
  ...commonRowShape,
  name: z.string().min(1),
  description: z.string(),
  price_model: ContinuationPriceModelSchema.nullable(),
  estimated_price_text: z.string().nullable(),
  service_kind: z.string().min(1),
}).transform((row): ContinuationService => ({
  ...commonFromRow(row),
  name: row.name,
  description: row.description,
  priceModel: row.price_model,
  estimatedPriceText: row.estimated_price_text,
  serviceKind: row.service_kind,
}));
