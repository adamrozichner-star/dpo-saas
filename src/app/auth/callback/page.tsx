'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('מתחבר...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Missing Supabase env vars');
          router.push('/login?error=config');
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Handle the OAuth callback - exchange code for session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // Also check for code in query params (for PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          // PKCE flow - exchange code for session
          setStatus('מאמת...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            router.push('/login?error=auth');
            return;
          }
        } else if (accessToken) {
          // Implicit flow - set session from tokens
          setStatus('מאמת...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) {
            console.error('Set session error:', error);
            router.push('/login?error=auth');
            return;
          }
        }

        // Now get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error('Session error:', sessionError);
          router.push('/login?error=session');
          return;
        }

        setStatus('בודק פרופיל...');

        // Check if user profile exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!existingUser) {
          setStatus('יוצר חשבון...');
          
          // Create user profile for new Google users
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
            // Continue anyway - user might already exist
          }

          // Send welcome email
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template: 'welcome',
                to: session.user.email,
                data: {
                  name: name,
                  orgName: 'הארגון שלך'
                }
              })
            });
          } catch (e) {
            console.error('Failed to send welcome email:', e);
          }

          // New user - redirect to onboarding
          setStatus('מעביר להגדרות...');
          router.push('/onboarding');
        } else {
          // Existing user - redirect to dashboard
          setStatus('מעביר ללוח הבקרה...');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/login?error=unknown');
      }
    };

    // Small delay to ensure URL params are available
    setTimeout(handleCallback, 100);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">{status}</p>
      </div>
    </div>
  );
}
