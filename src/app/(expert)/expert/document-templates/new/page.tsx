'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatExpertError } from '@/lib/expert-i18n';
import DocumentTemplateForm, {
  EMPTY_FORM,
  DocumentTemplateFormValues,
  localDatetimeToIso,
} from '../_components/DocumentTemplateForm';

export default function NewDocumentTemplatePage() {
  const router = useRouter();
  const { session } = useAuth();

  async function handleSubmit(values: DocumentTemplateFormValues, parsedVariables: unknown[]) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch('/api/expert/document-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        asset_template_id: values.assetTemplateId,
        name: values.name,
        description: values.description || null,
        body: values.body,
        variables: parsedVariables,
        output_format: values.outputFormat,
        source_tier: values.sourceTier,
        confidence: values.confidence,
        reviewed_by: values.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(values.lastReviewedAtLocal),
        related_sources: values.relatedSources.split('\n').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
    const { templateId } = await res.json();
    router.push(`/expert/document-templates/${templateId}`);
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">תבנית מסמך חדשה</h1>
        <p className="text-slate-500 mt-1">צרו את הגרסה הראשונה. כל שמירה נוספת תיצור גרסה חדשה.</p>
      </header>
      <DocumentTemplateForm initialValues={EMPTY_FORM} submitLabel="צור" onSubmit={handleSubmit} />
    </div>
  );
}
