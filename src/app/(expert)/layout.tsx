'use client';

// Expert Console layout — gated by user.role === 'expert_curator'.
// Renders a sidebar with the 6 artifact areas. Only asset_templates is
// actually wired up tonight; the other 5 link to "coming soon" pages.

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface CuratorState {
  status: 'loading' | 'authorized' | 'denied';
}

const NAV_ITEMS: Array<{ href: string; label: string; ready: boolean }> = [
  { href: '/expert',                          label: 'Overview',              ready: true },
  { href: '/expert/asset-templates',          label: 'Asset Templates',       ready: true },
  { href: '/expert/questions',                label: 'Questions',             ready: false },
  { href: '/expert/document-templates',       label: 'Document Templates',    ready: false },
  { href: '/expert/control-playbooks',        label: 'Control Playbooks',     ready: false },
  { href: '/expert/gap-rules',                label: 'Gap Rules',             ready: false },
  { href: '/expert/continuation-services',    label: 'Continuation Services', ready: false },
];

export default function ExpertLayout({ children }: { children: ReactNode }) {
  const { user, supabase, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<CuratorState>({ status: 'loading' });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      router.replace('/login');
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();
      if (error || !data || data.role !== 'expert_curator') {
        setState({ status: 'denied' });
        // Brief flash before redirect so the user sees the message
        setTimeout(() => router.replace('/dashboard'), 1500);
        return;
      }
      setState({ status: 'authorized' });
    })();
  }, [user, supabase, authLoading, router]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <span>Loading…</span>
      </div>
    );
  }
  if (state.status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
          <p className="text-slate-500">Expert Console is for curators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="ltr">
      <div className="flex">
        <aside className="w-64 min-h-screen border-r border-slate-200 bg-white p-4">
          <div className="mb-6">
            <Link href="/expert" className="block text-lg font-semibold text-slate-900">
              Deepo Expert Console
            </Link>
            <p className="text-xs text-slate-500 mt-1">L1 Hub library</p>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href || (item.href !== '/expert' && pathname?.startsWith(item.href));
              const baseCls = 'flex items-center justify-between px-3 py-2 rounded-md text-sm';
              if (!item.ready) {
                return (
                  <span
                    key={item.href}
                    className={`${baseCls} text-slate-400 cursor-not-allowed`}
                    title="Schema ready — UI coming"
                  >
                    {item.label}
                    <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">soon</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${baseCls} ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
