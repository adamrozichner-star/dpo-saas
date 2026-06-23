// GET /api/admin/regulatory-sources — list regulatory documents
// (latest active version per url, i.e. WHERE superseded_by IS NULL).
// Curator-only. Used by the regulatory-sources list page.
//
// Implementation note: routes through the list_regulatory_documents
// SECURITY DEFINER RPC (migration 032) rather than .from().select().
// PostgREST's schema cache silently returned 0 rows for this table
// after migrations 030/031, even though raw SQL returned the same
// 5 rows we expected. RPC sidesteps PostgREST's table-shape
// introspection entirely. See 032 header for the diagnosis.

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServiceSupabase();

  // Single RPC roundtrip — section_count is bundled in the return shape.
  const { data: docs, error: docsErr } = await sb.rpc('list_regulatory_documents');
  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  const rows = (docs ?? []) as Array<{
    id: string;
    url: string;
    title: string;
    source_org: string;
    version: number;
    content_hash: string;
    fetched_at: string;
    metadata: Record<string, unknown>;
    section_count: number;
  }>;

  return NextResponse.json({
    rows: rows.map(r => ({
      id: r.id,
      url: r.url,
      title: r.title,
      sourceOrg: r.source_org,
      version: r.version,
      sectionCount: r.section_count,
      fetchedAt: r.fetched_at,
      metadata: r.metadata,
    })),
  });
}
