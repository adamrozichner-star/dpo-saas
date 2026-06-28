// F2b: proactive document-freshness check. F1's divergence flag is compute-on-open
// (the DPO only learns a doc is stale when they open it). This recomputes active
// ledger-render docs' fingerprints against the live ledger and, when one has
// diverged from its pinned fingerprint, raises a 'document_stale' notification so
// the DPO is told WITHOUT opening the doc. Reuses F1's renderDocument + fingerprint
// (a doc is stale iff its bound inputs changed - no separate dependency graph, so
// a ledger change that does NOT touch a doc's inputs never flags it). Driven by an
// Inngest fan-out (the divergence-causing writes are anon->SECURITY DEFINER fns
// with no app hook, so a scheduled scan is the reliable trigger).
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderDocument, type DocType, type RenderContext } from '@/lib/ledger/doc-render'
import { fetchOrgDescriptive } from '@/lib/ledger/descriptive'

const STALE_TYPE = 'document_stale'

// PURE: given the active docs' pinned fingerprints + their freshly-computed
// current fingerprints, which doc ids have drifted. Testable in isolation.
export function selectStaleDocIds(
  docs: { id: string; pinned: string | null }[],
  currentById: Map<string, string>,
): string[] {
  return docs.filter((d) => {
    const cur = currentById.get(d.id)
    return cur != null && cur !== d.pinned
  }).map((d) => d.id)
}

interface ActiveDocRow { id: string; type: string; template_id: string | null; template_version: number | null; render_fingerprint: string | null }

async function fetchRenderContext(orgId: string, supabase: SupabaseClient): Promise<RenderContext> {
  const [orgRes, dpoRes, assetRes, recipRes, descriptive] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', orgId).single(),
    supabase.from('contacts').select('name, email').eq('org_id', orgId).eq('role', 'dpo').limit(1),
    supabase.from('assets').select('name, details').eq('org_id', orgId),
    supabase.from('data_recipients').select('name, has_dpa, dpa_signed_date, dpa_expiry_date').eq('org_id', orgId),
    fetchOrgDescriptive(orgId, supabase), // F2d: ledger-first descriptive (profile + DPO license), legacy fallback
  ])
  const dpo = (dpoRes.data?.[0] as { name: string | null; email: string | null } | undefined) ?? null
  return {
    org: { name: (orgRes.data as { name: string } | null)?.name ?? '' },
    dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: descriptive.dpoLicense } : null,
    profile: descriptive.profile,
    assets: (assetRes.data ?? []) as RenderContext['assets'],
    recipients: (recipRes.data ?? []) as RenderContext['recipients'],
  }
}

// Recompute active docs' fingerprints; raise one rolling 'document_stale'
// notification per org when any have drifted (idempotent: skipped while an unread
// one already exists). Returns a summary for the Inngest step.
export async function checkDocFreshnessForOrg(
  orgId: string,
  supabase: SupabaseClient,
): Promise<{ checked: number; stale: number; notified: boolean }> {
  const { data: docRows } = await supabase
    .from('documents')
    .select('id, type, template_id, template_version, render_fingerprint')
    .eq('org_id', orgId).eq('source', 'ledger_render').eq('status', 'active')
  const docs = (docRows ?? []) as ActiveDocRow[]
  if (docs.length === 0) return { checked: 0, stale: 0, notified: false }

  const ctx = await fetchRenderContext(orgId, supabase)
  const { data: tplRows } = await supabase.from('hub_document_templates').select('template_id, version, body').eq('active', true)
  const tplBody = new Map<string, string>()
  for (const t of (tplRows ?? []) as { template_id: string; version: number; body: string }[]) tplBody.set(`${t.template_id}:${t.version}`, t.body)

  const currentById = new Map<string, string>()
  for (const d of docs) {
    if (!d.template_id) continue
    const body = tplBody.get(`${d.template_id}:${d.template_version ?? 1}`)
    if (body == null) continue
    const { fingerprint } = renderDocument(d.type as DocType, { templateId: d.template_id, version: d.template_version ?? 1, body }, ctx)
    currentById.set(d.id, fingerprint)
  }

  const stale = selectStaleDocIds(docs.map((d) => ({ id: d.id, pinned: d.render_fingerprint })), currentById)
  if (stale.length === 0) return { checked: docs.length, stale: 0, notified: false }

  // dedup: one unread rolling notification per org (no double-flag on re-run)
  const { data: existing } = await supabase
    .from('notifications').select('id').eq('org_id', orgId).eq('type', STALE_TYPE).is('read_at', null).limit(1)
  if (existing && existing.length) return { checked: docs.length, stale: stale.length, notified: false }

  await supabase.from('notifications').insert({
    org_id: orgId, type: STALE_TYPE, title: 'מסמכים דורשים רענון',
    body: `${stale.length} מסמכים אינם תואמים עוד למצב הציות ויש לאשרם מחדש`,
    link: '/console/documents',
  })
  return { checked: docs.length, stale: stale.length, notified: true }
}
