// GET /api/admin/regulatory-sources/stats — lightweight library overview
// for the curator console. Counts only current (non-superseded) versions.
//
// Idempotency check: re-uploading the same PDF should leave total_documents
// unchanged (the ingest function returns status='unchanged' on matching
// content_hash and does not bump the version row).

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface LatestUpload {
  id: string;
  title: string;
  version: number;
  fetched_at: string;
  section_count: number;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServiceSupabase();

  // Pull the document slice we need. Small corpus, single query is fine.
  // We keep `metadata` so we can group by `metadata->>source` (pdf_upload,
  // scraper, etc.) without a second roundtrip.
  const { data: docs, error: docsErr } = await sb
    .from('regulatory_documents')
    .select('id, title, version, fetched_at, metadata')
    .is('superseded_by', null)
    .order('fetched_at', { ascending: false });

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  const rows = docs ?? [];
  const docIds = rows.map(r => r.id as string);

  // Per-document section counts via a single in() then in-memory tally.
  const sectionCounts: Record<string, number> = {};
  let totalSections = 0;
  if (docIds.length > 0) {
    const { data: sectionRows, error: sectionsErr } = await sb
      .from('regulatory_sections')
      .select('document_id')
      .in('document_id', docIds);
    if (sectionsErr) {
      return NextResponse.json({ error: sectionsErr.message }, { status: 500 });
    }
    for (const sr of sectionRows ?? []) {
      const did = sr.document_id as string;
      sectionCounts[did] = (sectionCounts[did] ?? 0) + 1;
      totalSections += 1;
    }
  }

  // Group by ingest method (metadata.source). Approve route currently
  // tags 'pdf_upload'; future scraper path would tag 'scraper'. Anything
  // missing or unknown lands in 'unknown' so we never silently drop rows.
  const documentsBySource: Record<string, number> = {};
  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const src = typeof meta.source === 'string' ? meta.source : 'unknown';
    documentsBySource[src] = (documentsBySource[src] ?? 0) + 1;
  }

  const latestUploads: LatestUpload[] = rows.slice(0, 5).map(r => ({
    id: r.id as string,
    title: r.title as string,
    version: r.version as number,
    fetched_at: r.fetched_at as string,
    section_count: sectionCounts[r.id as string] ?? 0,
  }));

  return NextResponse.json({
    total_documents: rows.length,
    total_sections: totalSections,
    documents_by_source: documentsBySource,
    latest_uploads: latestUploads,
  });
}
