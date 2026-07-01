import type { Actor } from '@/components/shell/nav'

// Map a users.role to the shell actor theme. expert_curator (Roy / Amir / Adam)
// sees the DPO (Onyx) theme; everyone else - including a self-signup business
// owner (role 'admin') - sees the owner (light) theme. Pure, no deps.
export function actorFromRole(role: string | undefined): Actor {
  return role === 'expert_curator' ? 'dpo' : 'owner'
}

// Where a user lands after login, by role. A DPO (expert_curator) goes to the v3
// console; a business owner to the owner home. A user with no org yet still needs
// onboarding. Single source for the login + OAuth-callback redirects; replaces the
// old unconditional /chat (and the legacy /dashboard + /subscribe funnel).
export function landingPathForUser(role: string | null | undefined, hasOrg: boolean): string {
  if (!hasOrg) return '/onboarding'
  return role === 'expert_curator' ? '/console' : '/home'
}
