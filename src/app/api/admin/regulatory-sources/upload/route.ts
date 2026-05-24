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
// PDF extraction (pdf-parse + Claude call) can take 20-40s for a
// multi-page Hebrew doc. Bump the function ceiling accordingly.
export const maxDuration = 300;

const BUCKET = 'regulatory-source-pdfs';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_SOURCE_ORGS: RegulatorySourceOrg[] = [
  'privacy_protection_authority',
  'knesset',
  'court',
  'eu_edpb',
  'other',
];

export async function POST(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 });
  }

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
  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Upload to Storage. service_role bypasses storage RLS.
  const sb = getServiceSupabase();
  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: 'storage_upload_failed', detail: uploadErr.message },
      { status: 500 },
    );
  }

  // 4. Extract structure. Errors here include both pdf-parse failures
  //    and Claude JSON validation failures.
  let parsedDocument;
  try {
    parsedDocument = await extractPdfStructure(buffer, sourceOrg, sourceUrl);
  } catch (err) {
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
}
