'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { formatExpertError } from '@/lib/expert-i18n';
import QuestionForm, {
  EMPTY_FORM, QuestionFormValues, isoToLocalDatetime, localDatetimeToIso,
} from '../_components/QuestionForm';

interface Props { params: { templateId: string }; }

export default function EditQuestionPage({ params }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [values, setValues] = useState<QuestionFormValues | null>(null);
  const [meta, setMeta] = useState<{ version: number; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch(`/api/expert/questions/${params.templateId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
        const row = await res.json();
        setValues({
          assetTemplateId: row.assetTemplateId,
          orderIndex: row.orderIndex,
          questionText: row.questionText,
          questionType: row.questionType,
          choicesJson: row.choices == null ? '' : JSON.stringify(row.choices, null, 2),
          required: row.required,
          helpText: row.helpText ?? '',
          dependsOnJson: row.dependsOn == null ? '' : JSON.stringify(row.dependsOn, null, 2),
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

  async function handleSubmit(
    formValues: QuestionFormValues,
    parsedChoices: unknown | null,
    parsedDependsOn: unknown | null,
  ) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch(`/api/expert/questions/${params.templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        asset_template_id: formValues.assetTemplateId,
        order_index: formValues.orderIndex,
        question_text: formValues.questionText,
        question_type: formValues.questionType,
        choices: parsedChoices,
        required: formValues.required,
        help_text: formValues.helpText || null,
        depends_on: parsedDependsOn,
        source_tier: formValues.sourceTier,
        confidence: formValues.confidence,
        reviewed_by: formValues.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(formValues.lastReviewedAtLocal),
        related_sources: formValues.relatedSources.split('\n').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
    const reload = await fetch(`/api/expert/questions/${params.templateId}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (reload.ok) {
      const row = await reload.json();
      setMeta({ version: row.version, updatedAt: row.updatedAt });
    }
  }

  async function handleDelete() {
    if (!session) return;
    if (!confirm('להשבית את כל הגרסאות של שאלה זו? לקוחות לא יראו אותה יותר. ניתן לבטל ידנית במסד הנתונים.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expert/questions/${params.templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
      router.push('/expert/questions');
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
          <h1 className="text-2xl font-semibold line-clamp-2">{values.questionText || 'שאלה'}</h1>
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

      <QuestionForm initialValues={values} submitLabel="שמור כגרסה חדשה" onSubmit={handleSubmit} />
    </div>
  );
}
