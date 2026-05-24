// Hebrew-aware regulatory HTML parser using cheerio.
//
// Behavior:
//   - Title from <title>, fallback to first <h1>
//   - Sections: every h1-h4 starts a new section; content runs until the
//     next heading.
//   - Plain text: tags stripped, whitespace normalized, paragraph breaks
//     preserved as double-newlines.
//   - Anchors: existing id= attribute on the heading wins; otherwise a
//     slug derived from the heading text with niqqud stripped.
//   - Hebrew law section numbering (e.g. "סעיף 17ב") is preserved in the
//     anchor when no id= is available — it's the typical citation handle.
//   - Per-section content_hash + document-level content_hash for change
//     detection.
//   - NFC normalization on all extracted text; niqqud (vowel marks)
//     stripped from anchors only, preserved in content.

import { load } from 'cheerio';
import { createHash } from 'crypto';
import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

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
  sourceOrg: RegulatorySourceOrg;
  contentHash: string;
  metadata: Record<string, unknown>;
  sections: ParsedSection[];
}

// Hebrew accent / cantillation marks (niqqud + ta'amei mikra)
const NIQQUD_REGEX = /[֑-ׇ]/g;

// Hebrew letters + Latin alphanumerics. Everything else becomes a separator.
const SLUG_PRESERVE = /[א-תa-zA-Z0-9]+/g;

// Pattern for Israeli law section numbering. "סעיף 17ב", "סעיף ד", etc.
// Used as a fallback anchor when explicit id is missing AND the heading
// itself matches the pattern (gives a stable, citable anchor).
const LAW_SECTION_REGEX = /(סעיף\s*[א-ת]?\d+[א-ת]?)/;

function normalizeText(text: string): string {
  return text.normalize('NFC');
}

function stripNiqqud(text: string): string {
  return text.replace(NIQQUD_REGEX, '');
}

// Slugify a heading for anchor use:
//   - NFC normalize
//   - strip niqqud
//   - keep Hebrew + Latin alphanumerics; collapse everything else to '-'
//   - lowercase
//   - trim leading/trailing '-'
function slugify(text: string): string {
  const normalized = stripNiqqud(normalizeText(text));
  const parts = normalized.match(SLUG_PRESERVE) ?? [];
  return parts.join('-').toLowerCase().slice(0, 200);
}

// Detect Hebrew law section number in a heading (e.g. "סעיף 17ב — פרטיות").
// Returns the canonical section token or null.
function detectLawSectionAnchor(headingText: string): string | null {
  const m = headingText.match(LAW_SECTION_REGEX);
  if (!m) return null;
  // Normalize whitespace inside the matched token and strip niqqud.
  return stripNiqqud(m[1]).replace(/\s+/g, '_');
}

// Hash arbitrary normalized text.
function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Convert a cheerio element's text content to a clean paragraph-aware string.
// Children block elements separated by double-newlines; inline by spaces;
// whitespace collapsed.
function elementText($: ReturnType<typeof load>, el: ReturnType<ReturnType<typeof load>>): string {
  // cheerio doesn't preserve paragraph boundaries via .text(); approximate
  // by joining block-level children with \n\n, fallback to .text() for
  // simple cases.
  const blockSelector = 'p, br, li, div, tr, blockquote';
  const chunks: string[] = [];

  el.find(blockSelector).each((_: number, node) => {
    const t = $(node).text().replace(/\s+/g, ' ').trim();
    if (t) chunks.push(t);
  });

  if (chunks.length === 0) {
    const t = el.text().replace(/\s+/g, ' ').trim();
    return normalizeText(t);
  }
  return normalizeText(chunks.join('\n\n'));
}

export async function parseHebrewHtml(
  html: string,
  sourceUrl: string,
  sourceOrg: RegulatorySourceOrg,
): Promise<ParsedDocument> {
  const $ = load(html);

  // Title: <title> first, then first <h1>, then fallback "(no title)".
  let title = $('title').first().text().trim();
  if (!title) title = $('h1').first().text().trim();
  if (!title) title = '(no title)';
  title = normalizeText(title);

  // Metadata: best-effort pickups. Mostly meta tags.
  const metadata: Record<string, unknown> = {};
  $('meta[name="description"]').each((_, el) => {
    const v = $(el).attr('content');
    if (v) metadata.description = normalizeText(v);
  });
  $('meta[property="og:title"]').each((_, el) => {
    const v = $(el).attr('content');
    if (v) metadata.og_title = normalizeText(v);
  });
  $('meta[property="article:published_time"], meta[name="dcterms.issued"]').each((_, el) => {
    const v = $(el).attr('content');
    if (v) metadata.publication_date = v;
  });

  // Walk all h1-h4 in document order. For each, collect everything
  // between this heading and the next as the section content.
  const headings = $('h1, h2, h3, h4').toArray();
  const sections: ParsedSection[] = [];

  if (headings.length === 0) {
    // Document has no headings — treat whole body as a single anonymous section.
    const bodyText = elementText($, $('body'));
    sections.push({
      ordinal: 1,
      heading: null,
      anchor: null,
      contentText: bodyText,
      contentHash: sha256(bodyText),
    });
  } else {
    headings.forEach((headingEl, idx) => {
      const $heading = $(headingEl);
      const headingText = normalizeText($heading.text().trim());

      // Anchor: prefer explicit id, else law-section pattern, else slug.
      let anchor: string | null = $heading.attr('id') ?? null;
      if (!anchor) {
        anchor = detectLawSectionAnchor(headingText) ?? (slugify(headingText) || null);
      }

      // Collect content: walk forward through siblings until we hit the
      // next heading at the same or higher level. cheerio gives us a flat
      // sibling list of THIS heading's parent — but headings can be at
      // different DOM depths. To keep this robust, we use document order:
      // collect all nodes whose document-order index is > this heading's
      // and < the next heading's.
      const nextEl = headings[idx + 1];
      const contentNodes: ReturnType<ReturnType<typeof load>>[] = [];
      let cursor = $heading.next();
      while (cursor.length > 0 && cursor.get(0) !== nextEl) {
        contentNodes.push(cursor);
        cursor = cursor.next();
      }

      let contentText = '';
      for (const n of contentNodes) {
        const t = elementText($, n);
        if (t) contentText += (contentText ? '\n\n' : '') + t;
      }
      contentText = contentText.trim();

      sections.push({
        ordinal: idx + 1,
        heading: headingText || null,
        anchor: anchor || null,
        contentText,
        contentHash: sha256(contentText),
      });
    });
  }

  // Document-level content hash: concatenate sections in order.
  const docContent = sections.map(s => `${s.heading ?? ''}\n${s.contentText}`).join('\n\n---\n\n');
  const contentHash = sha256(docContent);

  return {
    url: sourceUrl,
    title,
    sourceOrg,
    contentHash,
    metadata,
    sections,
  };
}
