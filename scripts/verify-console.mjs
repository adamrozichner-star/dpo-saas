/* C1 auth-gate verification. /console is a real authenticated surface: an
 * unauthenticated visitor must be redirected to /login and must see NO ledger
 * data (no cross-org leak to anon). Requires `next dev` on BASE.
 * Run: node scripts/verify-console.mjs */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
// Both auth-gated surfaces: the console and an obligation detail route.
const ROUTES = ['/console', '/console/obligations/ed996c7b-bba9-4c7c-84a1-c374d2767a5b', '/console/queue', '/dashboard']

const results = []
const check = (name, pass, detail) => { results.push(!!pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 60000 })
    let redirected = false
    try {
      await page.waitForFunction(() => location.pathname.startsWith('/login'), { timeout: 8000 })
      redirected = true
    } catch {
      redirected = false
    }
    const finalPath = await page.evaluate(() => location.pathname)
    check(`unauthenticated ${route} redirects to /login`, redirected && finalPath.startsWith('/login'), `path=${finalPath}`)
    const body = await page.evaluate(() => document.body.innerText)
    const leaked = /רישום מאגר|הסכמי עיבוד|מצלמות אבטחה|דיפו/.test(body)
    check(`no ledger/org data leaked to anon on ${route}`, !leaked)
  }
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
if (failed) process.exit(1)
