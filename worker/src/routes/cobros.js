/* ========================================
   MARMOLERÍA BENJAMIN — Cobros Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleCobros(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/cobros/:id

  if (method === 'GET') {
    if (id) {
      const cobro = await StorageService.getById(env, 'cobros', id);
      if (!cobro) return errorResponse('Cobro no encontrado', 404, origin);
      return jsonResponse(cobro, 200, origin);
    }
    const list = await StorageService.getAll(env, 'cobros');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.clienteId || data.importe === undefined) {
      return errorResponse('Cliente e importe son requeridos', 400, origin);
    }
    const created = await StorageService.create(env, 'cobros', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de cobro requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'cobros', id, data);
    if (!updated) return errorResponse('Cobro no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de cobro requerido', 400, origin);
    const removed = await StorageService.remove(env, 'cobros', id);
    if (!removed) return errorResponse('Cobro no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
