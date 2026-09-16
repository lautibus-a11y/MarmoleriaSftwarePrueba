/* ========================================
   MARMOLERÍA BENJAMIN — Cloudflare Worker API
   Entry point & Router
   ======================================== */

import { corsHeaders, jsonResponse, errorResponse } from './utils/helpers.js';
import { StorageService } from './services/storageService.js';
import { handleClientes } from './routes/clientes.js';
import { handlePresupuestos } from './routes/presupuestos.js';
import { handleObras } from './routes/obras.js';
import { handleMateriales } from './routes/materiales.js';
import { handleStockMovimientos } from './routes/stock.js';
import { handleProveedores } from './routes/proveedores.js';
import { handleFacturas } from './routes/facturas.js';
import { handlePagos } from './routes/pagos.js';
import { handleCobros } from './routes/cobros.js';
import { handleEventos } from './routes/eventos.js';
import { handleConfig } from './routes/config.js';
import { handleUploads } from './routes/uploads.js';
import { handleBackups } from './routes/backups.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', app: 'Marmolería Benjamín API', timestamp: new Date().toISOString() }, 200, origin);
    }

    // Sync all data in 1 request (for initial app boot)
    if (url.pathname === '/api/sync' && request.method === 'GET') {
      try {
        const syncData = await StorageService.getSyncData(env);
        return jsonResponse(syncData, 200, origin);
      } catch (err) {
        return errorResponse('Error syncing data: ' + err.message, 500, origin);
      }
    }

    // Parse path: /api/<resource>/<id>
    const pathParts = url.pathname.replace(/^\/+/, '').split('/');
    if (pathParts[0] !== 'api') {
      return errorResponse('Ruta no válida. Todas las rutas deben comenzar con /api', 404, origin);
    }

    const resource = pathParts[1];

    try {
      switch (resource) {
        case 'clientes':
          return await handleClientes(request, env, pathParts, origin);
        case 'presupuestos':
          return await handlePresupuestos(request, env, pathParts, origin);
        case 'obras':
          return await handleObras(request, env, pathParts, origin);
        case 'materiales':
          return await handleMateriales(request, env, pathParts, origin);
        case 'stock-movimientos':
          return await handleStockMovimientos(request, env, pathParts, origin);
        case 'proveedores':
          return await handleProveedores(request, env, pathParts, origin);
        case 'facturas':
          return await handleFacturas(request, env, pathParts, origin);
        case 'pagos':
          return await handlePagos(request, env, pathParts, origin);
        case 'cobros':
          return await handleCobros(request, env, pathParts, origin);
        case 'eventos':
          return await handleEventos(request, env, pathParts, origin);
        case 'config':
          return await handleConfig(request, env, pathParts, origin);
        case 'uploads':
          return await handleUploads(request, env, pathParts, origin);
        case 'backups':
          return await handleBackups(request, env, pathParts, origin);
        default:
          return errorResponse(`Recurso '${resource}' no encontrado`, 404, origin);
      }
    } catch (err) {
      console.error('Unhandled Worker error:', err);
      return errorResponse('Error interno del servidor: ' + err.message, 500, origin);
    }
  }
};
