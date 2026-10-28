// AgroLacau – app simple de monitoreo.
// Pantallas: Lotes (agrupados por cultivo) → Lote → Nuevo monitoreo (paneos de 1 m o ½ m).
// Los datos se guardan en el navegador (localStorage).
(function () {
  var CULTIVOS = ['Soja 1ra', 'Soja 2da', 'Maíz', 'Girasol', 'Trigo', 'Otro'];

  var PLAGAS_POR_CULTIVO = {
    'Soja 1ra': ['Chinches', 'Orugas defoliadoras', 'Isoca bolillera'],
    'Soja 2da': ['Chinches', 'Orugas defoliadoras', 'Isoca bolillera'],
    'Maíz': ['Cogollero', 'Chinches'],
    'Girasol': ['Orugas defoliadoras', 'Chinches'],
    'Trigo': ['Pulgones', 'Orugas'],
    'Otro': ['Chinches', 'Orugas']
  };

  var MALEZAS = ['Rama negra', 'Yuyo colorado', 'Sorgo de Alepo', 'Capín', 'Pata de ganso', 'Gramón', 'Otra'];
  var NIVELES = ['Baja', 'Media', 'Alta'];

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

  function cargar() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (guardado && guardado.lotes) return guardado;
    } catch (e) { /* sin acceso a localStorage: se usan datos de ejemplo */ }
    return datosIniciales();
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

  // ---------- Cálculos ----------

  // Individuos por metro lineal = total contado / (cantidad de paneos × largo del paño)
  function porMetro(plaga, monitoreo) {
    var total = plaga.conteos.reduce(function (s, n) { return s + (Number(n) || 0); }, 0);
    var metros = plaga.conteos.length * monitoreo.largo;
    return metros ? total / metros : 0;
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
    var partes = m.plagas
      .map(function (p) { return { nombre: p.nombre, valor: porMetro(p, m) }; })
      .filter(function (p) { return p.valor > 0; })
      .map(function (p) { return p.nombre + ' ' + num(p.valor) + ' ind/m'; });
    return partes.length ? partes.join(' · ') : 'Sin plagas';
  }

  // ---------- Pantalla: Lotes ----------

  function vistaLotes() {
    var html = '<h1>Lotes</h1><p class="sub">Ordenados por cultivo</p>' +
      '<div class="fila-botones"><a class="btn btn-secundario" href="#/lote/nuevo">+ Agregar lote</a></div>';

    CULTIVOS.forEach(function (cultivo) {
      var lotes = datos.lotes
        .filter(function (l) { return l.cultivo === cultivo; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
      if (!lotes.length) return;

      html += '<h2>' + esc(cultivo) + ' <span class="contador">' + lotes.length + '</span></h2><div class="lista">';
      lotes.forEach(function (l) {
        var ultimo = monitoreosDe(l.id)[0];
        var detalle = l.ha + ' ha · ' + (ultimo ? 'Último: ' + fecha(ultimo.fecha) + ' – ' + resumenPlagas(ultimo) : 'Sin monitoreos');
        html += '<a class="item" href="#/lote/' + l.id + '"><div><div class="item-titulo">' + esc(l.nombre) +
          '</div><div class="item-detalle">' + esc(detalle) + '</div></div><span class="flecha">›</span></a>';
      });
      html += '</div>';
    });

    if (!datos.lotes.length) html += '<p class="vacio">Todavía no hay lotes. Agregá el primero.</p>';

    html += '<div class="pie"><button class="btn-texto" data-accion="exportar">Descargar monitoreos (Excel / CSV)</button></div>';
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
    var html =
      '<a class="volver" href="#/">‹ Lotes</a>' +
      '<h1>' + esc(lote.nombre) + '</h1>' +
      '<p class="sub">' + esc(lote.cultivo) + ' · ' + lote.ha + ' ha</p>' +
      '<a class="btn btn-principal" href="#/lote/' + lote.id + '/monitoreo">+ Nuevo monitoreo</a>' +
      '<h2>Monitoreos <span class="contador">' + monitoreos.length + '</span></h2>';

    if (monitoreos.length) {
      html += '<div class="lista">' + monitoreos.map(function (m) {
        return '<a class="item" href="#/monitoreo/' + m.id + '"><div><div class="item-titulo">' + fecha(m.fecha) +
          (m.estadio ? ' · ' + esc(m.estadio) : '') + '</div><div class="item-detalle">' +
          esc(resumenPlagas(m)) + '</div><div class="item-detalle">Paneo de ' + nombreLargo(m.largo) + ' · ' +
          m.cantidadPaneos + ' paneos</div></div><span class="flecha">›</span></a>';
      }).join('') + '</div>';
    } else {
      html += '<p class="vacio">Sin monitoreos todavía.</p>';
    }

    html += '<div class="fila-botones" style="margin-top:24px">' +
      '<a class="btn btn-texto" href="#/lote/' + lote.id + '/editar">Editar lote</a>' +
      '<button class="btn-peligro" data-accion="borrar-lote" data-id="' + lote.id + '">Borrar lote</button></div>';
    app.innerHTML = html;
  }

  // ---------- Pantalla: Nuevo monitoreo ----------

  var borrador = null;

  function nuevoBorrador(lote) {
    var plagas = PLAGAS_POR_CULTIVO[lote.cultivo] || PLAGAS_POR_CULTIVO.Otro;
    return {
      loteId: lote.id,
      fecha: hoy(),
      estadio: '',
      largo: 1,
      plagas: plagas.map(function (nombre) { return { nombre: nombre, conteos: [0] }; }),
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
      borrador.plagas.map(function (p) {
        return '<div class="resultado-fila"><span>' + esc(p.nombre) + '</span><b>' + num(porMetro(p, borrador)) + ' ind/m</b></div>';
      }).join('');
  }

  function guardarMonitoreo() {
    var b = borrador;
    datos.monitoreos.push({
      id: nuevoId(),
      loteId: b.loteId,
      fecha: b.fecha || hoy(),
      estadio: b.estadio.trim(),
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
      '<p class="sub">' + (m.estadio ? 'Estado ' + esc(m.estadio) + ' · ' : '') + 'Paneo de ' + nombreLargo(m.largo) + ' · ' + m.cantidadPaneos + ' paneos</p>' +
      '<div class="resultado"><h3>Resultado por metro lineal</h3><p class="nota">' + num(m.cantidadPaneos * m.largo) + ' m revisados</p>' +
      m.plagas.map(function (p) {
        return '<div class="resultado-fila"><span>' + esc(p.nombre) + '</span><b>' + num(porMetro(p, m)) + ' ind/m</b></div>';
      }).join('') + '</div>' +
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

  function exportarCsv() {
    var filas = [['Lote', 'Cultivo', 'Fecha', 'Estado', 'Tipo de paneo', 'Paneos', 'Plaga', 'Conteos', 'Ind/m', 'Malezas', 'Notas']];
    datos.monitoreos.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).forEach(function (m) {
      var lote = buscarLote(m.loteId) || { nombre: '', cultivo: '' };
      var malezas = m.malezas.map(function (mz) { return mz.nombre + ' (' + mz.nivel + ')'; }).join(', ');
      m.plagas.forEach(function (p) {
        filas.push([lote.nombre, lote.cultivo, fecha(m.fecha), m.estadio, nombreLargo(m.largo), m.cantidadPaneos,
          p.nombre, p.conteos.join(' '), num(porMetro(p, m)), malezas, m.notas]);
      });
    });
    var csv = filas.map(function (f) {
      return f.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'monitoreos-agrolacau-' + hoy() + '.csv';
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

    if (accion === 'exportar') return exportarCsv();

    if (accion === 'borrar-lote') {
      var l = buscarLote(el.dataset.id);
      if (!confirm('¿Borrar "' + l.nombre + '" y todos sus monitoreos?')) return;
      datos.lotes = datos.lotes.filter(function (x) { return x.id !== l.id; });
      datos.monitoreos = datos.monitoreos.filter(function (x) { return x.loteId !== l.id; });
      guardar();
      location.hash = '#/';
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
    if (!borrador) return;
    if (el.dataset.campo) {
      borrador[el.dataset.campo] = el.value;
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

    if (partes[0] === 'lote' && partes[1] === 'nuevo') return formLote(null);
    if (partes[0] === 'lote' && (lote = buscarLote(partes[1]))) {
      if (partes[2] === 'editar') return formLote(lote);
      if (partes[2] === 'monitoreo') return formMonitoreo(lote);
      return vistaLote(lote);
    }
    if (partes[0] === 'monitoreo' && (m = buscarMonitoreo(partes[1]))) return vistaMonitoreo(m);
    vistaLotes();
  }

  window.addEventListener('hashchange', router);
  router();
})();
