import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for cron job

// Email sequence timing
const SEQUENCE = [
  { day: 0, template: 'welcome' },
  { day: 2, template: 'value_reminder' },
  { day: 4, template: 'how_to_guide' },
  { day: 6, template: 'social_proof' },
  { day: 11, template: 'trial_ending' },
  { day: 13, template: 'last_chance' },
];

const TRIAL_DAYS = 14;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const now = new Date();
  const results: any[] = [];

  try {
    // Get all trial users who haven't converted
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscription_status,
        created_at,
        users!inner (
          id,
          email,
          name,
          email_sequence_stage,
          last_email_sent
        ),
        documents:documents(count)
      `)
      .eq('subscription_status', 'trial')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    for (const org of orgs || []) {
      for (const user of org.users || []) {
        const signupDate = new Date(org.created_at);
        const daysSinceSignup = Math.floor(
          (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Find the next email to send
        const currentStage = user.email_sequence_stage || 0;
        const nextEmail = SEQUENCE.find(
          (seq, index) => index === currentStage && seq.day <= daysSinceSignup
        );

        if (!nextEmail) continue;

        // Check if we already sent today
        if (user.last_email_sent) {
          const lastSent = new Date(user.last_email_sent);
          if (lastSent.toDateString() === now.toDateString()) {
            continue; // Already sent today
          }
        }

        // Calculate days left in trial
        const daysLeft = Math.max(0, TRIAL_DAYS - daysSinceSignup);

        // Send the email
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
          const response = await fetch(`${baseUrl}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.email,
              template: nextEmail.template,
              data: {
                userName: user.name,
                organizationName: org.name,
                daysLeft,
                documentsCreated: org.documents?.[0]?.count || 0,
              },
            }),
          });

          if (response.ok) {
            // Update user's email stage
            await supabase
              .from('users')
              .update({
                email_sequence_stage: currentStage + 1,
                last_email_sent: now.toISOString(),
              })
              .eq('id', user.id);

            results.push({
              userId: user.id,
              email: user.email,
              template: nextEmail.template,
              status: 'sent',
            });
          } else {
            results.push({
              userId: user.id,
              email: user.email,
              template: nextEmail.template,
              status: 'failed',
              error: await response.text(),
            });
          }
        } catch (error) {
          console.error(`Error sending email to ${user.email}:`, error);
          results.push({
            userId: user.id,
            email: user.email,
            template: nextEmail.template,
            status: 'failed',
            error: String(error),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Email sequence cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process email sequence' },
      { status: 500 }
    );
  }
}
