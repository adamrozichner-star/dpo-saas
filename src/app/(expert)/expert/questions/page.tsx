'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatExpertError } from '@/lib/expert-i18n';

interface Row {
  id: string; templateId: string; version: number;
  assetTemplateId: string; orderIndex: number;
  questionText: string; questionType: string; required: boolean;
  sourceTier: string; confidence: number; updatedAt: string;
}

export default function QuestionsListPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [assetNames, setAssetNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [qs, assets] = await Promise.all([
          fetch('/api/expert/questions', { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch('/api/expert/asset-templates', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ]);
        if (!qs.ok) throw new Error(formatExpertError(qs.status, await qs.text()));
        const qj = await qs.json();
        // sort: asset_template grouping then order_index
        const sorted = [...(qj.rows ?? [])].sort((a: Row, b: Row) => {
          if (a.assetTemplateId !== b.assetTemplateId) return a.assetTemplateId.localeCompare(b.assetTemplateId);
          return a.orderIndex - b.orderIndex;
        });
        setRows(sorted);
        if (assets.ok) {
          const aj = await assets.json();
          const map: Record<string, string> = {};
          for (const a of aj.rows ?? []) map[a.templateId] = a.name;
          setAssetNames(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">שאלות</h1>
          <p className="text-slate-500 mt-1">שאלות גילוי שכל לקוח יענה עליהן עבור כל תבנית נכס.</p>
        </div>
        <Link href="/expert/questions/new"><Button>שאלה חדשה</Button></Link>
      </header>

      {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">טוען…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            אין עדיין שאלות. לחצו <span className="font-semibold">שאלה חדשה</span> כדי להוסיף.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-right text-xs tracking-wide text-slate-500">
                <th className="px-4 py-3">סדר</th>
                <th className="px-4 py-3">שאלה</th>
                <th className="px-4 py-3">תבנית נכס</th>
                <th className="px-4 py-3">סוג</th>
                <th className="px-4 py-3">חובה</th>
                <th className="px-4 py-3">ג׳</th>
                <th className="px-4 py-3">דרגת מקור</th>
                <th className="px-4 py-3">עודכן</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{r.orderIndex}</td>
                  <td className="px-4 py-3">
                    <Link href={`/expert/questions/${r.templateId}`}
                      className="font-medium text-slate-900 hover:underline line-clamp-2">
                      {r.questionText}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{assetNames[r.assetTemplateId] ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.questionType}</td>
                  <td className="px-4 py-3 text-slate-500">{r.required ? 'כן' : 'לא'}</td>
                  <td className="px-4 py-3 text-slate-500">ג׳{r.version}</td>
                  <td className="px-4 py-3 text-slate-500">{r.sourceTier}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.updatedAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
