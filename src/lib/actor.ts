import type { Actor } from '@/components/shell/nav'

// Map a users.role to the shell actor theme. expert_curator (Roy / Amir / Adam)
// sees the DPO (Onyx) theme; everyone else - including a self-signup business
// owner (role 'admin') - sees the owner (light) theme. Pure, no deps.
export function actorFromRole(role: string | undefined): Actor {
  return role === 'expert_curator' ? 'dpo' : 'owner'
}
