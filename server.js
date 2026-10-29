// Servidor local mínimo, sin dependencias: node server.js
// Sirve la app y una versión en memoria de /api/datos (los datos compartidos se pierden al cerrarlo).
// La clave del equipo local es AGROLACAU_CLAVE o, si no está definida, "local".
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');
const CLAVE = process.env.AGROLACAU_CLAVE || 'local';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// Imita lo que usa la app de Netlify Blobs (get, getWithMetadata y setJSON condicional).
function storeEnMemoria() {
  const datos = new Map();
  let version = 0;
  return {
    async get(clave) { return datos.has(clave) ? JSON.parse(datos.get(clave).json) : null; },
    async getWithMetadata(clave) {
      if (!datos.has(clave)) return null;
      const d = datos.get(clave);
      return { data: JSON.parse(d.json), etag: d.etag };
    },
    async setJSON(clave, valor, opciones = {}) {
      const actual = datos.get(clave);
      if (opciones.onlyIfNew && actual) return { modified: false };
      if (opciones.onlyIfMatch && (!actual || actual.etag !== opciones.onlyIfMatch)) return { modified: false };
      datos.set(clave, { json: JSON.stringify(valor), etag: String(++version) });
      return { modified: true };
    }
  };
}

const store = storeEnMemoria();
const sincronizacion = import('./servidor/sincronizacion.mjs');

async function api(req, res) {
  const cuerpo = [];
  for await (const parte of req) cuerpo.push(parte);
  const request = new Request('http://localhost' + req.url, {
    method: req.method,
    headers: req.headers,
    body: cuerpo.length ? Buffer.concat(cuerpo) : undefined
  });
  const { manejar } = await sincronizacion;
  const respuesta = await manejar(request, store, CLAVE);
  res.writeHead(respuesta.status, Object.fromEntries(respuesta.headers));
  res.end(await respuesta.text());
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/api/datos') {
    return api(req, res).catch((e) => {
      res.writeHead(500);
      res.end(String(e));
    });
  }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`AgroLacau corriendo en http://localhost:${PORT} (clave del equipo: ${CLAVE})`);
});
