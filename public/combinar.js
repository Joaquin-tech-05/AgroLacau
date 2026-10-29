// Combina dos copias de los datos (la del teléfono y la del servidor).
// Por cada lote, monitoreo o producto gana la versión modificada más recientemente;
// lo que se borró en cualquier lado queda borrado. Lo usan la app y el servidor.
(function (raiz) {
  var COLECCIONES = ['lotes', 'monitoreos', 'aplicaciones'];

  function combinar(a, b) {
    a = a || {};
    b = b || {};
    var resultado = { borrados: {} };

    COLECCIONES.forEach(function (col) {
      var borrados = Object.assign({}, (a.borrados || {})[col]);
      var otros = (b.borrados || {})[col] || {};
      Object.keys(otros).forEach(function (id) { borrados[id] = Math.max(borrados[id] || 0, otros[id]); });
      resultado.borrados[col] = borrados;

      var porId = {};
      (a[col] || []).concat(b[col] || []).forEach(function (r) {
        if (!r || !r.id || borrados[r.id]) return;
        var previo = porId[r.id];
        if (!previo || (r.actualizado || 0) > (previo.actualizado || 0)) porId[r.id] = r;
      });
      resultado[col] = Object.keys(porId).map(function (id) { return porId[id]; });
    });

    var ua = a.umbralesActualizado || 0;
    var ub = b.umbralesActualizado || 0;
    resultado.umbrales = (!a.umbrales || ub > ua) && b.umbrales ? b.umbrales : a.umbrales;
    resultado.umbralesActualizado = Math.max(ua, ub);
    return resultado;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = combinar;
  else raiz.combinarDatos = combinar;
})(this);
