// PDF extraction — Path B1 (pdf-parse + text-only Claude).
//
// Why this path: Anthropic SDK 0.20.x predates native PDF input support
// (added in late 2024 SDK 0.30+). Upgrading the SDK on a tight deadline
// risks breaking the existing chat wrapper. pdf-parse extracts plain
// text from the PDF buffer; we then pass that text + structured-output
// instructions to Claude via the existing createMessage() wrapper.
//
// Curator review (Stage 2 of the upload UI) is the quality gate.
// Extraction quirks (Hebrew RTL ordering, missed section boundaries)
// are caught and corrected before the document is persisted.

import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import { z } from 'zod';
import { createMessage } from '@/lib/anthropic';
import type { RegulatorySourceOrg } from '@/lib/types/regulatory';
import type { ParsedDocument } from './types';
import { diffSections } from './semantic-diff';

// Model selection: Haiku 4.5 over Sonnet 4.6 for the extraction call.
// Haiku is ~3-5× faster and the structured-output task (parse Hebrew
// text into a flat JSON schema) does not depend on Sonnet's deeper
// reasoning. Tradeoff: Haiku is less nuanced on Hebrew legal
// terminology — occasional section-boundary misses are the expected
// failure mode. Curator review (Stage 2) is the quality gate.
// If Haiku output quality regresses materially, revisit by promoting
// only complex doc types (court rulings, multi-section laws) back to
// Sonnet behind a per-source-org flag.
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You are a Hebrew legal document parser. Extract the structure of this regulatory document as JSON. Return ONLY a JSON object, no prose, no markdown fences. Schema:
{
  "title": string (the document title in Hebrew),
  "detected_source_org": one of ["privacy_protection_authority", "knesset", "court", "eu_edpb", "other"] | null,
  "publication_date": ISO date string (YYYY-MM-DD) or null,
  "sections": [
    {
      "ordinal": number (sequential 1, 2, 3...),
      "heading": string (Hebrew section heading) | null,
      "anchor": string (section number like 'סעיף 17ב' or slug) | null,
      "content_text": string (the section's plain text content in Hebrew)
    }
  ]
}

Rules:
- Preserve Hebrew text exactly as written. Do not translate.
- For laws: each סעיף (section) is one section.
- For guidance docs: each numbered heading is one section.
- If document is one continuous text with no clear sections, return a single section with the whole text.
- anchor should be the formal citation reference (e.g., 'סעיף 17ב', 'סימן 2'), or a slugified heading if no formal anchor exists.
- content_text is plain text only, no formatting.`;

// Zod schema mirroring the JSON contract above.
const ClaudeJsonSchema = z.object({
  title: z.string().min(1),
  detected_source_org: z
    .enum(['privacy_protection_authority', 'knesset', 'court', 'eu_edpb', 'other'])
    .nullable(),
  publication_date: z.string().nullable(),
  sections: z
    .array(
      z.object({
        ordinal: z.number().int().min(1),
        heading: z.string().nullable(),
        anchor: z.string().nullable(),
        content_text: z.string(),
      }),
    )
    .min(1),
});

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Best-effort JSON extraction. Claude usually returns clean JSON when
// instructed to, but occasionally wraps in ```json ... ``` despite the
// prompt. Strip code fences before parsing.
function tryExtractJson(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(cleaned);
}

export async function extractPdfStructure(
  pdfBuffer: Buffer,
  sourceOrg: RegulatorySourceOrg,
  sourceUrl?: string,
): Promise<ParsedDocument> {
  // 1. pdf-parse extracts plain text from the buffer. For Hebrew PDFs,
  //    RTL text ordering can be quirky — curator review is the fallback.
  let pdfText: string;
  try {
    const parsed = await pdfParse(pdfBuffer);
    pdfText = parsed.text;
  } catch (err) {
    throw new Error(`pdf-parse failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error('pdf-parse returned empty text — PDF may be image-only or corrupted');
  }

  // 2. Send to Claude with structured-output instructions.
  const userContent = `Parse the following Hebrew regulatory document text into the JSON schema described in the system prompt.

\`\`\`
${pdfText}
\`\`\``;

  let claudeResponse;
  try {
    // retries: 1 — the route runs inside a 60s Vercel function. The
    // default 3-retry budget (1s + 2s + 4s backoff plus up to 3×60s
    // per-attempt timeout) cannot fit. One attempt; if it fails the
    // curator retries the upload.
    claudeResponse = await createMessage(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      },
      { retries: 1 },
    );
  } catch (err) {
    throw new Error(`Claude extraction call failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Pull text content out of the response.
  const textBlock = claudeResponse.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }
  const rawText = textBlock.text;

  // 4. Parse + validate.
  let parsedJson: unknown;
  try {
    parsedJson = tryExtractJson(rawText);
  } catch (err) {
    throw new Error(
      `Claude returned invalid JSON. Raw response (first 500 chars): ${rawText.slice(0, 500)}`,
    );
  }

  const validated = ClaudeJsonSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(
      `Claude JSON failed schema validation: ${validated.error.message}. Raw (first 500 chars): ${rawText.slice(0, 500)}`,
    );
  }

  // 5. Compute document-level content hash from sections.
  const allContent = validated.data.sections.map(s => s.content_text).join('\n');
  const contentHash = sha256(allContent);

  // 6. Honor the caller's source_org hint over Claude's detection
  //    (curator review can adjust further before approve).
  const effectiveSourceOrg = sourceOrg || validated.data.detected_source_org || 'other';

  const metadata: Record<string, unknown> = {};
  if (validated.data.publication_date) metadata.publication_date = validated.data.publication_date;
  if (validated.data.detected_source_org) metadata.detected_source_org = validated.data.detected_source_org;

  const baseSections = validated.data.sections.map(s => ({
    ordinal: s.ordinal,
    heading: s.heading,
    anchor: s.anchor,
    contentText: s.content_text,
    contentHash: sha256(s.content_text),
  }));

  // 7. Semantic diff: embed + classify each section against the
  //    existing library. If diff fails (Voyage outage, missing API key,
  //    empty library) we fall back to treating every section as 'new'
  //    so the upload flow stays unblocked. Curator can still proceed
  //    and the failure is logged for visibility.
  let diffResults: Awaited<ReturnType<typeof diffSections>> = [];
  try {
    diffResults = await diffSections(baseSections.map(s => s.contentText));
  } catch (err) {
    console.error('[regulatory] semantic-diff failed; falling back to all-new:', err);
    diffResults = baseSections.map(() => ({
      diffStatus: 'new' as const,
      similarity: null,
      similarSection: null,
      embedding: [],
    }));
  }

  const sections = baseSections.map((s, i) => ({
    ...s,
    diffStatus: diffResults[i]?.diffStatus,
    similarity: diffResults[i]?.similarity ?? null,
    similarSection: diffResults[i]?.similarSection ?? null,
    embedding: diffResults[i]?.embedding ?? [],
  }));

  return {
    url: sourceUrl ?? '',
    title: validated.data.title,
    sourceOrg: effectiveSourceOrg,
    contentHash,
    metadata,
    sections,
  };
}
