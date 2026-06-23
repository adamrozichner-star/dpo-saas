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
import { vectorToPgText } from './embeddings';

export interface PersistResult {
  status: 'created' | 'updated' | 'unchanged';
  documentId: string;
  version: number;
  sectionsCount: number;
  inserted: number;
  replaced: number;
  skipped: number;
}

// Per-section action vocabulary understood by migration 031's
// regulatory_ingest_persist function. UI 'keep_both' maps to 'insert'
// at the caller level (this module is action-vocabulary-agnostic).
export type SectionAction = 'insert' | 'replace' | 'skip';

export interface PersistSection {
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;
  action: SectionAction;
  targetSectionId?: string;     // required when action='replace'
  embedding?: number[];         // 1024-dim; omitted → embedding stays NULL on insert / unchanged on replace
}

export async function persistDocument(
  doc: ParsedDocument,
  fetched: FetchResult,
  sections?: PersistSection[],
  // SHA-256 of the original PDF bytes (Bug 2 byte-level dedup).
  // Optional — when absent, the row is persisted with NULL hash and
  // future re-uploads of these bytes won't short-circuit. The upload
  // route always supplies this for PDF flows; scraper flows (if/when
  // they return) may legitimately not have a single file to hash.
  fileContentHash?: string,
): Promise<PersistResult> {
  // Lazy client construction inside the function — never stored
  // module-level, never exported, never returned to callers.
  const sb: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // If the caller didn't supply per-section actions, default to
  // inserting every section under the new doc (legacy contract).
  const effectiveSections: PersistSection[] = sections ?? doc.sections.map(s => ({
    ordinal: s.ordinal,
    heading: s.heading,
    anchor: s.anchor,
    contentText: s.contentText,
    contentHash: s.contentHash,
    action: 'insert' as const,
  }));

  const { data, error } = await sb.rpc('regulatory_ingest_persist', {
    p_url: doc.url,
    p_title: doc.title,
    p_source_org: doc.sourceOrg,
    p_content_hash: doc.contentHash,
    p_raw_html: fetched.rawHtml,
    p_metadata: doc.metadata,
    p_sections: effectiveSections.map(s => ({
      ordinal: s.ordinal,
      heading: s.heading,
      anchor: s.anchor,
      content_text: s.contentText,
      content_hash: s.contentHash,
      action: s.action,
      target_section_id: s.targetSectionId ?? null,
      embedding_text: s.embedding && s.embedding.length > 0
        ? vectorToPgText(s.embedding)
        : null,
    })),
    p_file_content_hash: fileContentHash ?? null,
  });

  if (error) {
    // If the function attempts a hub_* write (via some future bad code
    // path), the error message will mention "permission denied for table
    // hub_<name>" — that's the firewall doing its job and should surface
    // visibly to the operator.
    //
    // Log the full Supabase error object (code, message, details, hint)
    // to Vercel runtime logs. The thrown Error only carries .message, so
    // missing-function / signature-mismatch / RLS errors would otherwise
    // be invisible in the structured logs.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'persist_document_rpc_failed',
      ts: new Date().toISOString(),
      supabase_error: {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
    }));
    throw new Error(`persistDocument: ${error.message}${error.hint ? ` (hint: ${error.hint})` : ''}`);
  }
  if (!data) {
    throw new Error('persistDocument: no result from regulatory_ingest_persist');
  }

  return {
    status: data.status as PersistResult['status'],
    documentId: data.document_id as string,
    version: data.version as number,
    sectionsCount: data.sections_count as number,
    inserted: (data.inserted ?? data.sections_count ?? 0) as number,
    replaced: (data.replaced ?? 0) as number,
    skipped: (data.skipped ?? 0) as number,
  };
}
