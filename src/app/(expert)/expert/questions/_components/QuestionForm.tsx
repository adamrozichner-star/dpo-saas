'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export interface QuestionFormValues {
  assetTemplateId: string;
  orderIndex: number;
  questionText: string;
  questionType: 'text' | 'number' | 'boolean' | 'single_choice' | 'multi_choice' | 'list' | 'date';
  choicesJson: string;   // nullable JSONB; '' means null
  required: boolean;
  helpText: string;
  dependsOnJson: string; // nullable JSONB; '' means null
  sourceTier: 'legal' | 'regulatory_guidance' | 'industry_norm' | 'expert_judgment';
  confidence: number;
  reviewedBy: string;
  lastReviewedAtLocal: string;
  relatedSources: string;
}

export const EMPTY_FORM: QuestionFormValues = {
  assetTemplateId: '',
  orderIndex: 10,
  questionText: '',
  questionType: 'text',
  choicesJson: '',
  required: false,
  helpText: '',
  dependsOnJson: '',
  sourceTier: 'expert_judgment',
  confidence: 1.0,
  reviewedBy: '',
  lastReviewedAtLocal: '',
  relatedSources: '',
};

export function isoToLocalDatetime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function localDatetimeToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function nowAsLocalDatetime(): string { return isoToLocalDatetime(new Date().toISOString()); }

