// GET /api/admin/regulatory-sources/stats — lightweight library overview
// for the curator console.
//
// Routes through the list_regulatory_documents_stats RPC (migration 032)
// rather than .from().select() because PostgREST's schema cache returns
// 0 rows on these tables after migrations 030/031. See 032 header.
//
// The RPC returns the exact wire shape this endpoint exposes
// (total_documents, total_sections, documents_by_source, latest_uploads),
// so the handler is essentially a pass-through with auth + error
// remapping.

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServiceSupabase();

  const { data, error } = await sb.rpc('list_regulatory_documents_stats');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC returns the response payload directly as jsonb; pass through.
  return NextResponse.json(data);
}
