# Reporte de Análisis — Marmolería Software (Prueba)

Análisis estático del código (sin abrir navegador ni ejecutar la app). Fecha: 2026-10-10.

## 1. Resumen

Sistema administrativo para marmolería ("Marmolería Benjamín"): clientes, presupuestos por m², obras, stock, proveedores, facturas, pagos/cobros, calendario y exportación a PDF/Word. Es una SPA en JS vanilla (ES modules) con backend serverless en Cloudflare Worker + R2.

| Aspecto | Detalle |
|---|---|
| Frontend | HTML + CSS + JS vanilla, ~26.7k líneas en total (incl. tests/CSS) |
| Backend | Cloudflare Worker (`worker/src`), 12 rutas REST, persistencia en JSON sobre R2 |
| Hosting | Vercel / Cloudflare Pages (frontend), Worker para API |
| Dev local | `server.js` (Node) sirve `frontend/` y monta el handler del worker |
| Tests | 10 scripts `.mjs` en `tests/` con jsdom (E2E/funcionales), sin runner ni script en `package.json` |
| Dependencias | Solo `jsdom` (dev) |

### Archivos más grandes (deuda de mantenibilidad)
- `pages/presupuestos.js` (2466 líneas), `pages/pasoAPaso.js` (1886), `services/documentExporter.js` (1137), `pages/calendario.js` (936), `pages/stock.js` (904), `pages/obras.js` (817), `services/mockData.js` (804).

## 2. Arquitectura

```
Navegador (SPA) ── DataService (memoria + localStorage, optimista)
      │                       │ Api.get/post/put/delete
      ▼                       ▼
 Frontend estático     Worker /api/* ──► StorageService ──► R2 (data/*.json, backups/auto, uploads)
```

- **Arranque:** `GET /api/sync` trae las 11 colecciones; si falla, usa `localStorage`.
- **Escrituras:** se actualiza memoria/localStorage de inmediato y la API se llama en segundo plano (`.catch` solo loguea).
- **Escritura atómica:** `StorageService.writeJSON` crea backup previo en `backups/auto/` y luego sobrescribe el JSON completo de la colección.

## 3. Hallazgos

### 🔴 Críticos (seguridad)

1. **La API del Worker no tiene autenticación.** `worker/src/index.js` no valida ningún token; el `Authorization: Bearer` que envía `api.js` nunca se verifica (y tampoco se genera: el login no guarda token). Cualquiera con la URL del Worker (hardcodeada en `api.js`) puede leer, modificar o borrar todos los datos (`/api/sync`, `/api/backups`, `/api/backups/restore`, `DELETE`).
2. **Login solo del lado cliente.** `auth.js` compara un hash DJB2 de 32 bits contra una constante en el código fuente. Es trivialmente reversible/colisionable y se puede evadir seteando `sessionStorage.mb_auth = 'true'` desde la consola. Además, el comentario junto al hash revela la contraseña en texto plano (`leilabenjamin`).
3. **CORS abierto y reflejado.** `corsHeaders` devuelve el `Origin` recibido (o `*`), permitiendo que cualquier sitio consuma la API.
4. **Endpoint de restore sin validación.** `POST /api/backups/restore` escribe lo que reciba en las colecciones (sin esquema ni límites): un solo request puede sobrescribir toda la base.
5. **Cuenta de Cloudflare expuesta:** `account_id` en `wrangler.toml` y dominio del worker en el frontend (no es secreto per se, pero facilita el ataque del punto 1).

### 🟠 Altos

6. **Race conditions / pérdida de datos en R2.** Cada create/update lee la colección completa, modifica y reescribe el JSON entero. Dos usuarios (o dos pestañas) escribiendo a la vez provocan *last-write-wins* y pérdida silenciosa de registros. No hay versionado ni ETag/If-Match.
7. **Escrituras optimistas sin reconciliación.** En `mockData.js` los fallos de la API solo se loguean (`.catch`): el usuario ve el cambio guardado aunque el servidor lo haya rechazado; al siguiente `syncAll` el dato puede desaparecer o sobrescribirse. No hay cola de reintentos ni indicador de "no sincronizado".
8. **Backups automáticos sin retención.** `backups/auto/` crea un archivo por cada escritura y nunca se purga → crecimiento ilimitado de R2.
9. **Uploads sin controles.** `uploads.js` acepta cualquier tipo/tamaño de archivo, usa el `folder` del cliente en la key (posible path arbitrario como `../`) y sirve los archivos con `Cache-Control: public, max-age=31536000` y el `content-type` declarado por el cliente (riesgo de XSS almacenado si se sube HTML/SVG).
10. **XSS potencial en el frontend.** Hay ~80 usos de `innerHTML` en 18 archivos; existe `escapeHtml` (usada 348 veces), pero hace falta auditar que se aplique a todos los datos de usuario (nombres de clientes, descripciones, notas). Los datos persisten en el servidor sin autenticación, lo que agrava el riesgo.

