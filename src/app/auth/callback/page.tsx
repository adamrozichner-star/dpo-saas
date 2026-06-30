'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { landingPathForUser } from '@/lib/actor';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('מתחבר...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Missing Supabase env vars');
          window.location.href = '/login?error=config';
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Check for code in query params (PKCE flow - most common)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        // Also check hash for implicit flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          setStatus('מאמת...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            window.location.href = '/login?error=auth';
            return;
          }
          console.log('Session established via code exchange');
        } else if (accessToken) {
          setStatus('מאמת...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) {
            console.error('Set session error:', error);
            window.location.href = '/login?error=auth';
            return;
          }
          console.log('Session established via tokens');
        } else {
          console.log('No code or tokens in URL, checking existing session');
        }

        // Wait a moment for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          window.location.href = '/login?error=session';
          return;
        }

        if (!session?.user) {
          console.error('No session found');
          window.location.href = '/login?error=nosession';
          return;
        }

        console.log('Session user:', session.user.email);
        setStatus('בודק פרופיל...');

        // Check if user profile exists
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('User lookup error:', userError);
        }

        if (!existingUser) {
          setStatus('יוצר חשבון...');

          // Fresh signup: sweep any app-owned localStorage so this user starts clean.
          // v3 keys are user-scoped now, but legacy global keys from old sessions
          // (or quick-assessment payloads) could still pollute the onboarding flow.
          try {
            const stale: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('dpo_') || k.startsWith('deepo_'))) stale.push(k);
            }
            stale.forEach(k => localStorage.removeItem(k));
          } catch { /* storage unavailable — ignore */ }
          
          const name = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       session.user.email?.split('@')[0] || 'משתמש';

          const { error: insertError } = await supabase.from('users').insert({
            auth_user_id: session.user.id,
            email: session.user.email,
            name: name,
            role: 'admin'
          });

          if (insertError) {
            console.error('User insert error:', insertError);
          }

          // Welcome email is sent from complete-onboarding (server-side with real org name)

          // New user - go to onboarding
          setStatus('מעביר לשאלון...');
          // Small delay to ensure session is fully stored
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/onboarding';
        } else {
          // Existing user - route by role (DPO -> /console, owner -> /home),
          // or to onboarding if they have no org yet. The legacy
          // subscription -> /dashboard / /subscribe funnel retires with the
          // legacy engine; v3 surfaces are auth-gated.
          setStatus('מעביר...');
          const { data: fullUser } = await supabase
            .from('users')
            .select('role, org_id')
            .eq('auth_user_id', session.user.id)
            .single();
          const row = fullUser as { role: string | null; org_id: string | null } | null;
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = landingPathForUser(row?.role ?? null, !!row?.org_id);
        }
      } catch (err) {
        console.error('Callback error:', err);
        window.location.href = '/login?error=unknown';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">{status}</p>
      </div>
    </div>
  );
}
