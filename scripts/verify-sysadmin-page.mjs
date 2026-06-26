/* Headless: the SEEDED sysadmin question-set renders on the public /link/[token]
   page with zero org chrome (CC-2 holds for the first real purpose). Requires
   `next dev` on BASE. Run: node scripts/verify-sysadmin-page.mjs */
import puppeteer from 'puppeteer-core'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'          // דיפו (real name must NOT appear; we use a generic display name)
const SYSADMIN_QSET_ID = 'c5a00000-0000-4000-8000-000000000001' // from src/lib/ledger/seed-sysadmin-questions.ts
const FIRST_Q = 'האם מתבצעים גיבויים שוטפים של המערכות והמאגרים?'

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
const ob = (await sql(`insert into public.obligations (org_id,title,status) values (${lit(ORG)},'SECRET-OB-TITLE-E2','checking') returning id;`))[0].id
const task = (await sql(`insert into public.tasks (org_id,obligation_id,assignee_actor,title,status) values (${lit(ORG)},${lit(ob)},'sysadmin','t','open') returning id;`))[0].id
await sql(`insert into public.access_links (org_id,token_hash,purpose,task_id,obligation_id,org_display_name,q_asset_template_id,status,expires_at)
  values (${lit(ORG)},${lit(createHash('sha256').update(token).digest('hex'))},'sysadmin_questionnaire',${lit(task)},${lit(ob)},'ספק שירות',${lit(SYSADMIN_QSET_ID)},'active',now()+interval '14 days');`)

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
    fields: document.querySelectorAll('form textarea, form select').length,
    hasShell: !!document.querySelector('.dp-shell'),
    navCount: document.querySelectorAll('.dp-navitem').length,
  }))
  check('generic purpose title (שאלון אבטחת מידע)', v.title === 'שאלון אבטחת מידע', v.title)
  check('renders the 7 seeded sysadmin questions', v.fields === 7, `${v.fields} fields`)
  check('first seeded question text present', v.bodyText.includes(FIRST_Q))
  check('org display name shown (ספק שירות)', v.bodyText.includes('ספק שירות'))
  check('ZERO org chrome (no app shell)', !v.hasShell)
  check('ZERO org chrome (no nav)', v.navCount === 0)
  check('CC-2: real org name "דיפו" absent', !v.bodyText.includes('דיפו'))
  check('CC-2: obligation title absent', !v.bodyText.includes('SECRET-OB-TITLE-E2'))
  check('CC-2: org_id absent', !v.bodyText.includes(ORG))
} finally {
  await browser.close()
  await sql(`delete from public.access_links where task_id=${lit(task)};`)
  await sql(`delete from public.tasks where id=${lit(task)};`)
  await sql(`delete from public.obligations where id=${lit(ob)};`)
}
const passed = results.filter(Boolean).length
console.log(`\n==== ${passed}/${results.length} passed ====`)
process.exit(passed === results.length ? 0 : 1)
