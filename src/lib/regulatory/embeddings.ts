// Voyage AI embeddings wrapper.
//
// Model: voyage-3 (1024 dims, multilingual). Hebrew-quality is the
// reason we picked Voyage over OpenAI text-embedding-3-small — see
// supabase/migrations/030_pgvector_section_embeddings.sql header.
//
// Wire format on the Postgres side: pgvector text literal
// `[0.1, 0.2, ...]`. The vectorToPgText() helper produces that.
//
// No external SDK — Voyage's REST API is trivial enough to fetch
// directly, and avoiding the dep keeps the bundle small.

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3';
export const EMBEDDING_DIMS = 1024;

// Voyage rate-limits free tier at 3 RPM (model-dependent on paid tier).
// We batch up to MAX_BATCH inputs per request; the API itself accepts up
// to 128 per call, but smaller batches keep retries cheap if one fails.
const MAX_BATCH = 16;

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

function voyageApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error(
      'VOYAGE_API_KEY is not set. Add it to Vercel env vars (and .env.local) ' +
      'before invoking the embedding path.',
    );
  }
  return key;
}

async function callVoyage(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH) {
    throw new Error(`callVoyage: batch of ${texts.length} exceeds MAX_BATCH=${MAX_BATCH}`);
  }
  const res = await fetch(VOYAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${voyageApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      input_type: inputType,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(`Voyage embeddings ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as VoyageResponse;
  // Voyage returns results indexed in input order, but defensively sort.
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return sorted.map(r => r.embedding);
}

/**
 * Embed a list of document-style texts (typical: regulatory section bodies).
 * Splits into MAX_BATCH-sized chunks executed in parallel.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    chunks.push(texts.slice(i, i + MAX_BATCH));
  }
  const results = await Promise.all(chunks.map(c => callVoyage(c, 'document')));
  return results.flat();
}

/**
 * Embed a single query text. Use input_type='query' so Voyage applies
 * the asymmetric retrieval optimization.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await callVoyage([text], 'query');
  if (!vec || vec.length !== EMBEDDING_DIMS) {
    throw new Error(
      `embedQuery: expected ${EMBEDDING_DIMS}-dim vector, got ${vec?.length ?? 'undefined'}`,
    );
  }
  return vec;
}

/**
 * Format a number[] embedding as the pgvector text literal that
 * `(text::vector(N))` accepts.
 *
 * Important: pgvector is picky about whitespace and bracket style; this
 * canonical form has been verified against pgvector 0.7+. Do not
 * "improve" the formatting without checking.
 */
export function vectorToPgText(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
