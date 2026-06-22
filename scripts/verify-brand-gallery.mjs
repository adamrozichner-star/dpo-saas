/* Headless behavioral verification of the Deepo brand gallery.
   Launches system Chrome via puppeteer-core against a running dev server
   and asserts the token-driven styling actually resolves in the browser
   (not a static byte check). Run:  node scripts/verify-brand-gallery.mjs
   Requires `next dev` already serving on BASE (default http://localhost:3000). */

import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/brand-gallery`
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const results = []
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

try {
  const page = await browser.newPage()
  const client = await page.target().createCDPSession()
  const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })

  check('gallery route responds 200', resp && resp.status() === 200, `status ${resp && resp.status()}`)

  // Headless has no real OS focus, so a programmatic .focus() matches :focus but the
  // engine won't paint focus styles. CDP forcePseudoState makes it resolve the :focus
  // rule for real. Then wait out the 200ms box-shadow transition before measuring.
  await client.send('DOM.enable')
  await client.send('CSS.enable')
  const doc = await client.send('DOM.getDocument', { depth: -1 })
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '.dp-input',
  })
  await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus'] })
  await new Promise((r) => setTimeout(r, 350))
  const inputHaloShadow = await page.evaluate(
    () => getComputedStyle(document.querySelector('.dp-input')).boxShadow,
  )

  // Pull every measurement we need in one in-page pass.
  const data = await page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el)[prop] : null
    }

    // Count CSS rules that actually resolved (skip cross-origin sheets).
    let ruleCount = 0
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        ruleCount += sheet.cssRules.length
      } catch {
        /* cross-origin (e.g. Google Fonts) - not readable, ignore */
      }
    }

    return {
      hasScope: !!document.querySelector('.deepo-scope'),
      h1Text: document.querySelector('h1.t-h1')?.textContent || '',
      ruleCount,
      primaryBtnBg: cs('.dp-btn--primary', 'backgroundColor'),
      gradientBtnImg: cs('.dp-btn--gradient', 'backgroundImage'),
      darkCardBg: cs('.dp-card--dark', 'backgroundColor'),
      dir: document.documentElement.getAttribute('dir'),
      scopeDir: getComputedStyle(document.querySelector('.deepo-scope')).direction,
      h1Font: cs('h1.t-h1', 'fontFamily'),
      bodyFont: cs('.deepo-scope p:not([class])', 'fontFamily'),
      eyebrowFont: cs('.t-eyebrow', 'fontFamily'),
      iconCount: document.querySelectorAll('svg.dpi').length,
      logoLight: !!document.querySelector('img[src="/brand/logos/logofull.png"]'),
      logoDark: !!document.querySelector('img[src="/brand/logos/logoreverse.png"]'),
    }
  })

  check('page renders (deepo-scope + heading)', data.hasScope && data.h1Text.length > 0, data.h1Text)
  check('>100 CSS rules resolve', data.ruleCount > 100, `${data.ruleCount} rules`)
  check('primary button is crimson #D10331', data.primaryBtnBg === 'rgb(209, 3, 49)', data.primaryBtnBg)
  check(
    'gradient button paints brand gradient',
    typeof data.gradientBtnImg === 'string' && data.gradientBtnImg.includes('gradient'),
    data.gradientBtnImg?.slice(0, 40),
  )
  check('dark card is Onyx #1B1308', data.darkCardBg === 'rgb(27, 19, 8)', data.darkCardBg)
  check('dir=rtl applied', data.dir === 'rtl' && data.scopeDir === 'rtl', `html=${data.dir} scope=${data.scopeDir}`)
  check(
    'focus halo shows on input',
    typeof inputHaloShadow === 'string' &&
      inputHaloShadow.includes('209, 3, 49') &&
      inputHaloShadow.includes('4px'),
    inputHaloShadow,
  )
  check('display font is Rubik', /Rubik/.test(data.h1Font || ''), data.h1Font)
  check('body font is Assistant', /Assistant/.test(data.bodyFont || ''), data.bodyFont)
  check('label font is Heebo', /Heebo/.test(data.eyebrowFont || ''), data.eyebrowFont)
  check('duotone icons render', data.iconCount >= 10, `${data.iconCount} svg.dpi`)
  check('logo renders on light and dark', data.logoLight && data.logoDark)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.error(`FAILED: ${failed.map((r) => r.name).join(', ')}`)
  process.exit(1)
}
