// AgroLacau – app simple de monitoreo.
// Pantallas: Lotes (agrupados por cultivo) → Lote → Nuevo monitoreo (paneos de 1 m o ½ m)
// y productos aplicados; Umbrales de daño por cultivo.
// Los datos se guardan en el navegador (localStorage).
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

  var CLAVE = 'agrolacau-v1';
  var app = document.getElementById('app');

  // ---------- Datos ----------

  function datosIniciales() {
    return {
      lotes: [
        { id: 'l1', nombre: 'Lote 07 – Demo', cultivo: 'Soja 1ra', ha: 85 },
        { id: 'l2', nombre: 'Lote 03 – El Ombú', cultivo: 'Soja 1ra', ha: 110 },
        { id: 'l3', nombre: 'Lote 02 – El Molino', cultivo: 'Soja 1ra', ha: 64 },
        { id: 'l4', nombre: 'Lote 09 – La Tranquera', cultivo: 'Soja 2da', ha: 70 },
        { id: 'l5', nombre: 'Lote 12 – La Laguna', cultivo: 'Maíz', ha: 92 },
        { id: 'l6', nombre: 'Lote 05 – Los Álamos', cultivo: 'Girasol', ha: 58 }
      ],
      monitoreos: []
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
    d.umbrales = d.umbrales || umbralesIniciales();
    // La versión anterior guardaba un solo umbral por plaga: se usa para las dos etapas.
    Object.keys(d.umbrales).forEach(function (cultivo) {
      d.umbrales[cultivo].forEach(function (u) {
        if (u.umbral == null || typeof u.umbral === 'number') u.umbral = { vegetativo: u.umbral, reproductivo: u.umbral };
      });
    });
    d.aplicaciones = d.aplicaciones || [];
    return d;
  }

  var datos = cargar();

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { alert('No se pudo guardar en este navegador.'); }
  }

  function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function buscarLote(id) { return datos.lotes.find(function (l) { return l.id === id; }); }
  function buscarMonitoreo(id) { return datos.monitoreos.find(function (m) { return m.id === id; }); }

  function monitoreosDe(loteId) {
    return datos.monitoreos
      .filter(function (m) { return m.loteId === loteId; })
      .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
  }

  function aplicacionesDe(loteId) {
    return datos.aplicaciones
      .filter(function (a) { return a.loteId === loteId; })
      .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
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

  function cultivoDe(m) {
    var lote = buscarLote(m.loteId);
    return m.cultivo || (lote && lote.cultivo) || 'Otro';
  }

  // Resultado de cada plaga de un monitoreo con su umbral y estado.
  function resultados(m) {
    var cultivo = cultivoDe(m);
    var etapa = etapaDe(m);
    return m.plagas.map(function (p) {
      var valor = porMetro(p, m);
      var umbral = umbralDe(cultivo, p.nombre, etapa);
      return { nombre: p.nombre, valor: valor, umbral: umbral, etapa: etapa, estado: estadoDe(valor, umbral) };
    });
  }

  var GRAVEDAD = { rojo: 3, amarillo: 2, verde: 1 };

  function peorEstado(m) {
    return resultados(m).reduce(function (peor, r) {
      return (GRAVEDAD[r.estado] || 0) > (GRAVEDAD[peor] || 0) ? r.estado : peor;
    }, null);
  }

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
  function nombreLargo(largo) { return largo === 1 ? '1 metro' : '½ metro'; }

  function resumenPlagas(m) {
    var partes = resultados(m)
      .filter(function (r) { return r.valor > 0; })
      .map(function (r) { return r.nombre + ' ' + num(r.valor) + ' ind/m'; });
    return partes.length ? partes.join(' · ') : 'Sin plagas';
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
    var detalle = l.ha + ' ha · ' + (ultimo ? 'Último: ' + fecha(ultimo.fecha) + ' – ' + resumenPlagas(ultimo) : 'Sin monitoreos');
    return '<a class="item ' + (estado ? 'borde-' + estado : '') + '" href="#/lote/' + l.id + '"><div><div class="item-titulo">' + esc(l.nombre) +
      '</div><div class="item-detalle">' + esc(detalle) + '</div></div><span class="flecha">›</span></a>';
  }

  // ---------- Pantalla: Lotes ----------

  function vistaLotes() {
    var html = '<h1>Lotes</h1><p class="sub">Ordenados por cultivo</p>' +
      '<div class="fila-botones"><a class="btn btn-secundario" href="#/lote/nuevo">+ Agregar lote</a>' +
      '<a class="btn btn-texto" href="#/umbrales">Umbrales de daño</a></div>';

    var enAlerta = datos.lotes.filter(function (l) {
      var ultimo = monitoreosDe(l.id)[0];
      return ultimo && peorEstado(ultimo) === 'rojo';
    });
    if (enAlerta.length) {
      html += '<h2 class="titulo-alerta">Superan el umbral <span class="contador rojo">' + enAlerta.length + '</span></h2>' +
        '<div class="lista">' + enAlerta.map(itemLote).join('') + '</div>';
    }

    CULTIVOS.forEach(function (cultivo) {
      var lotes = datos.lotes
        .filter(function (l) { return l.cultivo === cultivo; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
      if (!lotes.length) return;

      html += '<h2>' + esc(cultivo) + ' <span class="contador">' + lotes.length + '</span></h2>' +
        '<div class="lista">' + lotes.map(itemLote).join('') + '</div>';
    });

    if (!datos.lotes.length) html += '<p class="vacio">Todavía no hay lotes. Agregá el primero.</p>';

    html += '<div class="pie"><button class="btn-texto" data-accion="exportar">Descargar monitoreos (Excel / CSV)</button>' +
      '<button class="btn-texto" data-accion="exportar-aplicaciones">Descargar productos aplicados (Excel / CSV)</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Umbrales de daño ----------

  function vistaUmbrales() {
    var html = '<a class="volver" href="#/">‹ Lotes</a><h1>Umbrales de daño</h1>' +
      '<p class="sub">En individuos por metro lineal, para cada etapa del cultivo: Veg. = vegetativo, Repr. = reproductivo. Dejá vacío si no querés alerta. ' +
      'Las plagas de cada cultivo son las que aparecen al hacer un monitoreo.</p>' +
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
            '" data-indice="' + i + '" aria-label="Quitar ' + esc(u.plaga) + '">✕</button></div></div>';
        }).join('') +
        '<button type="button" class="btn-texto" data-accion="agregar-plaga-umbral" data-cultivo="' + esc(cultivo) + '">+ Agregar plaga</button></div>';
    });

    html += '<div class="fila-botones"><button type="button" class="btn-texto" data-accion="restablecer-umbrales">Volver a los valores iniciales</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Agregar / editar lote ----------

  function formLote(lote) {
    var editando = !!lote;
    lote = lote || { nombre: '', cultivo: CULTIVOS[0], ha: '' };
    app.innerHTML =
      '<a class="volver" href="' + (editando ? '#/lote/' + lote.id : '#/') + '">‹ Volver</a>' +
      '<h1>' + (editando ? 'Editar lote' : 'Nuevo lote') + '</h1>' +
      '<form id="form-lote" class="tarjeta">' +
      '<div class="campo"><label for="f-nombre">Nombre</label><input id="f-nombre" name="nombre" required placeholder="Ej: Lote 07 – El Ombú" value="' + esc(lote.nombre) + '"/></div>' +
      '<div class="campos-2">' +
      '<div class="campo"><label for="f-cultivo">Cultivo</label><select id="f-cultivo" name="cultivo">' +
      CULTIVOS.map(function (c) { return '<option' + (c === lote.cultivo ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="campo"><label for="f-ha">Hectáreas</label><input id="f-ha" name="ha" type="number" inputmode="decimal" min="0" step="any" value="' + esc(lote.ha) + '"/></div>' +
      '</div>' +
      '<button class="btn-principal" type="submit">Guardar lote</button>' +
      '</form>';

    document.getElementById('form-lote').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var valores = { nombre: f.nombre.value.trim(), cultivo: f.cultivo.value, ha: Number(f.ha.value) || 0 };
      if (editando) {
        Object.assign(lote, valores);
      } else {
        lote = Object.assign({ id: nuevoId() }, valores);
        datos.lotes.push(lote);
      }
      guardar();
      location.hash = '#/lote/' + lote.id;
    });
  }

  // ---------- Pantalla: Lote ----------

  function vistaLote(lote) {
    var monitoreos = monitoreosDe(lote.id);
    var aplicaciones = aplicacionesDe(lote.id);
    var html =
      '<a class="volver" href="#/">‹ Lotes</a>' +
      '<h1>' + esc(lote.nombre) + '</h1>' +
      '<p class="sub">' + esc(lote.cultivo) + ' · ' + lote.ha + ' ha</p>' +
      '<a class="btn btn-principal" href="#/lote/' + lote.id + '/monitoreo">+ Nuevo monitoreo</a>' +
      '<h2>Monitoreos <span class="contador">' + monitoreos.length + '</span></h2>';

    if (monitoreos.length) {
      html += '<div class="lista">' + monitoreos.map(function (m) {
        var estado = peorEstado(m);
        return '<a class="item ' + (estado ? 'borde-' + estado : '') + '" href="#/monitoreo/' + m.id + '"><div><div class="item-titulo">' + fecha(m.fecha) +
          (etapaDe(m) ? ' · ' + nombreEtapa(etapaDe(m)) : '') + (m.estadio ? ' ' + esc(m.estadio) : '') + ' ' + chipEstado(estado) + '</div><div class="item-detalle">' +
          esc(resumenPlagas(m)) + '</div><div class="item-detalle">Paneo de ' + nombreLargo(m.largo) + ' · ' +
          m.cantidadPaneos + (m.cantidadPaneos === 1 ? ' paneo' : ' paneos') + '</div></div><span class="flecha">›</span></a>';
      }).join('') + '</div>';
    } else {
      html += '<p class="vacio">Sin monitoreos todavía.</p>';
    }

    html += '<h2>Productos aplicados <span class="contador">' + aplicaciones.length + '</span></h2>' +
      '<a class="btn btn-secundario ancho" href="#/lote/' + lote.id + '/aplicacion">+ Registrar producto aplicado</a>';
    if (aplicaciones.length) {
      html += '<div class="lista" style="margin-top:8px">' + aplicaciones.map(function (a) {
        return '<div class="item"><div><div class="item-titulo">' + esc(a.producto) +
          (a.dosis ? ' <span class="dosis">' + esc(a.dosis) + '</span>' : '') + '</div>' +
          '<div class="item-detalle">' + fecha(a.fecha) + ' · ' + esc(a.tipo) + (a.notas ? ' · ' + esc(a.notas) : '') + '</div></div>' +
          '<button type="button" class="btn-peligro" data-accion="borrar-aplicacion" data-id="' + a.id + '" aria-label="Borrar ' + esc(a.producto) + '">✕</button></div>';
      }).join('') + '</div>';
    } else {
      html += '<p class="vacio" style="margin-top:8px">Sin productos registrados.</p>';
    }

    html += '<div class="fila-botones" style="margin-top:24px">' +
      '<a class="btn btn-texto" href="#/lote/' + lote.id + '/editar">Editar lote</a>' +
      '<button class="btn-peligro" data-accion="borrar-lote" data-id="' + lote.id + '">Borrar lote</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Registrar producto aplicado ----------

  function formAplicacion(lote) {
    // Productos ya usados en cualquier lote, para sugerirlos al escribir.
    var usados = datos.aplicaciones.map(function (a) { return a.producto; })
      .filter(function (p, i, arr) { return arr.indexOf(p) === i; }).sort();

    app.innerHTML =
      '<a class="volver" href="#/lote/' + lote.id + '">‹ ' + esc(lote.nombre) + '</a>' +
      '<h1>Producto aplicado</h1><p class="sub">' + esc(lote.nombre) + ' · ' + esc(lote.cultivo) + '</p>' +
      '<form id="form-aplicacion" class="tarjeta">' +
      '<div class="campo"><label for="a-producto">Producto</label><input id="a-producto" name="producto" required list="productos-usados" placeholder="Ej: Glifosato 66%"/>' +
      '<datalist id="productos-usados">' + usados.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist></div>' +
      '<div class="campos-2">' +
      '<div class="campo"><label for="a-tipo">Tipo</label><select id="a-tipo" name="tipo">' +
      TIPOS_PRODUCTO.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="a-fecha">Fecha</label><input id="a-fecha" name="fecha" type="date" value="' + hoy() + '"/></div>' +
      '</div>' +
      '<div class="campo"><label for="a-dosis">Dosis</label><input id="a-dosis" name="dosis" placeholder="Ej: 2 l/ha"/></div>' +
      '<div class="campo"><label for="a-notas">Notas</label><input id="a-notas" name="notas" placeholder="Opcional"/></div>' +
      '<button class="btn-principal" type="submit">Guardar producto</button>' +
      '</form>';

    document.getElementById('form-aplicacion').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      datos.aplicaciones.push({
        id: nuevoId(),
        loteId: lote.id,
        producto: f.producto.value.trim(),
        tipo: f.tipo.value,
        fecha: f.fecha.value || hoy(),
        dosis: f.dosis.value.trim(),
        notas: f.notas.value.trim()
      });
      guardar();
      location.hash = '#/lote/' + lote.id;
    });
  }

  // ---------- Pantalla: Nuevo monitoreo ----------

  var borrador = null;

  function nuevoBorrador(lote) {
    return {
      loteId: lote.id,
      cultivo: lote.cultivo,
      fecha: hoy(),
      estadio: '',
      etapa: null,
      largo: 1,
      plagas: plagasDe(lote.cultivo).map(function (u) { return { nombre: u.plaga, conteos: [0] }; }),
      malezas: [],
      notas: ''
    };
  }

  function formMonitoreo(lote) {
    if (!borrador || borrador.loteId !== lote.id) borrador = nuevoBorrador(lote);
    var b = borrador;
    var cantidad = b.plagas.length ? b.plagas[0].conteos.length : 1;

    var html =
      '<a class="volver" href="#/lote/' + lote.id + '">‹ ' + esc(lote.nombre) + '</a>' +
      '<h1>Nuevo monitoreo</h1><p class="sub">' + esc(lote.nombre) + ' · ' + esc(lote.cultivo) + '</p>' +

      '<div class="tarjeta"><div class="campos-2">' +
      '<div class="campo"><label for="m-fecha">Fecha</label><input id="m-fecha" type="date" data-campo="fecha" value="' + b.fecha + '"/></div>' +
      '<div class="campo"><label for="m-estadio">Estado del cultivo</label><input id="m-estadio" data-campo="estadio" placeholder="Ej: R5" value="' + esc(b.estadio) + '"/></div>' +
      '</div>' +
      '<label>Etapa del cultivo</label><div class="opciones" id="etapas" style="margin-bottom:14px">' +
      ETAPAS.map(function (e) {
        return '<button type="button" data-accion="etapa" data-valor="' + e.id + '" class="' + (b.etapa === e.id ? 'activo' : '') + '">' +
          e.nombre + '<small>' + e.ejemplo + '</small></button>';
      }).join('') + '</div>' +
      '<label>Tipo de paneo</label><div class="opciones">' +
      '<button type="button" data-accion="largo" data-valor="1" class="' + (b.largo === 1 ? 'activo' : '') + '">Paneo de 1 metro</button>' +
      '<button type="button" data-accion="largo" data-valor="0.5" class="' + (b.largo === 0.5 ? 'activo' : '') + '">Paneo de ½ metro</button>' +
      '</div></div>' +

      '<h2>Paneos <span class="contador">' + cantidad + '</span></h2>';

    for (var i = 0; i < cantidad; i++) {
      html += '<div class="tarjeta"><div class="paneo-cabecera"><strong>Paneo ' + (i + 1) + '</strong>' +
        (cantidad > 1 ? '<button type="button" class="btn-peligro" data-accion="quitar-paneo" data-paneo="' + i + '">Quitar</button>' : '') +
        '</div>';
      b.plagas.forEach(function (p, j) {
        html += '<div class="plaga-fila"><span>' + esc(p.nombre) + '</span><div class="stepper">' +
          '<button type="button" data-accion="restar" data-plaga="' + j + '" data-paneo="' + i + '" aria-label="Restar">−</button>' +
          '<input type="number" inputmode="numeric" min="0" data-plaga="' + j + '" data-paneo="' + i + '" value="' + p.conteos[i] + '" aria-label="' + esc(p.nombre) + ', paneo ' + (i + 1) + '"/>' +
          '<button type="button" data-accion="sumar" data-plaga="' + j + '" data-paneo="' + i + '" aria-label="Sumar">+</button>' +
          '</div></div>';
      });
      html += '</div>';
    }

    html += '<div class="fila-botones"><button type="button" class="btn-secundario" data-accion="agregar-paneo">+ Agregar paneo</button>' +
      '<button type="button" class="btn-texto" data-accion="agregar-plaga">+ Otra plaga</button></div>' +

      '<div class="resultado" id="resultado"></div>' +

      '<h2>Malezas</h2><div class="tarjeta">' +
      (b.malezas.length ? '' : '<p class="sub" style="margin:0 0 12px">Sin malezas anotadas.</p>') +
      b.malezas.map(function (mz, k) {
        return '<div class="maleza-fila"><strong>' + esc(mz.nombre) + '</strong>' +
          '<button type="button" class="btn-peligro" data-accion="quitar-maleza" data-maleza="' + k + '">Quitar</button>' +
          '<div class="opciones chico">' + NIVELES.map(function (n) {
            return '<button type="button" data-accion="nivel" data-maleza="' + k + '" data-valor="' + n + '" class="' + (mz.nivel === n ? 'activo' : '') + '">' + n + '</button>';
          }).join('') + '</div></div>';
      }).join('') +
      '<select data-accion="agregar-maleza" aria-label="Agregar maleza"><option value="">+ Agregar maleza…</option>' +
      MALEZAS.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></div>' +

      '<h2>Notas</h2><div class="tarjeta"><textarea rows="3" data-campo="notas" placeholder="Observaciones (opcional)">' + esc(b.notas) + '</textarea></div>' +

      '<div class="barra-guardar"><div><button type="button" class="btn-principal" data-accion="guardar-monitoreo">Guardar monitoreo</button></div></div>';

    app.innerHTML = html;
    actualizarResultado();
  }

  function actualizarResultado() {
    var caja = document.getElementById('resultado');
    if (!caja || !borrador) return;
    var cantidad = borrador.plagas.length ? borrador.plagas[0].conteos.length : 0;
    caja.innerHTML = '<h3>Resultado por metro lineal</h3>' +
      '<p class="nota">' + cantidad + ' paneo' + (cantidad === 1 ? '' : 's') + ' de ' + nombreLargo(borrador.largo) +
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
    datos.monitoreos.push({
      id: nuevoId(),
      loteId: b.loteId,
      cultivo: b.cultivo,
      fecha: b.fecha || hoy(),
      estadio: b.estadio.trim(),
      etapa: b.etapa,
      largo: b.largo,
      cantidadPaneos: b.plagas.length ? b.plagas[0].conteos.length : 0,
      plagas: b.plagas.map(function (p) { return { nombre: p.nombre, conteos: p.conteos.map(function (n) { return Number(n) || 0; }) }; }),
      malezas: b.malezas.slice(),
      notas: b.notas.trim()
    });
    guardar();
    borrador = null;
    location.hash = '#/lote/' + b.loteId;
  }

  // ---------- Pantalla: Ver monitoreo ----------

  function vistaMonitoreo(m) {
    var lote = buscarLote(m.loteId) || { nombre: 'Lote borrado', id: '' };
    var html =
      '<a class="volver" href="#/lote/' + lote.id + '">‹ ' + esc(lote.nombre) + '</a>' +
      '<h1>Monitoreo ' + fecha(m.fecha) + '</h1>' +
      '<p class="sub">' + (etapaDe(m) ? nombreEtapa(etapaDe(m)) + (m.estadio ? ' (' + esc(m.estadio) + ')' : '') + ' · ' : (m.estadio ? 'Estado ' + esc(m.estadio) + ' · ' : '')) + 'Paneo de ' + nombreLargo(m.largo) + ' · ' + m.cantidadPaneos + (m.cantidadPaneos === 1 ? ' paneo' : ' paneos') + '</p>' +
      '<div class="resultado"><h3>Resultado por metro lineal</h3><p class="nota">' + num(m.cantidadPaneos * m.largo) + ' m revisados</p>' +
      resultados(m).map(filaResultado).join('') + '</div>' +
      '<h2>Conteo por paneo</h2><div class="tarjeta">' +
      m.plagas.map(function (p) {
        return '<div class="plaga-fila"><span>' + esc(p.nombre) + '</span><span>' + p.conteos.join(' · ') + '</span></div>';
      }).join('') + '</div>' +
      '<h2>Malezas</h2><div class="tarjeta">' +
      (m.malezas.length ? m.malezas.map(function (mz) {
        return '<div class="plaga-fila"><span>' + esc(mz.nombre) + '</span><b>' + esc(mz.nivel) + '</b></div>';
      }).join('') : 'Sin malezas anotadas.') + '</div>' +
      (m.notas ? '<h2>Notas</h2><div class="tarjeta">' + esc(m.notas) + '</div>' : '') +
      '<div class="fila-botones"><button class="btn-peligro" data-accion="borrar-monitoreo" data-id="' + m.id + '">Borrar monitoreo</button></div>';
    app.innerHTML = html;
  }

  // ---------- Exportar ----------

  function exportarMonitoreos() {
    var filas = [['Lote', 'Cultivo', 'Fecha', 'Estado del cultivo', 'Etapa', 'Tipo de paneo', 'Paneos', 'Plaga', 'Conteos', 'Ind/m', 'Umbral', 'Semáforo', 'Malezas', 'Notas']];
    datos.monitoreos.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).forEach(function (m) {
      var lote = buscarLote(m.loteId) || { nombre: '' };
      var malezas = m.malezas.map(function (mz) { return mz.nombre + ' (' + mz.nivel + ')'; }).join(', ');
      resultados(m).forEach(function (r, i) {
        filas.push([lote.nombre, cultivoDe(m), fecha(m.fecha), m.estadio, nombreEtapa(etapaDe(m)), nombreLargo(m.largo), m.cantidadPaneos,
          r.nombre, m.plagas[i].conteos.join(' '), num(r.valor), r.umbral ? num(r.umbral) : '', r.estado ? ESTADOS[r.estado] : '', malezas, m.notas]);
      });
    });
    descargarCsv(filas, 'monitoreos');
  }

  function exportarAplicaciones() {
    var filas = [['Lote', 'Cultivo', 'Fecha', 'Producto', 'Tipo', 'Dosis', 'Notas']];
    datos.aplicaciones.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).forEach(function (a) {
      var lote = buscarLote(a.loteId) || { nombre: '', cultivo: '' };
      filas.push([lote.nombre, lote.cultivo, fecha(a.fecha), a.producto, a.tipo, a.dosis, a.notas]);
    });
    descargarCsv(filas, 'productos-aplicados');
  }

  function descargarCsv(filas, nombre) {
    var csv = filas.map(function (f) {
      return f.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';');
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
    if (accion === 'exportar-aplicaciones') return exportarAplicaciones();

    if (accion === 'borrar-lote') {
      var l = buscarLote(el.dataset.id);
      if (!confirm('¿Borrar "' + l.nombre + '" con todos sus monitoreos y productos aplicados?')) return;
      datos.lotes = datos.lotes.filter(function (x) { return x.id !== l.id; });
      datos.monitoreos = datos.monitoreos.filter(function (x) { return x.loteId !== l.id; });
      datos.aplicaciones = datos.aplicaciones.filter(function (x) { return x.loteId !== l.id; });
      guardar();
      location.hash = '#/';
      return;
    }

    if (accion === 'borrar-aplicacion') {
      var ap = datos.aplicaciones.find(function (x) { return x.id === el.dataset.id; });
      if (!confirm('¿Borrar "' + ap.producto + '" del ' + fecha(ap.fecha) + '?')) return;
      datos.aplicaciones = datos.aplicaciones.filter(function (x) { return x.id !== ap.id; });
      guardar();
      vistaLote(buscarLote(ap.loteId));
      return;
    }

    if (accion === 'agregar-plaga-umbral') {
      var plaga = (prompt('Nombre de la plaga') || '').trim();
      if (!plaga) return;
      plagasDe(el.dataset.cultivo).push(sinUmbral(plaga));
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'quitar-plaga-umbral') {
      var lista = plagasDe(el.dataset.cultivo);
      var u = lista[Number(el.dataset.indice)];
      if (!confirm('¿Quitar "' + u.plaga + '" de ' + el.dataset.cultivo + '? Los monitoreos ya guardados no cambian.')) return;
      lista.splice(Number(el.dataset.indice), 1);
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'restablecer-umbrales') {
      if (!confirm('¿Volver todos los umbrales y plagas a los valores iniciales?')) return;
      datos.umbrales = umbralesIniciales();
      guardar();
      vistaUmbrales();
      return;
    }

    if (accion === 'borrar-monitoreo') {
      var m = buscarMonitoreo(el.dataset.id);
      if (!confirm('¿Borrar este monitoreo?')) return;
      datos.monitoreos = datos.monitoreos.filter(function (x) { return x.id !== m.id; });
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
      var cantidad = b.plagas.length ? b.plagas[0].conteos.length : 1;
      b.plagas.push({ nombre: nombre, conteos: new Array(cantidad).fill(0) });
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

  // ---------- Rutas ----------

  function router() {
    var partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var lote, m;
    window.scrollTo(0, 0);

    if (partes[0] === 'umbrales') return vistaUmbrales();
    if (partes[0] === 'lote' && partes[1] === 'nuevo') return formLote(null);
    if (partes[0] === 'lote' && (lote = buscarLote(partes[1]))) {
      if (partes[2] === 'editar') return formLote(lote);
      if (partes[2] === 'monitoreo') return formMonitoreo(lote);
      if (partes[2] === 'aplicacion') return formAplicacion(lote);
      return vistaLote(lote);
    }
    if (partes[0] === 'monitoreo' && (m = buscarMonitoreo(partes[1]))) return vistaMonitoreo(m);
    vistaLotes();
  }

  window.addEventListener('hashchange', router);
  router();
})();
