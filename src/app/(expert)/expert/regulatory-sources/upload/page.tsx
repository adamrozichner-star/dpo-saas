'use client';

// Regulatory source PDF upload — 3-stage single page.
//   Stage 1: dropzone + optional metadata
//   Stage 2: editable review of extracted structure
//   Stage 3: success summary

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatExpertError } from '@/lib/expert-i18n';

type SourceOrg = 'privacy_protection_authority' | 'knesset' | 'court' | 'eu_edpb' | 'other';

interface Section {
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;
}

interface ParsedDocument {
  url: string;
  title: string;
  sourceOrg: SourceOrg;
  contentHash: string;
  metadata: Record<string, unknown>;
  sections: Section[];
}

interface UploadResponse {
  draft_id: string;
  storage_path: string;
  parsed_document: ParsedDocument;
}

interface ApproveResponse {
  document_id: string;
  version: number;
  sections_count: number;
  status: 'created' | 'updated' | 'unchanged';
}

type Stage =
  | { kind: 'empty' }
  | { kind: 'uploading'; fileName: string }
  | { kind: 'review'; draft: UploadResponse; included: boolean[] }
  | { kind: 'saving' }
  | { kind: 'success'; result: ApproveResponse; title: string };

const SOURCE_ORG_OPTIONS: Array<{ value: SourceOrg; label: string }> = [
  { value: 'privacy_protection_authority', label: 'רשות הגנת הפרטיות' },
  { value: 'knesset',                       label: 'הכנסת' },
  { value: 'court',                         label: 'בית משפט' },
  { value: 'eu_edpb',                       label: 'EDPB (האיחוד האירופי)' },
  { value: 'other',                         label: 'אחר' },
];

