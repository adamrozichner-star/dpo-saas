/*
 * Brand-book HE/EN toggle (unlisted demo at /brand-v2-x7k3q9/).
 *
 * Each page includes this with:
 *   <script src="(rel)brand-toggle.js" data-counterpart="(rel other-lang URL)"></script>
 *
 * Behavior:
 *  - localStorage 'bb_lang' holds the chosen language; default 'he' on
 *    first visit (Israeli partner audience).
 *  - If the current page's <html lang> doesn't match the chosen
 *    language, swap to the counterpart via location.replace (no history
 *    entry, so back-button skips the bounce).
 *  - Renders a small fixed pill: top-left on EN (LTR) pages, top-right
 *    on HE (RTL) pages. Clicking persists the new choice and navigates
 *    to the counterpart.
 *
 * NOTE the counterpart filenames are NOT symmetric across the bundle:
 * hub + deck use index.html=HE / index-en.html=EN, while
 * ui_kits/marketing uses index.html=EN / index-he.html=HE. The
 * data-counterpart attribute on each page absorbs that inversion.
 */
(function () {
  var KEY = 'bb_lang'
  var script = document.currentScript
  if (!script) return
  var counterpart = script.getAttribute('data-counterpart')
  var pageLang = (document.documentElement.lang || 'en').toLowerCase() === 'he' ? 'he' : 'en'

  var stored = null
  try { stored = localStorage.getItem(KEY) } catch (e) { /* private mode etc. */ }
  var chosen = stored === 'he' || stored === 'en' ? stored : 'he'

  if (!stored) {
    try { localStorage.setItem(KEY, chosen) } catch (e) { /* ignore */ }
  }

  // Wrong-language page for the stored choice: silent swap.
  if (chosen !== pageLang && counterpart) {
    location.replace(counterpart)
    return
  }

  function render() {
    if (!counterpart) return
    var btn = document.createElement('a')
    btn.textContent = pageLang === 'he' ? 'EN' : 'עברית'
    btn.href = counterpart
    btn.setAttribute('aria-label', pageLang === 'he' ? 'Switch to English' : 'מעבר לעברית')
    btn.style.cssText = [
      'position:fixed',
      'top:14px',
      pageLang === 'he' ? 'right:14px' : 'left:14px',
      'z-index:2147483647',
      'padding:7px 14px',
      'border-radius:999px',
      'background:rgba(15,23,42,.88)',
      'color:#fff',
      'font:600 13px/1 system-ui,-apple-system,sans-serif',
      'letter-spacing:.05em',
      'text-decoration:none',
      'box-shadow:0 2px 10px rgba(0,0,0,.25)',
    ].join(';')
    btn.addEventListener('click', function () {
      try { localStorage.setItem(KEY, pageLang === 'he' ? 'en' : 'he') } catch (e) { /* ignore */ }
      // default <a> navigation proceeds to the counterpart
    })
    document.body.appendChild(btn)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render)
  } else {
    render()
  }
})()
