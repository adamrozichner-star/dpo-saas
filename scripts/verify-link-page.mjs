/* Headless verification of the public tokenized-link page (/link/[token]).
   The CC-2 UI proof: it renders ONLY the Deepo mark, a generic purpose title,
   the org's chosen display name, and the question set - zero org chrome.
   Requires `next dev` on BASE. Run: node scripts/verify-link-page.mjs */
import puppeteer from 'puppeteer-core'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'    // דיפו (the REAL org name must never appear)
const Q_ASSET = '22222222-2222-2222-2222-222222222222'
const Q_TPL1 = '11111111-1111-1111-1111-111111111111'
const Q_TPL2 = '11111111-1111-1111-1111-111111111112'

let MGMT = process.env.SUPABASE_ACCESS_TOKEN
if (!MGMT) MGMT = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim()

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || body?.message) throw new Error(`SQL: ${body?.message || res.status}`)
  return body
}

const results = []
const check = (name, pass, detail) => { results.push(!!pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

// ---- fixtures ----
const token = randomBytes(32).toString('hex')
const hash = createHash('sha256').update(token).digest('hex')
const ob = (await sql(`insert into public.obligations (org_id,title,status) values (${lit(ORG)},'LINKPAGE secret obligation title','checking') returning id;`))[0].id
const task = (await sql(`insert into public.tasks (org_id,obligation_id,assignee_actor,title,status) values (${lit(ORG)},${lit(ob)},'sysadmin','LINKPAGE task','open') returning id;`))[0].id
await sql(`insert into public.hub_questions (template_id,version,active,asset_template_id,order_index,question_text,question_type,required,source_tier,confidence,related_sources) values
  (${lit(Q_TPL1)},1,true,${lit(Q_ASSET)},1,'מהי מדיניות הסיסמאות?','text',true,'legal',1.0,'{}'),
  (${lit(Q_TPL2)},1,true,${lit(Q_ASSET)},2,'האם מופעל גיבוי?','text',false,'legal',1.0,'{}');`)
await sql(`insert into public.access_links (org_id,token_hash,purpose,task_id,obligation_id,org_display_name,q_asset_template_id,status,expires_at)
  values (${lit(ORG)},${lit(hash)},'sysadmin_questionnaire',${lit(task)},${lit(ob)},'ספק שירות',${lit(Q_ASSET)},'active',now()+interval '14 days');`)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

  // ---- valid token ----
  const resp = await page.goto(`${BASE}/link/${token}`, { waitUntil: 'networkidle2', timeout: 60000 })
  check('link page responds 200', resp && resp.status() === 200, `status ${resp && resp.status()}`)
  // wait until the resolve fetch lands (title is no longer the loading placeholder)
  await page.waitForFunction(() => {
    const t = document.querySelector('.dp-tokenform__title')?.textContent || ''
    return t.length > 0 && !/טוען/.test(t)
  }, { timeout: 30000 }).catch(() => {})

  const v = await page.evaluate(() => {
    const body = document.body.innerText
    return {
      hasTokenform: !!document.querySelector('.dp-tokenform'),
      hasMark: !!document.querySelector('.dp-tokenform__mark'),
      title: document.querySelector('.dp-tokenform__title')?.textContent?.trim() || '',
      bodyText: body,
      fieldCount: document.querySelectorAll('form textarea, form select, form input').length,
      hasSubmit: !!Array.from(document.querySelectorAll('button')).find(b => /שליחה|שולח/.test(b.textContent || '')),
      // org chrome that MUST be absent
      hasShell: !!document.querySelector('.dp-shell'),
      hasSidebar: !!document.querySelector('.dp-shell__sidebar'),
      navCount: document.querySelectorAll('.dp-navitem').length,
    }
  })

  check('renders via TokenizedFormShell (.dp-tokenform)', v.hasTokenform)
  check('shows the Deepo platform mark only', v.hasMark)
  check('title is the GENERIC purpose label (not an org name)', v.title === 'שאלון אבטחת מידע', v.title)
  check('shows the org display name "ספק שירות"', v.bodyText.includes('ספק שירות'))
  check('renders the 2-question form', v.fieldCount === 2, `${v.fieldCount} fields`)
  check('shows a submit button', v.hasSubmit)
  // ---- CC-2 zero-chrome ----
  check('ZERO org chrome: no app shell', !v.hasShell)
  check('ZERO org chrome: no sidebar', !v.hasSidebar)
  check('ZERO org chrome: no nav items', v.navCount === 0, `${v.navCount}`)
  check('CC-2: the REAL org name "דיפו" never appears', !v.bodyText.includes('דיפו'))
  check('CC-2: the org_id never appears', !v.bodyText.includes(ORG))
  check('CC-2: the obligation title never leaks', !v.bodyText.includes('secret obligation title'))

  // ---- invalid token -> uniform unavailable, no leak ----
  await page.goto(`${BASE}/link/deadbeefdoesnotexist`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForFunction(() => /אינו זמין|אינו תקין|פג/.test(document.body.innerText), { timeout: 15000 }).catch(() => {})
  const inv = await page.evaluate(() => ({ text: document.body.innerText, hasShell: !!document.querySelector('.dp-shell') }))
  check('invalid token -> generic "unavailable" message', /אינו זמין/.test(inv.text))
  check('invalid token leaks no org name / chrome', !inv.text.includes('דיפו') && !inv.hasShell)
} finally {
  await browser.close()
  await sql(`delete from public.access_links where task_id=${lit(task)};`)
  await sql(`delete from public.evidence where obligation_id=${lit(ob)};`)
  await sql(`delete from public.events where entity_id=${lit(task)};`)
  await sql(`delete from public.tasks where id=${lit(task)};`)
  await sql(`delete from public.obligations where id=${lit(ob)};`)
  await sql(`delete from public.hub_questions where asset_template_id=${lit(Q_ASSET)};`)
}

const passed = results.filter(Boolean).length
console.log(`\n==== ${passed}/${results.length} passed ====`)
process.exit(passed === results.length ? 0 : 1)
