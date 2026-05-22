// Continuation Services collection endpoint.
//   GET  /api/expert/continuation-services  — list latest active version per template_id
//   POST /api/expert/continuation-services  — create new (version 1)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const CreateInput = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  service_kind: z.string().min(1),
  price_model: z.enum(['one_time', 'recurring', 'quote']).nullable().optional(),
  estimated_price_text: z.string().nullable().optional(),
  source_tier: z.enum(['legal', 'regulatory_guidance', 'industry_norm', 'expert_judgment']),
  confidence: z.number().min(0).max(1),
  reviewed_by: z.string().nullable().optional(),
  last_reviewed_at: z.string().nullable().optional(),
  related_sources: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateCurator(request);
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sb = getServiceSupabase();

  const { data, error } = await sb
    .from('hub_continuation_services')
    .select('id, template_id, version, name, service_kind, price_model, source_tier, confidence, updated_at')
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
      name: r.name,
      serviceKind: r.service_kind,
      priceModel: r.price_model,
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

  const { data, error } = await sb
    .from('hub_continuation_services')
    .insert({
      name: input.name,
      description: input.description,
      service_kind: input.service_kind,
      price_model: input.price_model ?? null,
      estimated_price_text: input.estimated_price_text ?? null,
      source_tier: input.source_tier,
      confidence: input.confidence,
      reviewed_by: input.reviewed_by ?? null,
      last_reviewed_at: input.last_reviewed_at ?? null,
      related_sources: input.related_sources,
      created_by: auth.userId,
    })
    .select('id, template_id, version')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  return NextResponse.json({ templateId: data.template_id, version: data.version }, { status: 201 });
}
