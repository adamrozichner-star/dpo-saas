'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatExpertError } from '@/lib/expert-i18n';
import QuestionForm, {
  EMPTY_FORM, QuestionFormValues, localDatetimeToIso,
} from '../_components/QuestionForm';

export default function NewQuestionPage() {
  const router = useRouter();
  const { session } = useAuth();

  async function handleSubmit(
    values: QuestionFormValues,
    parsedChoices: unknown | null,
    parsedDependsOn: unknown | null,
  ) {
    if (!session) throw new Error('אינך מחובר');
    const res = await fetch('/api/expert/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        asset_template_id: values.assetTemplateId,
        order_index: values.orderIndex,
        question_text: values.questionText,
        question_type: values.questionType,
        choices: parsedChoices,
        required: values.required,
        help_text: values.helpText || null,
        depends_on: parsedDependsOn,
        source_tier: values.sourceTier,
        confidence: values.confidence,
        reviewed_by: values.reviewedBy || null,
        last_reviewed_at: localDatetimeToIso(values.lastReviewedAtLocal),
        related_sources: values.relatedSources.split('\n').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
    const { templateId } = await res.json();
    router.push(`/expert/questions/${templateId}`);
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">שאלה חדשה</h1>
        <p className="text-slate-500 mt-1">צרו את הגרסה הראשונה. כל שמירה נוספת תיצור גרסה חדשה.</p>
      </header>
      <QuestionForm initialValues={EMPTY_FORM} submitLabel="צור" onSubmit={handleSubmit} isCreating />
    </div>
  );
}
