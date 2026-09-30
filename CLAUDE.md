# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

"TaxPortal DIAN": portal web (PWA) para gestionar la declaración de renta de personas naturales en Colombia (Formulario 210), con dos roles: **contribuyente** (`client`) y **contador** (`admin`). La UI, los textos y los comentarios del código están en español.

Es un sitio 100 % estático: HTML + CSS + JavaScript vanilla con ES modules. No hay `package.json`, bundler, dependencias, linter ni tests. No hay backend: todos los datos viven en el navegador.

## Comandos

```bash
python3 server.py          # servidor local sin caché en http://localhost:8000
```

Los ES modules necesitan servirse por HTTP (no funcionan abriendo `index.html` con `file://`). El despliegue es en Vercel como sitio estático (`vercel.json`, `cleanUrls`).

## Arquitectura

**Punto de entrada:** `index.html` solo tiene el esqueleto (navbar, `#main-app-content`, `#app-modal-overlay`/`#app-modal-box`, `#app-toast-container`) y carga `js/app.js` como módulo. Todas las vistas se generan con template strings asignados a `innerHTML` y listeners añadidos después con `container.querySelector(...)`. Tras cualquier cambio de estado se vuelve a llamar a `renderApp()` (o al render del portal) para repintar.

**Enrutamiento por rol** (`js/app.js` → `renderApp()`): sin sesión → vista de login/registro; `role === 'admin'` → `renderAdminPortal` (`js/admin.js`); en otro caso → `renderClientPortal` (`js/client.js`). No hay router por URL. `app.js` también maneja el cierre de sesión por inactividad (5 min), el instalador PWA y `showToast`.

**Globales en `window`:** como parte del HTML generado usa `onclick="..."` en línea, `app.js` expone `window.renderApp`, `window.showToast`, `window.showUploadModalForUser` y `window.switchDemoAccount`. Si un `onclick` en línea llama a una función nueva, hay que exponerla en `window`.

**Persistencia** (`js/store.js`): todo el estado es un único objeto `{ users: [...], currentUser }` guardado en `localStorage` bajo `tax_portal_app_state_v2`. Contribuyentes y contadores están en el mismo arreglo `users`; los datos del trámite (documentos, mensajes, financieros, `stage`, `history`, `assignedAdminId`) cuelgan del propio usuario cliente.
- Toda escritura sigue el patrón `getStore()` → mutar → `saveStore(store)`; usa las funciones exportadas de `store.js` en vez de tocar `localStorage` directamente.
- `getStore()` siembra `INITIAL_SEED_DATA` si no hay datos y, en cada lectura, repara el estado: fuerza `isCentralAdmin` en `usr_admin`, reinserta el cliente semilla si falta y asigna `assignedAdminId = 'usr_admin'` a clientes sin contador.
- Los archivos subidos se guardan como data URLs en base64 (`doc.fileData`). Si se excede la cuota, `saveStore` descarta `fileData` grandes de documentos antiguos.
- Respaldo/restauración: `exportBackupJSON()` / `importBackupStore()` (botones en el portal admin).
- Etapas del trámite: `TAX_STAGES` (1–4). Checklist de documentos: `DEFAULT_CHECKLIST`.

**Autenticación** (`js/auth.js`): comparación de contraseñas en texto plano contra `store.users`; el usuario activo se guarda en `sessionStorage` (`tax_portal_session_active_user`). Es una demo del lado del cliente, no seguridad real.

**Contadores:** un admin con `isCentralAdmin` ve a todos los clientes; los demás solo ven los suyos (`getAssignedClientsForAdmin`).

**Cálculo tributario** (`js/taxCalculator.js`): `computeFormulario210(inputs, year)` calcula la cédula general (renta exenta del 25 % con tope de 790 UVT, límite del 40 % / 1340 UVT para deducciones + exentas) y aplica la tabla marginal del Art. 241 E.T. con `calculateTaxFromUVT`. Los valores de la UVT por año están en `UVT_VALUES`; al añadir un año nuevo hay que agregarlo ahí. `formatCOP` formatea pesos.

**PDF:** `js/pdfExport.js` (`printTaxDeclarationSummary`) abre una ventana nueva con HTML imprimible y usa `window.print()`; no hay librería de PDF. `js/interactivePdfStudio.js` (editor con firma y sellos) no está importado por ningún módulo, y `index.html` elimina sus botones al cargar: es código inactivo.

**CSS:** `css/main.css` define los design tokens (variables `--*`, tema oscuro/dorado) y utilidades estilo Tailwind hechas a mano (`flex`, `gap-2`, `text-xs`, …); `components.css` contiene botones, tarjetas y modales, y `views.css` los estilos de cada vista. También hay muchos estilos en línea dentro de los templates JS.

## Caché y versión de assets

- `index.html` **desregistra el service worker y borra todas las cachés en cada carga**, así que `sw.js` en la práctica no queda activo. Si se quiere soporte offline real, hay que quitar ese bloque.
- Al cambiar CSS o JS, sube el query string de versión en `index.html` (`?v=20260723_v4`). Si se reactiva el service worker, sube también `CACHE_NAME` en `sw.js` y mantén `ASSETS_TO_CACHE` sincronizado.
- Solo `app.js` lleva versión en la URL; los imports internos (`./store.js`, etc.) no.
