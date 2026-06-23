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

interface LatestUpload {
  id: string;
  title: string;
  version: number;
  fetched_at: string;
  section_count: number;
}

interface Stats {
  total_documents: number;
  total_sections: number;
  documents_by_source: Record<string, number>;
  latest_uploads: LatestUpload[];
}

const SOURCE_ORG_HE: Record<string, string> = {
  privacy_protection_authority: 'רשות הגנת הפרטיות',
  knesset: 'הכנסת',
  court: 'בית משפט',
  eu_edpb: 'EDPB',
  other: 'אחר',
};

// Display labels for metadata.source values. Anything not in this map
// (incl. 'unknown') falls through to the raw key so curators can see it.
const SOURCE_METHOD_HE: Record<string, string> = {
  pdf_upload: 'העלאת PDF',
  scraper: 'סקרייפר',
  unknown: 'לא מסווג',
};

export default function RegulatorySourcesListPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        // Fire list + stats in parallel; the stats call failing should
        // not block the table from rendering.
        const [listRes, statsRes] = await Promise.all([
          fetch('/api/admin/regulatory-sources', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/admin/regulatory-sources/stats', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);
        if (!listRes.ok) throw new Error(formatExpertError(listRes.status, await listRes.text()));
        const listJson = await listRes.json();
        setRows(listJson.rows ?? []);
        if (statsRes.ok) {
          setStats((await statsRes.json()) as Stats);
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
          <h1 className="text-2xl font-semibold">מקורות רגולציה</h1>
          <p className="text-slate-500 mt-1">
            חוקים, הנחיות רגולטוריות ופסיקה שאוצרים העלו כמקור לציטוטים מתוך ספריית ה-Hub.
          </p>
        </div>
        <Link href="/expert/regulatory-sources/upload">
          <Button>העלה מסמך חדש</Button>
        </Link>
      </header>

      {stats && (
        <Card className="mb-6 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">סטטיסטיקות ספריית מקורות הרגולציה</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">סה״כ מסמכים:</span>{' '}
                <span className="font-semibold text-slate-900">{stats.total_documents}</span>
              </div>
              <div>
                <span className="text-slate-500">סה״כ סקציות:</span>{' '}
                <span className="font-semibold text-slate-900">{stats.total_sections}</span>
              </div>
              {Object.entries(stats.documents_by_source).map(([src, count]) => (
                <div key={src}>
                  <span className="text-slate-500">{SOURCE_METHOD_HE[src] ?? src}:</span>{' '}
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
            {stats.latest_uploads.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">הועלו לאחרונה</div>
                <ul className="space-y-1 text-sm">
                  {stats.latest_uploads.map(u => (
                    <li key={u.id} className="flex items-baseline gap-2">
                      <Link
                        href={`/expert/regulatory-sources/${u.id}`}
                        className="text-slate-900 hover:underline line-clamp-1"
                      >
                        {u.title}
                      </Link>
                      <span className="text-xs text-slate-400 shrink-0">
                        ג׳{u.version} · {u.section_count} סקציות · {new Date(u.fetched_at).toLocaleDateString('he-IL')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

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
