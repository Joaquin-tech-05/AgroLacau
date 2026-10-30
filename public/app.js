// AgroLacau – app simple de monitoreo.
// Pantallas: Lotes (agrupados por cultivo) → Lote → Monitoreo (paneos de 1 m o ½ m) y productos aplicados;
// Umbrales de daño por cultivo y etapa. Todo se organiza por campaña (2025/26, 2026/27…).
// Los datos se guardan en el teléfono (localStorage) y, si el teléfono está conectado al equipo,
// se sincronizan con el servidor (/api/datos) para que todos vean lo mismo.
(function () {
  var CULTIVOS = ['Soja 1ra', 'Soja 2da', 'Maíz', 'Girasol', 'Trigo', 'Otro'];

  // Etapas del cultivo: cada plaga tiene un umbral distinto para cada una.
  var ETAPAS = [
    { id: 'vegetativo', nombre: 'Vegetativo', corto: 'Veg.', ejemplo: 'V1, V6…' },
    { id: 'reproductivo', nombre: 'Reproductivo', corto: 'Repr.', ejemplo: 'R1, R5…' }
  ];

  // Plagas que se cuentan en cada cultivo y su umbral de daño en ind/m lineal por etapa
  // (null = sin umbral). Valores orientativos: se ajustan desde la pantalla "Umbrales de daño".
  function sinUmbral(plaga) { return { plaga: plaga, umbral: { vegetativo: null, reproductivo: null } }; }
  var PLAGAS_SOJA = [
    { plaga: 'Chinches', umbral: { vegetativo: null, reproductivo: 1 } },
    { plaga: 'Orugas defoliadoras', umbral: { vegetativo: 20, reproductivo: 15 } },
    { plaga: 'Isoca bolillera', umbral: { vegetativo: null, reproductivo: 2 } }
  ];
  var UMBRALES_INICIALES = {
    'Soja 1ra': PLAGAS_SOJA,
    'Soja 2da': PLAGAS_SOJA,
    'Maíz': [sinUmbral('Cogollero'), sinUmbral('Chinches')],
    'Girasol': [sinUmbral('Orugas defoliadoras'), sinUmbral('Chinches')],
    'Trigo': [sinUmbral('Pulgones'), sinUmbral('Orugas')],
    'Otro': [sinUmbral('Chinches'), sinUmbral('Orugas')]
  };

  var MALEZAS = ['Rama negra', 'Yuyo colorado', 'Sorgo de Alepo', 'Capín', 'Pata de ganso', 'Gramón', 'Otra'];
  var NIVELES = ['Baja', 'Media', 'Alta'];
  var TIPOS_PRODUCTO = ['Herbicida', 'Insecticida', 'Fungicida', 'Fertilizante', 'Coadyuvante', 'Otro'];

  var ESTADOS = {
    rojo: 'Supera umbral',
    amarillo: 'Cerca del umbral',
    verde: 'Bajo umbral'
  };
  var EMOJI_ESTADO = { rojo: '🔴', amarillo: '🟡', verde: '🟢' };

  // Días hacia atrás de productos aplicados que se incluyen al compartir un monitoreo.
  var DIAS_PRODUCTOS_RECIENTES = 30;

  var CLAVE = 'agrolacau-v1';
  var CLAVE_EQUIPO = 'agrolacau-clave-equipo';
  var COLECCIONES = ['lotes', 'monitoreos', 'aplicaciones'];

  // Estado de la sincronización con el equipo.
  var sync = { estado: 'desconectado', mensaje: '', ultima: null, pendiente: false, enCurso: false, repetir: false, temporizador: null };
  var app = document.getElementById('app');
  var selectorCampania = document.getElementById('campania');

  // ---------- Íconos ----------

  var ICONOS = {
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    flecha: '<path d="m9 18 6-6-6-6"/>',
    volver: '<path d="m15 18-6-6 6-6"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    borrar: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    descargar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    ajustes: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    brote: '<path d="M7 20h10"/><path d="M12 20v-8"/><path d="M12 12C12 8 9 5 4 5c0 4 3 7 8 7Z"/><path d="M12 10c0-4 3-6 8-6 0 4-3 6-8 6Z"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    frasco: '<path d="M9 3h6"/><path d="M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    mensaje: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    planilla: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    nube: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
    regla: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>'
  };

  function icono(nombre) {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombre] + '</svg>';
  }

  // ---------- Campañas ----------

  // La campaña agrícola va de julio a junio: octubre de 2026 → "2026/27".
  function campaniaDeFecha(iso) {
    var anio = Number(iso.slice(0, 4));
    var mes = Number(iso.slice(5, 7));
    var inicio = mes >= 7 ? anio : anio - 1;
    return inicio + '/' + String((inicio + 1) % 100).padStart(2, '0');
  }

  function campaniaSiguiente(c) {
    var inicio = Number(c.slice(0, 4)) + 1;
    return inicio + '/' + String((inicio + 1) % 100).padStart(2, '0');
  }

  // Campañas con datos, más la actual y la siguiente (para poder empezar una nueva).
  function campaniasDisponibles() {
    var actual = campaniaDeFecha(hoy());
    var lista = [actual, campaniaSiguiente(actual), datos.campania];
    datos.lotes.forEach(function (l) { lista = lista.concat(Object.keys(l.cultivos)); });
    datos.monitoreos.forEach(function (m) { lista.push(m.campania); });
    datos.aplicaciones.forEach(function (a) { lista.push(a.campania); });
    return lista.filter(function (c, i) { return c && lista.indexOf(c) === i; }).sort().reverse();
  }

  // ---------- Datos ----------

  function datosIniciales() {
    var c = campaniaDeFecha(hoy());
    function lote(id, nombre, cultivo, ha) {
      var cultivos = {};
      cultivos[c] = cultivo;
      return { id: id, nombre: nombre, ha: ha, cultivos: cultivos };
    }
    return {
      campania: c,
      lotes: [
        lote('l1', 'Lote 07 – Demo', 'Soja 1ra', 85),
        lote('l2', 'Lote 03 – El Ombú', 'Soja 1ra', 110),
        lote('l3', 'Lote 02 – El Molino', 'Soja 1ra', 64),
        lote('l4', 'Lote 09 – La Tranquera', 'Soja 2da', 70),
        lote('l5', 'Lote 12 – La Laguna', 'Maíz', 92),
        lote('l6', 'Lote 05 – Los Álamos', 'Girasol', 58)
      ],
      monitoreos: [],
      aplicaciones: []
    };
  }

  function umbralesIniciales() { return JSON.parse(JSON.stringify(UMBRALES_INICIALES)); }

  function cargar() {
    var d = null;
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (guardado && guardado.lotes) d = guardado;
    } catch (e) { /* sin acceso a localStorage: se usan datos de ejemplo */ }
    d = d || datosIniciales();

    // Datos guardados con versiones anteriores de la app no traen estas partes.
    var actual = campaniaDeFecha(hoy());
    d.campania = d.campania || actual;
    d.aplicaciones = d.aplicaciones || [];
    d.umbrales = d.umbrales || umbralesIniciales();
    // Antes había un solo umbral por plaga: se usa para las dos etapas.
    Object.keys(d.umbrales).forEach(function (cultivo) {
      d.umbrales[cultivo].forEach(function (u) {
        if (u.umbral == null || typeof u.umbral === 'number') u.umbral = { vegetativo: u.umbral, reproductivo: u.umbral };
      });
    });
    // Antes el lote tenía un solo cultivo: pasa a ser el de la campaña actual.
    d.lotes.forEach(function (l) {
      if (!l.cultivos) {
        l.cultivos = {};
        if (l.cultivo) l.cultivos[actual] = l.cultivo;
      }
      d.monitoreos.forEach(function (m) { if (m.loteId === l.id && !m.cultivo) m.cultivo = l.cultivo; });
      delete l.cultivo;
    });
    d.monitoreos.forEach(function (m) { m.campania = m.campania || campaniaDeFecha(m.fecha); });
    d.aplicaciones.forEach(function (a) { a.campania = a.campania || campaniaDeFecha(a.fecha); });
    // Para sincronizar: lo borrado se recuerda (id → cuándo) para que no vuelva desde otro teléfono.
    d.borrados = d.borrados || {};
    COLECCIONES.forEach(function (col) { d.borrados[col] = d.borrados[col] || {}; });
    d.umbralesActualizado = d.umbralesActualizado || 0;
    return d;
  }

  var datos = cargar();

  function guardarLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { alert('No se pudo guardar en este navegador.'); }
  }

  // Guarda en el teléfono y avisa al equipo (si hay conexión).
  function guardar() {
    guardarLocal();
    sync.pendiente = true;
    programarSincronizacion();
  }

  // Marca un lote, monitoreo o producto como modificado ahora (gana sobre versiones anteriores).
  function tocar(registro) { registro.actualizado = Date.now(); }
  function tocarUmbrales() { datos.umbralesActualizado = Date.now(); }

  function borrarRegistros(col, condicion) {
    datos[col] = datos[col].filter(function (r) {
      if (!condicion(r)) return true;
      datos.borrados[col][r.id] = Date.now();
      return false;
    });
  }

  function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function buscarLote(id) { return datos.lotes.find(function (l) { return l.id === id; }); }
  function buscarMonitoreo(id) { return datos.monitoreos.find(function (m) { return m.id === id; }); }
  function buscarAplicacion(id) { return datos.aplicaciones.find(function (a) { return a.id === id; }); }

  function cultivoEn(lote, campania) { return lote.cultivos[campania || datos.campania] || null; }

  // Variedad o híbrido sembrado en el lote en una campaña (texto libre, puede estar vacío).
  function variedadEn(lote, campania) { return (lote.variedades || {})[campania || datos.campania] || ''; }

  // "Soja 1ra (DM 46i20)" o solo "Soja 1ra" si no tiene variedad cargada.
  function cultivoConVariedad(cultivo, variedad) { return variedad ? cultivo + ' (' + variedad + ')' : cultivo; }

  // Variedades ya cargadas para un cultivo (en cualquier lote o campaña), para sugerirlas al escribir.
  function variedadesUsadas(cultivo) {
    var lista = [];
    datos.lotes.forEach(function (l) {
      Object.keys(l.cultivos).forEach(function (c) {
        if (l.cultivos[c] === cultivo && variedadEn(l, c)) lista.push(variedadEn(l, c));
      });
    });
    datos.monitoreos.forEach(function (m) { if (m.cultivo === cultivo && m.variedad) lista.push(m.variedad); });
    return lista.filter(function (v, i) { return lista.indexOf(v) === i; }).sort();
  }

  function opcionesVariedad(cultivo) {
    return variedadesUsadas(cultivo).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('');
  }

  function porFechaDesc(a, b) { return b.fecha.localeCompare(a.fecha); }

  function monitoreosDe(loteId) {
    return datos.monitoreos
      .filter(function (m) { return m.loteId === loteId && m.campania === datos.campania; })
      .sort(porFechaDesc);
  }

  function aplicacionesDe(loteId) {
    return datos.aplicaciones
      .filter(function (a) { return a.loteId === loteId && a.campania === datos.campania; })
      .sort(porFechaDesc);
  }

  function plagasDe(cultivo) { return datos.umbrales[cultivo] || (datos.umbrales[cultivo] = []); }

  function umbralDe(cultivo, plaga, etapa) {
    var u = plagasDe(cultivo).find(function (x) { return x.plaga === plaga; });
    var valor = u && etapa && u.umbral[etapa];
    return valor > 0 ? valor : null;
  }

  function nombreEtapa(id) {
    var e = ETAPAS.find(function (x) { return x.id === id; });
    return e ? e.nombre : '';
  }

  // "V6" → vegetativo, "R5" → reproductivo; si no se reconoce, null.
  function etapaDesdeTexto(texto) {
    var t = (texto || '').trim().toUpperCase();
    if (/^V/.test(t)) return 'vegetativo';
    if (/^R/.test(t)) return 'reproductivo';
    return null;
  }

  function etapaDe(m) { return m.etapa || etapaDesdeTexto(m.estadio); }

  // ---------- Cálculos ----------

  // Individuos por metro lineal = total contado / (cantidad de paneos × largo del paño)
  function porMetro(plaga, monitoreo) {
    var total = plaga.conteos.reduce(function (s, n) { return s + (Number(n) || 0); }, 0);
    var metros = plaga.conteos.length * monitoreo.largo;
    return metros ? total / metros : 0;
  }

  // Semáforo: rojo desde el umbral, amarillo desde la mitad del umbral, verde por debajo.
  function estadoDe(valor, umbral) {
    if (!umbral) return null;
    if (valor >= umbral) return 'rojo';
    if (valor >= umbral / 2) return 'amarillo';
    return 'verde';
  }

  // Resultado de cada plaga de un monitoreo con su umbral y estado.
  function resultados(m) {
    var etapa = etapaDe(m);
    return m.plagas.map(function (p) {
      var valor = porMetro(p, m);
      var umbral = umbralDe(m.cultivo, p.nombre, etapa);
      return { nombre: p.nombre, valor: valor, umbral: umbral, etapa: etapa, estado: estadoDe(valor, umbral) };
    });
  }

  var GRAVEDAD = { rojo: 3, amarillo: 2, verde: 1 };

  function peorEstado(m) {
    return resultados(m).reduce(function (peor, r) {
      return (GRAVEDAD[r.estado] || 0) > (GRAVEDAD[peor] || 0) ? r.estado : peor;
    }, null);
  }

  function cantidadPaneos(m) { return m.plagas.length ? m.plagas[0].conteos.length : 0; }

  // ---------- Formato ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return n.toLocaleString('es-AR', { maximumFractionDigits: 1 }); }
  function fecha(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function restarDias(iso, dias) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() - dias);
    return d.toISOString().slice(0, 10);
  }
  function nombreLargo(largo) { return largo === 1 ? '1 metro' : '½ metro'; }
  function paneos(n) { return n + (n === 1 ? ' paneo' : ' paneos'); }

  function resumenPlagas(m) {
    var partes = resultados(m)
      .filter(function (r) { return r.valor > 0; })
      .map(function (r) { return r.nombre + ' ' + num(r.valor) + ' ind/m'; });
    return partes.length ? partes.join(' · ') : 'Sin plagas';
  }

  function etapaTexto(m) {
    var etapa = etapaDe(m);
    if (etapa) return nombreEtapa(etapa) + (m.estadio ? ' (' + m.estadio + ')' : '');
    return m.estadio ? 'Estado ' + m.estadio : '';
  }

  function chipEstado(estado) {
    return estado ? '<span class="chip ' + estado + '">' + ESTADOS[estado] + '</span>' : '';
  }

  // Fila del cuadro de resultados: plaga, valor, umbral y semáforo.
  function filaResultado(r) {
    return '<div class="resultado-fila"><span><i class="punto ' + (r.estado || '') + '"></i>' + esc(r.nombre) +
      '<small>' + (!r.etapa ? 'Elegí la etapa para comparar con el umbral'
        : r.umbral ? 'Umbral ' + nombreEtapa(r.etapa).toLowerCase() + ': ' + num(r.umbral) + ' ind/m'
        : 'Sin umbral para ' + nombreEtapa(r.etapa).toLowerCase()) + '</small></span>' +
      '<b>' + num(r.valor) + ' ind/m</b></div>';
  }

  function itemLote(l) {
    var ultimo = monitoreosDe(l.id)[0];
    var estado = ultimo && peorEstado(ultimo);
    var variedad = variedadEn(l);
    var detalle = l.ha + ' ha · ' + (variedad ? variedad + ' · ' : '') + (ultimo ? fecha(ultimo.fecha) + ' – ' + resumenPlagas(ultimo) : 'Sin monitoreos');
    return '<a class="item ' + (estado ? 'borde-' + estado : '') + '" href="#/lote/' + l.id + '">' +
      '<span class="item-icono">' + icono('brote') + '</span>' +
      '<div class="item-cuerpo"><div class="item-titulo">' + esc(l.nombre) + ' ' + chipEstado(estado) + '</div>' +
      '<div class="item-detalle">' + esc(detalle) + '</div></div>' + icono('flecha') + '</a>';
  }

  function porNombre(a, b) { return a.nombre.localeCompare(b.nombre); }

  // ---------- Pantalla: Lotes ----------

  function vistaLotes() {
    var conCultivo = datos.lotes.filter(function (l) { return cultivoEn(l); });
    var sinCultivo = datos.lotes.filter(function (l) { return !cultivoEn(l); }).sort(porNombre);
    var hectareas = conCultivo.reduce(function (s, l) { return s + (Number(l.ha) || 0); }, 0);
    var monitoreos = datos.monitoreos.filter(function (m) { return m.campania === datos.campania; });
    var aplicaciones = datos.aplicaciones.filter(function (a) { return a.campania === datos.campania; });
    var enAlerta = conCultivo.filter(function (l) {
      var ultimo = monitoreosDe(l.id)[0];
      return ultimo && peorEstado(ultimo) === 'rojo';
    }).sort(porNombre);

    var html = '<h1>Lotes</h1><p class="sub">Campaña ' + esc(datos.campania) + ' · ordenados por cultivo</p>' +
      bloqueEstadoSync() +
      '<div class="resumen">' +
      '<div class="dato"><span>Lotes</span><b>' + conCultivo.length + '</b><small>' + num(hectareas) + ' ha</small></div>' +
      '<div class="dato"><span>Monitoreos</span><b>' + monitoreos.length + '</b><small>en la campaña</small></div>' +
      '<div class="dato' + (enAlerta.length ? ' alerta' : '') + '"><span>Superan umbral</span><b>' + enAlerta.length + '</b><small>lotes</small></div>' +
      '<div class="dato"><span>Productos</span><b>' + aplicaciones.length + '</b><small>aplicados</small></div>' +
      '</div>' +
      '<div class="fila-botones dos"><a class="btn btn-secundario" href="#/lote/nuevo">' + icono('mas') + 'Agregar lote</a>' +
      '<a class="btn btn-suave" href="#/umbrales">' + icono('ajustes') + 'Umbrales</a></div>';

    if (enAlerta.length) {
      html += '<h2 class="titulo-alerta">' + icono('alerta') + 'Superan el umbral <span class="contador rojo">' + enAlerta.length + '</span></h2>' +
        '<div class="lista">' + enAlerta.map(itemLote).join('') + '</div>';
    }

    CULTIVOS.forEach(function (cultivo) {
      var lotes = conCultivo.filter(function (l) { return cultivoEn(l) === cultivo; }).sort(porNombre);
      if (!lotes.length) return;
      var ha = lotes.reduce(function (s, l) { return s + (Number(l.ha) || 0); }, 0);
      html += '<h2>' + esc(cultivo) + ' <span class="contador">' + lotes.length + '</span><span class="extra">' + num(ha) + ' ha</span></h2>' +
        '<div class="lista">' + lotes.map(itemLote).join('') + '</div>';
    });

    if (sinCultivo.length) {
      html += '<h2>Sin cultivo en esta campaña <span class="contador">' + sinCultivo.length + '</span></h2>' +
        '<div class="lista">' + sinCultivo.map(function (l) {
          return '<a class="item" href="#/lote/' + l.id + '/editar"><span class="item-icono">' + icono('brote') + '</span>' +
            '<div class="item-cuerpo"><div class="item-titulo">' + esc(l.nombre) + '</div>' +
            '<div class="item-detalle">' + l.ha + ' ha · Tocá para asignar el cultivo</div></div>' + icono('flecha') + '</a>';
        }).join('') + '</div>';
    }

    if (!datos.lotes.length) html += '<p class="vacio">Todavía no hay lotes. Agregá el primero.</p>';

    html += '<div class="pie">' +
      '<button class="btn-texto" data-accion="exportar">' + icono('descargar') + 'Descargar monitoreos (CSV para Excel)</button>' +
      '<button class="btn-texto" data-accion="exportar-aplicaciones">' + icono('descargar') + 'Descargar productos (CSV para Excel)</button>' +
      '<a class="btn btn-texto" href="#/equipo">' + icono('nube') + 'Compartir con el equipo</a>' +
      '<img class="logo-pie" src="/img/logo-agrolacau.png" alt="Agro Lacau S.A."/></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Umbrales de daño ----------

  function vistaUmbrales() {
    var html = '<a class="volver" href="#/">' + icono('volver') + 'Lotes</a><h1>Umbrales de daño</h1>' +
      '<p class="sub">En individuos por metro lineal, para cada etapa del cultivo: Veg. = vegetativo, Repr. = reproductivo. ' +
      'Dejá vacío si no querés alerta. Las plagas de cada cultivo son las que aparecen al hacer un monitoreo.</p>' +
      '<div class="tarjeta leyenda">' +
      '<span><i class="punto rojo"></i>Supera umbral: igual o más que el umbral</span>' +
      '<span><i class="punto amarillo"></i>Cerca: desde la mitad del umbral</span>' +
      '<span><i class="punto verde"></i>Bajo umbral</span></div>';

    CULTIVOS.forEach(function (cultivo) {
      html += '<h2>' + esc(cultivo) + '</h2><div class="tarjeta">' +
        '<div class="plaga-fila umbral-cabecera"><span>Plaga</span><div class="umbral-campo">' +
        ETAPAS.map(function (e) { return '<span title="' + e.nombre + '">' + e.corto + '</span>'; }).join('') + '<i></i></div></div>' +
        plagasDe(cultivo).map(function (u, i) {
          return '<div class="plaga-fila"><span>' + esc(u.plaga) + '</span><div class="umbral-campo">' +
            ETAPAS.map(function (e) {
              var v = u.umbral[e.id];
              return '<input type="number" inputmode="decimal" min="0" step="any" placeholder="—" data-umbral-cultivo="' + esc(cultivo) +
                '" data-umbral-indice="' + i + '" data-umbral-etapa="' + e.id + '" value="' + (v == null ? '' : v) +
                '" aria-label="Umbral ' + esc(u.plaga) + ' en ' + esc(cultivo) + ', ' + e.nombre.toLowerCase() + '"/>';
            }).join('') +
            '<button type="button" class="btn-peligro" data-accion="quitar-plaga-umbral" data-cultivo="' + esc(cultivo) +
            '" data-indice="' + i + '" aria-label="Quitar ' + esc(u.plaga) + '">' + icono('borrar') + '</button></div></div>';
        }).join('') +
        '<button type="button" class="btn-texto" data-accion="agregar-plaga-umbral" data-cultivo="' + esc(cultivo) + '">' + icono('mas') + 'Agregar plaga</button></div>';
    });

    html += '<div class="fila-botones"><button type="button" class="btn-texto" data-accion="restablecer-umbrales">Volver a los valores iniciales</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Agregar / editar lote ----------

  function formLote(lote) {
    var editando = !!lote;
    var cultivo = editando ? cultivoEn(lote) : CULTIVOS[0];
    var variedad = editando ? variedadEn(lote) : '';
    lote = lote || { nombre: '', ha: '', cultivos: {}, variedades: {} };
    app.innerHTML =
      '<a class="volver" href="' + (editando ? '#/lote/' + lote.id : '#/') + '">' + icono('volver') + 'Volver</a>' +
      '<h1>' + (editando ? 'Editar lote' : 'Nuevo lote') + '</h1>' +
      '<p class="sub">El cultivo y la variedad se guardan para la campaña ' + esc(datos.campania) + '.</p>' +
      '<form id="form-lote" class="tarjeta">' +
      '<div class="campo"><label for="f-nombre">Nombre</label><input id="f-nombre" name="nombre" required placeholder="Ej: Lote 07 – El Ombú" value="' + esc(lote.nombre) + '"/></div>' +
      '<div class="campos-2">' +
      '<div class="campo"><label for="f-cultivo">Cultivo ' + esc(datos.campania) + '</label><select id="f-cultivo" name="cultivo">' +
      (editando ? '<option value=""' + (cultivo ? '' : ' selected') + '>Sin cultivo</option>' : '') +
      CULTIVOS.map(function (c) { return '<option' + (c === cultivo ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="campo"><label for="f-ha">Hectáreas</label><input id="f-ha" name="ha" type="number" inputmode="decimal" min="0" step="any" value="' + esc(lote.ha) + '"/></div>' +
      '</div>' +
      '<div class="campo"><label for="f-variedad">Variedad / híbrido <span class="opcional">(opcional)</span></label>' +
      '<input id="f-variedad" name="variedad" list="variedades-usadas" autocomplete="off" placeholder="Ej: DM 46i20, NS 7621" value="' + esc(variedad) + '"/>' +
      '<datalist id="variedades-usadas">' + opcionesVariedad(cultivo) + '</datalist></div>' +
      '<button class="btn-principal" type="submit">Guardar lote</button>' +
      '</form>';

    // Las sugerencias de variedad dependen del cultivo elegido.
    document.getElementById('f-cultivo').addEventListener('change', function (e) {
      document.getElementById('variedades-usadas').innerHTML = opcionesVariedad(e.target.value);
    });

    document.getElementById('form-lote').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (editando) {
        // Puede haber llegado una versión nueva desde otro teléfono mientras se editaba.
        lote = buscarLote(lote.id);
        if (!lote) { alert('Este lote fue borrado desde otro teléfono.'); location.hash = '#/'; return; }
      } else {
        lote.id = nuevoId();
        datos.lotes.push(lote);
      }
      tocar(lote);
      lote.nombre = f.nombre.value.trim();
      lote.ha = Number(f.ha.value) || 0;
      lote.variedades = lote.variedades || {};
      if (f.cultivo.value) lote.cultivos[datos.campania] = f.cultivo.value;
      else delete lote.cultivos[datos.campania];
      if (f.cultivo.value && f.variedad.value.trim()) lote.variedades[datos.campania] = f.variedad.value.trim();
      else delete lote.variedades[datos.campania];
      guardar();
      location.hash = '#/lote/' + lote.id;
    });
  }

  // ---------- Pantalla: Lote ----------

  function vistaLote(lote) {
    var cultivo = cultivoEn(lote);
    var monitoreos = monitoreosDe(lote.id);
    var aplicaciones = aplicacionesDe(lote.id);
    var html =
      '<a class="volver" href="#/">' + icono('volver') + 'Lotes</a>' +
      '<h1>' + esc(lote.nombre) + '</h1>' +
      '<p class="sub">' + (cultivo ? esc(cultivoConVariedad(cultivo, variedadEn(lote))) + ' · ' : '') + lote.ha + ' ha · Campaña ' + esc(datos.campania) + '</p>';

    if (cultivo) {
      html += '<a class="btn btn-principal" href="#/lote/' + lote.id + '/monitoreo">' + icono('planilla') + 'Nuevo monitoreo</a>';
    } else {
      html += '<div class="aviso"><p>Este lote no tiene cultivo cargado en la campaña ' + esc(datos.campania) + '.</p>' +
        '<a class="btn btn-secundario" href="#/lote/' + lote.id + '/editar">Asignar cultivo</a></div>';
    }

    html += '<h2>Monitoreos <span class="contador">' + monitoreos.length + '</span></h2>';
    if (monitoreos.length) {
      html += '<div class="lista">' + monitoreos.map(function (m) {
        var estado = peorEstado(m);
        return '<a class="item ' + (estado ? 'borde-' + estado : '') + '" href="#/monitoreo/' + m.id + '">' +
          '<div class="item-cuerpo"><div class="item-titulo">' + fecha(m.fecha) + ' ' + chipEstado(estado) + '</div>' +
          '<div class="item-detalle">' + esc(resumenPlagas(m)) + '</div>' +
          '<div class="item-detalle">' + esc([etapaTexto(m), 'Paneo de ' + nombreLargo(m.largo), paneos(cantidadPaneos(m)), m.monitoreador].filter(Boolean).join(' · ')) + '</div>' +
          '</div>' + icono('flecha') + '</a>';
      }).join('') + '</div>';
    } else {
      html += '<p class="vacio">Sin monitoreos en esta campaña.</p>';
    }

    html += '<h2>Productos aplicados <span class="contador">' + aplicaciones.length + '</span></h2>' +
      '<a class="btn btn-suave ancho" href="#/lote/' + lote.id + '/aplicacion">' + icono('frasco') + 'Registrar producto aplicado</a>';
    if (aplicaciones.length) {
      html += '<div class="lista" style="margin-top:8px">' + aplicaciones.map(function (a) {
        return '<a class="item" href="#/aplicacion/' + a.id + '"><span class="item-icono">' + icono('frasco') + '</span>' +
          '<div class="item-cuerpo"><div class="item-titulo">' + esc(a.producto) +
          (a.dosis ? ' <span class="dosis">' + esc(a.dosis) + '</span>' : '') + '</div>' +
          '<div class="item-detalle">' + fecha(a.fecha) + ' · ' + esc(a.tipo) + (a.notas ? ' · ' + esc(a.notas) : '') + '</div></div>' +
          icono('editar') + '</a>';
      }).join('') + '</div>';
    } else {
      html += '<p class="vacio" style="margin-top:8px">Sin productos registrados en esta campaña.</p>';
    }

    html += '<div class="fila-botones" style="margin-top:24px">' +
      '<a class="btn btn-texto" href="#/lote/' + lote.id + '/editar">' + icono('editar') + 'Editar lote</a>' +
      '<button class="btn-peligro" data-accion="borrar-lote" data-id="' + lote.id + '">' + icono('borrar') + 'Borrar lote</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Registrar / editar producto aplicado ----------

  function formAplicacion(lote, aplicacion) {
    var editando = !!aplicacion;
    var a = aplicacion || { producto: '', tipo: TIPOS_PRODUCTO[0], fecha: hoy(), dosis: '', notas: '' };
    // Productos ya usados en cualquier lote, para sugerirlos al escribir.
    var usados = datos.aplicaciones.map(function (x) { return x.producto; })
      .filter(function (p, i, arr) { return arr.indexOf(p) === i; }).sort();

    app.innerHTML =
      '<a class="volver" href="#/lote/' + lote.id + '">' + icono('volver') + esc(lote.nombre) + '</a>' +
      '<h1>' + (editando ? 'Editar producto' : 'Producto aplicado') + '</h1>' +
      '<p class="sub">' + esc(lote.nombre) + ' · ' + esc(cultivoConVariedad(cultivoEn(lote, a.campania) || '', variedadEn(lote, a.campania))) + '</p>' +
      '<form id="form-aplicacion" class="tarjeta">' +
      '<div class="campo"><label for="a-producto">Producto</label><input id="a-producto" name="producto" required list="productos-usados" placeholder="Ej: Glifosato 66%" value="' + esc(a.producto) + '"/>' +
      '<datalist id="productos-usados">' + usados.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist></div>' +
      '<div class="campos-2">' +
      '<div class="campo"><label for="a-tipo">Tipo</label><select id="a-tipo" name="tipo">' +
      TIPOS_PRODUCTO.map(function (t) { return '<option' + (t === a.tipo ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="a-fecha">Fecha</label><input id="a-fecha" name="fecha" type="date" value="' + a.fecha + '"/></div>' +
      '</div>' +
      '<div class="campo"><label for="a-dosis">Dosis</label><input id="a-dosis" name="dosis" placeholder="Ej: 2 l/ha" value="' + esc(a.dosis) + '"/></div>' +
      '<div class="campo"><label for="a-notas">Notas</label><input id="a-notas" name="notas" placeholder="Opcional" value="' + esc(a.notas) + '"/></div>' +
      '<button class="btn-principal" type="submit">Guardar producto</button>' +
      '</form>' +
      (editando ? '<div class="fila-botones"><button type="button" class="btn-peligro" data-accion="borrar-aplicacion" data-id="' + a.id + '">' + icono('borrar') + 'Borrar producto</button></div>' : '');

    document.getElementById('form-aplicacion').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (editando) {
        a = buscarAplicacion(a.id);
        if (!a) { alert('Este producto fue borrado desde otro teléfono.'); location.hash = '#/lote/' + lote.id; return; }
      } else {
        a = { id: nuevoId(), loteId: lote.id, campania: datos.campania };
        datos.aplicaciones.push(a);
      }
      tocar(a);
      a.producto = f.producto.value.trim();
      a.tipo = f.tipo.value;
      a.fecha = f.fecha.value || hoy();
      a.dosis = f.dosis.value.trim();
      a.notas = f.notas.value.trim();
      guardar();
      location.hash = '#/lote/' + lote.id;
    });
  }

  // ---------- Pantalla: Nuevo / editar monitoreo ----------

  // Monitoreo que se está cargando; se conserva si se sale y se vuelve a la pantalla.
  var borrador = null;

  function nuevoBorrador(lote) {
    var cultivo = cultivoEn(lote);
    return {
      loteId: lote.id,
      cultivo: cultivo,
      variedad: variedadEn(lote),
      fecha: hoy(),
      monitoreador: datos.ultimoMonitoreador || '',
      estadio: '',
      etapa: null,
      largo: 1,
      plagas: plagasDe(cultivo).map(function (u) { return { nombre: u.plaga, conteos: [0] }; }),
      malezas: [],
      notas: ''
    };
  }

  function borradorDesde(m) {
    var b = JSON.parse(JSON.stringify(m));
    b.editandoId = m.id;
    b.etapa = etapaDe(m);
    b.monitoreador = b.monitoreador || '';
    if (!b.plagas.length) b.plagas = plagasDe(m.cultivo).map(function (u) { return { nombre: u.plaga, conteos: [0] }; });
    return b;
  }

  function formMonitoreo(lote) {
    if (!lote) { borrador = null; location.hash = '#/'; return; }
    var b = borrador;
    var cantidad = cantidadPaneos(b) || 1;
    var volver = b.editandoId ? '#/monitoreo/' + b.editandoId : '#/lote/' + lote.id;
    var nombres = datos.monitoreos.map(function (m) { return m.monitoreador; })
      .filter(function (n, i, arr) { return n && arr.indexOf(n) === i; }).sort();

    var html =
      '<a class="volver" href="' + volver + '">' + icono('volver') + (b.editandoId ? 'Cancelar' : esc(lote.nombre)) + '</a>' +
      '<h1>' + (b.editandoId ? 'Editar monitoreo' : 'Nuevo monitoreo') + '</h1><p class="sub">' + esc(lote.nombre) + ' · ' + esc(cultivoConVariedad(b.cultivo, b.variedad)) + '</p>' +

      '<div class="tarjeta"><div class="campos-2">' +
      '<div class="campo"><label for="m-fecha">Fecha</label><input id="m-fecha" type="date" data-campo="fecha" value="' + b.fecha + '"/></div>' +
      '<div class="campo"><label for="m-monitoreador">Monitoreó</label><input id="m-monitoreador" data-campo="monitoreador" list="monitoreadores" autocomplete="name" placeholder="Nombre" value="' + esc(b.monitoreador) + '"/>' +
      '<datalist id="monitoreadores">' + nombres.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist></div>' +
      '</div>' +
      '<div class="campo"><label for="m-estadio">Estado del cultivo</label><input id="m-estadio" data-campo="estadio" placeholder="Ej: R5" value="' + esc(b.estadio) + '"/></div>' +
      '<label>Etapa del cultivo</label><div class="opciones" id="etapas">' +
      ETAPAS.map(function (e) {
        return '<button type="button" data-accion="etapa" data-valor="' + e.id + '" class="' + (b.etapa === e.id ? 'activo' : '') + '">' +
          e.nombre + '<small>' + e.ejemplo + '</small></button>';
      }).join('') + '</div>' +
      '<label>Tipo de paneo</label><div class="opciones">' +
      '<button type="button" data-accion="largo" data-valor="1" class="' + (b.largo === 1 ? 'activo' : '') + '">1 metro</button>' +
      '<button type="button" data-accion="largo" data-valor="0.5" class="' + (b.largo === 0.5 ? 'activo' : '') + '">½ metro</button>' +
      '</div></div>' +

      '<h2>' + icono('regla') + 'Paneos <span class="contador">' + cantidad + '</span></h2>';

    for (var i = 0; i < cantidad; i++) {
      html += '<div class="tarjeta"><div class="paneo-cabecera"><strong>Paneo ' + (i + 1) + '</strong>' +
        (cantidad > 1 ? '<button type="button" class="btn-peligro" data-accion="quitar-paneo" data-paneo="' + i + '">' + icono('borrar') + 'Quitar</button>' : '') +
        '</div>';
      b.plagas.forEach(function (p, j) {
        html += '<div class="plaga-fila"><span>' + esc(p.nombre) + '</span><div class="stepper">' +
          '<button type="button" data-accion="restar" data-plaga="' + j + '" data-paneo="' + i + '" aria-label="Restar">' + icono('menos') + '</button>' +
          '<input type="number" inputmode="numeric" min="0" data-plaga="' + j + '" data-paneo="' + i + '" value="' + p.conteos[i] + '" aria-label="' + esc(p.nombre) + ', paneo ' + (i + 1) + '"/>' +
          '<button type="button" data-accion="sumar" data-plaga="' + j + '" data-paneo="' + i + '" aria-label="Sumar">' + icono('mas') + '</button>' +
          '</div></div>';
      });
      html += '</div>';
    }

    html += '<div class="fila-botones dos" style="margin-bottom:12px"><button type="button" class="btn-suave" data-accion="agregar-paneo">' + icono('mas') + 'Agregar paneo</button>' +
      '<button type="button" class="btn-texto" data-accion="agregar-plaga">' + icono('mas') + 'Otra plaga</button></div>' +

      '<div class="resultado" id="resultado"></div>' +

      '<h2>' + icono('brote') + 'Malezas</h2><div class="tarjeta">' +
      (b.malezas.length ? '' : '<p class="sub" style="margin:0 0 12px">Sin malezas anotadas.</p>') +
      b.malezas.map(function (mz, k) {
        return '<div class="maleza-fila"><strong>' + esc(mz.nombre) + '</strong>' +
          '<button type="button" class="btn-peligro" data-accion="quitar-maleza" data-maleza="' + k + '">' + icono('borrar') + 'Quitar</button>' +
          '<div class="opciones chico">' + NIVELES.map(function (n) {
            return '<button type="button" data-accion="nivel" data-maleza="' + k + '" data-valor="' + n + '" class="' + (mz.nivel === n ? 'activo' : '') + '">' + n + '</button>';
          }).join('') + '</div></div>';
      }).join('') +
      '<select data-accion="agregar-maleza" aria-label="Agregar maleza"><option value="">+ Agregar maleza…</option>' +
      MALEZAS.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></div>' +

      '<h2>Notas</h2><div class="tarjeta"><textarea rows="3" data-campo="notas" placeholder="Observaciones (opcional)">' + esc(b.notas) + '</textarea></div>' +

      '<div class="barra-guardar"><div><button type="button" class="btn-principal" data-accion="guardar-monitoreo">' +
      (b.editandoId ? 'Guardar cambios' : 'Guardar monitoreo') + '</button></div></div>';

    app.innerHTML = html;
    actualizarResultado();
  }

  function actualizarResultado() {
    var caja = document.getElementById('resultado');
    if (!caja || !borrador) return;
    var cantidad = cantidadPaneos(borrador);
    caja.innerHTML = '<h3>Resultado por metro lineal</h3>' +
      '<p class="nota">' + paneos(cantidad) + ' de ' + nombreLargo(borrador.largo) +
      ' = ' + num(cantidad * borrador.largo) + ' m revisados</p>' +
      resultados(borrador).map(filaResultado).join('');
  }

  function marcarEtapa() {
    document.querySelectorAll('#etapas button').forEach(function (btn) {
      btn.classList.toggle('activo', btn.dataset.valor === borrador.etapa);
    });
  }

  function guardarMonitoreo() {
    var b = borrador;
    var valores = {
      fecha: b.fecha || hoy(),
      monitoreador: b.monitoreador.trim(),
      estadio: b.estadio.trim(),
      etapa: b.etapa,
      largo: b.largo,
      cantidadPaneos: cantidadPaneos(b),
      plagas: b.plagas.map(function (p) { return { nombre: p.nombre, conteos: p.conteos.map(function (n) { return Number(n) || 0; }) }; }),
      malezas: b.malezas.slice(),
      notas: b.notas.trim()
    };
    var m;
    if (b.editandoId) {
      m = buscarMonitoreo(b.editandoId);
      if (!m) { alert('Este monitoreo fue borrado desde otro teléfono.'); borrador = null; location.hash = '#/lote/' + b.loteId; return; }
      Object.assign(m, valores);
    } else {
      m = Object.assign({ id: nuevoId(), loteId: b.loteId, campania: datos.campania, cultivo: b.cultivo, variedad: b.variedad }, valores);
      datos.monitoreos.push(m);
    }
    tocar(m);
    if (valores.monitoreador) datos.ultimoMonitoreador = valores.monitoreador;
    guardar();
    borrador = null;
    location.hash = b.editandoId ? '#/monitoreo/' + m.id : '#/lote/' + b.loteId;
  }

  // ---------- Pantalla: Ver monitoreo ----------

  function vistaMonitoreo(m) {
    var lote = buscarLote(m.loteId) || { nombre: 'Lote borrado', id: '' };
    var html =
      '<a class="volver" href="#/lote/' + lote.id + '">' + icono('volver') + esc(lote.nombre) + '</a>' +
      '<h1>Monitoreo ' + fecha(m.fecha) + '</h1>' +
      '<div class="datos-fila">' +
      '<span>' + icono('brote') + esc(cultivoConVariedad(m.cultivo, m.variedad)) + (etapaTexto(m) ? ' · ' + esc(etapaTexto(m)) : '') + '</span>' +
      '<span>' + icono('regla') + 'Paneo de ' + nombreLargo(m.largo) + ' · ' + paneos(cantidadPaneos(m)) + '</span>' +
      (m.monitoreador ? '<span>' + icono('persona') + esc(m.monitoreador) + '</span>' : '') +
      '</div>' +
      '<div class="resultado"><h3>Resultado por metro lineal</h3><p class="nota">' + num(cantidadPaneos(m) * m.largo) + ' m revisados</p>' +
      resultados(m).map(filaResultado).join('') + '</div>' +
      '<a class="btn btn-whatsapp" href="' + enlaceWhatsapp(m) + '" target="_blank" rel="noopener">' + icono('mensaje') + 'Compartir por WhatsApp</a>' +
      '<h2>Conteo por paneo</h2><div class="tarjeta">' +
      m.plagas.map(function (p) {
        return '<div class="plaga-fila"><span>' + esc(p.nombre) + '</span><span>' + p.conteos.join(' · ') + '</span></div>';
      }).join('') + '</div>' +
      '<h2>Malezas</h2><div class="tarjeta">' +
      (m.malezas.length ? m.malezas.map(function (mz) {
        return '<div class="plaga-fila"><span>' + esc(mz.nombre) + '</span><b>' + esc(mz.nivel) + '</b></div>';
      }).join('') : 'Sin malezas anotadas.') + '</div>' +
      (m.notas ? '<h2>Notas</h2><div class="tarjeta">' + esc(m.notas) + '</div>' : '') +
      '<div class="fila-botones">' +
      '<a class="btn btn-suave" href="#/monitoreo/' + m.id + '/editar">' + icono('editar') + 'Editar</a>' +
      '<button class="btn-peligro" data-accion="borrar-monitoreo" data-id="' + m.id + '">' + icono('borrar') + 'Borrar monitoreo</button></div>';
    app.innerHTML = html;
  }

  // ---------- Compartir por WhatsApp ----------

  function textoWhatsapp(m) {
    var lote = buscarLote(m.loteId) || { nombre: 'Lote', ha: '' };
    var lineas = [
      '*AgroLacau – Monitoreo*',
      '📍 ' + lote.nombre + ' (' + m.cultivo + (m.variedad ? ' ' + m.variedad : '') + (lote.ha ? ' · ' + lote.ha + ' ha' : '') + ')',
      '📅 ' + fecha(m.fecha) + (etapaTexto(m) ? ' · ' + etapaTexto(m) : '')
    ];
    if (m.monitoreador) lineas.push('👤 ' + m.monitoreador);
    lineas.push('🔎 ' + paneos(cantidadPaneos(m)) + ' de ' + nombreLargo(m.largo) + ' (' + num(cantidadPaneos(m) * m.largo) + ' m)');

    lineas.push('', '*Plagas (ind/m lineal)*');
    resultados(m).forEach(function (r) {
      lineas.push((EMOJI_ESTADO[r.estado] || '⚪') + ' ' + r.nombre + ': ' + num(r.valor) +
        (r.umbral ? ' (umbral ' + num(r.umbral) + ')' : ''));
    });

    if (m.malezas.length) {
      lineas.push('', '*Malezas*');
      m.malezas.forEach(function (mz) { lineas.push('• ' + mz.nombre + ' – ' + mz.nivel); });
    }

    var desde = restarDias(m.fecha, DIAS_PRODUCTOS_RECIENTES);
    var productos = datos.aplicaciones.filter(function (a) {
      return a.loteId === m.loteId && a.fecha >= desde && a.fecha <= m.fecha;
    }).sort(porFechaDesc);
    if (productos.length) {
      lineas.push('', '*Productos aplicados (últimos ' + DIAS_PRODUCTOS_RECIENTES + ' días)*');
      productos.forEach(function (a) {
        lineas.push('• ' + fecha(a.fecha) + ' ' + a.producto + (a.dosis ? ' – ' + a.dosis : '') + ' (' + a.tipo + ')');
      });
    }

    if (m.notas) lineas.push('', '📝 ' + m.notas);
    return lineas.join('\n');
  }

  function enlaceWhatsapp(m) { return 'https://wa.me/?text=' + encodeURIComponent(textoWhatsapp(m)); }

  // ---------- Exportar ----------

  function exportarMonitoreos() {
    var filas = [['Campaña', 'Lote', 'Cultivo', 'Variedad', 'Fecha', 'Monitoreó', 'Estado del cultivo', 'Etapa', 'Tipo de paneo', 'Paneos', 'Plaga', 'Conteos', 'Ind/m', 'Umbral', 'Semáforo', 'Malezas', 'Notas']];
    datos.monitoreos.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).forEach(function (m) {
      var lote = buscarLote(m.loteId) || { nombre: '' };
      var malezas = m.malezas.map(function (mz) { return mz.nombre + ' (' + mz.nivel + ')'; }).join(', ');
      resultados(m).forEach(function (r, i) {
        filas.push([m.campania, lote.nombre, m.cultivo, m.variedad || '', fecha(m.fecha), m.monitoreador || '', m.estadio, nombreEtapa(etapaDe(m)),
          nombreLargo(m.largo), cantidadPaneos(m), r.nombre, m.plagas[i].conteos.join(' '), num(r.valor),
          r.umbral ? num(r.umbral) : '', r.estado ? ESTADOS[r.estado] : '', malezas, m.notas]);
      });
    });
    descargarCsv(filas, 'monitoreos');
  }

  function exportarAplicaciones() {
    var filas = [['Campaña', 'Lote', 'Cultivo', 'Variedad', 'Fecha', 'Producto', 'Tipo', 'Dosis', 'Notas']];
    datos.aplicaciones.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).forEach(function (a) {
      var lote = buscarLote(a.loteId) || { nombre: '', cultivos: {} };
      filas.push([a.campania, lote.nombre, lote.cultivos[a.campania] || '', variedadEn(lote, a.campania), fecha(a.fecha), a.producto, a.tipo, a.dosis, a.notas]);
    });
    descargarCsv(filas, 'productos-aplicados');
  }

  function descargarCsv(filas, nombre) {
    var csv = filas.map(function (f) {
      return f.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre + '-agrolacau-' + hoy() + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- Eventos ----------

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-accion]');
    if (!el || el.tagName === 'SELECT') return;
    var accion = el.dataset.accion;
    var b = borrador;
    var lote = b && buscarLote(b.loteId);

    if (accion === 'exportar') return exportarMonitoreos();
    if (accion === 'sincronizar') return sincronizar();
    if (accion === 'ver-clave') {
      var campo = document.getElementById('e-clave');
      campo.type = campo.type === 'password' ? 'text' : 'password';
      el.textContent = campo.type === 'password' ? 'Ver' : 'Ocultar';
      return;
    }
    if (accion === 'desconectar') {
      if (!confirm('¿Desconectar este teléfono del equipo? Los datos quedan en el teléfono pero dejan de sincronizarse.')) return;
      guardarClaveEquipo(null);
      cambiarEstadoSync('desconectado');
      return vistaEquipo();
    }
    if (accion === 'usar-equipo') return conectar(datosDelEquipo.clave, datosDelEquipo);
    if (accion === 'sumar-telefono') return conectar(datosDelEquipo.clave, null);
    if (accion === 'exportar-aplicaciones') return exportarAplicaciones();

    if (accion === 'borrar-lote') {
      var l = buscarLote(el.dataset.id);
      if (!confirm('¿Borrar "' + l.nombre + '" con todos sus monitoreos y productos aplicados de todas las campañas?')) return;
      borrarRegistros('lotes', function (x) { return x.id === l.id; });
      borrarRegistros('monitoreos', function (x) { return x.loteId === l.id; });
      borrarRegistros('aplicaciones', function (x) { return x.loteId === l.id; });
      guardar();
      location.hash = '#/';
      return;
    }

    if (accion === 'borrar-aplicacion') {
      var ap = buscarAplicacion(el.dataset.id);
      if (!confirm('¿Borrar "' + ap.producto + '" del ' + fecha(ap.fecha) + '?')) return;
      borrarRegistros('aplicaciones', function (x) { return x.id === ap.id; });
      guardar();
      location.hash = '#/lote/' + ap.loteId;
      return;
    }

    if (accion === 'agregar-plaga-umbral') {
      var plaga = (prompt('Nombre de la plaga') || '').trim();
      if (!plaga) return;
      plagasDe(el.dataset.cultivo).push(sinUmbral(plaga));
      tocarUmbrales();
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'quitar-plaga-umbral') {
      var lista = plagasDe(el.dataset.cultivo);
      var u = lista[Number(el.dataset.indice)];
      if (!confirm('¿Quitar "' + u.plaga + '" de ' + el.dataset.cultivo + '? Los monitoreos ya guardados no cambian.')) return;
      lista.splice(Number(el.dataset.indice), 1);
      tocarUmbrales();
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'restablecer-umbrales') {
      if (!confirm('¿Volver todos los umbrales y plagas a los valores iniciales?')) return;
      datos.umbrales = umbralesIniciales();
      tocarUmbrales();
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'borrar-monitoreo') {
      var m = buscarMonitoreo(el.dataset.id);
      if (!confirm('¿Borrar este monitoreo?')) return;
      borrarRegistros('monitoreos', function (x) { return x.id === m.id; });
      guardar();
      location.hash = '#/lote/' + m.loteId;
      return;
    }

    if (!b) return;

    if (accion === 'sumar' || accion === 'restar') {
      var p = b.plagas[el.dataset.plaga];
      var i = Number(el.dataset.paneo);
      p.conteos[i] = Math.max(0, (Number(p.conteos[i]) || 0) + (accion === 'sumar' ? 1 : -1));
      el.parentNode.querySelector('input').value = p.conteos[i];
      actualizarResultado();
    } else if (accion === 'etapa') {
      b.etapa = el.dataset.valor;
      marcarEtapa();
      actualizarResultado();
    } else if (accion === 'largo') {
      b.largo = Number(el.dataset.valor);
      formMonitoreo(lote);
    } else if (accion === 'agregar-paneo') {
      b.plagas.forEach(function (p) { p.conteos.push(0); });
      formMonitoreo(lote);
    } else if (accion === 'quitar-paneo') {
      var idx = Number(el.dataset.paneo);
      b.plagas.forEach(function (p) { p.conteos.splice(idx, 1); });
      formMonitoreo(lote);
    } else if (accion === 'agregar-plaga') {
      var nombre = (prompt('Nombre de la plaga') || '').trim();
      if (!nombre) return;
      b.plagas.push({ nombre: nombre, conteos: new Array(cantidadPaneos(b) || 1).fill(0) });
      formMonitoreo(lote);
    } else if (accion === 'nivel') {
      b.malezas[el.dataset.maleza].nivel = el.dataset.valor;
      formMonitoreo(lote);
    } else if (accion === 'quitar-maleza') {
      b.malezas.splice(Number(el.dataset.maleza), 1);
      formMonitoreo(lote);
    } else if (accion === 'guardar-monitoreo') {
      guardarMonitoreo();
    }
  });

  app.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.umbralCultivo) {
      var valor = parseFloat(el.value.replace(',', '.'));
      plagasDe(el.dataset.umbralCultivo)[el.dataset.umbralIndice].umbral[el.dataset.umbralEtapa] = valor > 0 ? valor : null;
      tocarUmbrales();
      guardar();
      return;
    }
    if (!borrador) return;
    if (el.dataset.campo) {
      borrador[el.dataset.campo] = el.value;
      // Al escribir "V6" o "R5" se elige sola la etapa.
      if (el.dataset.campo === 'estadio' && etapaDesdeTexto(el.value)) {
        borrador.etapa = etapaDesdeTexto(el.value);
        marcarEtapa();
        actualizarResultado();
      }
    } else if (el.dataset.plaga != null) {
      borrador.plagas[el.dataset.plaga].conteos[el.dataset.paneo] = Math.max(0, Number(el.value) || 0);
      actualizarResultado();
    }
  });

  app.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.accion !== 'agregar-maleza' || !el.value || !borrador) return;
    borrador.malezas.push({ nombre: el.value, nivel: 'Baja' });
    formMonitoreo(buscarLote(borrador.loteId));
  });

  // ---------- Sincronización con el equipo ----------

  function claveEquipo() {
    try { return localStorage.getItem(CLAVE_EQUIPO); } catch (e) { return null; }
  }

  function guardarClaveEquipo(clave) {
    try {
      if (clave) localStorage.setItem(CLAVE_EQUIPO, clave);
      else localStorage.removeItem(CLAVE_EQUIPO);
    } catch (e) { /* sin acceso a localStorage */ }
  }

  // Lo que se comparte con el equipo (la campaña elegida y el último monitoreador quedan en cada teléfono).
  function datosCompartidos() {
    return {
      lotes: datos.lotes,
      monitoreos: datos.monitoreos,
      aplicaciones: datos.aplicaciones,
      umbrales: datos.umbrales,
      umbralesActualizado: datos.umbralesActualizado,
      borrados: datos.borrados
    };
  }

  // Suma lo que llegó del servidor; devuelve true si cambió algo en este teléfono.
  function aplicarDelServidor(remoto) {
    var antes = JSON.stringify(datosCompartidos());
    Object.assign(datos, window.combinarDatos(datosCompartidos(), remoto));
    guardarLocal();
    return JSON.stringify(datosCompartidos()) !== antes;
  }

  function pedirAlServidor(metodo, clave, cuerpo) {
    return fetch('/api/datos', {
      method: metodo,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Clave': encodeURIComponent(clave) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { estado: r.status, datos: j }; });
    });
  }

  function mensajeDeError(r) {
    if (r.estado === 404) return 'No se encontró el servidor del equipo. ¿La app está publicada en Netlify?';
    return (r.datos && r.datos.error) || 'Error del servidor (' + r.estado + ').';
  }

  function programarSincronizacion() {
    clearTimeout(sync.temporizador);
    sync.temporizador = setTimeout(sincronizar, 800);
  }

  function sincronizar() {
    var clave = claveEquipo();
    if (!clave) return cambiarEstadoSync('desconectado');
    if (!navigator.onLine) return cambiarEstadoSync('sin-senal');
    if (sync.enCurso) { sync.repetir = true; return; }
    sync.enCurso = true;
    sync.pendiente = false;
    cambiarEstadoSync('sincronizando');
    pedirAlServidor('POST', clave, datosCompartidos()).then(function (r) {
      if (r.estado === 200) {
        var cambio = aplicarDelServidor(r.datos);
        sync.ultima = new Date();
        cambiarEstadoSync('ok');
        if (cambio) refrescar();
      } else {
        sync.pendiente = true;
        cambiarEstadoSync(r.estado === 401 ? 'clave-incorrecta' : 'error', mensajeDeError(r));
      }
    }).catch(function () {
      sync.pendiente = true;
      cambiarEstadoSync(navigator.onLine ? 'error' : 'sin-senal', 'No se pudo conectar con el servidor.');
    }).then(function () {
      sync.enCurso = false;
      if (sync.repetir) { sync.repetir = false; sincronizar(); }
    });
  }

  function cambiarEstadoSync(estado, mensaje) {
    sync.estado = estado;
    sync.mensaje = mensaje || '';
    var caja = document.getElementById('estado-sync');
    if (caja) caja.outerHTML = bloqueEstadoSync();
  }

  function hora(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  // Línea de estado (o aviso para conectar) que se muestra en el inicio y en la pantalla Equipo.
  function bloqueEstadoSync() {
    var e = sync.estado;
    if (e === 'desconectado') {
      return '<div id="estado-sync" class="aviso"><p><b>Este teléfono no comparte datos con el equipo.</b> ' +
        'Conectalo para ver y cargar los mismos lotes y monitoreos en todos los teléfonos.</p>' +
        '<a class="btn btn-secundario" href="#/equipo">' + icono('nube') + 'Conectar con el equipo</a></div>';
    }
    if (e === 'clave-incorrecta') {
      return '<div id="estado-sync" class="aviso error"><p><b>La clave del equipo no es correcta o cambió.</b> ' +
        'Los cambios quedan guardados en este teléfono hasta que vuelvas a conectar.</p>' +
        '<a class="btn btn-secundario" href="#/equipo">Volver a conectar</a></div>';
    }
    var texto = {
      'sincronizando': 'Sincronizando con el equipo…',
      'ok': 'Sincronizado con el equipo' + (sync.ultima ? ' · ' + hora(sync.ultima) : ''),
      'sin-senal': 'Sin señal: ' + (sync.pendiente ? 'los cambios se suben' : 'se sincroniza') + ' al volver la conexión',
      'error': 'No se pudo sincronizar. ' + sync.mensaje
    }[e];
    return '<a id="estado-sync" class="estado-sync ' + e + '" href="#/equipo">' + icono('nube') + '<span>' + esc(texto) + '</span></a>';
  }

  // ---------- Pantalla: Equipo ----------

  // Datos del equipo leídos al conectar, mientras se elige qué hacer con los de este teléfono.
  var datosDelEquipo = null;

  function vistaEquipo(mensaje) {
    var conectado = !!claveEquipo();
    var html = '<a class="volver" href="#/">' + icono('volver') + 'Lotes</a><h1>Compartir con el equipo</h1>' +
      '<p class="sub">Con la misma clave, todos los teléfonos ven y cargan los mismos lotes, monitoreos, productos y umbrales. ' +
      'Sin señal se sigue usando igual: los cambios se suben solos al volver la conexión.</p>';

    if (conectado) {
      html += bloqueEstadoSync() +
        '<div class="fila-botones dos"><button class="btn-secundario" data-accion="sincronizar">' + icono('nube') + 'Sincronizar ahora</button>' +
        '<button class="btn-suave" data-accion="desconectar">Desconectar</button></div>';
    } else if (datosDelEquipo) {
      var n = (datosDelEquipo.lotes || []).length;
      html += '<div class="tarjeta"><p style="margin-top:0"><b>La clave es correcta.</b> El equipo ya tiene ' + n + (n === 1 ? ' lote cargado' : ' lotes cargados') +
        '. ¿Qué hacemos con los datos que hay en este teléfono?</p>' +
        '<button class="btn-principal" data-accion="usar-equipo">Usar solo los datos del equipo</button>' +
        '<p class="sub" style="margin:8px 0 14px">Recomendado si este teléfono tiene solo los lotes de ejemplo o datos de prueba.</p>' +
        '<button class="btn-suave ancho" data-accion="sumar-telefono">Sumar también los datos de este teléfono</button>' +
        '<p class="sub" style="margin:8px 0 0">Si tenés monitoreos cargados acá que el equipo todavía no tiene.</p></div>';
    } else {
      html += '<form id="form-equipo" class="tarjeta">' +
        '<div class="campo"><label for="e-clave">Clave del equipo</label>' +
        '<div class="campo-clave"><input id="e-clave" name="clave" type="password" required autocomplete="current-password" ' +
        'autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="La misma en todos los teléfonos"/>' +
        '<button type="button" class="btn-texto" data-accion="ver-clave">Ver</button></div>' +
        '<p class="sub" style="margin:6px 0 0">No importan mayúsculas ni minúsculas.</p></div>' +
        (mensaje ? '<p class="error-texto">' + esc(mensaje) + '</p>' : '') +
        '<button class="btn-principal" type="submit">' + icono('nube') + 'Conectar</button></form>';
    }
    app.innerHTML = html;

    var form = document.getElementById('form-equipo');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var clave = form.clave.value.trim();
      var boton = form.querySelector('button');
      boton.disabled = true;
      boton.textContent = 'Conectando…';
      pedirAlServidor('GET', clave).then(function (r) {
        if (r.estado !== 200) return vistaEquipo(r.estado === 401 ? 'Clave incorrecta.' : mensajeDeError(r));
        var tieneDatos = (r.datos.lotes || []).length > 0;
        if (tieneDatos && datos.lotes.length) {
          datosDelEquipo = r.datos;
          datosDelEquipo.clave = clave;
          return vistaEquipo();
        }
        conectar(clave, tieneDatos ? r.datos : null);
      }).catch(function () {
        vistaEquipo('No se pudo conectar. Revisá que haya señal.');
      });
    });
  }

  // reemplazo: datos del equipo que reemplazan a los de este teléfono (o null para sumarlos).
  function conectar(clave, reemplazo) {
    if (reemplazo) {
      COLECCIONES.forEach(function (col) { datos[col] = reemplazo[col] || []; });
      datos.borrados = reemplazo.borrados || { lotes: {}, monitoreos: {}, aplicaciones: {} };
      if (reemplazo.umbrales) {
        datos.umbrales = reemplazo.umbrales;
        datos.umbralesActualizado = reemplazo.umbralesActualizado || 0;
      }
      guardarLocal();
    }
    datosDelEquipo = null;
    guardarClaveEquipo(clave);
    sync.estado = 'sincronizando';
    sincronizar();
    router();
  }

  // Vuelve a dibujar la pantalla con los datos nuevos, salvo que se esté completando un formulario.
  function refrescar() {
    var ruta = location.hash.replace(/^#\/?/, '');
    var enFormulario = /(^|\/)(nuevo|editar|monitoreo|aplicacion)$/.test(ruta) || /^aplicacion\//.test(ruta) || ruta === 'equipo';
    var activo = document.activeElement;
    var escribiendo = activo && app.contains(activo) && /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName);
    if (enFormulario || escribiendo) return;
    var y = window.scrollY;
    router();
    window.scrollTo(0, y);
  }

  window.addEventListener('online', sincronizar);
  window.addEventListener('offline', function () { cambiarEstadoSync(claveEquipo() ? 'sin-senal' : 'desconectado'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sincronizar(); });
  setInterval(function () { if (!document.hidden) sincronizar(); }, 30000);

  // ---------- Campaña (encabezado) ----------

  function pintarCampanias() {
    selectorCampania.innerHTML = campaniasDisponibles().map(function (c) {
      return '<option' + (c === datos.campania ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
  }

  selectorCampania.addEventListener('change', function () {
    datos.campania = selectorCampania.value;
    guardarLocal();
    // Un monitoreo nuevo a medio cargar pertenece a la campaña anterior.
    if (borrador && !borrador.editandoId) borrador = null;
    router();
  });

  // ---------- Rutas ----------

  function router() {
    var partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var lote, m, a;
    window.scrollTo(0, 0);
    pintarCampanias();

    if (partes[0] !== 'equipo') datosDelEquipo = null;
    if (partes[0] === 'equipo') return vistaEquipo();
    if (partes[0] === 'umbrales') return vistaUmbrales();
    if (partes[0] === 'lote' && partes[1] === 'nuevo') return formLote(null);
    if (partes[0] === 'lote' && (lote = buscarLote(partes[1]))) {
      if (partes[2] === 'editar') return formLote(lote);
      if (partes[2] === 'aplicacion') return formAplicacion(lote, null);
      if (partes[2] === 'monitoreo' && cultivoEn(lote)) {
        if (!borrador || borrador.loteId !== lote.id || borrador.editandoId) borrador = nuevoBorrador(lote);
        return formMonitoreo(lote);
      }
      return vistaLote(lote);
    }
    if (partes[0] === 'monitoreo' && (m = buscarMonitoreo(partes[1]))) {
      if (partes[2] === 'editar') {
        if (!borrador || borrador.editandoId !== m.id) borrador = borradorDesde(m);
        return formMonitoreo(buscarLote(m.loteId));
      }
      return vistaMonitoreo(m);
    }
    if (partes[0] === 'aplicacion' && (a = buscarAplicacion(partes[1]))) return formAplicacion(buscarLote(a.loteId), a);
    vistaLotes();
  }

  window.addEventListener('hashchange', router);
  if (claveEquipo()) sync.estado = navigator.onLine ? 'sincronizando' : 'sin-senal';
  router();
  sincronizar();
})();
