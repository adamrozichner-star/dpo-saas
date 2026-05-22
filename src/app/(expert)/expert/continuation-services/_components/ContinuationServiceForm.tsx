'use client';

// Shared form for creating/editing Continuation Services. "Save" creates
// a new version on edit. Each artifact form is fully self-contained per
// the duplicate-and-go convention.

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export interface ContinuationServiceFormValues {
  name: string;
  description: string;
  serviceKind: string;
  priceModel: '' | 'one_time' | 'recurring' | 'quote';
  estimatedPriceText: string;
  sourceTier: 'legal' | 'regulatory_guidance' | 'industry_norm' | 'expert_judgment';
  confidence: number;
  reviewedBy: string;
  lastReviewedAtLocal: string;
  relatedSources: string;
}

export const EMPTY_FORM: ContinuationServiceFormValues = {
  name: '',
  description: '',
  serviceKind: '',
  priceModel: '',
  estimatedPriceText: '',
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

interface Props {
  initialValues: ContinuationServiceFormValues;
  submitLabel: string;
  onSubmit: (values: ContinuationServiceFormValues) => Promise<void>;
}

export default function ContinuationServiceForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<ContinuationServiceFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ContinuationServiceFormValues>(k: K, v: ContinuationServiceFormValues[K]) {
    setValues(s => ({ ...s, [k]: v }));
  }

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
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
          <Label htmlFor="name">שם השירות</Label>
          <Input id="name" value={values.name} onChange={e => set('name', e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="description">תיאור</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="מה השירות כולל ומתי כדאי להציע אותו ללקוח."
            required
          />
        </div>

        <div>
          <Label htmlFor="serviceKind">סוג שירות</Label>
          <Input
            id="serviceKind"
            value={values.serviceKind}
            onChange={e => set('serviceKind', e.target.value)}
            placeholder="signage / consent_collection / policy_drafting / breach_response..."
            dir="ltr"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            טקסט חופשי; משמש לזיהוי בקוד וקישור מתוך כללי פערים.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceModel">מודל תמחור</Label>
            <Select
              id="priceModel"
              value={values.priceModel}
              onChange={e => set('priceModel', e.target.value as ContinuationServiceFormValues['priceModel'])}
              options={[
                { value: '',          label: '— ללא —' },
                { value: 'one_time',  label: 'חד-פעמי' },
                { value: 'recurring', label: 'חוזר' },
                { value: 'quote',     label: 'הצעת מחיר' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="estimatedPriceText">מחיר משוער</Label>
            <Input
              id="estimatedPriceText"
              value={values.estimatedPriceText}
              onChange={e => set('estimatedPriceText', e.target.value)}
              placeholder="500-1500 ₪ או 'לפי הצעת מחיר'"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-700">מקור וודאות</div>

        <div>
          <Label htmlFor="sourceTier">דרגת מקור</Label>
          <Select
            id="sourceTier"
            value={values.sourceTier}
            onChange={e => set('sourceTier', e.target.value as ContinuationServiceFormValues['sourceTier'])}
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
          <Input
            id="confidence"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={values.confidence}
            onChange={e => set('confidence', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="reviewedBy">נסקר על ידי</Label>
          <Input
            id="reviewedBy"
            value={values.reviewedBy}
            onChange={e => set('reviewedBy', e.target.value)}
            placeholder="שם האוצר שסקר לאחרונה"
          />
          <p className="text-xs text-slate-500 mt-1">
            עצמאי מהחותמת למטה — אפשר למלא שם בלי לתייג סקירה חדשה.
          </p>
        </div>

        <div>
          <Label htmlFor="lastReviewedAtLocal">תאריך סקירה אחרון</Label>
          <div className="flex gap-2">
            <Input
              id="lastReviewedAtLocal"
              type="datetime-local"
              value={values.lastReviewedAtLocal}
              onChange={e => set('lastReviewedAtLocal', e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => set('lastReviewedAtLocal', nowAsLocalDatetime())}>
              תייג כעכשיו
            </Button>
            {values.lastReviewedAtLocal && (
              <Button type="button" variant="ghost" onClick={() => set('lastReviewedAtLocal', '')}>
                נקה
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="relatedSources">מקורות קשורים</Label>
          <Textarea
            id="relatedSources"
            value={values.relatedSources}
            onChange={e => set('relatedSources', e.target.value)}
            rows={3}
            placeholder="שורה לכל מקור."
          />
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
