// Persister — calls the regulatory_ingest_persist Postgres function via
// supabase.rpc(). The function (migration 024) is SECURITY DEFINER owned
// by regulatory_ingest_worker, so the firewall is enforced at the
// function-call boundary: writes inside the function body execute with
// worker privileges (regulatory_* allowed, hub_* denied).
//
// Service-role Supabase client is the caller. The firewall is NOT the
// Supabase JS client's privilege; it's the function-ownership boundary.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FetchResult } from './scraper';
import type { ParsedDocument } from './parser';

export interface PersistResult {
  status: 'created' | 'updated' | 'unchanged';
  documentId: string;
  version: number;
  sectionsCount: number;
}

function serviceSupabase(): SupabaseClient {
  // The OUTER caller is service_role — required to invoke the RPC. The
  // actual WRITES happen inside regulatory_ingest_persist(), which is
  // SECURITY DEFINER and owned by regulatory_ingest_worker. Inside that
  // function body, the effective role is the worker, and any hub_* write
  // attempt fails with "permission denied". This is the firewall: the
  // caller's privilege ≠ the writes' privilege.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function persistDocument(
  doc: ParsedDocument,
  fetched: FetchResult,
): Promise<PersistResult> {
  const sb = serviceSupabase();

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
    // If the function attempts a hub_* write (e.g. via future bad code),
    // the error message will mention "permission denied for table
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
