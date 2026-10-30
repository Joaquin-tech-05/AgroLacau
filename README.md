# AgroLacau – Monitoreo agrícola

App simple para anotar monitoreos de lotes.

- **Campañas** (2025/26, 2026/27…): se eligen arriba a la derecha. Cada lote tiene un cultivo por campaña
  y los monitoreos y productos se ven por campaña.
- **Lotes** agrupados por cultivo, con variedad o híbrido por campaña y resumen de la campaña (lotes, hectáreas, monitoreos, alertas, productos).
- **Monitoreos** por lote: quién monitoreó, paneo de **1 metro** o de **½ metro**, conteo de plagas por paneo
  y resultado automático en **individuos por metro lineal**
  (total contado ÷ (cantidad de paneos × largo del paño)). Se pueden editar después de guardados.
- **Umbrales de daño** por cultivo, plaga y etapa del cultivo (vegetativo / reproductivo), editables.
  La etapa se elige en cada monitoreo (o se detecta sola al escribir "V6", "R5"…). Semáforo: rojo desde el umbral,
  amarillo desde la mitad, verde por debajo. Los lotes que superan el umbral aparecen arriba de todo.
- **Productos aplicados** por lote: producto, tipo, fecha, dosis y notas (editables).
- **Compartir por WhatsApp**: arma un mensaje con el resultado del monitoreo y los productos aplicados
  en los últimos 30 días.
- **Mapa y gráficos**:
  - Mapa satelital con los lotes dibujados (tocando las esquinas o caminando el borde con el GPS),
    pintados según el semáforo. El GPS muestra dónde estás, en qué lote entraste, el lote más cercano
    y guía hasta un lote (distancia y dirección; funciona sin señal). También abre Google Maps.
  - Gráfico de evolución de plagas por lote con las líneas de umbral (cada plaga y los umbrales se
    muestran u ocultan) y resumen de la campaña (estado de los lotes, productos por tipo, hectáreas por cultivo).
- Malezas con nivel (Baja / Media / Alta) y notas.
- Descarga de monitoreos y de productos aplicados en CSV (se abre con Excel).

Los datos se guardan en cada teléfono y, con la **clave del equipo**, se comparten entre todos los teléfonos.

## Datos compartidos del equipo

- Cada teléfono guarda todo localmente (funciona sin señal) y, cuando hay conexión, sincroniza con
  `/api/datos`: una función de Netlify (`netlify/functions/datos.mjs`) que guarda los datos en **Netlify Blobs**.
- Por cada lote, monitoreo o producto gana la versión modificada más recientemente; lo borrado queda borrado
  (`public/combinar.js`, usado por la app y por el servidor).
- El acceso se protege con una clave compartida: variable de entorno **`AGROLACAU_CLAVE`** en Netlify
  (Project configuration → Environment variables). Después de crearla o cambiarla hay que volver a publicar.
- En local, `npm start` incluye una versión en memoria de `/api/datos` con la clave `local`
  (o la que indique `AGROLACAU_CLAVE`).

## Uso sin señal

La app es instalable (PWA): después de abrirla una vez con internet, `public/sw.js` la guarda en el teléfono
y funciona sin señal. Con señal siempre busca la versión nueva de los archivos.
Si se agregan archivos nuevos que la app necesita sin señal, sumarlos a `ARCHIVOS_APP` en `public/sw.js`
y subir `VERSION`.

## Ejecutar en local

Requiere Node.js. No hace falta `npm install` para usarla en local (solo Netlify usa `@netlify/blobs`).

```bash
npm start
```

Abrir http://localhost:3000.

## Estructura

- `public/index.html`, `public/styles.css`, `public/app.js` – la app
- `public/vendor/` – Leaflet 1.9.4 (mapa) y Chart.js 4.4.7 (gráficos), incluidos para que anden sin señal
- `public/img/` – logo e íconos (generados a partir de `design/logo-original.png`)
- `public/combinar.js` – cómo se combinan los datos de dos teléfonos
- `netlify/functions/datos.mjs`, `servidor/sincronizacion.mjs` – servidor de datos compartidos
- `server.js` – servidor para uso local

## Mapa

La imagen satelital es de Esri (World Imagery) y los caminos y nombres de Esri Reference. Las partes del mapa
que se miran con señal quedan guardadas en el teléfono (hasta unas 4000 imágenes) para verlas sin señal.

## Publicar en Netlify

`netlify.toml` indica que se publique la carpeta `public/` (no hay paso de build).
En Netlify: **Add new site → Import an existing project → GitHub →** elegir `Joaquin-tech-05/AgroLacau`
y la rama a publicar. Cada push a esa rama vuelve a publicar el sitio.
