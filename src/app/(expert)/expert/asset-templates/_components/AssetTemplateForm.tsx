'use client';

// Shared form component for creating and editing asset templates.
// "Edit" creates a new version on save; the version field is internal,
// not exposed in the UI per spec.

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export interface AssetTemplateFormValues {
  slug: string;
  name: string;
  definition: string;
  iconName: string;
  sourceTier: 'legal' | 'regulatory_guidance' | 'industry_norm' | 'expert_judgment';
  confidence: number;
  reviewedBy: string;
  // datetime-local string ("YYYY-MM-DDTHH:mm") or '' when not set.
  // Decoupled from reviewedBy: a curator may backfill a name without
  // claiming a fresh review timestamp, or vice versa.
  lastReviewedAtLocal: string;
  relatedSources: string; // newline-separated in UI; split on submit
  notes: string;
}

export const EMPTY_FORM: AssetTemplateFormValues = {
  slug: '',
  name: '',
  definition: '',
  iconName: '',
  sourceTier: 'expert_judgment',
  confidence: 1.0,
  reviewedBy: '',
  lastReviewedAtLocal: '',
  relatedSources: '',
  notes: '',
};

// Helpers to round-trip between datetime-local input and ISO strings.
export function isoToLocalDatetime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DDTHH:mm in local time
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
  initialValues: AssetTemplateFormValues;
  submitLabel: string;
  onSubmit: (values: AssetTemplateFormValues) => Promise<void>;
  slugReadOnly?: boolean; // edit mode: slug change requires careful thought, lock for now
}

export default function AssetTemplateForm({
  initialValues,
  submitLabel,
  onSubmit,
  slugReadOnly,
}: Props) {
  const [values, setValues] = useState<AssetTemplateFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AssetTemplateFormValues>(k: K, v: AssetTemplateFormValues[K]) {
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
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={values.slug}
            onChange={e => set('slug', e.target.value)}
            placeholder="cameras"
            required
            readOnly={slugReadOnly}
            className={slugReadOnly ? 'bg-slate-50' : ''}
          />
          <p className="text-xs text-slate-500 mt-1">
            Stable code identifier; lowercase a-z 0-9 underscore. Don&apos;t change after first save.
          </p>
        </div>

        <div>
          <Label htmlFor="name">Name (display)</Label>
          <Input
            id="name"
            value={values.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Cameras"
            required
          />
        </div>

        <div>
          <Label htmlFor="definition">Definition</Label>
          <Textarea
            id="definition"
            value={values.definition}
            onChange={e => set('definition', e.target.value)}
            rows={5}
            placeholder="When does this asset type apply to an org? Describe the boundary."
            required
          />
        </div>

        <div>
          <Label htmlFor="iconName">Icon name (lucide)</Label>
          <Input
            id="iconName"
            value={values.iconName}
            onChange={e => set('iconName', e.target.value)}
            placeholder="camera"
          />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-700">Source / confidence</div>

        <div>
          <Label htmlFor="sourceTier">Source tier</Label>
          <Select
            id="sourceTier"
            value={values.sourceTier}
            onChange={e => set('sourceTier', e.target.value as AssetTemplateFormValues['sourceTier'])}
            required
            options={[
              { value: 'legal',                label: 'Legal (statute / case law)' },
              { value: 'regulatory_guidance',  label: 'Regulatory guidance' },
              { value: 'industry_norm',        label: 'Industry norm' },
              { value: 'expert_judgment',      label: 'Expert judgment' },
            ]}
          />
        </div>

        <div>
          <Label htmlFor="confidence">Confidence ({values.confidence.toFixed(2)})</Label>
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
          <Label htmlFor="reviewedBy">Reviewed by</Label>
          <Input
            id="reviewedBy"
            value={values.reviewedBy}
            onChange={e => set('reviewedBy', e.target.value)}
            placeholder="Name of the curator who last reviewed this"
          />
          <p className="text-xs text-slate-500 mt-1">
            Independent of the timestamp below — you can backfill a name without stamping a fresh review.
          </p>
        </div>

        <div>
          <Label htmlFor="lastReviewedAtLocal">Last reviewed at</Label>
          <div className="flex gap-2">
            <Input
              id="lastReviewedAtLocal"
              type="datetime-local"
              value={values.lastReviewedAtLocal}
              onChange={e => set('lastReviewedAtLocal', e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => set('lastReviewedAtLocal', nowAsLocalDatetime())}
            >
              Stamp as now
            </Button>
            {values.lastReviewedAtLocal && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => set('lastReviewedAtLocal', '')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="relatedSources">Related sources</Label>
          <Textarea
            id="relatedSources"
            value={values.relatedSources}
            onChange={e => set('relatedSources', e.target.value)}
            rows={4}
            placeholder="One per line. URLs, citations, document refs."
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (internal)</Label>
          <Textarea
            id="notes"
            value={values.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Anything curators should know about this template that isn't user-facing."
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
