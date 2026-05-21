// Asset Templates collection endpoint.
//   GET  /api/expert/asset-templates       — list latest active version per template_id
//   POST /api/expert/asset-templates       — create new template (version 1)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const CreateInput = z.object({
  slug: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'lowercase a-z0-9_; start with a letter'),
  name: z.string().min(1),
  definition: z.string().min(1),
  icon_name: z.string().nullable().optional(),
  source_tier: z.enum(['legal', 'regulatory_guidance', 'industry_norm', 'expert_judgment']),
  confidence: z.number().min(0).max(1),
  reviewed_by: z.string().nullable().optional(),
  // ISO timestamp string or null. Independent of reviewed_by — curator
  // can backfill a name without stamping a fresh review, or vice versa.
  last_reviewed_at: z.string().nullable().optional(),
  related_sources: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sb = getServiceSupabase();

  // Latest active version per template_id: DISTINCT ON would be ideal but
  // PostgREST doesn't expose it; fetch all active and reduce in JS. Hub
  // tables are small (curated by hand), so this is fine.
  const { data, error } = await sb
    .from('hub_asset_templates')
    .select('id, template_id, version, slug, name, source_tier, confidence, updated_at')
    .eq('active', true)
    .order('template_id', { ascending: true })
    .order('version', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seen = new Set<string>();
  const latest = (data ?? []).filter(r => {
    const tid = r.template_id as string;
    if (seen.has(tid)) return false;
    seen.add(tid);
    return true;
  });

  return NextResponse.json({
    rows: latest.map(r => ({
      id: r.id,
      templateId: r.template_id,
      version: r.version,
      slug: r.slug,
      name: r.name,
      sourceTier: r.source_tier,
      confidence: r.confidence,
      updatedAt: r.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = CreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const sb = getServiceSupabase();

  // Reject duplicate slug at the application layer; the (slug, version)
  // UNIQUE constraint would also catch it but the error message there is
  // unhelpful.
  const { data: existingSlug } = await sb
    .from('hub_asset_templates')
    .select('id')
    .eq('slug', input.slug)
    .limit(1)
    .maybeSingle();
  if (existingSlug) {
    return NextResponse.json({ error: `slug '${input.slug}' already exists` }, { status: 409 });
  }

  // template_id is freshly generated for v1; subsequent PUT calls reuse it.
  const { data, error } = await sb
    .from('hub_asset_templates')
    .insert({
      slug: input.slug,
      name: input.name,
      definition: input.definition,
      icon_name: input.icon_name ?? null,
      source_tier: input.source_tier,
      confidence: input.confidence,
      reviewed_by: input.reviewed_by ?? null,
      last_reviewed_at: input.last_reviewed_at ?? null,
      related_sources: input.related_sources,
      notes: input.notes ?? null,
      created_by: auth.userId,
      // template_id and version both default in DB (gen_random_uuid() and 1
      // respectively) — first-version inserts only need to supply content.
    })
    .select('id, template_id, version')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  return NextResponse.json({ templateId: data.template_id, version: data.version }, { status: 201 });
}
