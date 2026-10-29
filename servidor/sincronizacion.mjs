// Lógica del servidor de datos compartidos. La usan la función de Netlify y el servidor local.
// GET  /api/datos → devuelve los datos del equipo.
// POST /api/datos → recibe los datos de un teléfono, los combina con los guardados y devuelve el resultado.
import combinar from '../public/combinar.js';

var CLAVE_BLOB = 'datos';
var INTENTOS = 5;

// La clave no distingue mayúsculas ni espacios al principio o al final (el teclado del celular
// suele poner la primera letra en mayúscula). Llega codificada para admitir ñ y tildes.
function normalizarClave(clave) {
  try { clave = decodeURIComponent(clave || ''); } catch (e) { /* ya venía sin codificar */ }
  return clave.trim().toLowerCase();
}

function respuesta(estado, cuerpo) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function manejar(req, store, claveEquipo) {
  if (!claveEquipo || !normalizarClave(claveEquipo)) {
    return respuesta(500, { error: 'Falta configurar la variable AGROLACAU_CLAVE en Netlify.' });
  }
  if (normalizarClave(req.headers.get('x-clave')) !== normalizarClave(claveEquipo)) {
    return respuesta(401, { error: 'Clave incorrecta.' });
  }

  if (req.method === 'GET') {
    var guardado = await store.get(CLAVE_BLOB, { type: 'json' });
    return respuesta(200, guardado || {});
  }

  if (req.method === 'POST') {
    var recibido;
    try { recibido = await req.json(); } catch (e) { return respuesta(400, { error: 'Datos inválidos.' }); }

    // Escritura condicional: si otro teléfono guardó justo en el medio, se vuelve a combinar.
    for (var i = 0; i < INTENTOS; i++) {
      var actual = await store.getWithMetadata(CLAVE_BLOB, { type: 'json' });
      var combinado = combinar(actual && actual.data, recibido);
      var escritura = actual
        ? await store.setJSON(CLAVE_BLOB, combinado, { onlyIfMatch: actual.etag })
        : await store.setJSON(CLAVE_BLOB, combinado, { onlyIfNew: true });
      if (escritura.modified) return respuesta(200, combinado);
    }
    return respuesta(409, { error: 'Muchos cambios al mismo tiempo, se reintenta en un momento.' });
  }

  return respuesta(405, { error: 'Método no permitido.' });
}
