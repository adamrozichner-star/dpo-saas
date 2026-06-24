/* Headless verification of the v3 ledger components (/ledger-gallery).
   Requires `next dev` on BASE. Run: node scripts/verify-ledger.mjs */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/ledger-gallery`
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// status variant -> expected computed text color (the brand --status-* tokens)
const COLOR = {
  ok: 'rgb(18, 138, 85)',
  warn: 'rgb(199, 126, 12)',
  risk: 'rgb(184, 27, 47)',
  info: 'rgb(39, 102, 166)',
  neutral: 'rgb(69, 61, 56)',
}
const OBLIGATION = { unknown: 'neutral', checking: 'info', in_treatment: 'warn', compliant: 'ok', expired: 'risk' }
const SEVERITY = { info: 'info', warning: 'warn', critical: 'risk' }

const results = []
const check = (name, pass, detail) => { results.push({ pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  check('ledger-gallery responds 200', resp && resp.status() === 200, `status ${resp && resp.status()}`)

  const base = await page.evaluate(() => {
    let rules = 0
    for (const s of Array.from(document.styleSheets)) { try { rules += s.cssRules.length } catch {} }
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null }
    return {
      dir: document.querySelector('.deepo-scope')?.getAttribute('dir') || document.documentElement.getAttribute('dir'),
      rules,
      darkRowBg: cs('.dp-led-on-dark .dp-oblig-row', 'backgroundColor'),
    }
  })
  check('dir=rtl applied', base.dir === 'rtl', base.dir)
  check('>100 CSS rules resolve', base.rules > 100, `${base.rules} rules`)
  // dark section row uses garnet-800 (#29200F = rgb(41, 32, 15))
  check('dark section renders (Onyx row surface)', base.darkRowBg === 'rgb(41, 32, 15)', base.darkRowBg)

  // Each obligation status -> correct token color (first/light instance)
  for (const [status, variant] of Object.entries(OBLIGATION)) {
    const color = await page.evaluate((s) => {
      const el = document.querySelector(`[data-status="${s}"]`)
      return el ? getComputedStyle(el).color : null
    }, status)
    check(`obligation '${status}' -> ${variant}`, color === COLOR[variant], color)
  }
  // Each severity -> correct token color
  for (const [sev, variant] of Object.entries(SEVERITY)) {
    const color = await page.evaluate((s) => {
      const el = document.querySelector(`[data-severity="${s}"]`)
      return el ? getComputedStyle(el).color : null
    }, sev)
    check(`severity '${sev}' -> ${variant}`, color === COLOR[variant], color)
  }

  // Compliance dial bands: first dial (88 -> ok), last (35 -> risk)
  const dials = await page.evaluate(() => Array.from(document.querySelectorAll('.dp-dial__value')).map((c) => getComputedStyle(c).stroke))
  check('dial 88 -> ok band stroke', dials[0] === COLOR.ok, dials[0])
  check('dial 35 -> risk band stroke', dials[dials.length - 1] === COLOR.risk, dials[dials.length - 1])

  // TokenizedFormShell exposes ZERO org identity
  const tf = await page.evaluate(() => {
    const root = document.querySelector('[data-tokenform-preview]')
    if (!root) return null
    return {
      hasSidebar: !!root.querySelector('.dp-shell__sidebar'),
      hasDial: !!root.querySelector('.dp-dial'),
      hasOrgName: /מרפאת|חשבון מורחב|ציון ציות/.test(root.innerText),
      hasMark: !!root.querySelector('img[alt="Deepo"]'),
    }
  })
  check('TokenizedFormShell: no nav chrome', tf && !tf.hasSidebar)
  check('TokenizedFormShell: no score dial', tf && !tf.hasDial)
  check('TokenizedFormShell: no org identity text', tf && !tf.hasOrgName)
  check('TokenizedFormShell: Deepo platform mark present', tf && tf.hasMark)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.pass).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
if (failed) process.exit(1)
