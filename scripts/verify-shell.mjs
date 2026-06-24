/* Headless behavioral verification of the Deepo app shell (/shell-demo).
   Requires `next dev` on BASE. Run: node scripts/verify-shell.mjs */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/shell-demo`
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()

  // ---- Desktop (1280x800) ----
  await page.setViewport({ width: 1280, height: 800 })
  const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  check('shell-demo responds 200', resp && resp.status() === 200, `status ${resp && resp.status()}`)

  const desktop = await page.evaluate(() => {
    const vw = window.innerWidth
    const shell = document.querySelector('.dp-shell')
    const side = document.querySelector('.dp-shell__sidebar')
    const main = document.querySelector('.dp-shell__main')
    const logo = document.querySelector('.dp-shell__sidebar .dp-shell__brand img')
    const navItems = document.querySelectorAll('.dp-navitem')
    const lr = logo ? logo.getBoundingClientRect() : null
    let rules = 0
    for (const s of Array.from(document.styleSheets)) { try { rules += s.cssRules.length } catch {} }
    return {
      hasShell: !!shell, hasSide: !!side, hasMain: !!main,
      dir: (shell && shell.getAttribute('dir')) || document.documentElement.getAttribute('dir'),
      navCount: navItems.length,
      sidebarBg: side ? getComputedStyle(side).backgroundColor : null,
      topbarDisplay: document.querySelector('.dp-topbar') ? getComputedStyle(document.querySelector('.dp-topbar')).display : null,
      mobilebarDisplay: document.querySelector('.dp-mobilebar') ? getComputedStyle(document.querySelector('.dp-mobilebar')).display : null,
      logoTop: lr ? lr.top : null,
      logoCenterX: lr ? lr.left + lr.width / 2 : null,
      vw, rules,
      navFont: navItems[0] ? getComputedStyle(navItems[0]).fontFamily : null,
    }
  })

  check('shell renders (shell + sidebar + main)', desktop.hasShell && desktop.hasSide && desktop.hasMain)
  check('dir=rtl applied', desktop.dir === 'rtl', desktop.dir)
  check('nav present (>=5 items)', desktop.navCount >= 5, `${desktop.navCount} items`)
  check('logo positioned top-right', desktop.logoTop !== null && desktop.logoTop < 100 && desktop.logoCenterX > desktop.vw * 0.7, `top=${Math.round(desktop.logoTop)} centerX=${Math.round(desktop.logoCenterX)} vw=${desktop.vw}`)
  check('desktop topbar visible, mobilebar hidden', desktop.topbarDisplay === 'flex' && desktop.mobilebarDisplay === 'none', `topbar=${desktop.topbarDisplay} mobilebar=${desktop.mobilebarDisplay}`)
  check('>100 CSS rules resolve', desktop.rules > 100, `${desktop.rules} rules`)
  check('brand font on nav (Assistant body)', /Assistant/.test(desktop.navFont || ''), desktop.navFont)

  // default actor is dpo => Onyx sidebar #1B1308 = rgb(27, 19, 8)
  check('default actor dpo: Onyx sidebar', desktop.sidebarBg === 'rgb(27, 19, 8)', desktop.sidebarBg)

  // toggle actor -> owner => light sidebar (#FFFFFF = rgb(255, 255, 255))
  await page.click('[aria-label="החלפת תצוגת אקטור"]')
  await new Promise((r) => setTimeout(r, 150))
  const ownerBg = await page.evaluate(() => getComputedStyle(document.querySelector('.dp-shell__sidebar')).backgroundColor)
  check('toggle to owner: light sidebar', ownerBg === 'rgb(255, 255, 255)', ownerBg)

  // ---- Mobile (390x800) ----
  await page.setViewport({ width: 390, height: 800 })
  await page.reload({ waitUntil: 'networkidle2' })
  const mobileClosed = await page.evaluate(() => {
    const vw = window.innerWidth
    const side = document.querySelector('.dp-shell__sidebar')
    return {
      mobilebarDisplay: getComputedStyle(document.querySelector('.dp-mobilebar')).display,
      topbarDisplay: getComputedStyle(document.querySelector('.dp-topbar')).display,
      sidebarLeft: side.getBoundingClientRect().left,
      vw,
    }
  })
  check('mobile: top bar visible, desktop topbar hidden', mobileClosed.mobilebarDisplay === 'flex' && mobileClosed.topbarDisplay === 'none', `mobilebar=${mobileClosed.mobilebarDisplay} topbar=${mobileClosed.topbarDisplay}`)
  check('mobile: drawer closed (sidebar off-screen right)', mobileClosed.sidebarLeft >= mobileClosed.vw - 2, `left=${Math.round(mobileClosed.sidebarLeft)} vw=${mobileClosed.vw}`)

  // open the drawer via the mobile menu button
  await page.click('[aria-label="תפריט"]')
  await new Promise((r) => setTimeout(r, 300))
  const mobileOpen = await page.evaluate(() => {
    const side = document.querySelector('.dp-shell__sidebar')
    return { sidebarLeft: side.getBoundingClientRect().left, vw: window.innerWidth }
  })
  check('mobile: drawer opens (slides in from right)', mobileOpen.sidebarLeft < mobileOpen.vw - 100, `left=${Math.round(mobileOpen.sidebarLeft)} vw=${mobileOpen.vw}`)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) { console.error(`FAILED: ${failed.map((r) => r.name).join(', ')}`); process.exit(1) }
