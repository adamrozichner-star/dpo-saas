// Asset Template per-template endpoints.
//   GET    /api/expert/asset-templates/[templateId] — latest active version
//   PUT    /api/expert/asset-templates/[templateId] — create a NEW version (history preserved)
//   DELETE /api/expert/asset-templates/[templateId] — deactivate all versions

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const UpdateInput = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  icon_name: z.string().nullable().optional(),
  source_tier: z.enum(['legal', 'regulatory_guidance', 'industry_norm', 'expert_judgment']),
  confidence: z.number().min(0).max(1),
  reviewed_by: z.string().nullable().optional(),
  // ISO timestamp string or null. Independent of reviewed_by.
  last_reviewed_at: z.string().nullable().optional(),
  related_sources: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
});

interface RouteParams {
  params: { templateId: string };
}

async function loadLatest(templateId: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('hub_asset_templates')
    .select('*')
    .eq('template_id', templateId)
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { row: data, error };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { row, error } = await loadLatest(params.templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    slug: row.slug,
    name: row.name,
    definition: row.definition,
    iconName: row.icon_name,
    sourceTier: row.source_tier,
    confidence: row.confidence,
    lastReviewedAt: row.last_reviewed_at,
    reviewedBy: row.reviewed_by,
    relatedSources: row.related_sources,
    notes: row.notes,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = UpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const sb = getServiceSupabase();

  // 1. Load the latest version to copy slug + compute next version.
  const { row: latest, error: loadErr } = await loadLatest(params.templateId);
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!latest) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const nextVersion = (latest.version as number) + 1;

  // 2. Insert the new row with explicit template_id (reuse) + nextVersion.
  // The old row stays active=true (history visible); list queries filter
  // by template_id + max(version), so newer always wins.
  const { data, error } = await sb
    .from('hub_asset_templates')
    .insert({
      template_id: params.templateId,
      version: nextVersion,
      slug: latest.slug, // slug is immutable across versions in v1
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
    })
    .select('id, template_id, version')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  return NextResponse.json({ templateId: data.template_id, version: data.version });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('hub_asset_templates')
    .update({ active: false })
    .eq('template_id', params.templateId)
    .eq('active', true)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deactivated: data?.length ?? 0 });
}
