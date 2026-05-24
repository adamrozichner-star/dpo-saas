// POST /api/admin/regulatory-sources/upload — Curator uploads a PDF.
// Server uploads to Supabase Storage (bucket: regulatory-source-pdfs)
// then extracts structure via Claude (Path B1: pdf-parse + text-only).
// Returns a draft ParsedDocument for the curator to review in Stage 2.
//
// Bucket: regulatory-source-pdfs (private, service_role only).
//   Path convention: {draft_id}.pdf
//   Created in Supabase Dashboard before this feature shipped.
//   No bucket policies — service_role bypasses storage RLS.
//
// Draft state is NOT persisted server-side. The client holds the
// ParsedDocument between upload (this route) and approve (the sibling
// route). The PDF itself stays in Storage indefinitely so re-parsing
// is always possible.

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';
import { extractPdfStructure } from '@/lib/regulatory/pdf-extractor';
import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

export const dynamic = 'force-dynamic';
// Hard 60s ceiling. Previously 300s, which masked Anthropic stalls
// by chaining retry attempts up to ~5 minutes before Vercel killed
// the function. With Haiku + retries=1 (see pdf-extractor.ts),
// extraction should comfortably fit inside 60s; anything slower is
// a real problem we want to surface fast, not patch over with more
// wall-clock budget. Also fits the Hobby plan's 60s cap.
export const maxDuration = 60;

const BUCKET = 'regulatory-source-pdfs';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_SOURCE_ORGS: RegulatorySourceOrg[] = [
  'privacy_protection_authority',
  'knesset',
  'court',
  'eu_edpb',
  'other',
];

// Tracks where in the pipeline we are when the catch-all fires.
// Kept as a let-scoped string so the wrapping try/catch can quote it
// in structured logs without each stage needing its own try/catch.
type Stage =
  | 'auth' | 'parse_form' | 'validate_file' | 'read_buffer'
  | 'storage_upload' | 'extract' | 'respond';

export async function POST(request: NextRequest) {
  let stage: Stage = 'auth';
  const startedAt = Date.now();

  try {
    const auth = await authenticateCurator(request);
    if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    stage = 'parse_form';
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 });
    }

    stage = 'validate_file';
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'pdf_invalid' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'pdf_invalid' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'pdf_too_large' }, { status: 400 });
    }

    const sourceUrlRaw = form.get('source_url');
    const sourceUrl = typeof sourceUrlRaw === 'string' && sourceUrlRaw.trim() ? sourceUrlRaw.trim() : undefined;

    const sourceOrgRaw = form.get('source_org_hint');
    let sourceOrg: RegulatorySourceOrg = 'other';
    if (typeof sourceOrgRaw === 'string' && ALLOWED_SOURCE_ORGS.includes(sourceOrgRaw as RegulatorySourceOrg)) {
      sourceOrg = sourceOrgRaw as RegulatorySourceOrg;
    }

    // 1. Generate draft id + storage path.
    const draftId = crypto.randomUUID();
    const storagePath = `${draftId}.pdf`;

    // 2. Read buffer once; reuse for both Storage upload and extraction.
    stage = 'read_buffer';
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Upload to Storage. service_role bypasses storage RLS.
    stage = 'storage_upload';
    const sb = getServiceSupabase();
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadErr) {
      console.error('[regulatory-upload] storage_upload_failed:', {
        stage,
        error: uploadErr.message,
        file_size: file.size,
        elapsed_ms: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: 'storage_upload_failed', detail: uploadErr.message },
        { status: 500 },
      );
    }

    // 4. Extract structure. Errors here include both pdf-parse failures,
    //    Claude call failures, semantic-diff failures, and JSON validation
    //    failures.
    stage = 'extract';
    let parsedDocument;
    try {
      parsedDocument = await extractPdfStructure(buffer, sourceOrg, sourceUrl);
    } catch (err) {
      console.error('[regulatory-upload] extraction_failed:', {
        stage,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        storage_path: storagePath,
        file_size: file.size,
        elapsed_ms: Date.now() - startedAt,
      });
      // Don't delete the uploaded PDF — leaving it lets the curator
      // retry extraction via a "re-parse" feature later without
      // re-uploading the file.
      return NextResponse.json(
        {
          error: 'extraction_failed',
          detail: err instanceof Error ? err.message : String(err),
          storage_path: storagePath,
        },
        { status: 500 },
      );
    }

    stage = 'respond';
    return NextResponse.json({
      draft_id: draftId,
      storage_path: storagePath,
      parsed_document: {
        url: parsedDocument.url,
        title: parsedDocument.title,
        sourceOrg: parsedDocument.sourceOrg,
        contentHash: parsedDocument.contentHash,
        metadata: parsedDocument.metadata,
        sections: parsedDocument.sections,
      },
    });
  } catch (err) {
    // Catch-all for anything we missed (timeout, OOM, unexpected
    // throw). The Hebrew user-facing message is generic on purpose;
    // the detail goes only to server logs.
    console.error('[regulatory-upload] unexpected_failure:', {
      stage,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      elapsed_ms: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: 'extraction_failed', detail: 'Internal error during upload.' },
      { status: 500 },
    );
  }
}
