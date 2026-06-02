// Signup gate — controls whether the public can self-serve into the
// onboarding/payment funnel. Set NEXT_PUBLIC_SIGNUP_ENABLED=true to
// enable; anything else (missing, empty, malformed) leaves signup
// DISABLED and routes users to /lead-signup instead.
//
// -----------------------------------------------------------------------------
// FAIL-SAFE DIRECTION
// -----------------------------------------------------------------------------
// The risky failure mode here is "signup quietly comes back on" (would
// accept payments, create accounts, surface Cardcom flows). The safe
// failure mode is "user lands on the early-access form by mistake."
// We pick the second.
//
// Therefore: ONLY the exact string 'true' enables signup. Anything else
// — undefined / '' / 'false' / 'TRUE' / '1' / 'yes' / whitespace —
// resolves to disabled.
//
// -----------------------------------------------------------------------------
// CALLERS
// -----------------------------------------------------------------------------
// - src/middleware.ts (server-side, runtime env): the AUTHORITATIVE gate
//   for /register, /onboarding, /subscribe, /checkout. Redirects to
//   /lead-signup when disabled.
// - Public-page CTAs (page.tsx, calculator, login footer, get-started,
//   welcome): use signupHref() to pick the right link target. Cosmetic
//   only — middleware still catches direct-URL bypass.
//
// -----------------------------------------------------------------------------
// NEXT_PUBLIC_* DEPLOY NOTE
// -----------------------------------------------------------------------------
// NEXT_PUBLIC_* env vars are inlined into the client bundle at BUILD
// time. Flipping the flag in Vercel requires a redeploy for client CTAs
// to update; the middleware reads at runtime and sees changes on the
// next request. During the brief redeploy window the middleware is the
// authoritative gate.

export function isSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SIGNUP_ENABLED === 'true'
}

/**
 * Pick the right href for a CTA that *would* lead into the signup
 * funnel. When signup is enabled, returns the original target;
 * otherwise routes to the early-access form.
 *
 * Use for public-page Link/router.push targets. In-app pages don't
 * need this — the middleware redirects them server-side.
 */
export function signupHref(originalTarget: string): string {
  return isSignupEnabled() ? originalTarget : '/lead-signup'
}
