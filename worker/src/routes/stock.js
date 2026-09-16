/* ========================================
   MARMOLERÍA BENJAMIN — Stock Movimientos Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleStockMovimientos(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/stock-movimientos/:id

  if (method === 'GET') {
    if (id) {
      const mov = await StorageService.getById(env, 'stockMovimientos', id);
      if (!mov) return errorResponse('Movimiento no encontrado', 404, origin);
      return jsonResponse(mov, 200, origin);
    }
    const list = await StorageService.getAll(env, 'stockMovimientos');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.materialId || data.cantidad === undefined) {
      return errorResponse('Material y cantidad son requeridos', 400, origin);
    }
    const created = await StorageService.create(env, 'stockMovimientos', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de movimiento requerido', 400, origin);
    const removed = await StorageService.remove(env, 'stockMovimientos', id);
    if (!removed) return errorResponse('Movimiento no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
