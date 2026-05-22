import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const UpdateInput = z.object({
  asset_template_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']),
  rule_dsl: z.unknown(),
  remediation_text: z.string().nullable().optional(),
  continuation_service_ids: z.array(z.string().uuid()).default([]),
  source_tier: z.enum(['legal', 'regulatory_guidance', 'industry_norm', 'expert_judgment']),
  confidence: z.number().min(0).max(1),
  reviewed_by: z.string().nullable().optional(),
  last_reviewed_at: z.string().nullable().optional(),
  related_sources: z.array(z.string()).default([]),
});

interface RouteParams { params: { templateId: string }; }

async function loadLatest(templateId: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('hub_gap_rules')
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
    assetTemplateId: row.asset_template_id,
    name: row.name,
    description: row.description,
    severity: row.severity,
    ruleDsl: row.rule_dsl,
    remediationText: row.remediation_text,
    continuationServiceIds: row.continuation_service_ids,
    sourceTier: row.source_tier,
    confidence: row.confidence,
    lastReviewedAt: row.last_reviewed_at,
    reviewedBy: row.reviewed_by,
    relatedSources: row.related_sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const { row: latest, error: loadErr } = await loadLatest(params.templateId);
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!latest) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const nextVersion = (latest.version as number) + 1;
  const { data, error } = await sb
    .from('hub_gap_rules')
    .insert({
      template_id: params.templateId,
      version: nextVersion,
      asset_template_id: input.asset_template_id,
      name: input.name,
      description: input.description,
      severity: input.severity,
      rule_dsl: input.rule_dsl,
      remediation_text: input.remediation_text ?? null,
      continuation_service_ids: input.continuation_service_ids,
      source_tier: input.source_tier,
      confidence: input.confidence,
      reviewed_by: input.reviewed_by ?? null,
      last_reviewed_at: input.last_reviewed_at ?? null,
      related_sources: input.related_sources,
      created_by: auth.userId,
    })
    .select('id, template_id, version')
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  return NextResponse.json({ templateId: data.template_id, version: data.version });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('hub_gap_rules')
    .update({ active: false })
    .eq('template_id', params.templateId)
    .eq('active', true)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deactivated: data?.length ?? 0 });
}
