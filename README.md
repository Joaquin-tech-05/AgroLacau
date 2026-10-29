# AgroLacau – Monitoreo agrícola

App simple para anotar monitoreos de lotes.

- **Campañas** (2025/26, 2026/27…): se eligen arriba a la derecha. Cada lote tiene un cultivo por campaña
  y los monitoreos y productos se ven por campaña.
- **Lotes** agrupados por cultivo, con resumen de la campaña (lotes, hectáreas, monitoreos, alertas, productos).
- **Monitoreos** por lote: quién monitoreó, paneo de **1 metro** o de **½ metro**, conteo de plagas por paneo
  y resultado automático en **individuos por metro lineal**
  (total contado ÷ (cantidad de paneos × largo del paño)). Se pueden editar después de guardados.
- **Umbrales de daño** por cultivo, plaga y etapa del cultivo (vegetativo / reproductivo), editables.
  La etapa se elige en cada monitoreo (o se detecta sola al escribir "V6", "R5"…). Semáforo: rojo desde el umbral,
  amarillo desde la mitad, verde por debajo. Los lotes que superan el umbral aparecen arriba de todo.
- **Productos aplicados** por lote: producto, tipo, fecha, dosis y notas (editables).
- **Compartir por WhatsApp**: arma un mensaje con el resultado del monitoreo y los productos aplicados
  en los últimos 30 días.
- Malezas con nivel (Baja / Media / Alta) y notas.
- Descarga de monitoreos y de productos aplicados en CSV (se abre con Excel).

Los datos se guardan en el navegador del dispositivo (no hay servidor de datos todavía).

## Uso sin señal

La app es instalable (PWA): después de abrirla una vez con internet, `public/sw.js` la guarda en el teléfono
y funciona sin señal. Con señal siempre busca la versión nueva de los archivos.
Si se agregan archivos nuevos que la app necesita sin señal, sumarlos a `ARCHIVOS_APP` en `public/sw.js`
y subir `VERSION`.

## Ejecutar en local

Requiere Node.js (sin dependencias extra).

```bash
npm start
```

Abrir http://localhost:3000.

## Estructura

- `public/index.html`, `public/styles.css`, `public/app.js` – la app
- `public/img/` – logo e íconos (generados a partir de `design/logo-original.png`)
- `server.js` – servidor estático para uso local

## Publicar en Netlify

`netlify.toml` indica que se publique la carpeta `public/` (no hay paso de build).
En Netlify: **Add new site → Import an existing project → GitHub →** elegir `Joaquin-tech-05/AgroLacau`
y la rama a publicar. Cada push a esa rama vuelve a publicar el sitio.
