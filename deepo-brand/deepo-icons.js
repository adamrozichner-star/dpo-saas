/* Deepo Duotone icon set — inline-SVG inliner.
   Markup: <svg class="dpi"><use href="#dp-shield"></use></svg>
   On load, each such <svg> has its <use> replaced with real <path>s in the
   LIGHT DOM (so currentColor / --dpi-c resolve at the use site — <use>+<symbol>
   does not inherit these reliably). Duotone = soft ~18% fill + 1.7px line.
   Color: set `color:` or `--dpi-c:` on the <svg> (or an ancestor). Size: font-size. */
(function () {
  var shield = 'M12 2.6l7.2 3v5.1c0 4.4-3 8-7.2 9.1-4.2-1.1-7.2-4.7-7.2-9.1V5.6z';
  var bell   = 'M6.3 16.5c-.6 0-.9-.7-.5-1.1.8-.9 1.4-2 1.4-3.9 0-2.8 1.9-4.9 4.8-4.9s4.8 2.1 4.8 4.9c0 1.9.6 3 1.4 3.9.4.4.1 1.1-.5 1.1z';
  var sealPts = 'M12 2.4 L14.1 4.3 L16.8 3.7 L17.7 6.3 L20.3 7.2 L19.7 9.9 L21.6 12 L19.7 14.1 L20.3 16.8 L17.7 17.7 L16.8 20.3 L14.1 19.7 L12 21.6 L9.9 19.7 L7.2 20.3 L6.3 17.7 L3.7 16.8 L4.3 14.1 L2.4 12 L4.3 9.9 L3.7 7.2 L6.3 6.3 L7.2 3.7 L9.9 4.3Z';
  var bolt = 'M13 2.5L6 13h4.5l-1 8.5L18 10h-4.5z';
  var dbBody = 'M5.5 5.6c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4v12.8c0 1.3-2.6 2.4-6.5 2.4s-6.5-1.1-6.5-2.4z';
  var dbTop = 'M12 3.2c3.9 0 6.5 1.1 6.5 2.4S15.9 8 12 8 5.5 6.9 5.5 5.6 8.1 3.2 12 3.2z';
  var sparkle = 'M12 2.6c.5 5 3.8 8.3 8.8 8.8-5 .5-8.3 3.8-8.8 8.8-.5-5-3.8-8.3-8.8-8.8 5-.5 8.3-3.8 8.8-8.8z';

  // id -> [softPathD, linePathD]
  var ICONS = {
    'dp-shield':   [shield, shield + ' M8.8 12l2.3 2.3 4.1-4.6'],
    'dp-radar':    ['M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-5.5 0a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0 M12 12l6.4-4.5'],
    'dp-sparkle':  [sparkle, sparkle],
    'dp-doc':      ['M6 2.6h7l5 5v13.8H6z', 'M13.2 2.6v5h5 M6 2.6h7l5 5v13.8H6z M9 12.5h6 M9 16h6'],
    'dp-bell':     [bell, bell + ' M5 16.5h14 M10.2 19.2a2 2 0 0 0 3.6 0'],
    'dp-lock':     ['M5.5 11h13v8.4H5.5z', 'M5.5 11h13v8.4H5.5z M8 11V8.5a4 4 0 0 1 8 0V11 M12 14.5v2.2'],
    'dp-seal':     [sealPts, sealPts + ' M8.8 12l2.3 2.3 4.1-4.6'],
    'dp-bolt':     [bolt, bolt],
    'dp-database': [dbBody, dbTop + ' M5.5 5.6v12.8c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4V5.6 M5.5 12c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4'],
    'dp-link':     ['M9 6.5h2.5v11H9zM12.5 6.5H15v11h-2.5z', 'M10 8.2H8.2A2.2 2.2 0 0 0 6 10.4v3.2a2.2 2.2 0 0 0 2.2 2.2H10 M14 8.2h1.8A2.2 2.2 0 0 1 18 10.4v3.2a2.2 2.2 0 0 1-2.2 2.2H14 M8.8 12h6.4'],
    'dp-check':    ['M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0', 'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M7.8 12l2.6 2.6 5-5.2'],
    'dp-x':        ['M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0', 'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M9 9l6 6 M15 9l-6 6'],
    'dp-health':   ['M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0', 'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M12 7.6v8.8 M7.6 12h8.8'],
    'dp-education':['M12 4l9 4-9 4-9-4z', 'M12 4l9 4-9 4-9-4z M6.5 10v5c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5 M21 8v5'],
    'dp-finance':  ['M4 9.5l8-5 8 5v1.5H4z', 'M4 9.5l8-5 8 5 M4 11h16 M6.5 11v7 M12 11v7 M17.5 11v7 M4 19h16'],
  };

  var C = 'var(--dpi-c, currentColor)';
  function paths(id) {
    var d = ICONS[id]; if (!d) return '';
    return '<path d="' + d[0] + '" fill="' + C + '" fill-opacity="0.18"></path>' +
           '<path d="' + d[1] + '" fill="none" stroke="' + C + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>';
  }
  function hydrate(root) {
    (root || document).querySelectorAll('svg.dpi > use').forEach(function (use) {
      var id = (use.getAttribute('href') || use.getAttribute('xlink:href') || '').replace('#', '');
      var svg = use.parentNode;
      if (!ICONS[id]) return;
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = paths(id);
    });
  }
  function observe() {
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('svg.dpi') && n.querySelector('use')) { hydrate(n.parentNode || n); }
          else if (n.querySelector && n.querySelector('svg.dpi > use')) { hydrate(n); }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function start() { hydrate(); observe(); }
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
  window.DeepoIcons = { hydrate: hydrate, ids: Object.keys(ICONS) };
})();
