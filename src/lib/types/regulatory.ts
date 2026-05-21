// TypeScript types + Zod schemas for the regulatory ingest schema
// (migration 023). Snake_case DB rows are parsed at the boundary and
// surfaced as camelCase TS shapes, matching the convention used by
// hub.ts and agents.ts.
//
// ARCHITECTURAL FIREWALL — this file imports nothing from hub.ts and
// must not. Regulatory types are sibling, not subordinate, to Hub types.

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enum: regulatory_source_org
// -----------------------------------------------------------------------------

export type RegulatorySourceOrg =
  | 'privacy_protection_authority'
  | 'knesset'
  | 'court'
  | 'eu_edpb'
  | 'other';

export const RegulatorySourceOrgSchema = z.enum([
  'privacy_protection_authority',
  'knesset',
  'court',
  'eu_edpb',
  'other',
]);

// -----------------------------------------------------------------------------
// RegulatoryDocument
// -----------------------------------------------------------------------------

export interface RegulatoryDocument {
  id: string;
  url: string;
  title: string;
  sourceOrg: RegulatorySourceOrg;
  version: number;
  contentHash: string;
  rawHtml: string | null;
  fetchedAt: string;
  supersededBy: string | null;
  metadata: Record<string, unknown>;
}

export const RegulatoryDocumentSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1),
  source_org: RegulatorySourceOrgSchema,
  version: z.number().int().min(1),
  content_hash: z.string().min(1),
  raw_html: z.string().nullable(),
  fetched_at: z.string(),
  superseded_by: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).default({}),
}).transform((row): RegulatoryDocument => ({
  id: row.id,
  url: row.url,
  title: row.title,
  sourceOrg: row.source_org,
  version: row.version,
  contentHash: row.content_hash,
  rawHtml: row.raw_html,
  fetchedAt: row.fetched_at,
  supersededBy: row.superseded_by,
  metadata: row.metadata,
}));

// -----------------------------------------------------------------------------
// RegulatorySection
// -----------------------------------------------------------------------------

export interface RegulatorySection {
  id: string;
  documentId: string;
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;
}

export const RegulatorySectionSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  ordinal: z.number().int().min(0),
  heading: z.string().nullable(),
  anchor: z.string().nullable(),
  content_text: z.string(),
  content_hash: z.string().min(1),
}).transform((row): RegulatorySection => ({
  id: row.id,
  documentId: row.document_id,
  ordinal: row.ordinal,
  heading: row.heading,
  anchor: row.anchor,
  contentText: row.content_text,
  contentHash: row.content_hash,
}));

// -----------------------------------------------------------------------------
// HubArtifactCitation — bridges Hub artifacts to regulatory sections.
// Polymorphic FK: artifactTable + artifactId is application-enforced
// referential integrity (target table is dynamic).
// -----------------------------------------------------------------------------

export interface HubArtifactCitation {
  id: string;
  artifactTable: string;
  artifactId: string;
  artifactVersion: number;
  regulatorySectionId: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const HubArtifactCitationSchema = z.object({
  id: z.string().uuid(),
  artifact_table: z.string().min(1),
  artifact_id: z.string().uuid(),
  artifact_version: z.number().int().min(1),
  regulatory_section_id: z.string().uuid(),
  note: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
}).transform((row): HubArtifactCitation => ({
  id: row.id,
  artifactTable: row.artifact_table,
  artifactId: row.artifact_id,
  artifactVersion: row.artifact_version,
  regulatorySectionId: row.regulatory_section_id,
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at,
}));
