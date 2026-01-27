'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase env vars');
        router.push('/login?error=config');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Get the session from URL hash
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=auth');
        return;
      }

      if (session?.user) {
        // Check if user profile exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!existingUser) {
          // Create user profile for new Google users
          const name = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       session.user.email?.split('@')[0] || 'משתמש';

          await supabase.from('users').insert({
            auth_user_id: session.user.id,
            email: session.user.email,
            name: name,
            role: 'admin'
          });

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
          router.push('/onboarding');
        } else {
          // Existing user - redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">מתחבר...</p>
      </div>
    </div>
  );
}
