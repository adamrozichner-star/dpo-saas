/* Headless (f): the DSAR public page renders the fixed PII intake form with zero
   org chrome (CC-2). Requires `next dev`. Run: node scripts/verify-dsar-page.mjs */
import puppeteer from 'puppeteer-core'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'   // דיפו (real name must NOT appear)

let MGMT = process.env.SUPABASE_ACCESS_TOKEN
if (!MGMT) MGMT = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim()
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || body?.message) throw new Error(`SQL: ${body?.message || res.status}`)
  return body
}
const results = []
const check = (n, p, d) => { results.push(!!p); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`) }

const token = randomBytes(32).toString('hex')
// direct insert of a dsar access_links row (generic org_display_name so we can assert the REAL name is absent)
await sql(`insert into public.access_links (org_id, token_hash, purpose, org_display_name, status, expires_at, dpo_notify_email)
  values (${lit(ORG)}, ${lit(createHash('sha256').update(token).digest('hex'))}, 'dsar', 'גורם פלוני', 'active', now()+interval '30 days', 'dpo@example.com');`)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  const resp = await page.goto(`${BASE}/link/${token}`, { waitUntil: 'networkidle2', timeout: 60000 })
  check('responds 200', resp && resp.status() === 200)
  await page.waitForFunction(() => {
    const t = document.querySelector('.dp-tokenform__title')?.textContent || ''
    return t.length > 0 && !/טוען/.test(t)
  }, { timeout: 30000 }).catch(() => {})
  const v = await page.evaluate(() => ({
    title: document.querySelector('.dp-tokenform__title')?.textContent?.trim() || '',
    bodyText: document.body.innerText,
    selects: document.querySelectorAll('form select').length,
    inputs: document.querySelectorAll('form input').length,
    textareas: document.querySelectorAll('form textarea').length,
    hasShell: !!document.querySelector('.dp-shell'),
    navCount: document.querySelectorAll('.dp-navitem').length,
  }))
  check('generic DSAR purpose title', v.title === 'בקשת נושא מידע', v.title)
  check('renders the fixed PII form (1 select + >=4 inputs + 1 textarea)', v.selects === 1 && v.inputs >= 4 && v.textareas === 1, `select=${v.selects} input=${v.inputs} textarea=${v.textareas}`)
  check('shows ת"ז field label', v.bodyText.includes('תעודת זהות'))
  check('org display name shown (גורם פלוני)', v.bodyText.includes('גורם פלוני'))
  check('ZERO org chrome (no app shell)', !v.hasShell)
  check('ZERO org chrome (no nav)', v.navCount === 0)
  check('CC-2: real org name "דיפו" absent', !v.bodyText.includes('דיפו'))
  check('CC-2: org_id absent', !v.bodyText.includes(ORG))
} finally {
  await browser.close()
  await sql(`delete from public.access_links where token_hash = ${lit(createHash('sha256').update(token).digest('hex'))};`)
}
const passed = results.filter(Boolean).length
console.log(`\n==== ${passed}/${results.length} passed ====`)
process.exit(passed === results.length ? 0 : 1)
