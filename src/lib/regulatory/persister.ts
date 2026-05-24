// =============================================================================
// FIREWALL ENFORCEMENT — DO NOT MODIFY WITHOUT READING THIS
// =============================================================================
// This module is the ONLY code path that writes to regulatory_documents
// and regulatory_sections. All writes route through a single Postgres
// function call: supabase.rpc('regulatory_ingest_persist', …).
//
// The Postgres function (migration 024) is:
//   - SECURITY DEFINER (runs with the owner's privileges, not the caller's)
//   - OWNED BY regulatory_ingest_worker
//   - granted EXECUTE only to service_role; revoked from PUBLIC
//
// The worker role has GRANTs (from migration 023) on regulatory_* tables
// only. NO grants on hub_* tables. Therefore any INSERT/UPDATE inside the
// function body that targets a hub_* table fails at Postgres with
// "permission denied". That's the firewall — enforced by privilege
// separation at the function-call boundary, not by application discipline.
//
// DO NOT:
//   - export a Supabase client from this file — keep it private + lazy.
//   - cache the Supabase client at module level.
//   - add a second write path (direct INSERT, RPC to a different function).
//   - import anything from hub.ts in this file.
//   - rewrite the function body to bypass the role drop.
//
// If you need a new write capability, add it as another SECURITY DEFINER
// function in a migration, owned by the worker, granted EXECUTE to
// service_role — and call THAT from here. Don't reach around.
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FetchResult, ParsedDocument } from './types';

export interface PersistResult {
  status: 'created' | 'updated' | 'unchanged';
  documentId: string;
  version: number;
  sectionsCount: number;
}

export async function persistDocument(
  doc: ParsedDocument,
  fetched: FetchResult,
): Promise<PersistResult> {
  // Lazy client construction inside the function — never stored
  // module-level, never exported, never returned to callers.
  const sb: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await sb.rpc('regulatory_ingest_persist', {
    p_url: doc.url,
    p_title: doc.title,
    p_source_org: doc.sourceOrg,
    p_content_hash: doc.contentHash,
    p_raw_html: fetched.rawHtml,
    p_metadata: doc.metadata,
    p_sections: doc.sections.map(s => ({
      ordinal: s.ordinal,
      heading: s.heading,
      anchor: s.anchor,
      content_text: s.contentText,
      content_hash: s.contentHash,
    })),
  });

  if (error) {
    // If the function attempts a hub_* write (via some future bad code
    // path), the error message will mention "permission denied for table
    // hub_<name>" — that's the firewall doing its job and should surface
    // visibly to the operator.
    throw new Error(`persistDocument: ${error.message}`);
  }
  if (!data) {
    throw new Error('persistDocument: no result from regulatory_ingest_persist');
  }

  return {
    status: data.status as PersistResult['status'],
    documentId: data.document_id as string,
    version: data.version as number,
    sectionsCount: data.sections_count as number,
  };
}