// JSON parser for nullable JSONB fields. Empty string → null (not stored).
function parseNullableJson(raw: string): { value: unknown; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null, error: null };
  try {
    return { value: JSON.parse(trimmed), error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}

interface Props {
  initialValues: QuestionFormValues;
  submitLabel: string;
  // isCreating: when true, the form auto-suggests order_index (max+10) on asset change
  isCreating?: boolean;
  onSubmit: (
    values: QuestionFormValues,
    parsedChoices: unknown | null,
    parsedDependsOn: unknown | null,
  ) => Promise<void>;
}

export default function QuestionForm({ initialValues, submitLabel, onSubmit, isCreating }: Props) {
  const { session } = useAuth();
  const [values, setValues] = useState<QuestionFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choicesError, setChoicesError] = useState<string | null>(null);
  const [dependsOnError, setDependsOnError] = useState<string | null>(null);
  const [assetTemplates, setAssetTemplates] = useState<Array<{ templateId: string; name: string }>>([]);

  function set<K extends keyof QuestionFormValues>(k: K, v: QuestionFormValues[K]) {
    setValues(s => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch('/api/expert/asset-templates',
        { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const json = await res.json();
      setAssetTemplates((json.rows ?? []).map((r: { templateId: string; name: string }) => ({
        templateId: r.templateId, name: r.name,
      })));
    })();
  }, [session]);

  // When creating + asset_template selected, fetch existing questions for
  // that asset and suggest max(order_index) + 10 as the default.
  useEffect(() => {
    if (!session || !isCreating || !values.assetTemplateId) return;
    (async () => {
      const res = await fetch(
        `/api/expert/questions?asset_template_id=${encodeURIComponent(values.assetTemplateId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) return;
      const json = await res.json();
      const rows: Array<{ orderIndex: number }> = json.rows ?? [];
      const maxOrder = rows.reduce((m, r) => Math.max(m, r.orderIndex), 0);
      setValues(s => ({ ...s, orderIndex: maxOrder + 10 }));
    })();
  }, [session, isCreating, values.assetTemplateId]);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChoicesError(null);
    setDependsOnError(null);

    if (!values.assetTemplateId) {
      setError('בחרו תבנית נכס לפני שמירה.');
      return;
    }
    const cParsed = parseNullableJson(values.choicesJson);
    if (cParsed.error) {
      setChoicesError(`JSON לא תקין: ${cParsed.error}`);
      return;
    }
    const dParsed = parseNullableJson(values.dependsOnJson);
    if (dParsed.error) {
      setDependsOnError(`JSON לא תקין: ${dParsed.error}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values, cParsed.value, dParsed.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      {error && <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="assetTemplateId">תבנית נכס</Label>
          <Select id="assetTemplateId" value={values.assetTemplateId}
            onChange={e => set('assetTemplateId', e.target.value)} required
            options={[
              { value: '', label: '— בחרו תבנית נכס —' },
              ...assetTemplates.map(a => ({ value: a.templateId, label: a.name })),
            ]} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="orderIndex">סדר</Label>
            <Input id="orderIndex" type="number" value={values.orderIndex}
              onChange={e => set('orderIndex', parseInt(e.target.value, 10) || 0)} required />
            <p className="text-xs text-slate-500 mt-1">
              משתמשים בקפיצות של 10 כדי לאפשר הוספה בין שאלות קיימות.
            </p>
          </div>
          <div>
            <Label htmlFor="questionType">סוג שאלה</Label>
            <Select id="questionType" value={values.questionType}
              onChange={e => set('questionType', e.target.value as QuestionFormValues['questionType'])} required
              options={[
                { value: 'text',          label: 'טקסט חופשי' },
                { value: 'number',        label: 'מספר' },
                { value: 'boolean',       label: 'כן / לא' },
                { value: 'single_choice', label: 'בחירה יחידה' },
                { value: 'multi_choice',  label: 'בחירה מרובה' },
                { value: 'list',          label: 'רשימה' },
                { value: 'date',          label: 'תאריך' },
              ]} />
          </div>
        </div>

        <div>
          <Label htmlFor="questionText">נוסח השאלה</Label>
          <Textarea id="questionText" value={values.questionText}
            onChange={e => set('questionText', e.target.value)} rows={3} required
            placeholder="כתבו את השאלה כפי שהיא תוצג ללקוח." />
        </div>

        <div>
          <Label htmlFor="helpText">טקסט עזרה (אופציונלי)</Label>
          <Textarea id="helpText" value={values.helpText}
            onChange={e => set('helpText', e.target.value)} rows={2}
            placeholder="הסבר נוסף שיוצג מתחת לשאלה." />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="required" checked={values.required}
            onChange={e => set('required', e.target.checked)} />
          <Label htmlFor="required">חובה לענות</Label>
        </div>

        <div>
          <Label htmlFor="choicesJson">אפשרויות (JSON, אופציונלי)</Label>
          <Textarea id="choicesJson" value={values.choicesJson}
            onChange={e => { set('choicesJson', e.target.value); setChoicesError(null); }}
            rows={5} className="font-mono text-xs" dir="ltr"
            placeholder='[{"value":"yes","label":"כן"},{"value":"no","label":"לא"}]' />
          {choicesError && <p className="text-xs text-red-600 mt-1">{choicesError}</p>}
          <p className="text-xs text-slate-500 mt-1">
            רלוונטי ל-single_choice / multi_choice. השאירו ריק לסוגי שאלות אחרים.
          </p>
        </div>

        <div>
          <Label htmlFor="dependsOnJson">תלות בשאלה (JSON, אופציונלי)</Label>
          <Textarea id="dependsOnJson" value={values.dependsOnJson}
            onChange={e => { set('dependsOnJson', e.target.value); setDependsOnError(null); }}
            rows={4} className="font-mono text-xs" dir="ltr"
            placeholder='{"question_id":"...","value":"yes"}' />
          {dependsOnError && <p className="text-xs text-red-600 mt-1">{dependsOnError}</p>}
          <p className="text-xs text-slate-500 mt-1">
            השאלה תוצג רק אם התלות מתקיימת. השאירו ריק להצגה תמיד.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-700">מקור וודאות</div>

        <div>
          <Label htmlFor="sourceTier">דרגת מקור</Label>
          <Select id="sourceTier" value={values.sourceTier}
            onChange={e => set('sourceTier', e.target.value as QuestionFormValues['sourceTier'])} required
            options={[
              { value: 'legal',                label: 'חוק (חקיקה / פסיקה)' },
              { value: 'regulatory_guidance',  label: 'הנחיה רגולטורית' },
              { value: 'industry_norm',        label: 'נורמה ענפית' },
              { value: 'expert_judgment',      label: 'שיקול מומחה' },
            ]} />
        </div>

        <div>
          <Label htmlFor="confidence">ודאות ({values.confidence.toFixed(2)})</Label>
          <Input id="confidence" type="range" min={0} max={1} step={0.05}
            value={values.confidence} onChange={e => set('confidence', parseFloat(e.target.value))} />
        </div>

        <div>
          <Label htmlFor="reviewedBy">נסקר על ידי</Label>
          <Input id="reviewedBy" value={values.reviewedBy} onChange={e => set('reviewedBy', e.target.value)} />
        </div>

        <div>
          <Label htmlFor="lastReviewedAtLocal">תאריך סקירה אחרון</Label>
          <div className="flex gap-2">
            <Input id="lastReviewedAtLocal" type="datetime-local" value={values.lastReviewedAtLocal}
              onChange={e => set('lastReviewedAtLocal', e.target.value)} />
            <Button type="button" variant="outline" onClick={() => set('lastReviewedAtLocal', nowAsLocalDatetime())}>תייג כעכשיו</Button>
            {values.lastReviewedAtLocal && (
              <Button type="button" variant="ghost" onClick={() => set('lastReviewedAtLocal', '')}>נקה</Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="relatedSources">מקורות קשורים</Label>
          <Textarea id="relatedSources" value={values.relatedSources}
            onChange={e => set('relatedSources', e.target.value)} rows={3} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'שומר…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
