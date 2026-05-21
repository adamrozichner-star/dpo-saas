// Regulatory ingest worker — STUB ONLY.
//
// This file establishes the interface for tomorrow's actual scraper +
// parser + persister. Tonight it ships as a contract so the schema
// (migration 023) and the worker's public surface are reviewed together.
//
// ============================================================================
// ARCHITECTURAL FIREWALL — DO NOT BREAK
// ============================================================================
// This module writes to regulatory_documents and regulatory_sections
// ONLY. It MUST NOT write to any hub_* table — not directly, not via a
// helper. Hub artifacts are authored by curators in the Expert Console,
// where regulatory sections are CITED, not converted.
//
// Defense in depth: even if this module is ever modified to attempt a
// hub_* write, the regulatory_ingest_worker Postgres role (granted to
// this worker's DB connection) has no GRANT on hub_* tables and the
// write will fail at the DB layer.
//
// If you find yourself wanting to "auto-feed the Hub" — stop. That
// breaks the curator workflow and is the antipattern this firewall exists
// to prevent. Talk to the team first.
// ============================================================================

import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

// -----------------------------------------------------------------------------
// Types — the contract tomorrow's implementation fills in
// -----------------------------------------------------------------------------

export interface FetchResult {
  url: string;
  fetchedAt: string;     // ISO timestamp
  status: number;        // HTTP status
  contentType: string | null;
  rawHtml: string;       // preserved for re-parsing on schema upgrades
  contentHash: string;   // SHA256 of normalized plain text
}

export interface ParsedSection {
  ordinal: number;       // 0-based position in the document
  heading: string | null;
  anchor: string | null; // URL fragment or section number (e.g. 'section_17b')
  contentText: string;
  contentHash: string;   // SHA256 of contentText
}

export interface ParsedDocument {
  url: string;
  title: string;
  sourceOrg: RegulatorySourceOrg;
  metadata: Record<string, unknown>;
  sections: ParsedSection[];
}

// -----------------------------------------------------------------------------
// Public API — stubs
// -----------------------------------------------------------------------------

/**
 * Fetch a regulatory document. Returns raw HTML + content hash so the
 * caller can decide whether the document has changed since the last
 * fetch (compare contentHash to regulatory_documents.content_hash of the
 * latest version for this URL).
 *
 * TODO(migration 024): implement using fetch() + a User-Agent that
 * identifies Deepo + a polite delay between sequential fetches.
 */
export async function fetchDocument(_url: string): Promise<FetchResult> {
  throw new Error('not implemented — implement in 024');
}

/**
 * Parse an Israeli regulatory HTML document into ordered sections.
 * Hebrew-aware: must handle RTL text, Hebrew section numbering, and the
 * specific structure of privacyprotection.gov.il / nevo.co.il pages.
 *
 * TODO(migration 024): start with privacy_protection_authority pages,
 * then generalize. Likely uses cheerio for HTML parsing.
 */
export async function parseHebrewHtml(_html: string): Promise<ParsedSection[]> {
  throw new Error('not implemented — implement in 024');
}

/**
 * Persist a parsed document + its sections.
 *
 * Connection rules:
 *   - Uses the regulatory_ingest_worker Postgres role (NOT service_role).
 *   - Role lacks GRANTs on hub_* tables — defense in depth.
 *   - Versioning: if content_hash matches the latest version for this
 *     URL, do nothing. Otherwise insert as a new version and set the
 *     previous version's superseded_by to the new id.
 *
 * TODO(migration 024): wire up the connection that assumes the
 * regulatory_ingest_worker role. Likely pattern: connect via service_role,
 * `SET ROLE regulatory_ingest_worker` for the transaction, COMMIT, RESET.
 */
export async function persistDocument(
  _document: ParsedDocument,
  _fetch: FetchResult,
): Promise<{ documentId: string; version: number; sectionCount: number }> {
  throw new Error('not implemented — implement in 024');
}
