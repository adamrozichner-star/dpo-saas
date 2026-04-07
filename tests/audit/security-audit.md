# Security Audit — Deepo (dpo-saas.vercel.app)
**Date:** 2026-04-07

## HTTP Security Headers

### Homepage (https://dpo-saas.vercel.app)
```
HTTP/2 200
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

### Missing Headers
| Header | Status | Risk | Recommended Value |
|--------|--------|------|-------------------|
| Strict-Transport-Security | ✅ Present | N/A | Already configured correctly |
| Content-Security-Policy | ❌ Missing | HIGH — XSS attacks | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;` |
| X-Frame-Options | ❌ Missing | MEDIUM — Clickjacking | `DENY` |
| X-Content-Type-Options | ❌ Missing | LOW — MIME sniffing | `nosniff` |
| Referrer-Policy | ❌ Missing | LOW — URL leak in referer | `strict-origin-when-cross-origin` |
| Permissions-Policy | ❌ Missing | LOW — Feature control | `camera=(), microphone=(), geolocation=()` |

## SSL/TLS Configuration
- **Protocol:** TLSv1.3 ✅
- **Cipher:** AEAD-CHACHA20-POLY1305-SHA256 ✅
- **Certificate:** `*.vercel.app` — valid until May 27, 2026 ✅
- **HSTS:** Enabled with preload ✅

## Codebase Security Findings

### Hardcoded Secrets
None found. All secrets use `process.env`. ✅

### dangerouslySetInnerHTML (XSS Risk)
- `src/components/DocUploadAdapter.tsx:285` — renders parsed document content
- `src/components/DocUploadAdapter.tsx:295` — renders document preview
- **Risk:** If document content contains malicious HTML/JS, it will execute
- **Fix:** Use DOMPurify or a markdown renderer

### eval / Function Constructor
None found. ✅

### Console.log with Sensitive Data
- `src/app/auth/callback/page.tsx:53,55` — logs session status (no actual tokens)
- **Risk:** Minimal

### Unauthenticated API Routes
| Route | Issue | Severity |
|-------|-------|----------|
| `/api/debug-org` | Returns org data by email param | **CRITICAL** |
| `/api/generate-pdf` | No auth, accepts POST body | HIGH |
| `/api/parse-pdf` | No auth, accepts file uploads | HIGH |
| `/api/dpo-admin` | Password-only auth, no rate limit | MEDIUM |

### Exposed Paths
| Path | Status | Risk |
|------|--------|------|
| `/.env` | 404 ✅ | None |
| `/.git/config` | 404 ✅ | None |
| `/api/debug-org` | **200** ❌ | **CRITICAL** |
| `/api/test-email` | 401 ✅ | None |
| `/robots.txt` | 404 ❌ | Low — renders 404 page |

### Source Maps
Not exposed in production. ✅
