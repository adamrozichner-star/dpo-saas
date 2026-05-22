import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCurator } from '@/lib/expert-auth';
import { getServiceSupabase } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const CreateInput = z.object({
  asset_template_id: z.string().uuid(),
  order_index: z.number().int(),
  question_text: z.string().min(1),
  question_type: z.enum(['text', 'number', 'boolean', 'single_choice', 'multi_choice', 'list', 'date']),
  choices: z.unknown().nullable().optional(),
  required: z.boolean().default(false),
  help_text: z.string().nullable().optional(),
  depends_on: z.unknown().nullable().optional(),
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

  // Optional filter for "max order_index for this asset_template" lookups
  const url = new URL(request.url);
  const assetTemplateId = url.searchParams.get('asset_template_id');

  let q = sb
    .from('hub_questions')
    .select('id, template_id, version, asset_template_id, order_index, question_text, question_type, required, source_tier, confidence, updated_at')
    .eq('active', true);
  if (assetTemplateId) q = q.eq('asset_template_id', assetTemplateId);
  const { data, error } = await q
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
      assetTemplateId: r.asset_template_id,
      orderIndex: r.order_index,
      questionText: r.question_text,
      questionType: r.question_type,
      required: r.required,
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
    .from('hub_questions')
    .insert({
      asset_template_id: input.asset_template_id,
      order_index: input.order_index,
      question_text: input.question_text,
      question_type: input.question_type,
      choices: input.choices ?? null,
      required: input.required,
      help_text: input.help_text ?? null,
      depends_on: input.depends_on ?? null,
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
  return NextResponse.json({ templateId: data.template_id, version: data.version }, { status: 201 });
}
