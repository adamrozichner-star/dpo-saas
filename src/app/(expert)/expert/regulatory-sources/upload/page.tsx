'use client';

// Regulatory source PDF upload — 3-stage single page.
//   Stage 1: dropzone + optional metadata
//   Stage 2: editable review of extracted structure, GROUPED BY DIFF STATUS
//            (new / conflict / duplicate); curator resolves conflicts before
//            approve becomes available.
//   Stage 3: success summary

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatExpertError } from '@/lib/expert-i18n';

type SourceOrg = 'privacy_protection_authority' | 'knesset' | 'court' | 'eu_edpb' | 'other';

type DiffStatus = 'new' | 'duplicate' | 'conflict';
type Resolution = 'replace' | 'keep_both' | 'skip';

interface SimilarSectionPreview {
  id: string;
  documentId: string;
  documentTitle: string;
  ordinal: number;
  heading: string | null;
  contentText: string;
}

interface Section {
  ordinal: number;
  heading: string | null;
  anchor: string | null;
  contentText: string;
  contentHash: string;

  // Diff fields populated by the extraction pipeline (semantic-diff.ts).
  // Absent → treat as 'new' (legacy fallback / Voyage outage).
  diffStatus?: DiffStatus;
  similarity?: number | null;
  similarSection?: SimilarSectionPreview | null;
  embedding?: number[];
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
  inserted: number;
  replaced: number;
  skipped: number;
}

type Stage =
  | { kind: 'empty' }
  | { kind: 'uploading'; fileName: string }
  | { kind: 'review'; draft: UploadResponse; resolutions: Record<number, Resolution> }
  | { kind: 'saving' }
  | { kind: 'success'; result: ApproveResponse; title: string };

const SOURCE_ORG_OPTIONS: Array<{ value: SourceOrg; label: string }> = [
  { value: 'privacy_protection_authority', label: 'רשות הגנת הפרטיות' },
  { value: 'knesset',                       label: 'הכנסת' },
  { value: 'court',                         label: 'בית משפט' },
  { value: 'eu_edpb',                       label: 'EDPB (האיחוד האירופי)' },
  { value: 'other',                         label: 'אחר' },
];

