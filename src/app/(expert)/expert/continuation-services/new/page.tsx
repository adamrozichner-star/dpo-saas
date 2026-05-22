'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatExpertError } from '@/lib/expert-i18n';
import ContinuationServiceForm, {
  EMPTY_FORM,
  ContinuationServiceFormValues,
  localDatetimeToIso,
} from '../_components/ContinuationServiceForm';

export default function NewContinuationServicePage() {
  const router = useRouter();
  const { session } = useAuth();

  async function handleSubmit(values: ContinuationServiceFormValues) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch('/api/expert/continuation-services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: values.name,
        description: values.description,
        service_kind: values.serviceKind,
        price_model: values.priceModel === '' ? null : values.priceModel,
        estimated_price_text: values.estimatedPriceText || null,
        source_tier: values.sourceTier,
        confidence: values.confidence,
        reviewed_by: values.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(values.lastReviewedAtLocal),
        related_sources: values.relatedSources.split('\n').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
    const { templateId } = await res.json();
    router.push(`/expert/continuation-services/${templateId}`);
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">שירות המשך חדש</h1>
        <p className="text-slate-500 mt-1">צרו את הגרסה הראשונה. כל שמירה נוספת תיצור גרסה חדשה.</p>
      </header>
      <ContinuationServiceForm
        initialValues={EMPTY_FORM}
        submitLabel="צור"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
