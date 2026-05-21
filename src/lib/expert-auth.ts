// Curator-only auth helper for Expert Console API routes.
// Validates the JWT, looks up the public.users row, and returns the curator
// info if and only if the user has role='expert_curator'. Distinct from
// authenticateRequest() in src/lib/api-auth.ts because curator routes are
// not org-scoped — Roy/Amir/Adam edit the global Hub library.

import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/api-auth';

export interface CuratorAuthResult {
  authUserId: string;
  userId: string; // public.users.id (use this for created_by FK)
  email: string;
}

export async function authenticateCurator(
  request: NextRequest,
): Promise<CuratorAuthResult | null> {
  const sb = getServiceSupabase();

  const authHeader = request.headers.get('authorization');
  const altHeader = request.headers.get('x-supabase-auth');
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (altHeader) {
    token = altHeader;
  }
  if (!token) return null;

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return null;

  const { data: row, error: userErr } = await sb
    .from('users')
    .select('id, email, role')
    .eq('auth_user_id', user.id)
    .single();
  if (userErr || !row) return null;
  if (row.role !== 'expert_curator') return null;

  return {
    authUserId: user.id,
    userId: row.id as string,
    email: row.email as string,
  };
}
