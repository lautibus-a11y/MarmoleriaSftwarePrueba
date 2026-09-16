/* ========================================
   MARMOLERÍA BENJAMIN — Obras Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleObras(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/obras/:id

  if (method === 'GET') {
    if (id) {
      const obra = await StorageService.getById(env, 'obras', id);
      if (!obra) return errorResponse('Obra no encontrada', 404, origin);
      return jsonResponse(obra, 200, origin);
    }
    const list = await StorageService.getAll(env, 'obras');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.clienteId) return errorResponse('El cliente es requerido', 400, origin);
    const created = await StorageService.create(env, 'obras', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de obra requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'obras', id, data);
    if (!updated) return errorResponse('Obra no encontrada', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de obra requerido', 400, origin);
    const removed = await StorageService.remove(env, 'obras', id);
    if (!removed) return errorResponse('Obra no encontrada', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
