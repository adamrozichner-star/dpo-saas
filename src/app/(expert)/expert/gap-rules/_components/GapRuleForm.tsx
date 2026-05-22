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

export interface GapRuleFormValues {
  assetTemplateId: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  ruleDslJson: string;
  remediationText: string;
  continuationServiceIds: string[];
  sourceTier: 'legal' | 'regulatory_guidance' | 'industry_norm' | 'expert_judgment';
  confidence: number;
  reviewedBy: string;
  lastReviewedAtLocal: string;
  relatedSources: string;
}

export const EMPTY_FORM: GapRuleFormValues = {
  assetTemplateId: '',
  name: '',
  description: '',
  severity: 'warning',
  ruleDslJson: '{}',
  remediationText: '',
  continuationServiceIds: [],
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

interface Props {
  initialValues: GapRuleFormValues;
  submitLabel: string;
  onSubmit: (values: GapRuleFormValues, parsedRuleDsl: unknown) => Promise<void>;
}

export default function GapRuleForm({ initialValues, submitLabel, onSubmit }: Props) {
  const { session } = useAuth();
  const [values, setValues] = useState<GapRuleFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleDslError, setRuleDslError] = useState<string | null>(null);
  const [assetTemplates, setAssetTemplates] = useState<Array<{ templateId: string; name: string }>>([]);
  const [services, setServices] = useState<Array<{ templateId: string; name: string }>>([]);

  function set<K extends keyof GapRuleFormValues>(k: K, v: GapRuleFormValues[K]) {
    setValues(s => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [assetsRes, servicesRes] = await Promise.all([
        fetch('/api/expert/asset-templates',
          { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch('/api/expert/continuation-services',
          { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      if (assetsRes.ok) {
        const json = await assetsRes.json();
        setAssetTemplates((json.rows ?? []).map((r: { templateId: string; name: string }) => ({
          templateId: r.templateId, name: r.name,
        })));
      }
      if (servicesRes.ok) {
        const json = await servicesRes.json();
        setServices((json.rows ?? []).map((r: { templateId: string; name: string }) => ({
          templateId: r.templateId, name: r.name,
        })));
      }
    })();
  }, [session]);

  function toggleService(templateId: string, checked: boolean) {
    setValues(s => ({
      ...s,
      continuationServiceIds: checked
        ? Array.from(new Set([...s.continuationServiceIds, templateId]))
        : s.continuationServiceIds.filter(id => id !== templateId),
    }));
  }

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRuleDslError(null);

    if (!values.assetTemplateId) {
      setError('בחרו תבנית נכס לפני שמירה.');
      return;
    }
    let parsedRuleDsl: unknown;
    try {
      const raw = values.ruleDslJson.trim() === '' ? '{}' : values.ruleDslJson;
      parsedRuleDsl = JSON.parse(raw);
    } catch (parseErr) {
      setRuleDslError(`JSON לא תקין: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values, parsedRuleDsl);
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

        <div>
          <Label htmlFor="name">שם הכלל</Label>
          <Input id="name" value={values.name} onChange={e => set('name', e.target.value)} required
            placeholder="למשל: 'מצלמות ללא שילוט'" />
        </div>

        <div>
          <Label htmlFor="description">תיאור הפער</Label>
          <Textarea id="description" value={values.description}
            onChange={e => set('description', e.target.value)} rows={4} required
            placeholder="מה הפער ולמה הוא חשוב מבחינת ציות. תיאור קריא לבני אדם." />
        </div>

        <div>
          <Label htmlFor="severity">חומרה</Label>
          <Select id="severity" value={values.severity}
            onChange={e => set('severity', e.target.value as GapRuleFormValues['severity'])} required
            options={[
              { value: 'info',     label: 'מידע' },
              { value: 'warning',  label: 'אזהרה' },
              { value: 'critical', label: 'קריטי' },
            ]} />
        </div>

        <div>
          <Label htmlFor="ruleDslJson">כלל זיהוי (JSON)</Label>
          <Textarea id="ruleDslJson" value={values.ruleDslJson}
            onChange={e => { set('ruleDslJson', e.target.value); setRuleDslError(null); }}
            rows={8} className="font-mono text-xs" dir="ltr"
            placeholder='{"when":[{"field":"signage_present","op":"equals","value":false}],"then":"gap"}' />
          {ruleDslError && <p className="text-xs text-red-600 mt-1">{ruleDslError}</p>}
          <p className="text-xs text-slate-500 mt-1">
            כלל דקלרטיבי שמזהה מתי הפער מתקיים. נדרש (יכול להיות אובייקט ריק {`{}`}).
          </p>
        </div>

        <div>
          <Label htmlFor="remediationText">טיפול מומלץ</Label>
          <Textarea id="remediationText" value={values.remediationText}
            onChange={e => set('remediationText', e.target.value)} rows={4}
            placeholder="מה הלקוח צריך לעשות כדי לסגור את הפער." />
        </div>

        <div>
          <Label>שירותי המשך מקושרים (אופציונלי)</Label>
          <div className="border border-input rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
            {services.length === 0 ? (
              <p className="text-xs text-slate-500">אין שירותי המשך פעילים כרגע.</p>
            ) : (
              services.map(s => {
                const checked = values.continuationServiceIds.includes(s.templateId);
                return (
                  <label key={s.templateId} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onChange={e => toggleService(s.templateId, e.target.checked)}
                    />
                    <span>{s.name}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            כשהפער מזוהה, השירותים המקושרים יוצעו ללקוח כפתרונות.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold text-slate-700">מקור וודאות</div>

        <div>
          <Label htmlFor="sourceTier">דרגת מקור</Label>
          <Select id="sourceTier" value={values.sourceTier}
            onChange={e => set('sourceTier', e.target.value as GapRuleFormValues['sourceTier'])} required
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
