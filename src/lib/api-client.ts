// src/lib/api-client.ts
// Authenticated fetch wrapper for client-side API calls.
// Automatically attaches the Supabase session JWT to every request.

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Create an authenticated fetch function bound to the current Supabase session.
 * 
 * Usage in components:
 *   const { supabase } = useAuth()
 *   const fetchApi = useAuthFetch(supabase)
 *   const data = await fetchApi('/api/chat', { method: 'POST', body: ... })
 */
export function createAuthFetch(supabase: SupabaseClient | null) {
  return async function authFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers)
    
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
      }
    }
    
    // Ensure content-type for POST/PUT/PATCH
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    
    return fetch(url, { ...options, headers })
  }
}

/**
 * Hook-friendly version — call inside React components.
 * 
 * Usage:
 *   import { useAuth } from '@/lib/auth-context'
 *   import { createAuthFetch } from '@/lib/api-client'
 *   
 *   const { supabase } = useAuth()
 *   const api = createAuthFetch(supabase)
 *   
 *   // GET
 *   const res = await api(`/api/chat?orgId=${orgId}`)
 *   
 *   // POST
 *   const res = await api('/api/chat', {
 *     method: 'POST',
 *     body: JSON.stringify({ action: 'send', orgId, message })
 *   })
 */
