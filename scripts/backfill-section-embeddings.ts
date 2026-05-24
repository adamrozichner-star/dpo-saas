/**
 * One-shot backfill: compute Voyage embeddings for every
 * regulatory_sections row whose embedding column is still NULL.
 *
 * Run AFTER migration 030 is applied and BEFORE the first upload that
 * relies on semantic-diff. Otherwise the diff layer will classify every
 * new section as 'new' (find_similar_section skips NULL-embedding rows
 * by design).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   VOYAGE_API_KEY=... \
 *     npx tsx scripts/backfill-section-embeddings.ts
 *
 * Idempotent — re-runs only target NULL-embedding rows.
 */

import { createClient } from '@supabase/supabase-js';
import { embedDocuments, vectorToPgText, EMBEDDING_DIMS } from '../src/lib/regulatory/embeddings';

const BATCH = 10;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY must be set');
  }

  const sb = createClient(url, key);

  // Pull every row that needs an embedding. Small corpus today — a
  // single SELECT is fine. If this script ever needs to handle 10k+
  // rows, paginate.
  const { data: rows, error } = await sb
    .from('regulatory_sections')
    .select('id, content_text')
    .is('embedding', null);

  if (error) {
    throw new Error(`select failed: ${error.message}`);
  }
  if (!rows || rows.length === 0) {
    console.log('Nothing to backfill — every section already has an embedding.');
    return;
  }

  console.log(`Backfilling ${rows.length} sections in batches of ${BATCH}…`);

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const texts = chunk.map(r => r.content_text as string);
    const vecs = await embedDocuments(texts);
    if (vecs.length !== chunk.length) {
      throw new Error(`batch ${i}: embedding count mismatch (got ${vecs.length}, expected ${chunk.length})`);
    }

    // Per-row UPDATE. pgvector text-cast format keeps the supabase-js
    // client happy without needing a custom RPC.
    await Promise.all(
      chunk.map(async (r, j) => {
        const vec = vecs[j];
        if (vec.length !== EMBEDDING_DIMS) {
          throw new Error(`row ${r.id}: embedding dim ${vec.length} ≠ expected ${EMBEDDING_DIMS}`);
        }
        const { error: updErr } = await sb
          .from('regulatory_sections')
          .update({ embedding: vectorToPgText(vec) })
          .eq('id', r.id);
        if (updErr) {
          throw new Error(`update row ${r.id} failed: ${updErr.message}`);
        }
      }),
    );

    done += chunk.length;
    console.log(`  ${done}/${rows.length}`);
  }

  console.log('Backfill complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
