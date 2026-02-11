'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

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
          
          // Clear any old onboarding data for fresh start
          localStorage.removeItem('dpo_onboarding_answers');
          localStorage.removeItem('dpo_onboarding_step');
          localStorage.removeItem('dpo_onboarding_org_id');
          localStorage.removeItem('dpo_onboarding_org_name');
          
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

          // Send welcome email (don't wait)
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template: 'welcome',
              to: session.user.email,
              data: { name, orgName: 'הארגון שלך' }
            })
          }).catch(e => console.error('Email error:', e));

          // New user - go to onboarding
          setStatus('מעביר להגדרות...');
          // Small delay to ensure session is fully stored
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/onboarding';
        } else {
          // Existing user - check if they have an active subscription
          setStatus('בודק מנוי...');
          
          // Get user's org_id
          const { data: fullUser } = await supabase
            .from('users')
            .select('org_id')
            .eq('auth_user_id', session.user.id)
            .single();
          
          let hasSubscription = false;
          if (fullUser?.org_id) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('org_id', fullUser.org_id)
              .in('status', ['active', 'past_due'])
              .maybeSingle();
            hasSubscription = !!sub;
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          if (hasSubscription) {
            setStatus('מעביר ללוח הבקרה...');
            window.location.href = '/dashboard';
          } else if (fullUser?.org_id) {
            // Has org but no subscription — needs to pay
            setStatus('מעביר לתשלום...');
            window.location.href = '/payment-required';
          } else {
            // No org — needs onboarding
            setStatus('מעביר להגדרות...');
            window.location.href = '/onboarding';
          }
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
