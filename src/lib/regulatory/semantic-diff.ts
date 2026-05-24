// Semantic diff for the regulatory ingest pipeline.
//
// Given a freshly extracted document, embed each section, look up the
// closest existing section in the library via the find_similar_section
// RPC (migration 030), and classify by cosine similarity:
//
//   sim >= 0.92    → 'duplicate'   (already in the brain — drop on persist)
//   0.75 <= sim    → 'conflict'    (similar topic, different content)
//   sim <  0.75    → 'new'         (genuinely new knowledge)
//
// Thresholds are tunable in one place (THRESHOLDS below). If we change
// embedding models, these may need re-calibrating with a small holdout.
//
// IMPORTANT: this module assumes embeddings have been backfilled for
// existing rows (scripts/backfill-section-embeddings.ts). Sections with
// NULL embeddings are invisible to find_similar_section — a freshly
// applied 030 with no backfill will classify EVERY new section as 'new'
// because there's nothing to compare against.

import { getServiceSupabase } from '@/lib/api-auth';
import { embedDocuments, vectorToPgText } from '@/lib/regulatory/embeddings';

export type DiffStatus = 'new' | 'duplicate' | 'conflict';

export interface SimilarSectionPreview {
  id: string;
  documentId: string;
  documentTitle: string;
  ordinal: number;
  heading: string | null;
  contentText: string;
}

export interface SectionDiff {
  diffStatus: DiffStatus;
  similarity: number | null;
  similarSection: SimilarSectionPreview | null;
  embedding: number[]; // kept on the proposal so persist doesn't re-embed
}

export const THRESHOLDS = {
  duplicate: 0.92,
  conflict: 0.75,
} as const;

/**
 * Compute embeddings for all section texts in one shot, then issue a
 * top-1 similarity lookup per section. Returns an array aligned 1:1
 * with the input.
 *
 * Single Supabase RPC per section (cheap; corpus is small). If/when the
 * library grows past a few thousand sections, batch this into a single
 * SQL function that takes an array of embeddings.
 */
export async function diffSections(
  texts: string[],
): Promise<SectionDiff[]> {
  if (texts.length === 0) return [];

  const sb = getServiceSupabase();
  const embeddings = await embedDocuments(texts);

  if (embeddings.length !== texts.length) {
    throw new Error(
      `diffSections: embedding count ${embeddings.length} ≠ input count ${texts.length}`,
    );
  }

  // Issue lookups in parallel — they're independent.
  const results = await Promise.all(
    embeddings.map(async (vec): Promise<SectionDiff> => {
      const { data, error } = await sb.rpc('find_similar_section', {
        p_embedding: vectorToPgText(vec),
        p_limit: 1,
      });
      if (error) {
        throw new Error(`find_similar_section RPC failed: ${error.message}`);
      }
      const top = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (!top) {
        // Library is empty (or all rows lack embeddings). Treat as 'new'.
        return {
          diffStatus: 'new',
          similarity: null,
          similarSection: null,
          embedding: vec,
        };
      }

      const sim = typeof top.similarity === 'number' ? top.similarity : 0;
      const status: DiffStatus =
        sim >= THRESHOLDS.duplicate ? 'duplicate' :
        sim >= THRESHOLDS.conflict  ? 'conflict' :
                                      'new';

      return {
        diffStatus: status,
        similarity: sim,
        similarSection: {
          id: top.id as string,
          documentId: top.document_id as string,
          documentTitle: top.document_title as string,
          ordinal: top.ordinal as number,
          heading: (top.heading ?? null) as string | null,
          contentText: top.content_text as string,
        },
        embedding: vec,
      };
    }),
  );

  return results;
}
