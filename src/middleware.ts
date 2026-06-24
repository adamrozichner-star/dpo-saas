// Server-side gate for the signup funnel (PR 4 / Task 3 of the
// site-changes spec). When NEXT_PUBLIC_SIGNUP_ENABLED is not exactly
// 'true', direct hits to any signup/payment page get 307-redirected
// to /lead-signup.
//
// This is the AUTHORITATIVE gate. Client CTAs use signupHref() for
// the same routing but are cosmetic — middleware still catches direct
// URL entry, hand-typed paths, old bookmarks, and stale links from
// post-login pages we deliberately did not edit.
//
// Fail-safe behavior: see src/lib/signup-flag.ts header. Missing,
// empty, or malformed env → DISABLED → redirect.

import { NextRequest, NextResponse } from 'next/server'

// Paths blocked when signup is disabled. Each entry matches the path
// itself and any subpaths. /checkout is included because it's the
// route that initiates the Cardcom payment flow. /get-started is the
// pre-onboarding quick assessment — funnel infrastructure that must
// be closed end-to-end (its terminal /onboarding is gated below, but
// gating /get-started too stops an authenticated user from being
// dropped into the assessment UI by a direct URL).
const GATED_PREFIXES = [
  '/register',
  '/get-started',
  '/onboarding',
  '/subscribe',
  '/checkout',
] as const

function isGated(pathname: string): boolean {
  return GATED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/'),
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dev-only routes: never expose outside development. The pages also guard
  // themselves with notFound(), but a top-level notFound() commits a 200 once the
  // response shell streams, so this is the authoritative source of the real 404
  // HTTP status for these routes on production deployments.
  if (
    pathname === '/brand-gallery' || pathname.startsWith('/brand-gallery/') ||
    pathname === '/shell-demo' || pathname.startsWith('/shell-demo/') ||
    pathname === '/ledger-gallery' || pathname.startsWith('/ledger-gallery/')
  ) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Not Found', { status: 404 })
    }
    return NextResponse.next()
  }

  // Fail-safe: only the exact string 'true' enables signup.
  const signupEnabled = process.env.NEXT_PUBLIC_SIGNUP_ENABLED === 'true'
  if (signupEnabled) {
    return NextResponse.next()
  }

  if (!isGated(pathname)) {
    return NextResponse.next()
  }

  // Redirect to /lead-signup with original target as a query param —
  // useful breadcrumb if we ever want to log "they tried to go to X".
  const url = request.nextUrl.clone()
  url.pathname = '/lead-signup'
  url.search = pathname.length > 1 ? `?from=${encodeURIComponent(pathname)}` : ''
  return NextResponse.redirect(url, 307)
}

// Match only the gated prefixes. Matching narrowly avoids running the
// middleware on every request — anything outside these paths bypasses
// it entirely.
export const config = {
  matcher: [
    '/brand-gallery',
    '/brand-gallery/:path*',
    '/shell-demo',
    '/shell-demo/:path*',
    '/ledger-gallery',
    '/ledger-gallery/:path*',
    '/register/:path*',
    '/register',
    '/get-started/:path*',
    '/get-started',
    '/onboarding/:path*',
    '/onboarding',
    '/subscribe/:path*',
    '/subscribe',
    '/checkout/:path*',
    '/checkout',
  ],
}
