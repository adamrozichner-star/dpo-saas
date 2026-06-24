/* C1 auth-gate verification. /console is a real authenticated surface: an
 * unauthenticated visitor must be redirected to /login and must see NO ledger
 * data (no cross-org leak to anon). Requires `next dev` on BASE.
 * Run: node scripts/verify-console.mjs */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/console`
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const results = []
const check = (name, pass, detail) => { results.push(!!pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  // The page gates client-side: wait for the redirect to /login.
  let redirected = false
  try {
    await page.waitForFunction(() => location.pathname.startsWith('/login'), { timeout: 8000 })
    redirected = true
  } catch {
    redirected = false
  }
  const finalPath = await page.evaluate(() => location.pathname)
  check('unauthenticated /console redirects to /login', redirected && finalPath.startsWith('/login'), `path=${finalPath}`)

  // No ledger/org data leaked to anon (no obligation titles, no org name).
  const body = await page.evaluate(() => document.body.innerText)
  const leaked = /רישום מאגר|הסכמי עיבוד|מצלמות אבטחה|דיפו/.test(body)
  check('no ledger/org data leaked to anon', !leaked)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
if (failed) process.exit(1)
