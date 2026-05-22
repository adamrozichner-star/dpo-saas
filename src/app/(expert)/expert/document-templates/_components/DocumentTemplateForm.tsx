'use client';

// Document Template form. Required asset_template_id dropdown.
// JSONB `variables` rendered as JSON textarea with client-side parse validation.

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export interface DocumentTemplateFormValues {
  assetTemplateId: string;
  name: string;
  description: string;
  body: string;
  variablesJson: string;          // JSON text in UI; parsed on submit
  outputFormat: 'markdown' | 'html' | 'plain';
  sourceTier: 'legal' | 'regulatory_guidance' | 'industry_norm' | 'expert_judgment';
  confidence: number;
  reviewedBy: string;
  lastReviewedAtLocal: string;
  relatedSources: string;
}

export const EMPTY_FORM: DocumentTemplateFormValues = {
  assetTemplateId: '',
  name: '',
  description: '',
  body: '',
  variablesJson: '[]',
  outputFormat: 'markdown',
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

function nowAsLocalDatetime(): string {
  return isoToLocalDatetime(new Date().toISOString());
}

interface AssetTemplateOption {
  templateId: string;
  name: string;
}

interface Props {
  initialValues: DocumentTemplateFormValues;
  submitLabel: string;
  onSubmit: (values: DocumentTemplateFormValues, parsedVariables: unknown[]) => Promise<void>;
}

export default function DocumentTemplateForm({ initialValues, submitLabel, onSubmit }: Props) {
  const { session } = useAuth();
  const [values, setValues] = useState<DocumentTemplateFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [assetTemplates, setAssetTemplates] = useState<AssetTemplateOption[]>([]);

  function set<K extends keyof DocumentTemplateFormValues>(k: K, v: DocumentTemplateFormValues[K]) {
    setValues(s => ({ ...s, [k]: v }));
  }

  // Fetch asset templates for the required dropdown.
  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch('/api/expert/asset-templates', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setAssetTemplates(
        (json.rows ?? []).map((r: { templateId: string; name: string }) => ({
          templateId: r.templateId,
          name: r.name,
        })),
      );
    })();
  }, [session]);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setJsonError(null);

    if (!values.assetTemplateId) {
      setError('בחרו תבנית נכס לפני שמירה.');
      return;
    }

    let parsedVariables: unknown[];
    try {
      const raw = values.variablesJson.trim() === '' ? '[]' : values.variablesJson;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setJsonError('המשתנים חייבים להיות מערך JSON, למשל [].');
        return;
      }
      parsedVariables = parsed;
    } catch (parseErr) {
      setJsonError(`JSON לא תקין: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values, parsedVariables);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="assetTemplateId">תבנית נכס</Label>
          <Select
            id="assetTemplateId"
            value={values.assetTemplateId}
            onChange={e => set('assetTemplateId', e.target.value)}
            required
            options={[
              { value: '', label: '— בחרו תבנית נכס —' },
              ...assetTemplates.map(a => ({ value: a.templateId, label: a.name })),
            ]}
          />
          <p className="text-xs text-slate-500 mt-1">
            כל תבנית מסמך משויכת לתבנית נכס אחת.
          </p>
        </div>

        <div>
          <Label htmlFor="name">שם התבנית</Label>
          <Input id="name" value={values.name} onChange={e => set('name', e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="description">תיאור (אופציונלי)</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
            placeholder="מה התבנית מייצרת ומתי משתמשים בה."
          />
        </div>

        <div>
          <Label htmlFor="outputFormat">פורמט פלט</Label>
          <Select
            id="outputFormat"
            value={values.outputFormat}
            onChange={e => set('outputFormat', e.target.value as DocumentTemplateFormValues['outputFormat'])}
            required
            options={[
              { value: 'markdown', label: 'Markdown' },
              { value: 'html',     label: 'HTML' },
              { value: 'plain',    label: 'טקסט רגיל' },
            ]}
          />
        </div>

        <div>
          <Label htmlFor="body">תוכן התבנית</Label>
          <Textarea
            id="body"
            value={values.body}
            onChange={e => set('body', e.target.value)}
            rows={18}
            className="font-mono text-xs"
            placeholder="גוף המסמך. השתמשו ב-{{variable_name}} למשתנים שיוחלפו בעת היצירה."
            required
          />
        </div>

        <div>
          <Label htmlFor="variablesJson">משתנים (JSON)</Label>
          <Textarea
            id="variablesJson"
            value={values.variablesJson}
            onChange={e => { set('variablesJson', e.target.value); setJsonError(null); }}
            rows={6}
            className="font-mono text-xs"
            dir="ltr"
            placeholder='[{"key":"company_name","label":"שם החברה","source":"org_fact:org.name"}]'
          />
          {jsonError && (
            <p className="text-xs text-red-600 mt-1">{jsonError}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            מערך JSON. כל פריט: {`{key, label, source}`} כאשר source הוא 'question:&lt;id&gt;', 'org_fact:&lt;key&gt;' או 'computed'.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-700">מקור וודאות</div>

        <div>
          <Label htmlFor="sourceTier">דרגת מקור</Label>
          <Select
            id="sourceTier"
            value={values.sourceTier}
            onChange={e => set('sourceTier', e.target.value as DocumentTemplateFormValues['sourceTier'])}
            required
            options={[
              { value: 'legal',                label: 'חוק (חקיקה / פסיקה)' },
              { value: 'regulatory_guidance',  label: 'הנחיה רגולטורית' },
              { value: 'industry_norm',        label: 'נורמה ענפית' },
              { value: 'expert_judgment',      label: 'שיקול מומחה' },
            ]}
          />
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
            <Input id="lastReviewedAtLocal" type="datetime-local"
              value={values.lastReviewedAtLocal}
              onChange={e => set('lastReviewedAtLocal', e.target.value)} />
            <Button type="button" variant="outline" onClick={() => set('lastReviewedAtLocal', nowAsLocalDatetime())}>
              תייג כעכשיו
            </Button>
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