function effectiveStatus(s: Section): DiffStatus {
  return s.diffStatus ?? 'new';
}

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
        resolutions: {},
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
        resolutions={stage.resolutions}
        onResolutionsChange={(next) => setStage({ ...stage, resolutions: next })}
        onDraftChange={(draft) => setStage({ ...stage, draft })}
        onRestart={() => {
          setStage({ kind: 'empty' });
          setError(null);
        }}
        onApprove={async (finalDraft, finalResolutions) => {
          if (!session) {
            setError('אינך מחובר');
            return;
          }
          setStage({ kind: 'saving' });
          try {
            // Build the on-the-wire sections array. Each section carries
            // its diffStatus + (for conflicts) resolution + similarSectionId
            // + embedding. The server translates these to wire actions.
            const wireSections = finalDraft.parsed_document.sections.map((s, i) => {
              const status = effectiveStatus(s);
              const resolution = status === 'conflict' ? finalResolutions[i] : undefined;
              return {
                ordinal: s.ordinal,
                heading: s.heading,
                anchor: s.anchor,
                contentText: s.contentText,
                contentHash: s.contentHash,
                diffStatus: status,
                similarSectionId: s.similarSection?.id,
                resolution,
                embedding: s.embedding,
              };
            });
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
                  sections: wireSections,
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
              resolutions: finalResolutions,
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
          {stage.result.inserted} סקציות חדשות נוספו · {stage.result.replaced} עודכנו · {stage.result.skipped} דולגו.
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
// Review stage — grouped by diff status, conflict resolution required
// -----------------------------------------------------------------------------

interface ReviewStageProps {
  draft: UploadResponse;
  resolutions: Record<number, Resolution>;
  error: string | null;
  onResolutionsChange: (next: Record<number, Resolution>) => void;
  onDraftChange: (next: UploadResponse) => void;
  onRestart: () => void;
  onApprove: (draft: UploadResponse, resolutions: Record<number, Resolution>) => Promise<void>;
}

function ReviewStage({
  draft, resolutions, error,
  onResolutionsChange, onDraftChange, onRestart, onApprove,
}: ReviewStageProps) {
  const pd = draft.parsed_document;

  function updateDoc<K extends keyof ParsedDocument>(key: K, val: ParsedDocument[K]) {
    onDraftChange({ ...draft, parsed_document: { ...pd, [key]: val } });
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    const next = pd.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onDraftChange({ ...draft, parsed_document: { ...pd, sections: next } });
  }

  function setResolution(idx: number, r: Resolution) {
    onResolutionsChange({ ...resolutions, [idx]: r });
  }

  // Bucket sections by status. We keep their ORIGINAL index inside the
  // bucket so updateSection/setResolution work without reindexing.
  const buckets: Record<DiffStatus, Array<{ section: Section; idx: number }>> = {
    new: [], conflict: [], duplicate: [],
  };
  pd.sections.forEach((s, i) => buckets[effectiveStatus(s)].push({ section: s, idx: i }));

  // Approve gate: every conflict must have a resolution.
  const unresolvedConflicts = buckets.conflict.filter(({ idx }) => !resolutions[idx]).length;
  const canApprove = unresolvedConflicts === 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">סקירת המסמך שחולץ</h1>
        <p className="text-slate-500 mt-1">
          חדש: יתווסף לספרייה · קונפליקטים: צריך החלטה · כפילויות: כבר קיים, יידלג.
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

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>ידע חדש: <span className="font-semibold text-slate-900">{buckets.new.length}</span></span>
          <span>קונפליקטים: <span className="font-semibold text-slate-900">{buckets.conflict.length}</span></span>
          <span>כפילויות: <span className="font-semibold text-slate-900">{buckets.duplicate.length}</span></span>
        </div>
      </Card>

      {/* NEW bucket — green, expanded, editable */}
      {buckets.new.length > 0 && (
        <DiffGroup
          title={`ידע חדש (${buckets.new.length})`}
          tone="green"
          description="סקציות שלא נמצאו בספרייה. ייווספו לאחר אישור."
        >
          {buckets.new.map(({ section, idx }) => (
            <NewSectionCard
              key={idx}
              section={section}
              idx={idx}
              onUpdate={patch => updateSection(idx, patch)}
            />
          ))}
        </DiffGroup>
      )}

      {/* CONFLICT bucket — yellow, expanded, requires resolution */}
      {buckets.conflict.length > 0 && (
        <DiffGroup
          title={`קונפליקטים (${buckets.conflict.length})`}
          tone="yellow"
          description="סקציות דומות למה שכבר קיים אך עם תוכן שונה. בחרו פעולה לכל אחת."
        >
          {buckets.conflict.map(({ section, idx }) => (
            <ConflictSectionCard
              key={idx}
              section={section}
              idx={idx}
              resolution={resolutions[idx]}
              onUpdate={patch => updateSection(idx, patch)}
              onResolve={r => setResolution(idx, r)}
            />
          ))}
        </DiffGroup>
      )}

      {/* DUPLICATE bucket — grey, collapsed by default */}
      {buckets.duplicate.length > 0 && (
        <DiffGroup
          title={`כפילויות (${buckets.duplicate.length})`}
          tone="grey"
          description="סקציות שכבר קיימות בספרייה. יידלגו אוטומטית."
          defaultCollapsed
        >
          {buckets.duplicate.map(({ section, idx }) => (
            <DuplicateSectionRow key={idx} section={section} />
          ))}
        </DiffGroup>
      )}

      <div className="flex justify-end gap-3 sticky bottom-4 bg-slate-50/80 backdrop-blur p-3 -mx-3 rounded-lg border border-slate-200 mt-6">
        <Button variant="outline" onClick={onRestart}>ביטול</Button>
        <Button
          onClick={() => onApprove(draft, resolutions)}
          disabled={!canApprove}
          title={canApprove ? '' : `${unresolvedConflicts} קונפליקטים לא נפתרו`}
        >
          {canApprove ? 'אשר ושמור' : `אשר ושמור (${unresolvedConflicts} ממתינים)`}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Diff-group wrapper (header + collapsible body)
// -----------------------------------------------------------------------------

interface DiffGroupProps {
  title: string;
  tone: 'green' | 'yellow' | 'grey';
  description: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const TONE_STYLES: Record<DiffGroupProps['tone'], { header: string; dot: string }> = {
  green:  { header: 'bg-emerald-50 border-emerald-200 text-emerald-900', dot: 'bg-emerald-500' },
  yellow: { header: 'bg-amber-50 border-amber-200 text-amber-900',       dot: 'bg-amber-500' },
  grey:   { header: 'bg-slate-50 border-slate-200 text-slate-700',       dot: 'bg-slate-400' },
};

function DiffGroup({ title, tone, description, defaultCollapsed, children }: DiffGroupProps) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  const styles = TONE_STYLES[tone];
  return (
    <div className={`mb-5 rounded-lg border ${styles.header.split(' ')[1]}`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-4 py-3 text-right ${styles.header} rounded-t-lg`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
          <span className="font-semibold">{title}</span>
        </div>
        <span className="text-xs">{collapsed ? 'הצג ▾' : 'הסתר ▴'}</span>
      </button>
      {!collapsed && (
        <div className="bg-white p-4 space-y-3 rounded-b-lg">
          <div className="text-xs text-slate-500">{description}</div>
          {children}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section cards — one per diff status
// -----------------------------------------------------------------------------

function NewSectionCard({
  section, idx, onUpdate,
}: { section: Section; idx: number; onUpdate: (patch: Partial<Section>) => void }) {
  return (
    <Card className="p-4 border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-emerald-700">חדש</span>
        <span className="text-xs text-slate-500">סקציה {idx + 1}</span>
      </div>
      <div className="space-y-3">
        <div>
          <Label htmlFor={`new-heading-${idx}`}>כותרת הסקציה</Label>
          <Input
            id={`new-heading-${idx}`}
            value={section.heading ?? ''}
            onChange={e => onUpdate({ heading: e.target.value || null })}
            placeholder="ללא כותרת"
          />
        </div>
        <div>
          <Label htmlFor={`new-anchor-${idx}`}>עוגן / מספור</Label>
          <Input
            id={`new-anchor-${idx}`}
            value={section.anchor ?? ''}
            onChange={e => onUpdate({ anchor: e.target.value || null })}
            placeholder="למשל: סעיף 17ב"
          />
        </div>
        <div>
          <Label>תוכן</Label>
          <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {section.contentText}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConflictSectionCard({
  section, idx, resolution, onUpdate, onResolve,
}: {
  section: Section;
  idx: number;
  resolution: Resolution | undefined;
  onUpdate: (patch: Partial<Section>) => void;
  onResolve: (r: Resolution) => void;
}) {
  const sim = section.similarSection;
  const simPct = typeof section.similarity === 'number'
    ? `${Math.round(section.similarity * 100)}%`
    : '—';
  return (
    <Card className="p-4 border-amber-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-amber-700">קונפליקט · התאמה {simPct}</span>
        <span className="text-xs text-slate-500">סקציה {idx + 1}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">סקציה חדשה (מהמסמך שהועלה)</div>
          <Input
            value={section.heading ?? ''}
            onChange={e => onUpdate({ heading: e.target.value || null })}
            placeholder="כותרת"
            className="mb-2"
          />
          <div className="font-mono text-xs bg-amber-50/40 border border-amber-100 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {section.contentText}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">
            סקציה קיימת — מתוך «{sim?.documentTitle ?? '?'}»
          </div>
          <div className="text-sm font-medium text-slate-700 mb-2 truncate">
            {sim?.heading ?? '(ללא כותרת)'}
          </div>
          <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {sim?.contentText ?? '—'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ResolutionButton
          active={resolution === 'replace'}
          onClick={() => onResolve('replace')}
          label="החלף את הקיים"
        />
        <ResolutionButton
          active={resolution === 'keep_both'}
          onClick={() => onResolve('keep_both')}
          label="שמור את שניהם"
        />
        <ResolutionButton
          active={resolution === 'skip'}
          onClick={() => onResolve('skip')}
          label="דלג"
        />
        {!resolution && (
          <span className="text-xs text-amber-700 self-center mr-2">⚠ לא נפתר</span>
        )}
      </div>
    </Card>
  );
}

function ResolutionButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-md text-sm border transition-colors',
        active
          ? 'bg-amber-600 text-white border-amber-700'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function DuplicateSectionRow({ section }: { section: Section }) {
  const sim = section.similarSection;
  const simPct = typeof section.similarity === 'number'
    ? `${Math.round(section.similarity * 100)}%`
    : '—';
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded border border-slate-100 bg-slate-50/50">
      <span className="text-slate-400 shrink-0">◯</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-700 truncate">
          {section.heading ?? section.contentText.slice(0, 80)}
        </div>
        <div className="text-xs text-slate-500 truncate">
          דומה ל: <span className="font-medium">{sim?.heading ?? sim?.documentTitle ?? '?'}</span>
          {' '}({simPct} התאמה)
        </div>
      </div>
    </div>
  );
}
