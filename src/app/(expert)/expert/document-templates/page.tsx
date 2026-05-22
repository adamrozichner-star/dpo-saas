'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatExpertError } from '@/lib/expert-i18n';

interface Row {
  id: string;
  templateId: string;
  version: number;
  name: string;
  assetTemplateId: string;
  outputFormat: string;
  sourceTier: string;
  confidence: number;
  updatedAt: string;
}

export default function DocumentTemplatesListPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [assetNames, setAssetNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [docs, assets] = await Promise.all([
          fetch('/api/expert/document-templates',
            { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch('/api/expert/asset-templates',
            { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ]);
        if (!docs.ok) throw new Error(formatExpertError(docs.status, await docs.text()));
        const docsJson = await docs.json();
        setRows(docsJson.rows ?? []);
        if (assets.ok) {
          const assetsJson = await assets.json();
          const map: Record<string, string> = {};
          for (const a of assetsJson.rows ?? []) map[a.templateId] = a.name;
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
          <h1 className="text-2xl font-semibold">תבניות מסמכים</h1>
          <p className="text-slate-500 mt-1">
            תבניות טקסט עם משתנים שיוצרות מסמכים מותאמים אישית לכל לקוח.
          </p>
        </div>
        <Link href="/expert/document-templates/new">
          <Button>תבנית חדשה</Button>
        </Link>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">טוען…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            אין עדיין תבניות מסמכים. לחצו על <span className="font-semibold">תבנית חדשה</span> כדי להוסיף.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-right text-xs tracking-wide text-slate-500">
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">תבנית נכס</th>
                <th className="px-4 py-3">פורמט</th>
                <th className="px-4 py-3">ג׳</th>
                <th className="px-4 py-3">דרגת מקור</th>
                <th className="px-4 py-3">ודאות</th>
                <th className="px-4 py-3">עודכן</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/expert/document-templates/${r.templateId}`}
                      className="font-medium text-slate-900 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{assetNames[r.assetTemplateId] ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.outputFormat}</td>
                  <td className="px-4 py-3 text-slate-500">ג׳{r.version}</td>
                  <td className="px-4 py-3 text-slate-500">{r.sourceTier}</td>
                  <td className="px-4 py-3 text-slate-500">{r.confidence.toFixed(2)}</td>
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
