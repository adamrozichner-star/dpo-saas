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
        // Unlisted brand-book demo (static bundle in public/).
        // CSP deltas vs the global policy:
        //   script-src += https://unpkg.com            (lucide icons)
        //   style-src  += https://fonts.googleapis.com (Google Fonts CSS @import)
        //   font-src   += https://fonts.gstatic.com    (font files)
        //   connect-src / frame-src trimmed — static pages, no API calls.
        // X-Robots-Tag keeps the path out of search indexes. The path is
        // intentionally NOT in robots.txt — listing it there would
        // advertise the URL.
        source: '/brand-v2-x7k3q9/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';"
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
    // is NOT served at /<dir>. These map the brand book's three directory
    // URLs onto their index files. (Next's default trailing-slash redirect
    // folds '/x/' into '/x' before these match.)
    return [
      { source: '/brand-v2-x7k3q9', destination: '/brand-v2-x7k3q9/index.html' },
      { source: '/brand-v2-x7k3q9/slides', destination: '/brand-v2-x7k3q9/slides/index.html' },
      { source: '/brand-v2-x7k3q9/ui_kits/marketing', destination: '/brand-v2-x7k3q9/ui_kits/marketing/index.html' },
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