export default function RegulatorySourceUploadPage() {
  const { session } = useAuth();
  const [stage, setStage] = useState<Stage>({ kind: 'empty' });
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceOrgHint, setSourceOrgHint] = useState<SourceOrg>('other');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function startUpload(file: File) {
    if (!session) {
      setError('אינך מחובר');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('הקובץ אינו PDF תקין');
      return;
    }
    setError(null);
    setStage({ kind: 'uploading', fileName: file.name });

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());
      formData.append('source_org_hint', sourceOrgHint);

      const res = await fetch('/api/admin/regulatory-sources/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(formatExpertError(res.status, await res.text()));
      }
      const json: UploadResponse = await res.json();
      setStage({
        kind: 'review',
        draft: json,
        included: new Array(json.parsed_document.sections.length).fill(true),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage({ kind: 'empty' });
    }
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startUpload(f);
  }

  if (stage.kind === 'empty' || stage.kind === 'uploading') {
    const uploading = stage.kind === 'uploading';
    return (
      <div className="max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">העלאת מקור רגולציה</h1>
          <p className="text-slate-500 mt-1">
            העלו PDF של חוק, הנחיה רגולטורית או פסיקה. המערכת תחלץ את המבנה לסקירה.
          </p>
        </header>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInput.current?.click()}
          className={[
            'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
            dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50',
            uploading ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-slate-100">
            {/* Subtle upload icon — inline SVG to avoid an extra import */}
            <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          {uploading ? (
            <>
              <p className="text-slate-700 font-medium">מעבד את הקובץ…</p>
              <p className="text-xs text-slate-500 mt-2">{stage.fileName}</p>
              <p className="text-xs text-slate-400 mt-3">
                החילוץ עשוי להימשך 20-40 שניות עבור מסמכים ארוכים.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-700 font-medium">גרור PDF לכאן</p>
              <p className="text-xs text-slate-500 mt-2">או לחץ כדי לבחור קובץ</p>
              <p className="text-xs text-slate-400 mt-3">PDF בלבד · מקסימום 50MB</p>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFilePicked}
            disabled={uploading}
          />
        </div>

        <Card className="mt-6 p-5 space-y-4">
          <div className="text-sm font-semibold text-slate-700">מידע משלים (אופציונלי)</div>

          <div>
            <Label htmlFor="sourceUrl">URL מקור</Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://www.gov.il/..."
              dir="ltr"
              disabled={uploading}
            />
            <p className="text-xs text-slate-500 mt-1">
              אם המסמך הזה הוא ההורדה של דף ספציפי, ספקו את הקישור. שימושי לעדכון עתידי.
            </p>
          </div>

          <div>
            <Label htmlFor="sourceOrgHint">סוג מקור</Label>
            <Select
              id="sourceOrgHint"
              value={sourceOrgHint}
              onChange={e => setSourceOrgHint(e.target.value as SourceOrg)}
              options={SOURCE_ORG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              disabled={uploading}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (stage.kind === 'review') {
    return (
      <ReviewStage
        draft={stage.draft}
        included={stage.included}
        sourceUrlOverride={sourceUrl || null}
        onIncludedChange={(included) => setStage({ ...stage, included })}
        onDraftChange={(draft) => setStage({ ...stage, draft })}
        onRestart={() => {
          setStage({ kind: 'empty' });
          setError(null);
        }}
        onApprove={async (finalDraft, finalIncluded) => {
          if (!session) {
            setError('אינך מחובר');
            return;
          }
          setStage({ kind: 'saving' });
          try {
            const filteredSections = finalDraft.parsed_document.sections
              .filter((_, i) => finalIncluded[i])
              .map((s, i) => ({ ...s, ordinal: i + 1 }));
            const res = await fetch('/api/admin/regulatory-sources/approve', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                draft_id: finalDraft.draft_id,
                storage_path: finalDraft.storage_path,
                source_url: sourceUrl || null,
                parsed_document: {
                  ...finalDraft.parsed_document,
                  sections: filteredSections,
                },
              }),
            });
            if (!res.ok) {
              throw new Error(formatExpertError(res.status, await res.text()));
            }
            const result: ApproveResponse = await res.json();
            setStage({ kind: 'success', result, title: finalDraft.parsed_document.title });
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStage({
              kind: 'review',
              draft: finalDraft,
              included: finalIncluded,
            });
          }
        }}
        error={error}
      />
    );
  }

  if (stage.kind === 'saving') {
    return (
      <div className="max-w-2xl text-center py-20">
        <p className="text-slate-700 font-medium">שומר…</p>
      </div>
    );
  }

  // stage.kind === 'success'
  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">נשמר בהצלחה</h1>
        <p className="text-slate-500 mt-1">
          {stage.result.sections_count} סקציות נוספו לספריית הרגולציה.
        </p>
      </header>

      <Card className="p-5 mb-6">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">כותרת</div>
          <div className="font-medium">{stage.title}</div>
          <div className="text-xs text-slate-500 mt-3">מזהה: {stage.result.document_id}</div>
          <div className="text-xs text-slate-500">גרסה: {stage.result.version}</div>
          <div className="text-xs text-slate-500">סטטוס: {stage.result.status}</div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => {
          setStage({ kind: 'empty' });
          setSourceUrl('');
          setSourceOrgHint('other');
          setError(null);
        }}>
          העלה מסמך נוסף
        </Button>
        <Link href="/expert/regulatory-sources">
          <Button variant="outline">חזרה לרשימה</Button>
        </Link>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Review stage — editable form for the extracted draft
// -----------------------------------------------------------------------------

interface ReviewStageProps {
  draft: UploadResponse;
  included: boolean[];
  sourceUrlOverride: string | null;
  error: string | null;
  onIncludedChange: (next: boolean[]) => void;
  onDraftChange: (next: UploadResponse) => void;
  onRestart: () => void;
  onApprove: (draft: UploadResponse, included: boolean[]) => Promise<void>;
}

function ReviewStage({ draft, included, error, onIncludedChange, onDraftChange, onRestart, onApprove }: ReviewStageProps) {
  const pd = draft.parsed_document;

  function updateDoc<K extends keyof ParsedDocument>(key: K, val: ParsedDocument[K]) {
    onDraftChange({
      ...draft,
      parsed_document: { ...pd, [key]: val },
    });
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    const next = pd.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onDraftChange({ ...draft, parsed_document: { ...pd, sections: next } });
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= pd.sections.length) return;
    const next = [...pd.sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    const inc = [...included];
    [inc[idx], inc[target]] = [inc[target], inc[idx]];
    onDraftChange({ ...draft, parsed_document: { ...pd, sections: next } });
    onIncludedChange(inc);
  }

  function toggleIncluded(idx: number, val: boolean) {
    const next = [...included];
    next[idx] = val;
    onIncludedChange(next);
  }

  const includedCount = included.filter(Boolean).length;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">סקירת המסמך שחולץ</h1>
        <p className="text-slate-500 mt-1">
          עיינו במבנה שחולץ, ערכו ככל שצריך, ואשרו לשמירה בספריית הרגולציה.
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card className="p-5 space-y-4 mb-6">
        <div>
          <Label htmlFor="title">כותרת</Label>
          <Input id="title" value={pd.title} onChange={e => updateDoc('title', e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="sourceOrg">סוג מקור</Label>
          <Select
            id="sourceOrg"
            value={pd.sourceOrg}
            onChange={e => updateDoc('sourceOrg', e.target.value as SourceOrg)}
            options={SOURCE_ORG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </div>

        <div className="text-xs text-slate-500">
          {includedCount} מתוך {pd.sections.length} סקציות מסומנות לשמירה.
        </div>
      </Card>

      <div className="space-y-3 mb-6">
        {pd.sections.map((section, idx) => (
          <Card key={idx} className={`p-4 ${included[idx] ? '' : 'opacity-50'}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  checked={included[idx]}
                  onChange={e => toggleIncluded(idx, e.target.checked)}
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">סקציה {idx + 1}</span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => moveSection(idx, -1)}
                    disabled={idx === 0}
                    className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 px-2 py-1 rounded hover:bg-slate-100"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 1)}
                    disabled={idx === pd.sections.length - 1}
                    className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 px-2 py-1 rounded hover:bg-slate-100"
                  >
                    ↓
                  </button>
                </div>

                <div>
                  <Label htmlFor={`heading-${idx}`}>כותרת הסקציה</Label>
                  <Input
                    id={`heading-${idx}`}
                    value={section.heading ?? ''}
                    onChange={e => updateSection(idx, { heading: e.target.value || null })}
                    placeholder="ללא כותרת"
                  />
                </div>

                <div>
                  <Label htmlFor={`anchor-${idx}`}>עוגן / מספור</Label>
                  <Input
                    id={`anchor-${idx}`}
                    value={section.anchor ?? ''}
                    onChange={e => updateSection(idx, { anchor: e.target.value || null })}
                    placeholder="למשל: סעיף 17ב"
                  />
                </div>

                <div>
                  <Label>תוכן (קריאה בלבד)</Label>
                  <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {section.contentText}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 sticky bottom-4 bg-slate-50/80 backdrop-blur p-3 -mx-3 rounded-lg border border-slate-200">
        <Button variant="outline" onClick={onRestart}>התחל מחדש</Button>
        <Button
          onClick={() => onApprove(draft, included)}
          disabled={includedCount === 0}
        >
          אשר ושמור ({includedCount})
        </Button>
      </div>
    </div>
  );
}
