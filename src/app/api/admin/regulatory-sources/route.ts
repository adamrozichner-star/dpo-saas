// GET /api/admin/regulatory-sources — list regulatory documents
// (latest active version per url, i.e. WHERE superseded_by IS NULL).
// Curator-only. Used by the regulatory-sources list page.

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServiceSupabase();

  // Latest (non-superseded) versions only. Pull per-doc section count
  // via a separate aggregate; small corpus, so cost is fine.
  const { data: docs, error: docsErr } = await sb
    .from('regulatory_documents')
    .select('id, url, title, source_org, version, content_hash, fetched_at, metadata')
    .is('superseded_by', null)
    .order('fetched_at', { ascending: false })
    .limit(200);

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  const rows = docs ?? [];
  const docIds = rows.map(r => r.id as string);
  const counts: Record<string, number> = {};
  if (docIds.length > 0) {
    const { data: sectionRows } = await sb
      .from('regulatory_sections')
      .select('document_id')
      .in('document_id', docIds);
    for (const sr of sectionRows ?? []) {
      const did = sr.document_id as string;
      counts[did] = (counts[did] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    rows: rows.map(r => ({
      id: r.id,
      url: r.url,
      title: r.title,
      sourceOrg: r.source_org,
      version: r.version,
      sectionCount: counts[r.id as string] ?? 0,
      fetchedAt: r.fetched_at,
      metadata: r.metadata,
    })),
  });
}
