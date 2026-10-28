# AgroLacau – Monitoreo agrícola

Front end generado a partir del diseño de Stitch.

## Ejecutar en local

Requiere Node.js (sin dependencias extra).

```bash
npm start
```

Abrir http://localhost:3000. La app muestra la pantalla de carga y pasa al inicio;
elige la versión de escritorio o móvil según el ancho de la ventana.
Índice de todas las pantallas: http://localhost:3000/pantallas.html

## Estructura

- `public/escritorio/`, `public/movil/` – pantallas del diseño
- `public/app.js` – navegación entre pantallas
- `design/capturas/` – capturas de referencia del diseño
- `server.js` – servidor estático

## Publicar en Netlify

El archivo `netlify.toml` ya indica que se publique la carpeta `public/` (no hay paso de build).
En Netlify: **Add new site → Import an existing project → GitHub →** elegir `Joaquin-tech-05/AgroLacau`
y la rama a publicar. Cada push a esa rama vuelve a publicar el sitio.
