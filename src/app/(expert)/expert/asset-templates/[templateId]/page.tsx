'use client';

// Asset Template — view + edit latest active version. Save creates a new
// version row; old version stays for history.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import AssetTemplateForm, {
  EMPTY_FORM,
  AssetTemplateFormValues,
  isoToLocalDatetime,
  localDatetimeToIso,
} from '../_components/AssetTemplateForm';

interface Props {
  params: { templateId: string };
}

export default function EditAssetTemplatePage({ params }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [values, setValues] = useState<AssetTemplateFormValues | null>(null);
  const [meta, setMeta] = useState<{ version: number; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch(`/api/expert/asset-templates/${params.templateId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const row = await res.json();
        setValues({
          slug: row.slug,
          name: row.name,
          definition: row.definition,
          iconName: row.iconName ?? '',
          sourceTier: row.sourceTier,
          confidence: row.confidence,
          reviewedBy: row.reviewedBy ?? '',
          lastReviewedAtLocal: isoToLocalDatetime(row.lastReviewedAt ?? null),
          relatedSources: (row.relatedSources ?? []).join('\n'),
          notes: row.notes ?? '',
        });
        setMeta({ version: row.version, updatedAt: row.updatedAt });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setValues(EMPTY_FORM);
      }
    })();
  }, [session, params.templateId]);

  async function handleSubmit(formValues: AssetTemplateFormValues) {
    if (!session) throw new Error('Not authenticated');
    const res = await fetch(`/api/expert/asset-templates/${params.templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formValues.name,
        definition: formValues.definition,
        icon_name: formValues.iconName || null,
        source_tier: formValues.sourceTier,
        confidence: formValues.confidence,
        reviewed_by: formValues.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(formValues.lastReviewedAtLocal),
        related_sources: formValues.relatedSources
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        notes: formValues.notes || null,
      }),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`);
    }
    router.refresh();
    // refetch
    const reload = await fetch(`/api/expert/asset-templates/${params.templateId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (reload.ok) {
      const row = await reload.json();
      setMeta({ version: row.version, updatedAt: row.updatedAt });
    }
  }

  async function handleDelete() {
    if (!session) return;
    if (!confirm('Deactivate ALL versions of this asset template? Customers will stop seeing it. This can be undone manually.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expert/asset-templates/${params.templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      router.push('/expert/asset-templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  if (!values) {
    return <div className="text-slate-500">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{values.name || 'Asset template'}</h1>
          {meta && (
            <p className="text-slate-500 text-sm mt-1">
              v{meta.version} · updated {new Date(meta.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deactivating…' : 'Deactivate'}
        </Button>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <AssetTemplateForm
        initialValues={values}
        submitLabel="Save as new version"
        onSubmit={handleSubmit}
        slugReadOnly
      />
    </div>
  );
}