### 🟡 Medios

11. **IDs predecibles:** `generateId` usa `Date.now()` + `Math.random()`; sin riesgo de colisión práctico pero débiles si se usan como control de acceso.
12. **`presupuestos.js` y `pasoAPaso.js` monolíticos** (2.4k y 1.9k líneas) mezclando render, estado, cálculo y validación: difícil de testear y propenso a regresiones (los commits recientes son mayormente `fix:`).
13. **Lógica de negocio en el cliente:** cálculos de m², totales, recalculo de facturas (`recalcularTodasLasFacturas()` se ejecuta al cargar el módulo) y automatización de stock dependen de que el cliente sea correcto; el servidor no valida montos.
14. **Normalización ad hoc en `getSyncData`:** reemplaza "Quarzo/Cuarzo" por "Purastone" y la categoría `cuarzo` por `purastone` en cada lectura, en vez de migrar los datos una vez.
15. **Datos locales sensibles en `localStorage`** (clientes, precios, CUIT) sin cifrado; en equipos compartidos persisten tras el logout (el logout solo limpia `sessionStorage`).
16. **Archivos sueltos en la raíz:** `test.js`, `test2.js`, `worker/test_api.js` parecen scripts temporales.

### 🟢 Bajos

17. Tests sin script `npm test` ni CI; los scripts `.mjs` dependen de un servidor corriendo (no verificado en este análisis).
18. `README.md` desactualizado respecto a la arquitectura real (menciona solo Vercel; no cubre Worker/R2, ni cómo correr tests; `docs/ARQUITECTURA_Y_FASES.md` sí lo documenta).
19. `.gitignore` incluye `*.log`, `node_modules`, etc. (correcto), pero `node_modules/` está presente en el workspace: verificar que no esté versionado.
20. 10 `TODO/FIXME` pendientes en frontend/worker.

## 4. Puntos fuertes

- Documentación de arquitectura clara (`docs/ARQUITECTURA_Y_FASES.md`).
- Arranque rápido con caché local y fallback offline.
- Backup previo a cada escritura y endpoint de exportación/restauración.
- Amplia cobertura funcional (presupuestos, obras, cobros, pagos NC/ND, stock automático, exportación PDF/Word).
- Suite de tests jsdom extensa (10 archivos, ~3.800 líneas) cubriendo flujos críticos.
- Diseño mobile-first con navegación inferior y componentes reutilizables (`modal`, `drawer`, `toast`).
- Uso consistente de `escapeHtml` en gran parte de las vistas.

## 5. Recomendaciones priorizadas

| Prioridad | Acción |
|---|---|
| 1 | Agregar autenticación real en el Worker (login → token firmado/JWT o Cloudflare Access) y exigirla en todas las rutas, en especial `/sync`, `/backups`, `DELETE`. |
| 2 | Eliminar el comentario con la contraseña, cambiar la contraseña actual y no usar hash cliente como mecanismo de seguridad. |
| 3 | Restringir CORS a los dominios propios (lista blanca). |
| 4 | Validar `folder`, tipo MIME y tamaño en uploads; servir con `Content-Disposition`/`X-Content-Type-Options: nosniff`. |
| 5 | Control de concurrencia (ETag / `If-Match` en R2, o migrar a D1/Durable Objects por colección). |
| 6 | Cola de reintentos + indicador de estado de sincronización en la UI. |
| 7 | Política de retención de `backups/auto/` (p. ej., últimos N o TTL con lifecycle de R2). |
| 8 | Auditar `innerHTML` contra `escapeHtml` en todas las vistas. |
| 9 | Dividir `presupuestos.js`/`pasoAPaso.js` en módulos (estado, cálculo, render) y agregar `npm test` + CI. |
| 10 | Limpiar scripts temporales y actualizar el README. |

## 6. Alcance y limitaciones

Análisis basado en lectura de código; no se ejecutó la aplicación ni los tests, y no se auditó exhaustivamente cada uno de los archivos de páginas (solo estructura, núcleo de servicios, Worker y configuración). Los hallazgos de seguridad sobre `innerHTML` requieren verificación puntual.
