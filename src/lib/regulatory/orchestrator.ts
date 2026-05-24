// Orchestrator: loops over seed URLs, runs fetch → parse → persist for
// each. Sequential (not parallel) to keep polite delays meaningful and
// per-host scraping respectful.

import { fetchDocument } from './scraper';
import { parseHebrewHtml } from './parser';
import { persistDocument, PersistResult } from './persister';
import type { SeedUrl } from './seed-urls';

export interface OrchestratorResult {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  perUrl: Array<{
    url: string;
    status: 'created' | 'updated' | 'unchanged' | 'failed';
    documentId?: string;
    version?: number;
    sectionsCount?: number;
    durationMs: number;
    error?: string;
  }>;
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}

export async function runIngest(seedUrls: SeedUrl[]): Promise<OrchestratorResult> {
  const result: OrchestratorResult = {
    processed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    perUrl: [],
  };

  logEvent('ingest_start', { urlCount: seedUrls.length });

  for (const seed of seedUrls) {
    const startedAt = Date.now();
    result.processed++;
    try {
      const fetched = await fetchDocument(seed.url);
      const parsed = await parseHebrewHtml(fetched.rawHtml, fetched.url, seed.source_org);
      // Optional title override (when the source page is sparse).
      if (seed.title_override && parsed.title === '(no title)') {
        parsed.title = seed.title_override;
      }
      const persisted: PersistResult = await persistDocument(parsed, fetched);

      const durationMs = Date.now() - startedAt;
      result[persisted.status]++;
      result.perUrl.push({
        url: seed.url,
        status: persisted.status,
        documentId: persisted.documentId,
        version: persisted.version,
        sectionsCount: persisted.sectionsCount,
        durationMs,
      });
      logEvent('ingest_url_success', {
        url: seed.url,
        status: persisted.status,
        documentId: persisted.documentId,
        version: persisted.version,
        sectionsCount: persisted.sectionsCount,
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const errMsg = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.perUrl.push({
        url: seed.url,
        status: 'failed',
        durationMs,
        error: errMsg,
      });
      logEvent('ingest_url_failed', { url: seed.url, error: errMsg, durationMs });
    }
  }

  logEvent('ingest_complete', {
    processed: result.processed,
    created: result.created,
    updated: result.updated,
    unchanged: result.unchanged,
    failed: result.failed,
  });

  return result;
}
