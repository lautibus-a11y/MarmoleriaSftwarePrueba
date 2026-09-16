/* ========================================
   MARMOLERÍA BENJAMIN — Clientes Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleClientes(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/clientes/:id

  if (method === 'GET') {
    if (id) {
      const cliente = await StorageService.getById(env, 'clientes', id);
      if (!cliente) return errorResponse('Cliente no encontrado', 404, origin);
      return jsonResponse(cliente, 200, origin);
    }
    const list = await StorageService.getAll(env, 'clientes');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.nombre) return errorResponse('El nombre es requerido', 400, origin);
    const created = await StorageService.create(env, 'clientes', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de cliente requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'clientes', id, data);
    if (!updated) return errorResponse('Cliente no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de cliente requerido', 400, origin);
    const removed = await StorageService.remove(env, 'clientes', id);
    if (!removed) return errorResponse('Cliente no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
