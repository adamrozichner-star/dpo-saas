'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { formatExpertError } from '@/lib/expert-i18n';
import GapRuleForm, {
  EMPTY_FORM, GapRuleFormValues, isoToLocalDatetime, localDatetimeToIso,
} from '../_components/GapRuleForm';

interface Props { params: { templateId: string }; }

export default function EditGapRulePage({ params }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [values, setValues] = useState<GapRuleFormValues | null>(null);
  const [meta, setMeta] = useState<{ version: number; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch(`/api/expert/gap-rules/${params.templateId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
        const row = await res.json();
        setValues({
          assetTemplateId: row.assetTemplateId,
          name: row.name,
          description: row.description,
          severity: row.severity,
          ruleDslJson: JSON.stringify(row.ruleDsl ?? {}, null, 2),
          remediationText: row.remediationText ?? '',
          continuationServiceIds: row.continuationServiceIds ?? [],
          sourceTier: row.sourceTier,
          confidence: row.confidence,
          reviewedBy: row.reviewedBy ?? '',
          lastReviewedAtLocal: isoToLocalDatetime(row.lastReviewedAt ?? null),
          relatedSources: (row.relatedSources ?? []).join('\n'),
        });
        setMeta({ version: row.version, updatedAt: row.updatedAt });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setValues(EMPTY_FORM);
      }
    })();
  }, [session, params.templateId]);

  async function handleSubmit(formValues: GapRuleFormValues, parsedRuleDsl: unknown) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch(`/api/expert/gap-rules/${params.templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        asset_template_id: formValues.assetTemplateId,
        name: formValues.name,
        description: formValues.description,
        severity: formValues.severity,
        rule_dsl: parsedRuleDsl,
        remediation_text: formValues.remediationText || null,
        continuation_service_ids: formValues.continuationServiceIds,
        source_tier: formValues.sourceTier,
        confidence: formValues.confidence,
        reviewed_by: formValues.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(formValues.lastReviewedAtLocal),
        related_sources: formValues.relatedSources.split('\n').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
    const reload = await fetch(`/api/expert/gap-rules/${params.templateId}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (reload.ok) {
      const row = await reload.json();
      setMeta({ version: row.version, updatedAt: row.updatedAt });
    }
  }

  async function handleDelete() {
    if (!session) return;
    if (!confirm('להשבית את כל הגרסאות של כלל זה? לקוחות לא יקבלו עוד התראה על הפער. ניתן לבטל ידנית במסד הנתונים.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expert/gap-rules/${params.templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
      router.push('/expert/gap-rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  if (!values) return <div className="text-slate-500">טוען…</div>;

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{values.name || 'כלל פער'}</h1>
          {meta && (
            <p className="text-slate-500 text-sm mt-1">
              ג׳{meta.version} · עודכן {new Date(meta.updatedAt).toLocaleString('he-IL')}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'משבית…' : 'השבת'}
        </Button>
      </header>

      {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      <GapRuleForm initialValues={values} submitLabel="שמור כגרסה חדשה" onSubmit={handleSubmit} />
    </div>
  );
}
