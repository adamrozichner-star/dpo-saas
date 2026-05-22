'use client';

// Asset Template — create new.

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatExpertError } from '@/lib/expert-i18n';
import AssetTemplateForm, {
  EMPTY_FORM,
  AssetTemplateFormValues,
  localDatetimeToIso,
} from '../_components/AssetTemplateForm';

export default function NewAssetTemplatePage() {
  const router = useRouter();
  const { session } = useAuth();

  async function handleSubmit(values: AssetTemplateFormValues) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch('/api/expert/asset-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        slug: values.slug,
        name: values.name,
        definition: values.definition,
        icon_name: values.iconName || null,
        source_tier: values.sourceTier,
        confidence: values.confidence,
        reviewed_by: values.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(values.lastReviewedAtLocal),
        related_sources: values.relatedSources
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        notes: values.notes || null,
      }),
    });
    if (!res.ok) {
      throw new Error(formatExpertError(res.status, await res.text()));
    }
    const { templateId } = await res.json();
    router.push(`/expert/asset-templates/${templateId}`);
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">תבנית נכס חדשה</h1>
        <p className="text-slate-500 mt-1">צרו את הגרסה הראשונה. כל שמירה נוספת תיצור גרסה חדשה.</p>
      </header>
      <AssetTemplateForm
        initialValues={EMPTY_FORM}
        submitLabel="צור"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
