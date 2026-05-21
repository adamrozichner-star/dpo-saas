// create_notification skill — emit a user-visible notification attributed to
// the calling persona. The actor + actor_role columns let the UI render
// "Dana (Privacy Manager) found 3 cameras needing review."

import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPersona } from '@/lib/agents/registry';
import type { Skill } from './types';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SEVERITY_TO_TYPE: Record<'info' | 'warning' | 'critical', string> = {
  info: 'agent:info',
  warning: 'agent:warning',
  critical: 'agent:critical',
};

const Input = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  severity: z.enum(['info', 'warning', 'critical']),
  link: z.string().optional(),
});

export const createNotification: Skill<z.infer<typeof Input>, { id: string }> = {
  definition: {
    name: 'create_notification',
    description:
      "Emit a user-visible notification attributed to you. Use for findings the org's user should act on (e.g. 'Camera in parking garage is missing signage'). Severity must match urgency: info = informational, warning = needs attention soon, critical = act now. Optional `link` directs the user to the relevant dashboard tab.",
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short headline shown in the notification bell.',
          minLength: 1,
          maxLength: 200,
        },
        body: {
          type: 'string',
          description: 'Detailed explanation. Should help the user understand what to do next.',
          minLength: 1,
          maxLength: 2000,
        },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'critical'],
          description: 'Urgency level. Drives notification styling.',
        },
        link: {
          type: 'string',
          description: "Optional in-app path the user should be directed to, e.g. '/dashboard?tab=cameras'.",
        },
      },
      required: ['title', 'body', 'severity'],
    },
    inputZodSchema: Input,
    isSideEffecting: true,
  },
  handler: async (input, ctx) => {
    const persona = await getPersona(ctx.personaSlug);
    const supabase = serviceSupabase();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        org_id: ctx.orgId,
        type: SEVERITY_TO_TYPE[input.severity],
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        actor: persona.slug,
        actor_role: persona.roleHe,
      })
      .select('id')
      .single();
    if (error || !data) {
      throw new Error(`create_notification: ${error?.message ?? 'no row returned'}`);
    }
    return { id: data.id as string };
  },
};
