// Shared types for the regulatory ingest layer.
//
// Why this lives separately from src/lib/types/regulatory.ts: those are
// the DB row shapes (RegulatoryDocument, RegulatorySection — what comes
// OUT of the database). The types here describe the IN-FLIGHT shape used
// during ingest: parsed-but-not-yet-persisted documents and fetch results.

export type DiffStatus = 'new' | 'duplicate' | 'conflict';

export interface SimilarSectionPreview {
  id: string;
  documentId: string;
  documentTitle: string;
  ordinal: number;
  heading: string | null;
  contentText: string;
}

export interface ParsedSection {
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;

  // Semantic-diff fields. Populated by extractPdfStructure when an
  // embedding model + library exist; absent on legacy callers.
  // The embedding is carried on the proposal so persist doesn't re-embed.
  diffStatus?: DiffStatus;
  similarity?: number | null;
  similarSection?: SimilarSectionPreview | null;
  embedding?: number[];
}

export interface ParsedDocument {
  url: string;
  title: string;
  sourceOrg: 'privacy_protection_authority' | 'knesset' | 'court' | 'eu_edpb' | 'other';
  contentHash: string;
  metadata: Record<string, unknown>;
  sections: ParsedSection[];
}

// FetchResult is currently only used internally by the persister to
// satisfy the regulatory_ingest_persist RPC's raw_html parameter. For
// PDF uploads we pass an empty rawHtml; the actual PDF bytes live in
// Supabase Storage.
export interface FetchResult {
  url: string;
  fetchedAt: string;
  status: number;
  contentType: string | null;
  rawHtml: string;
  contentHash: string;
}
