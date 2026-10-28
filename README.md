# AgroLacau – Monitoreo agrícola

App simple para anotar monitoreos de lotes.

- **Lotes** agrupados por cultivo (Soja 1ra, Soja 2da, Maíz, Girasol, Trigo, Otro).
- **Nuevo monitoreo** por lote: paneo de **1 metro** o de **½ metro**, conteo de plagas por paneo
  y resultado automático en **individuos por metro lineal**
  (total contado ÷ (cantidad de paneos × largo del paño)).
- **Umbrales de daño** por cultivo y plaga (editables). Semáforo: rojo desde el umbral,
  amarillo desde la mitad, verde por debajo. Los lotes que superan el umbral aparecen arriba de todo.
- **Productos aplicados** por lote: producto, tipo, fecha, dosis y notas.
- Malezas con nivel (Baja / Media / Alta) y notas.
- Descarga de monitoreos y de productos aplicados en CSV (se abre con Excel).

Los datos se guardan en el navegador del dispositivo (no hay servidor de datos todavía).

## Ejecutar en local

Requiere Node.js (sin dependencias extra).

```bash
npm start
```

Abrir http://localhost:3000.

## Estructura

- `public/index.html`, `public/styles.css`, `public/app.js` – la app
- `design/capturas/` – capturas del diseño original de Stitch (referencia)
- `server.js` – servidor estático para uso local

## Publicar en Netlify

`netlify.toml` indica que se publique la carpeta `public/` (no hay paso de build).
En Netlify: **Add new site → Import an existing project → GitHub →** elegir `Joaquin-tech-05/AgroLacau`
y la rama a publicar. Cada push a esa rama vuelve a publicar el sitio.
