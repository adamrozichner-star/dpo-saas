const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Global security headers — everything EXCEPT the unlisted brand
        // book. The exclusion is required because browsers enforce the
        // INTERSECTION of multiple CSP headers: a second, looser CSP on
        // the brand path would not override this one, so the path must be
        // carved out here and given its own block below. The CSP value
        // itself is byte-identical to what it was before this change.
        source: '/((?!brand-v2-x7k3q9).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.cardcom.solutions; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://*.cardcom.solutions https://*.sentry.io wss://*.supabase.co; frame-src https://*.cardcom.solutions; frame-ancestors 'none';"
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Unlisted brand-book demo — a single self-contained deck file in
        // public/brand-v2-x7k3q9/index.html. The deck inlines its own
        // engine and image assets (data: URIs), so the only external
        // dependency is Google Fonts.
        // CSP deltas vs the global policy:
        //   style-src += https://fonts.googleapis.com (Google Fonts CSS @import)
        //   font-src  += https://fonts.gstatic.com    (font files)
        //   script-src / img-src trimmed to self+inline / self+data: (no unpkg).
        //   connect-src / frame-src trimmed — static page, no API calls.
        // X-Robots-Tag keeps the path out of search indexes. The path is
        // intentionally NOT in robots.txt — listing it there would
        // advertise the URL.
        source: '/brand-v2-x7k3q9/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none';"
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async rewrites() {
    // Next.js serves public/ files by exact path only: public/<dir>/index.html
    // is NOT served at /<dir>. This maps the brand book's root URL onto its
    // index file. (Next's default trailing-slash redirect folds '/x/' into
    // '/x' before this matches.)
    return [
      { source: '/brand-v2-x7k3q9', destination: '/brand-v2-x7k3q9/index.html' },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: 'deepo-05',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
