'use client';

// Expert Console overview. Renders a count card per Hub artifact table
// (latest active version per template_id) plus recent activity. Tonight
// only the asset_templates surface is interactive — the rest show counts
// only.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';

interface CountResult {
  assetTemplates: number;
  questions: number;
  documents: number;
  controls: number;
  gaps: number;
  services: number;
}

export default function ExpertOverviewPage() {
  const { supabase } = useAuth();
  const [counts, setCounts] = useState<CountResult | null>(null);
  const [recent, setRecent] = useState<Array<{ name: string; updatedAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const tables = [
          'hub_asset_templates',
          'hub_questions',
          'hub_document_templates',
          'hub_control_playbooks',
          'hub_gap_rules',
          'hub_continuation_services',
        ];
        // Count distinct template_ids per table (= number of logical artifacts)
        const results = await Promise.all(
          tables.map(t =>
            supabase
              .from(t)
              .select('template_id', { count: 'exact', head: true })
              .eq('active', true),
          ),
        );
        setCounts({
          assetTemplates: results[0].count ?? 0,
          questions:      results[1].count ?? 0,
          documents:      results[2].count ?? 0,
          controls:       results[3].count ?? 0,
          gaps:           results[4].count ?? 0,
          services:       results[5].count ?? 0,
        });

        const { data: recentRows } = await supabase
          .from('hub_asset_templates')
          .select('name, updated_at')
          .eq('active', true)
          .order('updated_at', { ascending: false })
          .limit(5);
        setRecent(
          (recentRows ?? []).map(r => ({
            name: r.name as string,
            updatedAt: r.updated_at as string,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [supabase]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">ספריית L1 Hub</h1>
        <p className="text-slate-500 mt-1">
          אצרו את ספריית הציות הגלובלית. כל הלקוחות קוראים מהטבלאות האלה.
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 mb-8">
        <CountCard label="תבניות נכסים"     n={counts?.assetTemplates} href="/expert/asset-templates" ready />
        <CountCard label="שאלות"            n={counts?.questions}                                     />
        <CountCard label="תבניות מסמכים"     n={counts?.documents}                                     />
        <CountCard label="ספרי פעולה לבקרה" n={counts?.controls}                                      />
        <CountCard label="כללי פערים"       n={counts?.gaps}                                          />
        <CountCard label="שירותי המשך"      n={counts?.services}                                      />
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 mb-2">
          תבניות נכסים אחרונות
        </h2>
        <Card className="p-4">
          {recent.length === 0 ? (
            <p className="text-slate-500 text-sm">אין עדיין תבניות נכסים.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r, i) => (
                <li key={i} className="py-2 flex justify-between text-sm">
                  <span>{r.name}</span>
                  <span className="text-slate-400">{new Date(r.updatedAt).toLocaleString('he-IL')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function CountCard({ label, n, href, ready }: { label: string; n: number | undefined; href?: string; ready?: boolean }) {
  const content = (
    <Card className={`p-5 ${ready ? 'hover:border-slate-400 transition-colors' : 'opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs tracking-wide text-slate-500">{label}</div>
          <div className="text-3xl font-semibold mt-1">{n ?? '—'}</div>
        </div>
        {!ready && (
          <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">בקרוב</span>
        )}
      </div>
    </Card>
  );
  if (ready && href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
