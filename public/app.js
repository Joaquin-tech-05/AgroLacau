// Navegación entre las pantallas exportadas de Stitch.
// Cada pantalla existe en versión "escritorio" y "movil"; se elige según el ancho de la ventana.
(function () {
  var SCREENS = {
    escritorio: ['splash', 'inicio', 'lote', 'nuevo-monitoreo', 'paneos', 'registrar-maleza', 'revision-ingeniero', 'catalogos', 'historial'],
    movil: ['splash', 'inicio', 'lote', 'nuevo-monitoreo', 'paneos', 'registrar-maleza', 'catalogos', 'historial']
  };

  // data-path del diseño -> pantalla
  var PATHS = {
    'inicio': 'inicio',
    'lotes': 'lote',
    'monitoreos': 'paneos',
    'nuevo-monitoreo': 'nuevo-monitoreo',
    'catalogos': 'catalogos',
    'historial': 'historial',
    'historial-de-monitoreos': 'historial'
  };

  // Texto visible del botón/enlace -> pantalla (se evalúa en orden)
  var TEXT_RULES = [
    [/no s[eé] qu[eé] maleza/i, 'revision-ingeniero'],
    [/revisi[oó]n|ver monitoreo/i, 'revision-ingeniero'],
    [/nuevo monitoreo|comenzar monitoreo/i, 'nuevo-monitoreo'],
    [/siguiente: malezas|malezas (y|&) fotos/i, 'registrar-maleza'],
    [/^siguiente$/i, 'paneos'],
    [/anterior: datos generales/i, 'nuevo-monitoreo'],
    [/guardar registro de maleza|descartar borrador|cancelar revisi[oó]n/i, 'lote'],
    [/volver a lotes|^lote 07/i, 'lote'],
    [/^(inicio|home)$/i, 'inicio'],
    [/^lotes$/i, 'lote'],
    [/^monitoreos$/i, 'paneos'],
    [/^cat[aá]logos$/i, 'catalogos'],
    [/^historial$/i, 'historial'],
    [/ver an[aá]lisis completo|historial de visitas/i, 'historial']
  ];

  var parts = location.pathname.split('/').filter(Boolean);
  var device = parts[parts.length - 2];
  var current = (parts[parts.length - 1] || '').replace(/\.html$/, '');
  if (!SCREENS[device]) return;

  function preferredDevice() {
    return window.matchMedia('(max-width: 767px)').matches ? 'movil' : 'escritorio';
  }

  function urlFor(screen, dev) {
    dev = dev || preferredDevice();
    if (SCREENS[dev].indexOf(screen) === -1) dev = dev === 'movil' ? 'escritorio' : 'movil';
    return '/' + dev + '/' + screen + '.html';
  }

  function go(screen) {
    if (screen && screen !== current) location.href = urlFor(screen, device);
  }

  function labelOf(el) {
    // Quita los nombres de íconos de Material Symbols para quedarse con el texto real.
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.material-symbols-outlined, [class*="material-symbols"]').forEach(function (n) { n.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function targetFor(el) {
    var path = el.getAttribute('data-path');
    if (path && PATHS[path]) return PATHS[path];
    var text = labelOf(el);
    if (!text) {
      var icon = el.textContent.trim();
      if (icon === 'add') return 'nuevo-monitoreo';
      return null;
    }
    for (var i = 0; i < TEXT_RULES.length; i++) {
      if (TEXT_RULES[i][0].test(text)) return TEXT_RULES[i][1];
    }
    return null;
  }

  document.querySelectorAll('a, button').forEach(function (el) {
    var target = targetFor(el);
    if (!target) return;
    if (el.tagName === 'A') el.setAttribute('href', urlFor(target, device));
    el.style.cursor = 'pointer';
    el.addEventListener('click', function (e) {
      e.preventDefault();
      go(target);
    });
  });

  // Si se cambia el tamaño de la ventana, saltar a la versión correspondiente de la misma pantalla.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var dev = preferredDevice();
      if (dev !== device && SCREENS[dev].indexOf(current) !== -1) location.replace(urlFor(current, dev));
    }, 300);
  });

  // La pantalla de carga avanza sola al inicio.
  if (current === 'splash') setTimeout(function () { location.href = urlFor('inicio', device); }, 4200);
})();
