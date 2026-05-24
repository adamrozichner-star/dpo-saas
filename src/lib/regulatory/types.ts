// Shared types for the regulatory ingest layer.
//
// Why this lives separately from src/lib/types/regulatory.ts: those are
// the DB row shapes (RegulatoryDocument, RegulatorySection — what comes
// OUT of the database). The types here describe the IN-FLIGHT shape used
// during ingest: parsed-but-not-yet-persisted documents and fetch results.

export interface ParsedSection {
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;
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
