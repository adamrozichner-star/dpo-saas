// Persona registry. Loads team_personas from the DB and serves callers
// (Hub orchestrator, persona routing, UI attribution helpers) with a typed
// Persona object.
//
// NO hardcoded Hebrew strings, names, roles, colors, or system prompts here.
// Everything user-visible lives in the team_personas rows and is loaded at
// runtime. The only literals in this file are the slugs that the rest of
// the codebase uses as stable code references ('dana', 'yossi', 'tamar').
//
// Caching: single CacheState object with a 5-minute TTL. Both lookup APIs
// share the same snapshot, so an empty result set (e.g. all personas
// deactivated) stays cached for the TTL window rather than re-querying on
// every call. Each Fluid Compute instance refreshes once per window.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Persona, PersonaSchema } from '@/lib/types/agents';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheState {
  personasBySlug: Map<string, Persona>;
  loadedAt: number;
}

let cacheState: CacheState | null = null;

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function loadPersonasFromDB(): Promise<Persona[]> {
  const supabase = serviceSupabase();
  const { data, error } = await supabase
    .from('team_personas')
    .select('*')
    .eq('active', true);
  if (error) {
    throw new Error(`registry: load team_personas: ${error.message}`);
  }
  return (data ?? []).map(row => PersonaSchema.parse(row));
}

function cacheFresh(): boolean {
  return cacheState !== null && Date.now() - cacheState.loadedAt < CACHE_TTL_MS;
}

async function refreshCache(): Promise<CacheState> {
  const personas = await loadPersonasFromDB();
  const personasBySlug = new Map(personas.map(p => [p.slug, p]));
  cacheState = { personasBySlug, loadedAt: Date.now() };
  return cacheState;
}

export async function getPersona(slug: string): Promise<Persona> {
  const state = cacheFresh() ? cacheState! : await refreshCache();
  const persona = state.personasBySlug.get(slug);
  if (!persona) {
    throw new Error(`registry: persona '${slug}' not found (or inactive)`);
  }
  return persona;
}

export async function listActivePersonas(): Promise<Persona[]> {
  const state = cacheFresh() ? cacheState! : await refreshCache();
  return Array.from(state.personasBySlug.values());
}
