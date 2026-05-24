// POST /api/admin/regulatory-sources/approve — Curator approves the
// reviewed (possibly edited) draft. Persists via the existing
// regulatory_ingest_persist RPC (migration 024). FIREWALL HOLDS: the
// RPC is SECURITY DEFINER, owned by regulatory_ingest_worker.
//
// The synthetic URL convention:
//   - If curator provided source_url, that's used as the dedup key.
//   - Otherwise we use pdf-upload://<draft_id> so the row is uniquely
//     identifiable.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { persistDocument, type PersistSection, type SectionAction } from '@/lib/regulatory/persister';
import type { ParsedDocument } from '@/lib/regulatory/types';
import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

export const dynamic = 'force-dynamic';

// UI-level per-section decision. diff_status comes from the semantic-diff
// pass during extraction. resolution is only relevant when diff_status =
// 'conflict' and is set by the curator in the Stage 2 review UI.
const SECTION_SCHEMA = z.object({
  ordinal: z.number().int().min(1),
  heading: z.string().nullable(),
  anchor: z.string().nullable(),
  contentText: z.string(),
  contentHash: z.string().min(1),

  diffStatus: z.enum(['new', 'duplicate', 'conflict']).optional(),
  similarSectionId: z.string().uuid().optional(),
  resolution: z.enum(['replace', 'keep_both', 'skip']).optional(),
  embedding: z.array(z.number()).optional(),
});

const PARSED_DOC_SCHEMA = z.object({
  url: z.string(),
  title: z.string().min(1),
  sourceOrg: z.enum(['privacy_protection_authority', 'knesset', 'court', 'eu_edpb', 'other']),
  contentHash: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  sections: z.array(SECTION_SCHEMA).min(1),
});

const BODY_SCHEMA = z.object({
  draft_id: z.string().uuid(),
  storage_path: z.string().min(1),
  parsed_document: PARSED_DOC_SCHEMA,
  source_url: z.string().nullable().optional(), // override; takes precedence over parsed_document.url
});

export async function POST(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = BODY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Build the URL the persister uses as the logical document identifier.
  // Order: explicit body.source_url → parsed_document.url → synthetic.
  const url =
    input.source_url ||
    (input.parsed_document.url && input.parsed_document.url !== '' ? input.parsed_document.url : null) ||
    `pdf-upload://${input.draft_id}`;

  // Merge metadata with provenance fields.
  const metadata = {
    ...input.parsed_document.metadata,
    source: 'pdf_upload',
    storage_path: input.storage_path,
    uploaded_by: auth.userId,
  };

  const doc: ParsedDocument = {
    url,
    title: input.parsed_document.title,
    sourceOrg: input.parsed_document.sourceOrg as RegulatorySourceOrg,
    contentHash: input.parsed_document.contentHash,
    metadata,
    sections: input.parsed_document.sections.map(s => ({
      ordinal: s.ordinal,
      heading: s.heading,
      anchor: s.anchor,
      contentText: s.contentText,
      contentHash: s.contentHash,
    })),
  };

  // Translate UI-level (diffStatus + resolution) into wire-level action.
  //
  //   diffStatus='new'                            → action='insert'
  //   diffStatus='duplicate'                      → action='skip'
  //   diffStatus='conflict' + resolution='replace'  → action='replace'
  //   diffStatus='conflict' + resolution='keep_both'→ action='insert'
  //   diffStatus='conflict' + resolution='skip'     → action='skip'
  //   diffStatus undefined (legacy / no diff)     → action='insert'
  //
  // Unresolved conflicts are a 400 — the UI is supposed to gate
  // approve until every conflict has a resolution; this is defense
  // in depth.
  const persistSections: PersistSection[] = [];
  for (const s of input.parsed_document.sections) {
    let action: SectionAction;
    let targetSectionId: string | undefined;

    if (s.diffStatus === 'duplicate') {
      action = 'skip';
    } else if (s.diffStatus === 'conflict') {
      if (!s.resolution) {
        return NextResponse.json(
          {
            error: 'unresolved_conflict',
            detail: `Section ordinal ${s.ordinal} is a conflict with no resolution. Resolve all conflicts in the review UI before approving.`,
          },
          { status: 400 },
        );
      }
      if (s.resolution === 'skip') {
        action = 'skip';
      } else if (s.resolution === 'replace') {
        if (!s.similarSectionId) {
          return NextResponse.json(
            {
              error: 'replace_missing_target',
              detail: `Section ordinal ${s.ordinal} resolution=replace but no similarSectionId supplied.`,
            },
            { status: 400 },
          );
        }
        action = 'replace';
        targetSectionId = s.similarSectionId;
      } else {
        // keep_both
        action = 'insert';
      }
    } else {
      // 'new' or undefined (legacy path) → insert
      action = 'insert';
    }

    persistSections.push({
      ordinal: s.ordinal,
      heading: s.heading,
      anchor: s.anchor,
      contentText: s.contentText,
      contentHash: s.contentHash,
      action,
      targetSectionId,
      embedding: s.embedding,
    });
  }

  try {
    const result = await persistDocument(
      doc,
      {
        url,
        fetchedAt: new Date().toISOString(),
        status: 200,
        contentType: 'application/pdf',
        rawHtml: '', // No HTML for PDF uploads; raw bytes live in Storage.
        contentHash: input.parsed_document.contentHash,
      },
      persistSections,
    );

    return NextResponse.json({
      document_id: result.documentId,
      version: result.version,
      sections_count: result.sectionsCount,
      status: result.status,
      inserted: result.inserted,
      replaced: result.replaced,
      skipped: result.skipped,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'persistence_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
