# Deepo Audit Report — 2026-04-07

**Live URL:** https://dpo-saas.vercel.app  
**Domain:** deepo.co.il (currently pointing to Apache default page — NOT to Vercel)

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 2 | 3 | 4 | 2 |
| Performance | 0 | 1 | 2 | 1 |
| Responsive | 0 | 0 | 1 | 1 |
| **Total** | **2** | **4** | **7** | **4** |

---

## CRITICAL Issues (fix immediately)

### C1: `/api/debug-org` returns 200 without authentication
- **Location:** `src/app/api/debug-org/route.ts`
- **Risk:** Data exposure — endpoint accepts `?email=` parameter and likely returns org data
- **Status:** Returns `{"error":"Pass ?email=..."}` — an attacker can enumerate users by email
- **Fix:** Delete this endpoint entirely (it's a debug tool) or add strict auth + rate limiting

### C2: Domain `deepo.co.il` does NOT point to the Vercel app
- **Location:** DNS configuration
- **Risk:** Users visiting deepo.co.il see an Apache default page, not the app. All hardcoded URLs in emails, payment callbacks, etc. will break.
- **Response headers:** `server: Apache` with no security headers
- **Fix:** Update DNS A/CNAME records to point to Vercel (`cname.vercel-dns.com`), or update `NEXT_PUBLIC_BASE_URL` to `https://dpo-saas.vercel.app`

---

## High Priority Issues

### H1: Missing security headers
- **Location:** Vercel deployment
- **Headers present:** `strict-transport-security` ✅ (63072000s with includeSubDomains, preload)
- **Headers MISSING:**
  - `Content-Security-Policy` — No CSP. Risk: XSS attacks. **Recommended:** `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;`
  - `X-Frame-Options` — No clickjacking protection. **Recommended:** `DENY` or `SAMEORIGIN`
  - `X-Content-Type-Options` — Missing. **Recommended:** `nosniff`
  - `Referrer-Policy` — Missing. **Recommended:** `strict-origin-when-cross-origin`
  - `Permissions-Policy` — Missing. **Recommended:** `camera=(), microphone=(), geolocation=()`
- **Fix:** Add `vercel.json` with security headers, or use Next.js `next.config.js` headers config

### H2: 3 API routes with insufficient auth
| Route | Auth Method | Risk |
|-------|------------|------|
| `/api/generate-pdf` | NONE | Low — only generates printable HTML from POST body, no DB access |
| `/api/parse-pdf` | NONE | Medium — accepts file uploads (10MB limit), processes with pdf-parse |
| `/api/dpo-admin` | Password only | Medium — uses env var password, no rate limiting, no JWT |

- **Fix:** Add Bearer token auth to generate-pdf and parse-pdf. Add rate limiting to dpo-admin.

### H3: `dangerouslySetInnerHTML` usage
- **Location:** `src/components/DocUploadAdapter.tsx` (lines 285, 295)
- **Risk:** XSS if the content is user-provided document text
- **Fix:** Sanitize content before rendering, or use a markdown renderer instead

---

## Medium Priority Issues

### M1: No `robots.txt` — returns 404 (renders Next.js 404 page)
- **Risk:** Search engines may crawl sensitive pages (dashboard, settings, DPO admin)
- **Fix:** Create `public/robots.txt`:
  ```
  User-agent: *
  Disallow: /dashboard
  Disallow: /api/
  Disallow: /dpo
  Disallow: /dpo-admin
  Disallow: /settings
  Disallow: /onboarding
  Allow: /
  ```

### M2: No rate limiting on any API endpoint
- **Risk:** Brute force attacks on DPO admin password, credential stuffing, API abuse
- **Fix:** Add rate limiting via Vercel Edge Middleware or `@upstash/ratelimit`

### M3: Dashboard/onboarding pages return 200 without auth (client-side redirect)
- **Location:** `/dashboard`, `/onboarding` — return full HTML (200) then redirect client-side
- **Risk:** Low — content is just the loading shell, no data exposed. But it exposes app structure.
- **Fix:** Consider Next.js middleware for server-side redirects on protected routes

### M4: No CORS headers configured
- **Location:** API routes
- **Status:** No `access-control-allow-origin` header on API responses (except Vercel default `*` on static)
- **Risk:** Third-party sites could make requests to API endpoints from browser
- **Fix:** Add explicit CORS policy in API routes or Next.js middleware

### M5: 2 raw `<img>` tags instead of `next/image`
- **Location:** `src/app/dashboard/page.tsx:2496` (QR code), `src/app/onboarding/page.tsx:1551`
- **Risk:** Performance — no automatic optimization, lazy loading, or WebP conversion
- **Fix:** Replace with `<Image>` from `next/image`

### M6: `console.log` with session references
- **Location:** `src/app/auth/callback/page.tsx:53,55` — logs "Session established via tokens"
- **Risk:** Low — doesn't log actual token values, just status messages
- **Fix:** Remove or use debug flag for production

### M7: Next.js 14.2.0 — not latest
- **Current:** 14.2.0
- **Latest 14.x:** 14.2.x (check for security patches)
- **Fix:** Update to latest 14.x patch

---

## Low Priority Issues

### L1: No source maps exposed (GOOD)
- `.js.map` files return 404 ✅

### L2: SSL/TLS configuration is excellent
- TLSv1.3 with CHACHA20-POLY1305-SHA256 ✅
- Cert valid until May 2026 ✅
- HSTS with preload ✅

### L3: No hardcoded secrets found in source
- All secrets use `process.env` ✅
- No eval() or Function constructor ✅
- No SQL injection vectors (uses Supabase client, not raw queries) ✅

### L4: Cookie banner exists in layout
- `CookieBanner` component imported in layout.tsx ✅
- Privacy policy page exists ✅

---

## Performance Summary

| Page | HTML Size | Load Time | Notes |
|------|-----------|-----------|-------|
| Homepage | 46 KB | 0.27s | Good — SSR |
| Login | 16 KB | 0.21s | Good |
| Checkout | 12 KB | 0.52s | Slightly slow — dynamic rendering |

**Note:** Lighthouse could not be run (no Node.js/npm available in environment). Recommend running manually:
```bash
npx lighthouse https://dpo-saas.vercel.app --output=html --form-factor=mobile
```

### Bundle Observations
- No unused dependencies detected in import patterns
- `recharts` (charting library) loaded — may add significant bundle weight
- `pdfmake` and `docx` libraries are large — consider dynamic imports if not already

### Database Queries
- No N+1 query patterns detected ✅
- Supabase queries use proper `.select()` with filters

---

## Responsive Summary

Already fixed in previous commits:
- `overflow-x-hidden` on html, body, root wrapper, main ✅
- Sidebar RTL transform with explicit `translate-x-[16rem]` ✅
- `min-w-0` on flex children ✅
- Viewport meta tag with `maximum-scale=1` ✅
- Mobile-first grid patterns (`grid-cols-1 sm:grid-cols-2`) ✅

### Remaining Issues
- **M-R1:** DataFlowDiagram SVG still 580px viewBox — may need horizontal scroll on 375px phones
- **L-R1:** 2 raw `<img>` tags without responsive sizing

---

## API Security Matrix

| Endpoint | Auth | Input Validation | Rate Limit | Risk |
|----------|------|-----------------|------------|------|
| `/api/audit` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/billing/recurring` | ✅ CRON_SECRET | ✅ | N/A | Low |
| `/api/cardcom/create-payment` | ✅ Bearer | ✅ | ❌ | Medium |
| `/api/cardcom/webhook` | ✅ Webhook sig | ✅ | N/A | Low |
| `/api/chat` | ✅ Bearer | ✅ | ❌ | Medium |
| `/api/chat/stream` | ✅ Bearer | ✅ | ❌ | Medium |
| `/api/chat/contextual` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/complete-onboarding` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/compliance-review` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/cron/*` | ✅ CRON_SECRET | ✅ | N/A | Low |
| `/api/debug-org` | ⚠️ Weak | ❌ | ❌ | **CRITICAL** |
| `/api/document-review` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/documents/export` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/dpo` | ✅ DPO auth | ✅ | ❌ | Low |
| `/api/dpo-admin` | ⚠️ Password | ✅ | ❌ | **High** |
| `/api/dpo-auth` | N/A (login) | ✅ | ❌ | Medium |
| `/api/email` | ✅ Internal key | ✅ | ❌ | Low |
| `/api/generate-documents` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/generate-pdf` | ❌ NONE | ⚠️ Partial | ❌ | **High** |
| `/api/incidents` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/messages` | ✅ Bearer | ✅ | ✅ Credit limit | Low |
| `/api/parse-pdf` | ❌ NONE | ⚠️ Size only | ❌ | **High** |
| `/api/qa` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/rights` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/ropa` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/ropa/optimizer` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/scan-website` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/test-email` | ✅ Internal key | ✅ | ❌ | Low |
| `/api/upload-doc` | ✅ Bearer | ✅ | ❌ | Low |
| `/api/work-plan` | ✅ Bearer | ✅ | ❌ | Low |

---

## GDPR/Privacy Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| Cookie banner | ✅ | CookieBanner component in layout |
| Privacy policy | ✅ | `/privacy` page exists |
| Terms of service | ✅ | `/terms` page exists |
| Data deletion endpoint | ✅ | Rights/DSAR handling via `/api/rights` |
| Password reset doesn't expose user existence | ⚠️ | Supabase handles this — verify behavior |
| Secure authentication | ✅ | Supabase Auth with JWT |
| Data encryption in transit | ✅ | TLS 1.3 |

---

## Recommendations Priority

### Immediate (this week)
1. Delete or secure `/api/debug-org`
2. Add auth to `/api/generate-pdf` and `/api/parse-pdf`
3. Point `deepo.co.il` DNS to Vercel
4. Create `public/robots.txt`

### Short-term (this month)
5. Add security headers via `vercel.json` or `next.config.js`
6. Add rate limiting to auth and DPO admin endpoints
7. Sanitize `dangerouslySetInnerHTML` content
8. Add CORS policy

### Medium-term
9. Run full Lighthouse audit (requires Node.js)
10. Run Playwright responsive tests
11. Update Next.js to latest 14.x patch
12. Replace raw `<img>` with `next/image`
13. Add server-side redirect middleware for protected routes

---

## Test Coverage

- Security header checks: 6 headers checked across 3 endpoints
- API auth audit: 32 routes checked
- Codebase scans: hardcoded secrets, XSS, eval, SQL injection, console.log
- SSL/TLS verification: TLSv1.3 confirmed
- Path exposure: 5 common paths checked
- Page load sizes: 3 pages measured
- GDPR checklist: 7 items verified

**Not run (requires Node.js):**
- Lighthouse performance/accessibility/SEO scores
- Playwright responsive screenshots
- `npm audit` dependency vulnerabilities
- `npx tsc --noEmit` TypeScript compilation
- Bundle size analysis
