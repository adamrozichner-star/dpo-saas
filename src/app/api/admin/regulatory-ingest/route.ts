// Manual trigger endpoint for the regulatory ingest pipeline.
// Curator-only (uses authenticateCurator). POST runs the orchestrator
// inline and returns the OrchestratorResult as JSON.
//
// Use for: testing on a single URL, kicking off an initial seed run
// without waiting for the cron, and verifying the firewall (a manual
// invocation that targets a hub_* table should fail).

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { runIngest } from '@/lib/regulatory/orchestrator';
import { SEED_URLS, SeedUrl } from '@/lib/regulatory/seed-urls';

export const dynamic = 'force-dynamic';
// Long-running route — give the orchestrator up to 5 minutes for the
// polite-delay-padded fetch loop over the seed list.
export const maxDuration = 300;

interface RequestBody {
  // If provided, ingest only these URLs (overrides SEED_URLS). Used for
  // smoke-testing one URL at a time.
  urls?: SeedUrl[];
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: RequestBody = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — fall through to defaults
  }
  const urls = body.urls && body.urls.length > 0 ? body.urls : SEED_URLS;

  const result = await runIngest(urls);
  return NextResponse.json(result);
}
