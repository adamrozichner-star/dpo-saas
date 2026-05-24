'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatExpertError } from '@/lib/expert-i18n';

interface Row {
  id: string;
  url: string;
  title: string;
  sourceOrg: string;
  version: number;
  sectionCount: number;
  fetchedAt: string;
  metadata: Record<string, unknown>;
}

const SOURCE_ORG_HE: Record<string, string> = {
  privacy_protection_authority: 'רשות הגנת הפרטיות',
  knesset: 'הכנסת',
  court: 'בית משפט',
  eu_edpb: 'EDPB',
  other: 'אחר',
};

export default function RegulatorySourcesListPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/regulatory-sources', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(formatExpertError(res.status, await res.text()));
        const json = await res.json();
        setRows(json.rows ?? []);
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
          <h1 className="text-2xl font-semibold">מקורות רגולציה</h1>
          <p className="text-slate-500 mt-1">
            חוקים, הנחיות רגולטוריות ופסיקה שאוצרים העלו כמקור לציטוטים מתוך ספריית ה-Hub.
          </p>
        </div>
        <Link href="/expert/regulatory-sources/upload">
          <Button>העלה מסמך חדש</Button>
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
            אין עדיין מקורות. לחצו על <span className="font-semibold">העלה מסמך חדש</span> כדי להתחיל.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-right text-xs tracking-wide text-slate-500">
                <th className="px-4 py-3">כותרת</th>
                <th className="px-4 py-3">סוג מקור</th>
                <th className="px-4 py-3">סקציות</th>
                <th className="px-4 py-3">ג׳</th>
                <th className="px-4 py-3">נוסף</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/expert/regulatory-sources/${r.id}`}
                      className="font-medium text-slate-900 hover:underline line-clamp-2"
                    >
                      {r.title}
                    </Link>
                    {r.url && (
                      <div className="text-xs text-slate-400 font-mono mt-1 truncate" dir="ltr">
                        {r.url}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{SOURCE_ORG_HE[r.sourceOrg] ?? r.sourceOrg}</td>
                  <td className="px-4 py-3 text-slate-500">{r.sectionCount}</td>
                  <td className="px-4 py-3 text-slate-500">ג׳{r.version}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.fetchedAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
