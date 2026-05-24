// Regulatory ingest worker — public facade.
//
// =============================================================================
// ARCHITECTURAL FIREWALL — DO NOT BREAK
// =============================================================================
// This module ties together fetchDocument + parseHebrewHtml + persistDocument.
// All writes go through the regulatory_ingest_persist Postgres function
// (migration 024), which is SECURITY DEFINER and owned by the
// regulatory_ingest_worker role. The role has GRANTs on regulatory_*
// tables only — no grants on hub_* tables.
//
// If you find yourself wanting to import a hub.ts type or call a hub_*
// table directly from this module — stop. That breaks the curator
// workflow boundary this firewall exists to maintain.
// =============================================================================

import { fetchDocument, FetchResult } from './scraper';
import { parseHebrewHtml, ParsedDocument, ParsedSection } from './parser';
import { persistDocument, PersistResult } from './persister';
import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

export type { FetchResult, ParsedDocument, ParsedSection, PersistResult };

/**
 * Fetch one regulatory document. Retries + polite delays + robots.txt
 * awareness handled inside.
 */
export { fetchDocument };

/**
 * Parse Israeli regulatory HTML into ordered sections. Hebrew-aware.
 */
export async function parseFromHtml(
  html: string,
  sourceUrl: string,
  sourceOrg: RegulatorySourceOrg,
): Promise<ParsedDocument> {
  return parseHebrewHtml(html, sourceUrl, sourceOrg);
}

/**
 * Persist a parsed document + sections. Uses the regulatory_ingest_worker
 * Postgres role (via SECURITY DEFINER function), not service_role.
 */
export { persistDocument };
